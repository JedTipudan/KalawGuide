import type { SQLiteDatabase } from 'expo-sqlite';

/**
 * Demo content for Mati City so budgeting, "what is cheapest?" and the business pages
 * have real-looking data on a fresh install. Safe to run on every launch: stable IDs
 * plus INSERT OR IGNORE, so nothing is duplicated and admin edits are never overwritten.
 *
 * Prices are SAMPLE values for the demo, not quotes from the businesses. Where travel guides for Mati
 * publish a figure (e.g. ₱100 consumable entrance in Dahican, ~₱10 at the Sleeping Dinosaur deck,
 * ₱50 at Subangan Museum and Menzi Beach Park, ₱200–300 per person or ~₱4,000 per boat for
 * Pujada Bay island hopping, ₱10 at Pangyan Falls) we used it; the rest are typical local rates. Every price row
 * carries SAMPLE_PRICE_NOTE in `conditions`; Kalaw Assistance reads that and labels the
 * price "estimate" instead of "verified". Contact numbers are left empty on purpose —
 * we never invent a real business's phone number.
 */

export const SAMPLE_PRICE_NOTE = 'Sample price for the KalawGuide demo. Confirm with the business.';
export const DEMO_OWNER_ID = 'seed_owner_demo';

type PriceCategory = 'entrance_fee' | 'room_rate' | 'day_use' | 'per_person' | 'activity_fee' | 'cottage_rental' | 'other';
type Price = [title: string, amount: number, unit: string, category: PriceCategory, description: string];

interface SeedBusiness {
  id: string;
  name: string;
  category: 'accommodation' | 'restaurant' | 'transport' | 'tour_operator';
  description: string;
  barangay: string;
  hours: string;
  lat: number;
  lng: number;
  prices: Price[];
  facilities: [name: string, icon: string][];
}

