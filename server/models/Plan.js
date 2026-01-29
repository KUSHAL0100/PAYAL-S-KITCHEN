const mongoose = require('mongoose');

const planSchema = mongoose.Schema({
    name: { type: String, required: true, enum: ['Basic', 'Premium', 'Exotic'] },
    price: { type: Number, required: true },
    duration: { type: String, enum: ['monthly', 'yearly'], required: true },
    description: { type: String },
    features: [String],
}, { timestamps: true });

module.exports = mongoose.model('Plan', planSchema);
