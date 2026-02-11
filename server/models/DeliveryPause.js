const mongoose = require('mongoose');

const deliveryPauseSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    subscription: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Subscription', 
        required: true 
    },
    startDate: { 
        type: Date, 
        required: true 
    },
    endDate: { 
        type: Date, 
        required: true 
    },
    pauseDays: { 
        type: Number, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['Active', 'Cancelled'], 
        default: 'Active' 
    },
}, { timestamps: true });

// Validation to ensure startDate < endDate
deliveryPauseSchema.pre('validate', function() {
    if (this.startDate && this.endDate && this.startDate > this.endDate) {
        throw new Error('End date must be after start date');
    }
});

module.exports = mongoose.model('DeliveryPause', deliveryPauseSchema);
