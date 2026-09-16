// api/save-prices.js — Vercel Serverless Function
// Sauvegarde les tarifs en DB. Réservé aux utilisateurs authentifiés Supabase.
// Le client envoie le JWT Supabase dans le header Authorization: Bearer <token>

const { createClient } = require('@supabase/supabase-js');

function getServiceClient() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );
}

// La clé anon est publique (déjà embarquée dans le front).
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFteHFqY3F2dnRmZXdhcmlkb2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc3Mzg2ODgsImV4cCI6MjA1MzMxNDY4OH0.oF6P2a4DCgj2nLU88dTYkRv1h7mxIY1tXxt-cHh2GPY';

function getAnonClient() {
  return createClient(
    process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY,
    { auth: { persistSession: false } }
  );
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  // Vérification du token JWT Supabase
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    // Vérifier que le token correspond à un utilisateur authentifié
    const anonClient = getAnonClient();
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Non autorisé' });
    }

    // Le corps contient l'objet prices : { ROUTE_KEY: { b, s, v }, ... }
    const prices = req.body;
    if (!prices || typeof prices !== 'object') {
      return res.status(400).json({ error: 'Corps invalide' });
    }

    // Construire les upserts
    const rows = Object.entries(prices).map(([route_key, p]) => ({
      route_key,
      berline:    Number(p.b) || 0,
      suv:        Number(p.s) || 0,
      van:        Number(p.v) || 0,
      updated_at: new Date().toISOString(),
    }));

    if (rows.length === 0) return res.status(400).json({ error: 'Aucun tarif fourni' });

    const supabase = getServiceClient();
    const { error } = await supabase
      .from('prices')
      .upsert(rows, { onConflict: 'route_key' });

    if (error) {
      console.error('save-prices error:', error.message);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ ok: true, updated: rows.length });
  } catch (err) {
    console.error('save-prices exception:', err.message);
    return res.status(500).json({ error: err.message });
  }
};
