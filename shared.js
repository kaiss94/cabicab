// ═══════════════════════════════════════════════════════════
//  CABICAB — shared.js
//  Logique commune : prix, zones géo, autocomplete adresses
// ═══════════════════════════════════════════════════════════

// ── Véhicules ────────────────────────────────────────────────
const VEHICLES = [
  { id: 'van',     name: 'VAN',     icon: '🚐', pax: 7, bags: 6 },
  { id: 'suv',     name: 'SUV',     icon: '🚙', pax: 4, bags: 4 },
  { id: 'berline', name: 'Berline', icon: '🚗', pax: 3, bags: 2 },
];
const V_MAP = Object.fromEntries(VEHICLES.map(v => [v.id, v]));
const PRICE_KEYS = { van: 'v', suv: 's', berline: 'b' };

// ── Tarifs par défaut ─────────────────────────────────────────
const DEFAULT_PRICES = {
  'PARIS-CDG':         { b: 55,  s: 70,  v: 95  },
  'PARIS-ORLY':        { b: 45,  s: 58,  v: 80  },
  'PARIS-BEAUVAIS':    { b: 110, s: 135, v: 170 },
  'CDG-ORLY':          { b: 80,  s: 95,  v: 120 },
  'PARIS-DISNEY':      { b: 65,  s: 80,  v: 110 },
  'PARIS-ASTERIX':     { b: 85,  s: 100, v: 130 },
  'CDG-DISNEY':        { b: 55,  s: 68,  v: 90  },
  'CDG-ASTERIX':       { b: 45,  s: 58,  v: 78  },
  'ORLY-DISNEY':       { b: 70,  s: 88,  v: 115 },
  'ORLY-ASTERIX':      { b: 95,  s: 118, v: 155 },
  'BEAUVAIS-DISNEY':   { b: 115, s: 140, v: 185 },
  'BEAUVAIS-ASTERIX':  { b: 90,  s: 110, v: 145 },
  'PARIS-VERSAILLES':  { b: 60,  s: 75,  v: 95  },
  'PARIS-LADEFENSE':   { b: 45,  s: 58,  v: 75  },
  'PARIS-GARE':        { b: 35,  s: 45,  v: 60  },
  // Intra-Paris
  'PARIS-PARIS':       { b: 25,  s: 35,  v: 50  },
  // Île-de-France (petite couronne)
  'PARIS-DEP92':       { b: 45,  s: 58,  v: 80  },  // Hauts-de-Seine
  'PARIS-DEP93':       { b: 50,  s: 65,  v: 88  },  // Seine-Saint-Denis
  'PARIS-DEP94':       { b: 48,  s: 62,  v: 85  },  // Val-de-Marne
  // Île-de-France (grande couronne)
  'PARIS-DEP77':       { b: 70,  s: 88,  v: 115 },  // Seine-et-Marne
  'PARIS-DEP78':       { b: 60,  s: 75,  v: 100 },  // Yvelines
  'PARIS-DEP91':       { b: 65,  s: 82,  v: 108 },  // Essonne
  'PARIS-DEP95':       { b: 55,  s: 70,  v: 92  },  // Val-d'Oise
};

