/* ==========================================================
   PRONOTE AI – Landing Page Interactions
   ========================================================== */

document.addEventListener('DOMContentLoaded', () => {
  // ── Element References ────────────────────────────────────
  const navbar       = document.getElementById('navbar');
  const hamburger    = document.getElementById('hamburger');
  const mobileMenu   = document.getElementById('mobileMenu');
  const watchDemoBtn = document.getElementById('watchDemoBtn');
  const demoOverlay  = document.getElementById('demoOverlay');
  const demoClose    = document.getElementById('demoClose');
  const demoReplay   = document.getElementById('demoReplay');
  const demoFill     = document.getElementById('demoProgressFill');
  const demoSteps    = document.querySelectorAll('.demo-step');
  const demoStages   = document.querySelectorAll('.demo-stage');
  const hiwWaveform  = document.getElementById('hiwWaveform');
  const demoWaveform = document.getElementById('demoWaveform');

  let demoTimeout = null;

  // ── Sticky Navbar ─────────────────────────────────────────
  function handleScroll() {
    if (window.scrollY > 40) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', handleScroll, { passive: true });
  handleScroll();

  // ── Mobile Menu ───────────────────────────────────────────
  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
    document.body.classList.toggle('modal-open');
  });

  // Close mobile menu when a link is clicked
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('active');
      mobileMenu.classList.remove('active');
      document.body.classList.remove('modal-open');
    });
  });

  // ── Smooth Scroll ─────────────────────────────────────────
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = navbar.offsetHeight + 20;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  // ── Waveform Bars Generation ──────────────────────────────
  function generateWaveformBars(container, count, className) {
    if (!container) return;
    container.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const bar = document.createElement('span');
      bar.className = className || '';
      bar.style.animationDelay = `${i * 0.08}s`;
      const h = Math.random() * 70 + 30;
      bar.style.height = h + '%';
      container.appendChild(bar);
    }
  }

  generateWaveformBars(hiwWaveform, 40, 'hiw-waveform-bar');


  // ═══════════════════════════════════════════════════════════
  // DEMO MODAL
  // ═══════════════════════════════════════════════════════════

  function openDemo() {
    demoOverlay.classList.add('active');
    document.body.classList.add('modal-open');
    resetDemo();
    startDemoAnimation();
  }

  function closeDemo() {
    demoOverlay.classList.remove('active');
    document.body.classList.remove('modal-open');
    clearTimeout(demoTimeout);
  }

  function resetDemo() {
    clearTimeout(demoTimeout);
    demoFill.style.width = '0%';
    demoSteps.forEach((s, i) => {
      s.classList.remove('active', 'completed');
      if (i === 0) s.classList.add('active');
    });
    demoStages.forEach(s => s.classList.remove('active'));
    demoStages[0].classList.add('active');
  }

  function setDemoStep(stepIndex) {
    // Update progress dots
    demoSteps.forEach((s, i) => {
      s.classList.remove('active', 'completed');
      if (i < stepIndex) s.classList.add('completed');
      if (i === stepIndex) s.classList.add('active');
    });

    // Update progress bar
    const pct = (stepIndex / (demoSteps.length - 1)) * 100;
    demoFill.style.width = pct + '%';

    // Show corresponding stage
    demoStages.forEach(s => s.classList.remove('active'));
    if (demoStages[stepIndex]) {
      demoStages[stepIndex].classList.add('active');
    }
  }

  function startDemoAnimation() {
    setDemoStep(0);

    // Generate demo waveform bars
    generateWaveformBars(demoWaveform, 30, '');
    demoWaveform.querySelectorAll('span').forEach((bar, i) => {
      bar.style.width = '3px';
      bar.style.borderRadius = '2px';
      bar.style.background = '#ef4444';
      bar.style.animationDelay = `${i * 0.06}s`;
      bar.style.animation = 'waveform 1.2s ease-in-out infinite';
      bar.style.height = (Math.random() * 70 + 30) + '%';
    });

    demoTimeout = setTimeout(() => {
      setDemoStep(1);
      demoTimeout = setTimeout(() => {
        setDemoStep(2);
        demoTimeout = setTimeout(() => {
          setDemoStep(3);
        }, 2500);
      }, 3000);
    }, 2000);
  }

  // Event listeners
  if (watchDemoBtn) watchDemoBtn.addEventListener('click', openDemo);
  if (demoClose) demoClose.addEventListener('click', closeDemo);
  if (demoReplay) demoReplay.addEventListener('click', () => {
    resetDemo();
    startDemoAnimation();
  });

  // Close on overlay click
  demoOverlay.addEventListener('click', (e) => {
    if (e.target === demoOverlay) closeDemo();
  });

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && demoOverlay.classList.contains('active')) {
      closeDemo();
    }
  });


  // ═══════════════════════════════════════════════════════════
  // SCROLL ANIMATIONS (Intersection Observer)
  // ═══════════════════════════════════════════════════════════
  const revealElements = document.querySelectorAll('.reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -40px 0px'
  });

  revealElements.forEach(el => revealObserver.observe(el));


  // ═══════════════════════════════════════════════════════════
  // STAT COUNTER ANIMATION
  // ═══════════════════════════════════════════════════════════
  const statNumbers = document.querySelectorAll('.stat-number[data-target]');
  let statsAnimated = false;

  const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !statsAnimated) {
        statsAnimated = true;
        animateStats();
        statsObserver.disconnect();
      }
    });
  }, { threshold: 0.3 });

  const statsSection = document.getElementById('statistics');
  if (statsSection) statsObserver.observe(statsSection);

  function animateStats() {
    statNumbers.forEach(el => {
      const target = parseFloat(el.getAttribute('data-target'));
      const suffix = el.getAttribute('data-suffix') || '';
      const isDecimal = el.getAttribute('data-decimal') === 'true';
      const duration = 2000;
      const startTime = performance.now();

      function update(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        let current = eased * target;

        if (isDecimal) {
          el.textContent = current.toFixed(1) + suffix;
        } else if (target >= 1000) {
          el.textContent = Math.floor(current).toLocaleString() + suffix;
        } else {
          el.textContent = Math.floor(current) + suffix;
        }

        if (progress < 1) {
          requestAnimationFrame(update);
        }
      }

      requestAnimationFrame(update);
    });
  }

});
