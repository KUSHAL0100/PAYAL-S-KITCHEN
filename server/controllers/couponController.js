const couponService = require('../services/couponService');
const couponRepo = require('../repositories/couponRepository');

/**
 * Controller: Handles HTTP requests/responses for Coupons.
 * All business logic is in couponService.
 */

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private/Admin
const createCoupon = async (req, res) => {
    try {
        const result = await couponService.createCoupon(req.body);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.status(result.status).json(result.data);
    } catch (error) {
        console.error('createCoupon error:', error);
        res.status(400).json({ message: 'Invalid coupon data', error: error.message });
    }
};

// @desc    Get all coupons
// @route   GET /api/coupons
// @access  Private/Admin
const getCoupons = async (req, res) => {
    try {
        const coupons = await couponRepo.findAll();
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a coupon
// @route   DELETE /api/coupons/:id
// @access  Private/Admin
const deleteCoupon = async (req, res) => {
    try {
        const result = await couponService.deleteCoupon(req.params.id);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json({ message: result.message });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get active coupons for users
// @route   GET /api/coupons/active
// @access  Private
const getActiveCoupons = async (req, res) => {
    try {
        const coupons = await couponRepo.findActive();
        res.json(coupons);
    } catch (error) {
        console.error('getActiveCoupons error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Validate a coupon
// @route   POST /api/coupons/validate
// @access  Private
const validateCoupon = async (req, res) => {
    try {
        const result = await couponService.validateCoupon(req.body.code);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json(result.data);
    } catch (error) {
        console.error('validateCoupon error:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createCoupon,
    getCoupons,
    deleteCoupon,
    getActiveCoupons,
    validateCoupon
};
