const Joi = require('joi');

const ALLOWED_ROLES = ['citizen', 'university', 'government', 'industry'];

const signupSchema = Joi.object({
    name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.empty': 'Full name is required.',
            'string.min': 'Full name must be at least 2 characters long.',
            'string.max': 'Full name cannot exceed 100 characters.',
            'any.required': 'Full name is required.'
        }),

    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            'string.empty': 'Email address is required.',
            'string.email': 'Please provide a valid email address.',
            'any.required': 'Email address is required.'
        }),

    mobile: Joi.string()
        .trim()
        .pattern(/^[0-9+\s-]{10,15}$/)
        .allow('', null)
        .messages({
            'string.pattern.base': 'Please provide a valid mobile number (10-15 digits).'
        }),

    password: Joi.string()
        .min(8)
        .max(128)
        .required()
        .messages({
            'string.empty': 'Password is required.',
            'string.min': 'Password must be at least 8 characters long.',
            'string.max': 'Password cannot exceed 128 characters.',
            'any.required': 'Password is required.'
        }),

    confirmPassword: Joi.string()
        .required()
        .valid(Joi.ref('password'))
        .messages({
            'any.only': 'Passwords do not match. Please re-enter.',
            'string.empty': 'Confirm password is required.',
            'any.required': 'Confirm password is required.'
        })
});

const loginSchema = Joi.object({
    email: Joi.string()
        .trim()
        .lowercase()
        .email()
        .required()
        .messages({
            'string.empty': 'Email is required.',
            'string.email': 'Please provide a valid email address.',
            'any.required': 'Email is required.'
        }),

    password: Joi.string()
        .required()
        .messages({
            'string.empty': 'Password is required.',
            'any.required': 'Password is required.'
        })
});

const roleSchema = Joi.object({
    role: Joi.string()
        .trim()
        .lowercase()
        .valid(...ALLOWED_ROLES)
        .required()
        .messages({
            'any.only': `Role must be one of: ${ALLOWED_ROLES.join(', ')}.`,
            'string.empty': 'Role selection is required.',
            'any.required': 'Role selection is required.'
        })
});

module.exports = {
    ALLOWED_ROLES,
    signupSchema,
    loginSchema,
    roleSchema
};
