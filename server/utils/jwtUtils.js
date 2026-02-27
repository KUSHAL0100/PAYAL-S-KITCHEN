const jwt = require('jsonwebtoken');

/**
 * Utility: JWT Token generation.
 * Shared across services that need to issue tokens.
 */

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

module.exports = {
    generateToken
};
