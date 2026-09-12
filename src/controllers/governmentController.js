/**
 * Government Controller
 * Handles city-wide municipal analytics, grievance moderation & assignment,
 * publishing university research challenges, GIS problem map data, and AI briefings.
 */
const pool = require('../config/db');
const { getMunicipalInsights } = require('../services/ai/governmentInsightService');

exports.getOverview = async (req, res, next) => {
    try {
        const statsQuery = `
            SELECT
                COUNT(*) as total_problems,
                COUNT(*) FILTER (WHERE status = 'RESOLVED') as resolved_count,
                COUNT(*) FILTER (WHERE priority_level = 'CRITICAL' OR priority_score >= 8) as critical_count,
                COUNT(*) FILTER (WHERE status IN ('SUBMITTED', 'UNDER REVIEW')) as unassigned_count,
                COUNT(*) FILTER (WHERE status = 'UNIVERSITY ASSIGNED') as challenge_count,
                COALESCE(SUM(affected_population), 0) as people_impacted
            FROM problems
        `;
        const statsRes = await pool.query(statsQuery);
        const stats = statsRes.rows[0];

        // Active projects count
        const projectCountRes = await pool.query(`SELECT COUNT(*) as count FROM projects WHERE status = 'ACTIVE' OR status IS NULL`);
        const activeProjectsCount = Number(projectCountRes.rows[0]?.count || 0);

        // Real category breakdown
        const categoryRes = await pool.query(`
            SELECT category, COUNT(*)::int as count
            FROM problems
            GROUP BY category
            ORDER BY count DESC
        `);
        const categoryBreakdown = categoryRes.rows;

        // Government profile
        const profileRes = await pool.query('SELECT * FROM government_profiles WHERE user_id = $1', [req.user.id]);
        const profile = profileRes.rows[0] || {};

        // Recent grievances across all wards
        const stream = await pool.query(`
            SELECT p.*, u.name as citizen_name, u.email as citizen_email
            FROM problems p
            JOIN users u ON u.id = p.created_by
            ORDER BY 
                CASE WHEN p.priority_level = 'CRITICAL' THEN 1
                     WHEN p.priority_level = 'HIGH' THEN 2
                     ELSE 3 END,
                p.created_at DESC
            LIMIT 15
        `);

        return res.json({
            success: true,
            data: {
                stats: {
                    totalProblems: Number(stats.total_problems),
                    resolvedCount: Number(stats.resolved_count),
                    criticalCount: Number(stats.critical_count),
                    unassignedCount: Number(stats.unassigned_count),
                    challengeCount: Number(stats.challenge_count),
                    activeProjects: activeProjectsCount,
                    peopleImpacted: Number(stats.people_impacted)
                },
                categoryBreakdown,
                profile,
                recentGrievances: stream.rows
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.getAllProblems = async (req, res, next) => {
    try {
        const { status, ward, priority, search, councilId } = req.query;

        let query = `
            SELECT p.*, u.name as citizen_name, u.mobile as citizen_mobile,
                   gc.name as assigned_council_name, gc.code as assigned_council_code,
                   gd.name as assigned_department_name,
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', img.id, 'image_url', img.image_url))
                        FROM problem_images img WHERE img.problem_id = p.id), '[]'::json
                   ) as images
            FROM problems p
            JOIN users u ON u.id = p.created_by
            LEFT JOIN government_councils gc ON gc.id = p.assigned_council_id
            LEFT JOIN government_departments gd ON gd.id = p.assigned_department_id
            WHERE 1=1
        `;
        const params = [];

        if (status && status !== 'ALL') {
            params.push(status);
            query += ` AND p.status = $${params.length}`;
        }
        if (ward && ward !== 'ALL') {
            params.push(`%${ward}%`);
            query += ` AND p.ward ILIKE $${params.length}`;
        }
        if (priority && priority !== 'ALL') {
            params.push(priority);
            query += ` AND p.priority_level = $${params.length}`;
        }
        if (councilId && councilId !== 'ALL') {
            params.push(councilId);
            query += ` AND p.assigned_council_id = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (p.title ILIKE $${params.length} OR p.code ILIKE $${params.length} OR p.location ILIKE $${params.length})`;
        }

        query += ' ORDER BY p.priority_score DESC, p.created_at DESC';

        const result = await pool.query(query, params);
        return res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        next(err);
    }
};

exports.updateProblemStatus = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const { id } = req.params;
        const { status, assignedDepartment, officerRemarks } = req.body;

        const currentRes = await client.query('SELECT * FROM problems WHERE id = $1', [id]);
        if (currentRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Problem report not found.' });
        }
        const currentProblem = currentRes.rows[0];

        const updateRes = await client.query(`
            UPDATE problems
            SET status = COALESCE($1, status),
                assigned_department = COALESCE($2, assigned_department),
                officer_remarks = COALESCE($3, officer_remarks),
                resolved_at = CASE WHEN $1 = 'RESOLVED' THEN NOW() ELSE resolved_at END,
                updated_at = NOW()
            WHERE id = $4
            RETURNING *
        `, [status, assignedDepartment, officerRemarks, id]);

        const updated = updateRes.rows[0];

        // Record history
        await client.query(`
            INSERT INTO problem_status_history (problem_id, previous_status, new_status, changed_by, remarks)
            VALUES ($1, $2, $3, $4, $5)
        `, [id, currentProblem.status, updated.status, req.user.id, officerRemarks || `Status updated to ${updated.status}`]);

        // Notify Citizen of status update
        await client.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, $2, $3, 'PROBLEM', '/citizen')
        `, [
            currentProblem.created_by,
            `Grievance Update: ${updated.status}`,
            `Your grievance ${currentProblem.code} status changed to ${updated.status}. ${officerRemarks || ''}`
        ]);

        await client.query('COMMIT');
        return res.json({
            success: true,
            message: 'Problem updated successfully.',
            data: updated
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

exports.publishChallenge = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const {
            problemId,
            title,
            description,
            category,
            ward,
            location,
            priorityLevel,
            affectedPopulation,
            requiredExpertise,
            grantAmount
        } = req.body;

        // Generate unique tracking code: CH-2026-XXX with guaranteed collision-free generation
        const maxIdRes = await client.query('SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM challenges');
        let codeNum = Number(maxIdRes.rows[0].next_id) + 84;
        let code = `CH-2026-${String(codeNum).padStart(3, '0')}`;
        while ((await client.query('SELECT 1 FROM challenges WHERE code = $1', [code])).rows.length > 0) {
            codeNum++;
            code = `CH-2026-${String(codeNum).padStart(3, '0')}`;
        }

        const chRes = await client.query(`
            INSERT INTO challenges (
                code, problem_id, title, description, category, ward, location,
                priority_level, affected_population, required_expertise, grant_amount,
                status, created_by, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'OPEN', $12, NOW(), NOW())
            RETURNING *
        `, [
            code,
            problemId || null,
            title,
            description,
            category || 'Municipal Engineering',
            ward || 'Central Municipal Zone',
            location || 'District Wide',
            priorityLevel || 'HIGH',
            Number(affectedPopulation) || 1000,
            Array.isArray(requiredExpertise) ? requiredExpertise : (requiredExpertise ? [requiredExpertise] : ['Urban Engineering']),
            grantAmount || '₹ 5,00,000',
            req.user.id
        ]);

        // If linked to a problem, update problem status
        if (problemId) {
            await client.query(`
                UPDATE problems
                SET status = 'UNIVERSITY ASSIGNED', updated_at = NOW()
                WHERE id = $1
            `, [problemId]);

            await client.query(`
                INSERT INTO problem_status_history (problem_id, previous_status, new_status, changed_by, remarks)
                VALUES ($1, 'UNDER REVIEW', 'UNIVERSITY ASSIGNED', $2, 'Escalated to University Academic Innovation Challenge: ' || $3)
            `, [problemId, req.user.id, code]);
        }

        // Notify universities about new challenge
        const uniUsers = await client.query("SELECT id FROM users WHERE role = 'university'");
        for (const u of uniUsers.rows) {
            await client.query(`
                INSERT INTO notifications (user_id, title, message, type, link)
                VALUES ($1, 'New Innovation Challenge Published', $2, 'CHALLENGE', '/university')
            `, [u.id, `Government published challenge ${code}: ${title}`]);
        }

        await client.query('COMMIT');
        return res.status(201).json({
            success: true,
            message: 'University challenge successfully published.',
            data: chRes.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};

exports.getMapProblems = async (req, res, next) => {
    try {
        const result = await pool.query(`
            SELECT id, code, title, category, ward, location, latitude, longitude,
                   severity, priority_score, priority_level, status, affected_population
            FROM problems
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL
            ORDER BY priority_score DESC
        `);
        return res.json({
            success: true,
            data: result.rows
        });
    } catch (err) {
        next(err);
    }
};

exports.getAiInsights = async (req, res, next) => {
    try {
        const insights = await getMunicipalInsights();
        return res.json({
            success: true,
            data: insights
        });
    } catch (err) {
        next(err);
    }
};
