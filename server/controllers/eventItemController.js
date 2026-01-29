const EventItem = require('../models/EventItem');

// @desc    Get all event items
// @route   GET /api/event-items
// @access  Public
const getEventItems = async (req, res) => {
    try {
        const items = await EventItem.find({});
        res.json(items);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getEventItems,
};
