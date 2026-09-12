const { verifyToken } = require('../utils/jwt');
const UserModel = require('../models/userModel');

/**
 * Middleware to authenticate requests using JWT Bearer token
 */
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required. No Bearer token provided.'
            });
        }

        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Authentication token is missing.'
            });
        }

        let decoded;
        try {
            decoded = verifyToken(token);
        } catch (jwtErr) {
            return res.status(401).json({
                success: false,
                message: 'Invalid or expired session token. Please log in again.'
            });
        }

        // Fetch user from DB to ensure user still exists and get latest role
        const user = await UserModel.findById(decoded.id);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'User belonging to this token no longer exists.'
            });
        }

        // Attach sanitized user to request (never includes password_hash)
        req.user = {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            role: user.role,
            created_at: user.created_at,
            updated_at: user.updated_at
        };

        next();
    } catch (err) {
        console.error('Authentication middleware error:', err);
        return res.status(500).json({
            success: false,
            message: 'Internal authentication error.'
        });
    }
}

/**
 * Reusable role authorization middleware
 * Example: requireRole('government', 'admin')
 */
function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required.'
            });
        }

        if (!req.user.role || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: `Access denied. Requires one of the following roles: ${allowedRoles.join(', ')}.`
            });
        }

        next();
    };
}

module.exports = {
    authenticate,
    requireRole
};
