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

// =================== Teacher upload assignment ===================
router.post('/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can upload' });
  const { title, description } = req.body;
  if (!req.file) return res.status(400).json({ message: 'File is required' });

  const file_path = req.file.filename;
  db.query(
    "INSERT INTO assignments (teacher_id, title, description, file_path) VALUES (?,?,?,?)",
    [req.user.id, title, description, file_path],
    (err, result) => {
      if (err) return res.status(500).json({ message: err.message });
      res.json({ message: 'Assignment uploaded', id: result.insertId });
    }
  );
});

// =================== Get all assignments ===================
router.get('/', authMiddleware, (req, res) => {
  const sql = `
    SELECT a.id, a.title, a.description, a.file_path, a.upload_date,
           u.id AS teacher_id, u.name AS teacher_name
    FROM assignments a
    JOIN users u ON a.teacher_id = u.id
    ORDER BY a.upload_date DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });

    const host = req.get('host');
    const protocol = req.protocol;
    const assignments = results.map(a => ({
      ...a,
      file_url: a.file_path ? `${protocol}://${host}/uploads/assignments/${encodeURIComponent(a.file_path)}` : null
    }));

    res.json(assignments);
  });
});

module.exports = router;
