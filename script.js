/* ═══════════════════════════════════════
   Undangan Digital — Fauzi & Firna
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
        AOS.init({ duration: 1200, easing: 'ease-out-quart', once: false, mirror: true, offset: 120 });
      }
      createParticles();
    }, 2200);
  });

  // ─── WELCOME COVER ────────────────────
  // Read guest name from URL param: ?to=Nama+Tamu
  const urlParams = new URLSearchParams(window.location.search);
  const guestParam = urlParams.get('to');
  const previewMode = urlParams.get('preview');
  if (guestParam) {
    const guestEl = document.getElementById('guest-name');
    if (guestEl) guestEl.textContent = decodeURIComponent(guestParam);
  }

  // Block scrolling until invitation is opened
  document.body.style.overflow = 'hidden';

  const btnOpen = document.getElementById('btn-open-invitation');
  const welcomeCover = document.getElementById('welcome-cover');
  const bgMusic = document.getElementById('bg-music');
  const musicBtn = document.getElementById('music-toggle');
  let isPlaying = false;
  let hasInteracted = false;

  if (btnOpen && welcomeCover) {
    btnOpen.addEventListener('click', () => {
      welcomeCover.classList.add('hidden');
      document.body.style.overflow = '';

      // Auto-play music on cover open
      if (bgMusic) {
        bgMusic.volume = 0;
        bgMusic.play().then(() => {
          // Fade in music
          let vol = 0;
          const fadeIn = setInterval(() => {
            vol = Math.min(vol + 0.05, 0.5);
            bgMusic.volume = vol;
            if (vol >= 0.5) clearInterval(fadeIn);
          }, 150);
          // Update music button
          const musicToggle = document.getElementById('music-toggle');
          if (musicToggle) musicToggle.classList.add('playing');
        }).catch(() => {});
      }

      // Trigger AOS refresh so animations fire fresh
      setTimeout(() => {
        if (typeof AOS !== 'undefined') AOS.refresh();
      }, 600);
    });
  }

  if ((previewMode === 'open' || previewMode === 'gallery') && welcomeCover) {
    welcomeCover.classList.add('hidden');
    document.body.style.overflow = '';
    setTimeout(() => {
      if (typeof AOS !== 'undefined') AOS.refresh();
      if (previewMode === 'gallery') {
        document.getElementById('gallery')?.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 700);
  }

  // ─── NAVBAR ────────────────────────────
  const navbar = document.getElementById('navbar');
  const hamburger = document.getElementById('nav-hamburger');
  const navLinks = document.getElementById('nav-links');
  const allNavLinks = document.querySelectorAll('.nav-link');

  window.addEventListener('scroll', () => {
    // Navbar effect
    if (window.scrollY > 60) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    // Scroll progress bar
    const winScroll = document.body.scrollTop || document.documentElement.scrollTop;
    const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const scrolled = (winScroll / height) * 100;
    const progressBar = document.getElementById('scroll-progress');
    if (progressBar) progressBar.style.width = scrolled + '%';
    
    // Back to top button
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
      if (window.scrollY > 500) {
        backToTopBtn.classList.add('show');
      } else {
        backToTopBtn.classList.remove('show');
      }
    }
    
    updateActiveNav();
  });

  // Back to top click handler
  const backToTopBtn = document.getElementById('back-to-top');
  if (backToTopBtn) {
    backToTopBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

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

  // ─── MUSIC TOGGLE ──────────────────────
  // (bgMusic and musicBtn are declared above alongside Welcome Cover)

  function playMusic() {
    if (!isPlaying && bgMusic) {
      bgMusic.play().then(() => {
        isPlaying = true;
        if (musicBtn) musicBtn.classList.add('playing');
      }).catch(() => { });
    }
  }

  if (musicBtn && bgMusic) {
    musicBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      hasInteracted = true;
      
      if (isPlaying) {
        bgMusic.pause();
        musicBtn.classList.remove('playing');
        isPlaying = false;
      } else {
        bgMusic.play().catch(() => { });
        musicBtn.classList.add('playing');
        isPlaying = true;
      }
    });
  }

  // ─── GALLERY LIGHTBOX ─────────────────
  const lightbox = document.getElementById('lightbox');
  const lightboxImg = document.getElementById('lightbox-img');
  const lightboxClose = document.getElementById('lightbox-close');
  const lightboxPrev = document.getElementById('lightbox-prev');
  const lightboxNext = document.getElementById('lightbox-next');
  const lightboxCaption = document.getElementById('lightbox-caption');
  const lightboxCounter = document.getElementById('lightbox-counter');
  const galleryItems = document.querySelectorAll('.gallery-item');
  let currentGalleryIndex = 0;
  const gallerySrcs = [];
  let lightboxTouchStartX = 0;
  let lightboxTouchEndX = 0;

  galleryItems.forEach((item, index) => {
    const img = item.querySelector('img');
    if (img) {
      gallerySrcs.push({
        src: img.src,
        alt: img.alt || `Gallery ${index + 1}`
      });
      if (img.complete) item.classList.add('is-loaded');
      img.addEventListener('load', () => item.classList.add('is-loaded'), { once: true });
      item.addEventListener('click', () => {
        currentGalleryIndex = index;
        openLightbox(index);
      });
    }
  });

  function renderLightbox(index) {
    const currentItem = gallerySrcs[index];
    if (!currentItem) return;
    if (lightboxImg) {
      lightboxImg.src = currentItem.src;
      lightboxImg.alt = currentItem.alt;
    }
    if (lightboxCaption) lightboxCaption.textContent = currentItem.alt;
    if (lightboxCounter) lightboxCounter.textContent = `${index + 1} / ${gallerySrcs.length}`;
  }

  function openLightbox(index) {
    renderLightbox(index);
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
      renderLightbox(currentGalleryIndex);
    });
  }

  if (lightboxNext) {
    lightboxNext.addEventListener('click', (e) => {
      e.stopPropagation();
      currentGalleryIndex = (currentGalleryIndex + 1) % gallerySrcs.length;
      renderLightbox(currentGalleryIndex);
    });
  }

  if (lightbox) {
    lightbox.addEventListener('touchstart', (e) => {
      lightboxTouchStartX = e.changedTouches[0].clientX;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
      lightboxTouchEndX = e.changedTouches[0].clientX;
      const deltaX = lightboxTouchEndX - lightboxTouchStartX;
      if (Math.abs(deltaX) < 40) return;
      if (deltaX > 0 && lightboxPrev) lightboxPrev.click();
      if (deltaX < 0 && lightboxNext) lightboxNext.click();
    }, { passive: true });
  }

  // Keyboard navigation for lightbox
  document.addEventListener('keydown', (e) => {
    if (videoModal && videoModal.classList.contains('active') && e.key === 'Escape') {
      closeVideoModal();
    }
    if (!lightbox || !lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && lightboxPrev) lightboxPrev.click();
    if (e.key === 'ArrowRight' && lightboxNext) lightboxNext.click();
  });

  // ─── PREWEDDING VIDEO MODAL ─────────────────────────────
  const videoModal = document.getElementById('video-modal');
  const videoModalBody = document.getElementById('video-modal-body');
  const videoModalTitle = document.getElementById('video-modal-title');
  const videoModalClose = document.getElementById('video-modal-close');
  const cinemaCards = document.querySelectorAll('.cinema-card');

  function normalizeYoutubeUrl(url) {
    if (!url) return '';
    if (url.includes('/embed/')) return url;

    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.hostname.includes('youtu.be')) {
        const videoId = parsedUrl.pathname.replace('/', '');
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
      }
      const videoId = parsedUrl.searchParams.get('v');
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`;
      }
    } catch (error) {
      return url;
    }

    return url;
  }

  function openVideoModal({ title, type, src }) {
    if (!videoModal || !videoModalBody || !videoModalTitle) return;
    videoModalTitle.textContent = title || 'Prewedding Video';

    if (!src) {
      videoModalBody.innerHTML = `
        <div class="video-empty-state">
          <div>
            <strong>Video siap dipasang</strong>
            Tempel URL YouTube atau path file MP4 lokal pada atribut <code>data-video-src</code> di kartu ini,
            lalu modal akan langsung memutar video secara otomatis.
          </div>
        </div>
      `;
    } else if (type === 'mp4') {
      videoModalBody.innerHTML = `
        <div class="video-embed-shell">
          <video controls autoplay playsinline preload="metadata">
            <source src="${src}" type="video/mp4">
          </video>
        </div>
      `;
    } else {
      const embedUrl = normalizeYoutubeUrl(src);
      videoModalBody.innerHTML = `
        <div class="video-embed-shell">
          <iframe
            src="${embedUrl}"
            title="${title || 'Prewedding Video'}"
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
      `;
    }

    videoModal.classList.add('active');
    videoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    if (!videoModal || !videoModalBody) return;
    videoModal.classList.remove('active');
    videoModal.setAttribute('aria-hidden', 'true');
    videoModalBody.innerHTML = '';
    document.body.style.overflow = '';
  }

  cinemaCards.forEach((card) => {
    card.addEventListener('click', () => {
      openVideoModal({
        title: card.dataset.videoTitle,
        type: card.dataset.videoType,
        src: card.dataset.videoSrc
      });
    });
  });

  if (videoModalClose) videoModalClose.addEventListener('click', closeVideoModal);
  if (videoModal) {
    videoModal.addEventListener('click', (e) => {
      if (e.target === videoModal || e.target.classList.contains('video-modal-backdrop')) {
        closeVideoModal();
      }
    });
  }

  // ─── RSVP FORM (BACKEND API) ────────────
  const rsvpForm = document.getElementById('rsvp-form');
  const rsvpSuccess = document.getElementById('rsvp-success');
  const wishesList = document.getElementById('wishes-list');

  // Load approved wishes from backend
  loadWishes();

  if (rsvpForm) {
    rsvpForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitBtn = rsvpForm.querySelector('.btn-rsvp');
      if (submitBtn) submitBtn.classList.add('loading');

      const name = document.getElementById('rsvp-name').value.trim();
      const attendance = document.getElementById('rsvp-attend').value;
      const guests = document.getElementById('rsvp-guests').value;
      const message = document.getElementById('rsvp-message').value.trim();

      if (!name || !attendance) {
        if (submitBtn) submitBtn.classList.remove('loading');
        return;
      }

      try {
        const res = await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, attendance, guests: parseInt(guests) || 1, message })
        });
        const data = await res.json();

        if (data.success) {
          rsvpForm.style.display = 'none';
          if (rsvpSuccess) rsvpSuccess.style.display = 'block';
          loadWishes();

          setTimeout(() => {
            rsvpForm.reset();
            rsvpForm.style.display = 'block';
            if (rsvpSuccess) rsvpSuccess.style.display = 'none';
          }, 4000);
        }
      } catch (err) {
        // Fallback for demo
        rsvpForm.style.display = 'none';
        if (rsvpSuccess) rsvpSuccess.style.display = 'block';
      } finally {
        if (submitBtn) submitBtn.classList.remove('loading');
      }
    });
  }

  async function loadWishes() {
    if (!wishesList) return;
    try {
      const res = await fetch('/api/wishes');
      const wishes = await res.json();

      if (wishes.length === 0) {
        wishesList.innerHTML = '<p style="text-align:center;color:var(--text-muted);font-size:.85rem;">Belum ada ucapan.</p>';
        return;
      }

      wishesList.innerHTML = wishes.map(w => `
        <div class="wish-card">
          <p class="wish-name">${escapeHtml(w.name)} <span style="font-weight:400;color:var(--text-muted);font-size:.75rem">${w.attendance === 'hadir' ? '• Hadir' : '• Tidak Hadir'}</span></p>
          <p class="wish-text">${escapeHtml(w.message)}</p>
          <p class="wish-time">${w.created_at}</p>
        </div>
      `).join('');
    } catch (err) {
      // Fallback if server not running
      wishesList.innerHTML = '';
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ─── FLOATING PARTICLES (GOLD DUST) ──
  function createParticles() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    
    container.innerHTML = ''; // Clear existing
    
    const particleCount = window.innerWidth < 768 ? 20 : 40;
    
    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement('div');
      const size = Math.random() * 3 + 1;
      const duration = Math.random() * 15 + 10;
      const delay = Math.random() * 5;
      
      particle.style.cssText = `
        position:absolute;
        width:${size}px;
        height:${size}px;
        background: radial-gradient(circle, var(--gold-light), transparent);
        box-shadow: 0 0 10px var(--gold-light);
        border-radius:50%;
        left:${Math.random() * 100}%;
        top:${Math.random() * 100}%;
        opacity:${Math.random() * 0.5 + 0.2};
        animation:floatGoldDust ${duration}s linear infinite;
        animation-delay:-${delay}s;
      `;
      container.appendChild(particle);
    }

    if (!document.getElementById('particle-style')) {
      const style = document.createElement('style');
      style.id = 'particle-style';
      style.textContent = `
        @keyframes floatGoldDust {
          0% { transform: translateY(0) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translateY(-100vh) translateX(${Math.random() * 100 - 50}px) rotate(360deg); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }
  }

  // ─── PARALLAX ENHANCED ────────────────
  window.addEventListener('scroll', () => {
    const scrollY = window.scrollY;
    
    // Hero Parallax
    const heroBg = document.querySelector('.hero-bg');
    if (heroBg) heroBg.style.transform = `scale(1.05) translateY(${scrollY * 0.4}px)`;
    
    // RSVP Parallax
    const rsvpSection = document.getElementById('rsvp');
    const rsvpBg = document.querySelector('.rsvp-bg');
    if (rsvpSection && rsvpBg) {
      const sectionTop = rsvpSection.offsetTop;
      const sectionHeight = rsvpSection.offsetHeight;
      if (scrollY > sectionTop - window.innerHeight && scrollY < sectionTop + sectionHeight) {
        const relativeScroll = scrollY - (sectionTop - window.innerHeight);
        rsvpBg.style.transform = `scale(1.1) translateY(${relativeScroll * 0.15}px)`;
      }
    }

    // Gallery and cinema parallax
    document.querySelectorAll('.gallery-item-frame, .cinema-card').forEach((element) => {
      const rect = element.getBoundingClientRect();
      const viewportCenter = window.innerHeight / 2;
      if (rect.bottom > 0 && rect.top < window.innerHeight) {
        const offset = (rect.top + rect.height / 2 - viewportCenter) * -0.012;
        element.style.setProperty('--parallax-offset', `${offset}px`);
      } else {
        element.style.setProperty('--parallax-offset', '0px');
      }
    });
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

  document.querySelectorAll('.glass-card, .event-card, .gift-card, .parent-box, .reveal-luxury').forEach(el => {
    revealObserver.observe(el);
  });

  document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    if (img.complete) {
      img.closest('.gallery-item')?.classList.add('is-loaded');
      return;
    }
    img.addEventListener('load', () => {
      img.closest('.gallery-item')?.classList.add('is-loaded');
    }, { once: true });
  });

  // ─── COPY TO CLIPBOARD (GIFT) ─────────
  window.copyToClipboard = function(elementId, btnElement) {
    const textToCopy = document.getElementById(elementId).innerText;
    
    // Create temporary textarea
    const tempTextArea = document.createElement("textarea");
    tempTextArea.value = textToCopy;
    document.body.appendChild(tempTextArea);
    tempTextArea.select();
    tempTextArea.setSelectionRange(0, 99999); // For mobile devices
    
    try {
      document.execCommand("copy");
      
      // Show toast notification
      const toast = document.getElementById("copy-toast");
      if (toast) {
        toast.classList.add("show");
        setTimeout(() => {
          toast.classList.remove("show");
        }, 3000);
      }
      
      // Change button text temporarily
      const originalHtml = btnElement.innerHTML;
      btnElement.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
      setTimeout(() => {
        btnElement.innerHTML = originalHtml;
      }, 3000);
      
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
    
    document.body.removeChild(tempTextArea);
  };

})();
