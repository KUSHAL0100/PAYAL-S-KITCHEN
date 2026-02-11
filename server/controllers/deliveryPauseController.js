const DeliveryPause = require('../models/DeliveryPause');
const Subscription = require('../models/Subscription');
const Order = require('../models/Order');

// @desc    Pause subscription delivery
// @route   POST /api/delivery-pauses
// @access  Private
const pauseDelivery = async (req, res) => {
    try {
        const { subscriptionId, startDate, endDate } = req.body;
        const userId = req.user._id;

        // 1. Validate Input
        if (!subscriptionId || !startDate || !endDate) {
            return res.status(400).json({ message: 'Please provide subscription ID, start date, and end date' });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        if (isNaN(start) || isNaN(end)) {
            return res.status(400).json({ message: 'Invalid date format' });
        }

        // Normalize inputs to midnight for consistent comparison
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (start < tomorrow) {
            return res.status(400).json({ message: 'Start date must be at least tomorrow' });
        }

        if (end < start) {
            return res.status(400).json({ message: 'End date must be after or same as start date' });
        }

        // 2. Fetch Subscription
        const subscription = await Subscription.findOne({
            _id: subscriptionId,
            user: userId,
            status: 'Active'
        });

        if (!subscription) {
            return res.status(404).json({ message: 'Active subscription not found' });
        }

        // 3. Check Boundaries
        // Pause must be within subscription validity
        // Note: endDate of pause can technically be same as subscription endDate
        if (end > subscription.endDate) {
            return res.status(400).json({ message: 'Pause period cannot exceed subscription end date' });
        }

        // 4. Check for Overlaps
        const overlappingPause = await DeliveryPause.findOne({
            subscription: subscriptionId,
            status: 'Active',
            $or: [
                { startDate: { $lte: end }, endDate: { $gte: start } }
            ]
        });

        if (overlappingPause) {
            return res.status(400).json({ message: 'You already have a pause scheduled during this period' });
        }

        // 5. Calculate Pause Days
        const diffTime = Math.abs(end - start);
        const pauseDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive

        // 6. Create Pause
        const pause = await DeliveryPause.create({
            user: userId,
            subscription: subscriptionId,
            startDate: start,
            endDate: end,
            pauseDays,
            status: 'Active'
        });

        res.status(201).json(pause);

    } catch (error) {
        console.error('Error pausing delivery:', error);
        res.status(500).json({ message: 'Server error while pausing delivery' });
    }
};

// @desc    Get my pauses
// @route   GET /api/delivery-pauses
// @access  Private
const getMyPauses = async (req, res) => {
    try {
        const pauses = await DeliveryPause.find({ user: req.user._id })
            .sort({ startDate: -1 })
            .populate('subscription', 'plan mealType'); // Identify which sub it belongs to

        res.json(pauses);
    } catch (error) {
        console.error('Error fetching pauses:', error);
        res.status(500).json({ message: 'Server error fetching pauses' });
    }
};

// @desc    Cancel a pause
// @route   PUT /api/delivery-pauses/:id/cancel
// @access  Private
const cancelPause = async (req, res) => {
    try {
        const pauseId = req.params.id;
        const userId = req.user._id;

        const pause = await DeliveryPause.findOne({ _id: pauseId, user: userId });

        if (!pause) {
            return res.status(404).json({ message: 'Pause request not found' });
        }

        if (pause.status !== 'Active') {
            return res.status(400).json({ message: 'Pause is already cancelled or expired' });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const start = new Date(pause.startDate);
        start.setHours(0, 0, 0, 0);

        // Allow cancellation only if today < start
        if (today >= start) {
            return res.status(400).json({ message: 'Cannot cancel a pause that has already started or is today' });
        }

        pause.status = 'Cancelled';
        await pause.save();

        res.json({ message: 'Pause cancelled successfully', pause });

    } catch (error) {
        console.error('Error cancelling pause:', error);
        res.status(500).json({ message: 'Server error cancelling pause' });
    }
};

module.exports = {
    pauseDelivery,
    getMyPauses,
    cancelPause
};
