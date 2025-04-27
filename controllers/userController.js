// backend/controllers/userController.js
import User from '../models/User.js';
import generateToken from '../utils/generateToken.js';
import Registration from '../models/Registration.js'; 
// import asyncHandler from 'express-async-handler'; // Optional: if you use it

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, age, gender, phone } = req.body;

    // Basic validation
    if (!firstName || !lastName || !email || !password || !age || !gender) {
        res.status(400); // Bad Request
        throw new Error('Please provide firstName, lastName, email, password, age, and gender');
    }
     if (password.length < 6) {
         res.status(400); // Bad Request
         throw new Error('Password must be at least 6 characters long');
     }

    const userExists = await User.findOne({ email: email.toLowerCase() });

    if (userExists) {
      res.status(409); // Conflict
      throw new Error('User already exists with this email');
    }

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(),
      password, // Hashing happens in User model pre-save hook
      age,
      gender,
      phone: phone || null
    });

    if (user) {
      // Respond with user data and token, omitting password
      res.status(201).json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender,
        phone: user.phone,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
      res.status(400); // Bad Request
      throw new Error('Invalid user data');
    }
  } catch (error) {
     next(error);
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400);
        throw new Error('Please provide email and password');
    }

    console.log('--- Login Attempt ---');
    console.log('Received Email:', email);

    // Find user by lowercase email
    // IMPORTANT: Ensure registeredClasses is selected if not selected by default
    const user = await User.findOne({ email: email.toLowerCase() })
                           .select('+password'); // Explicitly select password if needed for comparison, but ensure registeredClasses is also included

    // If user is found and password matches
    if (user && (await user.comparePassword(password))) {
       console.log('Login successful for:', user.email);

       // Respond with user data and token, omitting password
       // *** ADD registeredClasses TO THE RESPONSE ***
       res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        token: generateToken(user._id),
      });
    } else {
       console.log(`Authentication failed for: ${email}`);
       res.status(401); // Unauthorized
       throw new Error('Invalid email or password');
    }
  } catch (error) {
    console.error('Login Error:', error.message);
    next(error);
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user._id;
    console.log(`--- getUserProfile for User ID: ${userId} ---`);

    // Fetch user data WITHOUT populating registeredClasses
    const user = await User.findById(userId)
                           .select('-password'); // Exclude password hash

    console.log('User data fetched WITHOUT population:', JSON.stringify(user, null, 2));

    if (user) {
        // Send the user object with registeredClasses containing only IDs
        res.json({
            _id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            age: user.age,
            gender: user.gender,
            phone: user.phone,
            role: user.role,
      });
    } else {
        console.log('User not found in getUserProfile.');
        res.status(404); // Not Found
        throw new Error('User not found');
    }
  } catch (error) {
     console.error('Error within getUserProfile function:', error);
     next(error); // Pass error to global handler
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
        res.status(404);
        throw new Error('User not found');
    }

    // Update fields if they are provided
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.age = req.body.age || user.age;
    user.gender = req.body.gender || user.gender;
    user.phone = req.body.phone || user.phone;

    // Handle email update
    if (req.body.email && req.body.email.toLowerCase() !== user.email) {
        const emailExists = await User.findOne({ email: req.body.email.toLowerCase() });
        if (emailExists) {
            res.status(409);
            throw new Error('Email already in use by another account.');
        }
        user.email = req.body.email.toLowerCase();
    }

    // Handle password update
    if (req.body.password) {
         if (req.body.password.length < 6) {
             res.status(400);
             throw new Error('New password must be at least 6 characters long');
         }
      user.password = req.body.password;
    }

    const updatedUser = await user.save({ runValidators: true });

    // Respond with updated user data (including registeredClasses)
    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      age: updatedUser.age,
      gender: updatedUser.gender,
      phone: updatedUser.phone,
      role: updatedUser.role,
      token: generateToken(updatedUser._id),
    });

  } catch (error) {
     next(error);
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res, next) => {
  try {
    // Exclude passwords from the list of users
    const users = await User.find({})
                            .select('-password')
                            .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
     next(error);
  }
};

// Export all controller functions using named exports
export {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
};