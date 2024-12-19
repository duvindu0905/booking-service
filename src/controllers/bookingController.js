const axios = require('axios');
const Booking = require('../models/bookingModel');  // Import the Booking model

// Function to create a new booking
const createBooking = async (req, res) => {
  const {
    bookingId,
    commuterId,
    commuterName,
    commuterEmail,
    nic,
    seatNumber,
    routeNumber,
    tripId,
    scheduleId,
    permitNumber,
  } = req.body;

  // Validate required fields
  if (!bookingId || !commuterId || !commuterName || !commuterEmail || !nic || !seatNumber || !routeNumber || !tripId || !scheduleId || !permitNumber) {
    return res.status(400).json({ message: 'Required fields missing' });
  }

  try {
    // URLs for route, schedule, and permit services based on environment
    const routeServiceUrl = process.env.NODE_ENV === 'production'
      ? process.env.ROUTE_SERVICE_URL_PRODUCTION
      : process.env.ROUTE_SERVICE_URL_LOCAL;

    const scheduleServiceUrl = process.env.NODE_ENV === 'production'
      ? process.env.SCHEDULE_SERVICE_URL_PRODUCTION
      : process.env.SCHEDULE_SERVICE_URL_LOCAL;

    const permitServiceUrl = process.env.NODE_ENV === 'production'
      ? process.env.PERMIT_SERVICE_URL_PRODUCTION
      : process.env.PERMIT_SERVICE_URL_LOCAL;

    // Fetch data for route, schedule, and permit
    const [routeResponse, scheduleResponse, permitResponse, tripResponse] = await Promise.all([
      axios.get(`${routeServiceUrl}/${routeNumber}`), 
      axios.get(`${scheduleServiceUrl}/${scheduleId}`),
      axios.get(`${permitServiceUrl}/${permitNumber}`),
      axios.get(`${process.env.TRIP_SERVICE_URL_LOCAL}/${tripId}`),  // Fetch trip details from the trip service
    ]);

    // Validate responses
    if (routeResponse.status !== 200) throw new Error('Invalid route for routeNumber');
    if (scheduleResponse.status !== 200) throw new Error('Invalid scheduleId');
    if (permitResponse.status !== 200) throw new Error('Invalid permitNumber');
    if (tripResponse.status !== 200) throw new Error('Invalid tripId');

    // Extract data from the responses
    const routeData = routeResponse.data;
    const scheduleData = scheduleResponse.data;
    const permitData = permitResponse.data;
    const tripData = tripResponse.data;

    // Check if the seat is available
    const seatNumberInt = parseInt(seatNumber);
    if (!tripData.availableSeats.includes(seatNumberInt)) {
      return res.status(400).json({ message: 'Seat not available for booking' });
    }

    // Create a new booking using the fetched data
    const newBooking = new Booking({
      bookingId,
      commuterId,
      commuterName,
      commuterEmail,
      nic,
      seatNumber,
      routeNumber, // Add routeNumber from user input
      tripId,
      tripNumber: scheduleData.tripNumber,
      tripDate: scheduleData.tripDate,
      startLocation: routeData.startLocation,
      endLocation: routeData.endLocation,
      scheduleId,
      departureTime: scheduleData.departureTime,
      arrivalTime: scheduleData.arrivalTime,
      permitNumber,
      vehicleNumber: permitData.vehicleNumber,
      busType: permitData.busType,
      pricePerSeat: permitData.pricePerSeat,
      music: permitData.music,
      ac: permitData.ac,
      paymentStatus: 'PENDING',  // Default payment status
    });

    // Save the new booking to the database
    await newBooking.save();

    res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
  } catch (error) {
    console.error('Error creating booking:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Function to update payment status (from 'PENDING' to 'SUCCESS')
const updatePaymentStatus = async (req, res) => {
  const { bookingId } = req.body;  // Assuming you send bookingId in the request body

  // Validate required fields
  if (!bookingId) {
    return res.status(400).json({ message: 'Booking ID is required' });
  }

  try {
    // Find the booking by bookingId
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if payment is already marked as 'SUCCESS'
    if (booking.paymentStatus === 'SUCCESS') {
      return res.status(400).json({ message: 'Payment status is already SUCCESS' });
    }

    // Mock the payment process and update payment status to 'SUCCESS'
    booking.paymentStatus = 'SUCCESS';

    // Fetch the trip details from the Trip Service
    const tripResponse = await axios.get(`${process.env.TRIP_SERVICE_URL_LOCAL}/${booking.tripId}`);

    if (tripResponse.status !== 200) {
      return res.status(404).json({ message: 'Trip not found' });
    }

    const tripData = tripResponse.data;

    // Mark the seat as confirmed and update available seats
    const seatNumber = parseInt(booking.seatNumber); // Ensure seat number is an integer
    if (tripData.availableSeats.includes(seatNumber)) {
      // Add to confirmed seats
      tripData.confirmedSeats.push(seatNumber);

      // Remove from available seats
      tripData.availableSeats = tripData.availableSeats.filter(seat => seat !== seatNumber);

      // Save the updated trip data
      await axios.put(`${process.env.TRIP_SERVICE_URL_LOCAL}/${booking.tripId}`, tripData);
    } else {
      return res.status(400).json({ message: 'Seat not available for booking' });
    }

    // Save the updated booking
    await booking.save();

    // Return success response
    res.status(200).json({
      message: 'Payment successful and booking confirmed',
      booking,
      trip: tripData
    });

  } catch (error) {
    console.error('Error updating payment status:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get all bookings
const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find();
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get a booking by NIC
const getBookingByNic = async (req, res) => {
  const { nic } = req.params;

  try {
    const booking = await Booking.findOne({ nic });
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found for this NIC' });
    }
    res.status(200).json(booking);
  } catch (error) {
    console.error('Error fetching booking by NIC:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Get bookings by tripId
const getBookingsByTripId = async (req, res) => {
  const { tripId } = req.params;

  try {
    const bookings = await Booking.find({ tripId });
    if (!bookings.length) {
      return res.status(404).json({ message: 'No bookings found for this tripId' });
    }
    res.status(200).json(bookings);
  } catch (error) {
    console.error('Error fetching bookings by tripId:', error.message);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingByNic,
  getBookingsByTripId,
  updatePaymentStatus  // Export the new method for payment status update
};
