// frontend/models/Attendance.js
import mongoose from 'mongoose'; // Use import instead of require

const attendanceSchema = new mongoose.Schema({
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  sessionDate: {
    type: Date,
    required: true
  },
  attendees: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Make sure you have a User model defined and exported similarly
      required: true
    },
    checkInTime: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late'],
      default: 'present'
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance; // Use export default instead of module.exports