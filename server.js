const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const path = require('path');
const JSZip = require('jszip');
require('dotenv').config();

// Inisialisasi app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true);
    const origins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://localhost').split(',').map(s => s.trim());
    if (origins.indexOf(origin) !== -1 || process.env.CORS_ORIGIN === '*') {
      return callback(null, true);
    }
    callback(null, true);
  }
}));
app.use(express.json());

// Set CSP header agar tidak diblokir Render
app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdnjs.cloudflare.com; " +
    "font-src 'self' https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https://*.supabase.co; " +
    "connect-src 'self' https://prxmtxqngcapzqttljpd.supabase.co; " +
    "worker-src 'self'; " +
    "frame-src 'none';"
  );

  next();
});

// Sajikan frontend statis dari folder public/
const rootPath = path.join(__dirname, 'public');
app.use(express.static(rootPath));

// Fallback: kirim index.html untuk root path jika static gagal
app.get('/', (req, res) => {
  res.sendFile(path.join(rootPath, 'index.html'));
});

// Inisialisasi Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function inisialisasiDatabase() {
  const tabel = ['units', 'indicators', 'entries', 'pralokmin_files'];
  for (const t of tabel) {
    try {
      const { error } = await supabase.from(t).select('*').limit(1);
      if (error) throw error;
    } catch {
      console.warn(`⚠️  Tabel "${t}" belum ada.`);
      console.warn('   >>> Jalankan SQL di sql/migration.sql melalui Supabase SQL Editor <<<');
      return;
    }
  }
  console.log('✅ Semua tabel (units, indicators, entries, pralokmin_files) tersedia');
}

async function buatBucket() {
  const bucketName = 'pralokmin-files';
  try {
    const { data: buckets } = await supabaseAdmin.storage.listBuckets();
    if (buckets && buckets.some(b => b.name === bucketName)) {
      console.log(`✅ Storage bucket "${bucketName}" sudah ada`);
      return;
    }
    const { error } = await supabaseAdmin.storage.createBucket(bucketName, { public: false });
    if (error) throw error;
    console.log(`✅ Storage bucket "${bucketName}" berhasil dibuat`);
  } catch (err) {
    console.warn(`⚠️  Tidak bisa membuat storage bucket "${bucketName}": ${err.message}`);
    console.warn('   >>> Buat bucket "pralokmin-files" manual di Supabase Dashboard > Storage <<<');
  }
}

async function cekKoneksi() {
  try {
    const { error } = await supabaseAdmin.from('pralokmin_files').select('*').limit(1);
    if (error) throw error;
    console.log('✅ Koneksi Supabase berhasil');
    inisialisasiDatabase();
    buatBucket();
  } catch (err) {
    const msg = (err.message || '').toLowerCase();
    if (msg.includes('does not exist') || msg.includes('could not find the table') || msg.includes('relation') || msg.includes('not found') || msg.includes('doesn\'t exist')) {
      console.log('⚠️ Tabel pralokmin_files belum ada — akan dibuat saat inisialisasi');
      inisialisasiDatabase();
      buatBucket();
    } else {
      console.error('❌ Gagal koneksi ke Supabase:', err.message);
    }
  }
}

cekKoneksi();

// Konfigurasi multer (memory storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf')) {
      cb(null, true);
    } else {
      cb(new Error('Hanya file PDF'), false);
    }
  }
}).fields([
  { name: 'undangan', maxCount: 1 },
  { name: 'notulen', maxCount: 1 },
  { name: 'daftar_hadir', maxCount: 1 },
  { name: 'lampiran', maxCount: 1 }
]);

