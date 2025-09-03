// server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs'); // For creating upload directories

const { authMiddleware } = require('./MultipleFiles/authMiddleware');

// Controllers
const authController = require('./MultipleFiles/authController');
const announcementController = require('./MultipleFiles/announcementsController');
const assignmentController = require('./MultipleFiles/assignmentController');
const submissionController = require('./MultipleFiles/submissionController'); // Updated
const messageController = require('./MultipleFiles/messageController');
const dashboardController = require('./controllers/dashboardController'); // New

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from 'uploads' directory
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));

// Routes

// Auth Routes
app.post('/signup', authController.signup);
app.post('/login', authController.login);

// Protected Routes (require authentication)
app.use(authMiddleware);

// Announcements
app.post('/announcements', announcementController.createAnnouncement); // Teacher only
app.get('/announcements', announcementController.getAnnouncements); // All roles

// Assignments
app.post('/assignments', assignmentController.upload.single('file'), assignmentController.createAssignment); // Teacher only
app.get('/assignments', assignmentController.getAssignments); // All roles

// Submissions
app.post('/assignments/:assignmentId/submit', submissionController.uploadSubmission.single('file'), submissionController.submitAssignment); // Student only
app.get('/assignments/:assignmentId/submissions', submissionController.getSubmissions); // Teacher only
app.put('/submissions/:submissionId/grade', submissionController.gradeSubmission); // Teacher only
app.get('/grades', submissionController.getStudentGrades); // Student/Parent (for self)
app.get('/grades/:studentId', submissionController.getStudentGrades); // Teacher/Parent (for specific student)

// Messages
app.post('/messages', messageController.sendMessage); // All roles
app.get('/messages/:otherUserId', messageController.getMessages); // All roles

// Dashboard
app.get('/dashboard', dashboardController.getDashboardData); // All roles

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});