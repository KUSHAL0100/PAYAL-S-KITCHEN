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

// --- DATA POOL ---
const MAINS = {
    curries: [
        // North Indian / Paneer
        'Paneer Butter Masala', 'Palak Paneer', 'Kadai Paneer', 'Shahi Paneer', 'Matar Paneer', 'Paneer Tikka Masala', 'Paneer Lababdar', 'Paneer Do Pyaza', 'Malai Kofta', 'Veg Kofta',
        'Dum Aloo', 'Aloo Gobi', 'Aloo Matar', 'Jeera Aloo', 'Aloo Methi', 'Aloo Baingan', 'Bhindi Masala', 'Kurkuri Bhindi', 'Bharwa Bhindi',
        'Mix Veg', 'Veg Kolhapuri', 'Veg Jalfrezi', 'Veg Makhanwala', 'Navratan Korma', 'Mushroom Masala', 'Matar Mushroom', 'Corn Palak', 'Methi Malai Matar',
        'Chana Masala', 'Pindi Chole', 'Rajma Masala', 'Dal Makhani', 'Dal Tadka', 'Dal Fry', 'Dal Palak', 'Panchmel Dal', 'Moong Dal', 'Masoor Dal',
        'Baingan Bharta', 'Lauki Kofta', 'Gatte Ki Sabzi', 'Sev Tamatar', 'Kaju Curry', 'Khoya Kaju', 'Stuffed Capsicum', 'Sarson Ka Saag', 'Undhiyu',
        'Aloo Shimla Mirch', 'Paneer Bhurji', 'Corn Masala', 'Veg Handi', 'Hariyali Kofta', 'Nargisi Kofta (Veg)', 'Kashmiri Dum Aloo', 'Dahi Bhindi',
        'Achari Aloo', 'Methi Aloo', 'Raw Banana Curry', 'Drumstick Curry', 'Kathal Masala (Jackfruit)', 'Arbi Masala', 'Tinda Masala', 'Lauki Chana Dal',
        'Ridge Gourd Curry', 'Snake Gourd Masala', 'Pumpkin Masala', 'Sweet Potato Curry', 'Black Eyed Peas Curry', 'Lobia Masala', 'Green Gram Curry',
        'Horse Gram Curry', 'Sprouted Moong Curry', 'Soyabean Curry', 'Soya Chaap Masala', 'Paneer Pasanda', 'Mughlai Paneer', 'Handi Paneer', 'Tawa Paneer',
        'Paneer Kali Mirch', 'Paneer Kolhapuri', 'Paneer Makhani', 'Paneer Methi Malai', 'Paneer Jalfrezi', 'Paneer Korma', 'Paneer Bharta',
        'Aloo Raswala', 'Aloo Tamatar', 'Aloo Chole', 'Aloo Palak', 'Aloo Beans Curry', 'Aloo Gajar Matar', 'Gobi Masala', 'Gobi Matar',
        'Bhindi Do Pyaza', 'Bhindi Aloo', 'Bhindi Masala Gravy', 'Karela Masala', 'Karela Bharwa', 'Baingan Masala', 'Baingan Aloo',
        'Mushroom Matar', 'Mushroom Do Pyaza', 'Mushroom Kadai', 'Corn Capsicum Masala', 'Baby Corn Masala', 'Corn Methi Malai',

        // South Indian
        'Avial', 'Sambar', 'Mixed Veg Sambar', 'Drumstick Sambar', 'Radish Sambar', 'Pumpkin Sambar', 'Okra Sambar', 'Brinjal Sambar',
        'Rasam', 'Tomato Rasam', 'Pepper Rasam', 'Lemon Rasam', 'Mysore Rasam', 'Garlic Rasam',
        'Poricha Kuzhambu', 'Vatha Kuzhambu', 'Mor Kuzhambu', 'Theeyal', 'Kootu', 'Cabbage Kootu', 'Snake Gourd Kootu', 'Pumpkin Kootu',
        'Chow Chow Kootu', 'Beans Kootu', 'Spinach Kootu', 'Vegetable Stew', 'Kurma', 'Veg Kurma', 'Potato Kurma', 'Peas Kurma',

        // Maharashtrian / Gujarati / Others
        'Bharli Vangi', 'Pithla', 'Usal', 'Misal', 'Matki Chi Usal', 'Zunka', 'Shev Bhaji', 'Patodi Rassa', 'Vangyache Bharit',
        'Sev Tameta Nu Shaak', 'Ringan Oro', 'Batata Nu Shaak', 'Undhiyu (Gujarati)', 'Kadhi Pakora', 'Punjabi Kadhi', 'Gujarati Kadhi', 'Rajasthani Kadhi',
        'Sindhi Kadhi', 'Dahi Aloo', 'Dahi Baingan', 'Dahi Gobi', 'Dahi Vada (Side)', 'Kalan (Kerala)', 'Olan', 'Erissery'
    ],
    dryVeg: [
        'Aloo Jeera', 'Aloo Fry', 'Bhindi Fry', 'Karela Fry', 'Tinda Fry', 'Arbi Fry', 'Gobi Manchurian Dry', 'Cabbage Foogath', 'Beans Poriyal', 'Carrot Peas',
        'Aloo Beans', 'Shimla Mirch Aloo', 'Raw Banana Fry', 'Yam Fry', 'Ivy Gourd Fry', 'Cluster Beans', 'Beetroot Poriyal', 'Carrot Poriyal', 'Snake Gourd Fry',
        'Brinjal Fry', 'Colocasia Fry', 'Plantain Fry', 'Broad Beans Fry', 'Scarlet Gourd Fry', 'Radish Fry', 'Turnip Fry', 'Knol Khol Fry',
        'Cabbage Thoran', 'Beans Thoran', 'Carrot Thoran', 'Beetroot Thoran', 'Mixed Veg Thoran', 'Spinach Thoran', 'Amaranth Leaves Fry',
        'Methi Bhaji', 'Palak Bhaji', 'Chulai Bhaji', 'Sarson Bhaji', 'Radish Greens', 'Turnip Greens', 'Cauliflower Fry', 'Broccoli Stir Fry',
        'Zucchini Stir Fry', 'Asparagus Stir Fry', 'French Beans Fry', 'Long Beans Fry', 'Kovakkai Fry', 'Vazhakkai Fry', 'Senai Kizhangu Varuval'
    ],
    international: [
        'Pasta Alfredo', 'Pasta Arrabbiata', 'Pesto Pasta', 'Lasagna', 'Risotto', 'Pizza Margherita', 'Veggie Pizza', 'Garlic Bread', 'Bruschetta',
        'Tacos', 'Burritos', 'Quesadillas', 'Enchiladas', 'Nachos', 'Thai Green Curry', 'Thai Red Curry', 'Pad Thai', 'Fried Rice', 'Hakka Noodles',
        'Schezwan Noodles', 'Manchurian Gravy', 'Sushi', 'Ramen', 'Falafel Wrap', 'Hummus with Pita', 'Mac and Cheese', 'Spaghetti Aglio e Olio',
        'Ratatouille', 'Moussaka', 'Shepherd\'s Pie (Veg)', 'Stuffed Bell Peppers', 'Vegetable Au Gratin', 'Spinach Corn Sandwich', 'Club Sandwich',
        'Burger', 'Veggie Burger', 'Paneer Burger', 'Bean Burger', 'Sub Sandwich', 'Panini', 'Wrap', 'Burrito Bowl', 'Taco Salad',
        'Stir Fry Veggies', 'Kung Pao Veg', 'Sweet and Sour Veg', 'Chilli Paneer', 'Chilli Gobi', 'Chilli Mushroom', 'Chilli Baby Corn',
        'Vegetable Lasagna', 'Spinach Ravioli', 'Mushroom Risotto', 'Greek Pizza', 'Mexican Rice', 'Bean Enchiladas', 'Queso Dip', 'Guacamole',
        'Spring Rolls (Thai)', 'Papaya Salad', 'Tom Yum Soup', 'Minestrone Soup', 'Cream of Mushroom Soup', 'Potato Leek Soup', 'Pumpkin Soup'
    ],
    sweets: [
        'Gulab Jamun', 'Rasgulla', 'Rasmalai', 'Kheer', 'Rice Kheer', 'Seviyan Kheer', 'Gajar Ka Halwa', 'Moong Dal Halwa', 'Sooji Halwa', 'Besan Ladoo',
        'Motichoor Ladoo', 'Kaju Katli', 'Jalebi', 'Rabri', 'Shrikhand', 'Amrakhand', 'Mysore Pak', 'Kalakand', 'Sandesh', 'Cham Cham', 'Peda', 'Barfi',
        'Ice Cream (Vanilla)', 'Ice Cream (Chocolate)', 'Ice Cream (Strawberry)', 'Ice Cream (Butterscotch)', 'Kulfi', 'Falooda', 'Fruit Salad with Cream', 'Brownie',
        'Coconut Ladoo', 'Rava Ladoo', 'Puran Poli', 'Modak', 'Basundi', 'Phirni', 'Double Ka Meetha', 'Shahi Tukda', 'Malpua', 'Ghevar', 'Boondi Ladoo',
        'Atta Ladoo', 'Pinni', 'Panjiri', 'Sheer Khurma', 'Vermicelli Pudding', 'Caramel Custard', 'Fruit Custard', 'Trifle', 'Mousse', 'Tart', 'Pastry',
        'Chocolate Cake', 'Vanilla Cake', 'Red Velvet Cake', 'Cupcake', 'Donut', 'Eclair', 'Macaron', 'Tiramisu', 'Cheesecake', 'Panna Cotta',
        'Apple Pie', 'Banana Bread', 'Muffin', 'Cookie', 'Biscuit', 'Choco Lava Cake', 'Sizzling Brownie', 'Sundae', 'Banana Split', 'Waffle', 'Pancake'
    ],
    snacks: [
        'Samosa', 'Kachori', 'Dhokla', 'Khandvi', 'Mirchi Vada', 'Vada Pav', 'Pav Bhaji', 'Bhel Puri', 'Sev Puri', 'Dahi Puri', 'Pani Puri', 'Aloo Tikki',
        'Spring Rolls', 'Momos', 'French Fries', 'Wedges', 'Cutlet', 'Bread Pakora', 'Onion Pakora', 'Paneer Pakora', 'Sandwich', 'Burger', 'Pizza Slice',
        'Sabudana Vada', 'Medu Vada', 'Masala Vada', 'Corn Cheese Balls', 'Hara Bhara Kabab', 'Veg Puff', 'Paneer Puff', 'Aloo Bond', 'Mysore Bonda',
        'Gobi 65', 'Paneer 65', 'Mushroom 65', 'Baby Corn 65', 'Veg Lollipop', 'Cheese Balls', 'Nachos with Salsa', 'Garlic Breadsticks',
        'Onion Rings', 'Mozzarella Sticks', 'Jalapeno Poppers', 'Bruschetta', 'Canapes', 'Mini Tacos', 'Stuffed Mushrooms', 'Veg Satay'
    ]
};

