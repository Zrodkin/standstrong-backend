import express from 'express'; // Use import
import {
  createAttendanceRecord,
  checkInStudent,
  updateAttendanceStatus,
  getClassAttendance,
  getAttendanceById,
  getAttendanceStats,
} from '../controllers/attendanceController.js'; // Use import, add .js extension
import { protect, admin } from '../middleware/authMiddleware.js'; // Use import, add .js extension

const router = express.Router();

// --- Attendance Routes ---

// POST /api/attendance/:attendanceId/checkin - Student checks into a specific attendance record session
// Note: 'protect' ensures logged-in user, logic inside checkInStudent likely verifies student is registered for the class.
router.route('/:attendanceId/checkin')
  .post(protect, checkInStudent);

// POST /api/attendance - Admin creates a new attendance record (e.g., for a specific class session)
router.route('/')
  .post(protect, admin, createAttendanceRecord);

// GET /api/attendance/:id - Admin gets details of a specific attendance record
router.route('/:id')
  .get(protect, admin, getAttendanceById);

// GET /api/attendance/class/:classId - Admin gets all attendance records for a specific class
router.route('/class/:classId')
  .get(protect, admin, getClassAttendance);

// GET /api/attendance/stats/:classId - Admin gets attendance statistics for a class
router.route('/stats/:classId')
  .get(protect, admin, getAttendanceStats);

// PUT /api/attendance/:attendanceId/status - Admin manually updates a student's status in an attendance record
router.route('/:attendanceId/status')
  .put(protect, admin, updateAttendanceStatus); // Assumes controller handles identifying which student's status to update via req.body

export default router; // Use export default