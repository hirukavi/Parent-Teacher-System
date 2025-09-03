const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

// Post announcement (teacher only)
router.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can post' });
  const { title, content } = req.body;
  const teacher_id = req.user.id;

  const sql = "INSERT INTO announcements (teacher_id, title, content) VALUES (?,?,?)";
  db.query(sql, [teacher_id, title, content], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Announcement posted' });
  });
});

// Get all announcements
router.get('/', (req, res) => {
  const sql = `
    SELECT a.*, u.name AS teacher_name 
    FROM announcements a 
    JOIN users u ON a.teacher_id = u.id 
    ORDER BY a.created_at DESC`;
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
});

module.exports = router;