// Labels lisibles pour l'admin
const ROUTE_LABELS = {
  'PARIS-CDG':        'Paris ↔ CDG (Roissy)',
  'PARIS-ORLY':       'Paris ↔ Orly',
  'PARIS-BEAUVAIS':   'Paris ↔ Beauvais',
  'CDG-ORLY':         'CDG ↔ Orly',
  'PARIS-DISNEY':     'Paris ↔ Disneyland',
  'PARIS-ASTERIX':    'Paris ↔ Parc Astérix',
  'CDG-DISNEY':       'CDG ↔ Disneyland',
  'CDG-ASTERIX':      'CDG ↔ Parc Astérix',
  'ORLY-DISNEY':      'Orly ↔ Disneyland',
  'ORLY-ASTERIX':     'Orly ↔ Parc Astérix',
  'BEAUVAIS-DISNEY':  'Beauvais ↔ Disneyland',
  'BEAUVAIS-ASTERIX': 'Beauvais ↔ Parc Astérix',
  'PARIS-VERSAILLES': 'Paris ↔ Versailles',
  'PARIS-LADEFENSE':  'Paris ↔ La Défense',
  'PARIS-GARE':       'Paris ↔ Gares parisiennes',
  'PARIS-PARIS':      'Paris ↔ Paris (intra-muros)',
  'PARIS-DEP92':      'Paris ↔ Hauts-de-Seine (92)',
  'PARIS-DEP93':      'Paris ↔ Seine-Saint-Denis (93)',
  'PARIS-DEP94':      'Paris ↔ Val-de-Marne (94)',
  'PARIS-DEP77':      'Paris ↔ Seine-et-Marne (77)',
  'PARIS-DEP78':      'Paris ↔ Yvelines (78)',
  'PARIS-DEP91':      'Paris ↔ Essonne (91)',
  'PARIS-DEP95':      'Paris ↔ Val-d\'Oise (95)',
};

// ── Gestion des prix (localStorage) ──────────────────────────
const LS_KEY = 'cabicab_prices';

function getPrices() {
  try {
    const saved = localStorage.getItem(LS_KEY);
    if (saved) return { ...DEFAULT_PRICES, ...JSON.parse(saved) };
  } catch (e) {}
  return { ...DEFAULT_PRICES };
}

function savePrices(prices) {
  localStorage.setItem(LS_KEY, JSON.stringify(prices));
}

function resetPrices() {
  localStorage.removeItem(LS_KEY);
}

// ── Zones géographiques ───────────────────────────────────────
// Chaque zone a un centre (lat/lon) et un rayon en mètres.
// Ordre important : du plus précis au plus large.
const ZONES_GEO = [
  { id: 'CDG',        name: 'Roissy CDG',       lat: 49.0097, lon: 2.5477,  r: 6000  },
  { id: 'ORLY',       name: 'Orly',              lat: 48.7262, lon: 2.3659,  r: 5000  },
  { id: 'BEAUVAIS',   name: 'Beauvais',          lat: 49.4544, lon: 2.1127,  r: 8000  },
  { id: 'DISNEY',     name: 'Disneyland Paris',  lat: 48.8722, lon: 2.7760,  r: 4000  },
  { id: 'ASTERIX',    name: 'Parc Astérix',      lat: 49.1362, lon: 2.5742,  r: 3000  },
  { id: 'VERSAILLES', name: 'Versailles',        lat: 48.8014, lon: 2.1301,  r: 5000  },
  { id: 'LADEFENSE',  name: 'La Défense',        lat: 48.8924, lon: 2.2358,  r: 2500  },
  // Gares parisiennes (rayon serré autour de chacune)
  { id: 'GARE',       name: 'Gare du Nord',      lat: 48.8809, lon: 2.3553,  r: 800   },
  { id: 'GARE',       name: 'Gare de Lyon',       lat: 48.8448, lon: 2.3735,  r: 800   },
  { id: 'GARE',       name: 'Gare Montparnasse',  lat: 48.8408, lon: 2.3188,  r: 800   },
  { id: 'GARE',       name: 'Gare de l\'Est',     lat: 48.8765, lon: 2.3591,  r: 800   },
  { id: 'GARE',       name: 'Gare Saint-Lazare',  lat: 48.8757, lon: 2.3248,  r: 800   },
  // Paris en dernier (grand rayon = fallback si rien d'autre)
  { id: 'PARIS',      name: 'Paris',             lat: 48.8566, lon: 2.3522,  r: 22000 },
  // Départements IDF — après PARIS pour ne pas masquer les zones spécifiques
  { id: 'DEP92', name: 'Hauts-de-Seine',    lat: 48.8400, lon: 2.2200, r: 18000 },
  { id: 'DEP93', name: 'Seine-Saint-Denis', lat: 48.9100, lon: 2.4700, r: 20000 },
  { id: 'DEP94', name: 'Val-de-Marne',      lat: 48.7800, lon: 2.4700, r: 20000 },
  { id: 'DEP77', name: 'Seine-et-Marne',    lat: 48.6000, lon: 2.9500, r: 55000 },
  { id: 'DEP78', name: 'Yvelines',          lat: 48.7800, lon: 1.8300, r: 45000 },
  { id: 'DEP91', name: 'Essonne',           lat: 48.5300, lon: 2.3000, r: 35000 },
  { id: 'DEP95', name: 'Val-d\'Oise',       lat: 49.0700, lon: 2.1500, r: 35000 },
];