const STAPLES = {
    rice: [
        'Steamed Rice', 'Jeera Rice', 'Peas Pulao', 'Veg Pulao', 'Veg Biryani', 'Hyderabadi Veg Biryani', 'Kashmiri Pulao', 'Corn Pulao', 'Paneer Pulao',
        'Lemon Rice', 'Curd Rice', 'Tomato Rice', 'Tamarind Rice', 'Coconut Rice', 'Ghee Rice', 'Saffron Rice', 'Brown Rice', 'Masala Khichdi', 'Moong Dal Khichdi',
        'Mint Rice', 'Coriander Rice', 'Methi Rice', 'Palak Rice', 'Beetroot Rice', 'Carrot Rice', 'Capsicum Rice', 'Tawa Pulao', 'Schezwan Fried Rice'
    ],
    breads: [
        'Roti', 'Chapati', 'Phulka', 'Butter Roti', 'Plain Paratha', 'Aloo Paratha', 'Gobi Paratha', 'Paneer Paratha', 'Methi Paratha', 'Mooli Paratha',
        'Missi Roti', 'Naan', 'Butter Naan', 'Garlic Naan', 'Kulcha', 'Amritsari Kulcha', 'Bhatura', 'Poori', 'Palak Poori', 'Bedmi Poori',
        'Ajwain Paratha', 'Laccha Paratha', 'Onion Kulcha', 'Paneer Kulcha', 'Cheese Naan', 'Chilli Garlic Naan', 'Tandoori Roti', 'Rumali Roti'
    ],
    salads: [
        'Green Salad', 'Cucumber Salad', 'Tomato Salad', 'Onion Salad', 'Kachumber Salad', 'Sprouts Salad', 'Corn Salad', 'Russian Salad', 'Macaroni Salad',
        'Coleslaw', 'Beetroot Salad', 'Carrot Salad', 'Fruit Salad', 'Greek Salad', 'Caesar Salad', 'Pasta Salad', 'Chickpea Salad', 'Three Bean Salad',
        'Waldorf Salad', 'Potato Salad', 'Egg Salad (Veg)', 'Tossed Salad', 'Kimchi', 'Som Tam (Papaya Salad)', 'Quinoa Salad', 'Couscous Salad'
    ],
    soups: [
        'Tomato Soup', 'Sweet Corn Soup', 'Hot and Sour Soup', 'Manchow Soup', 'Lemon Coriander Soup', 'Vegetable Clear Soup', 'Cream of Mushroom Soup',
        'Minestrone Soup', 'Spinach Soup', 'Pumpkin Soup', 'Lentil Soup', 'Broccoli Soup', 'Mulligatawny Soup', 'Thukpa', 'Noodle Soup', 'Wonton Soup',
        'French Onion Soup', 'Gazpacho', 'Miso Soup', 'Tom Yum Soup'
    ]
};

