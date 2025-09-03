const express = require('express');
const router = express.Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/authMiddleware');

// Get all messages
router.get('/', authMiddleware, (req, res) => {
  const sql = `
    SELECT m.id, m.sender_id, m.receiver_id, m.message, m.sent_at,
           su.name AS sender_name, ru.name AS receiver_name
    FROM messages m
    JOIN users su ON m.sender_id = su.id
    JOIN users ru ON m.receiver_id = ru.id
    WHERE m.sender_id = ? OR m.receiver_id = ?
    ORDER BY m.sent_at DESC
  `;
  db.query(sql, [req.user.id, req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json(results);
  });
});

// Send a new message
router.post('/', authMiddleware, (req, res) => {
  const { receiver_id, message } = req.body;
  if (!receiver_id || !message) return res.status(400).json({ message: 'Receiver and message required' });

  const sql = `INSERT INTO messages (sender_id, receiver_id, message) VALUES (?, ?, ?)`;
  db.query(sql, [req.user.id, receiver_id, message], (err, result) => {
    if (err) return res.status(500).json({ message: err.message });
    res.json({ message: 'Message sent', id: result.insertId });
  });
});

module.exports = router;
