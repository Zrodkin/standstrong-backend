// server/controllers/attendanceController.js
const Attendance = require('../models/Attendance');
const Class = require('../models/Class');

// @desc    Create attendance record for a class session
// @route   POST /api/attendance
// @access  Private/Admin
const createAttendanceRecord = async (req, res) => {
  try {
    const { classId, sessionDate } = req.body;

    // Verify the class exists
    const classItem = await Class.findById(classId);
    if (!classItem) {
      res.status(404);
      throw new Error('Class not found');
    }

    // Check if attendance record already exists
    const existingRecord = await Attendance.findOne({
      class: classId,
      sessionDate: new Date(sessionDate),
    });

    if (existingRecord) {
      res.status(400);
      throw new Error('Attendance record already exists for this session');
    }

    // Create new attendance record
    const attendanceRecord = await Attendance.create({
      class: classId,
      sessionDate: new Date(sessionDate),
      attendees: [], // Initially empty, students check in later
    });

    res.status(201).json(attendanceRecord);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Check in a student to a class session
// @route   POST /api/attendance/:id/checkin
// @access  Private
const checkInStudent = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const userId = req.user._id;

    const attendanceRecord = await Attendance.findById(attendanceId);

    if (!attendanceRecord) {
      res.status(404);
      throw new Error('Attendance record not found');
    }

    // Check if student is registered for the class
    const classItem = await Class.findById(attendanceRecord.class);
    
    const isRegistered = classItem.registeredStudents.some(
      (reg) => reg.student.toString() === userId.toString()
    );

    if (!isRegistered) {
      res.status(400);
      throw new Error('Student is not registered for this class');
    }

    // Check if student already checked in
    const alreadyCheckedIn = attendanceRecord.attendees.some(
      (attendee) => attendee.student.toString() === userId.toString()
    );

    if (alreadyCheckedIn) {
      res.status(400);
      throw new Error('Student already checked in');
    }

    // Add student to attendees
    attendanceRecord.attendees.push({
      student: userId,
      checkInTime: new Date(),
      status: 'present',
    });

    await attendanceRecord.save();

    res.status(200).json({ message: 'Successfully checked in' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Update student attendance status
// @route   PUT /api/attendance/:id/status
// @access  Private/Admin
const updateAttendanceStatus = async (req, res) => {
  try {
    const { attendanceId } = req.params;
    const { studentId, status } = req.body;

    const attendanceRecord = await Attendance.findById(attendanceId);

    if (!attendanceRecord) {
      res.status(404);
      throw new Error('Attendance record not found');
    }

    // Find student in attendees
    const studentIndex = attendanceRecord.attendees.findIndex(
      (attendee) => attendee.student.toString() === studentId
    );

    if (studentIndex === -1) {
      // If student not in attendees yet, add them
      attendanceRecord.attendees.push({
        student: studentId,
        checkInTime: new Date(),
        status,
      });
    } else {
      // Update existing status
      attendanceRecord.attendees[studentIndex].status = status;
    }

    await attendanceRecord.save();

    res.status(200).json({ message: 'Attendance status updated' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Get attendance for a class
// @route   GET /api/attendance/class/:classId
// @access  Private/Admin
const getClassAttendance = async (req, res) => {
  try {
    const { classId } = req.params;

    const attendanceRecords = await Attendance.find({ class: classId })
      .populate({
        path: 'attendees.student',
        select: 'firstName lastName email',
      })
      .sort({ sessionDate: 1 });

    res.json(attendanceRecords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get attendance record by ID
// @route   GET /api/attendance/:id
// @access  Private/Admin
const getAttendanceById = async (req, res) => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('class')
      .populate('attendees.student');

    if (attendance) {
      res.json(attendance);
    } else {
      res.status(404);
      throw new Error('Attendance record not found');
    }
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

// @desc    Get attendance stats for a class
// @route   GET /api/attendance/stats/:classId
// @access  Private/Admin
const getAttendanceStats = async (req, res) => {
  try {
    const { classId } = req.params;
    
    // Get the class details
    const classItem = await Class.findById(classId)
      .populate('registeredStudents.student');
    
    if (!classItem) {
      res.status(404);
      throw new Error('Class not found');
    }
    
    // Get all attendance records for this class
    const attendanceRecords = await Attendance.find({ class: classId });
    
    // Calculate stats
    const totalSessions = attendanceRecords.length;
    const totalStudents = classItem.registeredStudents.length;
    
    const attendanceStats = {
      totalSessions,
      totalStudents,
      sessions: [],
      studentStats: [],
    };
    
    // Session stats
    attendanceRecords.forEach(record => {
      const presentCount = record.attendees.filter(a => a.status === 'present').length;
      const absentCount = totalStudents - presentCount;
      const attendanceRate = totalStudents > 0 ? (presentCount / totalStudents) * 100 : 0;
      
      attendanceStats.sessions.push({
        sessionDate: record.sessionDate,
        presentCount,
        absentCount,
        attendanceRate: Math.round(attendanceRate * 10) / 10, // Round to 1 decimal place
      });
    });
    
    // Student stats
    classItem.registeredStudents.forEach(registration => {
      const student = registration.student;
      
      if (!student) return; // Skip if student reference is missing
      
      const studentAttendance = {
        studentId: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        sessionsPresent: 0,
        sessionsAbsent: 0,
        attendanceRate: 0,
      };
      
      attendanceRecords.forEach(record => {
        const isPresent = record.attendees.some(
          a => a.student.toString() === student._id.toString() && a.status === 'present'
        );
        
        if (isPresent) {
          studentAttendance.sessionsPresent += 1;
        } else {
          studentAttendance.sessionsAbsent += 1;
        }
      });
      
      studentAttendance.attendanceRate = 
        totalSessions > 0 
          ? (studentAttendance.sessionsPresent / totalSessions) * 100 
          : 0;
      
      studentAttendance.attendanceRate = 
        Math.round(studentAttendance.attendanceRate * 10) / 10;
      
      attendanceStats.studentStats.push(studentAttendance);
    });
    
    res.json(attendanceStats);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createAttendanceRecord,
  checkInStudent,
  updateAttendanceStatus,
  getClassAttendance,
  getAttendanceById,
  getAttendanceStats,
};