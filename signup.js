/* ==========================================================
   PRONOTE AI – Signup Page Interactions
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signupForm');
  const formCard = document.getElementById('formCard');
  const success = document.getElementById('signupSuccess');
  const googleBtn = document.getElementById('googleBtn');

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

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  // ── Clear errors on input ─────────────────────────────────
  ['fullName', 'email', 'specialty', 'password', 'confirmPassword'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', () => clearError(id, id + 'Error'));
      el.addEventListener('change', () => clearError(id, id + 'Error'));
    }
  });

  // ── Form Submission ───────────────────────────────────────
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearAllErrors();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const specialty = document.getElementById('specialty').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    let valid = true;

    // Validate Full Name
    if (!fullName) {
      showError('fullName', 'fullNameError');
      valid = false;
    }

    // Validate Email
    if (!email || !isValidEmail(email)) {
      showError('email', 'emailError');
      valid = false;
    }

    // Validate Specialty
    if (!specialty) {
      showError('specialty', 'specialtyError');
      valid = false;
    }

    // Validate Password
    if (!password || password.length < 8) {
      showError('password', 'passwordError');
      valid = false;
    }

    // Validate Confirm Password
    if (password !== confirmPassword) {
      showError('confirmPassword', 'confirmPasswordError');
      valid = false;
    }

    if (!valid) {
      // Scroll to first error
      const firstError = document.querySelector('.form-input.error, .form-select.error');
      if (firstError) {
        firstError.focus();
      }
      return;
    }

    // ── Success ───────────────────────────────────────────
    // In production this would POST to the backend.
    // For now, show the success state.
    formCard.style.display = 'none';
    success.classList.add('visible');

    // Log form data (for development)
    console.log('Signup submitted:', { fullName, email, specialty });
  });

  // ── Google Button (placeholder) ───────────────────────────
  googleBtn.addEventListener('click', () => {
    // In production this would initiate Google OAuth.
    googleBtn.innerHTML = '<span class="g-icon">G</span> Loading Google Sign-In...';
    googleBtn.style.opacity = '0.6';
    googleBtn.style.pointerEvents = 'none';

    setTimeout(() => {
      googleBtn.innerHTML = '<span class="g-icon">G</span> Sign up with Google';
      googleBtn.style.opacity = '1';
      googleBtn.style.pointerEvents = 'auto';
      alert('Google Sign-In will be available when the backend is connected.');
    }, 1500);
  });
});