// ---------- ENDPOINT UPLOAD ----------
app.post('/api/upload', upload, async (req, res) => {
  try {
    const { bulan, klaster } = req.body;
    if (!bulan || !klaster) {
      return res.status(400).json({ success: false, error: 'Bulan dan Klaster wajib diisi' });
    }

    const files = req.files || {};
    const jenisMap = { undangan: 'undangan', notulen: 'notulen', daftar_hadir: 'daftar_hadir', lampiran: 'lampiran' };
    const bucketName = 'pralokmin-files';

    if (Object.keys(files).length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ada file yang diupload' });
    }

    for (const [key, fileArray] of Object.entries(files)) {
      const jenis = jenisMap[key];
      if (!jenis) continue;
      const file = fileArray[0];

      const fileExt = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, fileExt);
      const uniqueName = `${baseName}_${Date.now()}${fileExt}`;
      const storagePath = `${bulan}/klaster${klaster}/${jenis}/${uniqueName}`;

      // Upload ke Supabase Storage (pakai admin key)
      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(storagePath, file.buffer, {
          contentType: file.mimetype,
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Gagal upload ${jenis}: ${uploadError.message}`);
      }

      // Simpan metadata ke tabel (pakai admin key)
      const { error: insertError } = await supabaseAdmin
        .from('pralokmin_files')
        .upsert({
          bulan,
          klaster: parseInt(klaster),
          jenis,
          nama_file: file.originalname,
          storage_path: storagePath,
          ukuran: file.size
        }, { onConflict: 'bulan, klaster, jenis' });

      if (insertError) {
        await supabaseAdmin.storage.from(bucketName).remove([storagePath]);
        throw new Error(`Gagal simpan metadata ${jenis}: ${insertError.message}`);
      }
    }

    res.json({ success: true, message: 'Upload berhasil' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ---------- ENDPOINT STATUS ----------
app.get('/api/status/:bulan', async (req, res) => {
  try {
    const { bulan } = req.params;
    console.log(`📡 Request status untuk bulan: ${bulan}`);

    const { data, error } = await supabaseAdmin
      .from('pralokmin_files')
      .select('klaster, jenis')
      .eq('bulan', bulan);

    if (error) {
      console.error('❌ Error Supabase:', error);
      return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Ditemukan ${data.length} baris`);

    const result = {};
    for (let i = 1; i <= 5; i++) {
      result[i] = { undangan: false, notulen: false, daftar_hadir: false, lampiran: false };
    }
    data.forEach(row => {
      result[row.klaster][row.jenis] = true;
    });
    res.json(result);
  } catch (err) {
    console.error('❌ Unexpected error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ---------- ENDPOINT DETAIL FILE PER KLASTER ----------
app.get('/api/files/:bulan/:klaster', async (req, res) => {
  try {
    const { bulan, klaster } = req.params;
    const { data, error } = await supabaseAdmin
      .from('pralokmin_files')
      .select('jenis, nama_file, storage_path, ukuran, diupload_pada')
      .eq('bulan', bulan)
      .eq('klaster', parseInt(klaster));

    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- ENDPOINT HAPUS FILE ----------
app.delete('/api/file/:bulan/:klaster/:jenis', async (req, res) => {
  try {
    const { bulan, klaster, jenis } = req.params;
    const bucketName = 'pralokmin-files';

    const { data, error: fetchError } = await supabaseAdmin
      .from('pralokmin_files')
      .select('storage_path')
      .eq('bulan', bulan)
      .eq('klaster', parseInt(klaster))
      .eq('jenis', jenis)
      .single();

    if (fetchError) throw fetchError;
    if (!data) return res.status(404).json({ error: 'File tidak ditemukan' });

    await supabaseAdmin.storage.from(bucketName).remove([data.storage_path]);

    const { error: deleteDbError } = await supabaseAdmin
      .from('pralokmin_files')
      .delete()
      .eq('bulan', bulan)
      .eq('klaster', parseInt(klaster))
      .eq('jenis', jenis);

    if (deleteDbError) throw deleteDbError;

    res.json({ success: true, message: 'File berhasil dihapus' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- ENDPOINT DOWNLOAD ZIP SEMUA KLASTER ----------
app.get('/api/download/:bulan', async (req, res) => {
  try {
    const { bulan } = req.params;
    const bucketName = 'pralokmin-files';

    const { data, error } = await supabaseAdmin
      .from('pralokmin_files')
      .select('klaster, jenis, storage_path, nama_file')
      .eq('bulan', bulan);

    if (error) throw error;
    if (data.length === 0) {
      return res.status(404).json({ error: 'Tidak ada file untuk bulan ini' });
    }

    const zip = new JSZip();
    let gagalList = [];

    for (const row of data) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from(bucketName)
        .download(row.storage_path);

      if (downloadError) {
        console.error('Gagal download file:', row.storage_path, downloadError);
        gagalList.push(row.nama_file);
        continue;
      }

      const folderName = `Klaster_${row.klaster}`;
      const buffer = Buffer.from(await fileData.arrayBuffer());
      zip.folder(folderName).file(row.nama_file, buffer);
    }

    if (Object.keys(zip.files).length === 0) {
      return res.status(500).json({ error: 'Tidak ada file yang berhasil diambil dari storage.', gagal: gagalList });
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=Pralokmin_${bulan}.zip`);
    if (gagalList.length > 0) {
      res.set('X-Gagal-Files', encodeURIComponent(gagalList.join(', ')));
    }
    res.send(zipBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- ENDPOINT DOWNLOAD ZIP PER KLASTER ----------
app.get('/api/download-klaster/:bulan/:klaster', async (req, res) => {
  try {
    const { bulan, klaster } = req.params;
    const bucketName = 'pralokmin-files';

    const { data, error } = await supabaseAdmin
      .from('pralokmin_files')
      .select('jenis, storage_path, nama_file')
      .eq('bulan', bulan)
      .eq('klaster', parseInt(klaster));

    if (error) throw error;
    if (data.length === 0) {
      return res.status(404).json({ error: 'Tidak ada file untuk klaster ini' });
    }

    const zip = new JSZip();
    let gagalList = [];
    for (const row of data) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from(bucketName)
        .download(row.storage_path);

      if (downloadError) {
        console.error('Gagal download:', row.storage_path, downloadError);
        gagalList.push(row.nama_file);
        continue;
      }

      const jenisLabel = { undangan: 'Undangan', notulen: 'Notulen', daftar_hadir: 'Daftar Hadir', lampiran: 'Lampiran' }[row.jenis] || row.jenis;
      const buffer = Buffer.from(await fileData.arrayBuffer());
      zip.file(`${jenisLabel}_${row.nama_file}`, buffer);
    }

    if (Object.keys(zip.files).length === 0) {
      return res.status(500).json({ error: 'Tidak ada file yang berhasil diambil dari storage.', gagal: gagalList });
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=Pralokmin_Klaster${klaster}_${bulan}.zip`);
    if (gagalList.length > 0) {
      res.set('X-Gagal-Files', encodeURIComponent(gagalList.join(', ')));
    }
    res.send(zipBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== CRUD UNITS =====================
app.get('/api/units', async (req, res) => {
  try {
    const klaster = req.query.klaster || 5;
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .or(`klaster.eq.${klaster},klaster.is.null`)
      .order('nama');
    if (error) throw error;
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/units', async (req, res) => {
  try {
    const klaster = req.query.klaster || 5;
    const { nama } = req.body;
    if (!nama || !nama.trim()) return res.status(400).json({ error: 'Nama unit wajib diisi.' });

    const { data: existing } = await supabase
      .from('units')
      .select('id')
      .or(`klaster.eq.${klaster},klaster.is.null`)
      .ilike('nama', nama.trim());
    if (existing && existing.length > 0) return res.status(400).json({ error: 'Unit itu sudah ada.' });

    const { data, error } = await supabase
      .from('units')
      .insert({ klaster: parseInt(klaster), nama: nama.trim() })
      .select();
    if (error) throw error;
    res.status(201).json({ id: data[0].id, message: 'Unit ditambahkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/units/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('units')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Unit dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== CRUD INDICATORS =====================
app.get('/api/indicators', async (req, res) => {
  try {
    const klaster = req.query.klaster || 5;
    const { data, error } = await supabase
      .from('indicators')
      .select('*')
      .or(`klaster.eq.${klaster},klaster.is.null`)
      .order('nama');
    if (error) throw error;
    const rows = (data || []).map(r => ({ ...r, bor: !!r.bor }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/indicators', async (req, res) => {
  try {
    const klaster = req.query.klaster || 5;
    const d = req.body;
    if (!d.nama || !d.nama.trim()) return res.status(400).json({ error: 'Nama indikator wajib diisi.' });
    if (!d.unit) return res.status(400).json({ error: 'Pilih unit pelayanan.' });

    const { data, error } = await supabase
      .from('indicators')
      .insert({
        klaster: parseInt(klaster),
        unit: d.unit,
        nama: d.nama.trim(),
        target: d.target ?? '',
        satuan: d.satuan || 'persen',
        mode_bulanan: d.modeBulanan || 'bagi12',
        bor: d.bor ? true : false
      })
      .select();
    if (error) throw error;
    res.status(201).json({ id: data[0].id, message: 'Indikator ditambahkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/indicators/:id', async (req, res) => {
  try {
    const d = req.body;
    const { error } = await supabase
      .from('indicators')
      .update({
        unit: d.unit,
        nama: d.nama.trim(),
        target: d.target ?? '',
        satuan: d.satuan || 'persen',
        mode_bulanan: d.modeBulanan || 'bagi12',
        bor: d.bor ? true : false
      })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Indikator diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/indicators/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('indicators')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Indikator dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== CRUD ENTRIES =====================
app.get('/api/entries', async (req, res) => {
  try {
    let query = supabase.from('entries').select('*');
    const klaster = req.query.klaster;
    if (klaster) {
      query = query.or(`klaster.eq.${klaster},klaster.is.null`);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    const rows = (data || []).map(r => ({ ...r, bor: !!r.bor }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/entries', async (req, res) => {
  try {
    const klaster = req.query.klaster || 5;
    const d = req.body;

    const { data, error } = await supabase
      .from('entries')
      .insert({
        klaster: parseInt(klaster),
        indikator_id: d.indikatorId,
        petugas: d.petugas,
        unit: d.unit || d.petugas,
        bulan: d.bulan,
        tahun: d.tahun,
        periode: d.periode,
        indikator_nama: d.indikatorNama,
        target_tahunan: d.targetTahunan ?? '',
        mode_bulanan: d.modeBulanan || 'bagi12',
        target_bulanan: d.targetBulanan ?? 0,
        aktual: d.aktual ?? '',
        satuan: d.satuan || 'persen',
        status_capaian: d.statusCapaian ?? '',
        analisa: d.analisa ?? '',
        rtl: d.rtl ?? '',
        bor: d.bor ? true : false,
        bor_hari_rawat: d.borHariRawat ?? 0,
        bor_tt: d.borTT ?? 0,
        bor_hari_periode: d.borHariPeriode ?? 0
      })
      .select();
    if (error) throw error;
    res.status(201).json({ id: data[0].id, message: 'Data berhasil disimpan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/entries/:id', async (req, res) => {
  try {
    const d = req.body;
    const { error } = await supabase
      .from('entries')
      .update({
        indikator_id: d.indikatorId,
        petugas: d.petugas,
        unit: d.unit || d.petugas,
        bulan: d.bulan,
        tahun: d.tahun,
        periode: d.periode,
        indikator_nama: d.indikatorNama,
        target_tahunan: d.targetTahunan ?? '',
        mode_bulanan: d.modeBulanan || 'bagi12',
        target_bulanan: d.targetBulanan ?? 0,
        aktual: d.aktual ?? '',
        satuan: d.satuan || 'persen',
        status_capaian: d.statusCapaian ?? '',
        analisa: d.analisa ?? '',
        rtl: d.rtl ?? '',
        bor: d.bor ? true : false,
        bor_hari_rawat: d.borHariRawat ?? 0,
        bor_tt: d.borTT ?? 0,
        bor_hari_periode: d.borHariPeriode ?? 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Data diperbarui.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/entries/:id', async (req, res) => {
  try {
    const { error } = await supabase
      .from('entries')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Data dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ===================== DASHBOARD =====================
app.get('/api/dashboard', async (req, res) => {
  try {
    const result = [];
    for (let n = 1; n <= 5; n++) {
      const { data, error } = await supabase
        .from('entries')
        .select('status_capaian')
        .eq('klaster', n);
      if (error) throw error;
      const total = data ? data.length : 0;
      const tercapai = data ? data.filter(d => d.status_capaian === 'Mencapai Target').length : 0;
      result.push({
        klaster: n,
        total,
        tercapai,
        belum: total - tercapai,
        persen: total ? Math.round((tercapai / total) * 100) : 0
      });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------- ERROR HANDLER ----------
app.use((err, req, res, next) => {
  console.error('❌ Unhandled error:', err.message);
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'Ukuran file maksimal 5 MB' });
    }
    return res.status(400).json({ success: false, error: err.message });
  }
  if (err.message === 'Hanya file PDF') {
    return res.status(400).json({ success: false, error: 'Hanya file PDF yang diperbolehkan' });
  }
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// ---------- START SERVER ----------
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server berjalan di http://0.0.0.0:${PORT}`);
  console.log(`🔗 Supabase URL: ${process.env.SUPABASE_URL}`);
});