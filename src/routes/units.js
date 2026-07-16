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

router.post('/', async (req, res) => {
  try {
    const klasterRaw = req.query.klaster;
    const klaster = klasterRaw ?? '5';
    const klasterNum = parseInt(klaster);
    if (isNaN(klasterNum) || klasterNum < 1 || klasterNum > 5) {
      return res.status(400).json({ error: 'Klaster harus angka 1-5' });
    }
    const { nama } = req.body;
    if (!nama || !nama.trim()) return res.status(400).json({ error: 'Nama unit wajib diisi.' });
    if (nama.trim().length > 200) return res.status(400).json({ error: 'Nama unit maksimal 200 karakter.' });
    const { data: existing } = await supabase
      .from('units')
      .select('id')
      .or(`klaster.eq.${klaster},klaster.is.null`)
      .ilike('nama', nama.trim());
    if (existing && existing.length > 0) return res.status(400).json({ error: 'Unit itu sudah ada.' });
    const { data, error } = await supabase
      .from('units')
      .insert({ klaster: klasterNum, nama: nama.trim() })
      .select();
    if (error) throw error;
    res.status(201).json({ id: data[0].id, message: 'Unit ditambahkan.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('units').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Unit dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
