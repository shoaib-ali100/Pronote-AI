/* ==========================================================
   PRONOTE AI – Clinician Dashboard Logic
   ========================================================== */

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const userNameEl = document.getElementById('userName');
  const userSpecialtyEl = document.getElementById('userSpecialty');
  const userAvatarEl = document.getElementById('userAvatar');
  const dbStatusEl = document.getElementById('dbStatusText');
  const logoutBtn = document.getElementById('logoutBtn');

  const noteForm = document.getElementById('noteForm');
  const patientNameInput = document.getElementById('patientName');
  const visitTypeSelect = document.getElementById('visitType');
  const specialtySelect = document.getElementById('specialtySelect');
  const transcriptInput = document.getElementById('transcript');
  const charCountEl = document.getElementById('charCount');
  const loadSampleBtn = document.getElementById('loadSampleBtn');
  const generateBtn = document.getElementById('generateBtn');

  const soapPlaceholder = document.getElementById('soapPlaceholder');
  const soapContent = document.getElementById('soapContent');
  const subjectiveText = document.getElementById('subjectiveText');
  const objectiveText = document.getElementById('objectiveText');
  const assessmentText = document.getElementById('assessmentText');
  const planText = document.getElementById('planText');
  const engineBadge = document.getElementById('engineBadge');
  const copyBtn = document.getElementById('copyBtn');
  const saveNoteBtn = document.getElementById('saveNoteBtn');

  const notesListEl = document.getElementById('notesList');
  const historyEmptyEl = document.getElementById('historyEmpty');
  const refreshNotesBtn = document.getElementById('refreshNotesBtn');

  // Auto-detect backend host: works whether served on port 5000, Live Server (port 5500/3000), or file://
  const API_BASE = (window.location.protocol === 'http:' || window.location.protocol === 'https:') && window.location.port === '5000'
    ? ''
    : 'http://localhost:5000';

  // Safe JSON parsing helper
  async function safeJson(response) {
    const text = await response.text();
    try {
      return text ? JSON.parse(text) : {};
    } catch (e) {
      return { success: false, error: `Invalid server response (${response.status} ${response.statusText}). Make sure server is running on http://localhost:5000` };
    }
  }

  // Token & User session
  const token = localStorage.getItem('pronote_token');
  let currentUser = null;

  try {
    const stored = localStorage.getItem('pronote_user');
    if (stored) currentUser = JSON.parse(stored);
  } catch (e) {
    currentUser = null;
  }

  // Populate basic user UI
  if (currentUser) {
    userNameEl.textContent = currentUser.fullName ? `Dr. ${currentUser.fullName}` : 'Dr. Clinician';
    userSpecialtyEl.textContent = currentUser.specialty || 'General Medicine';
    userAvatarEl.textContent = getInitials(currentUser.fullName || 'Doctor');
    if (currentUser.specialty && specialtySelect) {
      specialtySelect.value = currentUser.specialty;
    }
  }

  // Helper: Initials
  function getInitials(name) {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return (name[0] || 'D').toUpperCase();
  }

  // Check Backend Health & MySQL Status
  async function checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      const data = await safeJson(res);
      if (res.ok && data.database && data.database.connected) {
        dbStatusEl.textContent = 'MySQL: Connected';
        dbStatusEl.style.color = '#34d399';
      } else {
        const errMsg = data.database?.error ? ` (${data.database.error})` : '';
        dbStatusEl.textContent = `MySQL: Offline${errMsg}`;
        dbStatusEl.style.color = '#f87171';
      }
    } catch (err) {
      dbStatusEl.textContent = 'Server Offline (Start server on port 5000)';
      dbStatusEl.style.color = '#f87171';
    }
  }
  checkHealth();

  // Load User profile if token exists
  async function fetchProfile() {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await safeJson(res);
      if (res.ok && data.user) {
        currentUser = data.user;
        userNameEl.textContent = currentUser.fullName ? `Dr. ${currentUser.fullName}` : 'Dr. Clinician';
        userSpecialtyEl.textContent = currentUser.specialty || 'General Medicine';
        userAvatarEl.textContent = getInitials(currentUser.fullName || 'Doctor');
      }
    } catch (err) {
      console.warn('Could not fetch user profile:', err);
    }
  }
  fetchProfile();

  // Word counter
  transcriptInput.addEventListener('input', () => {
    const text = transcriptInput.value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    charCountEl.textContent = `${count} words`;
  });

  // Load Sample Consultation
  loadSampleBtn.addEventListener('click', () => {
    patientNameInput.value = 'Sarah Jenkins, 42F';
    visitTypeSelect.value = 'Initial Consultation';
    specialtySelect.value = 'Family Medicine';
    transcriptInput.value = `Doctor: Good morning Sarah, what brings you into the clinic today?
Patient: Hi doctor. I've had a persistent dry cough and a sore throat for about four days now. Yesterday I started feeling warm and having chills.
Doctor: Have you had any shortness of breath, chest pain, or wheezing?
Patient: No shortness of breath or chest pain, just feeling very fatigued and coughing mostly at night.
Doctor: Any history of asthma, allergies, or chronic conditions?
Patient: No, healthy otherwise.
Doctor: Let's check your vitals. BP is 124/80 mmHg, heart rate is 76 bpm regular, pulse ox is 98% on room air, and temperature is 100.2 °F. Oropharynx shows mild erythematous mucosa without exudate. Lungs are clear to auscultation bilaterally with no rhonchi or wheezing.`;

    const count = transcriptInput.value.trim().split(/\s+/).length;
    charCountEl.textContent = `${count} words`;
  });

  // Generate SOAP Note
  noteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const patientName = patientNameInput.value.trim();
    const visitType = visitTypeSelect.value;
    const specialty = specialtySelect.value;
    const transcript = transcriptInput.value.trim();

    if (!transcript) return;

    generateBtn.disabled = true;
    generateBtn.innerHTML = '<span>⏳</span> Synthesizing Medical Note...';

    try {
      const res = await fetch(`${API_BASE}/api/notes/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientName,
          visitType,
          specialty,
          transcript
        })
      });

      const data = await safeJson(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate clinical note.');
      }

      const note = data.note;
      subjectiveText.value = note.subjective || '';
      objectiveText.value = note.objective || '';
      assessmentText.value = note.assessment || '';
      planText.value = note.plan || '';

      engineBadge.textContent = `Engine: ${note.engine || 'Pronote AI Engine'}`;

      soapPlaceholder.style.display = 'none';
      soapContent.style.display = 'flex';
      saveNoteBtn.disabled = false;
      saveNoteBtn.textContent = '💾 Save to MySQL';

    } catch (err) {
      alert(`Error generating note: ${err.message}`);
    } finally {
      generateBtn.disabled = false;
      generateBtn.innerHTML = '<span class="btn-sparkle">✦</span> Generate Clinical SOAP Note';
    }
  });

  // Save Note to MySQL
  saveNoteBtn.addEventListener('click', async () => {
    if (!token) {
      alert('Please sign in or register first to save notes to MySQL.');
      window.location.href = 'signup.html';
      return;
    }

    saveNoteBtn.disabled = true;
    saveNoteBtn.textContent = 'Saving to MySQL...';

    try {
      const payload = {
        patientName: patientNameInput.value.trim(),
        visitType: visitTypeSelect.value,
        specialty: specialtySelect.value,
        rawTranscript: transcriptInput.value.trim(),
        subjective: subjectiveText.value,
        objective: objectiveText.value,
        assessment: assessmentText.value,
        plan: planText.value
      };

      const res = await fetch(`${API_BASE}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await safeJson(res);
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save note in MySQL.');
      }

      saveNoteBtn.textContent = '✓ Saved in MySQL';
      setTimeout(() => {
        saveNoteBtn.textContent = '💾 Save to MySQL';
        saveNoteBtn.disabled = false;
      }, 2000);

      // Refresh notes list
      loadSavedNotes();

    } catch (err) {
      alert(`Could not save note: ${err.message}`);
      saveNoteBtn.disabled = false;
      saveNoteBtn.textContent = '💾 Save to MySQL';
    }
  });

  // Copy Note to Clipboard
  copyBtn.addEventListener('click', () => {
    const fullText = [
      `PATIENT: ${patientNameInput.value.trim()} | VISIT: ${visitTypeSelect.value}`,
      `SPECIALTY: ${specialtySelect.value}`,
      `DATE: ${new Date().toLocaleDateString()}`,
      `\n[SUBJECTIVE]\n${subjectiveText.value}`,
      `\n[OBJECTIVE]\n${objectiveText.value}`,
      `\n[ASSESSMENT]\n${assessmentText.value}`,
      `\n[PLAN]\n${planText.value}`
    ].join('\n');

    navigator.clipboard.writeText(fullText).then(() => {
      copyBtn.textContent = '✓ Copied!';
      setTimeout(() => { copyBtn.textContent = '📋 Copy Note'; }, 1500);
    });
  });

  // Load Saved Notes from MySQL
  async function loadSavedNotes() {
    if (!token) {
      notesListEl.innerHTML = '<p class="history-empty">Please <a href="signup.html" style="color:#00d4aa;">Sign In</a> to view saved notes from MySQL.</p>';
      return;
    }

    try {
      notesListEl.innerHTML = '<p class="history-empty">Loading records from MySQL...</p>';
      const res = await fetch(`${API_BASE}/api/notes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await safeJson(res);

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to fetch notes.');
      }

      const notes = data.notes || [];

      if (notes.length === 0) {
        notesListEl.innerHTML = '<p class="history-empty">No clinical notes saved in MySQL yet. Generate and save a note above.</p>';
        return;
      }

      notesListEl.innerHTML = '';
      notes.forEach(note => {
        const item = document.createElement('div');
        item.className = 'history-item';
        const dateStr = new Date(note.created_at).toLocaleDateString(undefined, {
          month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        item.innerHTML = `
          <div class="history-left">
            <h5>${escapeHtml(note.patient_name)}</h5>
            <div class="history-meta">
              <span>🩺 ${escapeHtml(note.specialty || 'General')}</span>
              <span>📋 ${escapeHtml(note.visit_type)}</span>
              <span>🕒 ${dateStr}</span>
            </div>
          </div>
          <div class="history-actions">
            <button class="btn-h-view" data-id="${note.id}">Open Note</button>
            <button class="btn-h-del" data-id="${note.id}">Delete</button>
          </div>
        `;

        // Open Note
        item.querySelector('.btn-h-view').addEventListener('click', () => {
          patientNameInput.value = note.patient_name;
          visitTypeSelect.value = note.visit_type || 'Initial Consultation';
          specialtySelect.value = note.specialty || 'General Medicine';
          subjectiveText.value = note.subjective || '';
          objectiveText.value = note.objective || '';
          assessmentText.value = note.assessment || '';
          planText.value = note.plan || '';

          soapPlaceholder.style.display = 'none';
          soapContent.style.display = 'flex';
          saveNoteBtn.disabled = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });

        // Delete Note
        item.querySelector('.btn-h-del').addEventListener('click', async () => {
          if (!confirm(`Delete clinical note for ${note.patient_name}?`)) return;
          try {
            const delRes = await fetch(`${API_BASE}/api/notes/${note.id}`, {
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (delRes.ok) {
              loadSavedNotes();
            } else {
              alert('Failed to delete note.');
            }
          } catch (e) {
            alert('Error deleting note.');
          }
        });

        notesListEl.appendChild(item);
      });

    } catch (err) {
      notesListEl.innerHTML = `<p class="history-empty" style="color:#f87171;">MySQL Status: ${escapeHtml(err.message)}</p>`;
    }
  }

  refreshNotesBtn.addEventListener('click', loadSavedNotes);
  loadSavedNotes();

  // Logout
  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('pronote_token');
    localStorage.removeItem('pronote_user');
    window.location.href = 'signup.html';
  });

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
});
