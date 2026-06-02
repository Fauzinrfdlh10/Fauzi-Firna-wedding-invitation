/* Premium Wedding Invitation Script */

(function () {
  'use strict';

  const WEDDING_DATE = new Date('2026-08-20T08:00:00+07:00');
  const urlParams = new URLSearchParams(window.location.search);
  const guestToken = urlParams.get('g') || '';
  const guestParam = urlParams.get('to');
  const previewMode = urlParams.get('preview');
  const analyticsSessionKey = 'wedding_invitation_session';
  const analyticsSession = localStorage.getItem(analyticsSessionKey) || `session-${Math.random().toString(16).slice(2)}`;
  localStorage.setItem(analyticsSessionKey, analyticsSession);

  let activeGuest = null;
  let currentGalleryIndex = 0;
  let galleryItemsData = [];

  const dom = {
    loader: document.getElementById('loading-screen'),
    welcomeCover: document.getElementById('welcome-cover'),
    guestName: document.getElementById('guest-name'),
    openBtn: document.getElementById('btn-open-invitation'),
    bgMusic: document.getElementById('bg-music'),
    musicToggle: document.getElementById('music-toggle'),
    navbar: document.getElementById('navbar'),
    navHamburger: document.getElementById('nav-hamburger'),
    navLinks: document.getElementById('nav-links'),
    navLinkItems: document.querySelectorAll('.nav-link'),
    backToTop: document.getElementById('back-to-top'),
    scrollProgress: document.getElementById('scroll-progress'),
    countdownEnded: document.getElementById('countdown-ended'),
    heroParticles: document.getElementById('hero-particles'),
    lightbox: document.getElementById('lightbox'),
    lightboxImg: document.getElementById('lightbox-img'),
    lightboxClose: document.getElementById('lightbox-close'),
    lightboxPrev: document.getElementById('lightbox-prev'),
    lightboxNext: document.getElementById('lightbox-next'),
    lightboxCounter: document.getElementById('lightbox-counter'),
    lightboxCaption: document.getElementById('lightbox-caption'),
    videoModal: document.getElementById('video-modal'),
    videoModalBody: document.getElementById('video-modal-body'),
    videoModalTitle: document.getElementById('video-modal-title'),
    videoModalClose: document.getElementById('video-modal-close'),
    rsvpForm: document.getElementById('rsvp-form'),
    rsvpSuccess: document.getElementById('rsvp-success'),
    wishesList: document.getElementById('wishes-list'),
    guestPass: document.getElementById('guest-pass'),
    guestPassName: document.getElementById('guest-pass-name'),
    guestPassMeta: document.getElementById('guest-pass-meta'),
    guestPassQuota: document.getElementById('guest-pass-quota'),
    guestQrCard: document.getElementById('guest-qr-card'),
    guestQrImage: document.getElementById('guest-qr-image'),
    photoUploadForm: document.getElementById('photo-upload-form'),
    photoWallGrid: document.getElementById('photo-wall-grid'),
    photoWallEmpty: document.getElementById('photo-wall-empty'),
    photoPreview: document.getElementById('photo-preview'),
    photoPreviewImage: document.getElementById('photo-preview-image'),
    photoUploadFeedback: document.getElementById('photo-upload-feedback'),
    photoFileInput: document.getElementById('photo-file')
  };

  if (guestParam && dom.guestName) {
    dom.guestName.textContent = decodeURIComponent(guestParam);
  }

  document.body.style.overflow = 'hidden';

  window.addEventListener('load', () => {
    setTimeout(() => {
      dom.loader?.classList.add('hidden');
      if (typeof AOS !== 'undefined') {
        AOS.init({
          duration: 1200,
          easing: 'ease-out-quart',
          once: false,
          mirror: true,
          offset: 120
        });
      }
      createParticles();
      updateCountdown();
      setInterval(updateCountdown, 1000);
    }, 2200);
  });

  hydrateGuestProfile();
  recordPageView();
  initNavigation();
  initMusic();
  initWelcomeCover();
  initGalleryLightbox();
  initVideoCards();
  initRSVP();
  initPhotoWall();
  initRevealObserver();
  initParallax();
  initClipboard();

  function initWelcomeCover() {
    const openInvitation = () => {
      dom.welcomeCover?.classList.add('hidden');
      document.body.style.overflow = '';

      if (dom.bgMusic) {
        dom.bgMusic.volume = 0;
        dom.bgMusic.play().then(() => {
          let volume = 0;
          const fadeIn = setInterval(() => {
            volume = Math.min(volume + 0.05, 0.5);
            dom.bgMusic.volume = volume;
            if (volume >= 0.5) clearInterval(fadeIn);
          }, 150);
          dom.musicToggle?.classList.add('playing');
        }).catch(() => {});
      }

      setTimeout(() => {
        if (typeof AOS !== 'undefined') AOS.refresh();
      }, 600);
    };

    dom.openBtn?.addEventListener('click', openInvitation);

    if (previewMode === 'open' || previewMode === 'gallery') {
      openInvitation();
      setTimeout(() => {
        if (previewMode === 'gallery') {
          document.getElementById('gallery')?.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, 700);
    }
  }

  function initMusic() {
    dom.musicToggle?.addEventListener('click', () => {
      if (!dom.bgMusic) return;
      const isPlaying = dom.musicToggle.classList.contains('playing');
      if (isPlaying) {
        dom.bgMusic.pause();
        dom.musicToggle.classList.remove('playing');
      } else {
        dom.bgMusic.play().catch(() => {});
        dom.musicToggle.classList.add('playing');
      }
    });
  }

  async function recordPageView() {
    try {
      await fetch('/api/analytics/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: guestToken,
          path: window.location.pathname,
          source: 'invitation',
          sessionId: analyticsSession
        })
      });
    } catch (error) {
      // Ignore analytics failures
    }
  }

  async function hydrateGuestProfile() {
    if (!guestToken) return;

    try {
      const res = await fetch(`/api/guest?token=${encodeURIComponent(guestToken)}`);
      const data = await res.json();
      if (!data.guest) return;

      activeGuest = data.guest;
      if (dom.guestName) dom.guestName.textContent = activeGuest.name;
      if (dom.guestPass) dom.guestPass.style.display = 'flex';
      if (dom.guestPassName) dom.guestPassName.textContent = activeGuest.name;
      if (dom.guestPassMeta) {
        dom.guestPassMeta.textContent = `${activeGuest.category || 'Undangan'} • ${activeGuest.side || 'Umum'} • RSVP dan check-in tamu sudah dipersonalisasi untuk Anda.`;
      }
      if (dom.guestPassQuota) dom.guestPassQuota.textContent = `${activeGuest.max_guests || 1} Tamu`;
      if (dom.guestQrCard) dom.guestQrCard.style.display = 'flex';
      if (dom.guestQrImage) dom.guestQrImage.src = activeGuest.qr_svg_url;

      setValue('rsvp-name', activeGuest.name || '');
      setValue('rsvp-phone', activeGuest.phone || '');
      setValue('rsvp-relation', activeGuest.category || '');
      setValue('photo-guest-name', activeGuest.name || '');

      const guestCount = document.getElementById('rsvp-guests');
      if (guestCount) {
        guestCount.max = activeGuest.max_guests || 1;
        guestCount.value = Math.min(parseInt(guestCount.value || '1', 10), activeGuest.max_guests || 1);
      }
    } catch (error) {
      // Preserve default guest flow if API fails
    }
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value;
  }

  function initNavigation() {
    dom.navHamburger?.addEventListener('click', () => {
      dom.navHamburger.classList.toggle('open');
      dom.navLinks?.classList.toggle('open');
    });

    dom.navLinkItems.forEach((link) => {
      link.addEventListener('click', () => {
        dom.navHamburger?.classList.remove('open');
        dom.navLinks?.classList.remove('open');
      });
    });

    dom.backToTop?.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;

      if (dom.navbar) {
        dom.navbar.classList.toggle('scrolled', scrollY > 60);
      }

      const height = document.documentElement.scrollHeight - document.documentElement.clientHeight;
      const percent = height > 0 ? (scrollY / height) * 100 : 0;
      if (dom.scrollProgress) dom.scrollProgress.style.width = `${percent}%`;
      if (dom.backToTop) dom.backToTop.classList.toggle('show', scrollY > 500);

      const sections = document.querySelectorAll('section[id]');
      let current = 'home';
      sections.forEach((section) => {
        const top = section.offsetTop - 140;
        if (scrollY >= top) current = section.id;
      });

      dom.navLinkItems.forEach((link) => {
        link.classList.toggle('active', link.getAttribute('href') === `#${current}`);
      });
    });
  }

  function updateCountdown() {
    const now = new Date();
    const diff = WEDDING_DATE - now;
    const days = document.getElementById('cd-days');
    const hours = document.getElementById('cd-hours');
    const minutes = document.getElementById('cd-minutes');
    const seconds = document.getElementById('cd-seconds');
    const wrapper = document.getElementById('countdown-wrapper');

    if (diff <= 0) {
      if (days) days.textContent = '00';
      if (hours) hours.textContent = '00';
      if (minutes) minutes.textContent = '00';
      if (seconds) seconds.textContent = '00';
      if (wrapper) wrapper.style.display = 'none';
      if (dom.countdownEnded) dom.countdownEnded.style.display = 'block';
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    if (days) days.textContent = String(d).padStart(2, '0');
    if (hours) hours.textContent = String(h).padStart(2, '0');
    if (minutes) minutes.textContent = String(m).padStart(2, '0');
    if (seconds) seconds.textContent = String(s).padStart(2, '0');
  }

  function initGalleryLightbox() {
    galleryItemsData = Array.from(document.querySelectorAll('.gallery-item')).map((item, index) => {
      const img = item.querySelector('img');
      if (img?.complete) item.classList.add('is-loaded');
      img?.addEventListener('load', () => item.classList.add('is-loaded'), { once: true });

      item.addEventListener('click', () => {
        currentGalleryIndex = index;
        renderLightbox();
        dom.lightbox?.classList.add('active');
        document.body.style.overflow = 'hidden';
      });

      return {
        src: img?.src || '',
        alt: img?.alt || `Gallery ${index + 1}`
      };
    });

    dom.lightboxClose?.addEventListener('click', closeLightbox);
    dom.lightbox?.addEventListener('click', (event) => {
      if (event.target === dom.lightbox || event.target.classList.contains('lightbox-backdrop')) {
        closeLightbox();
      }
    });
    dom.lightboxPrev?.addEventListener('click', (event) => {
      event.stopPropagation();
      currentGalleryIndex = (currentGalleryIndex - 1 + galleryItemsData.length) % galleryItemsData.length;
      renderLightbox();
    });
    dom.lightboxNext?.addEventListener('click', (event) => {
      event.stopPropagation();
      currentGalleryIndex = (currentGalleryIndex + 1) % galleryItemsData.length;
      renderLightbox();
    });

    let touchStartX = 0;
    dom.lightbox?.addEventListener('touchstart', (event) => {
      touchStartX = event.changedTouches[0].clientX;
    }, { passive: true });
    dom.lightbox?.addEventListener('touchend', (event) => {
      const deltaX = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(deltaX) < 40) return;
      if (deltaX > 0) dom.lightboxPrev?.click();
      if (deltaX < 0) dom.lightboxNext?.click();
    }, { passive: true });

    document.addEventListener('keydown', (event) => {
      if (dom.videoModal?.classList.contains('active') && event.key === 'Escape') {
        closeVideoModal();
      }
      if (!dom.lightbox?.classList.contains('active')) return;
      if (event.key === 'Escape') closeLightbox();
      if (event.key === 'ArrowLeft') dom.lightboxPrev?.click();
      if (event.key === 'ArrowRight') dom.lightboxNext?.click();
    });
  }

  function renderLightbox() {
    const current = galleryItemsData[currentGalleryIndex];
    if (!current) return;
    if (dom.lightboxImg) {
      dom.lightboxImg.src = current.src;
      dom.lightboxImg.alt = current.alt;
    }
    if (dom.lightboxCounter) dom.lightboxCounter.textContent = `${currentGalleryIndex + 1} / ${galleryItemsData.length}`;
    if (dom.lightboxCaption) dom.lightboxCaption.textContent = current.alt;
  }

  function closeLightbox() {
    dom.lightbox?.classList.remove('active');
    document.body.style.overflow = dom.videoModal?.classList.contains('active') ? 'hidden' : '';
  }

  function initVideoCards() {
    document.querySelectorAll('.cinema-card').forEach((card) => {
      card.addEventListener('click', () => {
        openVideoModal({
          title: card.dataset.videoTitle,
          type: card.dataset.videoType,
          src: card.dataset.videoSrc
        });
      });
    });

    dom.videoModalClose?.addEventListener('click', closeVideoModal);
    dom.videoModal?.addEventListener('click', (event) => {
      if (event.target === dom.videoModal || event.target.classList.contains('video-modal-backdrop')) {
        closeVideoModal();
      }
    });
  }

  function normalizeYoutubeUrl(url) {
    if (!url) return '';
    if (url.includes('/embed/')) return url;

    try {
      const parsed = new URL(url);
      if (parsed.hostname.includes('youtu.be')) {
        const id = parsed.pathname.replace('/', '');
        return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
      }
      const id = parsed.searchParams.get('v');
      if (id) return `https://www.youtube.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
    } catch (error) {
      return url;
    }

    return url;
  }

  function openVideoModal({ title, type, src }) {
    if (!dom.videoModal || !dom.videoModalBody || !dom.videoModalTitle) return;
    dom.videoModalTitle.textContent = title || 'Prewedding Video';

    if (!src) {
      dom.videoModalBody.innerHTML = `
        <div class="video-empty-state">
          <div>
            <strong>Video siap dipasang</strong>
            Tempel URL YouTube atau path file MP4 lokal pada atribut <code>data-video-src</code> di kartu ini,
            lalu modal akan langsung memutar video secara otomatis.
          </div>
        </div>
      `;
    } else if (type === 'mp4') {
      dom.videoModalBody.innerHTML = `
        <div class="video-embed-shell">
          <video controls autoplay playsinline preload="metadata">
            <source src="${src}" type="video/mp4">
          </video>
        </div>
      `;
    } else {
      dom.videoModalBody.innerHTML = `
        <div class="video-embed-shell">
          <iframe
            src="${normalizeYoutubeUrl(src)}"
            title="${title || 'Prewedding Video'}"
            loading="lazy"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen>
          </iframe>
        </div>
      `;
    }

    dom.videoModal.classList.add('active');
    dom.videoModal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeVideoModal() {
    if (!dom.videoModal || !dom.videoModalBody) return;
    dom.videoModal.classList.remove('active');
    dom.videoModal.setAttribute('aria-hidden', 'true');
    dom.videoModalBody.innerHTML = '';
    document.body.style.overflow = dom.lightbox?.classList.contains('active') ? 'hidden' : '';
  }

  function initRSVP() {
    loadWishes();

    dom.rsvpForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = dom.rsvpForm.querySelector('.btn-rsvp');
      submitBtn?.classList.add('loading');

      const payload = {
        guestToken,
        name: getInputValue('rsvp-name'),
        phone: getInputValue('rsvp-phone'),
        relation: getInputValue('rsvp-relation'),
        attendance: getInputValue('rsvp-attend'),
        guests: parseInt(getInputValue('rsvp-guests') || '1', 10) || 1,
        mealPreference: getInputValue('rsvp-meal'),
        message: getInputValue('rsvp-message')
      };

      if (!payload.name || !payload.attendance) {
        submitBtn?.classList.remove('loading');
        return;
      }

      try {
        const res = await fetch('/api/rsvp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'RSVP gagal dikirim.');

        if (data.guest) {
          activeGuest = data.guest;
          if (dom.guestQrCard) dom.guestQrCard.style.display = 'flex';
          if (dom.guestQrImage) dom.guestQrImage.src = data.guest.qr_svg_url;
        }

        dom.rsvpForm.style.display = 'none';
        if (dom.rsvpSuccess) dom.rsvpSuccess.style.display = 'block';
        loadWishes();

        setTimeout(() => {
          dom.rsvpForm.reset();
          if (activeGuest) {
            setValue('rsvp-name', activeGuest.name || '');
            setValue('rsvp-phone', activeGuest.phone || '');
            setValue('rsvp-relation', activeGuest.category || '');
          }
          dom.rsvpForm.style.display = 'block';
          if (dom.rsvpSuccess) dom.rsvpSuccess.style.display = 'none';
        }, 4500);
      } catch (error) {
        dom.rsvpForm.style.display = 'none';
        if (dom.rsvpSuccess) dom.rsvpSuccess.style.display = 'block';
      } finally {
        submitBtn?.classList.remove('loading');
      }
    });
  }

  async function loadWishes() {
    if (!dom.wishesList) return;

    try {
      const res = await fetch('/api/wishes');
      const wishes = await res.json();

      if (!wishes.length) {
        dom.wishesList.innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-muted);font-size:.85rem;">Belum ada ucapan.</p>';
        return;
      }

      dom.wishesList.innerHTML = wishes.map((wish) => `
        <div class="wish-card">
          <p class="wish-name">${escapeHtml(wish.name)} <span style="font-weight:400;color:var(--text-muted);font-size:.75rem">${wish.attendance === 'hadir' ? '• Hadir' : '• Tidak Hadir'}</span></p>
          <p class="wish-text">${escapeHtml(wish.message)}</p>
          ${wish.meal_preference ? `<p class="wish-time">Preferensi: ${escapeHtml(wish.meal_preference)}</p>` : ''}
          <p class="wish-time">${wish.created_at}</p>
        </div>
      `).join('');
    } catch (error) {
      dom.wishesList.innerHTML = '';
    }
  }

  function initPhotoWall() {
    loadPhotoWall();

    dom.photoFileInput?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      if (!file) {
        if (dom.photoPreview) dom.photoPreview.style.display = 'none';
        return;
      }

      const dataUrl = await fileToDataUrl(file);
      if (dom.photoPreview && dom.photoPreviewImage) {
        dom.photoPreviewImage.src = dataUrl;
        dom.photoPreview.style.display = 'block';
      }
    });

    dom.photoUploadForm?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const submitBtn = dom.photoUploadForm.querySelector('.btn-rsvp');
      const file = dom.photoFileInput?.files?.[0];
      if (!file) return;

      submitBtn?.classList.add('loading');
      if (dom.photoUploadFeedback) dom.photoUploadFeedback.textContent = 'Mengunggah foto...';

      try {
        const imageData = await fileToDataUrl(file);
        const res = await fetch('/api/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            guestToken,
            guestName: getInputValue('photo-guest-name') || activeGuest?.name || '',
            caption: getInputValue('photo-caption'),
            imageData,
            mimeType: file.type
          })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Gagal mengunggah foto.');

        if (dom.photoUploadFeedback) dom.photoUploadFeedback.textContent = 'Foto berhasil ditambahkan ke live photo wall.';
        dom.photoUploadForm.reset();
        if (activeGuest) setValue('photo-guest-name', activeGuest.name || '');
        if (dom.photoPreview) dom.photoPreview.style.display = 'none';
        loadPhotoWall();
      } catch (error) {
        if (dom.photoUploadFeedback) dom.photoUploadFeedback.textContent = error.message || 'Gagal mengunggah foto.';
      } finally {
        submitBtn?.classList.remove('loading');
      }
    });
  }

  async function loadPhotoWall() {
    if (!dom.photoWallGrid) return;

    try {
      const res = await fetch('/api/photos');
      const photos = await res.json();

      if (!photos.length) {
        dom.photoWallGrid.innerHTML = '';
        if (dom.photoWallEmpty) dom.photoWallEmpty.style.display = 'block';
        return;
      }

      if (dom.photoWallEmpty) dom.photoWallEmpty.style.display = 'none';
      dom.photoWallGrid.innerHTML = photos.map((photo) => `
        <article class="photo-wall-item">
          <img src="${photo.image_url}" alt="${escapeHtml(photo.caption || photo.guest_name)}" loading="lazy">
          <strong>${escapeHtml(photo.guest_name)}</strong>
          ${photo.caption ? `<p>${escapeHtml(photo.caption)}</p>` : ''}
          <span>${escapeHtml(photo.created_at)}</span>
        </article>
      `).join('');
    } catch (error) {
      dom.photoWallGrid.innerHTML = '';
      if (dom.photoWallEmpty) dom.photoWallEmpty.style.display = 'block';
    }
  }

  function initRevealObserver() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) entry.target.classList.add('revealed');
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.glass-card, .event-card, .gift-card, .parent-box, .reveal-luxury').forEach((element) => {
      observer.observe(element);
    });

    document.querySelectorAll('img[loading="lazy"]').forEach((img) => {
      if (img.complete) img.closest('.gallery-item')?.classList.add('is-loaded');
      img.addEventListener('load', () => img.closest('.gallery-item')?.classList.add('is-loaded'), { once: true });
    });
  }

  function initParallax() {
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      const heroBg = document.querySelector('.hero-bg');
      if (heroBg) heroBg.style.transform = `scale(1.05) translateY(${scrollY * 0.4}px)`;

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

      document.querySelectorAll('.gallery-item-frame, .cinema-card').forEach((element) => {
        const rect = element.getBoundingClientRect();
        const center = window.innerHeight / 2;
        if (rect.bottom > 0 && rect.top < window.innerHeight) {
          const offset = (rect.top + rect.height / 2 - center) * -0.012;
          element.style.setProperty('--parallax-offset', `${offset}px`);
        } else {
          element.style.setProperty('--parallax-offset', '0px');
        }
      });
    });
  }

  function initClipboard() {
    window.copyToClipboard = function copyToClipboard(elementId, btnElement) {
      const textToCopy = document.getElementById(elementId)?.innerText || '';
      const tempTextArea = document.createElement('textarea');
      tempTextArea.value = textToCopy;
      document.body.appendChild(tempTextArea);
      tempTextArea.select();
      tempTextArea.setSelectionRange(0, 99999);

      try {
        document.execCommand('copy');
        const toast = document.getElementById('copy-toast');
        if (toast) {
          toast.classList.add('show');
          setTimeout(() => toast.classList.remove('show'), 3000);
        }

        const originalHtml = btnElement.innerHTML;
        btnElement.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
        setTimeout(() => {
          btnElement.innerHTML = originalHtml;
        }, 3000);
      } catch (error) {
        console.error('Failed to copy text:', error);
      }

      document.body.removeChild(tempTextArea);
    };
  }

  function createParticles() {
    if (!dom.heroParticles) return;

    dom.heroParticles.innerHTML = '';
    const particleCount = window.innerWidth < 768 ? 20 : 40;

    for (let i = 0; i < particleCount; i += 1) {
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
      dom.heroParticles.appendChild(particle);
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

  function getInputValue(id) {
    return document.getElementById(id)?.value.trim() || '';
  }

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Gagal membaca file.'));
      reader.readAsDataURL(file);
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
})();
