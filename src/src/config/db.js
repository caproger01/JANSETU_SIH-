const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from project root .env or src/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const pool = new Pool({
    user: process.env.DB_USER || process.env.USER,
    host: process.env.DB_HOST || process.env.HOST || 'localhost',
    database: process.env.DB_NAME || process.env.DATABASE || process.env.DATABSE || 'JANSETU',
    password: process.env.DB_PASSWORD || process.env.PASSWORD,
    port: parseInt(process.env.DB_PORT || process.env.DBPORT || '5432', 10),
});

pool.on('connect', () => {
    // Database connection established
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client:', err);
});

module.exports = pool;