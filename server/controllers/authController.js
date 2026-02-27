const authService = require('../services/authService');

/**
 * Controller: Handles HTTP requests/responses for Authentication.
 * All business logic is in authService.
 */

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const registerUser = async (req, res) => {
    const result = await authService.registerUser(req.body);
    if (!result.success) return res.status(result.status).json({ message: result.message });
    res.status(result.status).json(result.data);
};

// @desc    Authenticate a user
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
    const result = await authService.loginUser(req.body);
    if (!result.success) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
};

// @desc    Get user data
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
    res.status(200).json(req.user);
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateUserProfile = async (req, res) => {
    try {
        const result = await authService.updateUserProfile(req.user._id, req.body);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json(result.data);
    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    registerUser,
    loginUser,
    getMe,
    updateUserProfile
};
