const jwt = require('jsonwebtoken');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const SECRET = process.env.JWT_SECRET || 'jansetu_fallback_secret_key_change_in_production';

/**
 * Generate a signed JWT token without expiry (Development Mode)
 * @param {object} payload - User information to encode (e.g. { id, email, role })
 * @returns {string} Signed JWT token
 */
function generateToken(payload) {
    const secret = process.env.JWT_SECRET || SECRET;
    return jwt.sign(payload, secret);
}

/**
 * Verify a JWT token
 * @param {string} token - Bearer token string
 * @returns {object} Decoded payload
 */
function verifyToken(token) {
    const secret = process.env.JWT_SECRET || SECRET;
    return jwt.verify(token, secret);
}

module.exports = {
    generateToken,
    verifyToken
};
