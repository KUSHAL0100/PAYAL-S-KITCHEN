const Complaint = require('../models/Complaint');

// @desc    Create a complaint
// @route   POST /api/complaints
// @access  Private
const createComplaint = async (req, res) => {
    const { subject, description, orderId } = req.body;

    try {
        const complaint = new Complaint({
            user: req.user._id,
            order: orderId,
            subject,
            description,
        });

        const createdComplaint = await complaint.save();
        res.status(201).json(createdComplaint);
    } catch (error) {
        res.status(400).json({ message: 'Invalid complaint data' });
    }
};

// @desc    Get my complaints
// @route   GET /api/complaints/my
// @access  Private
const getMyComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({ user: req.user._id }).sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get all complaints (Admin/Employee)
// @route   GET /api/complaints
// @access  Private/Admin/Employee
const getComplaints = async (req, res) => {
    try {
        const complaints = await Complaint.find({}).populate('user', 'name email').sort({ createdAt: -1 });
        res.json(complaints);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Update complaint status/resolution
// @route   PUT /api/complaints/:id
// @access  Private/Admin/Employee
const updateComplaint = async (req, res) => {
    const { status, resolution } = req.body;

    try {
        const complaint = await Complaint.findById(req.params.id);

        if (complaint) {
            complaint.status = status || complaint.status;
            complaint.resolution = resolution || complaint.resolution;
            complaint.assignedTo = req.user._id; // Assign to current employee/admin updating it

            const updatedComplaint = await complaint.save();
            res.json(updatedComplaint);
        } else {
            res.status(404).json({ message: 'Complaint not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    createComplaint,
    getMyComplaints,
    getComplaints,
    updateComplaint,
};
