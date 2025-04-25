// frontend/controllers/attendanceController.js
import Attendance from '../models/Attendance.js'; // Use import, add .js extension
import Class from '../models/Class.js';         // Use import, add .js extension
// Consider adding import asyncHandler from 'express-async-handler'; if you want to simplify try/catch

// @desc    Create attendance record for a class session
// @route   POST /api/attendance
// @access  Private/Admin
const createAttendanceRecord = async (req, res, next) => { // Added next
  try {
    const { classId, sessionDate } = req.body;

    if (!classId || !sessionDate) {
        res.status(400); // Bad Request
        throw new Error('Class ID and Session Date are required.');
    }

    // Verify the class exists
    const classItem = await Class.findById(classId);
    if (!classItem) {
      res.status(404); // Not Found
      throw new Error('Class not found');
    }

    // Check if attendance record already exists for this class and exact date/time
    // Be careful with date comparison; ensure consistency (e.g., store dates as start-of-day UTC if appropriate)
    const searchDate = new Date(sessionDate);
    const existingRecord = await Attendance.findOne({
      class: classId,
      sessionDate: searchDate,
    });

    if (existingRecord) {
      res.status(409); // Conflict
      throw new Error('Attendance record already exists for this session');
    }

    // Create new attendance record
    const attendanceRecord = await Attendance.create({
      class: classId,
      sessionDate: searchDate,
      attendees: [], // Initially empty
    });

    res.status(201).json(attendanceRecord);
  } catch (error) {
     // If you have a global error handler, use next(error)
     next(error);
     // Otherwise, handle here (less ideal for consistency)
    // console.error('Error creating attendance record:', error);
    // res.status(res.statusCode >= 400 ? res.statusCode : 500).json({ message: error.message });
  }
};

