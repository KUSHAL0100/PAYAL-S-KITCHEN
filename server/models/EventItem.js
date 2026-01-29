const mongoose = require('mongoose');

const eventItemSchema = mongoose.Schema({
    name: { type: String, required: true },
    category: { type: String, enum: ['Starter', 'Main Course', 'Dessert', 'Beverage'], required: true },
    price: { type: Number, required: true }, // Price per plate/unit
    description: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('EventItem', eventItemSchema);
