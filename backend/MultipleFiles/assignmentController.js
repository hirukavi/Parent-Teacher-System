// MultipleFiles/assignmentController.js
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'assignments');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
});

exports.upload = multer({
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

// Create assignment (teacher)
exports.createAssignment = (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can upload' });
  const { title, description } = req.body;
  if (!title || !description) return res.status(400).json({ message: 'Missing fields' });
  if (!req.file) return res.status(400).json({ message: 'File required' });
  const file_path = req.file.filename; // store only filename
  const teacher_id = req.user.id;
  const sql = "INSERT INTO assignments (title, description, teacher_id, file_path) VALUES (?,?,?,?)";
  db.query(sql, [title, description, teacher_id, file_path], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to create assignment' });
    }
    res.json({ message: 'Assignment created', id: result.insertId });
  });
};

// Get all assignments (include teacher name)
exports.getAssignments = (req, res) => {
  const sql = `
    SELECT a.id, a.title, a.description, a.file_path, a.upload_date,
           u.id AS teacher_id, u.name AS teacher_name
    FROM assignments a
    LEFT JOIN users u ON a.teacher_id = u.id
    ORDER BY a.upload_date DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to fetch assignments' });
    }
    const host = req.get('host');
    const protocol = req.protocol;
    const items = results.map(r => ({
      id: r.id,
      title: r.title,
      description: r.description,
      teacher_id: r.teacher_id,
      teacher_name: r.teacher_name,
      upload_date: r.upload_date,
      file_path: r.file_path,
      // Corrected file_url to point to /uploads/assignments
      file_url: r.file_path ? `${protocol}://${host}/uploads/assignments/${encodeURIComponent(r.file_path)}` : null
    }));
    res.json(items);
  });
};