// @desc    Check in a student to a class session
// @route   POST /api/attendance/:attendanceId/checkin
// @access  Private (Assumes user is authenticated via 'protect' middleware)
const checkInStudent = async (req, res, next) => { // Added next
  try {
    const { attendanceId } = req.params;
    const userId = req.user._id; // Get user ID from 'protect' middleware

    const attendanceRecord = await Attendance.findById(attendanceId);

    if (!attendanceRecord) {
      res.status(404); // Not Found
      throw new Error('Attendance record not found');
    }

    // Verify the associated class exists
    const classItem = await Class.findById(attendanceRecord.class);
    if (!classItem) {
        res.status(404); // Not Found
        throw new Error('Associated class not found for this attendance record');
    }

    // Check if student is registered for the class
    const isRegistered = classItem.registeredStudents.some(
      (reg) => reg.student && reg.student.toString() === userId.toString() // Added check for reg.student existence
    );

    if (!isRegistered) {
      res.status(403); // Forbidden
      throw new Error('Student is not registered for this class');
    }

    // Check if student already checked in for this specific record
    const alreadyCheckedIn = attendanceRecord.attendees.some(
      (attendee) => attendee.student.toString() === userId.toString()
    );

    if (alreadyCheckedIn) {
      res.status(409); // Conflict
      throw new Error('Student already checked in for this session');
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
    next(error); // Pass to global error handler
    // console.error('Error checking in student:', error);
    // res.status(res.statusCode >= 400 ? res.statusCode : 500).json({ message: error.message });
  }
};

// @desc    Update student attendance status (by Admin)
// @route   PUT /api/attendance/:attendanceId/status
// @access  Private/Admin
const updateAttendanceStatus = async (req, res, next) => { // Added next
  try {
    const { attendanceId } = req.params;
    const { studentId, status } = req.body;

    // Validate status input
    const validStatuses = ['present', 'absent', 'late'];
    if (!validStatuses.includes(status)) {
        res.status(400); // Bad Request
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const attendanceRecord = await Attendance.findById(attendanceId);

    if (!attendanceRecord) {
      res.status(404); // Not Found
      throw new Error('Attendance record not found');
    }

    // Find student in attendees array
    const studentIndex = attendanceRecord.attendees.findIndex(
      (attendee) => attendee.student.toString() === studentId
    );

    if (studentIndex === -1) {
      // If student not in attendees list for this record, we might add them (as admin action)
      // Check if student is actually registered for the class first
      const classItem = await Class.findById(attendanceRecord.class);
       if (!classItem) {
           res.status(404); // Not Found
           throw new Error('Associated class not found for this attendance record');
       }
       const isRegistered = classItem.registeredStudents.some(
         (reg) => reg.student && reg.student.toString() === studentId.toString()
       );
       if (!isRegistered) {
           res.status(404); // Not Found or 400 Bad Request
           throw new Error('Cannot update status: Student is not registered for this class.');
       }
      // Add the student if registered but somehow not in the list yet
       attendanceRecord.attendees.push({
         student: studentId,
         checkInTime: new Date(), // Or null if marking absent? Needs clarity.
         status: status,
       });
    } else {
      // Update existing status
      attendanceRecord.attendees[studentIndex].status = status;
      // Optionally update checkInTime if status changes to 'present' or 'late'?
    }

    await attendanceRecord.save();

    res.status(200).json({ message: 'Attendance status updated', record: attendanceRecord }); // Return updated record for confirmation
  } catch (error) {
    next(error); // Pass to global error handler
    // console.error('Error updating attendance status:', error);
    // res.status(res.statusCode >= 400 ? res.statusCode : 500).json({ message: error.message });
  }
};

// @desc    Get all attendance records for a specific class
// @route   GET /api/attendance/class/:classId
// @access  Private/Admin
const getClassAttendance = async (req, res, next) => { // Added next
  try {
    const { classId } = req.params;

    // Check if class exists
     const classItem = await Class.findById(classId);
     if (!classItem) {
         res.status(404); // Not Found
         throw new Error('Class not found');
     }

    const attendanceRecords = await Attendance.find({ class: classId })
      .populate({
        path: 'attendees.student',
        select: 'firstName lastName email', // Populate student details
      })
      .sort({ sessionDate: -1 }); // Sort by date descending (most recent first)

    res.json(attendanceRecords);
  } catch (error) {
     next(error); // Pass to global error handler
    // console.error('Error getting class attendance:', error);
    // res.status(res.statusCode >= 400 ? res.statusCode : 500).json({ message: error.message });
  }
};

// @desc    Get a specific attendance record by its ID
// @route   GET /api/attendance/:id
// @access  Private/Admin
const getAttendanceById = async (req, res, next) => { // Added next
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate('class', 'title description') // Populate basic class details
      .populate('attendees.student', 'firstName lastName email'); // Populate student details

    if (attendance) {
      res.json(attendance);
    } else {
      res.status(404); // Not Found
      throw new Error('Attendance record not found');
    }
  } catch (error) {
    next(error); // Pass to global error handler
    // console.error('Error getting attendance by ID:', error);
    // res.status(res.statusCode >= 400 ? res.statusCode : 500).json({ message: error.message });
  }
};


// @desc    Get aggregated attendance statistics for a class
// @route   GET /api/attendance/stats/:classId
// @access  Private/Admin
const getAttendanceStats = async (req, res, next) => { // Added next
  try {
    const { classId } = req.params;

    // Get the class details with registered students populated
    const classItem = await Class.findById(classId)
      .populate('registeredStudents.student', 'firstName lastName email'); // Select necessary fields

    if (!classItem) {
      res.status(404); // Not Found
      throw new Error('Class not found');
    }

    // Get all attendance records for this class
    const attendanceRecords = await Attendance.find({ class: classId });

    // Calculate stats
    const totalSessions = attendanceRecords.length;
    const registeredStudents = classItem.registeredStudents.filter(reg => reg.student); // Filter out missing student refs
    const totalRegisteredStudents = registeredStudents.length;

    const attendanceStats = {
      classId: classItem._id,
      className: classItem.title,
      totalSessions,
      totalRegisteredStudents,
      sessions: [],
      studentStats: [],
    };

    // --- Calculate per-session stats ---
    attendanceRecords.forEach(record => {
      const presentCount = record.attendees.filter(a => a.status === 'present' || a.status === 'late').length;
      // Absent count could be calculated relative to total registered students,
      // OR relative to attendees marked 'absent', OR total registered MINUS present.
      // Let's calculate relative to total registered students for overall class attendance rate.
      const absentCount = totalRegisteredStudents - presentCount;
      const attendanceRate = totalRegisteredStudents > 0 ? (presentCount / totalRegisteredStudents) * 100 : 0;

      attendanceStats.sessions.push({
        attendanceRecordId: record._id,
        sessionDate: record.sessionDate,
        presentCount,
        absentCount, // Based on total registered
        attendanceRate: Math.round(attendanceRate * 10) / 10, // Round to 1 decimal place
      });
    });
     // Sort sessions by date
    attendanceStats.sessions.sort((a, b) => new Date(a.sessionDate) - new Date(b.sessionDate));


    // --- Calculate per-student stats ---
    registeredStudents.forEach(registration => {
      const student = registration.student;

      const studentData = {
        studentId: student._id,
        name: `${student.firstName} ${student.lastName}`,
        email: student.email,
        sessionsPresent: 0,
        sessionsAbsent: 0, // Calculated based on total sessions
        sessionsLate: 0,
        attendanceRate: 0,
      };

      attendanceRecords.forEach(record => {
        const studentAttendanceEntry = record.attendees.find(
          a => a.student.toString() === student._id.toString()
        );

        if (studentAttendanceEntry) {
          if (studentAttendanceEntry.status === 'present') {
            studentData.sessionsPresent += 1;
          } else if (studentAttendanceEntry.status === 'late') {
             studentData.sessionsPresent += 1; // Often counted as present for rate calculation
             studentData.sessionsLate += 1;
          }
          // If status is 'absent', it's handled below
        }
         // If the student is not in the attendees array for this session, they are considered absent for this session
         else {
             // studentData.sessionsAbsent += 1; // This logic is implicitly covered below
         }
      });

       // Calculate absent sessions based on total sessions minus sessions attended (present/late)
       const attendedSessions = studentData.sessionsPresent; // Assuming late counts as attended for rate
       studentData.sessionsAbsent = totalSessions - attendedSessions;

       studentData.attendanceRate =
         totalSessions > 0
           ? (attendedSessions / totalSessions) * 100
           : 0;

       studentData.attendanceRate =
         Math.round(studentData.attendanceRate * 10) / 10; // Round to 1 decimal place

      attendanceStats.studentStats.push(studentData);
    });
    // Sort student stats by name
    attendanceStats.studentStats.sort((a,b) => a.name.localeCompare(b.name));

    res.json(attendanceStats);
  } catch (error) {
     next(error); // Pass to global error handler
    // console.error('Error getting attendance stats:', error);
    // res.status(res.statusCode >= 400 ? res.statusCode : 500).json({ message: error.message });
  }
};


// Export all controller functions using named exports
export {
  createAttendanceRecord,
  checkInStudent,
  updateAttendanceStatus,
  getClassAttendance,
  getAttendanceById,
  getAttendanceStats,
};