// Destinations favorites affichées en priorité dans l'autocomplete
const FAVORITES = [
  { label: 'Aéroport Roissy-CDG',    sublabel: 'Tous terminaux · Val-d\'Oise', zone: 'CDG',        lat: 49.0097, lon: 2.5477  },
  { label: 'Aéroport Orly',          sublabel: 'Orly 1, 2, 3 & 4 · Essonne',  zone: 'ORLY',       lat: 48.7262, lon: 2.3659  },
  { label: 'Aéroport Beauvais',       sublabel: 'Beauvais Tillé · Oise',        zone: 'BEAUVAIS',   lat: 49.4544, lon: 2.1127  },
  { label: 'Disneyland Paris',        sublabel: 'Marne-la-Vallée',              zone: 'DISNEY',     lat: 48.8722, lon: 2.7760  },
  { label: 'Parc Astérix',            sublabel: 'Plailly · Oise',               zone: 'ASTERIX',    lat: 49.1362, lon: 2.5742  },
  { label: 'Gare du Nord',            sublabel: 'Paris 10e',                    zone: 'GARE',       lat: 48.8809, lon: 2.3553  },
  { label: 'Gare de Lyon',            sublabel: 'Paris 12e',                    zone: 'GARE',       lat: 48.8448, lon: 2.3735  },
  { label: 'Gare Montparnasse',       sublabel: 'Paris 15e',                    zone: 'GARE',       lat: 48.8408, lon: 2.3188  },
  { label: 'La Défense',              sublabel: 'Hauts-de-Seine',               zone: 'LADEFENSE',  lat: 48.8924, lon: 2.2358  },
  { label: 'Versailles',              sublabel: 'Yvelines',                     zone: 'VERSAILLES', lat: 48.8014, lon: 2.1301  },
];

const ZONE_NAMES = {
  CDG: 'CDG', ORLY: 'Orly', BEAUVAIS: 'Beauvais',
  DISNEY: 'Disneyland', ASTERIX: 'Parc Astérix',
  PARIS: 'Paris', GARE: 'Gare', VERSAILLES: 'Versailles', LADEFENSE: 'La Défense',
  DEP92: 'Hauts-de-Seine (92)', DEP93: 'Seine-Saint-Denis (93)',
  DEP94: 'Val-de-Marne (94)',   DEP77: 'Seine-et-Marne (77)',
  DEP78: 'Yvelines (78)',       DEP91: 'Essonne (91)',
  DEP95: 'Val-d\'Oise (95)',
};

// ── Géométrie ─────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const φ1 = lat1 * Math.PI / 180, φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function detectZone(lat, lon) {
  let best = null, bestDist = Infinity;
  for (const z of ZONES_GEO) {
    const d = haversine(lat, lon, z.lat, z.lon);
    if (d <= z.r && d < bestDist) { best = z.id; bestDist = d; }
  }
  return best; // null si hors zone connue
}

