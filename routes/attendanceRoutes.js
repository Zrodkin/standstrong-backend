const express = require('express');
const {
  createAttendanceRecord,
  checkInStudent,
  updateAttendanceStatus,
  getClassAttendance,
  getAttendanceById,
  getAttendanceStats,
} = require('../controllers/attendanceController');
const { protect, admin } = require('../middleware/authMiddleware');

const router = express.Router();

// Protected routes
router.route('/:attendanceId/checkin')
  .post(protect, checkInStudent);

// Admin routes
router.route('/')
  .post(protect, admin, createAttendanceRecord);

router.route('/:id')
  .get(protect, admin, getAttendanceById);

router.route('/class/:classId')
  .get(protect, admin, getClassAttendance);

router.route('/stats/:classId')
  .get(protect, admin, getAttendanceStats);

router.route('/:attendanceId/status')
  .put(protect, admin, updateAttendanceStatus);

module.exports = router;