// Helper to get random items ensuring uniqueness within a set
const getRandomMains = (pool, count, usedSet) => {
    const available = pool.filter(item => !usedSet.has(item));

    let selectionPool = available;
    if (available.length < count) {
        // console.warn('Pool exhausted for unique items, reusing items.');
        selectionPool = pool; // Fallback to reusing
    }

    const selected = [];
    for (let i = 0; i < count; i++) {
        if (selectionPool.length === 0) selectionPool = pool; // Safety net
        const randomIndex = Math.floor(Math.random() * selectionPool.length);
        const item = selectionPool[randomIndex];
        selected.push(item);

        // Remove from selection pool to avoid duplicates in THIS batch
        selectionPool.splice(randomIndex, 1);

        // Add to used set for the month
        usedSet.add(item);
    }
    return selected;
};

// Helper for staples
const getRandomStaples = (pool, count) => {
    const selected = [];
    for (let i = 0; i < count; i++) {
        const randomIndex = Math.floor(Math.random() * pool.length);
        selected.push(pool[randomIndex]);
    }
    return selected;
};

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
                price: 30000, // 2 months free
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
                price: 50000, // 2 months free
                duration: 'yearly',
                description: 'Delicious meals with added variety and sweets.',
                features: ['Lunch, Dinner', 'Premium Menu', 'Includes Sweets & Salad', 'Weekend Special included'],
            },
            // Exotic
            {
                name: 'Exotic',
                price: 8000,
                duration: 'monthly',
                description: 'Gourmet experience with multi-cuisine options.',
                features: ['Lunch, Dinner', 'Exotic Menu', 'Includes Sweets, Salad, Soups', 'Weekend Special included', 'Customizable Spice Levels'],
            },
            {
                name: 'Exotic',
                price: 80000, // 2 months free
                duration: 'yearly',
                description: 'Gourmet experience with multi-cuisine options.',
                features: ['Lunch, Dinner', 'Exotic Menu', 'Includes Sweets, Salad, Soups', 'Weekend Special included', 'Customizable Spice Levels'],
            },
        ];

        await Plan.insertMany(plans);
        console.log('Plans Imported!');

        // --- MENUS (Next 12 Months) ---
        const menus = [];
        const startDate = new Date();
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);

        let currentDate = new Date(startDate);

        const monthlyUsage = {};

        while (currentDate <= endDate) {
            const monthIndex = currentDate.getMonth();
            const year = currentDate.getFullYear();
            const monthKey = `${year}-${monthIndex}`;

            const dayOfWeek = currentDate.getDay(); // 0 is Sunday
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

            // Initialize sets for this month if not exists
            if (!monthlyUsage[`Basic-${monthKey}`]) monthlyUsage[`Basic-${monthKey}`] = new Set();
            if (!monthlyUsage[`Premium-${monthKey}`]) monthlyUsage[`Premium-${monthKey}`] = new Set();
            if (!monthlyUsage[`Exotic-${monthKey}`]) monthlyUsage[`Exotic-${monthKey}`] = new Set();

            // --- BASIC MENU ---
            const basicLunch = [
                ...getRandomMains(MAINS.curries, 1, monthlyUsage[`Basic-${monthKey}`]),
                ...getRandomMains([...MAINS.dryVeg, ...MAINS.curries], 1, monthlyUsage[`Basic-${monthKey}`]),
                ...getRandomStaples(STAPLES.rice, 1),
                ...getRandomStaples(STAPLES.breads, 1)
            ];
            const basicDinner = [
                ...getRandomMains([...MAINS.curries], 1, monthlyUsage[`Basic-${monthKey}`]),
                ...getRandomStaples([...STAPLES.rice, ...STAPLES.breads], 1)
            ];

            menus.push({
                date: new Date(currentDate),
                planType: 'Basic',
                items: { lunch: basicLunch, dinner: basicDinner },
                isWeekendSpecial: false,
            });

            // --- PREMIUM MENU ---
            const premiumLunch = [
                ...getRandomMains(MAINS.curries, 1, monthlyUsage[`Premium-${monthKey}`]),
                ...getRandomMains(MAINS.curries, 1, monthlyUsage[`Premium-${monthKey}`]),
                ...getRandomStaples(STAPLES.rice, 1),
                ...getRandomStaples(STAPLES.breads, 1),
                ...getRandomMains(MAINS.sweets, 1, monthlyUsage[`Premium-${monthKey}`]),
                ...getRandomStaples(STAPLES.salads, 1)
            ];
            const premiumDinner = [
                ...getRandomMains(MAINS.curries, 1, monthlyUsage[`Premium-${monthKey}`]),
                ...getRandomStaples([...STAPLES.breads, ...STAPLES.rice], 1),
                ...getRandomStaples(STAPLES.salads, 1)
            ];

            menus.push({
                date: new Date(currentDate),
                planType: 'Premium',
                items: { lunch: premiumLunch, dinner: premiumDinner },
                isWeekendSpecial: isWeekend,
            });

            // --- EXOTIC MENU ---
            const exoticLunch = [
                ...getRandomMains([...MAINS.international, ...MAINS.curries], 1, monthlyUsage[`Exotic-${monthKey}`]),
                ...getRandomStaples([...STAPLES.rice, ...STAPLES.breads], 1),
                ...getRandomMains(MAINS.snacks, 1, monthlyUsage[`Exotic-${monthKey}`]),
                ...getRandomMains(MAINS.sweets, 1, monthlyUsage[`Exotic-${monthKey}`]),
                ...getRandomStaples(STAPLES.salads, 1)
            ];
            const exoticDinner = [
                ...getRandomMains(MAINS.international, 1, monthlyUsage[`Exotic-${monthKey}`]),
                ...getRandomStaples(STAPLES.soups, 1),
                ...getRandomStaples(STAPLES.salads, 1),
                ...getRandomMains(MAINS.sweets, 1, monthlyUsage[`Exotic-${monthKey}`])
            ];

            menus.push({
                date: new Date(currentDate),
                planType: 'Exotic',
                items: { lunch: exoticLunch, dinner: exoticDinner },
                isWeekendSpecial: isWeekend,
            });

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Insert in chunks
        const chunkSize = 500;
        for (let i = 0; i < menus.length; i += chunkSize) {
            await Menu.insertMany(menus.slice(i, i + chunkSize));
        }
        console.log('Menus Imported!');

        // --- EVENT ITEMS ---
        const eventItems = [
            // Starters
            { name: 'Paneer Tikka', category: 'Starter', price: 150, description: 'Spiced grilled cottage cheese chunks.' },
            { name: 'Veg Manchurian', category: 'Starter', price: 120, description: 'Indo-Chinese fried veg balls.' },
            { name: 'Hara Bhara Kabab', category: 'Starter', price: 130, description: 'Spinach and green pea patties.' },
            { name: 'Spring Rolls', category: 'Starter', price: 100, description: 'Crispy rolls with veg filling.' },

            // Main Course
            { name: 'Paneer Butter Masala', category: 'Main Course', price: 200, description: 'Rich tomato gravy with paneer.' },
            { name: 'Dal Makhani', category: 'Main Course', price: 180, description: 'Creamy black lentils.' },
            { name: 'Veg Biryani', category: 'Main Course', price: 160, description: 'Aromatic rice with vegetables.' },
            { name: 'Malai Kofta', category: 'Main Course', price: 220, description: 'Fried dumplings in cashew gravy.' },
            { name: 'Butter Naan', category: 'Main Course', price: 40, description: 'Soft flatbread with butter.' },

            // Desserts
            { name: 'Gulab Jamun', category: 'Dessert', price: 60, description: 'Sweet milk solids in syrup.' },
            { name: 'Rasmalai', category: 'Dessert', price: 80, description: 'Cottage cheese balls in thickened milk.' },
            { name: 'Gajar Ka Halwa', category: 'Dessert', price: 90, description: 'Carrot pudding.' },
            { name: 'Ice Cream (Vanilla)', category: 'Dessert', price: 50, description: 'Classic vanilla scoop.' },

            // Beverages
            { name: 'Masala Chai', category: 'Beverage', price: 30, description: 'Spiced Indian tea.' },
            { name: 'Fresh Lime Soda', category: 'Beverage', price: 60, description: 'Refreshing lemon drink.' },
            { name: 'Lassi', category: 'Beverage', price: 70, description: 'Sweet yogurt drink.' },
            { name: 'Soft Drink', category: 'Beverage', price: 40, description: 'Coke/Pepsi/Sprite.' },
        ];

        await EventItem.insertMany(eventItems);
        console.log('Event Items Imported!');

        process.exit();
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

seedData();
