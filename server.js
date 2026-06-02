const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const QRCode = require('qrcode');
const { initDatabase, getPool } = require('./db');

const app = express();
const PORT = 3000;

const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PHOTOS_DIR = path.join(UPLOADS_DIR, 'photos');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(UPLOADS_DIR));

function ensureDirs() {
  if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  if (!fs.existsSync(PHOTOS_DIR)) fs.mkdirSync(PHOTOS_DIR, { recursive: true });
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

// ═══════════ GUEST ENDPOINTS ═══════════

app.get('/api/guest', async (req, res) => {
  try {
    const token = String(req.query.token || '');
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM guests WHERE invitation_token = ?', [token]);

    if (!rows.length) {
      return res.json({ guest: null });
    }

    return res.json({ guest: getGuestSummary(rows[0], req) });
  } catch (err) {
    console.error('GET /api/guest error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/guests/:token/qr.svg', async (req, res) => {
  try {
    const token = req.params.token;
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM guests WHERE invitation_token = ?', [token]);

    if (!rows.length) {
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
  } catch (err) {
    console.error('GET /api/guests/:token/qr.svg error:', err);
    return res.status(500).send('Server error');
  }
});

// ═══════════ ANALYTICS ═══════════

app.post('/api/analytics/view', async (req, res) => {
  try {
    const token = String(req.body.token || '');
    const pathName = String(req.body.path || '/');
    const source = String(req.body.source || 'web');
    const sessionId = String(req.body.sessionId || '');
    const db = getPool();
    const now = formatDate();

    await db.execute(
      'INSERT INTO analytics_events (id, token, path, source, session_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [generateId(), token, pathName, source, sessionId, now]
    );

    await db.execute('UPDATE analytics_counters SET total_views = total_views + 1 WHERE id = 1');

    if (!token) {
      await db.execute('UPDATE analytics_counters SET anonymous_views = anonymous_views + 1 WHERE id = 1');
    } else {
      await db.execute(
        'UPDATE guests SET total_views = total_views + 1, last_viewed_at = ? WHERE invitation_token = ?',
        [now, token]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/analytics/view error:', err);
    res.json({ success: true }); // Don't fail analytics
  }
});

// ═══════════ RSVP ═══════════

app.post('/api/rsvp', async (req, res) => {
  try {
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

    const db = getPool();
    const now = formatDate();

    // Find guest if token provided
    let guest = null;
    if (guestToken) {
      const [guestRows] = await db.execute('SELECT * FROM guests WHERE invitation_token = ?', [guestToken]);
      guest = guestRows[0] || null;
    }

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
      is_approved: String(message || '').trim().length > 0 ? 1 : 0,
      checked_in_at: '',
      created_at: now,
      updated_at: now
    };

    // Check if RSVP already exists for this guest
    let existingRsvp = null;
    if (guest) {
      const [existingRows] = await db.execute('SELECT * FROM rsvps WHERE guest_token = ?', [guest.invitation_token]);
      existingRsvp = existingRows[0] || null;
    }

    if (existingRsvp) {
      // Update existing RSVP
      await db.execute(
        `UPDATE rsvps SET name=?, attendance=?, guests=?, phone=?, \`relation\`=?, meal_preference=?, message=?, is_approved=?, updated_at=? WHERE id=?`,
        [payload.name, payload.attendance, payload.guests, payload.phone, payload.relation, payload.meal_preference, payload.message, payload.is_approved, now, existingRsvp.id]
      );
      payload.id = existingRsvp.id;
      payload.created_at = existingRsvp.created_at;
      payload.checked_in_at = existingRsvp.checked_in_at || '';
    } else {
      // Insert new RSVP
      await db.execute(
        `INSERT INTO rsvps (id, guest_id, guest_token, name, attendance, guests, phone, \`relation\`, meal_preference, message, is_approved, checked_in_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [payload.id, payload.guest_id, payload.guest_token, payload.name, payload.attendance, payload.guests, payload.phone, payload.relation, payload.meal_preference, payload.message, payload.is_approved, payload.checked_in_at, payload.created_at, payload.updated_at]
      );
    }

    // Update guest responded_at
    if (guest) {
      await db.execute(
        'UPDATE guests SET name=?, phone=CASE WHEN ?<>"" THEN ? ELSE phone END, responded_at=? WHERE id=?',
        [payload.name, payload.phone, payload.phone, now, guest.id]
      );
    }

    // Return updated guest
    let updatedGuest = null;
    if (guest) {
      const [freshRows] = await db.execute('SELECT * FROM guests WHERE id = ?', [guest.id]);
      updatedGuest = freshRows[0] ? getGuestSummary(freshRows[0], req) : null;
    }

    return res.json({
      success: true,
      id: payload.id,
      guest: updatedGuest
    });
  } catch (err) {
    console.error('POST /api/rsvp error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/wishes', async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute(
      'SELECT id, name, message, attendance, created_at, meal_preference FROM rsvps WHERE is_approved = 1 AND message <> "" ORDER BY id DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error('GET /api/wishes error:', err);
    res.json([]);
  }
});

// ═══════════ PHOTOS ═══════════

app.get('/api/photos', async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM photos WHERE is_approved = 1 ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    console.error('GET /api/photos error:', err);
    res.json([]);
  }
});

app.post('/api/photos', async (req, res) => {
  try {
    const { guestToken = '', guestName = '', caption = '', imageData = '', mimeType = 'image/jpeg' } = req.body;
    if (!imageData) {
      return res.status(400).json({ error: 'Foto wajib diunggah.' });
    }

    const db = getPool();
    let guest = null;
    if (guestToken) {
      const [gRows] = await db.execute('SELECT * FROM guests WHERE invitation_token = ?', [guestToken]);
      guest = gRows[0] || null;
    }

    const imageUrl = saveBase64Image(imageData, mimeType);
    const photo = {
      id: generateId(),
      guest_token: guest?.invitation_token || '',
      guest_name: String(guestName || guest?.name || 'Tamu').trim(),
      caption: String(caption).trim(),
      image_url: imageUrl,
      is_approved: 1,
      created_at: formatDate()
    };

    await db.execute(
      'INSERT INTO photos (id, guest_token, guest_name, caption, image_url, is_approved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [photo.id, photo.guest_token, photo.guest_name, photo.caption, photo.image_url, photo.is_approved, photo.created_at]
    );

    return res.json({ success: true, photo });
  } catch (err) {
    console.error('POST /api/photos error:', err);
    return res.status(400).json({ error: err.message || 'Gagal mengunggah foto.' });
  }
});

// ═══════════ CHECK-IN (URL-based) ═══════════

app.get('/checkin/:token', async (req, res) => {
  try {
    const db = getPool();
    const [guestRows] = await db.execute('SELECT * FROM guests WHERE invitation_token = ?', [req.params.token]);

    if (!guestRows.length) {
      return res.status(404).send(`
        <html><body style="font-family:Arial;background:#0c0b09;color:#f5efe6;display:grid;place-items:center;min-height:100vh;">
        <div style="text-align:center"><h1>QR tidak valid</h1><p>Tautan check-in ini tidak ditemukan.</p></div></body></html>
      `);
    }

    const guest = guestRows[0];
    const now = formatDate();

    await db.execute('UPDATE guests SET checked_in_at = ? WHERE id = ?', [now, guest.id]);
    await db.execute('UPDATE rsvps SET checked_in_at = ?, updated_at = ? WHERE guest_token = ?', [now, now, guest.invitation_token]);

    return res.send(`
      <html>
        <head><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
        <body style="margin:0;font-family:Arial;background:linear-gradient(180deg,#0c0b09,#1a1816);color:#f5efe6;display:grid;place-items:center;min-height:100vh;padding:24px;">
          <div style="max-width:480px;width:100%;padding:32px;border-radius:24px;background:rgba(255,255,255,0.06);border:1px solid rgba(200,169,97,0.2);text-align:center;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="font-size:52px;color:#C8A961;margin-bottom:16px;">✓</div>
            <p style="letter-spacing:3px;text-transform:uppercase;color:#D4B96E;font-size:12px;">Guest Check-In</p>
            <h1 style="font-family:Georgia,serif;font-weight:400;margin:10px 0 12px;">Selamat Datang, ${escapeHtml(guest.name)}</h1>
            <p style="line-height:1.8;color:rgba(245,239,230,0.78);">Check-in berhasil dicatat pada ${escapeHtml(now)}.</p>
          </div>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('GET /checkin/:token error:', err);
    return res.status(500).send('Server error');
  }
});

// ═══════════ ADMIN: SCAN CHECK-IN (QR Scanner) ═══════════

app.post('/api/admin/scan-checkin', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.json({ status: 'INVALID', message: 'Tidak ada token yang dikirim.' });
    }

    const db = getPool();

    // Extract token from URL if full URL is scanned
    let cleanToken = token;
    const checkinMatch = token.match(/\/checkin\/([a-f0-9]+)/i);
    if (checkinMatch) {
      cleanToken = checkinMatch[1];
    }
    // Also handle ?g= parameter
    const gMatch = token.match(/[?&]g=([a-f0-9]+)/i);
    if (gMatch) {
      cleanToken = gMatch[1];
    }

    const [guestRows] = await db.execute('SELECT * FROM guests WHERE invitation_token = ?', [cleanToken]);

    if (!guestRows.length) {
      return res.json({
        status: 'INVALID',
        message: 'QR Code tidak terdaftar! Tamu tidak ditemukan dalam sistem.',
        token: cleanToken
      });
    }

    const guest = guestRows[0];

    // Check if already checked in
    if (guest.checked_in_at && guest.checked_in_at !== '') {
      return res.json({
        status: 'ALREADY',
        message: `Tamu "${guest.name}" sudah melakukan check-in sebelumnya.`,
        guest: {
          name: guest.name,
          category: guest.category,
          side: guest.side,
          max_guests: guest.max_guests,
          checked_in_at: guest.checked_in_at
        }
      });
    }

    // Perform check-in
    const now = formatDate();
    await db.execute('UPDATE guests SET checked_in_at = ? WHERE id = ?', [now, guest.id]);
    await db.execute('UPDATE rsvps SET checked_in_at = ?, updated_at = ? WHERE guest_token = ?', [now, now, guest.invitation_token]);

    // Get RSVP info
    const [rsvpRows] = await db.execute('SELECT * FROM rsvps WHERE guest_token = ?', [guest.invitation_token]);
    const rsvp = rsvpRows[0] || null;

    return res.json({
      status: 'SUCCESS',
      message: `Selamat Datang, ${guest.name}!`,
      guest: {
        name: guest.name,
        category: guest.category,
        side: guest.side,
        max_guests: guest.max_guests,
        checked_in_at: now,
        attendance: rsvp?.attendance || 'hadir',
        total_guests: rsvp?.guests || 1
      }
    });
  } catch (err) {
    console.error('POST /api/admin/scan-checkin error:', err);
    return res.status(500).json({ status: 'ERROR', message: 'Server error' });
  }
});

// ═══════════ ADMIN: STATS ═══════════

app.get('/api/admin/stats', async (req, res) => {
  try {
    const db = getPool();

    const [[counters]] = await db.execute('SELECT * FROM analytics_counters WHERE id = 1');
    const [[guestCount]] = await db.execute('SELECT COUNT(*) as cnt FROM guests');
    const [[rsvpCount]] = await db.execute('SELECT COUNT(*) as cnt FROM rsvps');
    const [[hadirCount]] = await db.execute("SELECT COUNT(*) as cnt FROM rsvps WHERE attendance = 'hadir'");
    const [[tidakHadirCount]] = await db.execute("SELECT COUNT(*) as cnt FROM rsvps WHERE attendance = 'tidak'");
    const [[totalTamu]] = await db.execute("SELECT COALESCE(SUM(guests), 0) as cnt FROM rsvps WHERE attendance = 'hadir'");
    const [[approvedWishes]] = await db.execute("SELECT COUNT(*) as cnt FROM rsvps WHERE is_approved = 1 AND message <> ''");
    const [[photosApproved]] = await db.execute("SELECT COUNT(*) as cnt FROM photos WHERE is_approved = 1");
    const [[photosTotal]] = await db.execute("SELECT COUNT(*) as cnt FROM photos");
    const [[checkedInCount]] = await db.execute("SELECT COUNT(*) as cnt FROM guests WHERE checked_in_at <> ''");
    const [[uniqueViewed]] = await db.execute("SELECT COUNT(DISTINCT token) as cnt FROM analytics_events WHERE token <> ''");
    const [[respondedCount]] = await db.execute("SELECT COUNT(DISTINCT guest_token) as cnt FROM rsvps WHERE guest_token <> ''");

    const totalInvites = guestCount.cnt;
    const conversion = totalInvites ? Math.round((respondedCount.cnt / totalInvites) * 100) : 0;

    res.json({
      totalInvites,
      totalRsvp: rsvpCount.cnt,
      totalHadir: hadirCount.cnt,
      totalTidakHadir: tidakHadirCount.cnt,
      totalTamu: totalTamu.cnt,
      totalApprovedWishes: approvedWishes.cnt,
      totalPhotos: photosApproved.cnt,
      totalPhotoUploads: photosTotal.cnt,
      totalCheckedIn: checkedInCount.cnt,
      totalViews: counters?.total_views || 0,
      totalAnonymousViews: counters?.anonymous_views || 0,
      totalUniqueGuestsViewed: uniqueViewed.cnt,
      totalRespondedGuests: respondedCount.cnt,
      rsvpConversion: conversion
    });
  } catch (err) {
    console.error('GET /api/admin/stats error:', err);
    res.json({});
  }
});

// ═══════════ ADMIN: ANALYTICS ═══════════

app.get('/api/admin/analytics', async (req, res) => {
  try {
    const db = getPool();
    const [events] = await db.execute('SELECT * FROM analytics_events ORDER BY id DESC LIMIT 20');
    const [guests] = await db.execute('SELECT * FROM guests');

    const recentEvents = events.map((event) => {
      const guest = guests.find((g) => g.invitation_token === event.token);
      return { ...event, guest_name: guest ? guest.name : 'Visitor' };
    });

    const guestPerformance = guests
      .map((g) => ({
        id: g.id,
        name: g.name,
        category: g.category,
        side: g.side,
        total_views: g.total_views || 0,
        responded_at: g.responded_at || '',
        checked_in_at: g.checked_in_at || ''
      }))
      .sort((a, b) => b.total_views - a.total_views)
      .slice(0, 12);

    // Build summary inline (avoid self-fetch)
    const [[counters]] = await db.execute('SELECT * FROM analytics_counters WHERE id = 1');
    const [[guestCount]] = await db.execute('SELECT COUNT(*) as cnt FROM guests');
    const [[rsvpCount]] = await db.execute('SELECT COUNT(*) as cnt FROM rsvps');
    const [[hadirCount]] = await db.execute("SELECT COUNT(*) as cnt FROM rsvps WHERE attendance = 'hadir'");
    const [[tidakHadirCount]] = await db.execute("SELECT COUNT(*) as cnt FROM rsvps WHERE attendance = 'tidak'");
    const [[totalTamu]] = await db.execute("SELECT COALESCE(SUM(guests), 0) as cnt FROM rsvps WHERE attendance = 'hadir'");
    const [[checkedInCount]] = await db.execute("SELECT COUNT(*) as cnt FROM guests WHERE checked_in_at <> ''");
    const [[respondedCount]] = await db.execute("SELECT COUNT(DISTINCT guest_token) as cnt FROM rsvps WHERE guest_token <> ''");
    const totalInvites = guestCount.cnt;
    const conversion = totalInvites ? Math.round((respondedCount.cnt / totalInvites) * 100) : 0;

    const summary = {
      totalInvites,
      totalRsvp: rsvpCount.cnt,
      totalHadir: hadirCount.cnt,
      totalTidakHadir: tidakHadirCount.cnt,
      totalTamu: totalTamu.cnt,
      totalCheckedIn: checkedInCount.cnt,
      totalViews: counters?.total_views || 0,
      rsvpConversion: conversion
    };

    res.json({ summary, recentEvents, guestPerformance });
  } catch (err) {
    console.error('GET /api/admin/analytics error:', err);
    res.json({ summary: {}, recentEvents: [], guestPerformance: [] });
  }
});

// ═══════════ ADMIN: RSVP ═══════════

app.get('/api/admin/rsvp', async (req, res) => {
  try {
    const db = getPool();
    const [rsvps] = await db.execute('SELECT * FROM rsvps ORDER BY id DESC');
    const [guests] = await db.execute('SELECT * FROM guests');

    const data = rsvps.map((entry) => {
      const guest = entry.guest_id ? guests.find((g) => g.id === entry.guest_id) : null;
      return {
        ...entry,
        is_approved: !!entry.is_approved,
        guest_meta: guest ? { category: guest.category, side: guest.side, max_guests: guest.max_guests } : null
      };
    });

    res.json(data);
  } catch (err) {
    console.error('GET /api/admin/rsvp error:', err);
    res.json([]);
  }
});

// ═══════════ ADMIN: GUESTS ═══════════

app.get('/api/admin/guests', async (req, res) => {
  try {
    const db = getPool();
    const [guests] = await db.execute('SELECT * FROM guests ORDER BY id DESC');
    res.json(guests.map((g) => getGuestSummary(g, req)));
  } catch (err) {
    console.error('GET /api/admin/guests error:', err);
    res.json([]);
  }
});

app.post('/api/admin/guests', async (req, res) => {
  try {
    const { name, phone = '', category = 'Undangan', side = 'Umum', maxGuests = 1, notes = '' } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Nama tamu wajib diisi.' });
    }

    const db = getPool();
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

    await db.execute(
      `INSERT INTO guests (id, name, slug, phone, category, side, max_guests, notes, invitation_token, created_at, checked_in_at, total_views, responded_at, last_viewed_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [guest.id, guest.name, guest.slug, guest.phone, guest.category, guest.side, guest.max_guests, guest.notes, guest.invitation_token, guest.created_at, guest.checked_in_at, guest.total_views, guest.responded_at, guest.last_viewed_at]
    );

    res.json({ success: true, guest: getGuestSummary(guest, req) });
  } catch (err) {
    console.error('POST /api/admin/guests error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/admin/guests/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM guests WHERE id = ?', [id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Tamu tidak ditemukan.' });
    }

    const guest = rows[0];
    const updated = {
      name: String(req.body.name || guest.name).trim(),
      phone: String(req.body.phone || guest.phone).trim(),
      category: String(req.body.category || guest.category).trim(),
      side: String(req.body.side || guest.side).trim(),
      notes: String(req.body.notes || guest.notes).trim(),
      max_guests: Math.max(parseInt(req.body.maxGuests, 10) || guest.max_guests || 1, 1)
    };

    await db.execute(
      'UPDATE guests SET name=?, phone=?, category=?, side=?, notes=?, max_guests=? WHERE id=?',
      [updated.name, updated.phone, updated.category, updated.side, updated.notes, updated.max_guests, id]
    );

    const [freshRows] = await db.execute('SELECT * FROM guests WHERE id = ?', [id]);
    res.json({ success: true, guest: getGuestSummary(freshRows[0], req) });
  } catch (err) {
    console.error('PATCH /api/admin/guests/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.patch('/api/admin/guests/:id/checkin', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM guests WHERE id = ?', [id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Tamu tidak ditemukan.' });
    }

    const guest = rows[0];
    const newCheckinAt = guest.checked_in_at ? '' : formatDate();
    await db.execute('UPDATE guests SET checked_in_at = ? WHERE id = ?', [newCheckinAt, id]);

    const [freshRows] = await db.execute('SELECT * FROM guests WHERE id = ?', [id]);
    res.json({ success: true, guest: getGuestSummary(freshRows[0], req) });
  } catch (err) {
    console.error('PATCH /api/admin/guests/:id/checkin error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/guests/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getPool();
    await db.execute('DELETE FROM guests WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/guests/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════ ADMIN: WISHES ═══════════

app.patch('/api/admin/wishes/:id/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM rsvps WHERE id = ?', [id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Ucapan tidak ditemukan.' });
    }

    const newApproved = rows[0].is_approved ? 0 : 1;
    await db.execute('UPDATE rsvps SET is_approved = ?, updated_at = ? WHERE id = ?', [newApproved, formatDate(), id]);
    res.json({ success: true, is_approved: !!newApproved });
  } catch (err) {
    console.error('PATCH /api/admin/wishes/:id/toggle error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════ ADMIN: PHOTOS ═══════════

app.get('/api/admin/photos', async (req, res) => {
  try {
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM photos ORDER BY id DESC');
    res.json(rows.map((p) => ({ ...p, is_approved: !!p.is_approved })));
  } catch (err) {
    console.error('GET /api/admin/photos error:', err);
    res.json([]);
  }
});

app.patch('/api/admin/photos/:id/toggle', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM photos WHERE id = ?', [id]);

    if (!rows.length) {
      return res.status(404).json({ error: 'Foto tidak ditemukan.' });
    }

    const newApproved = rows[0].is_approved ? 0 : 1;
    await db.execute('UPDATE photos SET is_approved = ? WHERE id = ?', [newApproved, id]);
    res.json({ success: true, is_approved: !!newApproved });
  } catch (err) {
    console.error('PATCH /api/admin/photos/:id/toggle error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/admin/photos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getPool();
    const [rows] = await db.execute('SELECT * FROM photos WHERE id = ?', [id]);
    const photo = rows[0];

    if (photo?.image_url) {
      const filePath = path.join(__dirname, photo.image_url.replace(/^\//, ''));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await db.execute('DELETE FROM photos WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/photos/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════ ADMIN: RSVP DELETE ═══════════

app.delete('/api/admin/rsvp/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const db = getPool();
    await db.execute('DELETE FROM rsvps WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/admin/rsvp/:id error:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ═══════════ ADMIN PAGE ═══════════

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ═══════════ START SERVER ═══════════

ensureDirs();

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n✨ Server undangan berjalan di http://localhost:${PORT}`);
      console.log(`📋 Admin panel: http://localhost:${PORT}/admin`);
      console.log(`💌 Undangan: http://localhost:${PORT}\n`);
    });
  })
  .catch((err) => {
    console.error('❌ Gagal menginisialisasi database:', err);
    process.exit(1);
  });