const BUSINESSES: SeedBusiness[] = [
  // ── Accommodation (photos: assets/images/places) ─────────────────────────────
  {
    id: 'seed_biz_somewhere', name: 'Somewhere in Dahican', category: 'accommodation', barangay: 'Dahican',
    description: 'Wooden cabins under the trees, a short walk to the surf at Dahican Beach. Good for couples and barkadas on a budget.',
    hours: 'Check-in 2:00 PM · Check-out 12:00 NN', lat: 6.9310, lng: 126.2841,
    prices: [
      ['Fan cabin (good for 2)', 1500, 'per room per night', 'room_rate', 'Shared bathroom'],
      ['Air-conditioned cabin (good for 2)', 2500, 'per room per night', 'room_rate', 'Private bathroom'],
      ['Day use', 100, 'per person', 'day_use', 'Beach access and shower'],
    ],
    facilities: [['Beachfront', '🏖'], ['Hammocks', '🌴'], ['Wi-Fi', '📶'], ['Parking', '🅿️']],
  },
  {
    id: 'seed_biz_sheepys', name: "Sheepy's Surfside Beach Resort", category: 'accommodation', barangay: 'Dahican',
    description: 'Native-style cottages around a swimming pool, right beside the Dahican surf break.',
    hours: 'Check-in 2:00 PM · Check-out 12:00 NN', lat: 6.9200, lng: 126.2825,
    prices: [
      ['Standard room (good for 2)', 1800, 'per room per night', 'room_rate', 'Air-conditioned'],
      ['Family room (good for 4)', 3200, 'per room per night', 'room_rate', 'Air-conditioned'],
      ['Pool and beach entrance', 80, 'per person', 'entrance_fee', 'Day guests'],
      ['Open cottage', 500, 'per cottage per day', 'cottage_rental', 'Good for 6–8'],
    ],
    facilities: [['Swimming pool', '🏊'], ['Beachfront', '🏖'], ['Restaurant', '🍽'], ['Parking', '🅿️']],
  },
  {
    id: 'seed_biz_surfsup', name: "Surf's Up Resort", category: 'accommodation', barangay: 'Dahican',
    description: 'Small beachfront resort with a sunset pool deck and surfboard rentals.',
    hours: 'Check-in 2:00 PM · Check-out 11:00 AM', lat: 6.9165, lng: 126.2840,
    prices: [
      ['Deluxe room (good for 2)', 2200, 'per room per night', 'room_rate', 'Pool view'],
      ['Surfboard rental', 300, 'per person per day', 'activity_fee', 'Soft-top boards'],
      ['Surf lesson (1 hour)', 500, 'per person', 'activity_fee', 'With local instructor'],
    ],
    facilities: [['Swimming pool', '🏊'], ['Surfboard rental', '🏄'], ['Wi-Fi', '📶']],
  },
  {
    id: 'seed_biz_dahicansurf', name: 'Dahican Surf Resort', category: 'accommodation', barangay: 'Dahican',
    description: 'Surfer-friendly rooms in a garden setting, home base of local skimboarders.',
    hours: 'Check-in 2:00 PM · Check-out 12:00 NN', lat: 6.9257, lng: 126.2807,
    prices: [
      ['Fan room (good for 2)', 1200, 'per room per night', 'room_rate', 'Shared bathroom, the cheapest bed in Dahican'],
      ['Private room (good for 2)', 1900, 'per room per night', 'room_rate', 'Air-conditioned, private bathroom'],
      ['Skimboard lesson', 400, 'per person', 'activity_fee', '1 hour'],
      ['Consumable entrance', 100, 'per person', 'entrance_fee', 'Day guests; spend it on food and drinks'],
    ],
    facilities: [['Garden', '🌿'], ['Board storage', '🏄'], ['Common kitchen', '🍳']],
  },
  {
    id: 'seed_biz_dahicanbeach', name: 'Dahican Beach Resort', category: 'accommodation', barangay: 'Dahican',
    description: 'Modern villas with a shallow pool and loungers facing the sea.',
    hours: 'Check-in 2:00 PM · Check-out 12:00 NN', lat: 6.9120, lng: 126.2860,
    prices: [
      ['Villa room (good for 2)', 3500, 'per room per night', 'room_rate', 'Breakfast for 2 included'],
      ['Day use with pool', 250, 'per person', 'day_use', 'Includes pool and beach access'],
    ],
    facilities: [['Swimming pool', '🏊'], ['Breakfast', '🍳'], ['Air-conditioning', '❄️'], ['Wi-Fi', '📶']],
  },
  {
    id: 'seed_biz_calma', name: 'CALMA Mati', category: 'accommodation', barangay: 'Pujada Bay area',
    description: 'Hillside resort with a viewing deck over the blue water of Pujada Bay.',
    hours: 'Check-in 2:00 PM · Check-out 12:00 NN', lat: 6.8920, lng: 126.1880,
    prices: [
      ['Bay-view room (good for 2)', 3000, 'per room per night', 'room_rate', 'Balcony'],
      ['Viewing deck entrance', 150, 'per person', 'entrance_fee', 'Consumable at the café'],
    ],
    facilities: [['Sea view deck', '🌅'], ['Café', '☕'], ['Parking', '🅿️']],
  },
  {
    id: 'seed_biz_praia', name: 'PRAIA VISTA', category: 'accommodation', barangay: 'Dahican',
    description: 'Resort with a long lap pool, pine trees and a lawn that runs to the beach.',
    hours: 'Check-in 2:00 PM · Check-out 12:00 NN', lat: 6.9075, lng: 126.2880,
    prices: [
      ['Premier room (good for 2)', 4500, 'per room per night', 'room_rate', 'Breakfast for 2 included'],
      ['Pool day pass', 300, 'per person', 'day_use', '8:00 AM – 5:00 PM'],
    ],
    facilities: [['Swimming pool', '🏊'], ['Beachfront', '🏖'], ['Breakfast', '🍳'], ['Air-conditioning', '❄️']],
  },
  {
    id: 'seed_biz_amery', name: 'The Amery Luxury Palm Villas', category: 'accommodation', barangay: 'Mati City',
    description: 'Private villas, each with its own plunge pool and garden. The splurge option.',
    hours: 'Check-in 3:00 PM · Check-out 12:00 NN', lat: 6.8873, lng: 126.3089,
    prices: [
      ['Pool villa (good for 2)', 9500, 'per room per night', 'room_rate', 'Private plunge pool, breakfast included'],
      ['Extra person', 1200, 'per person per night', 'other', 'Includes breakfast'],
    ],
    facilities: [['Private pool', '🏊'], ['Breakfast', '🍳'], ['Air-conditioning', '❄️'], ['Wi-Fi', '📶']],
  },

  // ── Food ─────────────────────────────────────────────────────────────────────
  {
    id: 'seed_biz_baywalkgrill', name: 'Baywalk Grill & Kinilaw (demo)', category: 'restaurant', barangay: 'Poblacion',
    description: 'Demo listing: grilled seafood and kinilaw, a Davao Oriental favourite, near the Mati baywalk.',
    hours: '10:00 AM – 10:00 PM', lat: 6.9502, lng: 126.2172,
    prices: [
      ['Kinilaw (good for 2)', 180, 'per order', 'other', 'Fresh fish in vinegar and calamansi'],
      ['Grilled fish meal', 220, 'per person', 'per_person', 'With rice and soup'],
      ['Silog breakfast', 110, 'per person', 'per_person', 'Rice, egg and longganisa or tapa'],
    ],
    facilities: [['Dine-in', '🍽'], ['Take-out', '🥡']],
  },
  {
    id: 'seed_biz_seasideeatery', name: 'Dahican Seaside Eatery (demo)', category: 'restaurant', barangay: 'Dahican',
    description: 'Demo listing: carinderia-style home cooking a few steps from the beach. Cheapest meals in the area.',
    hours: '6:00 AM – 8:00 PM', lat: 6.9235, lng: 126.2812,
    prices: [
      ['Budget meal (ulam + rice)', 90, 'per person', 'per_person', 'Choice of 1 viand'],
      ['Seafood meal', 180, 'per person', 'per_person', 'Fish or squid with rice'],
      ['Fresh buko', 50, 'per piece', 'other', 'Young coconut'],
    ],
    facilities: [['Dine-in', '🍽'], ['Beach view', '🌊']],
  },

  // ── Transport ────────────────────────────────────────────────────────────────
  {
    id: 'seed_biz_davaomativan', name: 'Davao–Mati Vans & Buses (demo)', category: 'transport', barangay: 'Poblacion',
    description: 'Demo listing: air-conditioned vans between Davao City (Ecoland) and Mati, about 3 to 4 hours one way.',
    hours: '4:00 AM – 7:00 PM, leaves when full', lat: 6.9560, lng: 126.2080,
    prices: [
      ['Van fare Davao City → Mati', 300, 'per person one way', 'per_person', 'Air-conditioned van'],
      ['Bus fare Davao City → Mati', 230, 'per person one way', 'per_person', 'Ordinary bus, longer trip'],
    ],
    facilities: [['Air-conditioned', '❄️'], ['Luggage space', '🧳']],
  },
  {
    id: 'seed_biz_localrides', name: 'Mati Tricycle & Habal-habal Rides (demo)', category: 'transport', barangay: 'Poblacion',
    description: 'Demo listing: local rides from the city proper to Dahican and the viewpoints. Agree on the fare before riding.',
    hours: '5:00 AM – 9:00 PM', lat: 6.9519, lng: 126.2170,
    prices: [
      ['Tricycle, city proper → Dahican', 150, 'per tricycle one way', 'other', 'Good for up to 4'],
      ['Habal-habal, city proper → Dahican', 80, 'per person one way', 'per_person', 'Motorcycle ride'],
    ],
    facilities: [['Short trips', '🛺']],
  },

  // ── Tours ────────────────────────────────────────────────────────────────────
  {
    id: 'seed_biz_pujadatours', name: 'Pujada Bay Island Hopping (demo)', category: 'tour_operator', barangay: 'Pujada Bay area',
    description: 'Demo listing: boat tours to Waniban Island and Pujada Island with snorkeling stops.',
    hours: '6:00 AM – 4:00 PM, weather permitting', lat: 6.9080, lng: 126.2150,
    prices: [
      ['Island hopping (shared boat)', 250, 'per person', 'activity_fee', 'From Brgy. Tam-isan to Waniban + Pujada Island, about 4 hours'],
      ['Private boat (up to 10)', 4000, 'per boat', 'activity_fee', 'Whole boat for your group, Waniban + Pujada Island'],
      ['Snorkel set rental', 150, 'per person', 'activity_fee', 'Mask, snorkel and vest'],
    ],
    facilities: [['Life vests', '🦺'], ['Snorkel gear', '🤿']],
  },
];

