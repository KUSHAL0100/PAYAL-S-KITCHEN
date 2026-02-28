const mongoose = require('mongoose');

const eventItemSchema = mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, enum: ['Starter', 'Main Course', 'Dessert', 'Beverage'], required: true },
    price: { type: Number, required: true },
    description: { type: String },
    unit: { type: String, default: 'per plate' },
}, { timestamps: true });

module.exports = mongoose.model('EventItem', eventItemSchema);
