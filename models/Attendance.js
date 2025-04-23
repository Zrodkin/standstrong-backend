// frontend/models/Attendance.js
const mongoose = require('mongoose');

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
      ref: 'User',
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
module.exports = Attendance;