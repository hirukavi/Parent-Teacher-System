const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/', authMiddleware, (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can add marks' });
  const { student_id, subject, mark } = req.body;
  db.query("INSERT INTO marks (student_id, subject, mark) VALUES (?,?,?)", [student_id, subject, mark], (err) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Mark added' });
  });
});

// Get marks
router.get('/:studentId?', authMiddleware, (req, res) => {
  let sql = "SELECT m.*, u.name AS student_name FROM marks m JOIN users u ON m.student_id=u.id";
  const params = [];
  if (req.params.studentId) {
    sql += " WHERE student_id=?";
    params.push(req.params.studentId);
  } else if (req.user.role === 'student') {
    sql += " WHERE student_id=?";
    params.push(req.user.id);
  }
  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
});

module.exports = router;
