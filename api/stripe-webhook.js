// api/stripe-webhook.js — Vercel Serverless Function
// Écoute les événements Stripe et met à jour le statut de la réservation.
//
// Variables d'environnement requises :
//   STRIPE_SECRET_KEY      → sk_live_xxxx
//   STRIPE_WEBHOOK_SECRET  → whsec_xxxx  (Stripe Dashboard → Webhooks → Signing secret)
//   SUPABASE_URL           → https://xxxx.supabase.co
//   SUPABASE_SERVICE_KEY   → clé service_role
//
// Événement écouté : checkout.session.completed
//
// Dans Stripe Dashboard → Webhooks, créer un endpoint vers :
//   https://votre-domaine.vercel.app/api/stripe-webhook
// et cocher l'événement : checkout.session.completed

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

function getSupabase() {
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    { auth: { persistSession: false } }
  );
}

// Vercel parse le body en JSON par défaut — on doit le recevoir brut pour valider la signature
// Désactive le body parser de Vercel pour récupérer le buffer brut
module.exports.config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end',  ()    => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  const sig     = req.headers['stripe-signature'];
  const rawBody = await getRawBody(req);

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature error:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;

    const reservationId = session.metadata?.reservation_id;
    if (!reservationId) {
      console.warn('Webhook: pas de reservation_id dans les métadonnées.');
      return res.status(200).json({ received: true });
    }

    const supabase = getSupabase();
    const { error } = await supabase
      .from('reservations')
      .update({
        status:                 'paid',
        stripe_session_id:      session.id,
        stripe_payment_intent:  session.payment_intent || null,
      })
      .eq('id', reservationId);

    if (error) {
      console.error('Supabase update error:', error.message);
      // On retourne 200 quand même pour éviter que Stripe ne re-tente indéfiniment
      return res.status(200).json({ received: true, warning: error.message });
    }

    console.log(`Réservation ${reservationId} marquée comme payée.`);
  }

  return res.status(200).json({ received: true });
};
