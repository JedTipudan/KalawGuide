import { AssistantIntent } from '../../types';
import { checkInput, normalize } from './guard';

export interface KnownEntities {
  destinations: string[];
  businesses: string[];
}

type Scored = Exclude<AssistantIntent, 'unrelated' | 'malicious_or_override_attempt'>;

// Array order = tie-break priority.
const KEYWORDS: [Scored, RegExp[]][] = [
  ['emergency_information', [/\bemergenc/, /\bpolice\b/, /\bhospital/, /\bambulance\b/, /\bfire\b/, /\brescue\b/, /\bcoast ?guard\b/, /\bhotline/, /\b911\b/, /\baccident/, /\binjur/]],
  ['business_contact', [/\bbook(ing|ings|ed)?\b/, /\breserv/, /\bcontact (the |a )?(business|owner|resort|hotel)/, /\bphone number of\b/]],
  ['travel_budget', [/\bbudget\b/, /\bhow much\b/, /\bcost/, /\bprepare\b/, /\bspend/, /\bafford/, /\bcheap/, /\blowest\b/, /\b(pinaka)?mura\b|\bbarato\b|\btipid\b/, /₱\s?\d|\bphp\b|\bpesos?\b/]],
  ['itinerary_planning', [/\bitinerar/, /\bplan (a|my|our)\b/, /\bschedule\b/, /\b\d+[- ]?days?\b/, /\b(day|weekend) trip\b/]],
  ['accommodation', [/\baccommodation/, /\bhotels?\b/, /\bresorts?\b/, /\bstay\b/, /\brooms?\b/, /\blodg/, /\binns?\b/, /\bhomestay/, /\bcottages?\b/, /\bovernight\b/]],
  ['transportation', [/\btransport/, /\bbus(es)?\b/, /\bvans?\b/, /\bjeep/, /\btricycle/, /\bhabal/, /\bget(ting)? (to|around)\b/, /\bfares?\b/, /\bhow (do i|to) (go|get)\b/, /\bride\b/]],
  ['food_recommendation', [/\bfood\b/, /\beat\b/, /\brestaurants?\b/, /\bdining\b/, /\bcuisine\b/, /\bseafood\b/, /\bkinilaw\b/, /\bdelicac/, /\bcafes?\b/]],
  ['activity_search', [/\bactivit/, /\bthings to do\b/, /\bsurf/, /\bswim/, /\bsnorkel/, /\bdiv(e|ing)\b/, /\bhik(e|ing)\b/, /\btrek/, /\bisland hopping\b/, /\btours?\b/, /\bkayak/]],
  ['business_information', [/\bbusiness/, /\bshops?\b/, /\bstores?\b/, /\bestablishment/, /\boperators?\b/, /\bopening hours\b/, /\bservices\b/, /\bproducts?\b/, /\bprices?\b/]],
  ['destination_details', [/\btell me about\b/, /\bentrance fee/, /\bwhere is\b/, /\bdetails?\b/]],
  ['destination_search', [/\brecommend/, /\bsuggest/, /\bbest\b/, /\bmust[- ](see|visit|go)\b/, /\bwhere (should|to|can) (i |we )?go\b/, /\bdestinations?\b/, /\bplaces?\b/, /\bspots?\b/, /\bbeach(es)?\b/, /\bfalls\b/, /\bwaterfall/, /\battraction/, /\bvisit/, /\btourist/, /\bmati\b/, /\bdavao oriental\b/]],
  ['app_help', [/\bapp\b/, /\bkalaw ?guide\b/, /\bhow do i (use|save|add|create|sign)\b/, /\bfavou?rites?\b/, /\bsign ?in\b/, /\baccount\b/, /\bprofile\b/, /^(hi|hello|hey|good (morning|afternoon|evening)|thanks?|thank you)\b/]],
];

// Clearly off-topic subjects: refused unless the user names a known KalawGuide place.
const OFF_TOPIC = /\b(python|javascript|java|code|coding|program(ming)?|function|homework|math|equation|essay|elect(ion|ions)|vote|president|senator|politic|joke|capital of|quantum|physics|chemistry|crypto|stock)/;

export function classifyIntent(text: string, known: KnownEntities): AssistantIntent {
  if (checkInput(text).blocked) return 'malicious_or_override_attempt';
  // "within my budget" is a constraint on the search, not the subject; the engine reads it separately.
  const n = normalize(text).replace(/\b(within|under|on|in) (my|our|a|the) budget\b/g, '');
  const has = (names: string[]) => names.some(name => n.includes(name.toLowerCase()));
  const namesDestination = has(known.destinations);
  const namesBusiness = has(known.businesses);

  if (OFF_TOPIC.test(n) && !namesDestination && !namesBusiness) return 'unrelated';

  let best: Scored | null = null;
  let bestScore = 0;
  for (const [intent, patterns] of KEYWORDS) {
    let score = patterns.filter(p => p.test(n)).length;
    if (intent === 'destination_details' && namesDestination) score += 1;
    if (intent === 'business_information' && namesBusiness) score += 1;
    if (score > bestScore) { best = intent; bestScore = score; }
  }
  return best ?? 'unrelated';
}
