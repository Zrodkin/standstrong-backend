// server/models/Class.js
const mongoose = require('mongoose');

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
      type: String,
      required: true
    },
    endTime: {
      type: String,
      required: true
    }
  }],
  registeredStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    registeredAt: {
      type: Date,
      default: Date.now
    }
  }],
  attendance: [{
    session: {
      type: Date,
      required: true
    },
    presentStudents: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
module.exports = Class;

