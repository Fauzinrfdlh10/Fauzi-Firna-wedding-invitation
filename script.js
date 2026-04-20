/* ═══════════════════════════════════════
   Undangan Digital — Adit & Vika
   Premium Wedding Invitation Script
   ═══════════════════════════════════════ */

(function () {
  'use strict';

  // ─── CONFIG ────────────────────────────
  const WEDDING_DATE = new Date('2026-08-20T08:00:00+07:00');
  const EVENT_TITLE = 'Pernikahan Fauzi & Firna';
  const EVENT_LOCATION = 'Grand Ballroom, Hotel Mulia Senayan, Jakarta';
  const EVENT_END = new Date('2026-08-20T14:00:00+07:00');

  // ─── LOADING SCREEN ───────────────────
  window.addEventListener('load', () => {
    setTimeout(() => {
      const loader = document.getElementById('loading-screen');
      if (loader) loader.classList.add('hidden');
      // Init AOS after load
      if (typeof AOS !== 'undefined') {
        AOS.init({ duration: 800, easing: 'ease-out-cubic', once: true, offset: 80 });
      }
      createParticles();
    }, 2200);
  });

  // ─── NAVBAR ────────────────────────────
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks = document.getElementById('nav-links');
  const allNavLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    updateActiveNav();
  });

  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });
  }

  allNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      hamburger.classList.remove('open');
      navLinks.classList.remove('open');
    });
  });

  function updateActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    let current = '';
    sections.forEach(section => {
      const top = section.offsetTop - 120;
      if (window.scrollY >= top) current = section.getAttribute('id');
    });
    allNavLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === '#' + current) link.classList.add('active');
    });
  }

  // ─── COUNTDOWN TIMER (REAL-TIME) ──────
  const cdDays = document.getElementById('cd-days');
  const cdHours = document.getElementById('cd-hours');
  const cdMinutes = document.getElementById('cd-minutes');
  const cdSeconds = document.getElementById('cd-seconds');
  const cdWrapper = document.getElementById('countdown-wrapper');
  const cdEnded = document.getElementById('countdown-ended');

  function updateCountdown() {
    const now = new Date().getTime();
    const target = WEDDING_DATE.getTime();
    const diff = target - now;

    if (diff <= 0) {
      // Event has started
      if (cdWrapper) cdWrapper.style.display = 'none';
      if (cdEnded) cdEnded.style.display = 'block';
      return;
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (cdDays) cdDays.textContent = String(days).padStart(2, '0');
    if (cdHours) cdHours.textContent = String(hours).padStart(2, '0');
    if (cdMinutes) cdMinutes.textContent = String(minutes).padStart(2, '0');
    if (cdSeconds) cdSeconds.textContent = String(seconds).padStart(2, '0');
  }

  // Initial call + interval every 1 second
  updateCountdown();
  setInterval(updateCountdown, 1000);

  // ─── SAVE TO CALENDAR ─────────────────
  const btnIcs = document.getElementById('btn-save-ics');
  const btnGcal = document.getElementById('btn-google-cal');

  function formatDateICS(date) {
    return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  }

  if (btnIcs) {
    btnIcs.addEventListener('click', () => {
      const start = formatDateICS(WEDDING_DATE);
      const end = formatDateICS(EVENT_END);
      const icsContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Wedding//Fauzi&Firna//ID',
        'BEGIN:VEVENT',
        'DTSTART:' + start,
        'DTEND:' + end,
        'SUMMARY:' + EVENT_TITLE,
        'LOCATION:' + EVENT_LOCATION,
        'DESCRIPTION:Anda diundang ke ' + EVENT_TITLE + ' di ' + EVENT_LOCATION,
        'STATUS:CONFIRMED',
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\r\n');

      const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Pernikahan-Fauzi-Firna.ics';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }

  if (btnGcal) {
    const startStr = '20260820T010000Z'; // 08:00 WIB = 01:00 UTC
    const endStr = '20260820T070000Z';   // 14:00 WIB = 07:00 UTC
    const gcalUrl = 'https://calendar.google.com/calendar/render?action=TEMPLATE'
      + '&text=' + encodeURIComponent(EVENT_TITLE)
      + '&dates=' + startStr + '/' + endStr
      + '&details=' + encodeURIComponent('Anda diundang ke ' + EVENT_TITLE)
      + '&location=' + encodeURIComponent(EVENT_LOCATION);
    btnGcal.href = gcalUrl;
  }

  // ─── MUSIC TOGGLE ─────────────────────
  const musicBtn = document.getElementById('music-toggle');
  const bgMusic = document.getElementById('bg-music');
  let isPlaying = false;

  if (musicBtn && bgMusic) {
    musicBtn.addEventListener('click', () => {
      if (isPlaying) {
        bgMusic.pause();
        musicBtn.classList.remove('playing');
      } else {
        bgMusic.play().catch(() => { });
        musicBtn.classList.add('playing');
      }
      isPlaying = !isPlaying;
    });
  }

  // ─── GALLERY LIGHTBOX ─────────────────
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const galleryItems = document.querySelectorAll('.gallery-item');
  let currentGalleryIndex = 0;
  const gallerySrcs = [];

  galleryItems.forEach((item, index) => {
    const img = item.querySelector('img');
    if (img) {
      gallerySrcs.push(img.src);
      item.addEventListener('click', () => {
        currentGalleryIndex = index;
        openLightbox(img.src);
      });
    }
  });

  function openLightbox(src) {
    if (lightboxImg) lightboxImg.src = src;
    if (lightbox) lightbox.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (lightbox) lightbox.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (lightboxClose) lightboxClose.addEventListener('click', closeLightbox);
  if (lightbox) lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  if (lightboxPrev) {
    lightboxPrev.addEventListener('click', (e) => {
      e.stopPropagation();
      currentGalleryIndex = (currentGalleryIndex - 1 + gallerySrcs.length) % gallerySrcs.length;
      if (lightboxImg) lightboxImg.src = gallerySrcs[currentGalleryIndex];
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', (e) => {
      e.stopPropagation();
      currentGalleryIndex = (currentGalleryIndex + 1) % gallerySrcs.length;
      if (lightboxImg) lightboxImg.src = gallerySrcs[currentGalleryIndex];
    });
  }

  // Keyboard navigation for lightbox
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && lightboxPrev) lightboxPrev.click();
    if (e.key === 'ArrowRight' && lightboxNext) lightboxNext.click();
  });

  // ─── RSVP FORM ────────────────────────
  const rsvpForm = document.getElementById('rsvp-form');
  const rsvpSuccess = document.getElementById('rsvp-success');
  const wishesList = document.getElementById('wishes-list');

  // Load saved wishes from localStorage
  let wishes = JSON.parse(localStorage.getItem('wedding_wishes') || '[]');
  renderWishes();

  if (rsvpForm) {
    rsvpForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('rsvp-name').value.trim();
      const attend = document.getElementById('rsvp-attend').value;
      const message = document.getElementById('rsvp-message').value.trim();

      if (!name || !attend) return;

      // Save wish
      if (message) {
        const wish = {
          name: name,
          text: message,
          time: new Date().toLocaleString('id-ID'),
          attend: attend
        };
        wishes.unshift(wish);
        localStorage.setItem('wedding_wishes', JSON.stringify(wishes));
        renderWishes();
      }

      // Show success
      rsvpForm.style.display = 'none';
      if (rsvpSuccess) rsvpSuccess.style.display = 'block';

      // Reset after delay
      setTimeout(() => {
        rsvpForm.reset();
        rsvpForm.style.display = 'block';
        if (rsvpSuccess) rsvpSuccess.style.display = 'none';
      }, 4000);
    });
  }

  function renderWishes() {
    if (!wishesList) return;
    wishesList.innerHTML = wishes.map(w => `
      <div class="wish-card">
        <p class="wish-name">${escapeHtml(w.name)} <span style="font-weight:400;color:var(--text-muted);font-size:.75rem">${w.attend === 'hadir' ? '• Hadir' : '• Tidak Hadir'}</span></p>
        <p class="wish-text">${escapeHtml(w.text)}</p>
        <p class="wish-time">${w.time}</p>
      </div>
    `).join('');
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── FLOATING PARTICLES ───────────────
  function createParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    for (let i = 0; i < 30; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position:absolute;
        width:${Math.random() * 4 + 1}px;
        height:${Math.random() * 4 + 1}px;
        background:rgba(200,169,97,${Math.random() * 0.4 + 0.1});
        border-radius:50%;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        animation:floatParticle ${Math.random() * 8 + 6}s ease-in-out infinite;
        animation-delay:${Math.random() * 5}s;
      `;
      container.appendChild(particle);
    }

    // Add particle animation to stylesheet
    if (!document.getElementById('particle-style')) {
      const style = document.createElement('style');
      style.id = 'particle-style';
      style.textContent = `
        @keyframes floatParticle {
          0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
          25% { transform: translate(${Math.random() > 0.5 ? '' : '-'}30px, -40px) scale(1.2); opacity: 0.7; }
          50% { transform: translate(${Math.random() > 0.5 ? '' : '-'}20px, -80px) scale(0.8); opacity: 0.5; }
          75% { transform: translate(${Math.random() > 0.5 ? '' : '-'}40px, -40px) scale(1.1); opacity: 0.6; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ─── PARALLAX EFFECT ──────────────────
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) {
      heroBg.style.transform = `scale(1.05) translateY(${scrollY * 0.3}px)`;
    }
  });

  // ─── SMOOTH REVEAL ON SCROLL ──────────
  const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
      }
    });
  }, observerOptions);

  document.querySelectorAll('.glass-card, .event-card').forEach(el => {
    revealObserver.observe(el);
  });

})();
