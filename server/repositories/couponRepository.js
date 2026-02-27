const Coupon = require('../models/Coupon');

/**
 * Repository: All database operations for the Coupon model.
 */

const findAll = async () => {
    return await Coupon.find({}).sort({ createdAt: -1 });
};

const findById = async (id) => {
    return await Coupon.findById(id);
};

const findByCode = async (code) => {
    return await Coupon.findOne({ code: code.toUpperCase() });
};

const findActive = async () => {
    return await Coupon.find({
        isActive: true,
        expiryDate: { $gte: new Date() }
    }).select('code discountPercentage expiryDate description');
};

const create = async (couponData) => {
    return await Coupon.create(couponData);
};

const deleteById = async (id) => {
    const coupon = await Coupon.findById(id);
    if (coupon) {
        await coupon.deleteOne();
        return true;
    }
    return false;
};

module.exports = {
    findAll,
    findById,
    findByCode,
    findActive,
    create,
    deleteById
};