// Détecte la zone IDF d'après un code postal (5 chiffres)
function detectZoneFromPostcode(postcode) {
  if (!postcode) return null;
  const cp = String(postcode).replace(/\s/g, '');
  const dep = cp.substring(0, 2);
  const dep3 = cp.substring(0, 3);
  // Paris
  if (dep === '75') return 'PARIS';
  // CDG (codes 95xxx proches de l'aéroport) — traité par GPS
  // Orly (codes 94547 etc.) — traité par GPS
  // Beauvais
  if (cp.startsWith('60000') || cp === '60000') return 'BEAUVAIS';
  // Departments IDF
  const IDF_MAP = { '77': 'DEP77', '78': 'DEP78', '91': 'DEP91', '92': 'DEP92', '93': 'DEP93', '94': 'DEP94', '95': 'DEP95' };
  return IDF_MAP[dep] || null;
}

// ── Détection de zone par texte (fallback sans GPS) ──────────
function guessZoneFromText(txt) {
  if (!txt) return null;
  const t = txt.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/cdg|roissy|charles.?de.?gaulle|terminal\s?[123]/.test(t)) return 'CDG';
  if (/orly/.test(t)) return 'ORLY';
  if (/beauvais/.test(t)) return 'BEAUVAIS';
  if (/disney|disneyland|marne.?la.?vallee|val.?d.?europe/.test(t)) return 'DISNEY';
  if (/asterix|plailly/.test(t)) return 'ASTERIX';
  if (/versailles/.test(t)) return 'VERSAILLES';
  if (/defense|la.?defense/.test(t)) return 'LADEFENSE';
  if (/gare.?du.?nord|gare.?de.?lyon|montparnasse|gare.?de.?l.?est|saint.?lazare/.test(t)) return 'GARE';
  if (/\bparis\b|75\d{3}|75\s?\d{2}/.test(t)) return 'PARIS';
  // Départements IDF par numéro ou nom
  if (/\b77\b|seine.?et.?marne|melun|meaux|fontainebleau|chelles/.test(t)) return 'DEP77';
  if (/\b78\b|yvelines|versailles|saint.?germain.?en.?laye|rambouillet|mantes/.test(t)) return 'DEP78';
  if (/\b91\b|essonne|evry|massy|corbeil|longjumeau|palaiseau/.test(t)) return 'DEP91';
  if (/\b92\b|hauts.?de.?seine|boulogne|nanterre|levallois|neuilly|issy|clamart|colombes/.test(t)) return 'DEP92';
  if (/\b93\b|seine.?saint.?denis|saint.?denis|montreuil|aubervilliers|bobigny|pantin/.test(t)) return 'DEP93';
  if (/\b94\b|val.?de.?marne|vincennes|creteil|ivry|vitry|nogent/.test(t)) return 'DEP94';
  if (/\b95\b|val.?d.?oise|cergy|pontoise|argenteuil|sarcelles|enghien/.test(t)) return 'DEP95';
  return null;
}

// ── Recherche de clé tarifaire ────────────────────────────────
// zA, zB peuvent être des IDs de zone ('CDG', 'PARIS'…) ou null.
// On essaie toutes les combinaisons utiles, y compris PARIS implicite.
function findRouteKey(zA, zB) {
  if (!zA && !zB) return null;
  const prices = getPrices();

  const candidates = [];
  if (zA && zB) {
    candidates.push(zA + '-' + zB, zB + '-' + zA);
  }
  // Si une seule zone est connue, essayer avec PARIS
  if (zA && !zB) {
    candidates.push('PARIS-' + zA, zA + '-PARIS');
  }
  if (zB && !zA) {
    candidates.push('PARIS-' + zB, zB + '-PARIS');
  }
  // Dans tous les cas, essayer aussi avec PARIS comme zone implicite
  // (quand l'une des zones est PARIS, l'autre pourrait être une destination)
  if (zA && zB) {
    candidates.push('PARIS-' + zA, 'PARIS-' + zB, zA + '-PARIS', zB + '-PARIS');
  }

  return candidates.find(k => prices[k]) || null;
}

