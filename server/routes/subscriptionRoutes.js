const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/subscriptionController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, buySubscription)
    .get(protect, admin, getAllSubscriptions);

router.put('/change-meal-type', protect, changeMealType);
router.put('/update-addresses', protect, updateDeliveryAddresses);
router.put('/:id/cancel', protect, admin, adminCancelSubscription);

router.route('/verify').post(protect, verifySubscriptionPayment);
router.route('/cancel').post(protect, cancelSubscription);
router.route('/me').get(protect, getMySubscription);
router.route('/available-upgrades').get(protect, getAvailableUpgrades);
router.route('/upgrade-init').post(protect, upgradeSubscription);
router.route('/upgrade-verify').post(protect, verifyUpgrade);

module.exports = router;
