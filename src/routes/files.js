const { Router } = require('express');
const JSZip = require('jszip');
const { supabaseAdmin } = require('../config/supabase');

const router = Router();

router.get('/status/:bulan', async (req, res) => {
  try {
    const { bulan } = req.params;
    const { data, error } = await supabaseAdmin
      .from('pralokmin_files')
      .select('klaster, jenis')
      .eq('bulan', bulan);
    if (error) return res.status(500).json({ error: error.message });
    const result = {};
    for (let i = 1; i <= 5; i++) {
      result[i] = { undangan: false, notulen: false, daftar_hadir: false, lampiran: false };
    }
    data.forEach(row => { result[row.klaster][row.jenis] = true; });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/files/:bulan/:klaster', async (req, res) => {
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

router.delete('/file/:bulan/:klaster/:jenis', async (req, res) => {
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

router.get('/download/:bulan', async (req, res) => {
  try {
    const { bulan } = req.params;
    const bucketName = 'pralokmin-files';
    const { data, error } = await supabaseAdmin
      .from('pralokmin_files')
      .select('klaster, jenis, storage_path, nama_file')
      .eq('bulan', bulan);
    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Tidak ada file untuk bulan ini' });
    const zip = new JSZip();
    let gagalList = [];
    for (const row of data) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from(bucketName)
        .download(row.storage_path);
      if (downloadError) {
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
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=Pralokmin_${bulan}.zip`);
    if (gagalList.length > 0) res.set('X-Gagal-Files', encodeURIComponent(gagalList.join(', ')));
    res.send(zipBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/download-klaster/:bulan/:klaster', async (req, res) => {
  try {
    const { bulan, klaster } = req.params;
    const bucketName = 'pralokmin-files';
    const { data, error } = await supabaseAdmin
      .from('pralokmin_files')
      .select('jenis, storage_path, nama_file')
      .eq('bulan', bulan)
      .eq('klaster', parseInt(klaster));
    if (error) throw error;
    if (data.length === 0) return res.status(404).json({ error: 'Tidak ada file untuk klaster ini' });
    const zip = new JSZip();
    let gagalList = [];
    for (const row of data) {
      const { data: fileData, error: downloadError } = await supabaseAdmin.storage
        .from(bucketName)
        .download(row.storage_path);
      if (downloadError) {
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
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    res.set('Content-Type', 'application/zip');
    res.set('Content-Disposition', `attachment; filename=Pralokmin_Klaster${klaster}_${bulan}.zip`);
    if (gagalList.length > 0) res.set('X-Gagal-Files', encodeURIComponent(gagalList.join(', ')));
    res.send(zipBuffer);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
