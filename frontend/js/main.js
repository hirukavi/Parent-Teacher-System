/* ========= CONFIG ========= */
const API_URL = 'http://localhost:3000';

/* ========= HELPERS ========= */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showToast(msg, ms = 2200) {
  const t = $('#toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), ms);
}

function openModal(title, bodyHtml) {
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = bodyHtml;
  $('#modal').classList.add('show');
}

function closeModal() { $('#modal').classList.remove('show'); }

document.addEventListener('click', (e) => {
  if (e.target.id === 'modalClose' || e.target.id === 'modal') closeModal();
});

function escapeHtml(str = '') {
  return String(str)
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// JSON fetch with Authorization header
async function jsonFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  if (!options.headers) options.headers = {};
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, options);
  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : null;
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

/* ========= AUTH PAGES ========= */
const loginForm = $('#loginForm');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#loginError').style.display = 'none';
    try {
      const data = await jsonFetch(`${API_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: $('#email').value.trim(), password: $('#password').value })
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('name', data.name);
      localStorage.setItem('role', data.role);
      localStorage.setItem('id', data.id);
      showToast('Welcome back!');
      window.location.href = 'dashboard.html';
    } catch (err) {
      $('#loginError').textContent = err.message || 'Login failed';
      $('#loginError').style.display = 'block';
    }
  });
}

const signupForm = $('#signupForm');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    $('#signupError').style.display = 'none';
    try {
      await jsonFetch(`${API_URL}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: $('#name').value.trim(),
          email: $('#email').value.trim(),
          password: $('#password').value,
          role: $('#role').value
        })
      });
      showToast('Account created! Please sign in.');
      window.location.href = 'login.html';
    } catch (err) {
      $('#signupError').textContent = err.message || 'Sign up failed';
      $('#signupError').style.display = 'block';
    }
  });
}

