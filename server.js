const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');

const app = express();
const PORT = 3000;

const DATA_DIR = path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos');

const DB = {
  rsvp: path.join(DATA_DIR, 'rsvp.json'),
  guests: path.join(DATA_DIR, 'guests.json'),
  photos: path.join(DATA_DIR, 'photos.json'),
  analytics: path.join(DATA_DIR, 'analytics.json')
};

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(UPLOADS_DIR));

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });

  const defaults = {
    [DB.rsvp]: [],
    [DB.guests]: [],
    [DB.photos]: [],
    [DB.analytics]: {
      events: [],
      counters: {
        totalViews: 0,
        anonymousViews: 0
      }
    }
  };

  Object.entries(defaults).forEach(([file, value]) => {
    if (!fs.existsSync(file)) {
      fs.writeFileSync(file, JSON.stringify(value, null, 2));
    }
  });
}

function readJson(file, fallback) {
  ensureDataFiles();
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureDataFiles();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function readRsvps() {
  return readJson(DB.rsvp, []).map((entry) => ({
    is_approved: false,
    meal_preference: '',
    relation: '',
    phone: '',
    guest_id: null,
    guest_token: '',
    checked_in_at: '',
    ...entry
  }));
}

function writeRsvps(data) {
  writeJson(DB.rsvp, data);
}

function readGuests() {
  return readJson(DB.guests, []).map((guest) => ({
    phone: '',
    category: 'Undangan',
    side: 'Umum',
    notes: '',
    max_guests: 1,
    invitation_token: generateToken(),
    created_at: formatDate(),
    checked_in_at: '',
    total_views: 0,
    responded_at: '',
    last_viewed_at: '',
    ...guest
  }));
}

function writeGuests(data) {
  writeJson(DB.guests, data);
}

function readPhotos() {
  return readJson(DB.photos, []).map((photo) => ({
    caption: '',
    guest_token: '',
    guest_name: 'Tamu',
    is_approved: true,
    created_at: formatDate(),
    ...photo
  }));
}

function writePhotos(data) {
  writeJson(DB.photos, data);
}

function readAnalytics() {
  return readJson(DB.analytics, {
    events: [],
    counters: {
      totalViews: 0,
      anonymousViews: 0
    }
  });
}

function writeAnalytics(data) {
  writeJson(DB.analytics, data);
}

function formatDate(date = new Date()) {
  return date.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
}

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000);
}

