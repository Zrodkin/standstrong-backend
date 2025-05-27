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

  imageUrl: {
    type: String, // URL to the class image
  },

  location: {
    address: {
      type: String,
      required: true
    },
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
    enum: ['one-time', 'ongoing'], // Note: database values stay the same
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
      type: Number, // Now NOT required — optional
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
  // --- 🔥 NEW FIELDS BELOW 🔥 ---
  registrationType: {
    type: String,
    enum: ['internal', 'external'],
    default: 'internal'
  },
  externalRegistrationLink: {
    type: String,
  },
  partnerLogo: {
    type: String, // URL to the partner logo (optional, for display)
  },
  // --- 🔥 END NEW FIELDS ---
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Class = mongoose.model('Class', classSchema);

export default Class;
