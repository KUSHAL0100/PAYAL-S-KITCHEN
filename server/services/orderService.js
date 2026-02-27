const orderRepo = require('../repositories/orderRepository');
const subscriptionRepo = require('../repositories/subscriptionRepository');
const userRepo = require('../repositories/userRepository');
const razorpayUtil = require('../utils/razorpay');

/**
 * Service: All business logic for Orders.
 * Controllers call these functions. These functions call repositories.
 */

// ─── Stats ───
const getOrderStats = async (userId) => {
    if (!userId) throw new Error('User ID is required');
    const totalSuccessfulOrders = await orderRepo.countSuccessfulOrdersByUserId(userId);
    return { totalSuccessfulOrders };
};

// ─── Validation: Check delivery deadlines ───
const validateOrderItems = (items) => {
    const now = new Date();

    for (const item of items) {
        if (!item.deliveryDate) continue;
        const itemDelivery = new Date(item.deliveryDate);

        // Event validation: 48 hours before event
        if (item.name === 'Event Catering' || (item.selectedItems?.name?.toLowerCase().includes('event'))) {
            if (item.deliveryTime) {
                const datePart = itemDelivery.toISOString().split('T')[0];
                const parsed = new Date(`${datePart} ${item.deliveryTime}`);
                if (!isNaN(parsed.getTime())) itemDelivery.setTime(parsed.getTime());
            } else {
                itemDelivery.setHours(12, 0, 0, 0);
            }
            const diffInHours = (itemDelivery - now) / 1000 / 60 / 60;
            if (diffInHours < 48) {
                return { valid: false, message: 'Event catering items must be placed at least 48 hours in advance.' };
            }
        }
        // Regular meal validation: 12 hours before
        else {
            let mealTime = null;
            if (item.name?.toLowerCase().includes('lunch')) mealTime = 'Lunch';
            else if (item.name?.toLowerCase().includes('dinner')) mealTime = 'Dinner';
            if (!mealTime && item.selectedItems) {
                const selName = item.selectedItems.name || '';
                if (selName.includes('Lunch')) mealTime = 'Lunch';
                else if (selName.includes('Dinner')) mealTime = 'Dinner';
            }

            if (mealTime) {
                const itemTargetTime = new Date(itemDelivery);
                if (mealTime === 'Lunch') itemTargetTime.setHours(12, 0, 0, 0);
                else if (mealTime === 'Dinner') itemTargetTime.setHours(20, 0, 0, 0);
                const diffInHours = (itemTargetTime - now) / 1000 / 60 / 60;
                if (diffInHours < 12) {
                    return { valid: false, message: `${mealTime} orders for ${item.name} must be placed at least 12 hours in advance. Deadline passed.` };
                }
            }
        }
    }
    return { valid: true };
};

// ─── Create Order ───
const createOrder = async (userId, orderData) => {
    const { items, price, totalAmount, type, paymentDate, deliveryAddress, paymentId, discountAmount, couponCode } = orderData;

    return await orderRepo.create({
        user: userId,
        items,
        price: price || totalAmount,
        totalAmount,
        type,
        paymentDate,
        deliveryAddress,
        paymentId: paymentId || 'DUMMY_PAYMENT_ID',
        paymentStatus: 'Paid',
        status: 'Pending',
        discountAmount: discountAmount || 0,
        couponCode: couponCode || null
    });
};

// ─── Update Order Status (Admin) ───
const updateOrderStatus = async (orderId, newStatus) => {
    const order = await orderRepo.findById(orderId);
    if (!order) return { success: false, status: 404, message: 'Order not found' };

    let refundError = null;

    // Merchant rejection → Full refund
    if (newStatus === 'Rejected' && order.status !== 'Rejected') {
        const total = parseFloat(order.totalAmount) || 0;
        order.refundAmount = total;
        order.cancellationFee = 0;

        if (order.paymentStatus === 'Paid' && order.paymentId && order.paymentId !== 'DUMMY_PAYMENT_ID') {
            try {
                await razorpayUtil.processRefund(order.paymentId, total);
                order.paymentStatus = 'Refunded';
            } catch (refundErr) {
                const errorMsg = refundErr.error?.description || refundErr.message || 'Unknown Razorpay error';
                if (refundErr.error?.description === 'The payment has been fully refunded' ||
                    (refundErr.message && refundErr.message.includes('refunded'))) {
                    order.paymentStatus = 'Refunded';
                } else {
                    order.paymentStatus = 'Refund Failed';
                    refundError = errorMsg;
                }
            }
        } else {
            order.paymentStatus = 'Refunded';
        }
    }

    order.status = newStatus;
    const updatedOrder = await order.save();

    return { success: true, order: updatedOrder, refundAmount: updatedOrder.refundAmount, refundError };
};