// [name, description, category name, location, lat, lng, estimated fee, featured]
const DESTINATIONS: [string, string, string, string, number, number, number, number][] = [
  ['Sleeping Dinosaur', 'A headland in Pujada Bay shaped like a resting dinosaur, best seen from the roadside viewing deck.', 'Nature', 'Mamali, Mati City', 6.8902, 126.1802, 10, 1],
  ['Waniban Island', 'A small white-sand islet inside Pujada Bay, reached by boat, with clear water for swimming and snorkeling.', 'Beach', 'Pujada Bay, Mati City', 6.8700, 126.2050, 50, 1],
  ['Pujada Island', 'An island at the mouth of Pujada Bay with fine sand and coral reefs, popular on island hopping tours.', 'Beach', 'Pujada, Mati City', 6.7877, 126.2676, 100, 0],
  ['Subangan Museum', 'The provincial museum of Davao Oriental, with exhibits on local culture, history and the Hamiguitan range.', 'Cultural', 'Dahican, Mati City', 6.9442, 126.2483, 50, 0],
  ['Menzi Beach Park & Campsite', 'A shady beachfront park on Pujada Bay with picnic huts and space to pitch a tent.', 'Beach', 'Dafila, Mati City', 6.9275, 126.2809, 50, 0],
  ['Pangyan Falls', 'A small forest waterfall north of Mati, reached by habal-habal and a short hike with a local guide.', 'Nature', 'Lupon, Davao Oriental', 7.0914, 126.1840, 10, 0],
];

