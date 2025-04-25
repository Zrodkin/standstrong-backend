// frontend/models/User.js
import mongoose from 'mongoose'; // Use import
import bcrypt from 'bcryptjs';   // Use import

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  age: {
    type: Number,
    required: true
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'non-binary', 'prefer not to say'],
    required: true
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['student', 'admin'],
    default: 'student'
  },
  registeredClasses: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class' // Assumes Class model is converted/available
  }],
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving - NO CHANGES needed inside this function
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error); // Pass errors to the next middleware
  }
});

// Method to compare passwords - NO CHANGES needed inside this function
userSchema.methods.comparePassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);

export default User; // Use export default