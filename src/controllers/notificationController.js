/**
 * Notification Controller
 * Returns scoped notifications for the authenticated user and allows marking them read.
 */
const pool = require('../config/db');

exports.getNotifications = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const result = await pool.query(`
            SELECT * FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 20
        `, [userId]);

        const unreadCountRes = await pool.query(`
            SELECT COUNT(*) FROM notifications
            WHERE user_id = $1 AND is_read = false
        `, [userId]);

        return res.json({
            success: true,
            data: {
                notifications: result.rows,
                unreadCount: Number(unreadCountRes.rows[0].count)
            }
        });
    } catch (err) {
        next(err);
    }
};

exports.markAsRead = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { id } = req.params;

        if (id === 'all') {
            await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [userId]);
        } else {
            await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [id, userId]);
        }

        return res.json({
            success: true,
            message: 'Notifications marked as read.'
        });
    } catch (err) {
        next(err);
    }
};
