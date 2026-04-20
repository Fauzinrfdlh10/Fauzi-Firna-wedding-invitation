const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;
const DB_FILE = path.join(__dirname, 'data', 'rsvp.json');

// ─── MIDDLEWARE ──────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ─── JSON DATABASE HELPER ───────────────
function ensureDataDir() {
  const dir = path.join(__dirname, 'data');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2));
}

function readDB() {
  ensureDataDir();
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeDB(data) {
  ensureDataDir();
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ─── PUBLIC API ─────────────────────────

// Submit RSVP (dari frontend tamu)
app.post('/api/rsvp', (req, res) => {
  const { name, attendance, guests, message } = req.body;
  if (!name || !attendance) {
    return res.status(400).json({ error: 'Nama dan konfirmasi kehadiran wajib diisi.' });
  }

  const entries = readDB();
  const newEntry = {
    id: Date.now(),
    name: name.trim(),
    attendance,
    guests: guests || 1,
    message: (message || '').trim(),
    is_approved: false,
    created_at: new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
  };
  entries.unshift(newEntry);
  writeDB(entries);

  res.json({ success: true, id: newEntry.id });
});

// Get approved wishes only (tampil di frontend)
app.get('/api/wishes', (req, res) => {
  const entries = readDB();
  const approved = entries
    .filter(e => e.is_approved && e.message)
    .map(({ name, message, attendance, created_at }) => ({ name, message, attendance, created_at }));
  res.json(approved);
});

// ─── ADMIN API ──────────────────────────

// Get all RSVP entries
app.get('/api/admin/rsvp', (req, res) => {
  res.json(readDB());
});

// Get statistics
app.get('/api/admin/stats', (req, res) => {
  const entries = readDB();
  const hadir = entries.filter(e => e.attendance === 'hadir');
  const tidak = entries.filter(e => e.attendance === 'tidak');
  const totalGuests = hadir.reduce((sum, e) => sum + (parseInt(e.guests) || 1), 0);
  const approvedWishes = entries.filter(e => e.is_approved && e.message).length;

  res.json({
    totalRsvp: entries.length,
    totalHadir: hadir.length,
    totalTidakHadir: tidak.length,
    totalTamu: totalGuests,
    totalApprovedWishes: approvedWishes
  });
});

// Toggle wish approval
app.patch('/api/admin/wishes/:id/toggle', (req, res) => {
  const id = parseInt(req.params.id);
  const entries = readDB();
  const entry = entries.find(e => e.id === id);
  if (!entry) return res.status(404).json({ error: 'Data tidak ditemukan.' });

  entry.is_approved = !entry.is_approved;
  writeDB(entries);
  res.json({ success: true, is_approved: entry.is_approved });
});

// Delete RSVP entry
app.delete('/api/admin/rsvp/:id', (req, res) => {
  const id = parseInt(req.params.id);
  let entries = readDB();
  entries = entries.filter(e => e.id !== id);
  writeDB(entries);
  res.json({ success: true });
});

// Serve admin page
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin', 'index.html'));
});

// ─── START SERVER ───────────────────────
app.listen(PORT, () => {
  console.log(`\n✨ Server undangan berjalan di http://localhost:${PORT}`);
  console.log(`📋 Admin panel: http://localhost:${PORT}/admin`);
  console.log(`💒 Undangan: http://localhost:${PORT}\n`);
});
