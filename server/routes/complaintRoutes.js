const express = require('express');
const router = express.Router();
const {
    createComplaint,
    getMyComplaints,
    getComplaints,
    updateComplaint,
} = require('../controllers/complaintController');
const { protect, employee } = require('../middleware/authMiddleware');

router.route('/').post(protect, createComplaint).get(protect, employee, getComplaints);
router.route('/my').get(protect, getMyComplaints);
router.route('/:id').put(protect, employee, updateComplaint);

module.exports = router;
