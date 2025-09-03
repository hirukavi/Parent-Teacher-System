const db = require('../db');

// Add mark (teacher only)
exports.addMark = (req, res) => {
  if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Only teachers can add marks' });

  const { student_id, subject, mark } = req.body;
  if (!student_id || !subject || typeof mark === 'undefined') {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const sql = "INSERT INTO marks (student_id, subject, mark) VALUES (?,?,?)";
  db.query(sql, [student_id, subject, mark], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to add mark' });
    }
    res.json({ message: 'Mark added successfully' });
  });
};

// Get marks
exports.getMarks = (req, res) => {
  let studentId = req.params.student_id;

  // If no param provided, and user is a student, show own marks
  if (!studentId) {
    if (req.user.role === 'student') studentId = req.user.id;
    else return res.status(400).json({ message: 'student_id required for non-student users' });
  }

  const sql = "SELECT subject, mark FROM marks WHERE student_id=?";
  db.query(sql, [studentId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to fetch marks' });
    }
    res.json(results);
  });
};
