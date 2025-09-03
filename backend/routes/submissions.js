const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'assignments');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

// =================== Student submit assignment ===================
router.post('/submit/:assignmentId', authMiddleware, upload.single('file'), (req, res) => {
  if (req.user.role !== 'student') return res.status(403).json({ message: 'Only students can submit' });
  if (!req.file) return res.status(400).json({ message: 'File is required' });

  const assignment_id = req.params.assignmentId;
  const student_id = req.user.id;
  const file_path = req.file.filename;

  db.query(
    "INSERT INTO submissions (assignment_id, student_id, file_path) VALUES (?,?,?)",
    [assignment_id, student_id, file_path],
    (err) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Assignment submitted' });
    }
  );
});

// =================== Teacher view submissions ===================
router.get('/:assignmentId', authMiddleware, (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can view submissions' });

  const assignmentId = req.params.assignmentId;
  const sql = `
    SELECT s.id, s.assignment_id, s.student_id, s.file_path, s.submitted_at,
           u.name AS student_name
    FROM submissions s
    JOIN users u ON s.student_id = u.id
    WHERE s.assignment_id = ?
    ORDER BY s.submitted_at DESC
  `;

  db.query(sql, [assignmentId], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });

    const host = req.get('host');
    const protocol = req.protocol;
    const submissions = results.map(s => ({
      ...s,
      file_url: s.file_path ? `${protocol}://${host}/uploads/assignments/${encodeURIComponent(s.file_path)}` : null
    }));

    res.json(submissions);
  });
});

module.exports = router;
