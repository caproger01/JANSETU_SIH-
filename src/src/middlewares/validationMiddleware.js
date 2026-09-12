/**
 * Middleware factory to validate request body with Joi schema
 * Returns 400 with friendly message if validation fails
 */
function validate(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true
        });

        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(' ');
            return res.status(400).json({
                success: false,
                message: errorMessage
            });
        }

        // Replace req.body with sanitized/normalized value
        req.body = value;
        next();
    };
}

module.exports = validate;
