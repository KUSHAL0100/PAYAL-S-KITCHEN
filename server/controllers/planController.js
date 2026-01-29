const Plan = require('../models/Plan');

// @desc    Get all plans
// @route   GET /api/plans
// @access  Public
const getPlans = async (req, res) => {
    try {
        const plans = await Plan.find({});
        res.json(plans);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Create a plan
// @route   POST /api/plans
// @access  Private/Admin
const createPlan = async (req, res) => {
    const { name, price, duration, description, features } = req.body;

    try {
        const plan = new Plan({
            name,
            price,
            duration,
            description,
            features,
        });

        const createdPlan = await plan.save();
        res.status(201).json(createdPlan);
    } catch (error) {
        res.status(400).json({ message: 'Invalid plan data' });
    }
};

// @desc    Update a plan
// @route   PUT /api/plans/:id
// @access  Private/Admin
const updatePlan = async (req, res) => {
    const { name, price, duration, description, features } = req.body;

    try {
        const plan = await Plan.findById(req.params.id);

        if (plan) {
            plan.name = name || plan.name;
            plan.price = price || plan.price;
            plan.duration = duration || plan.duration;
            plan.description = description || plan.description;
            plan.features = features || plan.features;

            const updatedPlan = await plan.save();
            res.json(updatedPlan);
        } else {
            res.status(404).json({ message: 'Plan not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a plan
// @route   DELETE /api/plans/:id
// @access  Private/Admin
const deletePlan = async (req, res) => {
    try {
        const plan = await Plan.findById(req.params.id);

        if (plan) {
            await plan.deleteOne();
            res.json({ message: 'Plan removed' });
        } else {
            res.status(404).json({ message: 'Plan not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

module.exports = {
    getPlans,
    createPlan,
    updatePlan,
    deletePlan,
};
