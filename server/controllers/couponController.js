const Coupon = require('../models/Coupon');

// @desc    Create a new coupon
// @route   POST /api/coupons
// @access  Private/Admin
const createCoupon = async (req, res) => {
    const { code, discountPercentage, expiryDate } = req.body;

    try {
        // Validation: Check if coupon code already exists
        const couponExists = await Coupon.findOne({ code });
        if (couponExists) {
            return res.status(400).json({ message: 'Coupon already exists. Please update the existing one or use a different code.' });
        }

        // Validation: Expiry Date must be in the future
        const expiry = new Date(expiryDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of today

        if (expiry < today) {
            return res.status(400).json({ message: 'Expiry date cannot be in the past.' });
        }

        const coupon = await Coupon.create({
            code,
            discountPercentage,
            expiryDate
        });

        res.status(201).json(coupon);
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
        const coupons = await Coupon.find({}).sort({ createdAt: -1 });
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
        const coupon = await Coupon.findById(req.params.id);

        if (coupon) {
            await coupon.deleteOne();
            res.json({ message: 'Coupon removed' });
        } else {
            res.status(404).json({ message: 'Coupon not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get active coupons for users
// @route   GET /api/coupons/active
// @access  Private
const getActiveCoupons = async (req, res) => {
    try {
        const currentDate = new Date();
        const coupons = await Coupon.find({
            isActive: true,
            expiryDate: { $gte: currentDate }
        }).select('code discountPercentage expiryDate description'); // Select only necessary fields

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
    const { code } = req.body;

    try {
        const coupon = await Coupon.findOne({ code: code.toUpperCase() });

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid coupon code' });
        }

        if (!coupon.isActive) {
            return res.status(400).json({ message: 'This coupon is no longer active' });
        }

        if (new Date() > new Date(coupon.expiryDate)) {
            return res.status(400).json({ message: 'This coupon has expired' });
        }

        res.json({
            code: coupon.code,
            discountPercentage: coupon.discountPercentage,
            message: 'Coupon applied successfully'
        });

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
