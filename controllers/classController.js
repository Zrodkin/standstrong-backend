// server/controllers/classController.js
import Class from '../models/Class.js'; // Use import, add .js extension
import User from '../models/User.js';   // Use import, add .js extension
import mongoose from 'mongoose'; 
import Registration from '../models/Registration.js';
// Removed erroneous top-level line: const updatedUser = await User.findById(req.user._id)...

// @desc    Create a class
// @route   POST /api/classes
// @access  Private/Admin
const createClass = async (req, res, next) => {
  // --- Log entry point and received data ---
  console.log(`[Create Class] Received request.`);
  console.log(`[Create Class] Request Body:`, req.body); // Log the entire request body

  try {
    // Destructure fields from request body
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
      imageUrl = '', // Default to empty string if not sent
    } = req.body;

    // --- Basic validation ---
    // (Keep your existing validation)
    if (!title || !description || !city || !location?.address || !instructor?.name || !type || cost == null || !capacity || !schedule?.length) {
      console.log(`[Create Class] Validation failed: Missing required fields.`); // Log validation failure
      res.status(400);
      throw new Error('Missing required class fields.');
    }

     // --- Log the partnerLogo value *before* creating ---
     console.log(`[Create Class] Value for partnerLogo being passed to Class.create: "${partnerLogo}"`);
     console.log(`[Create Class] Value for imageUrl being passed: "${imageUrl}"`);

    // Create the new class document
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
      partnerLogo, // Pass the destructured value (which might be '' or the path)
      imageUrl,
    });

    // --- Log success and the created item ---
    console.log(`[Create Class] Class created successfully with ID: ${classItem._id}`);
    console.log(`[Create Class] Created class data:`, JSON.stringify(classItem.toObject(), null, 2)); // Log the full created object

    res.status(201).json(classItem);

  } catch (error) {
    // --- Log any errors that occur ---
    console.error(`[Create Class] Error creating class: ${error.message}`);
    console.error(error.stack); // Log stack trace
    next(error); // Pass error to the global error handler
  }
};