function vehiclePrice(vehicleId, routeKey) {
  if (!routeKey) return null;
  return getPrices()[routeKey]?.[PRICE_KEYS[vehicleId]] ?? null;
}

// ── Autocomplete API adresse ──────────────────────────────────
const AC_API = 'https://api-adresse.data.gouv.fr/search/';

// Style CSS injecté une seule fois
function injectAutocompleteStyles() {
  if (document.getElementById('cabicab-ac-style')) return;
  const style = document.createElement('style');
  style.id = 'cabicab-ac-style';
  style.textContent = `
    .ac-wrap { position: relative; }
    .ac-dropdown {
      position: absolute; top: calc(100% + 4px); left: 0; right: 0; z-index: 200;
      background: #fff; border: 1.5px solid #d9e2ec; border-radius: 10px;
      box-shadow: 0 8px 32px rgba(26,43,74,0.15); overflow: hidden; display: none;
    }
    .ac-section-title {
      font-size: 0.7rem; font-weight: 700; letter-spacing: 0.09em;
      text-transform: uppercase; color: #7a8a9a;
      padding: 8px 14px 4px; background: #f5f7fa;
      border-bottom: 1px solid #d9e2ec;
    }
    .ac-item {
      display: flex; align-items: center; gap: 10px;
      padding: 10px 14px; cursor: pointer; transition: background .12s;
      border-bottom: 1px solid #f0f4f8;
    }
    .ac-item:last-child { border-bottom: none; }
    .ac-item:hover, .ac-item.focused { background: #f0f6fb; }
    .ac-item-icon { font-size: 1rem; flex-shrink: 0; width: 20px; text-align: center; color: #4a5e7a; }
    .ac-item-label { font-size: 0.88rem; color: #1a2b4a; font-weight: 500; }
    .ac-item-sub   { font-size: 0.75rem; color: #7a8a9a; margin-top: 1px; }
    .ac-zone-badge {
      margin-left: auto; flex-shrink: 0;
      font-size: 0.68rem; font-weight: 700; padding: 2px 8px; border-radius: 10px;
      background: rgba(26,43,74,0.08); color: #1a2b4a;
    }
    .ac-selected-badge {
      display: inline-flex; align-items: center; gap: 5px;
      background: rgba(200,168,90,0.15); border: 1px solid rgba(200,168,90,0.3);
      color: #8a5e10; font-size: 0.75rem; font-weight: 600;
      padding: 3px 9px; border-radius: 20px; margin-top: 5px;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Initialise l'autocomplete sur un input.
 * @param {string} inputId  - id de l'<input>
 * @param {function} onSelect - callback({ label, lat, lon, zone })
 */
function setupAutocomplete(inputId, onSelect) {
  injectAutocompleteStyles();
  const input = document.getElementById(inputId);
  if (!input) return;

  // Wrap
  const wrap = document.createElement('div');
  wrap.className = 'ac-wrap';
  input.parentNode.insertBefore(wrap, input);
  wrap.appendChild(input);

  const dropdown = document.createElement('div');
  dropdown.className = 'ac-dropdown';
  wrap.appendChild(dropdown);

  // Badge sous l'input
  const badge = document.createElement('div');
  badge.style.height = '22px';
  wrap.appendChild(badge);

  let focused = -1;
  let currentItems = [];
  let debounce;

  function showBadge(zone) {
    if (zone && ZONE_NAMES[zone]) {
      badge.innerHTML = `<span class="ac-selected-badge">✓ Zone détectée : ${ZONE_NAMES[zone]}</span>`;
    } else {
      badge.innerHTML = '';
    }
  }

  function renderItems(items) {
    currentItems = items;
    focused = -1;
    if (!items.length) { dropdown.style.display = 'none'; return; }
    dropdown.innerHTML = '';

    // Séparer favoris et résultats API
    const favItems  = items.filter(i => i._type === 'fav');
    const apiItems  = items.filter(i => i._type === 'api');

    function appendSection(title, list) {
      if (!list.length) return;
      const sec = document.createElement('div');
      sec.className = 'ac-section-title';
      sec.textContent = title;
      dropdown.appendChild(sec);
      list.forEach(item => {
        const el = document.createElement('div');
        el.className = 'ac-item';
        el.innerHTML = `
          <span class="ac-item-icon">${item.zone ? '📍' : '🔍'}</span>
          <div>
            <div class="ac-item-label">${item.label}</div>
            ${item.sublabel ? `<div class="ac-item-sub">${item.sublabel}</div>` : ''}
          </div>
          ${item.zone ? `<span class="ac-zone-badge">${ZONE_NAMES[item.zone] || item.zone}</span>` : ''}
        `;
        el.addEventListener('mousedown', e => {
          e.preventDefault();
          select(item);
        });
        dropdown.appendChild(el);
      });
    }

    if (favItems.length)  appendSection('Destinations populaires', favItems);
    if (apiItems.length)  appendSection('Adresses', apiItems);

    dropdown.style.display = 'block';
    updateFocus();
  }

  function updateFocus() {
    dropdown.querySelectorAll('.ac-item').forEach((el, i) => {
      el.classList.toggle('focused', i === focused);
    });
  }

  function select(item) {
    input.value = item.label;
    dropdown.style.display = 'none';
    showBadge(item.zone);
    onSelect({ label: item.label, lat: item.lat, lon: item.lon, zone: item.zone });
  }

  // Filtre les favoris selon la saisie
  function matchFavorites(q) {
    const lq = q.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return FAVORITES.filter(f =>
      f.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(lq) ||
      (f.sublabel || '').toLowerCase().includes(lq)
    ).map(f => ({ ...f, _type: 'fav' }));
  }

  input.addEventListener('input', () => {
    clearTimeout(debounce);
    const q = input.value.trim();

    if (q.length === 0) {
      const allFavs = FAVORITES.slice(0, 6).map(f => ({ ...f, _type: 'fav' }));
      renderItems(allFavs);
      badge.innerHTML = '';
      return;
    }

    const favs = matchFavorites(q);

    if (q.length < 3) {
      renderItems(favs.slice(0, 5));
      return;
    }

    // Appel API avec debounce
    debounce = setTimeout(async () => {
      try {
        const url = `${AC_API}?q=${encodeURIComponent(q)}&limit=5&autocomplete=1`;
        const resp = await fetch(url);
        const data = await resp.json();
        const apiResults = (data.features || []).map(f => {
          const lat = f.geometry.coordinates[1];
          const lon = f.geometry.coordinates[0];
          const zone = detectZone(lat, lon)
                    || detectZoneFromPostcode(f.properties.postcode)
                    || null;
          return {
            label:    f.properties.label,
            sublabel: f.properties.city !== f.properties.name ? f.properties.city : '',
            lat, lon, zone, _type: 'api',
          };
        });
        renderItems([...favs.slice(0, 3), ...apiResults]);
      } catch (e) {
        renderItems(favs);
      }
    }, 280);
  });

  input.addEventListener('focus', () => {
    if (!input.value.trim()) {
      renderItems(FAVORITES.slice(0, 6).map(f => ({ ...f, _type: 'fav' })));
    }
  });

  input.addEventListener('keydown', e => {
    const items = dropdown.querySelectorAll('.ac-item');
    if (e.key === 'ArrowDown') {
      e.preventDefault(); focused = Math.min(focused + 1, items.length - 1); updateFocus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); focused = Math.max(focused - 1, 0); updateFocus();
    } else if (e.key === 'Enter' && focused >= 0) {
      e.preventDefault();
      if (currentItems[focused]) select(currentItems[focused]);
    } else if (e.key === 'Escape') {
      dropdown.style.display = 'none';
    }
  });

  document.addEventListener('click', e => {
    if (!wrap.contains(e.target)) dropdown.style.display = 'none';
  });

  return { showBadge };
}
