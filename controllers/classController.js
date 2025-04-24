// server/controllers/classController.js
const Class = require('../models/Class');
const User = require('../models/User');

// @desc    Create a class
// @route   POST /api/classes
// @access  Private/Admin
const createClass = async (req, res) => {
  try {
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
    } = req.body;

    const classItem = await Class.create({
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
    });

    res.status(201).json(classItem);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get all classes
// @route   GET /api/classes
// @access  Public
const getClasses = async (req, res) => {
  try {
    const { city, gender, minAge, maxAge, cost, type, time } = req.query;
    
    // Build filter object
    const filter = {};
    
    if (city) {
      filter.city = city;
    }
    
    if (gender) {
      filter.targetGender = { $in: [gender, 'any'] };
    }
    
    if (minAge || maxAge) {
      filter.targetAgeRange = {};
      
      if (minAge) {
        filter.targetAgeRange.max = { $gte: Number(minAge) };
      }
      
      if (maxAge) {
        filter.targetAgeRange.min = { $lte: Number(maxAge) };
      }
    }
    
    if (cost) {
      filter.cost = { $lte: Number(cost) };
    }
    
    if (type) {
      filter.type = type;
    }
    
    // Time filtering would be more complex, handling it in memory for simplicity
    let classes = await Class.find(filter).populate({
      path: 'registeredStudents.student',
      select: 'firstName lastName email',
    });
    
    // Filter by time if needed
    if (time) {
      // Parse the time query (e.g., 'morning', 'afternoon', 'evening')
      classes = classes.filter(classItem => {
        return classItem.schedule.some(session => {
          const startHour = parseInt(session.startTime.split(':')[0]);
          
          if (time === 'morning' && startHour >= 6 && startHour < 12) {
            return true;
          } else if (time === 'afternoon' && startHour >= 12 && startHour < 17) {
            return true;
          } else if (time === 'evening' && (startHour >= 17 || startHour < 6)) {
            return true;
          }
          
          return false;
        });
      });
    }
    
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get class by ID
// @route   GET /api/classes/:id
// @access  Public
const getClassById = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id).populate({
      path: 'registeredStudents.student',
      select: 'firstName lastName email age gender',
    });

    if (classItem) {
      res.json(classItem);
    } else {
      res.status(404);
      throw new Error('Class not found');
    }
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// @desc    Update a class
// @route   PUT /api/classes/:id
// @access  Private/Admin
const updateClass = async (req, res) => {
  try {
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
    } = req.body;

    const classItem = await Class.findById(req.params.id);

    if (classItem) {
      classItem.title = title || classItem.title;
      classItem.description = description || classItem.description;
      classItem.city = city || classItem.city;
      classItem.location = location || classItem.location;
      classItem.instructor = instructor || classItem.instructor;
      classItem.type = type || classItem.type;
      classItem.cost = cost !== undefined ? cost : classItem.cost;
      classItem.targetGender = targetGender || classItem.targetGender;
      classItem.targetAgeRange = targetAgeRange || classItem.targetAgeRange;
      classItem.capacity = capacity || classItem.capacity;
      classItem.schedule = schedule || classItem.schedule;

      const updatedClass = await classItem.save();
      res.json(updatedClass);
    } else {
      res.status(404);
      throw new Error('Class not found');
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Delete a class
// @route   DELETE /api/classes/:id
// @access  Private/Admin
const deleteClass = async (req, res) => {
    try {
      // Find the document by ID and delete it in one step
      const deletedClass = await Class.findByIdAndDelete(req.params.id);
  
      if (!deletedClass) {
        // If findByIdAndDelete returns null, the document wasn't found
        return res.status(404).json({ message: 'Class not found' });
      }
  
      // If successful, deletedClass contains the document that was deleted
      res.json({ message: 'Class removed successfully' }); // Indicate success
  
    } catch (error) {
      // Catch any potential errors during the database operation
      console.error('---> Error in deleteClass:', error);
      res.status(500).json({ message: 'Server error during class deletion' });
    }
  };

// @desc    Register for a class
// @route   POST /api/classes/:id/register
// @access  Private
const registerForClass = async (req, res) => {
  try {
    const classItem = await Class.findById(req.params.id);
    const user = await User.findById(req.user._id);

    if (!classItem) {
      res.status(404);
      throw new Error('Class not found');
    }

    // Check if class is full
    if (classItem.registeredStudents.length >= classItem.capacity) {
      res.status(400);
      throw new Error('Class is full');
    }

    // Check if user is already registered
    const alreadyRegistered = classItem.registeredStudents.some(
      (reg) => reg.student.toString() === req.user._id.toString()
    );

    if (alreadyRegistered) {
      res.status(400);
      throw new Error('User already registered for this class');
    }

    // Add user to class
    classItem.registeredStudents.push({
      student: req.user._id,
      registeredAt: Date.now(),
    });

    // Add class to user's registeredClasses
    user.registeredClasses.push(classItem._id);

    await classItem.save();
    await user.save();

    res.status(201).json({ message: 'Successfully registered for class' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get classes by city
// @route   GET /api/classes/cities/:city
// @access  Public
const getClassesByCity = async (req, res) => {
  try {
    const classes = await Class.find({ city: req.params.city });
    res.json(classes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all cities with classes
// @route   GET /api/classes/cities
// @access  Public
const getAllCities = async (req, res) => {
  try {
    const cities = await Class.distinct('city');
    res.json(cities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createClass,
  getClasses,
  getClassById,
  updateClass,
  deleteClass,
  registerForClass,
  getClassesByCity,
  getAllCities,
};
// backend/controllers/classController.js