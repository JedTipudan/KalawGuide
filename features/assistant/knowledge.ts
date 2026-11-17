import { DATABASE_MODE, getDatabase } from '../../database/migrations/init';
import { sanitizeRetrieved } from './guard';
import { KnowledgeSnapshot, loadSnapshot, saveSnapshot } from './knowledgeCache';

/**
 * The assistant's only path to data: fixed, parameterized, read-only queries.
 * User text never becomes SQL. Businesses and their prices are limited to
 * approved + active listings; personal records are scoped to the signed-in user.
 * All text coming back is sanitized (DB content is data, never instructions).
 */

const APPROVED = "b.verification_status = 'approved' AND b.is_active = 1";

export interface DestinationInfo {
  id: string; name: string; location: string; description: string;
  fee: number | null; feeVerified: boolean; category: string | null;
  latitude: number | null; longitude: number | null; isFeatured: boolean;
}

export interface BusinessInfo {
  id: string; name: string; category: string; address: string; description: string;
  contact: string | null; hours: string | null;
}

export interface PriceInfo {
  businessId: string; businessName: string; businessCategory: string;
  title: string; amount: number; unit: string; category: string;
  /** listing prices are published by an approved business (demo sample prices count as estimates); services/products carry their own flag */
  verified: boolean;
}

const placeholders = (n: number) => Array.from({ length: n }, () => '?').join(',');

async function liveDestinations(): Promise<DestinationInfo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    id: string; name: string; location: string; description: string; fee: number | null;
    fee_verified: number; is_featured: number; latitude: number | null; longitude: number | null; category: string | null;
  }>(
    `SELECT d.id, d.name, d.location, d.description, d.estimated_fee AS fee, d.fee_verified, d.is_featured,
            d.latitude, d.longitude, c.name AS category
     FROM destinations d LEFT JOIN destination_categories c ON c.id = d.category_id
     WHERE d.is_active = 1 ORDER BY d.is_featured DESC, d.name`
  );
  return rows
    .map(r => ({
      id: r.id,
      name: sanitizeRetrieved(r.name, 80),
      location: sanitizeRetrieved(r.location, 120),
      description: sanitizeRetrieved(r.description, 240),
      fee: r.fee,
      feeVerified: r.fee_verified === 1,
      category: r.category,
      latitude: r.latitude,
      longitude: r.longitude,
      isFeatured: r.is_featured === 1,
    }))
    .filter(d => d.name);
}

async function liveBusinesses(categories?: string[]): Promise<BusinessInfo[]> {
  const db = await getDatabase();
  const filter = categories?.length ? ` AND b.category IN (${placeholders(categories.length)})` : '';
  const rows = await db.getAllAsync<{
    id: string; name: string; category: string; address: string; description: string;
    contact_number: string | null; operating_hours: string | null;
  }>(
    `SELECT b.id, b.name, b.category, b.address, b.description, b.contact_number, b.operating_hours
     FROM businesses b WHERE ${APPROVED}${filter} ORDER BY b.name`,
    categories ?? []
  );
  return rows
    .map(r => ({
      id: r.id,
      name: sanitizeRetrieved(r.name, 80),
      category: r.category,
      address: sanitizeRetrieved(r.address, 160),
      description: sanitizeRetrieved(r.description, 200),
      contact: r.contact_number ? sanitizeRetrieved(r.contact_number, 40) : null,
      hours: r.operating_hours ? sanitizeRetrieved(r.operating_hours, 80) : null,
    }))
    .filter(b => b.name);
}

async function livePrices(businessIds: string[]): Promise<PriceInfo[]> {
  if (businessIds.length === 0) return [];
  const db = await getDatabase();
  const ids = placeholders(businessIds.length);
  type Row = { business_id: string; business_name: string; business_category: string; title: string; amount: number; unit: string; category: string; verified: number };
  const listing = await db.getAllAsync<Row>(
    `SELECT p.business_id, b.name AS business_name, b.category AS business_category, p.title, p.amount, p.unit, p.category,
            CASE WHEN p.conditions LIKE 'Sample price%' THEN 0 ELSE 1 END AS verified
     FROM listing_prices p JOIN businesses b ON b.id = p.business_id
     WHERE p.is_active = 1 AND ${APPROVED} AND p.business_id IN (${ids})`,
    businessIds
  );
  const services = await db.getAllAsync<Row>(
    `SELECT s.business_id, b.name AS business_name, b.category AS business_category, s.name AS title, s.price AS amount,
            COALESCE(s.duration, 'per service') AS unit, 'service' AS category, s.price_verified AS verified
     FROM business_services s JOIN businesses b ON b.id = s.business_id
     WHERE s.is_available = 1 AND ${APPROVED} AND s.business_id IN (${ids})`,
    businessIds
  );
  const products = await db.getAllAsync<Row>(
    `SELECT pr.business_id, b.name AS business_name, b.category AS business_category, pr.name AS title, pr.price AS amount,
            'per item' AS unit, 'product' AS category, pr.price_verified AS verified
     FROM business_products pr JOIN businesses b ON b.id = pr.business_id
     WHERE pr.is_available = 1 AND ${APPROVED} AND pr.business_id IN (${ids})`,
    businessIds
  );
  return [...listing, ...services, ...products]
    .map(r => ({
      businessId: r.business_id,
      businessName: sanitizeRetrieved(r.business_name, 80),
      businessCategory: r.business_category,
      title: sanitizeRetrieved(r.title, 80),
      amount: r.amount,
      unit: sanitizeRetrieved(r.unit, 40),
      category: r.category,
      verified: r.verified === 1,
    }))
    .filter(p => p.title && isFinite(p.amount) && p.amount >= 0)
    .sort((a, b) => a.amount - b.amount);
}

