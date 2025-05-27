import express from 'express'; // Use import
import {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  getClassesByCity,
  getAllCities,
} from '../controllers/classController.js'; // Use import, add .js extension
import { protect, admin } from '../middleware/authMiddleware.js'; // Use import, add .js extension

const router = express.Router();

// --- Public Class Routes ---

// GET /api/classes - Get a list of all classes (potentially with filtering/pagination in controller)
router.route('/')
  .get(getClasses);

// GET /api/classes/cities - Get a list of distinct cities where classes are offered
router.route('/cities')
  .get(getAllCities);

// GET /api/classes/cities/:city - Get classes filtered by a specific city name
router.route('/cities/:city')
  .get(getClassesByCity);

// GET /api/classes/:id - Get details of a specific class by its ID
router.route('/:id')
  .get(getClassById);

// --- Protected Class Routes (Requires login) ---

// --- Admin Class Routes (Requires login and admin role) ---

// POST /api/classes - Admin creates a new class
router.route('/')
  .post(protect, admin, createClass); // 'protect' & 'admin' ensure user is admin

// PUT /api/classes/:id - Admin updates an existing class
// DELETE /api/classes/:id - Admin deletes a class
router.route('/:id')
  .put(protect, admin, updateClass) // 'protect' & 'admin' ensure user is admin
  .delete(protect, admin, deleteClass); // 'protect' & 'admin' ensure user is admin

export default router; // Use export default