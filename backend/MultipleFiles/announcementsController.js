// MultipleFiles/announcementsController.js
const db = require('../db');
// Create announcement (teacher)
exports.createAnnouncement = (req, res) => {
  const { title, content } = req.body;
  const teacher_id = req.user.id; // get teacher ID from auth middleware
  if (!title || !content) return res.status(400).json({ message: "Missing fields" });
  const sql = "INSERT INTO announcements (title, content, teacher_id) VALUES (?,?,?)";
  db.query(sql, [title, content, teacher_id], (err, result) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to create announcement" });
    }
    res.json({ message: "Announcement created", id: result.insertId });
  });
};

// Get all announcements (include teacher name)
exports.getAnnouncements = (req, res) => {
  const sql = `
    SELECT a.id, a.title, a.content, a.created_at, u.name AS teacher_name
    FROM announcements a
    JOIN users u ON a.teacher_id = u.id
    ORDER BY a.created_at DESC
  `;
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "Failed to fetch announcements" });
    }
    res.json(results);
  });
};