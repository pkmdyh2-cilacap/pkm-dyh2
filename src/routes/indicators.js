const { Router } = require('express');
const { supabaseAdmin: supabase } = require('../config/supabase');

const router = Router();

router.get('/', async (req, res) => {
  try {
    const klasterRaw = req.query.klaster;
    const klaster = klasterRaw ?? '5';
    const klasterNum = parseInt(klaster);
    if (isNaN(klasterNum) || klasterNum < 1 || klasterNum > 5) {
      return res.status(400).json({ error: 'Klaster harus angka 1-5' });
    }
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

router.post('/', async (req, res) => {
  try {
    const klasterRaw = req.query.klaster;
    const klaster = klasterRaw ?? '5';
    const klasterNum = parseInt(klaster);
    if (isNaN(klasterNum) || klasterNum < 1 || klasterNum > 5) {
      return res.status(400).json({ error: 'Klaster harus angka 1-5' });
    }
    const d = req.body;
    if (!d.nama || !d.nama.trim()) return res.status(400).json({ error: 'Nama indikator wajib diisi.' });
    if (d.nama.trim().length > 200) return res.status(400).json({ error: 'Nama indikator maksimal 200 karakter.' });
    if (!d.unit) return res.status(400).json({ error: 'Pilih unit pelayanan.' });
    if (d.unit.length > 200) return res.status(400).json({ error: 'Unit pelayanan maksimal 200 karakter.' });
    const { data, error } = await supabase
      .from('indicators')
      .insert({
        klaster: klasterNum,
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

router.put('/:id', async (req, res) => {
  try {
    const d = req.body;
    if (!d.nama || !d.nama.trim()) return res.status(400).json({ error: 'Nama indikator wajib diisi.' });
    if (d.nama.trim().length > 200) return res.status(400).json({ error: 'Nama indikator maksimal 200 karakter.' });
    if (!d.unit) return res.status(400).json({ error: 'Pilih unit pelayanan.' });
    if (d.unit.length > 200) return res.status(400).json({ error: 'Unit pelayanan maksimal 200 karakter.' });
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

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('indicators').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Indikator dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
