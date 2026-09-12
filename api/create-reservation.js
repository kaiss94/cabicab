// api/create-reservation.js — Vercel Serverless Function
// Enregistre une réservation en DB (statut "pending") avant le paiement.
//
// Variables d'environnement requises (Vercel → Settings → Environment Variables) :
//   SUPABASE_URL         → https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY → clé service_role (Supabase → Settings → API)

const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );
}

// Génère une référence lisible : CAB-YYYYMMDD-XXXX
function generateBookingRef() {
  const now  = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.random().toString(36).toUpperCase().slice(2, 6);
  return `CAB-${date}-${rand}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const {
      // Trajet
      from, to, date, time, vehicle, pax, bags, amount,
      // Client
      client_name, client_email, client_phone,
      flight_number, special_requests,
    } = req.body;

    // Validation minimale
    if (!client_name?.trim())  return res.status(400).json({ error: 'Nom requis' });
    if (!client_email?.trim()) return res.status(400).json({ error: 'Email requis' });
    if (!client_phone?.trim()) return res.status(400).json({ error: 'Téléphone requis' });

    const supabase   = getSupabase();
    const bookingRef = generateBookingRef();

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        booking_ref:      bookingRef,
        from_location:    from    || null,
        to_location:      to      || null,
        trip_date:        date    || null,
        trip_time:        time    || null,
        vehicle:          vehicle || null,
        pax:              parseInt(pax)  || 1,
        bags:             parseInt(bags) || 0,
        amount:           parseFloat(amount) || null,
        client_name:      client_name.trim(),
        client_email:     client_email.trim().toLowerCase(),
        client_phone:     client_phone.trim(),
        flight_number:    flight_number?.trim()      || null,
        special_requests: special_requests?.trim()   || null,
        status:           'pending',
      })
      .select('id, booking_ref')
      .single();

    if (error) {
      console.error('Supabase insert error:', error.message);
      return res.status(500).json({ error: 'Erreur lors de la création de la réservation.' });
    }

    return res.status(200).json({
      reservation_id: data.id,
      booking_ref:    data.booking_ref,
    });

  } catch (err) {
    console.error('create-reservation error:', err.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
};
