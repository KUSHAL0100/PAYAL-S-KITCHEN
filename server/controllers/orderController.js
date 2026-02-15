const Order = require('../models/Order');
const Subscription = require('../models/Subscription');
const User = require('../models/User');
const razorpayUtil = require('../utils/razorpay');
const crypto = require('crypto');
const orderService = require('../services/orderService');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    const {
        items,
        price,
        totalAmount,
        type,
        paymentDate,
        deliveryAddress,

        paymentId,
        discountAmount,
        couponCode
    } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No order items' });
    }

    const now = new Date();

    // Validation
    for (const item of items) {
        if (!item.deliveryDate) continue;
        const itemDelivery = new Date(item.deliveryDate);

        // Event item validation (48 hours before event time)
        if (item.name === 'Event Catering' || (item.selectedItems && item.selectedItems.name && item.selectedItems.name.toLowerCase().includes('event'))) {
            // Use deliveryTime if available, otherwise compare against the date at 12 PM
            if (item.deliveryTime) {
                const datePart = itemDelivery.toISOString().split('T')[0];
                const parsed = new Date(`${datePart} ${item.deliveryTime}`);
                if (!isNaN(parsed.getTime())) itemDelivery.setTime(parsed.getTime());
            } else {
                itemDelivery.setHours(12, 0, 0, 0);
            }
            const diffInHours = (itemDelivery - now) / 1000 / 60 / 60;
            if (diffInHours < 48) {
                return res.status(400).json({ message: 'Event catering items must be placed at least 48 hours in advance.' });
            }
        }
        // Regular meal validation (Check 12h rule if it looks like a meal)
        else {
            let mealTime = null;
            // Check name first
            if (item.name && item.name.toLowerCase().includes('lunch')) mealTime = 'Lunch';
            else if (item.name && item.name.toLowerCase().includes('dinner')) mealTime = 'Dinner';

            // Check selectedItems if not found in name
            if (!mealTime && item.selectedItems) {
                // If selectedItems is object with name string
                const selName = item.selectedItems.name || '';
                if (selName.includes('Lunch')) mealTime = 'Lunch';
                else if (selName.includes('Dinner')) mealTime = 'Dinner';

                // If logic was array based previously, keep compatibility if needed, but Cart.jsx sends string joined
            }

            if (mealTime) {
                const itemTargetTime = new Date(itemDelivery);
                if (mealTime === 'Lunch') {
                    itemTargetTime.setHours(12, 0, 0, 0);
                } else if (mealTime === 'Dinner') {
                    itemTargetTime.setHours(20, 0, 0, 0);
                }

                const diffInHours = (itemTargetTime - now) / 1000 / 60 / 60;
                if (diffInHours < 12) {
                    return res.status(400).json({
                        message: `${mealTime} orders for ${item.name} must be placed at least 12 hours in advance. Deadline passed.`
                    });
                }
            }
        }
    }

    try {
        const order = new Order({
            user: req.user._id,
            items,
            price: price || totalAmount, // Fallback for safety
            totalAmount,
            type,
            paymentDate,
            deliveryAddress,
            paymentId: paymentId || 'DUMMY_PAYMENT_ID',
            paymentStatus: 'Paid', // Assuming immediate payment for now
            status: 'Pending', // Wait for Admin approval
            discountAmount: discountAmount || 0,
            couponCode: couponCode || null
        });

        const createdOrder = await order.save();
        res.status(201).json(createdOrder);
    } catch (error) {
        console.error('Order creation failed:', error.message);
        res.status(400).json({ message: 'Invalid order data', error: error.message });
    }
};

