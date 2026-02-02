const mongoose = require('mongoose');

const orderSchema = mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        name: String,
        quantity: Number,
        selectedItems: mongoose.Schema.Types.Mixed // Store complex items (events, menus, etc)
    }],
    price: { type: Number, required: true },
    proRataCredit: { type: Number, default: 0 },
    discountAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, required: true },
    status: { type: String, enum: ['Pending', 'Confirmed', 'Preparing', 'Out for Delivery', 'Delivered', 'Cancelled'], default: 'Pending' },
    type: { type: String, enum: ['single', 'event', 'subscription_daily', 'subscription_purchase', 'subscription_upgrade'], required: true },
    deliveryDate: { type: Date, required: true },
    deliveryAddress: {
        street: { type: String, maxlength: 80, required: true },
        city: { type: String, maxlength: 30, required: true },
        zip: { type: String, maxlength: 10, required: true },
    },
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Failed'], default: 'Pending' },
    paymentId: { type: String },
    subscription: { type: mongoose.Schema.Types.ObjectId, ref: 'Subscription' },
    cancellationFee: { type: Number, default: 0 },
    refundAmount: { type: Number, default: 0 },
    couponCode: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
