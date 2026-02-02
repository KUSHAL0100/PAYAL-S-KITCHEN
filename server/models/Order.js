const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        name: String,
        quantity: Number,
        price: Number,
        selectedItems: [{ type: String }], // Array of strings for event item names
        mealTime: { type: String, enum: ['Lunch', 'Dinner'] }
    }],
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'], default: 'Pending' },
    type: { type: String, enum: ['single', 'event', 'subscription_daily', 'subscription_purchase'], required: true },
    deliveryDate: { type: Date, required: true },
    deliveryAddress: {
        street: { type: String, maxlength: 70 },
        city: { type: String, maxlength: 30 },
        zip: { type: String, maxlength: 10 },
    },
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
    paymentId: { type: String },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    discountAmount: { type: Number, default: 0 },
    cancellationFee: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    couponCode: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
