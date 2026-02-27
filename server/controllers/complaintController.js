const complaintRepo = require('../repositories/complaintRepository');

/**
 * Controller: Handles HTTP requests/responses for Complaints.
 * DB operations are in complaintRepository.
 */

// @desc    Create a complaint
// @route   POST /api/complaints
// @access  Private
const createComplaint = async (req, res) => {
    const { subject, description, orderId } = req.body;
    try {
        const complaint = await complaintRepo.create({
            user: req.user._id,
            order: orderId,
            subject,
            description,
        });
        res.status(201).json(complaint);
    } catch (error) {
        res.status(400).json({ message: 'Invalid complaint data' });
    }
};

// @desc    Get my complaints
// @route   GET /api/complaints/my
// @access  Private
const getMyComplaints = async (req, res) => {
    try {
        const complaints = await complaintRepo.findByUserId(req.user._id);
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
        const complaints = await complaintRepo.findAll();
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
        const complaint = await complaintRepo.findById(req.params.id);
        if (!complaint) return res.status(404).json({ message: 'Complaint not found' });

        complaint.status = status || complaint.status;
        complaint.resolution = resolution || complaint.resolution;
        complaint.assignedTo = req.user._id;

        const updatedComplaint = await complaintRepo.save(complaint);
        res.json(updatedComplaint);
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
