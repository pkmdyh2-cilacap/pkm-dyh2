const { Router } = require('express');
const { supabaseAdmin: supabase } = require('../config/supabase');

const router = Router();

router.get('/', async (req, res) => {
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

module.exports = router;
