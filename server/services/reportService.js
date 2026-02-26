const reportRepository = require('../repositories/reportRepository');

class ReportService {
    async getSummaryReport() {
        try {
            const [stats, revenueTrends, distribution, statusSlices, recentTransactions] = await Promise.all([
                reportRepository.getGeneralStats(),
                reportRepository.getRevenueTrends(),
                reportRepository.getOrderDistribution(),
                reportRepository.getStatusSlices(),
                reportRepository.getRecentTransactions(8) // Last 8 transactions
            ]);

            // Formatting Revenue Trends for Recharts
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            
            // Fill in missing months to make the chart look smooth even if there are gaps
            const last6Months = [];
            for (let i = 5; i >= 0; i--) {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                last6Months.push({
                    month: monthNames[d.getMonth()],
                    year: d.getFullYear(),
                    revenue: 0,
                    orders: 0
                });
            }

            revenueTrends.forEach(item => {
                const monthName = monthNames[item._id.month - 1];
                const chartItem = last6Months.find(m => m.month === monthName && m.year === item._id.year);
                if (chartItem) {
                    chartItem.revenue = Math.round(item.revenue);
                    chartItem.orders = item.count;
                }
            });

            // Formatting Distribution
            const formattedDistribution = distribution.map(item => ({
                name: (item._id || 'UNSPECIFIED').replace('_', ' ').toUpperCase(),
                value: item.count,
                revenue: item.revenue
            }));

            // Formatting Status
            const formattedStatus = statusSlices.map(item => ({
                name: item._id,
                value: item.count
            }));

            return {
                stats,
                revenueTrends: last6Months,
                distribution: formattedDistribution,
                statusSlices: formattedStatus,
                recentTransactions
            };
        } catch (error) {
            console.error('Report Service Error:', error);
            throw new Error('Failed to generate summary report');
        }
    }

    // ==================== NEW REPORT SERVICES ====================

    async getDayWiseSales(startDate, endDate) {
        try {
            const rawData = await reportRepository.getDayWiseSales(startDate, endDate);

            return rawData.map(item => ({
                date: item._id.date,
                singleOrders: item.singleOrders,
                eventOrders: item.eventOrders,
                subscriptionOrders: item.subscriptionOrders,
                totalOrders: item.totalOrders,
                totalRevenue: Math.round(item.totalRevenue),
                totalDiscount: Math.round(item.totalDiscount || 0)
            }));
        } catch (error) {
            console.error('Day-Wise Sales Service Error:', error);
            throw new Error('Failed to generate day-wise sales report');
        }
    }

    async getOrderBills(startDate, endDate, type) {
        try {
            const orders = await reportRepository.getOrderBills(startDate, endDate, type);

            return orders.map(order => ({
                _id: order._id,
                customerName: order.user?.name || 'Guest',
                customerEmail: order.user?.email || '',
                type: order.type,
                items: order.items.map(item => ({
                    name: item.name,
                    quantity: item.quantity,
                    deliveryDate: item.deliveryDate
                })),
                price: order.price,
                discountAmount: order.discountAmount || 0,
                totalAmount: order.totalAmount,
                cancellationFee: order.cancellationFee || 0,
                refundAmount: order.refundAmount || 0,
                paymentStatus: order.paymentStatus,
                status: order.status,
                couponCode: order.couponCode || '',
                createdAt: order.createdAt
            }));
        } catch (error) {
            console.error('Order Bills Service Error:', error);
            throw new Error('Failed to generate order bills report');
        }
    }

    async getSubscriptionSummary(status) {
        try {
            const subs = await reportRepository.getSubscriptionSummary(status);

            return subs.map(sub => ({
                _id: sub._id,
                customerName: sub.user?.name || 'Unknown',
                customerEmail: sub.user?.email || '',
                planName: sub.plan?.name || 'Deleted Plan',
                planDuration: sub.plan?.duration || '-',
                mealType: sub.mealType,
                startDate: sub.startDate,
                endDate: sub.endDate,
                status: sub.status,
                amountPaid: sub.amountPaid || 0,
                planValue: sub.planValue || 0
            }));
        } catch (error) {
            console.error('Subscription Summary Service Error:', error);
            throw new Error('Failed to generate subscription summary report');
        }
    }
}

module.exports = new ReportService();
