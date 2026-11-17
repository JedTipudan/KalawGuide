import { AssistantCard, AssistantIntent, AssistantReplyMeta, TripCostItem, User } from '../../types';
import { formatCurrency } from '../../utils/helpers';
import { calculateTripBudget, unitToPricingModel } from '../../services/budget/budgetService';
import { checkInput, validateOutput } from './guard';
import { classifyIntent } from './intent';
import { REFUSAL } from './identity';
import { BudgetRequest, matchDestination, parseBudgetRequest } from './budgetParser';
import { getLocalModel } from './localModel';
import { CLOUD_AI_ENABLED, CloudTurn, askCloud, checkCloudReply, factsFromSnapshot } from './cloudModel';
import {
  BusinessInfo, DestinationInfo, PriceInfo, getApprovedBusinesses, getDestinations,
  getEmergencyContacts, getFacilities, getPrices, lastSnapshotUsed, loadSnapshot, setOfflineHint, syncKnowledge,
} from './knowledge';

/**
 * Kalaw Assistance pipeline (works fully offline):
 * guard → intent → refuse | retrieve (read-only, approved data) → template → [cloud AI] → validate output.
 * Facts only come from KalawGuide's data; missing data is stated, never invented.
 * Online with a Gemini key, the cloud AI words the answer from those facts (cloudModel.ts).
 * Offline, the local engine answers from the live database, or from the last synced snapshot
 * when the shared online database can't be reached (knowledgeCache.ts).
 */

export interface AssistantReply {
  content: string;
  meta: AssistantReplyMeta;
}

interface Context {
  query: string;
  lower: string;
  user: User | null;
  destinations: DestinationInfo[];
  businesses: BusinessInfo[];
}

interface Answer {
  content: string;
  sources?: string[];
  cards?: AssistantCard[];
  hasEstimates?: boolean;
}

const ESTIMATE_NOTE = 'Verified = confirmed in KalawGuide or published by an approved business. Estimate = not yet confirmed; check before you go.';

