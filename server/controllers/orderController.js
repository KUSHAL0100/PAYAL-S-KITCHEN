const Order = require('../models/Order');
const razorpayUtil = require('../utils/razorpay');
const crypto = require('crypto');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    const {
        items,
        price,
        totalAmount,
        type,
        deliveryDate,
        deliveryAddress,

        paymentId,
        discountAmount,
        couponCode
    } = req.body;

    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No order items' });
    }

    // Cutoff validation
    const now = new Date();
    const delivery = new Date(deliveryDate);

    // Check for Event orders (48 hours)
    if (type === 'event') {
        const diffInHours = (delivery - now) / 1000 / 60 / 60;
        if (diffInHours < 48) {
            return res.status(400).json({ message: 'Event orders must be placed at least 48 hours in advance.' });
        }
    }
    // Check for Single Tiffin orders (12 hours based on Meal Time)
    else if (type === 'single') {
        // We need to check each item's meal time from details string
        // Lunch: 12:00 PM, Dinner: 08:00 PM (20:00)

        for (const item of items) {
            // We need to check each item's meal time from selectedItems or name
            let mealTime = null;

            // Check name first
            if (item.name && item.name.toLowerCase().includes('lunch')) mealTime = 'Lunch';
            else if (item.name && item.name.toLowerCase().includes('dinner')) mealTime = 'Dinner';

            // Check selectedItems if not found in name
            if (!mealTime && item.selectedItems && item.selectedItems.length > 0) {
                const hasLunch = item.selectedItems.some(si => (si.mealTime === 'Lunch') || (si.name && si.name.includes('Lunch')));
                const hasDinner = item.selectedItems.some(si => (si.mealTime === 'Dinner') || (si.name && si.name.includes('Dinner')));

                if (hasLunch) mealTime = 'Lunch';
                else if (hasDinner) mealTime = 'Dinner';
            }

            if (mealTime) {
                const itemTargetTime = new Date(delivery);
                if (mealTime === 'Lunch') {
                    itemTargetTime.setHours(12, 0, 0, 0);
                } else if (mealTime === 'Dinner') {
                    itemTargetTime.setHours(20, 0, 0, 0);
                }

                const diffInHours = (itemTargetTime - now) / 1000 / 60 / 60;
                if (diffInHours < 12) {
                    return res.status(400).json({
                        message: `${mealTime} orders must be placed at least 12 hours in advance. Deadline passed for ${itemTargetTime.toLocaleDateString()}.`
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
            deliveryDate,
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
            .populate('subscription');
        res.json(orders);
    } catch (error) {
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

        // If status is being changed to Cancelled (meaning Admin/Employee rejected it)
        if (status === 'Cancelled' && order.status !== 'Cancelled') {
            const total = parseFloat(order.totalAmount) || 0;

            // If it's already paid, trigger a full refund (100% since merchant rejected it)
            if (order.paymentStatus === 'Paid' && order.paymentId) {
                try {
                    await razorpayUtil.processRefund(order.paymentId, total);
                    order.refundAmount = total;
                    order.cancellationFee = 0;
                } catch (refundErr) {
                    console.error('Merchant initiated refund failed:', refundErr.message);
                    // Still mark as cancelled but keep track of error if needed
                }
            } else {
                // Not paid, just cancel
                order.refundAmount = 0;
                order.cancellationFee = 0;
            }
        }

        order.status = status;
        const updatedOrder = await order.save();
        res.json(updatedOrder);
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
        const orders = await Order.find({}).populate('user', 'id name').sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
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

        if (order.status === 'Cancelled' || order.status === 'Delivered') {
            return res.status(400).json({ message: 'Cannot cancel this order' });
        }

        let cancellationFee = 0;
        let refundAmount = 0;
        const total = parseFloat(order.totalAmount) || 0;

        // Calculate cancellation fee based on order status
        // Calculate cancellation fee based on order status
        if (order.status === 'Pending') {
            // Pending orders: 0% fee, 100% refund
            cancellationFee = 0;
            refundAmount = total;
        } else {
            // Confirmed orders: Time-based cancellation fees
            const now = new Date();
            const deliveryDate = new Date(order.deliveryDate);
            const diffInHours = (deliveryDate - now) / (1000 * 60 * 60);

            if (order.type === 'event') {
                // Event orders: 100% fee if < 5 hours, 20% fee otherwise
                cancellationFee = diffInHours < 5 ? total : total * 0.20;
            } else if (order.type === 'single') {
                // Single orders: 100% fee if < 2 hours, 20% fee otherwise
                cancellationFee = diffInHours < 2 ? total : total * 0.20;
            } else {
                // Other types: 20% fee
                cancellationFee = total * 0.20;
            }

            // Ensure precise math
            if (cancellationFee >= total) {
                cancellationFee = total;
                refundAmount = 0;
            } else {
                refundAmount = total - cancellationFee;
            }
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
                    console.error(`Refund failed for order ${order._id}:`, error.message);
                    refundError = error.message;
                }
            }
        }

        order.status = 'Cancelled';
        order.cancellationFee = cancellationFee;
        order.refundAmount = refundAmount;
        await order.save();

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
};
