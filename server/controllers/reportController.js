const reportService = require('../services/reportService');

class ReportController {
    /**
     * @route GET /api/reports/summary
     * @desc Get summary statistics and data for dashboard charts
     * @access Admin Only
     */
    async getSummary(req, res) {
        try {
            const data = await reportService.getSummaryReport();
            res.status(200).json({
                success: true,
                message: 'Summary report generated successfully',
                data: data
            });
        } catch (error) {
            console.error('Report Controller Error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error while generating reports',
                data: null
            });
        }
    }

    /**
     * @route GET /api/reports/day-wise
     * @desc Day-wise sales report with date range filter
     * @access Admin Only
     * @query startDate, endDate (YYYY-MM-DD)
     */
    async getDayWiseSales(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const data = await reportService.getDayWiseSales(startDate, endDate);
            res.status(200).json({
                success: true,
                message: 'Day-wise sales report generated successfully',
                data
            });
        } catch (error) {
            console.error('Day-Wise Report Error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate day-wise report',
                data: null
            });
        }
    }

    /**
     * @route GET /api/reports/order-bills
     * @desc Order-wise bill report with filters
     * @access Admin Only
     * @query startDate, endDate, type (all/single/event/subscription_purchase)
     */
    async getOrderBills(req, res) {
        try {
            const { startDate, endDate, type } = req.query;
            const data = await reportService.getOrderBills(startDate, endDate, type);
            res.status(200).json({
                success: true,
                message: 'Order bills report generated successfully',
                data
            });
        } catch (error) {
            console.error('Order Bills Report Error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate order bills report',
                data: null
            });
        }
    }

    /**
     * @route GET /api/reports/subscriptions
     * @desc Subscription summary report
     * @access Admin Only
     * @query status (all/Active/Cancelled/Expired)
     */
    async getSubscriptionSummary(req, res) {
        try {
            const { status } = req.query;
            const data = await reportService.getSubscriptionSummary(status);
            res.status(200).json({
                success: true,
                message: 'Subscription summary generated successfully',
                data
            });
        } catch (error) {
            console.error('Subscription Report Error:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to generate subscription report',
                data: null
            });
        }
    }
}

module.exports = new ReportController();
