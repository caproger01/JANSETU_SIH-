const bcrypt = require('bcryptjs');
const UserModel = require('../models/userModel');
const { generateToken } = require('../utils/jwt');

const AuthController = {
    /**
     * POST /api/auth/signup
     */
    async signup(req, res, next) {
        try {
            const { name, email, mobile, password } = req.body;
            const normalizedEmail = email.trim().toLowerCase();

            // Check if account already exists
            const existingUser = await UserModel.findByEmail(normalizedEmail);
            if (existingUser) {
                return res.status(409).json({
                    success: false,
                    message: 'An account with this email already exists.'
                });
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Create user in PostgreSQL (role starts as null)
            const newUser = await UserModel.create({
                name: name.trim(),
                email: normalizedEmail,
                mobile: mobile ? mobile.trim() : null,
                passwordHash,
                role: null
            });

            // Generate JWT session token
            const token = generateToken({
                id: newUser.id,
                email: newUser.email,
                role: newUser.role
            });

            return res.status(201).json({
                success: true,
                message: 'Account created successfully.',
                token,
                user: {
                    id: newUser.id,
                    name: newUser.name,
                    email: newUser.email,
                    mobile: newUser.mobile,
                    role: newUser.role,
                    created_at: newUser.created_at
                }
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * POST /api/auth/login
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body;
            const normalizedEmail = email.trim().toLowerCase();

            const user = await UserModel.findByEmail(normalizedEmail);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            const isMatch = await bcrypt.compare(password, user.password_hash);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password.'
                });
            }

            // Generate JWT session token
            const token = generateToken({
                id: user.id,
                email: user.email,
                role: user.role
            });

            return res.status(200).json({
                success: true,
                message: 'Login successful.',
                token,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    mobile: user.mobile,
                    role: user.role,
                    created_at: user.created_at,
                    updated_at: user.updated_at
                }
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * PUT /api/auth/role
     * Authenticated endpoint
     */
    async updateRole(req, res, next) {
        try {
            const { role } = req.body;
            const userId = req.user.id;

            const updatedUser = await UserModel.updateRole(userId, role);
            if (!updatedUser) {
                return res.status(404).json({
                    success: false,
                    message: 'User account not found.'
                });
            }

            // Issue a refreshed token containing the new role
            const token = generateToken({
                id: updatedUser.id,
                email: updatedUser.email,
                role: updatedUser.role
            });

            return res.status(200).json({
                success: true,
                message: 'Role selected successfully.',
                token,
                user: {
                    id: updatedUser.id,
                    name: updatedUser.name,
                    email: updatedUser.email,
                    mobile: updatedUser.mobile,
                    role: updatedUser.role,
                    created_at: updatedUser.created_at,
                    updated_at: updatedUser.updated_at
                }
            });
        } catch (err) {
            next(err);
        }
    },

    /**
     * GET /api/auth/me
     * Authenticated endpoint
     */
    async getMe(req, res) {
        return res.status(200).json({
            success: true,
            user: req.user
        });
    }
};

module.exports = AuthController;