// @desc    Get all classes with filtering
// @route   GET /api/classes
// @access  Public
const getClasses = async (req, res, next) => {
  try {
    const { city, gender, minAge, maxAge, cost, type, time } = req.query;

    // --- 1. Build the initial $match stage for filtering classes ---
    const matchFilter = {};
    if (city) {
      matchFilter.city = new RegExp(`^${city}$`, 'i');
    }
    if (gender && gender !== 'any') {
      matchFilter.targetGender = { $in: [gender, 'any'] };
    }
    if (minAge || maxAge) {
      matchFilter['targetAgeRange.min'] = { $lte: maxAge ? Number(maxAge) : 100 };
      matchFilter['targetAgeRange.max'] = { $gte: minAge ? Number(minAge) : 0 };
    }
    if (cost != null) {
      matchFilter.cost = { $lte: Number(cost) };
    }
    if (type) {
      matchFilter.type = type;
    }
    // Note: Time filtering remains complex if stored as strings. Applied after aggregation.

    // --- 2. Define the Aggregation Pipeline ---
    const pipeline = [
      // Stage 1: Match classes based on filters
      { $match: matchFilter },

      // Stage 2: Lookup registrations for each matched class
      {
        $lookup: {
          from: Registration.collection.name, // The name of the registrations collection
          localField: '_id',                 // Field from the Class collection (input)
          foreignField: 'class',             // Field from the Registration collection
          as: 'registrations'              // Name of the new array field to add
        }
      },

      // Stage 3: Add the enrollmentCount field
      {
        $addFields: {
          enrollmentCount: {
            $size: {
              // Filter the registrations array
              $filter: {
                input: '$registrations',
                as: 'reg',
                // Keep only registrations with these statuses
                cond: { $in: ['$$reg.status', ['enrolled', 'waitlisted']] }
              }
            }
          }
        }
      },

       // Stage 4: Project the desired fields (clean up output)
       {
        $project: {
          _id: 1,
          title: 1,
          city: 1,
          instructor: 1,
          type: 1,
          capacity: 1,
          schedule: 1,
          createdAt: 1,
          enrollmentCount: 1,
          description: 1,
          location: 1,
          cost: 1,
          targetGender: 1,
          targetAgeRange: 1, // The calculated count we added
          imageUrl: 1,           // Add this line
          partnerLogo: 1,        // Add this line
          registrationType: 1,   // Uncomment this
          externalRegistrationLink: 1
          // --- Other fields from Class.js (Uncomment if needed elsewhere on page) ---
          // registrationType: 1,
          // externalRegistrationLink: 1,
          // partnerLogo: 1,
        }
      },

      // Stage 5: Sort the results
      { $sort: { createdAt: -1 } } // Or sort by another field if preferred
    ];

    // --- 3. Execute the Aggregation Pipeline ---
    let classes = await Class.aggregate(pipeline);

    // --- 4. Apply Time Filtering (In-Memory, as before) ---
    if (time) {
      classes = classes.filter(classItem => {
         // Ensure schedule exists and has items
         if (!classItem.schedule || classItem.schedule.length === 0) return false;

        return classItem.schedule.some(session => {
          if (!session.startTime || !session.startTime.includes(':')) return false;
          const startHour = parseInt(session.startTime.split(':')[0], 10);
          if (isNaN(startHour)) return false;

          switch (time.toLowerCase()) {
            case 'morning': return startHour >= 6 && startHour < 12;
            case 'afternoon': return startHour >= 12 && startHour < 17;
            case 'evening': return startHour >= 17 || startHour < 6;
            default: return false;
          }
        });
      });
    }

    // --- 5. Send Response ---
    res.json(classes);

  } catch (error) {
    console.error("Error fetching classes with aggregation:", error); // Add detailed logging
    next(error);
  }
};
// @desc    Get a single class by ID
// @route   GET /api/classes/:id
// @access  Public
const getClassById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400);
      throw new Error('Invalid class ID');
    }

    const classItem = await Class.findById(id)
      .populate('instructor')
      .populate('city');
      // No need to use .select() since we want all fields including imageUrl and partnerLogo

    if (classItem) {
      console.log("Class imageUrl:", classItem.imageUrl); // Add this log to debug
      console.log("Class partnerLogo:", classItem.partnerLogo); // Add this log to debug
      res.json(classItem);
    } else {
      res.status(404);
      throw new Error('Class not found');
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update a class
// @route   PUT /api/classes/:id
// @access  Private/Admin
const updateClass = async (req, res, next) => {
  // --- Log entry point and received data ---
  console.log(`[Update Class ${req.params.id}] Received request.`);
  console.log(`[Update Class ${req.params.id}] Request Body:`, req.body); // Log the entire request body

  try {
    const classItem = await Class.findById(req.params.id);

    if (!classItem) {
      console.log(`[Update Class ${req.params.id}] Error: Class not found.`); // Log not found error
      res.status(404);
      throw new Error('Class not found');
    }

    // Destructure fields from request body
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
      imageUrl,
    } = req.body;

    // --- Update fields only if they are provided in the request ---
    if (title !== undefined) classItem.title = title;
    if (description !== undefined) classItem.description = description;
    if (city !== undefined) classItem.city = city;
    if (location?.address) classItem.location.address = location.address;
    if (instructor) {
      classItem.instructor.name = instructor.name !== undefined ? instructor.name : classItem.instructor.name;
      classItem.instructor.bio = instructor.bio !== undefined ? instructor.bio : classItem.instructor.bio;
    }
    if (type !== undefined) classItem.type = type;
    if (cost !== undefined) classItem.cost = cost;
    if (targetGender !== undefined) classItem.targetGender = targetGender;
    if (targetAgeRange) {
      if (targetAgeRange.min !== undefined) classItem.targetAgeRange.min = targetAgeRange.min;
       // Check if max is explicitly sent (even if empty string) vs not sent at all (undefined)
      if (targetAgeRange.max !== undefined) {
         // Allow setting max age to null/empty if an empty string is sent
         classItem.targetAgeRange.max = targetAgeRange.max === '' ? null : targetAgeRange.max;
      }
    }
    if (capacity !== undefined) classItem.capacity = capacity;
    if (schedule !== undefined) classItem.schedule = schedule;
    if (registrationType !== undefined) classItem.registrationType = registrationType;
    // Allow clearing the external link if an empty string is sent
    if (externalRegistrationLink !== undefined) classItem.externalRegistrationLink = externalRegistrationLink;

    // --- Specific logging for partnerLogo ---
    if (partnerLogo !== undefined) {
      // This means the partnerLogo field was present in the request body
      classItem.partnerLogo = partnerLogo; // Assign the value from req.body
      console.log(`[Update Class ${req.params.id}] Assigning partnerLogo from request: "${partnerLogo}"`);
    } else {
      // This means the partnerLogo field was NOT present in the request body
      console.log(`[Update Class ${req.params.id}] partnerLogo field was NOT provided in the request body. Current value remains: "${classItem.partnerLogo}"`);
    }
    if (imageUrl !== undefined) {
      classItem.imageUrl = imageUrl; // Assign the value from req.body
      console.log(`[Update Class ${req.params.id}] Assigning imageUrl from request: "${imageUrl}"`);
    }

    // --- Log the state *before* saving ---
    console.log(`[Update Class ${req.params.id}] Class data BEFORE save:`, JSON.stringify(classItem.toObject(), null, 2)); // Use .toObject() for cleaner logging

    // Save the updated document
    const updatedClass = await classItem.save({ runValidators: true });

    // --- Log success ---
    console.log(`[Update Class ${req.params.id}] Class saved successfully.`);
    res.json(updatedClass);

  } catch (error) {
    // --- Log any errors that occur ---
    console.error(`[Update Class ${req.params.id}] Error saving class: ${error.message}`);
    console.error(error.stack); // Log the stack trace for more details
    next(error); // Pass error to the global error handler
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

      // Optional: Delete related Attendance records
      // await Attendance.deleteMany({ class: req.params.id });

      res.json({ message: 'Class removed successfully' });

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
  getClassesByCity, // <--- Added here
  getAllCities,
};