const pool = require('../config/db');
const UserModel = require('../models/userModel');

const AdminController = {
    /**
     * GET /api/viewdataadmin
     * Development testing endpoint to safely inspect PostgreSQL state across tables
     * Protected by X-Admin-Key header (or admin_key query param for browser testing)
     */
    async viewDataAdmin(req, res, next) {
        try {
            const adminKey = req.headers['x-admin-key'] || req.query.admin_key || req.query.key;
            const configuredKey = process.env.ADMIN_VIEW_KEY;

            // Reject if key is missing or incorrect
            if (!configuredKey || !adminKey || adminKey !== configuredKey) {
                return res.status(403).json({
                    success: false,
                    message: 'Forbidden'
                });
            }

            // Retrieve non-sensitive user records
            const users = await UserModel.getAllUsers();

            // Also fetch summary counts of tables
            const problems = await pool.query('SELECT id, code, title, category, ward, priority_level, status, created_at FROM problems ORDER BY created_at DESC LIMIT 10');
            const challenges = await pool.query('SELECT id, code, title, category, priority_level, status FROM challenges ORDER BY created_at DESC LIMIT 10');
            const projects = await pool.query('SELECT id, title, stage, status, funding_needed FROM projects ORDER BY created_at DESC LIMIT 10');
            const offers = await pool.query('SELECT id, project_id, company_name, support_type, amount_or_details, status FROM industry_support_offers ORDER BY created_at DESC LIMIT 10');

            return res.status(200).json({
                success: true,
                count: users.length,
                counts: {
                    users: users.length,
                    problems: problems.rows.length,
                    challenges: challenges.rows.length,
                    projects: projects.rows.length,
                    offers: offers.rows.length
                },
                users: users.map(u => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    mobile: u.mobile,
                    role: u.role,
                    created_at: u.created_at,
                    updated_at: u.updated_at
                })),
                recentProblems: problems.rows,
                recentChallenges: challenges.rows,
                recentProjects: projects.rows,
                recentSupportOffers: offers.rows
            });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = AdminController;
