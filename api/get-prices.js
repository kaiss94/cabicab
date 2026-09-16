// api/get-prices.js — Vercel Serverless Function
// Lecture publique des tarifs depuis Supabase.
// Aucune authentification requise.

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('prices')
      .select('route_key, berline, suv, van');

    if (error) {
      console.error('get-prices error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    // Transforme le tableau de lignes en objet { ROUTE_KEY: { b, s, v } }
    const prices = {};
    for (const row of data) {
      prices[row.route_key] = {
        b: Number(row.berline),
        s: Number(row.suv),
        v: Number(row.van),
      };
    }

    return res.status(200).json(prices);
  } catch (err) {
    console.error('get-prices exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
