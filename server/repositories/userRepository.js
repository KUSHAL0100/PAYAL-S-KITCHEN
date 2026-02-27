const User = require('../models/User');

/**
 * Repository: All database operations for the User model.
 */

const findById = async (id) => {
    return await User.findById(id);
};

const findByEmail = async (email) => {
    return await User.findOne({ email });
};

const create = async (userData) => {
    return await User.create(userData);
};

const save = async (user) => {
    return await user.save();
};

module.exports = {
    findById,
    findByEmail,
    create,
    save
};
