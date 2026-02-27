const DeliveryPause = require('../models/DeliveryPause');

/**
 * Repository: All database operations for the DeliveryPause model.
 */

const create = async (pauseData) => {
    return await DeliveryPause.create(pauseData);
};

const findByUserId = async (userId) => {
    return await DeliveryPause.find({ user: userId })
        .sort({ startDate: -1, createdAt: -1 })
        .populate('subscription', 'plan mealType');
};

const findByIdAndUserId = async (id, userId) => {
    return await DeliveryPause.findOne({ _id: id, user: userId });
};

const findOverlapping = async (subscriptionId, startDate, endDate) => {
    return await DeliveryPause.findOne({
        subscription: subscriptionId,
        status: 'Active',
        $or: [
            { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
        ]
    });
};

const cancelBySubscription = async (subscriptionId) => {
    return await DeliveryPause.updateMany(
        { subscription: subscriptionId, status: 'Active' },
        { status: 'Cancelled' }
    );
};

const transferToNewSubscription = async (oldSubId, newSubId) => {
    return await DeliveryPause.updateMany(
        { subscription: oldSubId, status: 'Active' },
        { subscription: newSubId }
    );
};

const save = async (pause) => {
    return await pause.save();
};

module.exports = {
    create,
    findByUserId,
    findByIdAndUserId,
    findOverlapping,
    cancelBySubscription,
    transferToNewSubscription,
    save
};
