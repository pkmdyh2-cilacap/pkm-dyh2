const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const { supabaseAdmin } = require('./config/supabase');

const { authenticate } = require('./middleware/auth');

const app = express();

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const origins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost:5173').split(',').map(s => s.trim());
    if (origins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === '*') return callback(null, true);
    callback(null, false);
  }
}));
app.use(express.json());

const supabaseUrl = process.env.SUPABASE_URL;
let supabaseHost = '';
if (supabaseUrl) {
  supabaseHost = supabaseUrl.replace(/https?:\/\//, '').split('/')[0];
} else {
  console.warn('⚠️ SUPABASE_URL tidak diset, melewatkan konfigurasi CSP untuk Supabase');
}

app.use((req, res, next) => {
  const host = req.get('host');
  const protocol = host?.includes('localhost') || host?.startsWith('127.0.0.1') ? 'http' : 'https';
  const origin = `${protocol}://${host}`;
  const supabaseCsp = supabaseHost ? `https://${supabaseHost}` : '';
  res.setHeader(
    "Content-Security-Policy",
    `default-src 'self' ${origin}; ` +
    `script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com ${origin}; ` +
    `style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com ${origin}; ` +
    `font-src 'self' https://cdnjs.cloudflare.com ${origin}; ` +
    `img-src 'self' data: ${supabaseCsp} ${origin}; ` +
    `connect-src 'self' ${supabaseCsp} ${origin}; ` +
    `worker-src 'self'; frame-src 'none';`
  );
  next();
});

const rootPath = path.join(__dirname, '..', 'public');
app.use(express.static(rootPath));

app.use('/api/auth', require('./routes/auth'));

app.use('/api/upload', authenticate, require('./routes/upload'));
app.use('/api', authenticate, require('./routes/files'));
app.use('/api/units', authenticate, require('./routes/units'));
app.use('/api/indicators', authenticate, require('./routes/indicators'));
app.use('/api/entries', authenticate, require('./routes/entries'));
app.use('/api/dashboard', authenticate, require('./routes/dashboard'));

// Diberi nama (bukan lagi anonymous) dan di-export supaya bisa dites
// langsung sebagai unit function, tanpa harus dipicu lewat request HTTP asli.
function errorHandler(err, req, res, next) {
  console.error('❌ Unhandled error:', err.message);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(400).json({ success: false, error: 'Ukuran file maksimal 10 MB' });
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err.message === 'Hanya file PDF') return res.status(400).json({ success: false, error: 'Hanya file PDF yang diperbolehkan' });
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
}
app.use(errorHandler);

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
module.exports.errorHandler = errorHandler;
module.exports.cekKoneksi = cekKoneksi;
