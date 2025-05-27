// frontend/middleware/authMiddleware.js
import jwt from 'jsonwebtoken'; // Use import for libraries
import { jwtSecret } from '../config/config.js'; // Use import for your config, add .js extension
import User from '../models/User.js'; // Use import for your model, add .js extension

// Protect routes - NO CHANGES needed inside this function
const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, jwtSecret); // Ensure jwtSecret is exported correctly from config.js

      // Get user from the token
      // Make sure User model was correctly converted to ESM and exported as default
      req.user = await User.findById(decoded.id).select('-password');

      if (!req.user) {
         // Handle case where user might have been deleted after token issuance
         res.status(401);
         throw new Error('User not found');
      }

      next();
    } catch (error) {
      console.error('Token verification failed:', error.message); // Log specific error message
      res.status(401).json({ message: 'Not authorized, token failed' }); // Send JSON response
      // Avoid throwing after sending response, or use an error handling middleware
      return; // Stop execution after sending response
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' }); // Send JSON response
  }
};

// Admin middleware - NO CHANGES needed inside this function
const admin = (req, res, next) => {
  // Ensure 'protect' middleware runs first to attach req.user
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(401).json({ message: 'Not authorized as an admin' }); // Send JSON response
  }
};

// Use named exports
export { protect, admin };