function generateToken() {
  return crypto.randomBytes(8).toString('hex');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toSlug(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function findGuestByToken(token) {
  if (!token) return null;
  return readGuests().find((guest) => guest.invitation_token === token) || null;
}

function buildInvitationUrl(req, token) {
  return `${req.protocol}://${req.get('host')}/?g=${token}`;
}

function buildCheckInUrl(req, token) {
  return `${req.protocol}://${req.get('host')}/checkin/${token}`;
}

function getGuestSummary(guest, req) {
  return {
    ...guest,
    invitation_url: buildInvitationUrl(req, guest.invitation_token),
    checkin_url: buildCheckInUrl(req, guest.invitation_token),
    qr_svg_url: `/api/guests/${guest.invitation_token}/qr.svg`
  };
}

function getAnalyticsSummary() {
  const analytics = readAnalytics();
  const guests = readGuests();
  const rsvps = readRsvps();
  const photos = readPhotos();
  const approvedWishes = rsvps.filter((entry) => entry.is_approved && entry.message);
  const respondedGuestTokens = new Set(rsvps.filter((entry) => entry.guest_token).map((entry) => entry.guest_token));
  const viewedGuestTokens = new Set(
    analytics.events.filter((event) => event.token).map((event) => event.token)
  );

  const totalHadir = rsvps.filter((entry) => entry.attendance === 'hadir').length;
  const totalTidakHadir = rsvps.filter((entry) => entry.attendance === 'tidak').length;
  const totalGuestsAttending = rsvps
    .filter((entry) => entry.attendance === 'hadir')
    .reduce((sum, entry) => sum + (parseInt(entry.guests, 10) || 1), 0);
  const checkedInCount = guests.filter((guest) => guest.checked_in_at).length;
  const conversion = guests.length ? Math.round((respondedGuestTokens.size / guests.length) * 100) : 0;

  return {
    totalInvites: guests.length,
    totalRsvp: rsvps.length,
    totalHadir,
    totalTidakHadir,
    totalTamu: totalGuestsAttending,
    totalApprovedWishes: approvedWishes.length,
    totalPhotos: photos.filter((photo) => photo.is_approved).length,
    totalPhotoUploads: photos.length,
    totalCheckedIn: checkedInCount,
    totalViews: analytics.counters.totalViews || 0,
    totalAnonymousViews: analytics.counters.anonymousViews || 0,
    totalUniqueGuestsViewed: viewedGuestTokens.size,
    totalRespondedGuests: respondedGuestTokens.size,
    rsvpConversion: conversion
  };
}

function recordAnalyticsEvent({ token = '', pathName = '/', source = 'web', sessionId = '' }) {
  const analytics = readAnalytics();
  const guests = readGuests();
  const event = {
    id: generateId(),
    token,
    path: pathName,
    source,
    session_id: sessionId,
    created_at: formatDate()
  };

  analytics.events.unshift(event);
  analytics.events = analytics.events.slice(0, 1000);
  analytics.counters.totalViews = (analytics.counters.totalViews || 0) + 1;

  if (!token) {
    analytics.counters.anonymousViews = (analytics.counters.anonymousViews || 0) + 1;
  } else {
    const guestIndex = guests.findIndex((guest) => guest.invitation_token === token);
    if (guestIndex >= 0) {
      guests[guestIndex].total_views = (guests[guestIndex].total_views || 0) + 1;
      guests[guestIndex].last_viewed_at = formatDate();
      writeGuests(guests);
    }
  }

  writeAnalytics(analytics);
}

function saveBase64Image(imageData, mimeType = 'image/jpeg') {
  if (!imageData || typeof imageData !== 'string') {
    throw new Error('Gambar tidak valid.');
  }

  const matches = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  const resolvedMime = matches ? matches[1] : mimeType;
  const base64Payload = matches ? matches[2] : imageData;
  const extensionMap = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp'
  };
  const extension = extensionMap[resolvedMime] || 'jpg';
  const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}.${extension}`;
  const absolutePath = path.join(PHOTOS_DIR, filename);
  const buffer = Buffer.from(base64Payload, 'base64');

  if (buffer.length > 6 * 1024 * 1024) {
    throw new Error('Ukuran gambar terlalu besar.');
  }

  fs.writeFileSync(absolutePath, buffer);
  return `/uploads/photos/${filename}`;
}

app.get('/api/guest', async (req, res) => {
  const token = String(req.query.token || '');
  const guest = findGuestByToken(token);

  if (!guest) {
    return res.json({ guest: null });
  }

  return res.json({
    guest: getGuestSummary(guest, req)
  });
});

app.get('/api/guests/:token/qr.svg', async (req, res) => {
  const token = req.params.token;
  const guest = findGuestByToken(token);

  if (!guest) {
    return res.status(404).send('QR guest tidak ditemukan.');
  }

  const svg = await QRCode.toString(buildCheckInUrl(req, token), {
    type: 'svg',
    margin: 1,
    color: {
      dark: '#C8A961',
      light: '#0c0b09'
    }
  });

  res.type('image/svg+xml').send(svg);
});

app.post('/api/analytics/view', (req, res) => {
  const token = String(req.body.token || '');
  const pathName = String(req.body.path || '/');
  const source = String(req.body.source || 'web');
  const sessionId = String(req.body.sessionId || '');

  recordAnalyticsEvent({ token, pathName, source, sessionId });
  res.json({ success: true });
});

app.post('/api/rsvp', (req, res) => {
  const {
    guestToken = '',
    name,
    attendance,
    guests,
    message,
    mealPreference,
    relation,
    phone
  } = req.body;

  if (!name || !attendance) {
    return res.status(400).json({ error: 'Nama dan konfirmasi kehadiran wajib diisi.' });
  }

  const guestList = readGuests();
  const rsvps = readRsvps();
  const guest = guestToken ? guestList.find((item) => item.invitation_token === guestToken) : null;
  const now = formatDate();
  const maxGuests = guest ? Math.max(parseInt(guest.max_guests, 10) || 1, 1) : 5;
  const guestCount = Math.min(Math.max(parseInt(guests, 10) || 1, 1), maxGuests);

  const payload = {
    id: generateId(),
    guest_id: guest ? guest.id : null,
    guest_token: guest ? guest.invitation_token : '',
    name: String(name).trim(),
    attendance,
    guests: guestCount,
    phone: String(phone || guest?.phone || '').trim(),
    relation: String(relation || guest?.category || '').trim(),
    meal_preference: String(mealPreference || '').trim(),
    message: String(message || '').trim(),
    is_approved: String(message || '').trim().length > 0,
    created_at: now,
    updated_at: now,
    checked_in_at: ''
  };

  const existingIndex = guest
    ? rsvps.findIndex((entry) => entry.guest_token === guest.invitation_token)
    : -1;

  if (existingIndex >= 0) {
    payload.id = rsvps[existingIndex].id;
    payload.created_at = rsvps[existingIndex].created_at;
    payload.checked_in_at = rsvps[existingIndex].checked_in_at || '';
    rsvps[existingIndex] = payload;
  } else {
    rsvps.unshift(payload);
  }

  if (guest) {
    const guestIndex = guestList.findIndex((item) => item.id === guest.id);
    guestList[guestIndex] = {
      ...guestList[guestIndex],
      name: payload.name,
      phone: payload.phone || guestList[guestIndex].phone,
      responded_at: now
    };
    writeGuests(guestList);
  }

  writeRsvps(rsvps);

  return res.json({
    success: true,
    id: payload.id,
    guest: guest ? getGuestSummary(guestList.find((item) => item.id === guest.id), req) : null
  });
});

app.get('/api/wishes', (req, res) => {
  const approved = readRsvps()
    .filter((entry) => entry.is_approved && entry.message)
    .map(({ id, name, message, attendance, created_at, meal_preference }) => ({
      id,
      name,
      message,
      attendance,
      created_at,
      meal_preference
    }));

  res.json(approved);
});

app.get('/api/photos', (req, res) => {
  const photos = readPhotos()
    .filter((photo) => photo.is_approved)
    .sort((a, b) => b.id - a.id);

  res.json(photos);
});

app.post('/api/photos', (req, res) => {
  try {
    const { guestToken = '', guestName = '', caption = '', imageData = '', mimeType = 'image/jpeg' } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: 'Foto wajib diunggah.' });
    }

    const guest = guestToken ? findGuestByToken(guestToken) : null;
    const imageUrl = saveBase64Image(imageData, mimeType);
    const photos = readPhotos();
    const photo = {
      id: generateId(),
      guest_token: guest?.invitation_token || '',
      guest_name: String(guestName || guest?.name || 'Tamu').trim(),
      caption: String(caption).trim(),
      image_url: imageUrl,
      is_approved: true,
      created_at: formatDate()
    };

    photos.unshift(photo);
    writePhotos(photos);

    return res.json({ success: true, photo });
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Gagal mengunggah foto.' });
  }
});

app.get('/checkin/:token', (req, res) => {
  const guests = readGuests();
  const rsvps = readRsvps();
  const guestIndex = guests.findIndex((guest) => guest.invitation_token === req.params.token);

  if (guestIndex < 0) {
    return res.status(404).send(`
      <html><body style="font-family:Arial;background:#0c0b09;color:#f5efe6;display:grid;place-items:center;min-height:100vh;">
      <div style="text-align:center"><h1>QR tidak valid</h1><p>Tautan check-in ini tidak ditemukan.</p></div></body></html>
    `);
  }

  const now = formatDate();
  guests[guestIndex].checked_in_at = now;
  writeGuests(guests);

  const rsvpIndex = rsvps.findIndex((entry) => entry.guest_token === guests[guestIndex].invitation_token);
  if (rsvpIndex >= 0) {
    rsvps[rsvpIndex].checked_in_at = now;
    rsvps[rsvpIndex].updated_at = now;
    writeRsvps(rsvps);
  }

  return res.send(`
    <html>
      <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
      <body style="margin:0;font-family:Arial;background:linear-gradient(180deg,#0c0b09,#1a1816);color:#f5efe6;display:grid;place-items:center;min-height:100vh;padding:24px;">
        <div style="max-width:480px;width:100%;padding:32px;border-radius:24px;background:rgba(255,255,255,0.06);border:1px solid rgba(200,169,97,0.2);text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
          <div style="font-size:52px;color:#C8A961;margin-bottom:16px;">✓</div>
          <p style="letter-spacing:3px;text-transform:uppercase;color:#D4B96E;font-size:12px;">Guest Check-In</p>
          <h1 style="font-family:Georgia,serif;font-weight:400;margin:10px 0 12px;">Selamat Datang, ${escapeHtml(guests[guestIndex].name)}</h1>
          <p style="line-height:1.8;color:rgba(245,239,230,0.78);">Check-in berhasil dicatat pada ${escapeHtml(now)}.</p>
        </div>
      </body>
    </html>
  `);
});

app.get('/api/admin/stats', (req, res) => {
  res.json(getAnalyticsSummary());
});

app.get('/api/admin/analytics', (req, res) => {
  const analytics = readAnalytics();
  const guests = readGuests();
  const recentEvents = analytics.events.slice(0, 20).map((event) => {
    const guest = guests.find((item) => item.invitation_token === event.token);
    return {
      ...event,
      guest_name: guest ? guest.name : 'Visitor'
    };
  });

  const guestPerformance = guests
    .map((guest) => ({
      id: guest.id,
      name: guest.name,
      category: guest.category,
      side: guest.side,
      total_views: guest.total_views || 0,
      responded_at: guest.responded_at || '',
      checked_in_at: guest.checked_in_at || ''
    }))
    .sort((a, b) => b.total_views - a.total_views)
    .slice(0, 12);

  res.json({
    summary: getAnalyticsSummary(),
    recentEvents,
    guestPerformance
  });
});

app.get('/api/admin/rsvp', (req, res) => {
  const guests = readGuests();
  const data = readRsvps().map((entry) => {
    const guest = entry.guest_id ? guests.find((item) => item.id === entry.guest_id) : null;
    return {
      ...entry,
      guest_meta: guest
        ? {
            category: guest.category,
            side: guest.side,
            max_guests: guest.max_guests
          }
        : null
    };
  });

  res.json(data);
});

app.get('/api/admin/guests', (req, res) => {
  const guests = readGuests().map((guest) => getGuestSummary(guest, req));
  res.json(guests.sort((a, b) => b.id - a.id));
});

app.post('/api/admin/guests', (req, res) => {
  const { name, phone = '', category = 'Undangan', side = 'Umum', maxGuests = 1, notes = '' } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nama tamu wajib diisi.' });
  }

  const guests = readGuests();
  const guest = {
    id: generateId(),
    name: String(name).trim(),
    slug: toSlug(name),
    phone: String(phone).trim(),
    category: String(category).trim() || 'Undangan',
    side: String(side).trim() || 'Umum',
    max_guests: Math.max(parseInt(maxGuests, 10) || 1, 1),
    notes: String(notes).trim(),
    invitation_token: generateToken(),
    created_at: formatDate(),
    checked_in_at: '',
    total_views: 0,
    responded_at: '',
    last_viewed_at: ''
  };

  guests.unshift(guest);
  writeGuests(guests);
  res.json({ success: true, guest: getGuestSummary(guest, req) });
});

app.patch('/api/admin/guests/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const guests = readGuests();
  const guestIndex = guests.findIndex((guest) => guest.id === id);

  if (guestIndex < 0) {
    return res.status(404).json({ error: 'Tamu tidak ditemukan.' });
  }

  guests[guestIndex] = {
    ...guests[guestIndex],
    name: String(req.body.name || guests[guestIndex].name).trim(),
    phone: String(req.body.phone || guests[guestIndex].phone).trim(),
    category: String(req.body.category || guests[guestIndex].category).trim(),
    side: String(req.body.side || guests[guestIndex].side).trim(),
    notes: String(req.body.notes || guests[guestIndex].notes).trim(),
    max_guests: Math.max(parseInt(req.body.maxGuests, 10) || guests[guestIndex].max_guests || 1, 1)
  };

  writeGuests(guests);
  res.json({ success: true, guest: getGuestSummary(guests[guestIndex], req) });
});

app.patch('/api/admin/guests/:id/checkin', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const guests = readGuests();
  const guestIndex = guests.findIndex((guest) => guest.id === id);

  if (guestIndex < 0) {
    return res.status(404).json({ error: 'Tamu tidak ditemukan.' });
  }

  guests[guestIndex].checked_in_at = guests[guestIndex].checked_in_at ? '' : formatDate();
  writeGuests(guests);
  res.json({ success: true, guest: getGuestSummary(guests[guestIndex], req) });
});

app.delete('/api/admin/guests/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const guests = readGuests().filter((guest) => guest.id !== id);
  writeGuests(guests);
  res.json({ success: true });
});

app.patch('/api/admin/wishes/:id/toggle', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const rsvps = readRsvps();
  const entry = rsvps.find((item) => item.id === id);

  if (!entry) {
    return res.status(404).json({ error: 'Ucapan tidak ditemukan.' });
  }

  entry.is_approved = !entry.is_approved;
  entry.updated_at = formatDate();
  writeRsvps(rsvps);
  res.json({ success: true, is_approved: entry.is_approved });
});

app.get('/api/admin/photos', (req, res) => {
  res.json(readPhotos().sort((a, b) => b.id - a.id));
});

app.patch('/api/admin/photos/:id/toggle', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const photos = readPhotos();
  const photo = photos.find((item) => item.id === id);

  if (!photo) {
    return res.status(404).json({ error: 'Foto tidak ditemukan.' });
  }

  photo.is_approved = !photo.is_approved;
  writePhotos(photos);
  res.json({ success: true, is_approved: photo.is_approved });
});

app.delete('/api/admin/photos/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const photos = readPhotos();
  const photo = photos.find((item) => item.id === id);

  if (photo?.image_url) {
    const filePath = path.join(__dirname, photo.image_url.replace(/^\//, ''));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  writePhotos(photos.filter((item) => item.id !== id));
  res.json({ success: true });
});

app.delete('/api/admin/rsvp/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  let rsvps = readRsvps();
  rsvps = rsvps.filter((entry) => entry.id !== id);
  writeRsvps(rsvps);
  res.json({ success: true });
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

ensureDataFiles();

app.listen(PORT, () => {
  console.log(`\n✨ Server undangan berjalan di http://localhost:${PORT}`);
  console.log(`📋 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`💌 Undangan: http://localhost:${PORT}\n`);
});
