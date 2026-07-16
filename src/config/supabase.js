const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_URL, SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_KEY wajib diisi di file .env');
  if (process.env.VERCEL !== '1') process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

module.exports = { supabase, supabaseAdmin };