// Older demo fees replaced with figures from Mati travel guides — only while nobody has edited or verified them.
// Map positions corrected against OpenStreetMap (v3). Rows are only moved if they still have the old
// seeded position (old latitude), so a location an admin fixed by hand is never overwritten.
const LOCATION_FIXES: [name: string, oldLat: number, lat: number, lng: number, location: string][] = [
  ['Dahican Beach', 6.9333, 6.9243, 126.2809, 'Dahican, Mati City'],
  ['Cape San Agustin', 6.8167, 6.2693, 126.1930, 'Governor Generoso, Davao Oriental'],
  ['Pujada Bay', 6.9500, 6.8537, 126.2418, 'Mati City, Davao Oriental'],
  ['Mount Hamiguitan Range', 7.0833, 6.7400, 126.1819, 'San Isidro, Davao Oriental'],
  ['Aliwagwag Falls', 7.7833, 7.7405, 126.3015, 'Cateel, Davao Oriental'],
  ['Mati City Public Market', 6.9500, 6.9568, 126.2075, 'Mati City, Davao Oriental'],
  ['Sleeping Dinosaur', 6.8990, 6.8902, 126.1802, 'Mamali, Mati City'],
  ['Waniban Island', 6.8870, 6.8700, 126.2050, 'Pujada Bay, Mati City'],
  ['Pujada Island', 6.8580, 6.7877, 126.2676, 'Pujada, Mati City'],
  ['Subangan Museum', 6.9470, 6.9442, 126.2483, 'Dahican, Mati City'],
  ['Menzi Beach Park & Campsite', 6.9330, 6.9275, 126.2809, 'Dafila, Mati City'],
  ['Pangyan Falls', 6.8850, 7.0914, 126.1840, 'Lupon, Davao Oriental'],
];

const FEE_UPDATES: [name: string, from: number, to: number][] = [
  ['Dahican Beach', 0, 100],
  ['Sleeping Dinosaur', 20, 10],
  ['Waniban Island', 30, 50],
];

