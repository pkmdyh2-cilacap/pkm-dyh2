const { Router } = require('express');
const { supabaseAdmin: supabase } = require('../config/supabase');

const router = Router();

router.get('/', async (req, res) => {
  try {
    let query = supabase.from('entries').select('*');
    const klaster = req.query.klaster;
    if (klaster) query = query.or(`klaster.eq.${klaster},klaster.is.null`);
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    const rows = (data || []).map(r => ({ ...r, bor: !!r.bor }));
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
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

router.put('/:id', async (req, res) => {
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

router.delete('/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('entries').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Data dihapus.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