export async function getAssistantReply(
  query: string,
  user: User | null,
  opts: { offline: boolean; history?: CloudTurn[] }
): Promise<AssistantReply> {
  setOfflineHint(opts.offline);
  const model = getLocalModel();
  const base = { offline: opts.offline, model: model ? 'local_llm' as const : 'deterministic' as const };
  const refuse = (intent: AssistantIntent): AssistantReply =>
    ({ content: REFUSAL, meta: { ...base, intent, sources: [], hasEstimates: false } });

  // Layer 1: deterministic input guard — nothing malicious reaches retrieval.
  if (checkInput(query).blocked) return refuse('malicious_or_override_attempt');

  let ctx: Context;
  try {
    const [destinations, businesses] = await Promise.all([getDestinations(), getApprovedBusinesses()]);
    ctx = { query, lower: query.toLowerCase(), user, destinations, businesses };
  } catch {
    return {
      content: "I couldn't open KalawGuide's offline data on this device. Please restart the app and try again.",
      meta: { ...base, intent: 'app_help', sources: [], hasEstimates: false },
    };
  }

  // Layer 2: intent classification — unrelated topics are refused here.
  const intent = classifyIntent(query, {
    destinations: ctx.destinations.map(d => d.name),
    businesses: ctx.businesses.map(b => b.name),
  });
  if (intent === 'unrelated' || intent === 'malicious_or_override_attempt') return refuse(intent);

  // Layer 3: retrieval + templates (permission checks live in each handler).
  // "What is cheapest?" gets its own answer, unless it's a budget for one named place (handled by travel_budget).
  const namedPlace = matchDestination(query, ctx.destinations.map(d => d.name));
  const cheapestAsk = CHEAPEST.test(ctx.lower) && CHEAPEST_INTENTS.has(intent) && !(intent === 'travel_budget' && namedPlace);

  let answer: Answer;
  try {
    answer = cheapestAsk ? await cheapest(ctx) : await HANDLERS[intent](ctx);
  } catch {
    answer = { content: "Sorry, I couldn't read that information from KalawGuide right now. Please try again." };
  }

  const dataSyncedAt = lastSnapshotUsed() ?? undefined;
  let content = answer.content;
  let usedModel: AssistantReplyMeta['model'] = base.model;
  if (!opts.offline && CLOUD_AI_ENABLED) {
    try {
      const snapshot = (await loadSnapshot()) ?? (await syncKnowledge().catch(() => null));
      const facts = factsFromSnapshot(snapshot);
      const cloud = (await askCloud({ question: query, draft: content, facts, history: opts.history ?? [] })).trim();
      if (cloud === REFUSAL || cloud.startsWith(REFUSAL.slice(0, 40))) {
        content = REFUSAL; // the model judged it off-topic: keep the standard refusal
        usedModel = 'cloud_ai';
      } else if (checkCloudReply(cloud, { draft: content, facts, question: query }) === null) {
        content = cloud;
        usedModel = 'cloud_ai';
      } // else: the reply mentioned something KalawGuide can't back up, so the local answer stays

    } catch { /* no internet, quota reached or timeout: keep the local answer */ }
  } else if (model) {
    try { content = await model.rephrase(content); } catch { /* keep template text */ }
  }

  // Layer 4: output validation.
  content = validateOutput(content);
  const blocked = content === REFUSAL;
  return {
    content,
    meta: {
      ...base,
      model: usedModel,
      dataSyncedAt,
      intent,
      sources: blocked ? [] : [...new Set(answer.sources ?? [])],
      hasEstimates: !blocked && !!answer.hasEstimates,
      cards: blocked ? undefined : answer.cards,
    },
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const feeText = (d: DestinationInfo) =>
  d.fee === null
    ? 'Entrance fee: not recorded in KalawGuide'
    : `Entrance fee: ${formatCurrency(d.fee)} per person (${d.feeVerified ? 'verified' : 'estimate'})`;

const priceText = (p: PriceInfo) =>
  `${p.title}: ${formatCurrency(p.amount)} ${p.unit} (${p.verified ? 'verified' : 'estimate'})`;

const destCard = (d: DestinationInfo): AssistantCard => ({
  type: 'destination',
  data: { id: d.id, name: d.name, location: d.location, description: d.description, fee: d.fee, feeVerified: d.feeVerified },
});

const bizLine = (b: BusinessInfo, prices: PriceInfo[]) => {
  const lowest = prices.find(p => p.businessId === b.id);
  return `• **${b.name}** — ${b.address}${lowest ? `\n  From ${priceText(lowest)}` : '\n  No published prices yet'}`;
};

const NO_DATA = (what: string) =>
  `KalawGuide doesn't have ${what} yet, so I can't give you details or prices. I won't guess. Please check again later or ask locally.`;

async function businessesWithPrices(ctx: Context, categories: string[]) {
  const list = ctx.businesses.filter(b => categories.includes(b.category));
  const prices = await getPrices(list.map(b => b.id));
  return { list, prices };
}

// ─── Budget ───────────────────────────────────────────────────────────────────

async function budgetFor(dest: DestinationInfo, req: BudgetRequest, ctx: Context): Promise<Answer> {
  const travelers = req.travelers ?? 1;
  const days = req.days ?? 1;
  const nights = req.nights ?? days - 1;
  const rooms = req.rooms ?? Math.ceil(travelers / 2);
  const assumptions: string[] = [];
  if (req.travelers === undefined) assumptions.push('1 traveler (tell me how many are going)');
  if (req.days === undefined) assumptions.push('a 1-day trip (tell me how many days)');

  const items: TripCostItem[] = [];
  const sources = [`destinations:${dest.id}`];

  items.push({
    category: 'entrance_fees', label: `${dest.name} entrance fee`, amount: dest.fee,
    model: 'per_person', verified: dest.feeVerified, source: `destinations:${dest.id}`,
  });

  if (req.accommodation !== 'none' && nights > 0) {
    if (req.rooms === undefined) assumptions.push(`${rooms} room(s) for ${travelers} traveler(s)`);
    const { prices } = await businessesWithPrices(ctx, ['accommodation']);
    const rates = prices.filter(p => {
      const m = unitToPricingModel(p.unit);
      return m === 'per_room' || m === 'per_night' || p.category === 'room_rate' || p.category === 'overnight';
    });
    const pick = req.accommodation === 'premium' ? rates[rates.length - 1] : rates[0];
    items.push(pick
      ? { category: 'accommodation', label: `${pick.title} — ${pick.businessName}`, amount: pick.amount,
          model: unitToPricingModel(pick.unit) === 'per_night' ? 'per_night' : 'per_room', verified: pick.verified,
          source: `businesses:${pick.businessId}` }
      : { category: 'accommodation', label: 'Accommodation (no published room rate in KalawGuide)', amount: null, model: 'per_room', verified: false });
  }

  const { prices: fares } = await businessesWithPrices(ctx, ['transport']);
  const wanted = req.transport?.replace('_', '-');
  const fare = (wanted ? fares.filter(f => `${f.title} ${f.unit}`.toLowerCase().includes(wanted.split('-')[0])) : fares)[0];
  if (fare) {
    const model = unitToPricingModel(fare.unit);
    if (!model) assumptions.push(`"${fare.unit}" fare treated as one charge for the whole trip`);
    items.push({
      category: 'transportation', label: `${fare.title} — ${fare.businessName}`, amount: fare.amount,
      model: model ?? 'per_trip', verified: fare.verified, source: `businesses:${fare.businessId}`,
    });
  } else {
    items.push({ category: 'transportation', label: `Transportation${wanted ? ` (${wanted})` : ''} — no published fare in KalawGuide`, amount: null, model: 'per_trip', verified: false });
  }

  items.push(req.foodPerPersonPerDay !== undefined
    ? { category: 'food', label: 'Food (your amount per person per day)', amount: req.foodPerPersonPerDay, model: 'per_day', perTraveler: true, verified: false }
    : { category: 'food', label: 'Food budget per person per day (tell me your amount)', amount: null, model: 'per_day', perTraveler: true, verified: false });

  const result = calculateTripBudget({ travelers, days, nights, rooms, items });
  items.forEach(i => i.source && sources.push(i.source));

  const lines = result.lines.map(l =>
    `• ${l.label}: ${formatCurrency(l.amount!)} × ${l.quantity} = ${formatCurrency(l.subtotal)} (${l.verified ? 'verified' : 'estimate'})`);
  const missing = result.missing.map(m => `• ${m.label}${m.category === 'entrance_fees' ? ' — not recorded in KalawGuide' : ''}`);

  let content = `💰 **Trip estimate: ${dest.name}**\n${travelers} traveler(s) · ${days} day(s) · ${result.nights} night(s)\n\n${lines.join('\n')}`;
  content += `\n• Contingency (10%): ${formatCurrency(result.contingency)}`;
  content += `\n\n**Group total: ${formatCurrency(result.groupTotal)}**\nPer person: ${formatCurrency(result.perPerson)} · Per person per day: ${formatCurrency(result.dailyPerPerson)}`;
  if (missing.length) content += `\n\n⚠️ Not included (price not available, so I didn't guess):\n${missing.join('\n')}`;
  if (assumptions.length) content += `\n\nAssumed: ${assumptions.join('; ')}.`;
  if (req.budgetCap !== undefined) {
    content += result.groupTotal <= req.budgetCap
      ? `\n\n✅ Fits your ${formatCurrency(req.budgetCap)} budget, with ${formatCurrency(req.budgetCap - result.groupTotal)} left.`
      : `\n\n❌ ${formatCurrency(result.groupTotal - req.budgetCap)} over your ${formatCurrency(req.budgetCap)} budget.`;
  }
  content += `\n\n${ESTIMATE_NOTE}`;

  return { content, sources, cards: [{ type: 'budget', data: result }, destCard(dest)], hasEstimates: result.hasEstimates };
}

function affordable(req: BudgetRequest, ctx: Context): Answer {
  const travelers = req.travelers ?? 1;
  const known = ctx.destinations.filter(d => d.fee !== null).sort((a, b) => a.fee! - b.fee!);
  const unknown = ctx.destinations.filter(d => d.fee === null);
  if (ctx.destinations.length === 0) return { content: NO_DATA('any destinations registered') };

  let content = `🗺 **Destinations by entrance fee** (for ${travelers} traveler${travelers > 1 ? 's' : ''})\n\n`;
  content += known.map(d => `• **${d.name}** — ${formatCurrency(d.fee! * travelers)} total (${d.feeVerified ? 'verified' : 'estimate'})`).join('\n');
  if (unknown.length) content += `\n• Fee not recorded: ${unknown.map(d => d.name).join(', ')}`;

  if (req.budgetCap !== undefined) {
    let spent = 0;
    const fits: string[] = [];
    for (const d of known) {
      if (spent + d.fee! * travelers > req.budgetCap) break;
      spent += d.fee! * travelers;
      fits.push(d.name);
    }
    content += fits.length
      ? `\n\nWith ${formatCurrency(req.budgetCap)}, entrance fees for **${fits.join(', ')}** come to ${formatCurrency(spent)}.`
      : `\n\nNo recorded entrance fees fit within ${formatCurrency(req.budgetCap)}.`;
  } else if (/\bbudget\b/.test(ctx.lower)) {
    content += '\n\nTell me your budget amount (for example "₱3,000") and I\'ll check which ones fit.';
  }
  content += '\n\nThis covers entrance fees only. Ask "How much should I prepare for <destination>?" to include transport, food and accommodation.';
  return {
    content,
    sources: ctx.destinations.map(d => `destinations:${d.id}`),
    cards: known.slice(0, 3).map(destCard),
    hasEstimates: ctx.destinations.some(d => !d.feeVerified),
  };
}

// ─── Cheapest ("what is cheapest?", "cheapest place to stay") ─────────────────

const CHEAPEST_INTENTS = new Set<AssistantIntent>([
  'travel_budget', 'destination_search', 'destination_details', 'accommodation', 'food_recommendation',
  'transportation', 'activity_search', 'business_information', 'itinerary_planning',
]);

export const CHEAPEST = /\b(cheap(est|er)?|lowest|least expensive|most affordable|affordable|budget[- ]friendly|tipid|(pinaka)?mura|barato)\b/;

type CheapKind = 'stay' | 'food' | 'transport' | 'activity' | 'place';
const CHEAP_KINDS: [CheapKind, RegExp][] = [
  ['stay', /\b(stay|rooms?|hotels?|resorts?|accommodations?|lodg\w*|inns?|sleep|overnight|cabins?|matulog)\b/],
  ['food', /\b(food|eat|meals?|restaurants?|eatery|kain|lunch|dinner|breakfast|carinderia)\b/],
  ['transport', /\b(transport\w*|fares?|rides?|vans?|bus(es)?|tricycles?|habal\w*|get (to|around)|commute)\b/],
  ['activity', /\b(activit(y|ies)|tours?|island hopping|surf\w*|snorkel\w*|things to do)\b/],
  ['place', /\b(places?|destinations?|spots?|beach(es)?|visit|entrance|attractions?)\b/],
];

const KIND_TITLE: Record<Exclude<CheapKind, 'place'>, string> = {
  stay: '🏨 Cheapest places to stay',
  food: '🍽 Cheapest meals',
  transport: '🚌 Cheapest transport',
  activity: '🏄 Cheapest activities',
};

const cheapLine = (p: PriceInfo) =>
  `• **${p.businessName}** — ${p.title}: ${formatCurrency(p.amount)} ${p.unit} (${p.verified ? 'verified' : 'estimate'})`;

function pricesByKind(all: PriceInfo[]): Record<Exclude<CheapKind, 'place'>, PriceInfo[]> {
  return {
    stay: all.filter(p => p.businessCategory === 'accommodation' && unitToPricingModel(p.unit) === 'per_room'),
    food: all.filter(p => p.businessCategory === 'restaurant' && unitToPricingModel(p.unit) === 'per_person'),
    transport: all.filter(p => p.businessCategory === 'transport'),
    activity: all.filter(p => p.category === 'activity_fee' || p.category === 'service'),
  };
}

/** Lists the lowest published prices, or (when no type is named) builds the cheapest full trip. */
async function cheapest(ctx: Context): Promise<Answer> {
  const req = parseBudgetRequest(ctx.query, ctx.destinations.map(d => d.name));
  const kinds = CHEAP_KINDS.filter(([, re]) => re.test(ctx.lower)).map(([k]) => k);
  const all = await getPrices(ctx.businesses.map(b => b.id)); // sorted lowest first
  const by = pricesByKind(all);

  // Only destinations asked about → entrance fees, with the budget-fit check.
  if (kinds.length === 1 && kinds[0] === 'place') return affordable(req, ctx);

  if (kinds.length) {
    const sections: string[] = [];
    const used: PriceInfo[] = [];
    for (const k of kinds) {
      if (k === 'place') {
        const cheapPlaces = [...ctx.destinations].filter(d => d.fee !== null).sort((a, b) => a.fee! - b.fee!).slice(0, 3);
        if (cheapPlaces.length) sections.push(`🗺 **Cheapest places to visit**\n${cheapPlaces.map(d => `• **${d.name}** — ${feeText(d)}`).join('\n')}`);
        continue;
      }
      const list = by[k].slice(0, 3);
      used.push(...list);
      sections.push(list.length
        ? `**${KIND_TITLE[k]}**\n${list.map(cheapLine).join('\n')}`
        : `**${KIND_TITLE[k]}**\nNo published prices in KalawGuide yet.`);
    }
    const best = used[0];
    const tip = best ? `\n\n💡 Lowest of all: **${best.title}** at **${best.businessName}**, ${formatCurrency(best.amount)} ${best.unit}.` : '';
    return {
      content: `${sections.join('\n\n')}${tip}\n\nPrices go from lowest to highest. Contact the business to confirm before you go.\nAsk "What is the cheapest trip for 2 people, 3 days?" for a full budget.`,
      sources: used.map(p => `businesses:${p.businessId}`),
      hasEstimates: used.some(p => !p.verified),
    };
  }

  // No type named → the cheapest complete trip from KalawGuide's own prices.
  const travelers = req.travelers ?? 2;
  const days = req.days ?? 2;
  const nights = req.nights ?? days - 1;
  const rooms = req.rooms ?? Math.ceil(travelers / 2);
  const assumptions: string[] = [];
  if (req.travelers === undefined) assumptions.push(`${travelers} travelers`);
  if (req.days === undefined) assumptions.push(`${days} days, ${nights} night${nights === 1 ? '' : 's'}`);

  const items: TripCostItem[] = [];
  const picks: string[] = [];
  const toMati = by.transport.find(p => /davao/i.test(p.title) && unitToPricingModel(p.unit) === 'per_person');
  if (toMati) {
    items.push({ category: 'transportation', label: `${toMati.title} (round trip) — ${toMati.businessName}`, amount: toMati.amount * 2, model: 'per_person', verified: toMati.verified, source: `businesses:${toMati.businessId}` });
    picks.push(`🚌 Getting there: **${toMati.title}**, ${formatCurrency(toMati.amount)} each way (${toMati.businessName})`);
  }
  const local = by.transport.find(p => p !== toMati && unitToPricingModel(p.unit) === 'per_person');
  if (local) {
    items.push({ category: 'transportation', label: `${local.title} (round trip) — ${local.businessName}`, amount: local.amount * 2, model: 'per_person', verified: local.verified, source: `businesses:${local.businessId}` });
    picks.push(`🛵 Getting around: **${local.title}**, ${formatCurrency(local.amount)} each way`);
  }
  const room = nights > 0 ? by.stay[0] : undefined;
  if (room) {
    items.push({ category: 'accommodation', label: `${room.title} — ${room.businessName}`, amount: room.amount, model: 'per_room', verified: room.verified, source: `businesses:${room.businessId}` });
    picks.push(`🏨 Stay: **${room.businessName}**, ${room.title}, ${formatCurrency(room.amount)} ${room.unit}`);
    if (req.rooms === undefined) assumptions.push(`${rooms} room${rooms > 1 ? 's' : ''}`);
  }
  const meal = by.food[0];
  if (meal) {
    items.push({ category: 'food', label: `3 meals a day at ~${formatCurrency(meal.amount)} (${meal.title}, ${meal.businessName})`, amount: meal.amount * 3, model: 'per_day', perTraveler: true, verified: meal.verified, source: `businesses:${meal.businessId}` });
    picks.push(`🍽 Food: **${meal.title}** at ${meal.businessName}, ${formatCurrency(meal.amount)} per meal`);
  }
  const free = ctx.destinations.filter(d => d.fee === 0).slice(0, 3);
  const cheapPaid = ctx.destinations.filter(d => d.fee !== null && d.fee > 0).sort((a, b) => a.fee! - b.fee!)[0];
  const spots = free.length ? free : cheapPaid ? [cheapPaid] : [];
  for (const d of spots) {
    items.push({ category: 'entrance_fees', label: `${d.name} entrance`, amount: d.fee, model: 'per_person', verified: d.feeVerified, source: `destinations:${d.id}` });
  }
  if (spots.length) picks.push(`🗺 See: ${spots.map(d => `**${d.name}** (${d.fee === 0 ? 'free' : formatCurrency(d.fee!)})`).join(', ')}`);

  if (items.length === 0) return { content: NO_DATA('any published prices') };

  const result = calculateTripBudget({ travelers, days, nights, rooms, items });
  let content = `💸 **Cheapest trip to Mati in KalawGuide**\n${travelers} traveler(s) · ${days} day(s) · ${result.nights} night(s)\n\n${picks.join('\n')}`;
  content += `\n\n${result.lines.map(l => `• ${l.label}: ${formatCurrency(l.subtotal)}`).join('\n')}\n• Contingency (10%): ${formatCurrency(result.contingency)}`;
  content += `\n\n**Group total: ${formatCurrency(result.groupTotal)}**\nPer person: ${formatCurrency(result.perPerson)}`;
  if (req.budgetCap !== undefined) {
    content += result.groupTotal <= req.budgetCap
      ? `\n\n✅ Fits your ${formatCurrency(req.budgetCap)} budget, with ${formatCurrency(req.budgetCap - result.groupTotal)} left.`
      : `\n\n❌ ${formatCurrency(result.groupTotal - req.budgetCap)} over your ${formatCurrency(req.budgetCap)} budget. Try fewer nights or a day trip.`;
  }
  if (assumptions.length) content += `\n\nAssumed: ${assumptions.join(', ')}. Tell me your group size and days to adjust.`;
  content += `\n\nWant to compare? Ask "cheapest place to stay", "cheapest food" or "cheapest activities".\n\n${ESTIMATE_NOTE}`;

  return {
    content,
    sources: items.map(i => i.source!).filter(Boolean),
    cards: [{ type: 'budget', data: result }, ...spots.slice(0, 2).map(destCard)],
    hasEstimates: result.hasEstimates,
  };
}

// ─── Handlers ─────────────────────────────────────────────────────────────────

// ─── Recommendations ("best places to visit in Mati") ─────────────────────────

const RECOMMEND = /\b(best|top|recommend|suggest|must[- ](see|visit|go)|worth (a )?visit|popular|famous|where (should|to|can) (i |we )?go)/;

// Preference words → terms matched against a place's name, category and description.
const PREFERENCES: { label: string; when: RegExp; terms: string[] }[] = [
  { label: 'beach', when: /\b(beach|beaches|swim|surf|sea|island|snorkel)/, terms: ['beach', 'surf', 'surfing', 'bay', 'sea', 'island', 'swim', 'swimming', 'coast', 'snorkeling'] },
  { label: 'nature', when: /\b(nature|hike|hiking|trek|mountain|falls|waterfall|forest|park)/, terms: ['nature', 'mountain', 'falls', 'waterfall', 'range', 'forest', 'heritage', 'park', 'hike'] },
  { label: 'adventure', when: /\b(adventure|adventurous|extreme|thrill)/, terms: ['adventure', 'hike', 'surf', 'mountain', 'falls', 'trek'] },
  { label: 'culture', when: /\b(culture|cultural|history|historical|heritage|museum|church)/, terms: ['cultural', 'history', 'historical', 'heritage', 'museum', 'church', 'shrine'] },
  { label: 'food', when: /\b(food|market|eat|seafood)/, terms: ['food', 'market', 'seafood', 'restaurant'] },
];

const firstSentence = (text: string) => {
  const t = text.trim();
  const m = t.match(/^.*?[.!?](\s|$)/);
  return (m ? m[0] : t).trim();
};

/** Picks the 3 best places from KalawGuide data. Ranking uses only stored facts: featured, verified fee, free entry, has a map location. */
function recommendPlaces(ctx: Context): Answer {
  const prefs = PREFERENCES.filter(p => p.when.test(ctx.lower));
  const wantsFree = /\bfree\b|\bno (entrance )?fee\b/.test(ctx.lower);

  let pool = ctx.destinations;
  if (prefs.length) {
    // Whole words only (plural allowed), so "sea" doesn't match "seafood".
    const terms = prefs.flatMap(p => p.terms).map(t => new RegExp(`\\b${t}(s|es)?\\b`));
    pool = pool.filter(d => {
      const hay = `${d.name} ${d.category ?? ''} ${d.description}`.toLowerCase();
      return terms.some(t => t.test(hay));
    });
  }
  if (wantsFree) pool = pool.filter(d => d.fee === 0);

  const what = [wantsFree ? 'free' : '', ...prefs.map(p => p.label)].filter(Boolean).join(', ');
  if (pool.length === 0) {
    return ctx.destinations.length === 0
      ? { content: NO_DATA('any destinations registered') }
      : { content: `KalawGuide doesn't have any ${what} places registered yet, so I can't recommend one. Try "best places to visit in Mati" to see all my top picks.` };
  }

  const score = (d: DestinationInfo) =>
    (d.isFeatured ? 3 : 0) + (d.feeVerified ? 1 : 0) + (d.fee === 0 ? 1 : 0) + (d.latitude !== null && d.longitude !== null ? 0.5 : 0);
  const picks = [...pool].sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name)).slice(0, 3);

  const lines = picks.map((d, i) => {
    const why = d.description ? firstSentence(d.description) : '';
    const tags = [d.category, d.isFeatured ? '⭐ Featured in KalawGuide' : ''].filter(Boolean).join(' · ');
    return `${i + 1}. **${d.name}** — ${d.location}${tags ? `\n   ${tags}` : ''}${why ? `\n   Why go: ${why}` : ''}\n   ${feeText(d)}`;
  });

  const label = what ? ` (${what})` : '';
  const heading = picks.length === 3
    ? `🌟 **Top 3 places to visit${label}**`
    : `🌟 **Places to visit${label}**\nOnly ${picks.length} place${picks.length > 1 ? 's match' : ' matches'} in KalawGuide right now.`;
  const next = `\n\nTap a card to open the place, see it on the 🗺 live map and get directions.\nNext, try: "How much for ${picks[0].name} for 2 people, 2 days?" or "Plan a 2-day trip".`;

  return {
    content: `${heading}\n\n${lines.join('\n\n')}${next}`,
    sources: picks.map(d => `destinations:${d.id}`),
    cards: picks.map(destCard),
    hasEstimates: picks.some(d => !d.feeVerified),
  };
}

