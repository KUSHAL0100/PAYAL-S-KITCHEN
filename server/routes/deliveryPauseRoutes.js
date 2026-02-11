const express = require('express');
const router = express.Router();
const {
    pauseDelivery,
    getMyPauses,
    cancelPause
} = require('../controllers/deliveryPauseController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
    .post(protect, pauseDelivery)
    .get(protect, getMyPauses);

router.route('/:id/cancel')
    .put(protect, cancelPause);

module.exports = router;
