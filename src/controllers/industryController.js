/**
 * Industry Controller
 * Handles CSR metrics, browsing university pilot projects seeking corporate partnership,
 * and pledging CSR capital or technical mentorship.
 */
const pool = require('../config/db');

exports.getOverview = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const profileRes = await pool.query('SELECT * FROM industry_profiles WHERE user_id = $1', [userId]);
        const profile = profileRes.rows[0] || {};

        const statsQuery = `
            SELECT
                COUNT(*) as supported_projects,
                COUNT(*) FILTER (WHERE status = 'APPROVED') as active_partnerships,
                COUNT(*) FILTER (WHERE status = 'PENDING') as pending_proposals
            FROM industry_support_offers
            WHERE industry_id = $1
        `;
        const statsRes = await pool.query(statsQuery, [userId]);
        const stats = statsRes.rows[0];

        // My support offers
        const myOffers = await pool.query(`
            SELECT iso.*, p.title as project_title, p.stage as project_stage, u.institution_name
            FROM industry_support_offers iso
            JOIN projects p ON p.id = iso.project_id
            JOIN university_profiles u ON u.user_id = p.university_id
            WHERE iso.industry_id = $1
            ORDER BY iso.created_at DESC
        `, [userId]);

        // Featured projects seeking support
        const discover = await pool.query(`
            SELECT p.*, u.institution_name, u.department, c.category, c.ward
            FROM projects p
            JOIN university_profiles u ON u.user_id = p.university_id
            JOIN challenges c ON c.id = p.challenge_id
            WHERE p.seeking_industry_support = true
            ORDER BY p.created_at DESC
            LIMIT 6
        `);

        return res.json({
            success: true,
            data: {
                stats: {
                    supportedProjects: Number(stats.supported_projects),
                    activePartnerships: Number(stats.active_partnerships),
                    pendingProposals: Number(stats.pending_proposals),
                    csrBudget: profile.csr_budget || '₹ 2.5 Crore'
                },
                profile,
                myOffers: myOffers.rows,
                discoverProjects: discover.rows
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.getDiscoverProjects = async (req, res, next) => {
    try {
        const { category, stage, search } = req.query;

        let query = `
            SELECT p.*, u.institution_name, u.department, u.expertise_areas,
                   c.category, c.ward, c.location,
                   COALESCE(
                       (SELECT json_agg(json_build_object('id', m.id, 'title', m.title, 'completed', m.completed))
                        FROM project_milestones m WHERE m.project_id = p.id), '[]'::json
                   ) as milestones
            FROM projects p
            JOIN university_profiles u ON u.user_id = p.university_id
            JOIN challenges c ON c.id = p.challenge_id
            WHERE p.seeking_industry_support = true
        `;
        const params = [];

        if (category && category !== 'ALL') {
            params.push(category);
            query += ` AND c.category ILIKE $${params.length}`;
        }
        if (stage && stage !== 'ALL') {
            params.push(stage);
            query += ` AND p.stage = $${params.length}`;
        }
        if (search) {
            params.push(`%${search}%`);
            query += ` AND (p.title ILIKE $${params.length} OR u.institution_name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
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

exports.submitSupportOffer = async (req, res, next) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        const userId = req.user.id;
        const { projectId, supportType, amountOrDetails } = req.body;

        if (!projectId || !supportType || !amountOrDetails) {
            await client.query('ROLLBACK');
            return res.status(400).json({
                success: false,
                message: 'Project ID, support type, and contribution details are required.'
            });
        }

        // Get industry profile name
        const profRes = await client.query('SELECT company_name FROM industry_profiles WHERE user_id = $1', [userId]);
        const companyName = profRes.rows[0]?.company_name || req.user.name;

        // Verify project
        const projRes = await client.query('SELECT * FROM projects WHERE id = $1', [projectId]);
        if (projRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Target project not found.' });
        }
        const project = projRes.rows[0];

        // Insert offer
        const offerRes = await client.query(`
            INSERT INTO industry_support_offers (
                project_id, industry_id, company_name, support_type, amount_or_details, status, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, 'APPROVED', NOW(), NOW())
            RETURNING *
        `, [projectId, userId, companyName, supportType, amountOrDetails]);

        const offer = offerRes.rows[0];

        // Notify University Lead
        await client.query(`
            INSERT INTO notifications (user_id, title, message, type, link)
            VALUES ($1, 'New Industry CSR Support Pledged', $2, 'SUPPORT', '/university')
        `, [project.university_id, `${companyName} pledged ${supportType}: ${amountOrDetails} for "${project.title}".`]);

        await client.query('COMMIT');
        return res.status(201).json({
            success: true,
            message: 'Support offer successfully recorded.',
            data: offer
        });
    } catch (err) {
        await client.query('ROLLBACK');
        next(err);
    } finally {
        client.release();
    }
};
