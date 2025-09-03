const mysql = require('mysql');

const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',           // your MySQL username, often 'root' on XAMPP
  password: '',           // your MySQL password, often empty on XAMPP by default
  database: 'parent_teacher_db'  // your database name
});

db.connect(err => {
  if (err) {
    console.error('Database connection failed: ' + err.stack);
    return;
  }
  console.log('Connected to database as id ' + db.threadId);
});

module.exports = db;