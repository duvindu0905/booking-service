const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');  // MongoDB connection
const bookingRoutes = require('./routes/bookingRoute');  // Ensure this path is correct
const swaggerDocument = require('../swagger/swagger.json');  // Swagger documentation

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON request bodies

// Connect to MongoDB using connectDB from db.js
connectDB();

// Serve Swagger API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Use booking routes for API endpoints under /booking-service
app.use('/booking-service', bookingRoutes);  // This ensures that all booking routes are prefixed with /booking-service

// Sample route
app.get('/', (req, res) => {
  res.send('Welcome to the Booking Service API!');
});

// Fallback route for undefined paths
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);  // Log the error stack
  res.status(500).json({ message: 'Internal Server Error' });
});

module.exports = app;
