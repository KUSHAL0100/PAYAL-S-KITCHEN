const Order = require('../models/Order');

/**
 * Repository to handle all database operations for Orders.
 */
const countSuccessfulOrdersByUserId = async (userId) => {
    // Count orders where user matches, and status is NOT Cancelled or Rejected This includes subscription_purchase, subscription_upgrade, single, and event
    return await Order.countDocuments({
        user: userId,
        status: { $in: ['Confirmed', 'Upgraded'] }
    });
};

module.exports = {
    countSuccessfulOrdersByUserId
};
