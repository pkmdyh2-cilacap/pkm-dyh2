const { Router } = require('express');
const multer = require('multer');
const path = require('path');
const { supabaseAdmin } = require('../config/supabase');

const router = Router();

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
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

router.post('/', upload, async (req, res) => {
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
      // dead code — multer.fields() already rejects unknown field names
      /* istanbul ignore next */
      if (!jenis) continue;
      const file = fileArray[0];
      const fileExt = path.extname(file.originalname);
      const baseName = path.basename(file.originalname, fileExt);
      const uniqueName = `${baseName}_${Date.now()}${fileExt}`;
      const storagePath = `${bulan}/klaster${klaster}/${jenis}/${uniqueName}`;
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

module.exports = router;
