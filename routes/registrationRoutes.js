// backend/routes/registrationRoutes.js
import express from 'express';
import {
  createRegistration,
  getClassRegistrations,
  getMyRegistrations,
  updateRegistration,
  deleteRegistration,
  cancelMyRegistration,
} from '../controllers/registrationController.js';
import { protect, admin } from '../middleware/authMiddleware.js'; // Make sure this path is correct

const router = express.Router();

// --- Registration Routes ---

// POST /api/registrations - Register logged-in user for a class
router.route('/').post(protect, createRegistration);

// GET /api/registrations/my - Get registrations for the logged-in user
router.route('/my').get(protect, getMyRegistrations);

// GET /api/registrations/class/:classId - Get all registrations for a specific class (Admin)
router.route('/class/:classId').get(protect, admin, getClassRegistrations);

// PUT /api/registrations/:registrationId - Update a registration (Admin)
// DELETE /api/registrations/:registrationId - Delete a registration (Admin)
router.route('/:registrationId')
  .put(protect, admin, updateRegistration)
  .delete(protect, admin, deleteRegistration);

 // PUT /api/registrations/:registrationId/cancel - Cancel a registration (User themselves)
router.route('/:registrationId/cancel').put(protect, cancelMyRegistration);


export default router;