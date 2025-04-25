// server/controllers/classController.js
import Class from '../models/Class.js'; // Use import, add .js extension
import User from '../models/User.js';   // Use import, add .js extension
// Removed erroneous top-level line: const updatedUser = await User.findById(req.user._id)...

// @desc    Create a class
// @route   POST /api/classes
// @access  Private/Admin
const createClass = async (req, res, next) => {
  try {
    const {
      title,
      description,
      city,
      location,      // Should include only address
      instructor,    // Should include name (bio optional)
      type,          // "one-time" or "ongoing"
      cost,
      targetGender,
      targetAgeRange,
      capacity,
      schedule,
      registrationType = 'internal', // Default to 'internal' if not sent
      externalRegistrationLink = '',
      partnerLogo = '',
    } = req.body;

    // Basic validation
    if (!title || !description || !city || !location?.address || !instructor?.name || !type || cost == null || !capacity || !schedule?.length) {
      res.status(400);
      throw new Error('Missing required class fields.');
    }

    const classItem = await Class.create({
      title,
      description,
      city,
      location: {
        address: location.address, // Only address
      },
      instructor,
      type,
      cost,
      targetGender,
      targetAgeRange,
      capacity,
      schedule,
      registrationType,
      externalRegistrationLink,
      partnerLogo,
    });

    res.status(201).json(classItem);
  } catch (error) {
    next(error);
  }
};
// @desc    Get all classes with filtering
// @route   GET /api/classes
// @access  Public
const getClasses = async (req, res, next) => { // Added next
  try {
    const { city, gender, minAge, maxAge, cost, type, time } = req.query;

    // Build filter object for MongoDB query
    const filter = {};

    if (city) {
      // Case-insensitive city search
      filter.city = new RegExp(`^${city}$`, 'i');
    }

    if (gender && gender !== 'any') { // Exclude 'any' from direct filter if sent
      filter.targetGender = { $in: [gender, 'any'] };
    }

    // Age range filtering (check overlap)
    if (minAge || maxAge) {
      filter['targetAgeRange.min'] = { $lte: maxAge ? Number(maxAge) : 100 }; // Class min age <= query max age
      filter['targetAgeRange.max'] = { $gte: minAge ? Number(minAge) : 0 };   // Class max age >= query min age
    }

    if (cost != null) { // Check for null/undefined explicitly
      filter.cost = { $lte: Number(cost) };
    }

    if (type) {
      filter.type = type;
    }

    // Fetch classes based on database filters
    // Only populate necessary fields
    let classes = await Class.find(filter)
                               .select('-registeredStudents -attendance') // Exclude bulky fields from list view
                               .sort({ createdAt: -1 }); // Sort by creation date, newest first

    // Filter by time (in memory - consider DB aggregation for performance on large datasets)
    if (time) {
      classes = classes.filter(classItem => {
        return classItem.schedule.some(session => {
          if (!session.startTime || !session.startTime.includes(':')) return false; // Basic check for valid time string
          const startHour = parseInt(session.startTime.split(':')[0], 10);
          if (isNaN(startHour)) return false;

          switch (time.toLowerCase()) {
            case 'morning': return startHour >= 6 && startHour < 12;
            case 'afternoon': return startHour >= 12 && startHour < 17;
            case 'evening': return startHour >= 17 || startHour < 6; // Handles evening wraps past midnight conceptually
            default: return false;
          }
        });
      });
    }

    res.json(classes);
  } catch (error) {
    next(error); // Pass error to global handler
  }
};

// @desc    Get a single class by ID
// @route   GET /api/classes/:id
// @access  Public
const getClassById = async (req, res, next) => { // Added next
  try {
    // Populate student details for display if needed
    const classItem = await Class.findById(req.params.id).populate({
      path: 'registeredStudents.student',
      select: 'firstName lastName email', // Select only needed fields
    });

    if (classItem) {
      res.json(classItem);
    } else {
      res.status(404); // Not Found
      throw new Error('Class not found');
    }
  } catch (error) {
     next(error); // Pass error to global handler
  }
};

