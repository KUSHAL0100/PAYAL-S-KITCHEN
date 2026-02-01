const Razorpay = require('razorpay');
const crypto = require('crypto');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Creates a Razorpay order
 * @param {number} amount - Amount in INR
 * @param {string} receiptPrefix - Prefix for the receipt string
 * @returns {Promise<Object>} - Razorpay order object
 */
const createOrder = async (amount, receiptPrefix = 'receipt') => {
    const options = {
        amount: Math.round(amount * 100), // Amount in paise
        currency: 'INR',
        receipt: `${receiptPrefix}_${Date.now()}`,
    };
    return await razorpay.orders.create(options);
};

/**
 * Verifies the Razorpay payment signature
 * @param {string} orderId 
 * @param {string} paymentId 
 * @param {string} signature 
 * @returns {boolean}
 */
const verifySignature = (orderId, paymentId, signature) => {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

    return expectedSignature === signature;
};

/**
 * Processes a refund via Razorpay
 * @param {string} paymentId 
 * @param {number} amount - Amount in INR
 * @returns {Promise<Object>} - Refund data
 */
const processRefund = async (paymentId, amount) => {
    return await razorpay.payments.refund(paymentId, {
        amount: Math.round(amount * 100),
        speed: "optimum"
    });
};

module.exports = {
    instance: razorpay,
    createOrder,
    verifySignature,
    processRefund
};