/* ========= DASHBOARD ========= */
if ($('.sidebar')) {
  const name = localStorage.getItem('name');
  const role = localStorage.getItem('role');
  const userId = localStorage.getItem('id');
  if (!name || !role || !userId) window.location.href = 'login.html';

  $('#welcomeTitle').textContent = `Welcome, ${name}`;
  $('#userRoleBadge').textContent = role.charAt(0).toUpperCase() + role.slice(1);

  $$('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const sec = btn.dataset.section;
      $$('.section').forEach(s => s.classList.remove('active'));
      document.getElementById(sec).classList.add('active');
    });
  });

  $('#logoutBtn').addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
  });

  const header = $('#headerActions');
  if (role === 'teacher') {
    header.innerHTML = `
      <button class="btn btn-primary" id="actUpload">Upload Assignment</button>
      <button class="btn btn-primary" id="actAnnounce">Post Announcement</button>
      <button class="btn btn-ghost" id="actGrade">Post Grade</button>`;
  } else {
    header.innerHTML = `<button class="btn btn-ghost" id="actMessage">New Message</button>`;
  }

  /* ========= DATA LOADERS ========= */
  async function loadUsers() {
    try { return await jsonFetch(`${API_URL}/users`); } catch { return []; }
  }

  async function loadAnnouncements() {
    try {
      const items = await jsonFetch(`${API_URL}/announcements`);
      $('#statAnnouncements').textContent = items.length || 0;
      $('#announceList').innerHTML = items.length
        ? items.map(a => `<div class="item">
            <h4>${escapeHtml(a.title)}</h4>
            <div class="meta">By ${escapeHtml(a.teacher_name)} • ${new Date(a.created_at).toLocaleString()}</div>
            <p>${escapeHtml(a.content)}</p>
          </div>`).join('')
        : `<div class="muted">No announcements</div>`;
    } catch (err) {
      console.error(err);
      $('#announceList').innerHTML = `<div class="muted">Failed to load announcements</div>`;
    }
  }

  async function loadAssignments() {
    try {
      // Corrected URL to fetch assignments list
      const items = await jsonFetch(`${API_URL}/assignments`);
      $('#statAssignments').textContent = items.length || 0;
      $('#assignList').innerHTML = items.length
        ? items.map(a => {
            const dl = a.file_url ? `<a class="btn btn-ghost" href="${a.file_url}" target="_blank">Download</a>` : '';
            const submitBtn = role === 'student' ? `<button class="btn btn-primary" data-submit="${a.id}" data-title="${escapeHtml(a.title)}">Submit</button>` : '';
            const submissionsBtn = role === 'teacher' ? `<button class="btn btn-ghost" data-submissions="${a.id}" data-title="${escapeHtml(a.title)}">View Submissions</button>` : '';
            return `<div class="item">
              <h4>${escapeHtml(a.title)}</h4>
              <div class="meta">By ${escapeHtml(a.teacher_name)} • ${new Date(a.upload_date).toLocaleString()}</div>
              <p>${escapeHtml(a.description || '')}</p>
              <div class="actions">${dl} ${submitBtn} ${submissionsBtn}</div>
            </div>`;
          }).join('')
        : `<div class="muted">No assignments</div>`;

      // Student submit button
      $$('#assignList [data-submit]').forEach(btn => {
        btn.addEventListener('click', () => openSubmitModal(btn.getAttribute('data-submit'), btn.getAttribute('data-title')));
      });

      // Teacher view submissions
      $$('#assignList [data-submissions]').forEach(btn => {
        btn.addEventListener('click', () => openSubmissionsModal(btn.getAttribute('data-submissions'), btn.getAttribute('data-title')));
      });

    } catch (err) {
      console.error(err);
      $('#assignList').innerHTML = `<div class="muted">Failed to load assignments</div>`;
    }
  }

  async function loadMarks() {
    try {
      const path = role === 'student' ? `${API_URL}/marks/${userId}` : `${API_URL}/marks`;
      const items = await jsonFetch(path);
      $('#marksTableWrap').innerHTML = items.length
        ? `<table class="table"><thead><tr><th>Subject</th><th>Mark</th></tr></thead><tbody>${items.map(m => `<tr><td>${escapeHtml(m.subject)}</td><td>${escapeHtml(String(m.mark))}</td></tr>`).join('')}</tbody></table>`
        : `<div class="muted">No marks</div>`;
    } catch (err) {
      console.error(err);
      $('#marksTableWrap').innerHTML = `<div class="muted">Failed to load marks</div>`;
    }
  }

  // Added missing loadMessages function
  async function loadMessages() {
    try {
      const items = await jsonFetch(`${API_URL}/messages`);
      $('#statMessages').textContent = items.length || 0;
      $('#messagesList').innerHTML = items.length
        ? items.map(m => `<div class="item">
            <div class="meta">From ${escapeHtml(m.sender_name)} • ${new Date(m.sent_at).toLocaleString()}</div>
            <p>${escapeHtml(m.message)}</p>
            <button class="btn btn-ghost" data-reply="${m.sender_id}" data-name="${escapeHtml(m.sender_name)}">Reply</button>
          </div>`).join('')
        : `<div class="muted">No messages</div>`;

      // Attach reply button listeners
      $$('#messagesList [data-reply]').forEach(btn => {
        btn.addEventListener('click', () => openNewMessageModal(btn.getAttribute('data-reply'), btn.getAttribute('data-name')));
      });
    } catch (err) {
      console.error(err);
      $('#messagesList').innerHTML = `<div class="muted">Failed to load messages</div>`;
    }
  }

  /* ========= MODALS ========= */
  function openUpload() {
    openModal('Upload Assignment', `
      <form id="uploadForm" class="form">
        <div class="form-row"><label>Title</label><input id="uTitle" required /></div>
        <div class="form-row"><label>Description</label><textarea id="uDesc" required></textarea></div>
        <div class="form-row"><label>File</label><input id="uFile" type="file" accept=".pdf,.doc,.docx" required /></div>
        <button class="btn btn-primary" type="submit">Upload</button>
      </form>
    `);

    // Attach event listener each time modal opens
    $('#uploadForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = $('#uFile').files[0];
      if (!f) { showToast('Select a file'); return; }
      const fd = new FormData();
      fd.append('title', $('#uTitle').value.trim());
      fd.append('description', $('#uDesc').value.trim());
      fd.append('file', f);
      try {
        await jsonFetch(`${API_URL}/assignments/upload`, { method: 'POST', body: fd });
        showToast('Upload successful');
        closeModal();
        loadAssignments();
      } catch (err) {
        console.error(err);
        showToast('Upload failed');
      }
    }, { once: true });
  }

  function openSubmitModal(id, title) {
    openModal(`Submit: ${escapeHtml(title)}`, `
      <form id="submitForm" class="form">
        <div class="form-row"><label>File</label><input id="sFile" type="file" accept=".pdf,.doc,.docx" required /></div>
        <button class="btn btn-primary" type="submit">Submit</button>
      </form>
    `);

    $('#submitForm').addEventListener('submit', async e => {
      e.preventDefault();
      const f = $('#sFile').files[0];
      if (!f) { showToast('Select file'); return; }
      const fd = new FormData();
      fd.append('file', f);
      try {
        await jsonFetch(`${API_URL}/assignments/submit/${id}`, { method: 'POST', body: fd });
        showToast('Submitted');
        closeModal();
        loadAssignments();
      } catch (err) {
        console.error(err);
        showToast('Submission failed');
      }
    }, { once: true });
  }

  function openSubmissionsModal(id, title) {
    openModal(`Submissions: ${escapeHtml(title)}`, `<div id="submissionsList">Loading...</div>`);

    (async () => {
      try {
        const subs = await jsonFetch(`${API_URL}/assignments/${id}/submissions`);
        $('#submissionsList').innerHTML = subs.length
          ? subs.map(s => `<div class="item">
              <div class="meta">${escapeHtml(s.student_name)} • ${new Date(s.submitted_at).toLocaleString()}</div>
              <a class="btn btn-ghost" href="${s.file_url}" target="_blank">Download</a>
            </div>`).join('')
          : `<div class="muted">No submissions</div>`;
      } catch (err) {
        console.error(err);
        $('#submissionsList').innerHTML = `<div class="muted">Failed to load submissions</div>`;
      }
    })();
  }

  function openAnnounce() {
    openModal('Post Announcement', `
      <form id="announceForm" class="form">
        <div class="form-row"><label>Title</label><input id="aTitle" required /></div>
        <div class="form-row"><label>Content</label><textarea id="aContent" required></textarea></div>
        <button class="btn btn-primary" type="submit">Post</button>
      </form>
    `);

    $('#announceForm').addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await jsonFetch(`${API_URL}/announcements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: $('#aTitle').value.trim(), content: $('#aContent').value.trim() })
        });
        showToast('Posted');
        closeModal();
        loadAnnouncements();
      } catch (err) {
        console.error(err);
        showToast('Failed');
      }
    }, { once: true });
  }

  function openGrade() {
    openModal('Post Grade', `
      <form id="gradeForm" class="form">
        <div class="grid-2">
          <div class="form-row"><label>Student ID</label><input id="gStudent" type="number" required /></div>
          <div class="form-row"><label>Subject</label><input id="gSubject" required /></div>
        </div>
        <div class="form-row"><label>Mark</label><input id="gMark" type="number" min="0" max="100" required /></div>
        <button class="btn btn-primary" type="submit">Submit</button>
      </form>
    `);

    $('#gradeForm').addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await jsonFetch(`${API_URL}/marks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: $('#gStudent').value,
            subject: $('#gSubject').value.trim(),
            mark: Number($('#gMark').value)
          })
        });
        showToast('Grade posted');
        closeModal();
        loadMarks();
      } catch (err) {
        console.error(err);
        showToast('Failed');
      }
    }, { once: true });
  }

  /* ===== Messages & Reply ===== */
  function openNewMessageModal(replyTo = null, prefill = '') {
    const title = replyTo ? `Reply to: ${escapeHtml(prefill)}` : 'New Message';
    openModal(title, `
      <form id="messageForm" class="form">
        <div class="form-row">
          <label>To (Student/Teacher ID)</label>
          <input id="mReceiver" type="number" required ${replyTo ? `value="${replyTo}" readonly` : ''} />
        </div>
        <div class="form-row">
          <label>Message</label>
          <textarea id="mContent" required></textarea>
        </div>
        <button class="btn btn-primary" type="submit">Send</button>
      </form>
    `);

    $('#messageForm').addEventListener('submit', async e => {
      e.preventDefault();
      try {
        await jsonFetch(`${API_URL}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            receiver_id: Number($('#mReceiver').value),
            message: $('#mContent').value.trim()
          })
        });
        showToast('Message sent');
        closeModal();
        loadMessages(); // refresh messages list
      } catch (err) {
        console.error(err);
        showToast('Failed to send message');
      }
    }, { once: true });
  }

  /* ========= EVENT BINDERS ========= */
  $('#btnNewMessage')?.addEventListener('click', () => openNewMessageModal());
  $('#actMessage')?.addEventListener('click', () => openNewMessageModal());
  $('#actUpload')?.addEventListener('click', openUpload);
  $('#actAnnounce')?.addEventListener('click', openAnnounce);
  $('#actGrade')?.addEventListener('click', openGrade);

  /* ========= INITIAL LOAD ========= */
  loadUsers();
  loadAnnouncements();
  loadAssignments();
  loadMessages();
  loadMarks();
}