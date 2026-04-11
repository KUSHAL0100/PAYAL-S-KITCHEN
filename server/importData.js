const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });

// Import models
const User = require('./models/User');
const Plan = require('./models/Plan');
const Menu = require('./models/Menu');
const Subscription = require('./models/Subscription');
const Order = require('./models/Order');
const Complaint = require('./models/Complaint');
const EventItem = require('./models/EventItem');

const importData = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        const filePath = path.join(__dirname, 'database_export.json');
        if (!fs.existsSync(filePath)) {
            console.error('database_export.json not found!');
            process.exit(1);
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        // Clear existing data
        console.log('Clearing existing data...');
        await User.deleteMany({});
        await Plan.deleteMany({});
        await Menu.deleteMany({});
        await Subscription.deleteMany({});
        await Order.deleteMany({});
        await Complaint.deleteMany({});
        await EventItem.deleteMany({});
        console.log('Existing data cleared');

        // Import new data
        console.log('Importing new data...');
        if (data.users && data.users.length > 0) {
            const transformedUsers = data.users.map(u => {
                if (u.phone) {
                    let phoneStr = String(u.phone).replace(/\D/g, '');
                    if (phoneStr.length > 10) phoneStr = phoneStr.slice(-10);
                    if (phoneStr.length < 10) phoneStr = phoneStr.padStart(10, '0');
                    u.phone = Number(phoneStr);
                } else {
                    u.phone = 9999999999;
                }
                return u;
            });
            await User.insertMany(transformedUsers);
        }
        if (data.plans && data.plans.length > 0) await Plan.insertMany(data.plans);
        if (data.menus && data.menus.length > 0) await Menu.insertMany(data.menus);
        if (data.subscriptions && data.subscriptions.length > 0) {
            const transformedSubs = data.subscriptions.map(s => {
                if (!s.lunchAddress) s.lunchAddress = {};
                if (!s.lunchAddress.street) s.lunchAddress.street = "Not Provided";
                if (!s.lunchAddress.city) s.lunchAddress.city = "Not Provided";
                if (!s.lunchAddress.zip) s.lunchAddress.zip = "000000";

                if (!s.dinnerAddress) s.dinnerAddress = {};
                if (!s.dinnerAddress.street) s.dinnerAddress.street = "Not Provided";
                if (!s.dinnerAddress.city) s.dinnerAddress.city = "Not Provided";
                if (!s.dinnerAddress.zip) s.dinnerAddress.zip = "000000";
                
                return s;
            });
            await Subscription.insertMany(transformedSubs);
        }

        // Transform Order Data to match new Schema
        if (data.orders && data.orders.length > 0) {
            const transformedOrders = data.orders.map(order => {
                // 1. Ensure top-level required 'price' exists
                if (!order.price) {
                    order.price = order.totalAmount; // Fallback to totalAmount if price/subtotal is missing
                }
                
                if (!order.paymentDate) {
                    order.paymentDate = order.createdAt || new Date();
                }

                if (!order.deliveryAddress) order.deliveryAddress = {};
                if (!order.deliveryAddress.street) order.deliveryAddress.street = "Not Provided";
                if (!order.deliveryAddress.city) order.deliveryAddress.city = "Not Provided";
                if (!order.deliveryAddress.zip) order.deliveryAddress.zip = "000000";

                // 2. Transform items structure
                if (order.items && order.items.length > 0) {
                    order.items = order.items.map(item => {
                        // Create details string from selectedItems and mealTime
                        let detailsParts = [];
                        if (item.mealTime) detailsParts.push(item.mealTime);

                        if (item.selectedItems && Array.isArray(item.selectedItems)) {
                            detailsParts.push(item.selectedItems.join(', '));
                        } else if (item.selectedItems && item.selectedItems.name) {
                            detailsParts.push(item.selectedItems.name);
                        } else if (item.details) {
                            detailsParts.push(item.details);
                        }

                        // Return simplified item structure
                        return {
                            name: item.name,
                            quantity: item.quantity,
                            details: detailsParts.join(' | '), // "Lunch | Curry, Rice"
                            deliveryDate: item.deliveryDate || order.paymentDate || new Date()
                        };
                    });
                }
                return order;
            });
            await Order.insertMany(transformedOrders);
        }
        if (data.complaints && data.complaints.length > 0) await Complaint.insertMany(data.complaints);
        if (data.eventItems && data.eventItems.length > 0) await EventItem.insertMany(data.eventItems);

        console.log('Data imported successfully!');

        process.exit();
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

importData();
