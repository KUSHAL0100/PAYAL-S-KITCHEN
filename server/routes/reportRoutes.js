const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/summary', protect, admin, (req, res) => reportController.getSummary(req, res));
router.get('/day-wise', protect, admin, (req, res) => reportController.getDayWiseSales(req, res));
router.get('/order-bills', protect, admin, (req, res) => reportController.getOrderBills(req, res));
router.get('/subscriptions', protect, admin, (req, res) => reportController.getSubscriptionSummary(req, res));

module.exports = router;
