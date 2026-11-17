import type { ImageSourcePropType } from 'react-native';

/**
 * Photos bundled with the app, so every destination and business card has its own picture
 * on mobile and web — even offline and before an owner uploads one.
 * An uploaded photo (cover_image_url) always wins; then a photo matched by name;
 * then a photo that fits the category.
 *
 * places/*.jpg are the team's resort photos. places/commons/*.jpg come from Wikimedia Commons
 * under Creative Commons licenses — authors and licenses are in assets/images/places/commons/CREDITS.md.
 */

const IMG = {
  // Destinations
  dahicanBeach: require('../assets/images/places/commons/dahican-beach.jpg'),
  pujadaBay: require('../assets/images/places/commons/pujada-bay.jpg'),
  hamiguitan: require('../assets/images/places/commons/hamiguitan.jpg'),
  aliwagwag: require('../assets/images/places/commons/aliwagwag-falls.jpg'),
  pangyan: require('../assets/images/places/commons/pangyan-falls.jpg'),
  capeSanAgustin: require('../assets/images/places/commons/cape-san-agustin.jpg'),
  subangan: require('../assets/images/places/commons/subangan-museum.jpg'),
  matiCentral: require('../assets/images/places/commons/mati-central.jpg'),
  matiBaywalk: require('../assets/images/places/commons/mati-baywalk.jpg'),
  sleepingDinosaur: require('../assets/images/places/sleeping-dinosaur.jpg'),
  waniban: require('../assets/images/dest-waniban.png'),
  pujadaIsland: require('../assets/images/hero-bg.png'),
  menzi: require('../assets/images/dest-sleeping-dinosaur.png'),
  // Resorts (team photos)
  amery: require('../assets/images/places/amery-palm-villas.jpg'),
  calma: require('../assets/images/places/calma-mati.jpg'),
  dahicanBeachResort: require('../assets/images/places/dahican-beach-resort.jpg'),
  dahicanSurf: require('../assets/images/places/dahican-surf-resort.jpg'),
  praiaVista: require('../assets/images/places/praia-vista.jpg'),
  sheepys: require('../assets/images/places/sheepys-surfside.jpg'),
  somewhere: require('../assets/images/places/somewhere-in-dahican.jpg'),
  surfsUp: require('../assets/images/places/surfs-up-resort.jpg'),
  // Food, transport, tours
  kinilaw: require('../assets/images/places/commons/kinilaw.jpg'),
  kinilaw2: require('../assets/images/places/commons/kinilaw-2.jpg'),
  highway: require('../assets/images/places/commons/mati-highway.jpg'),
  tricycles: require('../assets/images/places/commons/tricycles.jpg'),
  boatView: require('../assets/images/places/commons/pujada-boat-view.jpg'),
} satisfies Record<string, ImageSourcePropType>;

// Most specific first: "Dahican Beach Resort" must match before "Dahican Beach".
const BY_NAME: [RegExp, ImageSourcePropType][] = [
  [/amery/, IMG.amery],
  [/calma/, IMG.calma],
  [/dahican beach resort/, IMG.dahicanBeachResort],
  [/dahican surf/, IMG.dahicanSurf],
  [/praia/, IMG.praiaVista],
  [/sheepy/, IMG.sheepys],
  [/somewhere in dahican/, IMG.somewhere],
  [/surf'?s up/, IMG.surfsUp],
  [/seaside eatery/, IMG.kinilaw2],
  [/island hopping|tours?/, IMG.boatView],
  [/sleeping dinosaur/, IMG.sleepingDinosaur],
  [/waniban/, IMG.waniban],
  [/pujada island/, IMG.pujadaIsland],
  [/pujada/, IMG.pujadaBay],
  [/menzi/, IMG.menzi],
  [/dahican/, IMG.dahicanBeach],
  [/cape san agustin/, IMG.capeSanAgustin],
  [/hamiguitan/, IMG.hamiguitan],
  [/aliwagwag/, IMG.aliwagwag],
  [/pangyan/, IMG.pangyan],
  [/subangan|museum/, IMG.subangan],
  [/market/, IMG.matiCentral],
  [/baywalk|kinilaw|grill/, IMG.kinilaw],
  [/tricycle|habal/, IMG.tricycles],
  [/vans?|bus(es)?|terminal/, IMG.highway],
];

const BY_CATEGORY: [RegExp, ImageSourcePropType][] = [
  [/accommodation|resort|hotel/, IMG.praiaVista],
  [/restaurant|food/, IMG.matiBaywalk],
  [/transport/, IMG.highway],
  [/tour|activity|adventure/, IMG.boatView],
  [/cultural|heritage/, IMG.subangan],
  [/nature/, IMG.hamiguitan],
  [/beach/, IMG.dahicanBeach],
];

export function placeImage(name: string, uploadedUri?: string | null, category?: string | null): ImageSourcePropType {
  if (uploadedUri) return { uri: uploadedUri };
  const n = name.toLowerCase().replace(/[’`]/g, "'");
  const byName = BY_NAME.find(([re]) => re.test(n));
  if (byName) return byName[1];
  const c = (category ?? '').toLowerCase();
  const byCat = BY_CATEGORY.find(([re]) => re.test(c));
  return byCat ? byCat[1] : IMG.dahicanBeach;
}

/** Keeps the first `limit` items whose photos differ, so a row of cards never repeats a picture. */
export function distinctByPhoto<T extends { name: string; cover_image_url?: string | null }>(items: T[], limit: number): T[] {
  const seen = new Set<unknown>();
  const out: T[] = [];
  for (const item of items) {
    const src = placeImage(item.name, item.cover_image_url);
    const key = typeof src === 'object' && src && 'uri' in src ? src.uri : src;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
    if (out.length === limit) break;
  }
  return out;
}
