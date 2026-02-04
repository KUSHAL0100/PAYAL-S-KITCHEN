const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    planValue: { type: Number, default: 0 }, // Market price of the plan at time of purchase
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Cancelled', 'Expired', 'Upgraded'], default: 'Active' },
    paymentId: { type: String },
    amountPaid: { type: Number, default: 0 }, // Actual cash paid in the latest transaction
    mealType: { type: String, enum: ['both', 'lunch', 'dinner'], default: 'both' },
    lunchAddress: {
        street: { type: String, maxlength: 80, required: true },
        city: { type: String, maxlength: 30, required: true },
        zip: { type: String, maxlength: 10, required: true },
    },
    dinnerAddress: {
        street: { type: String, maxlength: 80, required: true },
        city: { type: String, maxlength: 30, required: true },
        zip: { type: String, maxlength: 10, required: true },
    }
}, { timestamps: true });

// Pre-save hook to ensure addresses are set correctly based on meal type
subscriptionSchema.pre('save', function () {
    const l = this.lunchAddress;
    const d = this.dinnerAddress;

    if (this.mealType === 'lunch' && l?.street && !d?.street) {
        this.dinnerAddress = l;
    } else if (this.mealType === 'dinner' && d?.street && !l?.street) {
        this.lunchAddress = d;
    } else if (this.mealType === 'both') {
        if (l?.street && !d?.street) {
            this.dinnerAddress = l;
        } else if (d?.street && !l?.street) {
            this.lunchAddress = d;
        }
    }
});

// Indexes for faster queries
subscriptionSchema.index({ user: 1, status: 1 }); // For finding user's active subscription
subscriptionSchema.index({ status: 1 }); // For filtering by status

module.exports = mongoose.model('Subscription', subscriptionSchema);