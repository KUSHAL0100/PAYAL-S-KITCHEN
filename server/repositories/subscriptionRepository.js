const Subscription = require('../models/Subscription');

/**
 * Repository: All database operations for the Subscription model.
 */

const create = async (subscriptionData) => {
    const subscription = new Subscription(subscriptionData);
    return await subscription.save();
};

const findById = async (id) => {
    return await Subscription.findById(id);
};

const findActiveByUserId = async (userId) => {
    return await Subscription.findOne({
        user: userId,
        status: 'Active'
    });
};

const findActiveByUserIdWithPlan = async (userId) => {
    return await Subscription.findOne({
        user: userId,
        status: 'Active'
    }).populate('plan');
};

const findActiveByUserIdLean = async (userId) => {
    return await Subscription.findOne({
        user: userId,
        status: 'Active',
    }).populate('plan').lean();
};

const findByIdAndUserId = async (id, userId) => {
    return await Subscription.findOne({
        _id: id,
        user: userId
    });
};

const findAll = async () => {
    return await Subscription.find({})
        .populate('user', 'name email')
        .populate('plan', 'name price duration')
        .sort({ createdAt: -1 })
        .lean();
};

const save = async (subscription) => {
    return await subscription.save();
};

module.exports = {
    create,
    findById,
    findActiveByUserId,
    findActiveByUserIdWithPlan,
    findActiveByUserIdLean,
    findByIdAndUserId,
    findAll,
    save
};
