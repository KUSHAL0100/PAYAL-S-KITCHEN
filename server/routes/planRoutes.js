const express = require('express');
const router = express.Router();
const {
    getPlans,
    createPlan,
    updatePlan,
    deletePlan,
} = require('../controllers/planController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getPlans).post(protect, admin, createPlan);
router
    .route('/:id')
    .put(protect, admin, updatePlan)
    .delete(protect, admin, deletePlan);

module.exports = router;
