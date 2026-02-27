const userRepo = require('../repositories/userRepository');
const { generateToken } = require('../utils/jwtUtils');

/**
 * Service: All business logic for Authentication.
 */

const registerUser = async ({ name, email, password, role }) => {
    if (!name || !email || !password) {
        return { success: false, status: 400, message: 'Please add all fields' };
    }

    const userExists = await userRepo.findByEmail(email);
    if (userExists) {
        return { success: false, status: 400, message: 'User already exists' };
    }

    const user = await userRepo.create({ name, email, password, role: role || 'user' });
    if (user) {
        return {
            success: true, status: 201,
            data: { _id: user.id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id) }
        };
    }
    return { success: false, status: 400, message: 'Invalid user data' };
};

const loginUser = async ({ email, password }) => {
    const user = await userRepo.findByEmail(email);
    if (user && (await user.matchPassword(password))) {
        return {
            success: true,
            data: { _id: user.id, name: user.name, email: user.email, role: user.role, token: generateToken(user._id) }
        };
    }
    return { success: false, status: 400, message: 'Invalid credentials' };
};

const updateUserProfile = async (userId, updates) => {
    const user = await userRepo.findById(userId);
    if (!user) return { success: false, status: 404, message: 'User not found' };

    user.name = updates.name || user.name;
    user.email = updates.email || user.email;
    user.phone = updates.phone || user.phone;

    if (updates.addresses) {
        user.addresses = updates.addresses.map(addr => {
            const { _id, ...rest } = addr;
            return rest;
        });
    }

    if (updates.password) {
        if (await user.matchPassword(updates.password)) {
            return { success: false, status: 400, message: 'New password cannot be the same as the old password' };
        }
        user.password = updates.password;
    }

    const updatedUser = await userRepo.save(user);
    return {
        success: true,
        data: {
            _id: updatedUser._id, name: updatedUser.name, email: updatedUser.email,
            role: updatedUser.role, phone: updatedUser.phone, addresses: updatedUser.addresses,
            token: generateToken(updatedUser._id)
        }
    };
};

module.exports = {
    registerUser,
    loginUser,
    updateUserProfile
};
