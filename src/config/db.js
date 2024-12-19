const mongoose = require('mongoose');
require('dotenv').config();  // Ensure dotenv is loading environment variables from .env

const connectDB = async () => {
  try {
    // Get the MongoDB URI from environment variables
    const mongoURI = process.env.MONGO_URI_BOOKING;  // This connects to the bookingService database

    if (!mongoURI) {
      throw new Error("MONGO_URI_BOOKING is not defined in .env");
    }

    mongoose.set('strictQuery', true);  // Enable strict query for Mongoose 6+

    // Connect to MongoDB using the URI from the environment variable (without deprecated options)
    await mongoose.connect(mongoURI);

    console.log('BookingService MongoDB connected');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err.message);
    process.exit(1);  // Exit the process if MongoDB connection fails
  }
};

module.exports = connectDB;
