/* ==========================================================
   PRONOTE AI – Authentication (Signup & Login) Interactions
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signupForm');
  const formCard = document.getElementById('formCard');
  const success = document.getElementById('signupSuccess');
  const googleBtn = document.getElementById('googleBtn');
  const submitBtn = document.getElementById('submitBtn');
  const serverAlert = document.getElementById('serverErrorAlert');
  const authToggleLink = document.getElementById('authToggleLink');
  const authToggleText = document.getElementById('authToggleText');
  const pageTitle = document.querySelector('.signup-left h1');
  const pageSubtitle = document.querySelector('.signup-subtitle');
  const successHeading = document.getElementById('successHeading');
  const successMessage = document.getElementById('successMessage');

  let isLoginMode = false;

  // ── Mode Switch: Signup vs Login ──────────────────────────
  if (authToggleLink) {
    authToggleLink.addEventListener('click', (e) => {
      e.preventDefault();
      clearAllErrors();
      hideServerAlert();
      isLoginMode = !isLoginMode;

      const fullNameGroup = document.getElementById('fullName')?.closest('.form-group');
      const specialtyGroup = document.getElementById('specialty')?.closest('.form-group');
      const confirmPassGroup = document.getElementById('confirmPassword')?.closest('.form-group');

      if (isLoginMode) {
        if (pageTitle) pageTitle.textContent = 'Welcome back';
        if (pageSubtitle) pageSubtitle.textContent = 'Sign in to access your clinical documentation.';
        if (submitBtn) submitBtn.innerHTML = 'Sign In <span>→</span>';
        if (authToggleText) authToggleText.textContent = "Don't have an account?";
        authToggleLink.textContent = 'Sign Up';

        if (fullNameGroup) fullNameGroup.style.display = 'none';
        if (specialtyGroup) specialtyGroup.style.display = 'none';
        if (confirmPassGroup) confirmPassGroup.style.display = 'none';
      } else {
        if (pageTitle) pageTitle.textContent = 'Create account';
        if (pageSubtitle) pageSubtitle.textContent = 'Start your 7-day free trial. No credit card required.';
        if (submitBtn) submitBtn.innerHTML = 'Create Account <span>→</span>';
        if (authToggleText) authToggleText.textContent = 'Already have an account?';
        authToggleLink.textContent = 'Sign In';

        if (fullNameGroup) fullNameGroup.style.display = 'block';
        if (specialtyGroup) specialtyGroup.style.display = 'block';
        if (confirmPassGroup) confirmPassGroup.style.display = 'block';
      }
    });
  }

  // ── Password Toggle ───────────────────────────────────────
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const input = document.getElementById(targetId);
      if (!input) return;

      if (input.type === 'password') {
        input.type = 'text';
        btn.textContent = '🙈';
      } else {
        input.type = 'password';
        btn.textContent = '👁';
      }
    });
  });

  // ── Helpers ───────────────────────────────────────────────
  function showError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.add('error');
    if (error) error.classList.add('visible');
  }

  function clearError(inputId, errorId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(errorId);
    if (input) input.classList.remove('error');
    if (error) error.classList.remove('visible');
  }

  function clearAllErrors() {
    document.querySelectorAll('.form-input, .form-select').forEach(el => el.classList.remove('error'));
    document.querySelectorAll('.form-error').forEach(el => el.classList.remove('visible'));
  }

  function showServerAlert(message) {
    if (serverAlert) {
      serverAlert.textContent = message;
      serverAlert.style.display = 'block';
    }
  }

  function hideServerAlert() {
    if (serverAlert) {
      serverAlert.style.display = 'none';
      serverAlert.textContent = '';
    }
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ── Clear errors on input ─────────────────────────────────
  ['fullName', 'email', 'specialty', 'password', 'confirmPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => {
        clearError(id, id + 'Error');
        hideServerAlert();
      });
      el.addEventListener('change', () => {
        clearError(id, id + 'Error');
        hideServerAlert();
      });
    }
  });

  // ── Form Submission ───────────────────────────────────────
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAllErrors();
    hideServerAlert();

    const fullName = document.getElementById('fullName')?.value.trim() || '';
    const email = document.getElementById('email')?.value.trim() || '';
    const specialty = document.getElementById('specialty')?.value || '';
    const password = document.getElementById('password')?.value || '';
    const confirmPassword = document.getElementById('confirmPassword')?.value || '';

    let valid = true;

    if (isLoginMode) {
      // Login validation
      if (!email || !isValidEmail(email)) {
        showError('email', 'emailError');
        valid = false;
      }
      if (!password) {
        showError('password', 'passwordError');
        valid = false;
      }
    } else {
      // Signup validation
      if (!fullName) {
        showError('fullName', 'fullNameError');
        valid = false;
      }
      if (!email || !isValidEmail(email)) {
        showError('email', 'emailError');
        valid = false;
      }
      if (!specialty) {
        showError('specialty', 'specialtyError');
        valid = false;
      }
      if (!password || password.length < 8) {
        showError('password', 'passwordError');
        valid = false;
      }
      if (password !== confirmPassword) {
        showError('confirmPassword', 'confirmPasswordError');
        valid = false;
      }
    }

    if (!valid) {
      const firstError = document.querySelector('.form-input.error, .form-select.error');
      if (firstError) firstError.focus();
      return;
    }

    // ── Backend API Call ────────────────────────────────────
    const originalBtnHtml = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Connecting...';

    // Auto-detect backend host: if page is opened on file:// or live server (port 5500/3000), target http://localhost:5000
    const API_BASE = (window.location.protocol === 'http:' || window.location.protocol === 'https:') && window.location.port === '5000'
      ? ''
      : 'http://localhost:5000';

    const endpoint = isLoginMode ? `${API_BASE}/api/auth/login` : `${API_BASE}/api/auth/signup`;
    const payload = isLoginMode
      ? { email, password }
      : { fullName, email, specialty, password };

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      let data = {};
      const rawText = await response.text();
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch (parseErr) {
        throw new Error(`Server returned non-JSON response (${response.status} ${response.statusText}). Please make sure backend is running on http://localhost:5000`);
      }

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Request failed. Please try again.');
      }

      // Store Auth Session in LocalStorage
      if (data.token) {
        localStorage.setItem('pronote_token', data.token);
      }
      if (data.user) {
        localStorage.setItem('pronote_user', JSON.stringify(data.user));
      }

      // Display Success State
      if (isLoginMode) {
        if (successHeading) successHeading.textContent = 'Welcome back!';
        if (successMessage) successMessage.textContent = `Signed in as ${data.user.fullName || data.user.email}. Loading dashboard...`;
      } else {
        if (successHeading) successHeading.textContent = 'Account created!';
        if (successMessage) successMessage.textContent = 'Welcome to Pronote. Your 7-day free trial has started.';
      }

      formCard.style.display = 'none';
      success.classList.add('visible');

      // Auto redirect to Dashboard
      setTimeout(() => {
        window.location.href = 'dashboard.html';
      }, 1200);

    } catch (err) {
      console.error('[Auth Error]:', err);
      showServerAlert(err.message);
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnHtml;
    }
  });

  // ── Google Sign-In Integration ──────────────────────────
  const googleModal = document.getElementById('googleModal');
  const closeGoogleModal = document.getElementById('closeGoogleModal');
  const customGoogleEmail = document.getElementById('customGoogleEmail');
  const submitCustomGoogleBtn = document.getElementById('submitCustomGoogleBtn');

  if (googleBtn && googleModal) {
    googleBtn.addEventListener('click', () => {
      googleModal.style.display = 'flex';
    });

    if (closeGoogleModal) {
      closeGoogleModal.addEventListener('click', () => {
        googleModal.style.display = 'none';
      });
    }

    // Close on outside click
    googleModal.addEventListener('click', (e) => {
      if (e.target === googleModal) {
        googleModal.style.display = 'none';
      }
    });

    // Account selection buttons
    document.querySelectorAll('.google-account-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const email = btn.getAttribute('data-email');
        const name = btn.getAttribute('data-name');
        await performGoogleLogin(email, name);
      });
    });

    // Custom Google email submission
    if (submitCustomGoogleBtn && customGoogleEmail) {
      submitCustomGoogleBtn.addEventListener('click', async () => {
        const email = customGoogleEmail.value.trim();
        if (!email || !isValidEmail(email)) {
          alert('Please enter a valid Google email address.');
          return;
        }
        const name = email.split('@')[0];
        await performGoogleLogin(email, name);
      });
    }

    async function performGoogleLogin(email, fullName) {
      googleModal.style.display = 'none';
      googleBtn.innerHTML = '<span class="g-icon">G</span> Signing in with Google...';
      googleBtn.style.opacity = '0.7';
      googleBtn.style.pointerEvents = 'none';

      // Auto-detect backend host
      const API_BASE = (window.location.protocol === 'http:' || window.location.protocol === 'https:') && window.location.port === '5000'
        ? ''
        : 'http://localhost:5000';

      try {
        const response = await fetch(`${API_BASE}/api/auth/google`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, fullName })
        });

        const rawText = await response.text();
        let data = {};
        try {
          data = rawText ? JSON.parse(rawText) : {};
        } catch (e) {
          throw new Error(`Server error (${response.status}). Make sure backend is running.`);
        }

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Google sign-in failed.');
        }

        // Store session
        if (data.token) localStorage.setItem('pronote_token', data.token);
        if (data.user) localStorage.setItem('pronote_user', JSON.stringify(data.user));

        // Show success state
        if (successHeading) successHeading.textContent = 'Google Sign-In Successful!';
        if (successMessage) successMessage.textContent = `Welcome ${data.user.fullName || data.user.email}! Loading doctor dashboard...`;
        formCard.style.display = 'none';
        success.classList.add('visible');

        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1200);

      } catch (err) {
        alert(`Google Sign-In error: ${err.message}`);
        googleBtn.innerHTML = '<span class="g-icon">G</span> Sign up with Google';
        googleBtn.style.opacity = '1';
        googleBtn.style.pointerEvents = 'auto';
      }
    }
  }
});

