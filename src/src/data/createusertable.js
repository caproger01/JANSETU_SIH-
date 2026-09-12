const pool = require('../config/db.js');

const createUserTable = async () => {
    const createTableQuery = `
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) UNIQUE NOT NULL,
            mobile VARCHAR(20),
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(20),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT chk_user_role CHECK (role IS NULL OR role IN ('citizen', 'university', 'government', 'industry'))
        );
    `;

    try {
        await pool.query(createTableQuery);

        // Safe migration for existing tables created with older schemas
        const colCheckQuery = `
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'users' AND table_schema = 'public';
        `;
        const res = await pool.query(colCheckQuery);
        const existingColumns = res.rows.map(r => r.column_name);

        if (!existingColumns.includes('mobile')) {
            await pool.query(`ALTER TABLE users ADD COLUMN mobile VARCHAR(20);`);
        }

        if (!existingColumns.includes('password_hash')) {
            await pool.query(`ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);`);
            // If legacy password column existed, copy hash over if present
            if (existingColumns.includes('password')) {
                await pool.query(`UPDATE users SET password_hash = password WHERE password_hash IS NULL;`);
                await pool.query(`ALTER TABLE users ALTER COLUMN password DROP NOT NULL;`);
            }
        }

        if (!existingColumns.includes('role')) {
            await pool.query(`ALTER TABLE users ADD COLUMN role VARCHAR(20);`);
        }

        if (!existingColumns.includes('updated_at')) {
            await pool.query(`ALTER TABLE users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;`);
        }

        // Ensure role check constraint exists
        const constraintCheck = await pool.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'users' AND constraint_name = 'chk_user_role';
        `);
        if (constraintCheck.rows.length === 0) {
            await pool.query(`
                ALTER TABLE users 
                ADD CONSTRAINT chk_user_role 
                CHECK (role IS NULL OR role IN ('citizen', 'university', 'government', 'industry'));
            `);
        }

        console.log("Users table initialized successfully");
    } catch (err) {
        console.error("Error initializing users table:", err.message);
        throw err;
    }
};

module.exports = createUserTable;
