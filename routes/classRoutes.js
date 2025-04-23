const express = require('express');
const {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  registerForClass,
  getClassesByCity,
  getAllCities,
} = require('../controllers/classController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public routes
router.route('/')
  .get(getClasses);

router.route('/cities')
  .get(getAllCities);

router.route('/cities/:city')
  .get(getClassesByCity);

router.route('/:id')
  .get(getClassById);

// Protected routes
router.route('/:id/register')
  .post(protect, registerForClass);

// Admin routes
router.route('/')
  .post(protect, admin, createClass);

router.route('/:id')
  .put(protect, admin, updateClass)
  .delete(protect, admin, deleteClass);

module.exports = router;