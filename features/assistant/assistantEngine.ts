import { User } from '../../types';
import { getDatabase } from '../../database/migrations/init';

/**
 * Deterministic assistant engine — no paid AI API required.
 * Uses locally cached destination and business data.
 * Never invents prices, emergency numbers, or availability.
 */
export async function getAssistantResponse(
  query: string,
  user: User | null
): Promise<string> {
  const q = query.toLowerCase();

  // Recommendation intent — match against actual DB data
  if (
    q.includes('recommend') || q.includes('suggest') || q.includes('looking for') ||
    q.includes('want') || q.includes('find me') || q.includes('show me') ||
    q.includes('best place') || q.includes('where can i') || q.includes('ideal')
  ) {
    return await getRecommendations(query, user);
  }

  if (q.includes('budget') || q.includes('cost') || q.includes('spend') || q.includes('money')) {
    return getBudgetResponse();
  }
  if (q.includes('beach') || q.includes('surf') || q.includes('swim') || q.includes('dahican')) {
    return getBeachResponse();
  }
  if (q.includes('waterfall') || q.includes('nature') || q.includes('mountain') || q.includes('hamiguitan')) {
    return getNatureResponse();
  }
  if (q.includes('food') || q.includes('eat') || q.includes('restaurant') || q.includes('local')) {
    return getFoodResponse();
  }
  if (q.includes('transport') || q.includes('getting around') || q.includes('jeepney') || q.includes('tricycle')) {
    return getTransportResponse();
  }
  if (q.includes('emergency') || q.includes('police') || q.includes('hospital') || q.includes('help')) {
    return getEmergencyResponse();
  }
  if (q.includes('destination') || q.includes('place') || q.includes('visit') || q.includes('top') || q.includes('best')) {
    return await getDestinationsResponse();
  }
  if (q.includes('business') || q.includes('hotel') || q.includes('accommodation') || q.includes('stay') || q.includes('resort')) {
    return await getBusinessesResponse(query);
  }
  if (q.includes('itinerary') || q.includes('plan') || q.includes('schedule') || q.includes('days')) {
    return getItineraryResponse();
  }
  if (q.includes('safe') || q.includes('safety') || q.includes('tip') || q.includes('advice')) {
    return getSafetyResponse();
  }

  return getDefaultResponse(user);
}

// ─── Recommendation Engine ────────────────────────────────────────────────────

interface ScoredBusiness {
  id: string; name: string; category: string; address: string;
  description: string; cover_image_url: string | null;
  score: number; matchedKeywords: string[];
  lowestPrice: number | null; priceUnit: string | null;
  facilities: string[];
}

const KEYWORD_WEIGHTS: Record<string, string[]> = {
  beach: ['beach', 'dahican', 'pujada', 'shore', 'coastal', 'ocean', 'sea', 'surf', 'swim', 'snorkel'],
  resort: ['resort', 'accommodation', 'stay', 'overnight', 'room', 'cottage', 'villa'],
  peaceful: ['peaceful', 'quiet', 'relaxing', 'serene', 'calm', 'tranquil', 'nature'],
  affordable: ['affordable', 'cheap', 'budget', 'low cost', 'inexpensive', 'value'],
  sunset: ['sunset', 'sunrise', 'view', 'scenic', 'panoramic', 'beautiful'],
  food: ['food', 'restaurant', 'eat', 'dining', 'seafood', 'local', 'cuisine'],
  adventure: ['adventure', 'activity', 'hiking', 'kayak', 'surf', 'zip', 'atv', 'extreme'],
  family: ['family', 'kids', 'children', 'group', 'picnic', 'pool'],
  romantic: ['romantic', 'couple', 'honeymoon', 'intimate', 'private'],
  waterfall: ['waterfall', 'falls', 'river', 'nature', 'trek', 'hike'],
};

