const Menu = require('../models/Menu');

// @desc    Get menu for a specific date/range and plan
// @route   GET /api/menu
// @access  Public
const getMenu = async (req, res) => {
    const { date, startDate, endDate, planType } = req.query;

    try {
        let query = {};

        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            query.date = { $gte: start, $lte: end };
        } else if (date) {
            // Match the entire day
            const startOfDay = new Date(date);
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date(date);
            endOfDay.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfDay, $lte: endOfDay };
        } else {
            // Default to today
            const startOfDay = new Date();
            startOfDay.setHours(0, 0, 0, 0);
            const endOfDay = new Date();
            endOfDay.setHours(23, 59, 59, 999);
            query.date = { $gte: startOfDay, $lte: endOfDay };
        }

        if (planType) {
            query.planType = planType;
        }

        const menus = await Menu.find(query).sort({ date: 1 });
        res.json(menus);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a menu
// @route   POST /api/menu
// @access  Private/Admin
const createMenu = async (req, res) => {
    const { date, planType, items, isWeekendSpecial } = req.body;

    try {
        const menu = new Menu({
            date,
            planType,
            items,
            isWeekendSpecial,
        });

        const createdMenu = await menu.save();
        res.status(201).json(createdMenu);
    } catch (error) {
        res.status(400).json({ message: 'Invalid menu data', error: error.message });
    }
};

// @desc    Update a menu
// @route   PUT /api/menu/:id
// @access  Private/Admin
const updateMenu = async (req, res) => {
    const { items, isWeekendSpecial } = req.body;

    try {
        const menu = await Menu.findById(req.params.id);

        if (menu) {
            menu.items = items || menu.items;
            menu.isWeekendSpecial = isWeekendSpecial !== undefined ? isWeekendSpecial : menu.isWeekendSpecial;

            const updatedMenu = await menu.save();
            res.json(updatedMenu);
        } else {
            res.status(404).json({ message: 'Menu not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a menu
// @route   DELETE /api/menu/:id
// @access  Private/Admin
const deleteMenu = async (req, res) => {
    try {
        const menu = await Menu.findById(req.params.id);

        if (menu) {
            await menu.deleteOne();
            res.json({ message: 'Menu removed' });
        } else {
            res.status(404).json({ message: 'Menu not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getMenu,
    createMenu,
    updateMenu,
    deleteMenu,
};
