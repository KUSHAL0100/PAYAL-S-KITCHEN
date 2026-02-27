const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

dotenv.config();

// ─── Environment Variable Validation ───
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
    console.error(`❌ Missing required environment variables: ${missing.join(', ')}`);
    console.error('Please check your .env file.');
    process.exit(1);
}

const app = express();

// ─── Middleware ───
app.use(express.json());
app.use(cors());

// ─── Database Connection ───
connectDB();

// ─── Routes ───
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/plans', require('./routes/planRoutes'));
app.use('/api/menu', require('./routes/menuRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));
app.use('/api/complaints', require('./routes/complaintRoutes'));
app.use('/api/event-items', require('./routes/eventItemRoutes'));
app.use('/api/coupons', require('./routes/couponRoutes'));
app.use('/api/delivery-pauses', require('./routes/deliveryPauseRoutes'));
app.use('/api/admin/delivery-schedule', require('./routes/deliveryScheduleRoutes'));
app.use('/api/admin/reports', require('./routes/reportRoutes'));

app.get('/', (req, res) => {
    res.send('API is running...');
});

// ─── Error Handling (MUST be after all routes) ───
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
