const subscriptionService = require('../services/subscriptionService');
const subscriptionRepo = require('../repositories/subscriptionRepository');
const deliveryPauseRepo = require('../repositories/deliveryPauseRepository');

/**
 * Controller: Handles HTTP requests/responses for Subscriptions.
 * All business logic is in subscriptionService.
 */

// @desc    Buy a subscription (Create Razorpay Order)
// @route   POST /api/subscriptions
// @access  Private
const buySubscription = async (req, res) => {
    try {
        const result = await subscriptionService.buySubscription(req.user._id, req.body);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json(result.data);
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ message: 'Error creating payment order', error: error.message });
    }
};

// @desc    Verify Payment and Activate Subscription
// @route   POST /api/subscriptions/verify
// @access  Private
const verifySubscriptionPayment = async (req, res) => {
    try {
        const result = await subscriptionService.verifyAndActivate(req.user._id, req.body);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.status(201).json({ subscription: result.subscription, order: result.order });
    } catch (error) {
        res.status(500).json({ message: error.message || 'Server Error' });
    }
};

// @desc    Cancel Subscription
// @route   POST /api/subscriptions/cancel
// @access  Private
const cancelSubscription = async (req, res) => {
    try {
        const result = await subscriptionService.cancelSubscription(req.user._id, req.body.subscriptionId);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json({ message: 'Subscription cancelled successfully', subscription: result.subscription });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get my subscription
// @route   GET /api/subscriptions/me
// @access  Private
const getMySubscription = async (req, res) => {
    try {
        const subscription = await subscriptionRepo.findActiveByUserIdLean(req.user._id);
        if (subscription) res.json(subscription);
        else res.status(404).json({ message: 'No active subscription found' });
    } catch (error) {
        console.error('Error in getMySubscription:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all subscriptions (Admin)
// @route   GET /api/subscriptions
// @access  Private/Admin
const getAllSubscriptions = async (req, res) => {
    try {
        const subscriptions = await subscriptionRepo.findAll();
        res.json(subscriptions);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Cancel Subscription (Admin)
// @route   PUT /api/subscriptions/:id/cancel
// @access  Private/Admin
const adminCancelSubscription = async (req, res) => {
    try {
        const result = await subscriptionService.adminCancelSubscription(req.params.id);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json({ message: 'Subscription cancelled by admin', subscription: result.subscription });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get available upgrade plans for user
// @route   GET /api/subscriptions/available-upgrades
// @access  Private
const getAvailableUpgrades = async (req, res) => {
    try {
        const result = await subscriptionService.getAvailableUpgrades(req.user._id);
        res.json(result.data);
    } catch (error) {
        console.error('Error getting available upgrades:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Initiate Subscription Upgrade
// @route   POST /api/subscriptions/upgrade-init
// @access  Private
const upgradeSubscription = async (req, res) => {
    try {
        const result = await subscriptionService.initiateUpgrade(req.user._id, req.body);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json(result.data);
    } catch (error) {
        console.error('Error initiating upgrade:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Verify Upgrade Payment
// @route   POST /api/subscriptions/upgrade-verify
// @access  Private
const verifyUpgrade = async (req, res) => {
    try {
        const result = await subscriptionService.verifyUpgrade(req.user._id, req.body);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.status(201).json({ message: 'Subscription upgraded successfully', subscription: result.subscription, order: result.order });
    } catch (error) {
        console.error('Error verifying upgrade:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Change meal type
// @route   PUT /api/subscriptions/change-meal-type
// @access  Private
const changeMealType = async (req, res) => {
    try {
        const result = await subscriptionService.changeMealType(req.user._id, req.body.mealType);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json({ message: `Meal type updated to ${req.body.mealType}. (No refund applied as per policy)`, subscription: result.subscription });
    } catch (error) {
        console.error('Error changing meal type:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update delivery addresses
// @route   PUT /api/subscriptions/delivery-addresses
// @access  Private
const updateDeliveryAddresses = async (req, res) => {
    try {
        const result = await subscriptionService.updateDeliveryAddresses(req.user._id, req.body);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json({ message: 'Delivery addresses updated successfully', subscription: result.subscription });
    } catch (error) {
        console.error('Error updating delivery addresses:', error);
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    buySubscription,
    verifySubscriptionPayment,
    cancelSubscription,
    getMySubscription,
    getAllSubscriptions,
    adminCancelSubscription,
    getAvailableUpgrades,
    upgradeSubscription,
    verifyUpgrade,
    changeMealType,
    updateDeliveryAddresses
};
