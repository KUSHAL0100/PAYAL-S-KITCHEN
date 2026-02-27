const couponRepo = require('../repositories/couponRepository');

/**
 * Service: All business logic for Coupons.
 */

const createCoupon = async ({ code, discountPercentage, expiryDate }) => {
    const couponExists = await couponRepo.findByCode(code);
    if (couponExists) return { success: false, status: 400, message: 'Coupon already exists. Please update the existing one or use a different code.' };

    const expiry = new Date(expiryDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (expiry < today) return { success: false, status: 400, message: 'Expiry date cannot be in the past.' };

    const coupon = await couponRepo.create({ code, discountPercentage, expiryDate });
    return { success: true, status: 201, data: coupon };
};

const validateCoupon = async (code) => {
    const coupon = await couponRepo.findByCode(code);
    if (!coupon) return { success: false, status: 404, message: 'Invalid coupon code' };
    if (!coupon.isActive) return { success: false, status: 400, message: 'This coupon is no longer active' };
    if (new Date() > new Date(coupon.expiryDate)) return { success: false, status: 400, message: 'This coupon has expired' };

    return {
        success: true,
        data: { code: coupon.code, discountPercentage: coupon.discountPercentage, message: 'Coupon applied successfully' }
    };
};

const deleteCoupon = async (id) => {
    const deleted = await couponRepo.deleteById(id);
    if (!deleted) return { success: false, status: 404, message: 'Coupon not found' };
    return { success: true, message: 'Coupon removed' };
};

module.exports = {
    createCoupon,
    validateCoupon,
    deleteCoupon
};
