/**
 * AI Document Check — how the verdict is decided.
 *
 * Two kinds of evidence are combined:
 *  1. KalawGuide's own records (always run, no AI needed): is this exact image, or the same
 *     permit/registration number, already submitted by ANOTHER business? Was one image uploaded as
 *     two different documents? Is the image too small to read?
 *  2. The AI's reading of the image (when a Gemini key is set): is it really the expected kind of
 *     document, whose name is on it, its number and dates, and any signs of editing.
 *
 * The AI cannot "talk its way" to a good verdict: any red flag from our own records wins, and the
 * result is advice for the admin, never an automatic approval.
 */

export type DocVerdict = 'legit' | 'review' | 'suspicious' | 'duplicate';

export interface AiFindings {
  isDocument: boolean;
  detectedType: string;
  matchesExpectedType: boolean;
  namesOnDocument: string[];
  nameMatchesBusinessOrOwner: boolean;
  documentNumber: string | null;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  tamperingSigns: string[];
  isScreenshotOrPhotocopy: boolean;
  legible: boolean;
  /** 0–100: how likely the AI thinks the document is genuine. */
  authenticityScore: number;
  summary: string;
}

export interface DuplicateHit { businessName: string; label: string }

export interface LocalSignals {
  /** Other businesses that uploaded this exact same image. */
  sameImageElsewhere: DuplicateHit[];
  /** Other businesses whose document shows the same document number. */
  sameNumberElsewhere: DuplicateHit[];
  /** Other document types of THIS business that use this exact image. */
  sameImageOtherType: string[];
  lowQuality: boolean;
  /** The file is not a readable image (e.g. an old file:// link from another phone). */
  unreadable: boolean;
}

export interface Flag { level: 'high' | 'medium' | 'info'; text: string }

export interface Decision { verdict: DocVerdict; score: number; flags: Flag[] }

export const VERDICT_LABEL: Record<DocVerdict, string> = {
  legit: 'Looks original',
  review: 'Needs review',
  suspicious: 'Possibly fake',
  duplicate: 'Duplicate',
};

const list = (hits: DuplicateHit[]) => hits.map(h => `${h.businessName} (${h.label})`).join(', ');

/** "1 Jan 2020", "2020-01-01" and similar → is it before today? Unknown dates are not "expired". */
export function isExpired(date: string | null, today = new Date()): boolean {
  if (!date) return false;
  const t = Date.parse(date);
  if (Number.isNaN(t)) return false;
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  return t < startOfToday;
}

export function decide(ai: AiFindings | null, local: LocalSignals, today = new Date()): Decision {
  const flags: Flag[] = [];
  const high = (text: string) => flags.push({ level: 'high', text });
  const medium = (text: string) => flags.push({ level: 'medium', text });

  let duplicate = false;
  if (local.sameImageElsewhere.length) {
    duplicate = true;
    high(`The exact same image was submitted by another business: ${list(local.sameImageElsewhere)}.`);
  }
  if (local.sameNumberElsewhere.length) {
    duplicate = true;
    high(`The same document number appears on another business's document: ${list(local.sameNumberElsewhere)}.`);
  }
  if (local.sameImageOtherType.length) {
    medium(`The same image was also uploaded as: ${local.sameImageOtherType.join(', ')}.`);
  }
  if (local.unreadable) medium('The file is not a readable image, so it could not be checked.');
  else if (local.lowQuality) medium('The image is very small or blurry; details are hard to verify.');

  if (ai) {
    if (!ai.isDocument) high('This does not look like an official document.');
    for (const sign of ai.tamperingSigns.slice(0, 5)) high(`Possible editing: ${sign}`);
    if (ai.authenticityScore < 40) high('The AI rates this document as unlikely to be genuine.');
    if (ai.isDocument && !ai.matchesExpectedType) medium(`Wrong document type: it looks like "${ai.detectedType || 'something else'}".`);
    if (ai.isDocument && !ai.nameMatchesBusinessOrOwner) {
      medium(ai.namesOnDocument.length
        ? `The name on the document (${ai.namesOnDocument.slice(0, 3).join(', ')}) does not match the business or owner.`
        : 'No business or owner name could be found on the document.');
    }
    if (isExpired(ai.expiryDate, today)) medium(`The document expired on ${ai.expiryDate}.`);
    if (ai.isScreenshotOrPhotocopy) medium('It looks like a screenshot, photocopy or photo of a screen, not the original.');
    if (!ai.legible) medium('Important parts of the document are not readable.');
    if (ai.authenticityScore >= 40 && ai.authenticityScore < 70) medium('The AI is not confident this document is genuine.');
  } else {
    flags.push({ level: 'info', text: 'AI reading was not available, so only KalawGuide\'s duplicate checks ran.' });
  }

  const hasHigh = flags.some(f => f.level === 'high');
  const hasMedium = flags.some(f => f.level === 'medium');
  const verdict: DocVerdict = duplicate ? 'duplicate'
    : hasHigh ? 'suspicious'
    : hasMedium || !ai ? 'review'
    : 'legit';

  const mediums = flags.filter(f => f.level === 'medium').length;
  const base = Math.max(0, Math.min(100, Math.round(ai?.authenticityScore ?? 50))) - 10 * mediums;
  const cap = { duplicate: 10, suspicious: 35, review: 69, legit: 100 }[verdict];
  const score = Math.max(0, Math.min(cap, base));
  return { verdict, score, flags };
}

// ─── Reading the AI's JSON safely ────────────────────────────────────────────

const str = (v: unknown, max = 200) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const strOrNull = (v: unknown) => str(v) || null;
const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
const strList = (v: unknown) => (Array.isArray(v) ? v.map(x => str(x, 160)).filter(Boolean).slice(0, 8) : []);

/** Anything missing or malformed falls back to the cautious value, never the trusting one. */
export function parseFindings(raw: unknown): AiFindings | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const score = typeof r.authenticityScore === 'number' ? r.authenticityScore : Number(r.authenticityScore);
  if (!Number.isFinite(score)) return null;
  return {
    isDocument: bool(r.isDocument, false),
    detectedType: str(r.detectedType, 80),
    matchesExpectedType: bool(r.matchesExpectedType, false),
    namesOnDocument: strList(r.namesOnDocument),
    nameMatchesBusinessOrOwner: bool(r.nameMatchesBusinessOrOwner, false),
    documentNumber: strOrNull(r.documentNumber),
    issuer: strOrNull(r.issuer),
    issueDate: strOrNull(r.issueDate),
    expiryDate: strOrNull(r.expiryDate),
    tamperingSigns: strList(r.tamperingSigns),
    isScreenshotOrPhotocopy: bool(r.isScreenshotOrPhotocopy, false),
    legible: bool(r.legible, false),
    authenticityScore: Math.max(0, Math.min(100, Math.round(score))),
    summary: str(r.summary, 400),
  };
}

/** "No. 2024-0123", "2024 0123", "20240123" → "20240123", so small formatting changes still match. */
export function normalizeDocNumber(n: string | null): string | null {
  if (!n) return null;
  const k = n.toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^(NO|NUMBER|PERMITNO)/, '');
  return k.length >= 5 ? k : null; // too short to be a real identifier
}
