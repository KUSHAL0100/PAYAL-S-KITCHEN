const orderService = require('../services/orderService');
const orderRepo = require('../repositories/orderRepository');

/**
 * Controller: Handles HTTP requests/responses for Orders.
 * All business logic is in orderService.
 * All DB queries are in orderRepository.
 */

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
    const { items } = req.body;
    if (!items || items.length === 0) {
        return res.status(400).json({ message: 'No order items' });
    }

    // Validate delivery deadlines
    const validation = orderService.validateOrderItems(items);
    if (!validation.valid) {
        return res.status(400).json({ message: validation.message });
    }

    try {
        const order = await orderService.createOrder(req.user._id, req.body);
        res.status(201).json(order);
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
        const orders = await orderRepo.findByUserId(req.user._id);
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get logged in user order stats
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
        const order = await orderRepo.findByIdWithUser(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const isOwner = order.user._id.toString() === req.user._id.toString();
        const isStaff = req.user.role === 'admin' || req.user.role === 'employee';
        if (!isOwner && !isStaff) return res.status(401).json({ message: 'Not authorized to view this order' });

        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin/Employee
const updateOrderStatus = async (req, res) => {
    try {
        const result = await orderService.updateOrderStatus(req.params.id, req.body.status);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json({ order: result.order, refundAmount: result.refundAmount, refundError: result.refundError });
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
        const orders = await orderRepo.findAll();
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
    try {
        const order = await orderService.createRazorpayOrder(req.body.amount);
        res.json({ id: order.id, currency: order.currency, amount: order.amount });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Error creating payment order', error: error.message });
    }
};

// @desc    Verify Payment for Cart
// @route   POST /api/orders/verify
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const isValid = orderService.verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) return res.status(400).json({ message: 'Invalid payment signature' });
        res.json({ message: 'Payment verified successfully', paymentId: razorpay_payment_id });
    } catch (error) {
        console.error('Error verifying payment:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Cancel Order (User)
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
    try {
        const result = await orderService.cancelOrder(req.params.id, req.user._id);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json({ message: 'Order cancelled successfully', order: result.order, refund: result.refund, refundError: result.refundError });
    } catch (error) {
        console.error('Error cancelling order:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Add review to order
// @route   PUT /api/orders/:id/review
// @access  Private
const addReview = async (req, res) => {
    try {
        const order = await orderRepo.findByIdWithUser(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Only owner can review
        if (order.user._id.toString() !== req.user._id.toString()) {
            return res.status(401).json({ message: 'Not authorized' });
        }

        // Only single/event orders
        if (!['single', 'event'].includes(order.type)) {
            return res.status(400).json({ message: 'Reviews only for custom/event orders' });
        }

        // Only confirmed orders
        if (order.status !== 'Confirmed') {
            return res.status(400).json({ message: 'Can only review confirmed orders' });
        }

        // Already reviewed?
        if (order.review && order.review.rating) {
            return res.status(400).json({ message: 'Already reviewed' });
        }

        const { rating, comment } = req.body;
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Rating must be 1-5' });
        }

        order.review = { rating, comment: comment || '', createdAt: new Date() };
        await order.save();

        res.json({ message: 'Review added', order });
    } catch (error) {
        console.error('Error adding review:', error);
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
    addReview,
};
