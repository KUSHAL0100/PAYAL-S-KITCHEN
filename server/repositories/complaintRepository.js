const Complaint = require('../models/Complaint');

/**
 * Repository: All database operations for the Complaint model.
 */

const create = async (complaintData) => {
    const complaint = new Complaint(complaintData);
    return await complaint.save();
};

const findByUserId = async (userId) => {
    return await Complaint.find({ user: userId }).sort({ createdAt: -1 });
};

const findAll = async () => {
    return await Complaint.find({}).populate('user', 'name email').sort({ createdAt: -1 });
};

const findById = async (id) => {
    return await Complaint.findById(id);
};

const save = async (complaint) => {
    return await complaint.save();
};

module.exports = {
    create,
    findByUserId,
    findAll,
    findById,
    save
};
