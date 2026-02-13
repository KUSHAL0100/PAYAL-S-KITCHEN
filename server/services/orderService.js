const orderRepository = require('../repositories/orderRepository');

/**
 * Service to handle business logic for Order statistics.
 */
const getOrderStats = async (userId) => {
    if (!userId) {
        throw new Error('User ID is required');
    }

    const totalSuccessfulOrders = await orderRepository.countSuccessfulOrdersByUserId(userId);
    
    return {
        totalSuccessfulOrders
    };
};

module.exports = {
    getOrderStats
};
