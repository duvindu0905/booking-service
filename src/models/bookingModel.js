const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: Number, required: true },  // Unique identifier for the booking
  createdAt: { type: Date, default: Date.now },  // Timestamp when the booking was created
  commuterId: { type: Number, required: true },  // ID of the commuter making the booking
  commuterName: { type: String, required: true },  // Name of the commuter
  commuterEmail: { type: String, required: true },  // Email of the commuter
  nic: { type: String, required: true },  // NIC of the commuter
  seatNumber: { type: String, required: true },  // Seat number booked
  routeNumber: { type: String, required: true },  // Route number for the trip
  tripId: { type: Number, required: true },  // The trip the booking is associated with (references trip)
  tripNumber: { type: String, required: true },  // Trip number (corresponds to trip's tripNumber)
  tripDate: { type: String, required: true },  // Trip date (corresponds to trip's tripDate)
  startLocation: { type: String, required: true },  // Start location of the trip
  endLocation: { type: String, required: true },  // End location of the trip
  scheduleId: { type: Number, required: true },  // Schedule ID from the trip service
  departureTime: { type: String, required: true },  // Departure time of the trip
  arrivalTime: { type: String, required: true },  // Arrival time of the trip
  permitNumber: { type: String, required: true },  // Permit number of the bus
  vehicleNumber: { type: String, required: true },  // Vehicle number of the bus
  busType: { type: String, required: true },  // Bus type (e.g., Luxury, Regular)
  pricePerSeat: { type: Number, required: true },  // Price per seat for the booking
  music: { type: Boolean, required: true },  // Whether the trip has music
  ac: { type: Boolean, required: true },  // Whether the trip has air conditioning
  paymentStatus: {
    type: String,
    enum: ['PENDING', 'SUCCESS'],  // Payment status, either pending or successful
    default: 'PENDING',
  }
});

// Automatically remove _id and __v from response
bookingSchema.set('toJSON', {
  transform: (doc, ret) => {
    delete ret._id;  // Remove _id
    delete ret.__v;  // Remove __v
    return ret;  // Return the transformed object
  },
});

const Booking = mongoose.model('Booking', bookingSchema);

module.exports = Booking;
