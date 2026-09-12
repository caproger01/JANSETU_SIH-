/**
 * Centralized error handler middleware
 */
function errorHandler(err, req, res, next) {
    // Log error internally for debugging
    console.error('Unhandled Server Error:', err);

    // PostgreSQL unique violation error code
    if (err.code === '23505') {
        return res.status(409).json({
            success: false,
            message: 'A record with this information already exists.'
        });
    }

    // Default status code
    const statusCode = err.statusCode || res.statusCode >= 400 ? res.statusCode : 500;
    const message = statusCode === 500 
        ? 'An unexpected server error occurred. Please try again later.'
        : (err.message || 'An error occurred.');

    res.status(statusCode).json({
        success: false,
        message: message
    });
}

/**
 * 404 Not Found handler for undefined API routes
 */
function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
}

module.exports = {
    errorHandler,
    notFoundHandler
};