// @desc    Get logged in user orders
// @route   GET /api/orders/myorders
// @access  Private
const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .lean(); // Use lean() for faster read-only queries
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get logged in user order stats (total success count)
// @route   GET /api/orders/my-stats
// @access  Private
const getMyOrderStats = async (req, res) => {
    try {
        const stats = await orderService.getOrderStats(req.user._id);
        res.json(stats);
    } catch (error) {
        console.error('Error fetching order stats:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get order by ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');

        if (order) {
            // Check if user is owner or admin/employee
            if (
                order.user._id.toString() === req.user._id.toString() ||
                req.user.role === 'admin' ||
                req.user.role === 'employee'
            ) {
                res.json(order);
            } else {
                res.status(401).json({ message: 'Not authorized to view this order' });
            }
        } else {
            res.status(404).json({ message: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin/Employee
const updateOrderStatus = async (req, res) => {
    const { status } = req.body;

    try {
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        let refundError = null;

        // If status is being changed to Rejected (meaning Admin/Employee rejected it)
        if (status === 'Rejected' && order.status !== 'Rejected') {
            const total = parseFloat(order.totalAmount) || 0;

            // Full refund — no cancellation fee when merchant rejects
            order.refundAmount = total;
            order.cancellationFee = 0;

            // If it's already paid, attempt Razorpay refund
            if (order.paymentStatus === 'Paid' && order.paymentId && order.paymentId !== 'DUMMY_PAYMENT_ID') {
                try {
                    await razorpayUtil.processRefund(order.paymentId, total);
                    order.paymentStatus = 'Refunded';
                    console.log(`Full refund of ₹${total} processed for order ${order._id}`);
                } catch (refundErr) {
                    const errorMsg = refundErr.error?.description || refundErr.message || 'Unknown Razorpay error';
                    console.error('Merchant initiated refund failed:', errorMsg);
                    
                    // Check if already refunded
                    if (refundErr.error?.description === 'The payment has been fully refunded' ||
                        (refundErr.message && refundErr.message.includes('refunded'))) {
                        order.paymentStatus = 'Refunded';
                    } else {
                        order.paymentStatus = 'Refund Failed';
                        refundError = errorMsg;
                    }
                }
            } else {
                // Dummy payment or not paid — mark as refunded for record keeping
                order.paymentStatus = 'Refunded';
            }
        }

        order.status = status;
        const updatedOrder = await order.save();

        res.json({
            order: updatedOrder,
            refundAmount: updatedOrder.refundAmount,
            refundError
        });
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all orders (Admin/Employee)
// @route   GET /api/orders
// @access  Private/Admin/Employee
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find({})
            .populate('user', 'id name')
            .sort({ createdAt: -1 })
            .lean(); // Use lean() for faster read-only queries
        res.json(orders);
    } catch (error) {
        console.error('Error fetching all orders:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create Razorpay Order for Cart
// @route   POST /api/orders/razorpay
// @access  Private
const createRazorpayOrder = async (req, res) => {
    const { amount } = req.body;

    try {
        const order = await razorpayUtil.createOrder(amount, 'receipt_cart');

        res.json({
            id: order.id,
            currency: order.currency,
            amount: order.amount,
        });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Error creating payment order', error: error.message });
    }
};

// @desc    Verify Payment for Cart
// @route   POST /api/orders/verify
// @access  Private
const verifyPayment = async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    try {
        const isValid = razorpayUtil.verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);

        if (!isValid) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        res.json({ message: 'Payment verified successfully', paymentId: razorpay_payment_id });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Cancel Order (User)
// @route   PUT /api/orders/:id/cancel
// @access  Private (User can cancel their own orders)
const cancelOrder = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user owns this order
        if (order.user.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized to cancel this order' });
        }

        if (order.status === 'Cancelled' || order.status === 'Delivered' || order.status === 'Upgraded') {
            return res.status(400).json({ message: 'Cannot cancel this order' });
        }

        let cancellationFee = 0;
        let refundAmount = 0;
        const total = parseFloat(order.totalAmount) || 0;

        // 1) Subscriptions → No refund ever
        if (order.type === 'subscription_purchase' || order.type === 'subscription_upgrade') {
            cancellationFee = total;
            refundAmount = 0;

        // 2) Pending → Full refund (admin hasn't approved yet)
        } else if (order.status === 'Pending') {
            cancellationFee = 0;
            refundAmount = total;

        // 3) Confirmed → Check how many hours are left before delivery
        } else {
            const now = new Date();

            // Get the earliest delivery date from items, default to 12 PM if no time stored
            const deliveryDates = (order.items || [])
                .filter(item => item.deliveryDate)
                .map(item => {
                    const d = new Date(item.deliveryDate);
                    if (!item.deliveryTime) {
                        d.setHours(12, 0, 0, 0); // Default: 12 PM
                    }
                    return d;
                });

            const earliestDelivery = deliveryDates.length > 0
                ? new Date(Math.min(...deliveryDates))
                : new Date(order.createdAt.getTime() + 24 * 60 * 60 * 1000); // fallback: +1 day

            const hoursLeft = (earliestDelivery - now) / (1000 * 60 * 60);

            // Single: 2h window | Event: 8h window | Other: only if past
            const noRefundWindow = order.type === 'event' ? 8 : order.type === 'single' ? 2 : 0;
            const isLate = hoursLeft < noRefundWindow;

            cancellationFee = isLate ? total : total * 0.20;
            refundAmount = isLate ? 0 : total - cancellationFee;
        }

        // Process refund via Razorpay
        let refundData = null;
        let refundError = null;

        if (refundAmount > 0 && order.paymentStatus === 'Paid' && order.paymentId) {
            try {
                const refund = await razorpayUtil.processRefund(order.paymentId, refundAmount);
                refundData = refund;
                console.log(`Refund processed: ${refund.id} (₹${refundAmount})`);
            } catch (error) {
                // If error says it's already refunded, we can consider it a success state for our DB
                if (error.error && error.error.description === 'The payment has been fully refunded') {
                    console.log(`Payment already refunded for order ${order._id}. Marking as refunded.`);
                    refundData = { id: 'manual_check', amount: refundAmount * 100 }; // Mock data
                } else if (error.message && error.message.includes('refunded')) {
                    console.log(`Payment likely already refunded: ${error.message}`);
                    refundData = { id: 'manual_check', amount: refundAmount * 100 };
                } else {
                const errorMsg = error.error?.description || error.message || 'Unknown Razorpay error';
                console.error(`Refund failed for order ${order._id}:`, errorMsg);
                refundError = errorMsg;
                }
            }
        }

        order.status = 'Cancelled';
        order.cancellationFee = cancellationFee;
        order.refundAmount = refundAmount;
        await order.save();

        // Bi-directional sync: Cancel linked Subscription if this is a subscription order
        if (order.subscription) {
            const subscription = await Subscription.findById(order.subscription);
            // Cancel if subscription exists and is not already cancelled
            if (subscription && subscription.status !== 'Cancelled') {
                subscription.status = 'Cancelled';
                await subscription.save();

                // Also nullify the user's currentSubscription reference
                const user = await User.findById(req.user._id);
                if (user && user.currentSubscription && user.currentSubscription.toString() === subscription._id.toString()) {
                    user.currentSubscription = null;
                    await user.save();
                }
            }
        }

        res.json({
            message: 'Order cancelled successfully',
            order,
            refund: refundData,
            refundError: refundError
        });

    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createOrder,
    getMyOrders,
    getOrderById,
    updateOrderStatus,
    getOrders,
    createRazorpayOrder,
    verifyPayment,
    cancelOrder,
    getMyOrderStats,
};
