const express = require('express');
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  getBookingByNic,
  getBookingsByTripId,
  updatePaymentStatus,
} = require('../controllers/bookingController');

// Route to create a new booking
router.post('/bookings', createBooking);

// Route to get all bookings
router.get('/bookings', getAllBookings);

// Route to get a booking by NIC
router.get('/bookings/nic/:nic', getBookingByNic);

// Route to get bookings by tripId
router.get('/bookings/tripId/:tripId', getBookingsByTripId);

// Route to update payment status (mock payment success)
router.patch('/bookings/payment', updatePaymentStatus);

module.exports = router;

