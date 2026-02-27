const Plan = require('../models/Plan');

/**
 * Repository: All database operations for the Plan model.
 */

const findAll = async () => {
    return await Plan.find({});
};

const findById = async (id) => {
    return await Plan.findById(id);
};

const create = async (planData) => {
    const plan = new Plan(planData);
    return await plan.save();
};

const save = async (plan) => {
    return await plan.save();
};

const deleteById = async (id) => {
    const plan = await Plan.findById(id);
    if (plan) {
        await plan.deleteOne();
        return true;
    }
    return false;
};

module.exports = {
    findAll,
    findById,
    create,
    save,
    deleteById
};
