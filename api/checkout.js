// api/checkout.js — Vercel Serverless Function
// Crée une session Stripe Checkout et retourne l'URL de paiement.
//
// Variables d'environnement requises (à configurer dans Vercel → Settings → Environment Variables) :
//   STRIPE_SECRET_KEY   → sk_live_xxxx  (ou sk_test_xxxx pour les tests)

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
  // CORS — autorise les requêtes depuis votre domaine
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Méthode non autorisée' });
  }

  try {
    const { amount, currency = 'eur', description, metadata = {}, reservation_id = '' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    // Déterminer l'origine pour les URLs de retour
    const origin =
      req.headers.origin ||
      req.headers.referer?.replace(/\/$/, '') ||
      'https://cabicab.fr';

    // Paramètres de retour vers reservation.html en cas d'annulation
    const cancelParams = new URLSearchParams({
      from:  metadata.from  || '',
      to:    metadata.to    || '',
      date:  metadata.date  || '',
      time:  metadata.time  || '',
      pax:   metadata.pax   || '1',
      bags:  metadata.bags  || '0',
    });

    const session = await stripe.checkout.sessions.create({
      // Moyens de paiement : carte bancaire + PayPal
      // PayPal doit être activé dans votre dashboard Stripe → Settings → Payment methods
      payment_method_types: ['card', 'paypal'],

      line_items: [
        {
          price_data: {
            currency,
            product_data: {
              name: description || 'Course CABICAB',
              description: metadata.from && metadata.to
                ? `${metadata.from} → ${metadata.to} · ${metadata.date || ''} ${metadata.time || ''}`.trim()
                : 'Transfert VTC Paris',
              images: ['https://cabicab.fr/logo-horizontal-light.svg'],
            },
            unit_amount: Math.round(parseFloat(amount) * 100), // centimes
          },
          quantity: 1,
        },
      ],

      mode: 'payment',

      // Stripe envoie automatiquement un reçu si l'email est fourni
      // (à activer dans Stripe → Settings → Emails)

      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}&from=${encodeURIComponent(metadata.from || '')}&to=${encodeURIComponent(metadata.to || '')}&date=${encodeURIComponent(metadata.date || '')}&time=${encodeURIComponent(metadata.time || '')}&vehicle=${encodeURIComponent(metadata.vehicle || '')}&amount=${amount}&pax=${encodeURIComponent(metadata.pax || '')}&bags=${encodeURIComponent(metadata.bags || '')}&booking_ref=${encodeURIComponent(metadata.booking_ref || '')}`,
      cancel_url:  `${origin}/reservation.html?${cancelParams.toString()}`,

      // Métadonnées visibles dans le dashboard Stripe
      metadata: {
        reservation_id: reservation_id || '',
        from:    metadata.from    || '',
        to:      metadata.to      || '',
        date:    metadata.date    || '',
        time:    metadata.time    || '',
        pax:     String(metadata.pax  || ''),
        bags:    String(metadata.bags || ''),
        vehicle: metadata.vehicle || '',
      },

      // Localisation en français
      locale: 'fr',
    });

    return res.status(200).json({ url: session.url });

  } catch (err) {
    console.error('Stripe error:', err.message);
    return res.status(500).json({ error: 'Erreur lors de la création du paiement.' });
  }
};