export async function seedDemoContent(db: SQLiteDatabase, ts: string): Promise<void> {
  // Skip if this version (v3: Mati prices + OpenStreetMap positions) of the demo content is already in place.
  const done = await db.getFirstAsync<{ id: string }>(
    `SELECT id FROM businesses WHERE id = 'seed_biz_somewhere' AND ABS(latitude - 6.931) < 0.00001
       AND EXISTS (SELECT 1 FROM listing_prices WHERE id = 'seed_biz_dahicansurf_p3')`
  );
  if (done) return;

  await db.runAsync(
    `INSERT OR IGNORE INTO users (id, email, display_name, role, provider, status, created_at, updated_at)
     VALUES (?, 'demo-owner@kalawguide.app', 'KalawGuide Demo Listings', 'business_owner', 'email', 'active', ?, ?)`,
    [DEMO_OWNER_ID, ts, ts]
  );

  for (const [name, desc, catName, loc, lat, lng, fee, featured] of DESTINATIONS) {
    const exists = await db.getFirstAsync<{ id: string }>('SELECT id FROM destinations WHERE name = ?', [name]);
    if (exists) continue;
    const cat = await db.getFirstAsync<{ id: string }>('SELECT id FROM destination_categories WHERE name = ?', [catName]);
    if (!cat) continue;
    const id = 'seed_dest_' + name.toLowerCase().replace(/[^a-z]+/g, '_');
    await db.runAsync(
      `INSERT OR IGNORE INTO destinations (id,name,description,category_id,location,latitude,longitude,estimated_fee,fee_verified,is_featured,is_active,image_urls,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,0,?,1,'[]',?,?)`,
      [id, name, desc, cat.id, loc, lat, lng, fee, featured, ts, ts]
    );
  }

  for (const b of BUSINESSES) {
    await db.runAsync(
      `INSERT OR IGNORE INTO businesses (id, owner_id, name, description, category, address, municipality, barangay,
         operating_hours, image_urls, verification_status, verification_note, is_active, latitude, longitude, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Mati City', ?, ?, '[]', 'approved', 'Demo listing seeded with sample prices.', 1, ?, ?, ?, ?)`,
      [b.id, DEMO_OWNER_ID, b.name, b.description, b.category, `${b.barangay}, Mati City, Davao Oriental`, b.barangay, b.hours, b.lat, b.lng, ts, ts]
    );
    for (let i = 0; i < b.prices.length; i++) {
      const [title, amount, unit, category, description] = b.prices[i];
      await db.runAsync(
        `INSERT OR IGNORE INTO listing_prices (id, business_id, title, amount, unit, category, description, conditions, is_active, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [`${b.id}_p${i}`, b.id, title, amount, unit, category, `${description} · sample price`, SAMPLE_PRICE_NOTE, ts, ts]
      );
    }
    for (let i = 0; i < b.facilities.length; i++) {
      const [name, icon] = b.facilities[i];
      await db.runAsync(
        'INSERT OR IGNORE INTO listing_facilities (id, business_id, name, icon, created_at) VALUES (?, ?, ?, ?, ?)',
        [`${b.id}_f${i}`, b.id, name, icon, ts]
      );
    }
    // Existing installs: bring sample prices up to date (rows an owner changed are no longer 'sample').
    for (let i = 0; i < b.prices.length; i++) {
      const [title, amount, unit, , description] = b.prices[i];
      await db.runAsync(
        'UPDATE listing_prices SET title = ?, amount = ?, unit = ?, description = ?, updated_at = ? WHERE id = ? AND conditions = ?',
        [title, amount, unit, `${description} · sample price`, ts, `${b.id}_p${i}`, SAMPLE_PRICE_NOTE]
      );
    }
  }

  for (const [name, oldLat, lat, lng, location] of LOCATION_FIXES) {
    await db.runAsync(
      'UPDATE destinations SET latitude = ?, longitude = ?, location = ?, updated_at = ? WHERE name = ? AND ABS(latitude - ?) < 0.00001',
      [lat, lng, location, ts, name, oldLat]
    );
  }
  // Demo businesses belong to the demo owner (no one can sign in as it), so their pins are always kept current.
  for (const b of BUSINESSES) {
    await db.runAsync('UPDATE businesses SET latitude = ?, longitude = ? WHERE id = ? AND owner_id = ?', [b.lat, b.lng, b.id, DEMO_OWNER_ID]);
  }
  await db.runAsync(
    "UPDATE destinations SET description = ? WHERE name = 'Pangyan Falls' AND id = 'seed_dest_pangyan_falls'",
    [DESTINATIONS.find(d => d[0] === 'Pangyan Falls')![1]]
  );

  for (const [name, from, to] of FEE_UPDATES) {
    await db.runAsync(
      'UPDATE destinations SET estimated_fee = ?, updated_at = ? WHERE name = ? AND fee_verified = 0 AND estimated_fee = ?',
      [to, ts, name, from]
    );
  }
}
