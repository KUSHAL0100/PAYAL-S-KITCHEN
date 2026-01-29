const express = require('express');
const router = express.Router();
const {
    createCoupon,
    getCoupons,
    deleteCoupon,
    getActiveCoupons,
    validateCoupon
} = require('../controllers/couponController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/')
    .get(protect, admin, getCoupons)
    .post(protect, admin, createCoupon);

router.route('/:id')
    .delete(protect, admin, deleteCoupon);

router.get('/active', protect, getActiveCoupons);
router.post('/validate', protect, validateCoupon);

module.exports = router;
