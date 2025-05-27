// backend/models/Registration.js
import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Reference to the User model
    required: true,
    index: true, // Index for faster lookups by user
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class', // Reference to the Class model
    required: true,
    index: true, // Index for faster lookups by class
  },
  registrationDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['enrolled', 'waitlisted', 'cancelled_by_user', 'cancelled_by_admin'],
    default: 'enrolled',
  },
  notes: { // Optional notes field for admin use
    type: String,
    trim: true,
  },
  // You could add more fields like 'paymentStatus', 'waiverSigned', etc. if needed
}, {
  timestamps: true // Adds createdAt and updatedAt automatically
});

// Optional: Compound index to prevent duplicate registrations
registrationSchema.index({ user: 1, class: 1 }, { unique: true });

const Registration = mongoose.model('Registration', registrationSchema);

export default Registration;