async function getRecommendations(query: string, user: User | null): Promise<string> {
  try {
    const db = await getDatabase();
    const q = query.toLowerCase();

    // Fetch approved businesses with their prices and facilities
    const businesses = await db.getAllAsync<{
      id: string; name: string; category: string; address: string; description: string; cover_image_url: string | null;
    }>(
      "SELECT id, name, category, address, description, cover_image_url FROM businesses WHERE verification_status = 'approved' AND is_active = 1"
    );

    if (businesses.length === 0) {
      // Fall back to destinations
      return await getDestinationsResponse();
    }

    const scored: ScoredBusiness[] = [];

    for (const biz of businesses) {
      const searchText = `${biz.name} ${biz.description} ${biz.category} ${biz.address}`.toLowerCase();
      let score = 0;
      const matchedKeywords: string[] = [];

      // Score against keyword groups
      for (const [group, keywords] of Object.entries(KEYWORD_WEIGHTS)) {
        const queryHitsGroup = keywords.some(k => q.includes(k));
        const bizHitsGroup = keywords.some(k => searchText.includes(k));
        if (queryHitsGroup && bizHitsGroup) {
          score += 3;
          matchedKeywords.push(group);
        } else if (queryHitsGroup) {
          score += 0;
        } else if (bizHitsGroup) {
          score += 0.5;
        }
      }

      // Direct word overlap between query and business text
      const queryWords = q.split(/\s+/).filter(w => w.length > 3);
      for (const word of queryWords) {
        if (searchText.includes(word)) { score += 1; matchedKeywords.push(word); }
      }

      if (score < 1) continue;

      // Get lowest price
      const priceRow = await db.getFirstAsync<{ amount: number; unit: string }>(
        'SELECT amount, unit FROM listing_prices WHERE business_id = ? AND is_active = 1 ORDER BY amount ASC LIMIT 1',
        [biz.id]
      );

      // Get facilities
      const facilityRows = await db.getAllAsync<{ name: string }>(
        'SELECT name FROM listing_facilities WHERE business_id = ? LIMIT 6',
        [biz.id]
      );

      scored.push({
        ...biz,
        score,
        matchedKeywords: [...new Set(matchedKeywords)],
        lowestPrice: priceRow?.amount ?? null,
        priceUnit: priceRow?.unit ?? null,
        facilities: facilityRows.map(f => f.name),
      });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.slice(0, 3);

    if (top.length === 0) {
      return `🔍 No close match found for your description.\n\nTry browsing the **Local Businesses** section to explore all verified establishments in Mati City.\n\nYou can also describe what you're looking for differently — mention the type of place, activities, or atmosphere you want.`;
    }

    const lines = top.map((biz, i) => {
      const priceStr = biz.lowestPrice !== null
        ? `Starting from ₱${biz.lowestPrice.toLocaleString('en-PH')} ${biz.priceUnit ?? ''}`
        : 'Contact for rates';
      const facilStr = biz.facilities.length > 0 ? biz.facilities.slice(0, 3).join(', ') : '';
      const matchStr = biz.matchedKeywords.slice(0, 3).join(', ');
      return `**${i + 1}. ${biz.name}**\n📍 ${biz.address}\n💰 ${priceStr}${facilStr ? `\n🏗 ${facilStr}` : ''}\n✅ Matches: ${matchStr}\n${biz.description.slice(0, 100)}...`;
    });

    const userName = user ? ` ${user.displayName.split(' ')[0]}` : '';
    return `🌟 **Recommended for you${userName}:**\n\n${lines.join('\n\n')}\n\n💡 Tap **View Details** on any listing in the Businesses section to see full photos, prices, and contact info.\n\n⚠️ Prices are as published by the establishment — confirm directly before visiting.`;
  } catch {
    return getDefaultResponse(user);
  }
}

async function getBusinessesResponse(query: string): Promise<string> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ name: string; category: string; address: string }>(
      "SELECT name, category, address FROM businesses WHERE verification_status = 'approved' AND is_active = 1 LIMIT 5"
    );
    if (rows.length === 0) return getAccommodationResponse();
    const list = rows.map((b, i) => `${i + 1}. **${b.name}** — ${b.category.replace('_', ' ')} · ${b.address}`).join('\n');
    return `🏪 **Verified Businesses in Mati City**\n\n${list}\n\n💡 Browse the full list in the **Businesses** section for photos, prices, and contact details.`;
  } catch {
    return getAccommodationResponse();
  }
}

