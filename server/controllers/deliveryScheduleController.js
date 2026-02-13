const Subscription = require('../models/Subscription');
const Order = require('../models/Order');
const DeliveryPause = require('../models/DeliveryPause');
const Menu = require('../models/Menu');
const Plan = require('../models/Plan');

// @desc    Get delivery schedule for a specific date
// @route   GET /api/admin/delivery-schedule
// @access  Private/Admin
const getDeliverySchedule = async (req, res) => {
    try {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: 'Date is required' });
        }

        const targetDate = new Date(date);
        const startOfDay = new Date(targetDate);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(targetDate);
        endOfDay.setHours(23, 59, 59, 999);

        // 1. Fetch Subscriptions that were active on this date
        //    (Includes Active, and those that were Cancelled/Upgraded/Expired AFTER the target date)
        const activeSubs = await Subscription.find({
            startDate: { $lte: endOfDay },
            $or: [
                {
                    status: 'Active',
                    endDate: { $gte: startOfDay }
                },
                {
                    status: { $in: ['Cancelled', 'Upgraded', 'Expired'] },
                    endDate: { $gte: startOfDay },
                    updatedAt: { $gte: startOfDay }
                }
            ]
        }).populate('user', 'name email phone addresses')
            .populate('plan', 'name');

        // 2. Fetch Active Pauses for this date
        const activePauses = await DeliveryPause.find({
            status: 'Active',
            startDate: { $lte: endOfDay },
            endDate: { $gte: startOfDay }
        });

        const pausedSubIds = activePauses.map(p => p.subscription.toString());

        // 3. Filter Subs (remove paused ones) and Resolve overlaps
        //    (On transition days like Upgrades, a user might have two valid records. 
        //     We pick the most relevant one: Active > Cancelled > Upgraded > Expired, then Latest Updated)
        const subsByUser = {};
        activeSubs.forEach(sub => {
            if (!sub.user || pausedSubIds.includes(sub._id.toString())) return;

            const userId = sub.user._id.toString();
            const currentBest = subsByUser[userId];

            const statusPriority = { 'Active': 4, 'Cancelled': 3, 'Upgraded': 2, 'Expired': 1 };
            
            if (!currentBest || 
                statusPriority[sub.status] > statusPriority[currentBest.status] ||
                (statusPriority[sub.status] === statusPriority[currentBest.status] && sub.updatedAt > currentBest.updatedAt)
            ) {
                subsByUser[userId] = sub;
            }
        });

        const validSubs = Object.values(subsByUser);

        // 4. Fetch Orders (Single/Event) for this date
        //    Confirmed, Paid, Type=single/event, and has item for this date
        const orders = await Order.find({
            status: 'Confirmed',
            paymentStatus: { $in: ['Paid', 'Pending'] }, // Sometimes admin approves before payment? PRD says 'Paid'. Sticking to Paid generally, but let's include Confirm/Pending if that's the flow? PRD says "Confirmed + Paid".
            // Let's stick to PRD strict rule: Confirmed + Paid
            // However, local dev might have Pending payment. I'll stick to PRD: status=Confirmed, paymentStatus=Paid.
            // Wait, PRD 8 Step B: status=Confirmed, paymentStatus=Paid.
            paymentStatus: 'Paid',
            type: { $in: ['single', 'event'] },
            'items.deliveryDate': {
                $gte: startOfDay,
                $lte: endOfDay
            }
        }).populate('user', 'name email phone addresses');

        // 5. Fetch Daily Menus (to attach to subscriptions)
        //    (Only needed for subscriptions, as orders have their own items)
        const menus = await Menu.find({
            date: { $gte: startOfDay, $lte: endOfDay }
        });
        
        // Helper to find menu for a plan
        const getMenuForPlan = (planType) => menus.find(m => m.planType === planType);

        // Helper to extract and split item names (Standardises item list)
        const extractItemNames = (item) => {
            if (!item.selectedItems) return [item.name];
            
            let names = [];
            const processValue = (val) => {
                if (Array.isArray(val)) val.forEach(processValue);
                else if (typeof val === 'string') {
                    names.push(...val.split(',').map(s => s.trim()).filter(Boolean));
                }
            };

            if (typeof item.selectedItems === 'object') {
                Object.values(item.selectedItems).forEach(processValue);
            } else {
                processValue(item.selectedItems);
            }
            
            return names.length > 0 ? names : [item.name];
        };

        // 6. Group Results
        const schedule = { Basic: [], Premium: [], Exotic: [], Events: [] };

        // --- Process Subscriptions ---
        validSubs.forEach(sub => {
            const planType = sub.plan?.name || 'Basic';
            const menu = getMenuForPlan(planType);
            
            let items = ['Menu not set'];
            if (menu) {
                const { lunch, dinner } = menu.items;
                if (sub.mealType === 'both') items = [...(lunch || []), ...(dinner || [])];
                else items = (sub.mealType === 'lunch' ? lunch : dinner) || [];
            }
            
            schedule[planType].push({
                _id: sub._id,
                type: "Subscription",
                customerName: sub.user?.name || "Unknown",
                phone: sub.user?.phone,

                lunchAddress: sub.lunchAddress,
                dinnerAddress: sub.dinnerAddress,
                mealType: sub.mealType,
                items,
                quantity: 1
            });

        });

        // --- Process Orders ---
        orders.forEach(order => {
            const daysItems = order.items.filter(item => {
                const d = new Date(item.deliveryDate);
                return d >= startOfDay && d <= endOfDay;
            });

            if (daysItems.length === 0) return;

            let combinedItems = [];
            let totalPersons = 0;
            let finalPlan = 'Basic';
            const planPriority = { 'Events': 4, 'Exotic': 3, 'Premium': 2, 'Basic': 1 };

            daysItems.forEach(item => {
                // Determine Plan
                let pType = order.type === 'event' ? 'Events' : (item.selectedItems?.planType || 'Basic');
                if (pType === 'Basic') {
                    const n = (item.name || '').toLowerCase();
                    if (n.includes('exotic')) pType = 'Exotic';
                    else if (n.includes('premium')) pType = 'Premium';
                }
                if (planPriority[pType] > planPriority[finalPlan]) finalPlan = pType;

                // Extract Breakdown but only count quantity as persons
                const names = extractItemNames(item);
                combinedItems.push(...names);
                totalPersons += (item.quantity || 1); 
            });

            schedule[finalPlan].push({
                _id: order._id,
                type: order.type === 'event' ? 'Event Order' : 'Single Order',
                customerName: order.user?.name || 'Guest',
                phone: order.user?.phone,
                address: order.deliveryAddress,
                items: combinedItems,
                quantity: totalPersons,
                mealType: order.type === 'event' ? 'event' : 'single'
            });
        });

        res.json(schedule);

    } catch (error) {
        console.error('Error fetching delivery schedule:', error);
        res.status(500).json({ message: 'Server error fetching schedule' });
    }
};

module.exports = { getDeliverySchedule };
