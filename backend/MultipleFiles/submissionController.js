// backend/controllers/submissionController.js
const db = require('../db');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
// Ensure uploads folder exists for submissions
const uploadsDir = path.join(__dirname, '..', 'uploads', 'submissions');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
// Multer storage for submissions
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});

exports.uploadSubmission = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    if (!allowed.includes(path.extname(file.originalname).toLowerCase())) {
      return cb(new Error('Only PDF/Word files allowed'));
    }
    cb(null, true);
  }
});

// Student submits assignment
exports.submitAssignment = (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can submit' });
  if (!req.file) return res.status(400).json({ message: 'File is required' });
  const assignment_id = req.params.assignmentId;
  const student_id = req.user.id;
  const file_path = req.file.filename;
  // Check if a submission already exists for this assignment by this student
  const checkSql = "SELECT id FROM submissions WHERE assignment_id = ? AND student_id = ?";
  db.query(checkSql, [assignment_id, student_id], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to check existing submission' });
    }
    if (results.length > 0) {
      // Update existing submission
      const submissionId = results[0].id;
      const updateSql = "UPDATE submissions SET file_path = ?, submitted_at = CURRENT_TIMESTAMP WHERE id = ?";
      db.query(updateSql, [file_path, submissionId], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Failed to update submission' });
        }
        res.json({ message: 'Assignment submission updated successfully' });
      });
    } else {
      // Insert new submission
      const insertSql = "INSERT INTO submissions (assignment_id, student_id, file_path) VALUES (?,?,?)";
      db.query(insertSql, [assignment_id, student_id, file_path], (err) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: 'Failed to create submission' });
        }
        res.json({ message: 'Assignment submitted successfully' });
      });
    }
  });
};
// Teacher views submissions for a specific assignment
exports.getSubmissions = (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can view submissions' });
  const assignmentId = req.params.assignmentId;
  const sql = `
    SELECT s.id, s.assignment_id, s.student_id, s.file_path, s.submitted_at, s.grade,
           u.name AS student_name
    FROM submissions s
    JOIN users u ON s.student_id = u.id
    WHERE s.assignment_id = ?
    ORDER BY s.submitted_at DESC
  `;
  db.query(sql, [assignmentId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: err.message });
    }
    const host = req.get('host');
    const protocol = req.protocol;
    const submissions = results.map(s => ({
      ...s,
      file_url: s.file_path ? `${protocol}://${host}/uploads/submissions/${encodeURIComponent(s.file_path)}` : null
    }));
    res.json(submissions);
  });
};

// Teacher gives a grade for a submission
exports.gradeSubmission = (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can grade submissions' });
  const submissionId = req.params.submissionId;
  const { grade } = req.body;
  if (typeof grade === 'undefined' || grade === null || isNaN(grade)) {
    return res.status(400).json({ message: 'Grade is required and must be a number' });
  }
  const sql = "UPDATE submissions SET grade = ? WHERE id = ?";
  db.query(sql, [grade, submissionId], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to update grade' });
    }
    res.json({ message: 'Grade updated successfully' });
  });
};

// Student/Parent views their grades
exports.getStudentGrades = (req, res) => {
  let userId = req.user.id; // Logged-in user
  // If a teacher is viewing a specific student's grades
  if (req.user.role === 'teacher' && req.params.studentId) {
    userId = req.params.studentId;
  } else if (req.user.role === 'parent') {
    // For parents, they might need to specify their child's ID or have it linked
    // For simplicity, let's assume a parent can view their own linked student's grades
    // In a real system, parents would be linked to student IDs.
    // For now, let's assume parents can only view their own (if they are also a student)
    // or we need a mechanism to link parents to students.
    // For this example, we'll allow parents to view grades if they know the studentId
    // or if the system links them. Let's add a check for parent role.
    if (!req.params.studentId) {
        return res.status(400).json({ message: 'Student ID is required for parents to view grades' });
    }

    userId = req.params.studentId; // Parent must provide studentId
  } else if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Access denied. Only students, parents, or teachers can view grades.' });
  }
  const sql = `
    SELECT s.id AS submission_id, s.grade, s.submitted_at,
           a.title AS assignment_title, a.description AS assignment_description,
           u.name AS teacher_name
    FROM submissions s
    JOIN assignments a ON s.assignment_id = a.id
    JOIN users u ON a.teacher_id = u.id
    WHERE s.student_id = ?
    ORDER BY s.submitted_at DESC
  `;

  db.query(sql, [userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to fetch grades' });
    }
    res.json(results);
  });
};