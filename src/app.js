const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const { supabaseAdmin } = require('./config/supabase');

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const origins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost').split(',').map(s => s.trim());
    if (origins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === '*') return callback(null, true);
    callback(null, true);
  }
}));
app.use(express.json());

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self' https://pkm-dyh2.vercel.app; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://pkm-dyh2.vercel.app; " +
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com https://pkm-dyh2.vercel.app; " +
    "font-src 'self' https://cdnjs.cloudflare.com https://pkm-dyh2.vercel.app; " +
    "img-src 'self' data: https://*.supabase.co https://pkm-dyh2.vercel.app; " +
    "connect-src 'self' https://prxmtxqngcapzqttljpd.supabase.co https://pkm-dyh2.vercel.app; " +
    "worker-src 'self'; frame-src 'none';"
  );
  next();
});

const rootPath = path.join(__dirname, '..', 'public');
app.use(express.static(rootPath));

app.get('/', (req, res) => res.sendFile(path.join(rootPath, 'index.html')));

app.use('/api/upload', require('./routes/upload'));
app.use('/api', require('./routes/files'));
app.use('/api/units', require('./routes/units'));
app.use('/api/indicators', require('./routes/indicators'));
app.use('/api/entries', require('./routes/entries'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'Ukuran file maksimal 4 MB' });
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err.message === 'Hanya file PDF') return res.status(400).json({ success: false, error: 'Hanya file PDF yang diperbolehkan' });
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

async function cekKoneksi() {
  try {
    const { error } = await supabaseAdmin.from('pralokmin_files').select('*').limit(1);
    if (error) throw error;
    console.log('✅ Koneksi Supabase berhasil');
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('does not exist') || msg.includes('could not find the table') || msg.includes('relation') || msg.includes('not found') || msg.includes("doesn't exist")) {
      console.log('⚠️ Tabel pralokmin_files belum ada');
    } else {
      console.error('❌ Gagal koneksi ke Supabase:', err.message);
    }
  }
}
cekKoneksi();

module.exports = app;
