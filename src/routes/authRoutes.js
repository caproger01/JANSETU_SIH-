const express = require('express');
const router = express.Router();

const AuthController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authMiddleware');
const validate = require('../middlewares/validationMiddleware');
const {
    signupSchema,
    loginSchema,
    roleSchema
} = require('../validators/authValidators');

// Public authentication routes
router.post('/signup', validate(signupSchema), AuthController.signup);
router.post('/login', validate(loginSchema), AuthController.login);

// Protected authentication routes
router.put('/role', authenticate, validate(roleSchema), AuthController.updateRole);
router.get('/me', authenticate, AuthController.getMe);

module.exports = router;
