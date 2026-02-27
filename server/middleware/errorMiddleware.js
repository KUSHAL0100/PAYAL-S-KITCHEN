/**
 * Global Error Handling Middleware.
 * Catches all unhandled errors from controllers/services.
 * Sends a standardized { success, message } response.
 */

const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`);
    res.status(404);
    next(error);
};

const errorHandler = (err, req, res, next) => {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    
    console.error(`[ERROR] ${req.method} ${req.originalUrl} → ${err.message}`);
    
    res.status(statusCode).json({
        success: false,
        message: err.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    });
};

module.exports = { notFound, errorHandler };
