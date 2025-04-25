// server/models/Class.js
import mongoose from 'mongoose'; // Use import instead of require

const classSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    address: {
      type: String,
      required: true
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  instructor: {
    name: {
      type: String,
      required: true
    },
    bio: String
  },
  type: {
    type: String,
    enum: ['one-time', 'ongoing'],
    required: true
  },
  cost: {
    type: Number,
    required: true,
    default: 0
  },
  targetGender: {
    type: String,
    enum: ['any', 'male', 'female'],
    default: 'any'
  },
  targetAgeRange: {
    min: {
      type: Number,
      required: true
    },
    max: {
      type: Number,
      required: true
    }
  },
  capacity: {
    type: Number,
    required: true
  },
  schedule: [{
    date: {
      type: Date,
      required: true
    },
    startTime: {
      type: String, // Consider using Date/timestamps if precision or timezones matter
      required: true
    },
    endTime: {
      type: String, // Consider using Date/timestamps if precision or timezones matter
      required: true
    }
  }],
  registeredStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Assumes User model is also converted/available
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  attendance: [{ // Note: You also have a separate Attendance model. Ensure consistency.
    session: { // Might want to link this session date to a specific date in the 'schedule' array.
      type: Date,
      required: true
    },
    presentStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User' // Assumes User model is also converted/available
    }]
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Class = mongoose.model('Class', classSchema);

export default Class; // Use export default instead of module.exports