// ─── Static responses ─────────────────────────────────────────────────────────

function getBudgetResponse(): string {
  return `💰 **Budget Planning for Mati City**\n\nHere's a general daily budget guide (amounts are estimates — not verified prices):\n\n• **Budget traveler:** ₱800–₱1,500/day\n  - Budget accommodation, local eateries, public transport\n\n• **Mid-range traveler:** ₱1,500–₱3,500/day\n  - Comfortable guesthouse, restaurants, some activities\n\n• **Comfortable traveler:** ₱3,500+/day\n  - Better accommodation, tours, dining out\n\n**Use the Budget Planner** in the app to create your personalized estimate.\n\n⚠️ All amounts shown are general estimates. Actual prices vary — always confirm with businesses directly.`;
}

function getBeachResponse(): string {
  return `🏖 **Beaches in Mati City**\n\n**Dahican Beach** is the crown jewel of Mati City — a long stretch of white sand famous for:\n• Surfing and skimboarding\n• Crystal-clear waters\n• Stunning sunrises\n• Relaxed local atmosphere\n\n**Pujada Bay** offers:\n• Protected calm waters\n• Snorkeling opportunities\n• Island hopping\n• Mangrove exploration\n\n**Tips:**\n• Best time to visit: November–May (dry season)\n• Bring reef-safe sunscreen\n• Respect local fishing communities\n\n⚠️ Entrance fees and availability may change — confirm locally before visiting.`;
}

function getNatureResponse(): string {
  return `🌿 **Nature Destinations in Davao Oriental**\n\n**Mount Hamiguitan Range Wildlife Sanctuary**\n• UNESCO World Heritage Site\n• Home to the Philippine Eagle\n• Rare pygmy forest ecosystem\n• Requires permits and guides\n\n**Aliwagwag Falls (Cateel)**\n• One of the highest waterfalls in the Philippines\n• Series of cascading falls\n\n**Cape San Agustin**\n• Southeasternmost point of Mindanao\n• Historic lighthouse\n• Panoramic ocean views\n\n⚠️ Always hire a registered local guide for mountain treks. Permits may be required.`;
}

function getFoodResponse(): string {
  return `🍽 **Local Food in Mati City**\n\n**Must-try local dishes:**\n• **Kinilaw** — fresh raw fish cured in vinegar and spices\n• **Sinuglaw** — combination of kinilaw and grilled pork\n• **Durian** — Davao's famous fruit\n• **Fresh seafood** — straight from Pujada Bay\n\n**Where to eat:**\n• Mati City Public Market — freshest local produce\n• Local carinderias for authentic home-style cooking\n\n⚠️ Explore the **Businesses** section for current restaurant listings.`;
}

function getTransportResponse(): string {
  return `🚌 **Getting Around Mati City**\n\n**From Davao City to Mati:**\n• Bus: ~4–5 hours via national highway\n• Van for hire: faster but more expensive\n\n**Within Mati City:**\n• **Tricycles** — most common for short distances\n• **Habal-habal** (motorcycle taxis) — for areas without roads\n• **Jeepneys** — for longer routes\n\n**Tips:**\n• Always agree on fare before riding\n• Keep small bills handy\n\n⚠️ Transport schedules and fares change. Confirm current rates locally.`;
}

