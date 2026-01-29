const mongoose = require('mongoose');

const complaintSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' }, // Optional, if related to an order
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['Open', 'In Progress', 'Resolved'], default: 'Open' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Employee
    resolution: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Complaint', complaintSchema);