// @desc    Update a class
// @route   PUT /api/classes/:id
// @access  Private/Admin
const updateClass = async (req, res, next) => {
  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      res.status(404);
      throw new Error('Class not found');
    }

    const {
      title,
      description,
      city,
      location,
      instructor,
      type,
      cost,
      targetGender,
      targetAgeRange,
      capacity,
      schedule,
      registrationType,
      externalRegistrationLink,
      partnerLogo,
    } = req.body;

    // Only update if fields are provided
    if (title !== undefined) classItem.title = title;
    if (description !== undefined) classItem.description = description;
    if (city !== undefined) classItem.city = city;
    if (location?.address) classItem.location.address = location.address;
    if (instructor) {
      classItem.instructor.name = instructor.name || classItem.instructor.name;
      classItem.instructor.bio = instructor.bio || classItem.instructor.bio;
    }
    if (type !== undefined) classItem.type = type;
    if (cost !== undefined) classItem.cost = cost;
    if (targetGender !== undefined) classItem.targetGender = targetGender;
    if (targetAgeRange) {
      if (targetAgeRange.min !== undefined) classItem.targetAgeRange.min = targetAgeRange.min;
      if (targetAgeRange.max !== undefined) classItem.targetAgeRange.max = targetAgeRange.max;
    }
    if (capacity !== undefined) classItem.capacity = capacity;
    if (schedule !== undefined) classItem.schedule = schedule;
    if (registrationType !== undefined) classItem.registrationType = registrationType;
    if (externalRegistrationLink !== undefined) classItem.externalRegistrationLink = externalRegistrationLink;
    if (partnerLogo !== undefined) classItem.partnerLogo = partnerLogo;

    const updatedClass = await classItem.save({ runValidators: true });
    res.json(updatedClass);
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
const deleteClass = async (req, res, next) => { // Added next
    try {
      // Consider implications: remove class from registered users? Delete associated attendance?
      const deletedClass = await Class.findByIdAndDelete(req.params.id);

      if (!deletedClass) {
        res.status(404); // Not Found
        throw new Error('Class not found');
      }

      // Optional: Clean up references in User documents
      await User.updateMany(
        { registeredClasses: req.params.id },
        { $pull: { registeredClasses: req.params.id } }
      );
      // Optional: Delete related Attendance records
      // await Attendance.deleteMany({ class: req.params.id });

      res.json({ message: 'Class removed successfully' });

    } catch (error) {
      next(error); // Pass error to global handler
    }
  };

// @desc    Register current user for a class
// @route   POST /api/classes/:id/register
// @access  Private
const registerForClass = async (req, res, next) => { // Added next
    try {
      const classId = req.params.id;
      const userId = req.user._id; // From 'protect' middleware

      // Use Promise.all for concurrent database lookups
      const [classItem, user] = await Promise.all([
          Class.findById(classId),
          User.findById(userId)
      ]);

      if (!classItem) {
        res.status(404); // Not Found
        throw new Error('Class not found');
      }
      if (!user) {
          res.status(404); // Should not happen if 'protect' middleware is working, but good check
          throw new Error('User not found');
      }

      // Check capacity
      if (classItem.registeredStudents.length >= classItem.capacity) {
        res.status(409); // Conflict (or 400 Bad Request)
        throw new Error('Class is full');
      }

      // Check if user is already registered (using $elemMatch for efficiency if needed, but .some is fine)
      const alreadyRegisteredClass = classItem.registeredStudents.some(
        (reg) => reg.student.toString() === userId.toString()
      );
       const alreadyRegisteredUser = user.registeredClasses.some(
           (id) => id.toString() === classId.toString()
       );

      if (alreadyRegisteredClass || alreadyRegisteredUser) {
        // If one is true and not the other, indicates data inconsistency
         if (alreadyRegisteredClass !== alreadyRegisteredUser) {
             console.warn(`Data inconsistency: User ${userId} registration status differs for class ${classId}`);
             // Potentially try to fix inconsistency here or just report error
         }
        res.status(409); // Conflict
        throw new Error('User already registered for this class');
      }

      // Perform registration - update both documents
      classItem.registeredStudents.push({ student: userId, registeredAt: new Date() });
      user.registeredClasses.push(classId);

      // Save both documents concurrently
      await Promise.all([classItem.save(), user.save()]);

      // Fetch updated user data with populated classes to return
      // Select only the necessary fields to avoid sending sensitive info like password hash
      const updatedUser = await User.findById(userId)
                                    .populate('registeredClasses', 'title city schedule cost') // Populate needed class fields
                                    .select('firstName lastName email age gender phone role registeredClasses');

      res.status(201).json({
        message: 'Successfully registered for class',
        user: updatedUser // Return relevant updated user info
      });
    } catch (error) {
      next(error); // Pass error to global handler
    }
  };


// @desc    Get distinct list of cities with classes
// @route   GET /api/classes/cities
// @access  Public
const getAllCities = async (req, res, next) => { // Added next
  try {
    // Fetch distinct city names directly from the database
    const cities = await Class.distinct('city');
    // Filter out null or empty strings if necessary
    const validCities = cities.filter(city => city);
    res.json(validCities);
  } catch (error) {
     next(error); // Pass error to global handler
  }
};

// --- ADDED FUNCTION ---
// @desc    Get classes filtered by city
// @route   GET /api/classes/cities/:city
// @access  Public
const getClassesByCity = async (req, res, next) => { // Added next
  try {
    const city = req.params.city;
    // Use a case-insensitive regex for matching city name
    const classes = await Class.find({ city: new RegExp(`^${city}$`, 'i') })
                                 .select('-registeredStudents -attendance') // Exclude bulky fields
                                 .sort({ createdAt: -1 });

    // You might want to return an empty array if no classes are found,
    // or send a 404 status depending on your API design preference.
    res.json(classes);

  } catch (error) {
    next(error); // Pass error to global handler
  }
};
// --- END ADDED FUNCTION ---


// Export all defined controller functions using named exports
export {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  registerForClass,
  getClassesByCity, // <--- Added here
  getAllCities,
};