function getEmergencyResponse(): string {
  return `🚨 **Emergency Information**\n\nFor verified emergency contacts, check the **Emergency Information** section in the app.\n\n**General emergency numbers (Philippines):**\n• National Emergency Hotline: **911**\n• Philippine National Police: **117**\n• Bureau of Fire Protection: **160**\n\n⚠️ In immediate danger, call 911.`;
}

async function getDestinationsResponse(): Promise<string> {
  try {
    const db = await getDatabase();
    const destinations = await db.getAllAsync<{ name: string; location: string; description: string }>(
      'SELECT name, location, description FROM destinations WHERE is_active = 1 AND is_featured = 1 LIMIT 4'
    );
    if (destinations.length === 0) return getDefaultDestinationsText();
    const list = destinations
      .map((d, i) => `${i + 1}. **${d.name}** — ${d.location}\n   ${d.description.slice(0, 80)}...`)
      .join('\n\n');
    return `🗺 **Top Destinations in Davao Oriental**\n\n${list}\n\n💡 Explore the full list in the **Destinations** section!`;
  } catch {
    return getDefaultDestinationsText();
  }
}

function getDefaultDestinationsText(): string {
  return `🗺 **Top Destinations in Davao Oriental**\n\n1. **Dahican Beach** — Mati City's famous surfing beach\n2. **Pujada Bay** — Protected bay for snorkeling and island hopping\n3. **Mount Hamiguitan** — UNESCO World Heritage wildlife sanctuary\n4. **Cape San Agustin** — Scenic cape with historic lighthouse\n5. **Aliwagwag Falls** — Spectacular cascading waterfalls in Cateel\n\nExplore the **Destinations** section for photos and details!`;
}

function getAccommodationResponse(): string {
  return `🏨 **Accommodation in Mati City**\n\nMati City offers various accommodation options:\n\n• **Budget guesthouses** — affordable options near the city center\n• **Beach resorts** — near Dahican Beach for the full experience\n• **Mid-range hotels** — comfortable stays with amenities\n\nBrowse the **Local Businesses** section for current listings with contact details.\n\n⚠️ Availability and prices change. Contact businesses directly to confirm.`;
}

function getItineraryResponse(): string {
  return `📅 **Sample Mati City Itinerary**\n\n**Day 1 — Arrival & Beach**\n• Arrive in Mati City\n• Check in to accommodation\n• Sunset at Dahican Beach\n\n**Day 2 — Beach & Bay**\n• Morning surf/swim at Dahican Beach\n• Afternoon island hopping in Pujada Bay\n\n**Day 3 — Nature & Culture**\n• Visit Cape San Agustin\n• Explore Mati City Public Market\n\nUse the **Itinerary Planner** to build your personalized schedule!`;
}

function getSafetyResponse(): string {
  return `🛡 **Travel Safety Tips for Mati City**\n\n**General safety:**\n• Mati City is generally safe for tourists\n• Stay aware of your surroundings\n• Keep valuables secure\n\n**Water activities:**\n• Check weather and sea conditions\n• Swim in designated areas\n• Use life jackets for boat trips\n\n**Health:**\n• Bring insect repellent (dengue prevention)\n• Stay hydrated in tropical heat\n\n**Emergency:** Call **911** for immediate assistance.`;
}

function getDefaultResponse(user: User | null): string {
  const name = user ? ` ${user.displayName.split(' ')[0]}` : '';
  return `Hi${name}! I'm KalawAssistance, your local travel guide for Mati City and Davao Oriental. 🌊\n\nI can help you with:\n• 🌟 **Recommendations** — describe your ideal place and I'll match it\n• 🏖 **Beach info** — Dahican, Pujada Bay\n• 🌿 **Nature destinations** — Mount Hamiguitan, Aliwagwag Falls\n• 🍽 **Local food** — what to eat and where\n• 💰 **Budget planning** — cost estimates\n• 🚌 **Getting around** — transport options\n• 📅 **Itinerary ideas** — day-by-day suggestions\n• 🛡 **Safety tips** — travel advice\n\nWhat would you like to know?`;
}
