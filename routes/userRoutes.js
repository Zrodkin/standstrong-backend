import express from 'express'; // Use import
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  getUsers,
  getFilteredUsers,
  exportStudents
} from '../controllers/userController.js'; // Use import, add .js extension
import { protect, admin } from '../middleware/authMiddleware.js'; // Use import, add .js extension

const router = express.Router();

// --- Public User Routes ---

// POST /api/users - Register a new user
router.post('/', registerUser);

// POST /api/users/login - Authenticate user and get token
router.post('/login', loginUser);

// --- Protected User Routes (Requires login) ---

// GET /api/users/profile - Get logged-in user's profile
// PUT /api/users/profile - Update logged-in user's profile
router.route('/profile')
  .get(protect, getUserProfile) // 'protect' ensures user is logged in
  .put(protect, updateUserProfile); // 'protect' ensures user is logged in

// --- Admin User Routes (Requires login and admin role) ---

// GET /api/users - Get a list of all users (admin only)
router.route('/')
  .get(protect, admin, getUsers); // 'protect' & 'admin' ensure user is admin

// Add the new route for filtered users
router.route('/admin')
  .get(protect, admin, getFilteredUsers);

  router.route('/export')
  .get(protect, admin, exportStudents);

export default router; // Use export default