// ─── Cancel Order (User) ───
const cancelOrder = async (orderId, userId) => {
    const order = await orderRepo.findById(orderId);
    if (!order) return { success: false, status: 404, message: 'Order not found' };
    if (order.user.toString() !== userId.toString()) return { success: false, status: 401, message: 'Not authorized to cancel this order' };
    if (['Cancelled', 'Delivered', 'Upgraded'].includes(order.status)) return { success: false, status: 400, message: 'Cannot cancel this order' };

    let cancellationFee = 0;
    let refundAmount = 0;
    const total = parseFloat(order.totalAmount) || 0;

    // Subscriptions → No refund
    if (order.type === 'subscription_purchase' || order.type === 'subscription_upgrade') {
        cancellationFee = total;
        refundAmount = 0;
    // Pending → Full refund
    } else if (order.status === 'Pending') {
        cancellationFee = 0;
        refundAmount = total;
    // Confirmed → Window-based refund
    } else {
        const now = new Date();
        const deliveryDates = (order.items || [])
            .filter(item => item.deliveryDate)
            .map(item => {
                const d = new Date(item.deliveryDate);
                if (!item.deliveryTime) d.setHours(12, 0, 0, 0);
                return d;
            });

        const earliestDelivery = deliveryDates.length > 0
            ? new Date(Math.min(...deliveryDates))
            : new Date(order.createdAt.getTime() + 24 * 60 * 60 * 1000);

        const hoursLeft = (earliestDelivery - now) / (1000 * 60 * 60);
        const noRefundWindow = order.type === 'event' ? 8 : order.type === 'single' ? 2 : 0;
        const isLate = hoursLeft < noRefundWindow;

        cancellationFee = isLate ? total : total * 0.20;
        refundAmount = isLate ? 0 : total - cancellationFee;
    }

    // Process Razorpay refund
    let refundData = null;
    let refundError = null;

    if (refundAmount > 0 && order.paymentStatus === 'Paid' && order.paymentId) {
        try {
            refundData = await razorpayUtil.processRefund(order.paymentId, refundAmount);
        } catch (error) {
            if (error.error?.description === 'The payment has been fully refunded' ||
                (error.message && error.message.includes('refunded'))) {
                refundData = { id: 'manual_check', amount: refundAmount * 100 };
            } else {
                refundError = error.error?.description || error.message || 'Unknown Razorpay error';
            }
        }
    }

    order.status = 'Cancelled';
    order.cancellationFee = cancellationFee;
    order.refundAmount = refundAmount;
    await order.save();

    // Bi-directional sync: Cancel linked Subscription
    if (order.subscription) {
        const subscription = await subscriptionRepo.findById(order.subscription);
        if (subscription && subscription.status !== 'Cancelled') {
            subscription.status = 'Cancelled';
            await subscriptionRepo.save(subscription);

            const user = await userRepo.findById(userId);
            if (user && user.currentSubscription && user.currentSubscription.toString() === subscription._id.toString()) {
                user.currentSubscription = null;
                await userRepo.save(user);
            }
        }
    }

    return { success: true, order, refund: refundData, refundError };
};

// ─── Razorpay ───
const createRazorpayOrder = async (amount) => {
    return await razorpayUtil.createOrder(amount, 'receipt_cart');
};

const verifyPayment = (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
    return razorpayUtil.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
};

module.exports = {
    getOrderStats,
    validateOrderItems,
    createOrder,
    updateOrderStatus,
    cancelOrder,
    createRazorpayOrder,
    verifyPayment
};