async function liveFacilities(businessId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: string }>(
    `SELECT f.name FROM listing_facilities f JOIN businesses b ON b.id = f.business_id
     WHERE f.business_id = ? AND ${APPROVED} LIMIT 8`,
    [businessId]
  );
  return rows.map(r => sanitizeRetrieved(r.name, 40)).filter(Boolean);
}

export interface EmergencyInfo { name: string; organization: string; number: string; verified: boolean }

async function liveEmergency(): Promise<EmergencyInfo[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ name: string; organization: string; contact_number: string; is_verified: number }>(
    'SELECT name, organization, contact_number, is_verified FROM emergency_contacts ORDER BY is_verified DESC, name'
  );
  return rows.map(r => ({
    name: sanitizeRetrieved(r.name, 80),
    organization: sanitizeRetrieved(r.organization, 80),
    number: sanitizeRetrieved(r.contact_number, 40),
    verified: r.is_verified === 1,
  }));
}


// ─── Live data first, local snapshot when offline ────────────────────────────

let offlineHint = false;
let lastFromSnapshot: string | null = null;

/** The engine tells us when the device is offline, so an online database isn't waited on for nothing. */
export function setOfflineHint(offline: boolean) { offlineHint = offline; }

/** syncedAt of the snapshot used by the most recent read, or null when it came from the live database. */
export function lastSnapshotUsed(): string | null { return lastFromSnapshot; }

async function read<T>(live: () => Promise<T>, fromSnapshot: (s: KnowledgeSnapshot) => T): Promise<T> {
  // The on-device database is always current; only the shared online one can be out of reach.
  const snap = DATABASE_MODE === 'online' ? await loadSnapshot() : null;
  if (snap && offlineHint) { lastFromSnapshot = snap.syncedAt; return fromSnapshot(snap); }
  try {
    const value = await live();
    lastFromSnapshot = null;
    return value;
  } catch (e) {
    if (!snap) throw e;
    lastFromSnapshot = snap.syncedAt;
    return fromSnapshot(snap);
  }
}

export function getDestinations(): Promise<DestinationInfo[]> {
  return read(liveDestinations, s => s.destinations);
}

export function getApprovedBusinesses(categories?: string[]): Promise<BusinessInfo[]> {
  return read(() => liveBusinesses(categories),
    s => (categories?.length ? s.businesses.filter(b => categories.includes(b.category)) : s.businesses));
}

export function getPrices(businessIds: string[]): Promise<PriceInfo[]> {
  return read(() => livePrices(businessIds), s => s.prices.filter(p => businessIds.includes(p.businessId)));
}

export function getFacilities(businessId: string): Promise<string[]> {
  return read(() => liveFacilities(businessId), s => s.facilities[businessId] ?? []);
}

export function getEmergencyContacts(): Promise<EmergencyInfo[]> {
  return read(liveEmergency, s => s.emergency);
}

/**
 * Copy the latest approved data into local storage. Call it while online: this is how changes made
 * by business owners and the admin on other devices reach the assistant for offline use.
 */
export async function syncKnowledge(): Promise<KnowledgeSnapshot> {
  const [destinations, businesses, emergency] = await Promise.all([liveDestinations(), liveBusinesses(), liveEmergency()]);
  const prices = await livePrices(businesses.map(b => b.id));
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ business_id: string; name: string }>(
    `SELECT f.business_id, f.name FROM listing_facilities f JOIN businesses b ON b.id = f.business_id WHERE ${APPROVED}`
  );
  const facilities: Record<string, string[]> = {};
  for (const r of rows) {
    const name = sanitizeRetrieved(r.name, 40);
    if (!name) continue;
    const list = (facilities[r.business_id] ??= []);
    if (list.length < 8) list.push(name);
  }
  const snapshot: KnowledgeSnapshot = {
    version: 1, syncedAt: new Date().toISOString(), destinations, businesses, prices, facilities, emergency,
  };
  await saveSnapshot(snapshot);
  return snapshot;
}

// Re-exported so the chat screen can show when the local copy was last updated.
export { loadSnapshot };
