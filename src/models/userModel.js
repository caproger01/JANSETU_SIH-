const pool = require('../config/db.js');

const UserModel = {
    /**
     * Find a user by normalized email address
     * Returns full user record including password_hash for authentication
     */
    async findByEmail(email) {
        const query = `
            SELECT id, name, email, mobile, password_hash, role, created_at, updated_at
            FROM users
            WHERE LOWER(email) = LOWER($1)
            LIMIT 1;
        `;
        const result = await pool.query(query, [email.trim().toLowerCase()]);
        return result.rows[0] || null;
    },

    /**
     * Find user by ID (excludes password_hash by default)
     */
    async findById(id) {
        const query = `
            SELECT id, name, email, mobile, role, created_at, updated_at
            FROM users
            WHERE id = $1
            LIMIT 1;
        `;
        const result = await pool.query(query, [id]);
        return result.rows[0] || null;
    },

    /**
     * Create a new user with hashed password
     * Role defaults to NULL initially until role selection
     */
    async create({ name, email, mobile, passwordHash, role = null }) {
        const query = `
            INSERT INTO users (name, email, mobile, password_hash, role, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
            RETURNING id, name, email, mobile, role, created_at, updated_at;
        `;
        const normalizedEmail = email.trim().toLowerCase();
        const result = await pool.query(query, [
            name.trim(),
            normalizedEmail,
            mobile ? mobile.trim() : null,
            passwordHash,
            role
        ]);
        return result.rows[0];
    },

    /**
     * Update user role
     */
    async updateRole(id, role) {
        const query = `
            UPDATE users
            SET role = $1, updated_at = NOW()
            WHERE id = $2
            RETURNING id, name, email, mobile, role, created_at, updated_at;
        `;
        const result = await pool.query(query, [role, id]);
        return result.rows[0] || null;
    },

    /**
     * Get all users for admin development view
     * Strictly excludes password and password_hash
     */
    async getAllUsers() {
        const query = `
            SELECT id, name, email, mobile, role, created_at, updated_at
            FROM users
            ORDER BY id ASC;
        `;
        const result = await pool.query(query);
        return result.rows;
    }
};

module.exports = UserModel;
