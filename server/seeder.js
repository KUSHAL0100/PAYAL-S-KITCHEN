const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Plan = require('./models/Plan');
const Menu = require('./models/Menu');
const EventItem = require('./models/EventItem');

dotenv.config();

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        console.log(`MongoDB Connected: ${conn.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

// ============================================================
// FIXED WEEKLY MENU TEMPLATES (Sun=0 to Sat=6)
// Same menu repeats every week for the entire date range.
// Units are embedded in item names for display.
// ============================================================

const BASIC_WEEKLY = [
    // Sunday
    {
        lunch: ['Aloo Baingan (250g)', 'Veg Jalfrezi (150g)', 'Tamarind Rice (200g)', 'Chapati (3 pcs)'],
        dinner: ['Masoor Dal (250g)', 'Methi Rice (200g)'],
    },
    // Monday
    {
        lunch: ['Karela Masala (250g)', 'Hariyali Kofta (150g)', 'Tamarind Rice (200g)', 'Palak Poori (3 pcs)'],
        dinner: ['Gobi Masala (250g)', 'Paneer Pulao (200g)'],
    },
    // Tuesday
    {
        lunch: ['Drumstick Sambar (250g)', 'Pithla (150g)', 'Corn Pulao (200g)', 'Paneer Paratha (2 pcs)'],
        dinner: ['Paneer Methi Malai (250g)', 'Schezwan Fried Rice (200g)'],
    },
    // Wednesday
    {
        lunch: ['Palak Paneer (250g)', 'Aloo Chole (150g)', 'Curd Rice (200g)', 'Butter Roti (3 pcs)'],
        dinner: ['Ridge Gourd Curry (250g)', 'Kulcha (2 pcs)'],
    },
    // Thursday
    {
        lunch: ['Lobia Masala (250g)', 'Sev Tameta Nu Shaak (150g)', 'Tawa Pulao (200g)', 'Amritsari Kulcha (2 pcs)'],
        dinner: ['Mushroom Kadai (250g)', 'Kashmiri Pulao (200g)'],
    },
    // Friday
    {
        lunch: ['Beans Kootu (250g)', 'Paneer Tikka Masala (150g)', 'Capsicum Rice (200g)', 'Garlic Naan (2 pcs)'],
        dinner: ['Dal Tadka (250g)', 'Poori (3 pcs)'],
    },
    // Saturday
    {
        lunch: ['Brinjal Sambar (250g)', 'Beans Poriyal (150g)', 'Coconut Rice (200g)', 'Ajwain Paratha (2 pcs)'],
        dinner: ['Garlic Rasam (250g)', 'Tawa Pulao (200g)'],
    },
];

const PREMIUM_WEEKLY = [
    // Sunday
    {
        lunch: ['Paneer Butter Masala (250g)', 'Kadai Paneer (250g)', 'Jeera Rice (200g)', 'Butter Naan (2 pcs)', 'Gulab Jamun (2 pcs)', 'Green Salad (100g)'],
        dinner: ['Shahi Paneer (250g)', 'Laccha Paratha (2 pcs)', 'Kachumber Salad (100g)'],
    },
    // Monday
    {
        lunch: ['Dal Makhani (250g)', 'Matar Paneer (250g)', 'Peas Pulao (200g)', 'Garlic Naan (2 pcs)', 'Rasmalai (2 pcs)', 'Cucumber Salad (100g)'],
        dinner: ['Aloo Gobi (250g)', 'Jeera Rice (200g)', 'Sprouts Salad (100g)'],
    },
    // Tuesday
    {
        lunch: ['Rajma Masala (250g)', 'Paneer Do Pyaza (250g)', 'Veg Pulao (200g)', 'Tandoori Roti (2 pcs)', 'Gajar Ka Halwa (100g)', 'Beetroot Salad (100g)'],
        dinner: ['Mix Veg (250g)', 'Chapati (3 pcs)', 'Onion Salad (100g)'],
    },
    // Wednesday
    {
        lunch: ['Chole Masala (250g)', 'Mushroom Masala (250g)', 'Ghee Rice (200g)', 'Kulcha (2 pcs)', 'Seviyan Kheer (100g)', 'Carrot Salad (100g)'],
        dinner: ['Paneer Korma (250g)', 'Butter Roti (3 pcs)', 'Green Salad (100g)'],
    },
    // Thursday
    {
        lunch: ['Malai Kofta (250g)', 'Bhindi Masala (250g)', 'Veg Biryani (200g)', 'Missi Roti (2 pcs)', 'Sooji Halwa (100g)', 'Tomato Salad (100g)'],
        dinner: ['Dal Fry (250g)', 'Paneer Pulao (200g)', 'Kachumber Salad (100g)'],
    },
    // Friday
    {
        lunch: ['Navratan Korma (250g)', 'Paneer Bhurji (250g)', 'Kashmiri Pulao (200g)', 'Cheese Naan (2 pcs)', 'Kheer (100g)', 'Coleslaw (100g)'],
        dinner: ['Veg Kolhapuri (250g)', 'Chapati (3 pcs)', 'Cucumber Salad (100g)'],
    },
    // Saturday
    {
        lunch: ['Paneer Tikka Masala (250g)', 'Aloo Methi (250g)', 'Lemon Rice (200g)', 'Garlic Naan (2 pcs)', 'Jalebi (3 pcs)', 'Sprouts Salad (100g)'],
        dinner: ['Dum Aloo (250g)', 'Methi Paratha (2 pcs)', 'Green Salad (100g)'],
    },
];

const EXOTIC_WEEKLY = [
    // Sunday
    {
        lunch: ['Kaju Curry (250g)', 'Paneer Lababdar (250g)', 'Saffron Rice (200g)', 'Rumali Roti (2 pcs)', 'Samosa (2 pcs)', 'Kaju Katli (2 pcs)', 'Russian Salad (100g)'],
        dinner: ['Kashmiri Dum Aloo (250g)', 'Laccha Paratha (2 pcs)', 'Rabri (100g)', 'Kachumber Salad (100g)'],
    },
    // Monday
    {
        lunch: ['Paneer Pasanda (250g)', 'Methi Malai Matar (250g)', 'Hyderabadi Veg Biryani (200g)', 'Butter Naan (2 pcs)', 'Hara Bhara Kabab (3 pcs)', 'Rasmalai (2 pcs)', 'Corn Salad (100g)'],
        dinner: ['Mughlai Paneer (250g)', 'Ghee Rice (200g)', 'Shrikhand (100g)', 'Green Salad (100g)'],
    },
    // Tuesday
    {
        lunch: ['Shahi Paneer (250g)', 'Nargisi Kofta (250g)', 'Kashmiri Pulao (200g)', 'Cheese Naan (2 pcs)', 'Dhokla (3 pcs)', 'Gulab Jamun (2 pcs)', 'Beetroot Salad (100g)'],
        dinner: ['Paneer Makhani (250g)', 'Garlic Naan (2 pcs)', 'Gajar Ka Halwa (100g)', 'Sprouts Salad (100g)'],
    },
    // Wednesday
    {
        lunch: ['Khoya Kaju (250g)', 'Handi Paneer (250g)', 'Veg Biryani (200g)', 'Amritsari Kulcha (2 pcs)', 'Paneer Tikka (3 pcs)', 'Moong Dal Halwa (100g)', 'Coleslaw (100g)'],
        dinner: ['Malai Kofta (250g)', 'Rumali Roti (2 pcs)', 'Mysore Pak (2 pcs)', 'Tomato Salad (100g)'],
    },
    // Thursday
    {
        lunch: ['Paneer Kali Mirch (250g)', 'Navratan Korma (250g)', 'Saffron Rice (200g)', 'Paneer Kulcha (2 pcs)', 'Kachori (2 pcs)', 'Basundi (100g)', 'Russian Salad (100g)'],
        dinner: ['Tawa Paneer (250g)', 'Hyderabadi Veg Biryani (200g)', 'Ice Cream (1 scoop)', 'Cucumber Salad (100g)'],
    },
    // Friday
    {
        lunch: ['Paneer Kolhapuri (250g)', 'Gatte Ki Sabzi (250g)', 'Mint Rice (200g)', 'Garlic Naan (2 pcs)', 'Gobi 65 (4 pcs)', 'Phirni (100g)', 'Chickpea Salad (100g)'],
        dinner: ['Soya Chaap Masala (250g)', 'Laccha Paratha (2 pcs)', 'Brownie (1 pc)', 'Kachumber Salad (100g)'],
    },
    // Saturday
    {
        lunch: ['Paneer Pasanda (250g)', 'Kaju Curry (250g)', 'Hyderabadi Veg Biryani (200g)', 'Rumali Roti (2 pcs)', 'Paneer Pakora (4 pcs)', 'Kulfi (1 pc)', 'Corn Salad (100g)'],
        dinner: ['Shahi Paneer (250g)', 'Saffron Rice (200g)', 'Kalakand (2 pcs)', 'Green Salad (100g)'],
    },
];

const seedData = async () => {
    await connectDB();

    try {
        // Clear existing data
        await Plan.deleteMany();
        await Menu.deleteMany();
        await EventItem.deleteMany();
        console.log('Data Cleared!');

        // --- PLANS ---
        const plans = [
            // Basic
            {
                name: 'Basic',
                price: 3000,
                duration: 'monthly',
                description: 'Simple home-cooked meals for everyday sustenance.',
                features: ['Lunch, Dinner', 'Standard Menu', 'Weekend Special not included'],
            },
            {
                name: 'Basic',
                price: 30000,
                duration: 'yearly',
                description: 'Simple home-cooked meals for everyday sustenance.',
                features: ['Lunch, Dinner', 'Standard Menu', 'Weekend Special not included'],
            },
            // Premium
            {
                name: 'Premium',
                price: 5000,
                duration: 'monthly',
                description: 'Delicious meals with added variety and sweets.',
                features: ['Lunch, Dinner', 'Premium Menu', 'Includes Sweets & Salad', 'Weekend Special included'],
            },
            {
                name: 'Premium',
                price: 50000,
                duration: 'yearly',
                description: 'Delicious meals with added variety and sweets.',
                features: ['Lunch, Dinner', 'Premium Menu', 'Includes Sweets & Salad', 'Weekend Special included'],
            },
            // Exotic
            {
                name: 'Exotic',
                price: 8000,
                duration: 'monthly',
                description: 'Premium Indian dining experience with rich dishes.',
                features: ['Lunch, Dinner', 'Exotic Menu', 'Includes Sweets, Salad, Snacks', 'Weekend Special included', 'Premium Indian Dishes'],
            },
            {
                name: 'Exotic',
                price: 80000,
                duration: 'yearly',
                description: 'Premium Indian dining experience with rich dishes.',
                features: ['Lunch, Dinner', 'Exotic Menu', 'Includes Sweets, Salad, Snacks', 'Weekend Special included', 'Premium Indian Dishes'],
            },
        ];

        await Plan.insertMany(plans);
        console.log('Plans Imported!');

        // --- MENUS (Dec 1, 2025 → Sep 30, 2026) ---
        // Monthly variation rotation:
        // Weekdays (Mon-Fri) shift based on the month index to keep menus different across months.
        // Weekends (Sat-Sun) swap on alternate months.
        const menus = [];
        const startDate = new Date('2025-12-01T00:00:00');
        const endDate = new Date('2026-09-30T23:59:59');

        let currentDate = new Date(startDate);

        const getMenuForDay = (weeklyMenu, date) => {
            const dayOfWeek = date.getDay(); // 0-6
            const month = date.getMonth(); // 0-11

            if (dayOfWeek === 0 || dayOfWeek === 6) {
                // For weekends: Alternate between Saturday and Sunday menus every other month
                if (month % 2 === 0) {
                    return weeklyMenu[dayOfWeek];
                } else {
                    return weeklyMenu[dayOfWeek === 0 ? 6 : 0];
                }
            } else {
                // For weekdays (1-5): Shift the menu index forward by the month number
                const weekdayIndex = ((dayOfWeek - 1 + month) % 5) + 1;
                return weeklyMenu[weekdayIndex];
            }
        };

        while (currentDate <= endDate) {
            const dayOfWeek = currentDate.getDay(); // 0=Sun, 6=Sat
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Basic
            menus.push({
                date: new Date(currentDate),
                planType: 'Basic',
                items: getMenuForDay(BASIC_WEEKLY, currentDate),
                isWeekendSpecial: false,
            });

            // Premium
            menus.push({
                date: new Date(currentDate),
                planType: 'Premium',
                items: getMenuForDay(PREMIUM_WEEKLY, currentDate),
                isWeekendSpecial: isWeekend,
            });

            // Exotic
            menus.push({
                date: new Date(currentDate),
                planType: 'Exotic',
                items: getMenuForDay(EXOTIC_WEEKLY, currentDate),
                isWeekendSpecial: isWeekend,
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Insert in chunks
        const chunkSize = 500;
        for (let i = 0; i < menus.length; i += chunkSize) {
            await Menu.insertMany(menus.slice(i, i + chunkSize));
        }
        console.log(`${menus.length} Menus Imported!`);

        // --- EVENT ITEMS ---
        const eventItems = [
            // Starters
            { name: 'Paneer Tikka', category: 'Starter', price: 150, description: 'Spiced grilled cottage cheese chunks.', unit: 'per plate (6 pcs)' },
            { name: 'Veg Manchurian', category: 'Starter', price: 120, description: 'Indo-Chinese fried veg balls.', unit: 'per plate (6 pcs)' },
            { name: 'Hara Bhara Kabab', category: 'Starter', price: 130, description: 'Spinach and green pea patties.', unit: 'per plate (4 pcs)' },
            { name: 'Spring Rolls', category: 'Starter', price: 100, description: 'Crispy rolls with veg filling.', unit: 'per plate (4 pcs)' },
            { name: 'Aloo Tikki', category: 'Starter', price: 90, description: 'Crispy spiced potato patties.', unit: 'per plate (4 pcs)' },
            { name: 'Corn Cheese Balls', category: 'Starter', price: 140, description: 'Crispy corn and cheese fritters.', unit: 'per plate (6 pcs)' },

            // Main Course
            { name: 'Paneer Butter Masala', category: 'Main Course', price: 200, description: 'Rich tomato gravy with paneer.', unit: 'per bowl (250g)' },
            { name: 'Dal Makhani', category: 'Main Course', price: 180, description: 'Creamy black lentils.', unit: 'per bowl (250g)' },
            { name: 'Veg Biryani', category: 'Main Course', price: 160, description: 'Aromatic rice with vegetables.', unit: 'per plate (300g)' },
            { name: 'Malai Kofta', category: 'Main Course', price: 220, description: 'Fried dumplings in cashew gravy.', unit: 'per bowl (250g)' },
            { name: 'Butter Naan', category: 'Main Course', price: 40, description: 'Soft flatbread with butter.', unit: 'per piece' },
            { name: 'Jeera Rice', category: 'Main Course', price: 100, description: 'Cumin tempered basmati rice.', unit: 'per plate (200g)' },
            { name: 'Chole Masala', category: 'Main Course', price: 150, description: 'Spiced chickpea curry.', unit: 'per bowl (250g)' },
            { name: 'Mix Veg', category: 'Main Course', price: 140, description: 'Seasonal mixed vegetables curry.', unit: 'per bowl (250g)' },

            // Desserts
            { name: 'Gulab Jamun', category: 'Dessert', price: 60, description: 'Sweet milk solids in sugar syrup.', unit: 'per plate (4 pcs)' },
            { name: 'Rasmalai', category: 'Dessert', price: 80, description: 'Cottage cheese balls in thickened milk.', unit: 'per plate (2 pcs)' },
            { name: 'Gajar Ka Halwa', category: 'Dessert', price: 90, description: 'Warm carrot pudding with nuts.', unit: 'per bowl (150g)' },
            { name: 'Ice Cream', category: 'Dessert', price: 50, description: 'Classic scoop - Vanilla/Chocolate.', unit: 'per scoop' },
            { name: 'Kulfi', category: 'Dessert', price: 60, description: 'Traditional Indian frozen dessert.', unit: 'per piece' },
            { name: 'Jalebi', category: 'Dessert', price: 70, description: 'Crispy sweet spirals in syrup.', unit: 'per plate (200g)' },

            // Beverages
            { name: 'Masala Chai', category: 'Beverage', price: 30, description: 'Spiced Indian tea.', unit: 'per glass' },
            { name: 'Fresh Lime Soda', category: 'Beverage', price: 60, description: 'Refreshing lemon drink.', unit: 'per glass' },
            { name: 'Lassi', category: 'Beverage', price: 70, description: 'Sweet yogurt drink.', unit: 'per glass (300ml)' },
            { name: 'Buttermilk', category: 'Beverage', price: 30, description: 'Spiced chilled buttermilk.', unit: 'per glass (300ml)' },
            { name: 'Mango Lassi', category: 'Beverage', price: 80, description: 'Sweet mango yogurt drink.', unit: 'per glass (300ml)' },
        ];

        await EventItem.insertMany(eventItems);
        console.log(`${eventItems.length} Event Items Imported!`);

        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedData();
