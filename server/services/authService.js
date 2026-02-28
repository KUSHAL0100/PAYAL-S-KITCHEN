const userRepo = require('../repositories/userRepository');
const { generateToken } = require('../utils/jwtUtils');

/**
 * Service: All business logic for Authentication.
 * OTP stored in-memory Map — auto-expires after 5 min via setTimeout.
 */

// In-memory OTP store: phone -> { otp, timer }
const otpStore = new Map();

const sendOtp = async ({ phone }) => {
    if (!phone || phone.toString().length !== 10) {
        return { success: false, status: 400, message: 'Please provide a valid 10-digit phone number' };
    }

    const phoneStr = phone.toString();

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Clear any existing timer for this phone
    if (otpStore.has(phoneStr)) {
        clearTimeout(otpStore.get(phoneStr).timer);
    }

    // Store OTP with 5-minute auto-expiry
    const timer = setTimeout(() => otpStore.delete(phoneStr), 5 * 60 * 1000);
    otpStore.set(phoneStr, { otp: otpCode, timer });

    // Simulate sending OTP (in production, integrate Twilio/Fast2SMS here)
    console.log(`[SIMULATED SMS] OTP sent to ${phone}: ${otpCode}`);

    return { success: true, status: 200, message: 'OTP sent successfully' };
};

const registerUser = async ({ name, email, password, role, phone, otp }) => {
    if (!name || !email || !password || !phone || !otp) {
        return { success: false, status: 400, message: 'Please add all fields including phone and OTP' };
    }

    const phoneStr = phone.toString();
    if (phoneStr.length !== 10) {
        return { success: false, status: 400, message: 'Phone number must be 10 digits' };
    }

    // Verify OTP from in-memory store
    const stored = otpStore.get(phoneStr);
    if (!stored || stored.otp !== otp) {
        return { success: false, status: 400, message: 'Invalid or expired OTP' };
    }

    const userExists = await userRepo.findByEmail(email);
    if (userExists) {
        return { success: false, status: 400, message: 'User already exists' };
    }

    const user = await userRepo.create({ name, email, password, role: role || 'user', phone });
    if (user) {
        // Clear OTP after successful registration
        clearTimeout(stored.timer);
        otpStore.delete(phoneStr);

        return {
            success: true, status: 201,
            data: { _id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone, token: generateToken(user._id) }
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
    sendOtp,
    registerUser,
    loginUser,
    updateUserProfile
};
