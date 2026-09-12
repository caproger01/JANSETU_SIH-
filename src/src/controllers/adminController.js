const UserModel = require('../models/userModel');

const AdminController = {
    /**
     * GET /api/viewdataadmin
     * Development testing endpoint to inspect PostgreSQL users
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

            return res.status(200).json({
                success: true,
                count: users.length,
                users: users.map(u => ({
                    id: u.id,
                    name: u.name,
                    email: u.email,
                    mobile: u.mobile,
                    role: u.role,
                    created_at: u.created_at,
                    updated_at: u.updated_at
                }))
            });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = AdminController;
