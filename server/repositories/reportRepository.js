const Order = require('../models/Order');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

class ReportRepository {
    async getGeneralStats() {
        const totalUsers = await User.countDocuments({ role: 'user' });
        const activeSubscriptions = await Subscription.countDocuments({ status: 'Active' });
        const totalOrders = await Order.countDocuments();
        
        // Revenue calculation excluding cancelled/rejected and substracting refunds
        const revenueResult = await Order.aggregate([
            {
                $match: {
                    status: { $nin: ['Pending', 'Rejected', 'Cancelled'] }
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$totalAmount" },
                    refunds: { $sum: "$refundAmount" }
                }
            }
        ]);

        const totalRevenue = revenueResult.length > 0 ? (revenueResult[0].total - revenueResult[0].refunds) : 0;

        return {
            totalUsers,
            activeSubscriptions,
            totalOrders,
            totalRevenue: Math.round(totalRevenue)
        };
    }

    async getRevenueTrends() {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        return await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: sixMonthsAgo },
                    status: { $nin: ['Pending', 'Rejected', 'Cancelled'] }
                }
            },
            {
                $group: {
                    _id: {
                        month: { $month: "$createdAt" },
                        year: { $year: "$createdAt" }
                    },
                    revenue: { $sum: { $subtract: ["$totalAmount", "$refundAmount"] } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { "_id.year": 1, "_id.month": 1 } }
        ]);
    }

    async getOrderDistribution() {
        return await Order.aggregate([
            {
                $group: {
                    _id: "$type",
                    count: { $sum: 1 },
                    revenue: { $sum: "$totalAmount" }
                }
            }
        ]);
    }

    async getStatusSlices() {
        return await Order.aggregate([
            {
                $group: {
                    _id: "$status",
                    count: { $sum: 1 }
                }
            }
        ]);
    }

    async getRecentTransactions(limit = 10) {
        return await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(limit);
    }

    // ==================== NEW REPORT QUERIES ====================

    /**
     * Day-Wise Sales Report
     * Groups orders by date, counts by type, sums revenue
     */
    async getDayWiseSales(startDate, endDate) {
        const matchStage = {
            status: { $nin: ['Pending', 'Rejected', 'Cancelled'] }
        };

        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }

        return await Order.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }
                    },
                    singleOrders: {
                        $sum: { $cond: [{ $eq: ["$type", "single"] }, 1, 0] }
                    },
                    eventOrders: {
                        $sum: { $cond: [{ $eq: ["$type", "event"] }, 1, 0] }
                    },
                    subscriptionOrders: {
                        $sum: {
                            $cond: [
                                { $in: ["$type", ["subscription_purchase", "subscription_upgrade"]] },
                                1, 0
                            ]
                        }
                    },
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: "$totalAmount" },
                    totalDiscount: { $sum: "$discountAmount" }
                }
            },
            { $sort: { "_id.date": -1 } }
        ]);
    }

    /**
     * Order-Wise Bill Report
     * Returns individual orders with full item details
     */
    async getOrderBills(startDate, endDate, type) {
        const matchStage = {};

        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
            };
        }

        if (type && type !== 'all') {
            matchStage.type = type;
        }

        return await Order.find(matchStage)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .lean();
    }

    /**
     * Subscription Summary Report
     * Returns subscriptions with user/plan details
     */
    async getSubscriptionSummary(status) {
        const matchStage = {};

        if (status && status !== 'all') {
            matchStage.status = status;
        }

        return await Subscription.find(matchStage)
            .populate('user', 'name email')
            .populate('plan', 'name duration')
            .sort({ createdAt: -1 })
            .lean();
    }
}

module.exports = new ReportRepository();
