const mongoose = require('mongoose');

const menuSchema = mongoose.Schema({
    date: { type: Date, required: true },
    planType: { type: String, enum: ['Basic', 'Premium', 'Exotic'], required: true },
    items: {
        lunch: [String],
        dinner: [String],
    },
    isWeekendSpecial: { type: Boolean, default: false },
}, { timestamps: true });

// Compound index to ensure one menu per plan per day
menuSchema.index({ date: 1, planType: 1 }, { unique: true });

module.exports = mongoose.model('Menu', menuSchema);
