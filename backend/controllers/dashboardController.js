// backend/controllers/dashboardController.js
const db = require('../db');

exports.getDashboardData = async (req, res) => {
  const userId = req.user.id;
  const userRole = req.user.role;

  let dashboardData = {
    messages: [],
    announcements: [],
    grades: [],
    assignments: [],
    submissions: []
  };

  try {
    // Fetch Messages (sent and received)
    const messagesSql = `
      SELECT m.*, u1.name AS sender_name, u2.name AS receiver_name
      FROM messages m
      LEFT JOIN users u1 ON m.sender_id = u1.id
      LEFT JOIN users u2 ON m.receiver_id = u2.id
      WHERE m.sender_id = ? OR m.receiver_id = ?
      ORDER BY m.sent_at DESC
      LIMIT 10 -- Limit to recent messages for dashboard
    `;
    const [messages] = await db.promise().query(messagesSql, [userId, userId]);
    dashboardData.messages = messages;

    // Fetch Announcements (all users can view)
    const announcementsSql = `
      SELECT a.id, a.title, a.content, a.created_at, u.name AS teacher_name
      FROM announcements a
      JOIN users u ON a.teacher_id = u.id
      ORDER BY a.created_at DESC
      LIMIT 5 -- Limit to recent announcements
    `;
    const [announcements] = await db.promise().query(announcementsSql);
    dashboardData.announcements = announcements;

    if (userRole === 'teacher') {
      // Teacher specific data
      // Assignments posted by this teacher
      const teacherAssignmentsSql = `
        SELECT a.id, a.title, a.description, a.upload_date, a.file_path
        FROM assignments a
        WHERE a.teacher_id = ?
        ORDER BY a.upload_date DESC
        LIMIT 5
      `;
      const [teacherAssignments] = await db.promise().query(teacherAssignmentsSql, [userId]);
      dashboardData.assignments = teacherAssignments.map(a => ({
        ...a,
        file_url: a.file_path ? `${req.protocol}://${req.get('host')}/uploads/assignments/${encodeURIComponent(a.file_path)}` : null
      }));

      // Recent submissions for assignments posted by this teacher (simplified for dashboard)
      const recentSubmissionsSql = `
        SELECT s.id, s.assignment_id, s.student_id, s.submitted_at, s.grade,
               a.title AS assignment_title, u.name AS student_name
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON s.student_id = u.id
        WHERE a.teacher_id = ?
        ORDER BY s.submitted_at DESC
        LIMIT 5
      `;
      const [recentSubmissions] = await db.promise().query(recentSubmissionsSql, [userId]);
      dashboardData.submissions = recentSubmissions;

    } else if (userRole === 'student') {
      // Student specific data
      // Assignments available to this student (all assignments for simplicity)
      const studentAssignmentsSql = `
        SELECT a.id, a.title, a.description, a.upload_date, a.file_path, u.name AS teacher_name
        FROM assignments a
        JOIN users u ON a.teacher_id = u.id
        ORDER BY a.upload_date DESC
        LIMIT 5
      `;
      const [studentAssignments] = await db.promise().query(studentAssignmentsSql);
      dashboardData.assignments = studentAssignments.map(a => ({
        ...a,
        file_url: a.file_path ? `${req.protocol}://${req.get('host')}/uploads/assignments/${encodeURIComponent(a.file_path)}` : null
      }));

      // Grades for this student
      const studentGradesSql = `
        SELECT s.id AS submission_id, s.grade, s.submitted_at,
               a.title AS assignment_title, a.description AS assignment_description,
               u.name AS teacher_name
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        JOIN users u ON a.teacher_id = u.id
        WHERE s.student_id = ?
        ORDER BY s.submitted_at DESC
        LIMIT 5
      `;
      const [studentGrades] = await db.promise().query(studentGradesSql, [userId]);
      dashboardData.grades = studentGrades;

      // Submissions made by this student
      const studentSubmissionsSql = `
        SELECT s.id, s.assignment_id, s.submitted_at, s.grade,
               a.title AS assignment_title
        FROM submissions s
        JOIN assignments a ON s.assignment_id = a.id
        WHERE s.student_id = ?
        ORDER BY s.submitted_at DESC
        LIMIT 5
      `;
      const [studentSubmissions] = await db.promise().query(studentSubmissionsSql, [userId]);
      dashboardData.submissions = studentSubmissions.map(s => ({
        ...s,
        file_url: s.file_path ? `${req.protocol}://${req.get('host')}/uploads/submissions/${encodeURIComponent(s.file_path)}` : null
      }));

    } else if (userRole === 'parent') {
      // Parent specific data
      // For parents, we need to know which student(s) they are linked to.
      // For simplicity, let's assume a parent can view grades/submissions for a specific student ID
      // that they are associated with (e.g., passed as a query param or stored in their user profile).
      // For this example, we'll assume a parent can view grades for a student they are linked to.
      // A more robust system would have a `parent_student_links` table.
      // For now, we'll just show announcements and messages.
      // To show grades/assignments for their child, the parent's user record would need a `student_id` field
      // or a separate linking table. Let's assume a `student_id` field for simplicity in `users` table for parents.
      // Or, the parent would explicitly query for their child's data.

      // If parent has a linked student ID in their user profile (e.g., `req.user.linked_student_id`)
      // For this example, we'll just show general announcements and messages.
      // To show student-specific data, a parent would need to select their child or have a default child linked.
      // This requires more complex user management.
      // For now, dashboard for parent will primarily show announcements and messages.
      // To view grades, they would use the specific `getStudentGrades` endpoint with their child's ID.
    }

    res.json(dashboardData);

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
};