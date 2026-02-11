const express = require('express');
const router = express.Router();
const { getDeliverySchedule } = require('../controllers/deliveryScheduleController');
const { protect, admin } = require('../middleware/authMiddleware');

router.get('/', protect, admin, getDeliverySchedule);

module.exports = router;