const HANDLERS: Record<Exclude<AssistantIntent, 'unrelated' | 'malicious_or_override_attempt'>, (ctx: Context) => Promise<Answer>> = {
  async travel_budget(ctx) {
    const req = parseBudgetRequest(ctx.query, ctx.destinations.map(d => d.name));
    const dest = ctx.destinations.find(d => d.name === req.destination);
    return dest ? budgetFor(dest, req, ctx) : affordable(req, ctx);
  },

  async destination_search(ctx) {
    const req = parseBudgetRequest(ctx.query, ctx.destinations.map(d => d.name));
    if (req.budgetCap !== undefined || /\b(cheap|afford|budget)/.test(ctx.lower)) return affordable(req, ctx);
    if (RECOMMEND.test(ctx.lower)) return recommendPlaces(ctx);
    if (ctx.destinations.length === 0) return { content: NO_DATA('any destinations registered') };
    const top = ctx.destinations.slice(0, 6);
    return {
      content: `🗺 **Destinations in KalawGuide**\n\n${top.map(d => `• **${d.name}** — ${d.location}${d.category ? ` · ${d.category}` : ''}\n  ${feeText(d)}`).join('\n')}\n\nAsk me about any of them for details or a budget.`,
      sources: top.map(d => `destinations:${d.id}`),
      cards: top.slice(0, 3).map(destCard),
      hasEstimates: top.some(d => !d.feeVerified),
    };
  },

  async destination_details(ctx) {
    const name = matchDestination(ctx.query, ctx.destinations.map(d => d.name));
    const d = ctx.destinations.find(x => x.name === name);
    if (!d) return HANDLERS.destination_search(ctx);
    const coords = d.latitude !== null && d.longitude !== null ? `\nCoordinates: ${d.latitude}, ${d.longitude}` : '';
    return {
      content: `📍 **${d.name}**\n${d.location}${d.category ? ` · ${d.category}` : ''}${coords}\n\n${d.description || 'No description recorded.'}\n\n${feeText(d)}`,
      sources: [`destinations:${d.id}`],
      cards: [destCard(d)],
      hasEstimates: !d.feeVerified,
    };
  },

  async itinerary_planning(ctx) {
    const req = parseBudgetRequest(ctx.query, ctx.destinations.map(d => d.name));
    if (ctx.destinations.length === 0) return { content: NO_DATA('any destinations registered') };
    const days = req.days ?? 2;
    const travelers = req.travelers ?? 1;
    const ordered = [...ctx.destinations].sort((a, b) => Number(b.name === req.destination) - Number(a.name === req.destination));
    const plan: string[] = [];
    const used: DestinationInfo[] = [];
    for (let day = 0; day < days; day++) {
      const stops = ordered.slice(day * 2, day * 2 + 2);
      used.push(...stops);
      plan.push(`**Day ${day + 1}**\n${stops.length ? stops.map(s => `• ${s.name} (${s.location}) — ${feeText(s)}`).join('\n') : '• Free day: rest or explore verified local businesses'}`);
    }
    const result = calculateTripBudget({
      travelers, days, contingencyRate: 0,
      items: used.map(s => ({ category: 'entrance_fees' as const, label: `${s.name} entrance fee`, amount: s.fee, model: 'per_person' as const, verified: s.feeVerified })),
    });
    let content = `📅 **${days}-day plan for ${travelers} traveler${travelers > 1 ? 's' : ''}** (from destinations in KalawGuide)\n\n${plan.join('\n\n')}`;
    content += `\n\nEntrance fees total: ${formatCurrency(result.groupTotal)} (${formatCurrency(result.perPerson)} per person).`;
    if (result.missing.length) content += ` Fees not recorded for: ${result.missing.map(m => m.label.replace(' entrance fee', '')).join(', ')}.`;
    if (req.days === undefined) content += '\n\nAssumed 2 days. Tell me how many days you have.';
    content += '\n\nSave it from the **Trips** tab, and ask me "How much should I prepare…" for a full budget.';
    return {
      content,
      sources: used.map(s => `destinations:${s.id}`),
      cards: [{ type: 'budget', data: result }],
      hasEstimates: result.hasEstimates,
    };
  },

  async accommodation(ctx) {
    const req = parseBudgetRequest(ctx.query, ctx.destinations.map(d => d.name));
    const { list, prices } = await businessesWithPrices(ctx, ['accommodation']);
    if (list.length === 0) return { content: NO_DATA('any verified accommodations') };
    let shown = list;
    let note = '';
    if (req.budgetCap !== undefined) {
      shown = list.filter(b => prices.some(p => p.businessId === b.id && p.amount <= req.budgetCap!));
      note = `\n\nShowing places with a published rate of ${formatCurrency(req.budgetCap)} or less.`;
    } else if (/\bbudget\b/.test(ctx.lower)) {
      note = '\n\nTell me your budget per night (for example "₱1,500") and I\'ll filter these.';
    }
    if (shown.length === 0) return { content: `No verified accommodation in KalawGuide has a published rate within ${formatCurrency(req.budgetCap!)}.` };
    return {
      content: `🏨 **Verified accommodations**\n\n${shown.slice(0, 6).map(b => bizLine(b, prices)).join('\n')}${note}\n\nConfirm availability with the business before you go.`,
      sources: shown.map(b => `businesses:${b.id}`),
      hasEstimates: prices.some(p => !p.verified),
    };
  },

  async transportation(ctx) {
    const { list, prices } = await businessesWithPrices(ctx, ['transport']);
    if (list.length === 0) {
      return { content: `${NO_DATA('any verified transport operators or fares')}\n\nTip: agree on the fare before riding a tricycle or habal-habal.` };
    }
    const fareLines = prices.slice(0, 8).map(p => `• ${p.businessName} — ${priceText(p)}`);
    return {
      content: `🚌 **Transportation in KalawGuide**\n\n${list.slice(0, 6).map(b => `• **${b.name}** — ${b.address}${b.contact ? ` · ${b.contact}` : ''}`).join('\n')}${fareLines.length ? `\n\n**Published fares**\n${fareLines.join('\n')}` : '\n\nNo published fares yet.'}\n\nVehicle fares are per vehicle, not per person.`,
      sources: list.map(b => `businesses:${b.id}`),
      hasEstimates: prices.some(p => !p.verified),
    };
  },

  async food_recommendation(ctx) {
    const { list, prices } = await businessesWithPrices(ctx, ['restaurant']);
    const markets = ctx.destinations.filter(d => d.category === 'Food');
    if (list.length === 0 && markets.length === 0) return { content: NO_DATA('any verified restaurants') };
    let content = '🍽 **Food in KalawGuide**';
    if (list.length) {
      content += `\n\n${list.slice(0, 5).map(b => {
        const items = prices.filter(p => p.businessId === b.id).slice(0, 3);
        return `• **${b.name}** — ${b.address}${items.length ? `\n  ${items.map(priceText).join('\n  ')}` : ''}`;
      }).join('\n')}`;
    }
    if (markets.length) content += `\n\nFood spots: ${markets.map(m => `**${m.name}** (${m.location})`).join(', ')}`;
    return {
      content,
      sources: [...list.map(b => `businesses:${b.id}`), ...markets.map(m => `destinations:${m.id}`)],
      hasEstimates: prices.some(p => !p.verified),
    };
  },

  async activity_search(ctx) {
    const { list, prices } = await businessesWithPrices(ctx, ['activity', 'tour_operator']);
    const services = prices.filter(p => p.category === 'service' || p.category === 'activity_fee');
    let content = '🏄 **Activities**';
    if (list.length) {
      content += `\n\n${list.slice(0, 5).map(b => {
        const s = services.filter(p => p.businessId === b.id).slice(0, 3);
        return `• **${b.name}** — ${b.address}${s.length ? `\n  ${s.map(priceText).join('\n  ')}` : ''}`;
      }).join('\n')}`;
    } else {
      content += '\n\nNo verified activity or tour operators are listed in KalawGuide yet.';
    }
    if (ctx.destinations.length) {
      content += `\n\nDestinations to explore: ${ctx.destinations.slice(0, 6).map(d => `**${d.name}**${d.category ? ` (${d.category})` : ''}`).join(', ')}`;
    }
    return {
      content,
      sources: [...list.map(b => `businesses:${b.id}`), ...ctx.destinations.slice(0, 6).map(d => `destinations:${d.id}`)],
      hasEstimates: services.some(p => !p.verified),
    };
  },

  async business_information(ctx) {
    const b = ctx.businesses.find(x => ctx.lower.includes(x.name.toLowerCase()));
    if (!b) {
      if (ctx.businesses.length === 0) return { content: NO_DATA('any verified businesses') };
      return {
        content: `🏪 **Verified businesses**\n\n${ctx.businesses.slice(0, 8).map(x => `• **${x.name}** — ${x.category.replace('_', ' ')} · ${x.address}`).join('\n')}\n\nAsk about one by name for prices and details.`,
        sources: ctx.businesses.slice(0, 8).map(x => `businesses:${x.id}`),
      };
    }
    const [prices, facilities] = await Promise.all([getPrices([b.id]), getFacilities(b.id)]);
    let content = `🏪 **${b.name}** · ${b.category.replace('_', ' ')}\n${b.address}`;
    if (b.contact) content += `\nContact: ${b.contact}`;
    if (b.hours) content += `\nHours: ${b.hours}`;
    if (b.description) content += `\n\n${b.description}`;
    content += prices.length ? `\n\n**Prices**\n${prices.slice(0, 8).map(p => `• ${priceText(p)}`).join('\n')}` : '\n\nNo published prices yet.';
    if (facilities.length) content += `\n\nFacilities: ${facilities.join(', ')}`;
    return { content, sources: [`businesses:${b.id}`], hasEstimates: prices.some(p => !p.verified) };
  },

  async business_contact(ctx) {
    const intro = "KalawGuide doesn't take bookings or payments. It's a guide to **verified local businesses**: an administrator checks each one is legit before it appears. To reserve or ask about availability, contact the business directly.";
    const named = ctx.businesses.find(b => ctx.lower.includes(b.name.toLowerCase()));
    const contactLine = (b: BusinessInfo) =>
      `• **${b.name}** — ${b.address}${b.contact ? `\n  📞 ${b.contact}` : '\n  No contact number published yet'}${b.hours ? `\n  🕒 ${b.hours}` : ''}`;
    if (named) {
      return { content: `${intro}\n\n${contactLine(named)}\n\nOpen it in **Businesses** for its prices, photos and directions.`, sources: [`businesses:${named.id}`] };
    }
    const withContact = ctx.businesses.filter(b => b.contact).slice(0, 3);
    const list = withContact.length ? `\n\nSome verified businesses you can contact:\n${withContact.map(contactLine).join('\n')}` : '';
    return {
      content: `${intro}\n\nOpen **Businesses**, pick a ✅ verified listing, and use the phone, email or Facebook shown on its page.${list}`,
      sources: withContact.map(b => `businesses:${b.id}`),
    };
  },

  async emergency_information() {
    const contacts = await getEmergencyContacts();
    const list = contacts.map(c => `• **${c.name}** (${c.organization}): ${c.number}${c.verified ? ' ✓ verified' : ' — not yet verified'}`);
    return {
      content: `🚨 **Emergency information**\n\nIn immediate danger, call the national emergency hotline **911**.${list.length ? `\n\n${list.join('\n')}` : '\n\nNo local emergency contacts are recorded in KalawGuide yet.'}\n\nThe full list is in the **Emergency** screen.`,
      hasEstimates: contacts.some(c => !c.verified),
    };
  },

  async app_help(ctx) {
    const name = ctx.user ? ` ${ctx.user.displayName.split(' ')[0]}` : '';
    return {
      content: `Hi${name}! I'm Kalaw Assistance, the official KalawGuide tourism assistant. I work offline using KalawGuide's own data.\n\nI can help with:\n• Top places to visit (e.g. "What are the best places to visit in Mati?")
• Destinations, entrance fees and details\n• Verified accommodations, food, transport and activities\n• Trip budgets (e.g. "How much for Dahican Beach for 4 people, 3 days?")\n• Itineraries (e.g. "Plan a 3-day trip for 4 people")\n• Contacting verified local businesses and emergency contacts\n\nIn the app: see places and where you are on the 🗺 **Live map**, save places with ♥ **Favorites**, plan trips in **Trips**, and track spending in **Budget** and **Expenses**.`,
    };
  },
};
