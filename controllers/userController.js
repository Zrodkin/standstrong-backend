// frontend/controllers/userController.js
import User from '../models/User.js';         // Use import, add .js extension
import generateToken from '../utils/generateToken.js'; // Use import, add .js extension
// Consider adding import asyncHandler from 'express-async-handler'; to simplify try/catch

// @desc    Register a new user
// @route   POST /api/users
// @access  Public
const registerUser = async (req, res, next) => { // Added next
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

    const userExists = await User.findOne({ email: email.toLowerCase() }); // Check lowercase email

    if (userExists) {
      res.status(409); // Conflict
      throw new Error('User already exists with this email');
    }

    const user = await User.create({
      firstName,
      lastName,
      email: email.toLowerCase(), // Store email consistently
      password, // Hashing happens in User model pre-save hook
      age,
      gender,
      phone: phone || null // Handle optional phone
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
        token: generateToken(user._id), // Generate JWT
      });
    } else {
      // This case might be redundant if User.create throws an error on failure
      res.status(400); // Bad Request
      throw new Error('Invalid user data');
    }
  } catch (error) {
     next(error); // Pass error to global handler
    // console.error('Register User Error:', error);
    // const statusCode = res.statusCode >= 400 ? res.statusCode : 500; // Use 500 for unexpected server errors
    // res.status(statusCode).json({ message: error.message });
  }
};

// @desc    Auth user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res, next) => { // Added next
  try {
    const { email, password } = req.body;

    if (!email || !password) {
        res.status(400); // Bad Request
        throw new Error('Please provide email and password');
    }

    // --- Debug Logging Start ---
    // !! IMPORTANT: Remove ALL console logs, especially password, before production !!
    console.log('--- Login Attempt ---');
    console.log('Received Email:', email);
    // console.log('Received Password:', password); // NEVER log passwords in production
    // --- Debug Logging End ---

    // Find user by lowercase email for case-insensitive login
    const user = await User.findOne({ email: email.toLowerCase() });

    // --- Debug Logging ---
    // console.log(user ? `User Found: ${user.email}` : `User not found for email: ${email}`);
    // if(user) console.log('Stored Hash:', user.password); // Verify hash format
    // --- Debug Logging End ---

    // Use optional chaining and check password match in one go
    // user?.comparePassword will only run if user is not null/undefined
    if (user && (await user.comparePassword(password))) {
       // --- Debug Logging ---
       console.log('Login successful for:', user.email);
       // --- Debug Logging End ---

       // Respond with user data and token, omitting password
      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        token: generateToken(user._id), // Generate JWT
      });
    } else {
       // --- Debug Logging ---
       console.log(`Authentication failed for: ${email}`);
       // --- Debug Logging End ---
       res.status(401); // Unauthorized
       throw new Error('Invalid email or password');
    }
  } catch (error) {
    // --- Debug Logging ---
    console.error('Login Error:', error.message); // Log the error message itself
    // --- Debug Logging End ---
    next(error); // Pass error to global handler
    // const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
    // res.status(statusCode).json({ message: error.message });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = async (req, res, next) => {
    try {
      // 'protect' middleware attaches user to req.user. Fetch fresh data.
      const userId = req.user._id; // Get user ID from authenticated request
  
      console.log(`--- getUserProfile for User ID: ${userId} ---`);
  
      // 1. Fetch user WITHOUT population first to check stored IDs
      const userBeforePopulate = await User.findById(userId)
                                         .select('-password'); // Exclude password
  
      // Log the state BEFORE population - Important: Check registeredClasses here
      console.log('User BEFORE population (raw data):', JSON.stringify(userBeforePopulate, null, 2));
      if (!userBeforePopulate) {
         console.log('User not found before population attempt.');
         res.status(404);
         throw new Error('User not found');
      }
       console.log(`Found ${userBeforePopulate.registeredClasses?.length ?? 0} registered class IDs before population.`);
  
      // 2. Now fetch WITH population
      const user = await User.findById(userId)
                             .populate('registeredClasses', 'title city schedule cost') // Populate needed class info
                             .select('-password'); // Exclude password hash
  
      // Log the state AFTER population - Important: Check if registeredClasses is populated or empty
      console.log('User AFTER population (populated data):', JSON.stringify(user, null, 2));
  
      if (user) {
          // Check the populated array length again
          console.log(`Found ${user.registeredClasses?.length ?? 0} populated registered classes after population.`);
          
          // Send the response (this part remains the same)
          res.json({
              _id: user._id,
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              age: user.age,
              gender: user.gender,
              phone: user.phone,
              role: user.role,
              registeredClasses: user.registeredClasses, // Send the (hopefully) populated array
        });
      } else {
          // This else block might be redundant if the findById above handles not found
          console.log('User somehow became null after population attempt.'); 
          res.status(404); // Not Found
          throw new Error('User not found after population'); 
      }
    } catch (error) {
       console.error('Error within getUserProfile function:', error); // Log any error caught in this block
       next(error); // Pass error to global handler
    }
  };

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = async (req, res, next) => { // Added next
  try {
    const user = await User.findById(req.user._id); // Get user via ID from token

    if (!user) {
        res.status(404); // Not Found
        throw new Error('User not found');
    }

    // Update fields if they are provided in the request body
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.age = req.body.age || user.age;
    user.gender = req.body.gender || user.gender;
    user.phone = req.body.phone || user.phone;

    // Handle email update carefully - check if new email is already taken
    if (req.body.email && req.body.email.toLowerCase() !== user.email) {
        const emailExists = await User.findOne({ email: req.body.email.toLowerCase() });
        if (emailExists) {
            res.status(409); // Conflict
            throw new Error('Email already in use by another account.');
        }
        user.email = req.body.email.toLowerCase();
    }

    // Handle password update - relies on pre-save hook in User model
    if (req.body.password) {
         if (req.body.password.length < 6) {
             res.status(400); // Bad Request
             throw new Error('New password must be at least 6 characters long');
         }
      user.password = req.body.password;
    }

    const updatedUser = await user.save({ runValidators: true }); // Run validators on update

    // Respond with updated user data (excluding password) and potentially a new token
    res.json({
      _id: updatedUser._id,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      age: updatedUser.age,
      gender: updatedUser.gender,
      phone: updatedUser.phone,
      role: updatedUser.role,
      token: generateToken(updatedUser._id), // Re-issue token if needed (e.g., email/role changed)
    });

  } catch (error) {
     next(error); // Pass error to global handler
    // console.error('Update Profile Error:', error);
    // const statusCode = res.statusCode >= 400 ? res.statusCode : 500;
    // res.status(statusCode).json({ message: error.message });
  }
};

// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res, next) => { // Added next
  try {
    // Exclude passwords from the list of users
    const users = await User.find({})
                            .select('-password')
                            .populate('registeredClasses', 'title city') // Populate basic class info
                            .sort({ createdAt: -1 }); // Sort by creation date

    res.json(users);
  } catch (error) {
     next(error); // Pass error to global handler
    // console.error('Get Users Error:', error);
    // res.status(500).json({ message: 'Failed to fetch users' });
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