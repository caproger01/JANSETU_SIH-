const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5001;

// CORS configuration for local development
const allowedOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps, curl, or same-origin static files)
        if (!origin) return callback(null, true);
        
        // In local development, permit localhost / 127.0.0.1 on any port or configured origins
        const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
        if (isLocal || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        
        return callback(null, true); // Permissive in dev, easy to lock down via CLIENT_URL
    },
    credentials: true
}));

// Body parsing middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files from project root
app.use(express.static(path.resolve(__dirname, '..')));

// Routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// Admin Data Inspection Route (Development testing endpoint)
const AdminController = require('./controllers/adminController');
app.get('/api/viewdataadmin', AdminController.viewDataAdmin);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'ok', service: 'JanSetu Backend' });
});

// Database initialization
const createUserTable = require('./data/createusertable.js');

// Error handling middlewares
const { errorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');
app.use('/api', notFoundHandler);
app.use(errorHandler);



// Start server after verifying / initializing database table
createUserTable()
    .then(() => {
        app.listen(port, () => {
            console.log(`JanSetu Server is running on port ${port}`);
        });
    })
    .catch((err) => {
        console.error('Failed to initialize database table on startup:', err.message);
        // Start server anyway so developers can troubleshoot DB config
        app.listen(port, () => {
            console.log(`JanSetu Server is running on port ${port} (DB initialization pending)`);
        });
    });






module.exports = app;
