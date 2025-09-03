// MultipleFiles/messageController.js
const db = require('../db');

// Send message (protected)
exports.sendMessage = (req, res) => {
  const sender_id = req.user.id; // use logged-in user
  const { receiver_id, message } = req.body;

  if (!receiver_id || !message) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  const sql = "INSERT INTO messages (sender_id, receiver_id, message) VALUES (?,?,?)";
  db.query(sql, [sender_id, receiver_id, message], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to send message' });
    }
    res.json({ message: 'Message sent successfully' });
  });
};

// Get messages for logged-in user with another user
exports.getMessages = (req, res) => {
  const userId = req.user.id;
  const { otherUserId } = req.params; // the user you want to chat with

  if (!otherUserId) return res.status(400).json({ message: 'otherUserId required' });

  const sql = `
    SELECT m.*, u1.name AS sender_name, u2.name AS receiver_name
    FROM messages m
    LEFT JOIN users u1 ON m.sender_id = u1.id
    LEFT JOIN users u2 ON m.receiver_id = u2.id
    WHERE (m.sender_id=? AND m.receiver_id=?) OR (m.sender_id=? AND m.receiver_id=?)
    ORDER BY m.sent_at ASC
  `;
  db.query(sql, [userId, otherUserId, otherUserId, userId], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: 'Failed to fetch messages' });
    }
    res.json(results);
  });
};