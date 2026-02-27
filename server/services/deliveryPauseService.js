const deliveryPauseRepo = require('../repositories/deliveryPauseRepository');
const subscriptionRepo = require('../repositories/subscriptionRepository');
const { startOfDay, tomorrow, daysBetween } = require('../utils/dateUtils');

/**
 * Service: All business logic for Delivery Pauses.
 */

const pauseDelivery = async (userId, { subscriptionId, startDate, endDate }) => {
    if (!subscriptionId || !startDate || !endDate) {
        return { success: false, status: 400, message: 'Please provide subscription ID, start date, and end date' };
    }

    const start = startOfDay(startDate);
    const end = startOfDay(endDate);
    const tmrw = tomorrow();

    if (isNaN(start) || isNaN(end)) return { success: false, status: 400, message: 'Invalid date format' };
    if (start < tmrw) return { success: false, status: 400, message: 'Start date must be at least tomorrow' };
    if (end < start) return { success: false, status: 400, message: 'End date must be after or same as start date' };

    // Fetch and validate subscription
    const subscription = await subscriptionRepo.findByIdAndUserId(subscriptionId, userId);
    if (!subscription || subscription.status !== 'Active') {
        return { success: false, status: 404, message: 'Active subscription not found' };
    }

    if (end > subscription.endDate) {
        return { success: false, status: 400, message: 'Pause period cannot exceed subscription end date' };
    }

    // Check overlaps
    const overlap = await deliveryPauseRepo.findOverlapping(subscriptionId, start, end);
    if (overlap) return { success: false, status: 400, message: 'You already have a pause scheduled during this period' };

    const pauseDays = daysBetween(start, end);

    const pause = await deliveryPauseRepo.create({
        user: userId, subscription: subscriptionId,
        startDate: start, endDate: end, pauseDays, status: 'Active'
    });

    return { success: true, status: 201, data: pause };
};

const cancelPause = async (userId, pauseId) => {
    const pause = await deliveryPauseRepo.findByIdAndUserId(pauseId, userId);
    if (!pause) return { success: false, status: 404, message: 'Pause request not found' };
    if (pause.status !== 'Active') return { success: false, status: 400, message: 'Pause is already cancelled or expired' };

    const today = startOfDay();
    const pauseStart = startOfDay(pause.startDate);

    if (today >= pauseStart) return { success: false, status: 400, message: 'Cannot cancel a pause that has already started or is today' };

    pause.status = 'Cancelled';
    await deliveryPauseRepo.save(pause);

    return { success: true, data: pause };
};

module.exports = {
    pauseDelivery,
    cancelPause
};
