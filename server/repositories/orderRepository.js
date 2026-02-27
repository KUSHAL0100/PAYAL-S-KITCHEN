const Order = require('../models/Order');

/**
 * Repository: All database operations for the Order model.
 * No business logic here — only queries.
 */

const create = async (orderData) => {
    const order = new Order(orderData);
    return await order.save();
};

const findById = async (id) => {
    return await Order.findById(id);
};

const findByIdWithUser = async (id) => {
    return await Order.findById(id).populate('user', 'name email');
};

const findByUserId = async (userId) => {
    return await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .lean();
};

const findAll = async () => {
    return await Order.find({})
        .populate('user', 'id name')
        .sort({ createdAt: -1 })
        .lean();
};

const countSuccessfulOrdersByUserId = async (userId) => {
    return await Order.countDocuments({
        user: userId,
        status: { $nin: ['Cancelled', 'Rejected'] }
    });
};

const updateManyBySubscription = async (subscriptionId, updateData) => {
    return await Order.updateMany(
        { subscription: subscriptionId },
        updateData
    );
};

const findLatestBySubscription = async (subscriptionId) => {
    return await Order.findOne({ subscription: subscriptionId }).sort({ createdAt: -1 });
};

module.exports = {
    create,
    findById,
    findByIdWithUser,
    findByUserId,
    findAll,
    countSuccessfulOrdersByUserId,
    updateManyBySubscription,
    findLatestBySubscription
};
