const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    plan: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['Active', 'Cancelled', 'Expired'], default: 'Active' },
    paymentId: { type: String },
    amountPaid: { type: Number },
    mealType: { type: String, enum: ['both', 'lunch', 'dinner'], default: 'both' },
    lunchAddress: {
        street: { type: String, maxlength: 70 },
        city: { type: String, maxlength: 30 },
        zip: { type: String, maxlength: 10 },
    },
    dinnerAddress: {
        street: { type: String, maxlength: 70 },
        city: { type: String, maxlength: 30 },
        zip: { type: String, maxlength: 10 },
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

module.exports = mongoose.model('Subscription', subscriptionSchema);