/**
 * Citizen Controller
 * Handles citizen overview, submitting problems with photo attachments and AI pre-screening,
 * viewing submitted problem details & history, and browsing public notices.
 */
const pool = require('../config/db');
const { analyzeProblem } = require('../services/ai/problemAnalysisService');
const { checkDuplicates } = require('../services/ai/duplicateDetectionService');

exports.getOverview = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Citizen's personal stats
        const statsQuery = `
            SELECT
                COUNT(*) as total_submitted,
                COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_count,
                COUNT(*) FILTER (WHERE status IN ('SUBMITTED', 'UNDER REVIEW', 'OFFICER ASSIGNED', 'UNIVERSITY ASSIGNED')) as in_progress_count,
                COUNT(*) FILTER (WHERE status = 'REJECTED') as rejected_count
            FROM problems
            WHERE created_by = $1
        `;
        const statsRes = await pool.query(statsQuery, [userId]);
        const stats = statsRes.rows[0];

        // Citizen profile
        const profileRes = await pool.query('SELECT * FROM citizen_profiles WHERE user_id = $1', [userId]);
        const profile = profileRes.rows[0] || {};

        // Recent problems submitted by this citizen
        const recentProblems = await pool.query(`
            SELECT p.*,
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', img.id, 'image_url', img.image_url))
                        FROM problem_images img WHERE img.problem_id = p.id), '[]'::json
                   ) as images
            FROM problems p
            WHERE p.created_by = $1
            ORDER BY p.created_at DESC
            LIMIT 10
        `, [userId]);

        // Public notices
        const notices = await pool.query(`
            SELECT * FROM public_notices
            ORDER BY is_active DESC, published_at DESC
            LIMIT 5
        `);

        // Community-wide real stats from database
        const communityStatsRes = await pool.query(`
            SELECT
                (SELECT COUNT(*) FROM problems WHERE status NOT IN ('RESOLVED', 'REJECTED')) as active_public_requests,
                (SELECT COUNT(*) FROM projects WHERE status NOT IN ('CANCELLED', 'REJECTED')) as community_projects_ongoing,
                (SELECT COUNT(*) FROM users WHERE role = 'citizen') as participating_citizens
        `);
        const communityStats = communityStatsRes.rows[0] || {};

        // All active/public problems across wards with geo-coordinates for the map
        const publicProblems = await pool.query(`
            SELECT p.id, p.code, p.title, p.category, p.ward, p.location, p.latitude, p.longitude, p.status, p.priority_level,
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', img.id, 'image_url', img.image_url))
                        FROM problem_images img WHERE img.problem_id = p.id), '[]'::json
                   ) as images
            FROM problems p
            WHERE p.status NOT IN ('REJECTED')
            ORDER BY p.created_at DESC
            LIMIT 50
        `);

        return res.json({
            success: true,
            data: {
                stats: {
                    totalSubmitted: Number(stats.total_submitted),
                    resolvedCount: Number(stats.resolved_count),
                    inProgressCount: Number(stats.in_progress_count),
                    rejectedCount: Number(stats.rejected_count)
                },
                communityStats: {
                    activePublicRequests: Number(communityStats.active_public_requests) || 0,
                    communityProjectsOngoing: Number(communityStats.community_projects_ongoing) || 0,
                    participatingCitizens: Number(communityStats.participating_citizens) || 0
                },
                profile,
                recentProblems: recentProblems.rows,
                publicProblems: publicProblems.rows,
                notices: notices.rows
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.getProblems = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { status, search } = req.query;

        let query = `
            SELECT p.*,
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', img.id, 'image_url', img.image_url))
                        FROM problem_images img WHERE img.problem_id = p.id), '[]'::json
                   ) as images
            FROM problems p
            WHERE p.created_by = $1
        `;
        const params = [userId];

        if (status && status !== 'ALL') {
            params.push(status);
            query += ` AND p.status = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND (p.title ILIKE $${params.length} OR p.code ILIKE $${params.length} OR p.ward ILIKE $${params.length})`;
        }

        query += ' ORDER BY p.created_at DESC';

        const result = await pool.query(query, params);
        return res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        next(err);
    }
};

exports.getProblemById = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        const problemRes = await pool.query(`
            SELECT p.*,
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', img.id, 'image_url', img.image_url))
                        FROM problem_images img WHERE img.problem_id = p.id), '[]'::json
                   ) as images
            FROM problems p
            WHERE p.id = $1 AND p.created_by = $2
        `, [id, userId]);

        if (problemRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Problem report not found or access unauthorized.'
            });
        }

        // Fetch status history timeline
        const historyRes = await pool.query(`
            SELECT h.*, u.name as changed_by_name
            FROM problem_status_history h
            LEFT JOIN users u ON u.id = h.changed_by
            WHERE h.problem_id = $1
            ORDER BY h.created_at ASC
        `, [id]);

        return res.json({
            success: true,
            data: {
                problem: problemRes.rows[0],
                timeline: historyRes.rows
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.preScreen = async (req, res, next) => {
    try {
        const { title, description, category, location, affectedPopulation } = req.body;
        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required for AI pre-screening.'
            });
        }

        const analysis = await analyzeProblem({
            title,
            description,
            category,
            location,
            affectedPopulation
        });

        const duplicateCheck = await checkDuplicates({
            ward: location,
            title,
            description,
            category
        });

        return res.json({
            success: true,
            data: {
                analysis,
                duplicateCheck
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.createProblem = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user.id;
        const {
            title,
            description,
            category,
            subcategory,
            ward,
            location,
            latitude,
            longitude,
            affectedPopulation,
            urgency: userUrgency
        } = req.body;

        if (!title || !description || !ward) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Title, description, and ward are required.'
            });
        }

        // Run AI Analysis & Priority Scoring
        const aiAnalysis = await analyzeProblem({
            title,
            description,
            category,
            location: `${ward} - ${location || ''}`,
            affectedPopulation: affectedPopulation || 100
        });

        // Generate unique tracking code: CB-2026-XXXXX with guaranteed collision-free generation
        const maxIdRes = await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM problems');
        let codeNum = Number(maxIdRes.rows[0].next_id) + 100;
        let code = `CB-2026-${String(codeNum).padStart(5, '0')}`;
        while ((await client.query('SELECT 1 FROM problems WHERE code = $1', [code])).rows.length > 0) {
            codeNum++;
            code = `CB-2026-${String(codeNum).padStart(5, '0')}`;
        }

        const insertQuery = `
            INSERT INTO problems (
                code, title, description, category, subcategory, ward, location,
                latitude, longitude, severity, urgency, priority_score, priority_level,
                affected_population, status, ai_summary, ai_keywords, assigned_department,
                created_by, created_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7,
                $8, $9, $10, $11, $12, $13,
                $14, 'SUBMITTED', $15, $16, $17,
                $18, NOW(), NOW()
            ) RETURNING *
        `;

        const finalCategory = category || aiAnalysis.category;
        const finalSubcategory = subcategory || aiAnalysis.subcategory;
        const finalDept = aiAnalysis.department;
        const finalUrgency = userUrgency || aiAnalysis.urgency;

        const probRes = await client.query(insertQuery, [
            code,
            title,
            description,
            finalCategory,
            finalSubcategory,
            ward,
            location || ward,
            latitude ? Number(latitude) : 28.6139,
            longitude ? Number(longitude) : 77.2090,
            aiAnalysis.severity,
            finalUrgency,
            aiAnalysis.priorityScore,
            aiAnalysis.priorityLevel,
            Number(affectedPopulation) || 100,
            aiAnalysis.summary,
            aiAnalysis.keywords,
            finalDept,
            userId
        ]);

        const newProblem = probRes.rows[0];

        // Save uploaded images if any
        if (req.files && req.files.length > 0) {
            for (const file of req.files) {
                const relativeUrl = `/uploads/${file.filename}`;
                await client.query(`
                    INSERT INTO problem_images (problem_id, image_url, file_name, file_size)
                    VALUES ($1, $2, $3, $4)
                `, [newProblem.id, relativeUrl, file.originalname, file.size]);
            }
        }

        // Insert initial status history
        await client.query(`
            INSERT INTO problem_status_history (problem_id, previous_status, new_status, changed_by, remarks)
            VALUES ($1, NULL, 'SUBMITTED', $2, 'Citizen lodged grievance with attached telemetry.')
        `, [newProblem.id, userId]);

        // Send confirmation notification to citizen
        await client.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, 'Grievance Registered', $2, 'PROBLEM', '/citizen')
        `, [userId, `Your grievance ${code} has been registered and queued for municipal verification.`]);

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: 'Problem successfully registered.',
            data: newProblem
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

exports.getPublicNotices = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT * FROM public_notices WHERE is_active = true ORDER BY published_at DESC');
        return res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        next(err);
    }
};

exports.deleteProblem = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const userId = req.user.id;
        const problemId = parseInt(req.params.id, 10);

        if (isNaN(problemId)) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Invalid problem ID.'
            });
        }

        // Verify that the problem exists and was created by this citizen
        const checkRes = await client.query(`
            SELECT id, code, title, created_by, status
            FROM problems
            WHERE id = $1
        `, [problemId]);

        if (checkRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'Problem report not found.'
            });
        }

        const problem = checkRes.rows[0];

        if (problem.created_by !== userId) {
            await client.query('ROLLBACK');
            return res.status(403).json({
                success: false,
                message: 'You are only authorized to delete problems you reported yourself.'
            });
        }

        // Delete problem (cascades to problem_images and problem_status_history, sets null on challenges)
        await client.query('DELETE FROM problems WHERE id = $1', [problemId]);

        // Log notification of deletion
        await client.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, 'Grievance Withdrawn', $2, 'PROBLEM', '/citizen')
        `, [userId, `Your grievance ${problem.code || problem.title} was successfully deleted.`]);

        await client.query('COMMIT');

        return res.json({
            success: true,
            message: 'Problem deleted successfully.',
            data: { id: problemId }
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};
