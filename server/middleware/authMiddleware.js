const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware: Protect routes by requiring a valid JWT token.
 * Attaches the user object to req.user for downstream handlers.
 */
const protect = async (req, res, next) => {
    let token;

    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id).select('-password');

            if (!req.user) {
                return res.status(401).json({ message: 'Not authorized, user not found' });
            }

            return next();
        } catch (error) {
            return res.status(401).json({ message: 'Not authorized, token failed' });
        }
    }

    // No token at all
    return res.status(401).json({ message: 'Not authorized, no token' });
};

/**
 * Middleware: Restrict to admin-only routes.
 */
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an admin' });
    }
};

/**
 * Middleware: Restrict to employee or admin routes.
 */
const employee = (req, res, next) => {
    if (req.user && (req.user.role === 'employee' || req.user.role === 'admin')) {
        next();
    } else {
        res.status(403).json({ message: 'Not authorized as an employee' });
    }
};

module.exports = { protect, admin, employee };
