// backend/controllers/registrationController.js
import Registration from '../models/Registration.js';
import Class from '../models/Class.js'; //
import User from '../models/User.js';   //
import mongoose from 'mongoose';

// @desc    Register current user for a class (New approach)
// @route   POST /api/registrations
// @access  Private (Requires user login via 'protect')
const createRegistration = async (req, res, next) => {
  try {
    const { classId } = req.body;
    const userId = req.user._id; // From 'protect' middleware

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      res.status(400);
      throw new Error('Invalid Class ID');
    }

    // Use Promise.all for concurrent checks
    const [classItem, existingRegistration] = await Promise.all([
      Class.findById(classId).select('capacity title'), // Select only needed fields
      Registration.findOne({ user: userId, class: classId }),
    ]);

    if (!classItem) {
      res.status(404);
      throw new Error('Class not found');
    }

    if (existingRegistration) {
       // You might want different logic based on existing status (e.g., re-enrolling if cancelled)
       if (existingRegistration.status === 'enrolled' || existingRegistration.status === 'waitlisted') {
           res.status(409); // Conflict
           throw new Error('Already registered or waitlisted for this class');
       }
       // Allow re-registration if cancelled? This depends on your logic.
       // If allowing re-registration, maybe update the existing record instead of erroring.
    }

    // Check capacity (Count *active* registrations)
    const currentEnrollmentCount = await Registration.countDocuments({
        class: classId,
        status: { $in: ['enrolled', 'waitlisted'] } // Count enrolled/waitlisted
    });

    let registrationStatus = 'enrolled';
    if (currentEnrollmentCount >= classItem.capacity) {
      // Implement waitlist logic if desired, otherwise throw error
      // registrationStatus = 'waitlisted';
       res.status(409); // Conflict
       throw new Error('Class is full');
    }

    const newRegistration = await Registration.create({
      user: userId,
      class: classId,
      status: registrationStatus,
    });

    res.status(201).json(newRegistration);

  } catch (error) {
    next(error);
  }
};

// @desc    Get registrations for a specific class (Admin)
// @route   GET /api/registrations/class/:classId
// @access  Private/Admin
const getClassRegistrations = async (req, res, next) => {
  try {
    const { classId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(classId)) {
      res.status(400);
      throw new Error('Invalid Class ID');
    }

    // Fetch registrations and populate user details
    const registrations = await Registration.find({ class: classId })
      .populate('user', 'firstName lastName email phone') // Select user fields needed for admin view
      .sort({ createdAt: 'desc' }); // Sort by registration date

    res.json(registrations);
  } catch (error) {
    next(error);
  }
};

// @desc    Get registrations for the logged-in user
// @route   GET /api/registrations/my
// @access  Private
const getMyRegistrations = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const registrations = await Registration.find({ user: userId })
     .populate({
         path: 'class',
         select: 'title city schedule cost type instructor', // Select fields needed for user view
         populate: { path: 'instructor', select: 'name' } // Optional: Populate instructor name from class
     })
     .sort({ createdAt: 'desc' });
     res.json(registrations);
  } catch(error) {
      next(error);
  }
};


// @desc    Update a registration (e.g., status, notes by Admin)
// @route   PUT /api/registrations/:registrationId
// @access  Private/Admin
const updateRegistration = async (req, res, next) => {
  try {
    const { registrationId } = req.params;
    const { status, notes } = req.body; // Fields admin can update

    if (!mongoose.Types.ObjectId.isValid(registrationId)) {
      res.status(400);
      throw new Error('Invalid Registration ID');
    }

    const registration = await Registration.findById(registrationId);

    if (!registration) {
      res.status(404);
      throw new Error('Registration not found');
    }

    // Validate status if provided
    const allowedStatuses = ['enrolled', 'waitlisted', 'cancelled_by_user', 'cancelled_by_admin'];
    if (status && !allowedStatuses.includes(status)) {
        res.status(400);
        throw new Error(`Invalid status. Allowed: ${allowedStatuses.join(', ')}`);
    }

    // Update fields
    if (status !== undefined) registration.status = status;
    if (notes !== undefined) registration.notes = notes;

    const updatedRegistration = await registration.save();
    res.json(updatedRegistration);

  } catch (error) {
    next(error);
  }
};

// @desc    Delete a registration (Admin unenrolls user)
// @route   DELETE /api/registrations/:registrationId
// @access  Private/Admin
const deleteRegistration = async (req, res, next) => {
  try {
    const { registrationId } = req.params;

     if (!mongoose.Types.ObjectId.isValid(registrationId)) {
      res.status(400);
      throw new Error('Invalid Registration ID');
    }

    const registration = await Registration.findByIdAndDelete(registrationId);

    if (!registration) {
      res.status(404);
      throw new Error('Registration not found');
    }

    res.json({ message: 'Registration deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Cancel a registration (by the user themselves)
// @route   PUT /api/registrations/:registrationId/cancel
// @access  Private
const cancelMyRegistration = async (req, res, next) => {
    try {
        const { registrationId } = req.params;
        const userId = req.user._id;

        if (!mongoose.Types.ObjectId.isValid(registrationId)) {
            res.status(400); throw new Error('Invalid Registration ID');
        }

        const registration = await Registration.findById(registrationId);

        if (!registration) {
            res.status(404); throw new Error('Registration not found');
        }

        // Ensure the user owns this registration
        if (registration.user.toString() !== userId.toString()) {
            res.status(403); // Forbidden
            throw new Error('You are not authorized to cancel this registration');
        }

        // Update status to cancelled by user
        registration.status = 'cancelled_by_user';
        // You might add logic here for refunds, notifying admins, etc.

        const updatedRegistration = await registration.save();
        res.json({ message: 'Registration cancelled', registration: updatedRegistration });

    } catch (error) {
        next(error);
    }
};


export {
  createRegistration,
  getClassRegistrations,
  getMyRegistrations,
  updateRegistration,
  deleteRegistration,
  cancelMyRegistration,
};