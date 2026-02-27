const deliveryPauseService = require('../services/deliveryPauseService');
const deliveryPauseRepo = require('../repositories/deliveryPauseRepository');

/**
 * Controller: Handles HTTP requests/responses for Delivery Pauses.
 * All business logic is in deliveryPauseService.
 */

// @desc    Pause subscription delivery
// @route   POST /api/delivery-pauses
// @access  Private
const pauseDelivery = async (req, res) => {
    try {
        const result = await deliveryPauseService.pauseDelivery(req.user._id, req.body);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.status(result.status).json(result.data);
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
        const pauses = await deliveryPauseRepo.findByUserId(req.user._id);
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
        const result = await deliveryPauseService.cancelPause(req.user._id, req.params.id);
        if (!result.success) return res.status(result.status).json({ message: result.message });
        res.json({ message: 'Pause cancelled successfully', pause: result.data });
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
