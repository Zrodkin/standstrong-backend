// frontend/controllers/userController.js
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { firstName, lastName, email, password, age, gender, phone } = req.body;

    const userExists = await User.findOne({ email });

    if (userExists) {
      res.status(400);
      throw new Error('User already exists');
    }

    const user = await User.create({
      firstName,
      lastName,
      email,
      password, // Hashing happens in User model pre-save hook
      age,
      gender,
      phone
    });

    if (user) {
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400);
      throw new Error('Invalid user data');
    }
  } catch (error) {
     // Ensure consistent error response format
    const statusCode = res.statusCode === 200 ? 400 : res.statusCode; // If status not set, default to 400
    res.status(statusCode).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // --- Debug Logging Start ---
    console.log('--- Login Attempt ---');
    console.log('Received Email:', email);
    // !! IMPORTANT: Remove password logging after debugging !!
    console.log('Received Password:', password);
    // --- Debug Logging End ---

    const user = await User.findOne({ email });

    if (!user) {
      // --- Debug Logging ---
      console.log('User not found for email:', email);
      // --- Debug Logging End ---
      res.status(401); // Set status before throwing
      throw new Error('Invalid email or password');
    }

    // --- Debug Logging ---
    console.log('User Found:', user.email);
    console.log('Stored Hash:', user.password); // Verify this looks like a hash
    // --- Debug Logging End ---

    const isMatch = await user.comparePassword(password);

    // --- Debug Logging ---
    console.log('Password Match Result:', isMatch); // Check if true or false
    // --- Debug Logging End ---

    if (isMatch) { // Check the result of the comparison
      // --- Debug Logging ---
      console.log('Login successful for:', user.email);
       // --- Debug Logging End ---
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
       // --- Debug Logging ---
      console.log('Password comparison failed for:', user.email);
       // --- Debug Logging End ---
      res.status(401); // Set status before throwing
      throw new Error('Invalid email or password');
    }
  } catch (error) {
     // --- Debug Logging ---
    console.error('Login Error:', error.message); // Log the actual error message
     // --- Debug Logging End ---
    // Ensure consistent error response format
    const statusCode = res.statusCode === 200 ? 401 : res.statusCode; // If status not set, default to 401
    res.status(statusCode).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    // Assuming 'protect' middleware attached user to req.user
    const user = await User.findById(req.user._id).populate('registeredClasses');

    if (user) {
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender,
        phone: user.phone,
        role: user.role,
        registeredClasses: user.registeredClasses,
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    const statusCode = res.statusCode === 200 ? 404 : res.statusCode;
    res.status(statusCode).json({ message: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res) => {
  try {
     // Assuming 'protect' middleware attached user to req.user
    const user = await User.findById(req.user._id);

    if (user) {
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.email = req.body.email || user.email;
      user.age = req.body.age || user.age;
      user.gender = req.body.gender || user.gender;
      user.phone = req.body.phone || user.phone;

      if (req.body.password) {
        // Assigning plain password here relies on pre-save hook in User model
        user.password = req.body.password;
      }

      const updatedUser = await user.save();

      res.json({
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        age: updatedUser.age,
        gender: updatedUser.gender,
        phone: updatedUser.phone,
        role: updatedUser.role,
        token: generateToken(updatedUser._id), // Generate new token in case email changed? Optional.
      });
    } else {
      res.status(404);
      throw new Error('User not found');
    }
  } catch (error) {
    const statusCode = res.statusCode === 200 ? 400 : res.statusCode;
    res.status(statusCode).json({ message: error.message });
  }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    // Assuming 'protect' and 'admin' middleware ran
    const users = await User.find({}).populate('registeredClasses'); // Maybe select('-password') here too?
    res.json(users);
  } catch (error) {
    const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
    res.status(statusCode).json({ message: error.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
};