/**
 * Utility: Common date operations.
 * Used across services, repos, and controllers that deal with date ranges.
 */

/**
 * Returns a new Date set to the start of the day (00:00:00.000)
 * @param {Date|string} date 
 * @returns {Date}
 */
const startOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Returns a new Date set to the end of the day (23:59:59.999)
 * @param {Date|string} date 
 * @returns {Date}
 */
const endOfDay = (date = new Date()) => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
};

/**
 * Returns tomorrow's date at start of day
 * @returns {Date}
 */
const tomorrow = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
};

/**
 * Calculates difference between two dates in hours
 * @param {Date} futureDate 
 * @param {Date} pastDate 
 * @returns {number}
 */
const diffInHours = (futureDate, pastDate = new Date()) => {
    return (new Date(futureDate) - new Date(pastDate)) / (1000 * 60 * 60);
};

/**
 * Calculates the number of days between two dates (inclusive)
 * @param {Date} start 
 * @param {Date} end 
 * @returns {number}
 */
const daysBetween = (start, end) => {
    const diffTime = Math.abs(new Date(end) - new Date(start));
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
};

module.exports = {
    startOfDay,
    endOfDay,
    tomorrow,
    diffInHours,
    daysBetween
};
