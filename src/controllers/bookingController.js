require('dotenv').config(); // Load environment variables
const axios = require('axios');
const Booking = require('../models/bookingModel'); // Import the Booking model

// Normalize tripDate to 'YYYY-MM-DD' format
const normalizeDate = (date) => {
  const normalizedDate = new Date(date);
  if (isNaN(normalizedDate)) {
    return null;
  }
  return normalizedDate.toISOString().split('T')[0]; // Extract only the date part
};

// Create a new booking
const createBooking = async (req, res) => {
  const {
    bookingId,
    commuterId,
    commuterName,
    commuterEmail,
    nic,
    mobileNumber,  // Added mobileNumber
    seatNumber,
    routeNumber,
    tripId,
    scheduleId,
    permitNumber,
  } = req.body;

  // Validate required fields
  if (!bookingId || !commuterId || !commuterName || !commuterEmail || !nic || !mobileNumber || !seatNumber || !routeNumber || !tripId || !scheduleId || !permitNumber) {
    return res.status(400).json({ message: 'Required fields missing' });
  }

  // Validate tripId format
  const tripIdNumber = parseInt(tripId);
  if (isNaN(tripIdNumber)) {
    return res.status(400).json({ message: 'Invalid tripId' });
  }

  try {
    // Dynamically select URLs based on environment (local or production)
    const tripServiceUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.TRIP_SERVICE_URL_PRODUCTION
        : process.env.TRIP_SERVICE_URL_LOCAL;

    const routeServiceUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.ROUTE_SERVICE_URL_PRODUCTION
        : process.env.ROUTE_SERVICE_URL_LOCAL;

    const scheduleServiceUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.SCHEDULE_SERVICE_URL_PRODUCTION
        : process.env.SCHEDULE_SERVICE_URL_LOCAL;

    const permitServiceUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.PERMIT_SERVICE_URL_PRODUCTION
        : process.env.PERMIT_SERVICE_URL_LOCAL;

    // Fetch route, schedule, and permit data
    const [routeResponse, scheduleResponse, permitResponse, tripResponse] = await Promise.all([
      axios.get(`${routeServiceUrl}/${routeNumber}`),
      axios.get(`${scheduleServiceUrl}/${scheduleId}`),
      axios.get(`${permitServiceUrl}/${permitNumber}`),
      axios.get(`${tripServiceUrl}/${tripIdNumber}`),
    ]);

    // Validate responses
    if (routeResponse.status !== 200) throw new Error('Invalid route for routeNumber');
    if (scheduleResponse.status !== 200) throw new Error('Invalid scheduleId');
    if (permitResponse.status !== 200) throw new Error('Invalid permitNumber');
    if (tripResponse.status !== 200) throw new Error('Invalid tripId');

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
      mobileNumber,  // Added mobileNumber to booking
      seatNumber,
      routeNumber, // Add routeNumber from user input
      tripId: tripIdNumber,
      tripNumber: tripData.tripNumber, // Get tripNumber from the tripData
      tripDate: tripData.tripDate, // Get tripDate from the tripData
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

    // Now send commuter data to the commuterService to save commuter details
    const commuterData = {
      commuterId,
      commuterName,
      commuterEmail,
      nic,
      mobileNumber,  // Send commuter's mobile number to commuterService
    };

    // Sending the commuter data to commuterService API
    try {
      const commuterServiceUrl = process.env.NODE_ENV === 'production'
        ? process.env.COMMUTER_SERVICE_URL_PRODUCTION
        : process.env.COMMUTER_SERVICE_URL_LOCAL;

      const commuterResponse = await axios.post(commuterServiceUrl, commuterData);

      if (commuterResponse.status === 201) {
        console.log('Commuter details saved in commuter service');
      } else {
        console.error('Failed to save commuter details');
      }
    } catch (commuterError) {
      console.error('Error saving commuter details:', commuterError.message);
    }

    // Return success response
    res.status(201).json({ message: 'Booking created successfully', booking: newBooking });
  } catch (error) {
    console.error('Error creating booking:', error.message);
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
    const bookingnic = await Booking.findOne({ nic });
    if (!bookingnic) {
      return res.status(404).json({ message: 'Booking not found for this NIC' });
    }
    res.status(200).json(bookingnic);
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

// Update payment status and confirm the seat
const updatePaymentStatus = async (req, res) => {
  const { bookingId } = req.body; // Booking ID from request body

  // Validate the bookingId
  if (!bookingId) {
    return res.status(400).json({ message: 'Booking ID is required' });
  }

  try {
    // Find the booking by bookingId
    const booking = await Booking.findOne({ bookingId });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Check if payment status is already SUCCESS
    if (booking.paymentStatus === 'SUCCESS') {
      return res.status(400).json({ message: 'Payment status is already SUCCESS' });
    }

    // Update the payment status to 'SUCCESS'
    booking.paymentStatus = 'SUCCESS';
    await booking.save(); // Save the updated payment status

    // Change the booking payment status
    const confirmSeatUrl =
      process.env.NODE_ENV === 'production'
        ? process.env.TRIP_SERVICE_URL_CONFIRM_SEAT_PRODUCTION.replace('VAR_TRIP_ID', booking.tripId)
        : process.env.TRIP_SERVICE_URL_CONFIRM_SEAT.replace('VAR_TRIP_ID', booking.tripId);

    const patchResponse = await axios.patch(confirmSeatUrl, {
      seatNumber: booking.seatNumber,
    });

    // Ensure the PATCH request was successful
    if (patchResponse.status !== 200) {
      return res.status(500).json({ message: 'Failed to update trip data' });
    }

    // Return success response
    res.status(200).json({
      message: 'Payment successful and seat confirmed',
      booking: booking,
    });
  } catch (error) {
    console.error('Error updating payment status:', error.message);
    res.status(500).json({
      message: 'Server error',
      error: error.message,
    });
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingByNic,
  getBookingsByTripId,
  updatePaymentStatus,
};
