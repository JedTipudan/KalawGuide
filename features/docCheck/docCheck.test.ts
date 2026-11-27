jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual('crypto').randomUUID() }));

import * as SQLite from 'expo-sqlite';
import { openFakeDatabase, resetDatabase } from '../../testing/fakeSqlite';
import { getDatabase } from '../../database/migrations/init';
import { decide, isExpired, normalizeDocNumber, parseFindings, type AiFindings, type LocalSignals } from './verdict';
import { checkDocument, getDocumentChecks, worstVerdict } from './documentCheckService';
import { splitDataUri } from './aiVision';

const clean: LocalSignals = { sameImageElsewhere: [], sameNumberElsewhere: [], sameImageOtherType: [], lowQuality: false, unreadable: false };
const genuine: AiFindings = {
  isDocument: true, detectedType: "Mayor's Permit", matchesExpectedType: true, namesOnDocument: ['Sunrise Resort'],
  nameMatchesBusinessOrOwner: true, documentNumber: 'BP-2026-00123', issuer: 'City of Mati BPLO',
  issueDate: '2026-01-10', expiryDate: '2026-12-31', tamperingSigns: [], isScreenshotOrPhotocopy: false,
  legible: true, authenticityScore: 90, summary: 'Clear Mati business permit.',
};
const today = new Date('2026-11-27T08:00:00');

describe('decide', () => {
  it('a clear, matching, valid document looks original', () => {
    const d = decide(genuine, clean, today);
    expect(d.verdict).toBe('legit');
    expect(d.score).toBe(90);
  });

  it('the same image from another business is a duplicate, whatever the AI says', () => {
    const d = decide(genuine, { ...clean, sameImageElsewhere: [{ businessName: 'Shady Inn', label: 'Business Permit' }] }, today);
    expect(d.verdict).toBe('duplicate');
    expect(d.score).toBeLessThanOrEqual(10);
    expect(d.flags[0].text).toContain('Shady Inn');
  });

  it('signs of editing make it possibly fake', () => {
    const d = decide({ ...genuine, tamperingSigns: ['name typed in a different font'] }, clean, today);
    expect(d.verdict).toBe('suspicious');
    expect(d.score).toBeLessThanOrEqual(35);
  });

  it('expired, wrong name or wrong type needs review', () => {
    expect(decide({ ...genuine, expiryDate: '2025-12-31' }, clean, today).verdict).toBe('review');
    expect(decide({ ...genuine, nameMatchesBusinessOrOwner: false }, clean, today).verdict).toBe('review');
    expect(decide({ ...genuine, matchesExpectedType: false, detectedType: 'Barangay clearance' }, clean, today).verdict).toBe('review');
  });

  it('without AI, a clean document still needs a human review', () => {
    const d = decide(null, clean, today);
    expect(d.verdict).toBe('review');
    expect(d.flags.some(f => f.level === 'info')).toBe(true);
  });

  it('a non-document is possibly fake', () => {
    expect(decide({ ...genuine, isDocument: false, authenticityScore: 5 }, clean, today).verdict).toBe('suspicious');
  });
});

describe('helpers', () => {
  it('parses AI output cautiously', () => {
    expect(parseFindings({ authenticityScore: 'x' })).toBeNull();
    const p = parseFindings({ authenticityScore: 150, isDocument: true })!;
    expect(p.authenticityScore).toBe(100);
    expect(p.legible).toBe(false); // missing → cautious
    expect(p.nameMatchesBusinessOrOwner).toBe(false);
  });

  it('normalizes document numbers so formatting changes still match', () => {
    expect(normalizeDocNumber('No. 2024-0123')).toBe(normalizeDocNumber('20240123'));
    expect(normalizeDocNumber('12')).toBeNull();
  });

  it('expiry: past date expired, unknown not', () => {
    expect(isExpired('2026-11-26', today)).toBe(true);
    expect(isExpired('2026-11-27', today)).toBe(false);
    expect(isExpired('soon', today)).toBe(false);
  });

  it('splits data URIs', () => {
    expect(splitDataUri('data:image/png;base64,QUJD')).toEqual({ mimeType: 'image/png', data: 'QUJD' });
    expect(splitDataUri('file:///x.jpg')).toBeNull();
  });

  it('worstVerdict picks the most serious', () => {
    const c = (verdict: 'legit' | 'duplicate') => ({ verdict } as never);
    expect(worstVerdict([c('legit'), undefined, c('duplicate')])).toBe('duplicate');
    expect(worstVerdict([])).toBeNull();
  });
});

describe('checkDocument', () => {
  const open = SQLite.openDatabaseAsync as jest.Mock;
  const img = 'data:image/jpeg;base64,' + 'A'.repeat(50_000);
  const hash = async (t: string) => `h${t.length}`; // same image → same hash

  beforeEach(async () => {
    resetDatabase();
    open.mockReset();
    open.mockImplementation(async () => openFakeDatabase());
    const db = await getDatabase();
    const t = '2026-01-01T00:00:00Z';
    await db.runAsync('INSERT INTO users (id,email,display_name,role,provider,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', ['o1', 'o@x', 'Ana Cruz', 'business_owner', 'email', 'active', t, t]);
    const biz = 'INSERT INTO businesses (id,owner_id,name,description,category,address,verification_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)';
    await db.runAsync(biz, ['b1', 'o1', 'Sunrise Resort', 'x', 'accommodation', 'Mati', 'pending', t, t]);
    await db.runAsync(biz, ['b2', 'o1', 'Copycat Inn', 'x', 'accommodation', 'Mati', 'pending', t, t]);
    const doc = 'INSERT INTO business_documents (id,business_id,document_type,label,uri,mime_type,uploaded_at) VALUES (?,?,?,?,?,?,?)';
    await db.runAsync(doc, ['d1', 'b1', 'business_permit', 'Business Permit', img, 'image/jpeg', t]);
    await db.runAsync(doc, ['d2', 'b2', 'business_permit', 'Business Permit', img, 'image/jpeg', t]);
  });

  it('flags the second business that submits the same image, and saves the result', async () => {
    const first = await checkDocument('d1', { vision: null, hash, today });
    expect(first.verdict).toBe('review'); // no AI → human review
    const second = await checkDocument('d2', { vision: null, hash, today });
    expect(second.verdict).toBe('duplicate');
    expect(second.flags[0].text).toContain('Sunrise Resort');

    const saved = await getDocumentChecks();
    expect(saved.d2.verdict).toBe('duplicate');
  });

  it('uses the AI reading and catches the same permit number on a different image', async () => {
    const db = await getDatabase();
    await db.runAsync("UPDATE business_documents SET uri = ? WHERE id = 'd2'", ['data:image/jpeg;base64,' + 'B'.repeat(60_000)]);
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(genuine) }] } }] }),
    })) as unknown as typeof fetch;
    const vision = { apiKey: 'k', model: 'm', fetchImpl };

    expect((await checkDocument('d1', { vision, hash, today })).verdict).toBe('legit');
    const second = await checkDocument('d2', { vision, hash, today });
    expect(second.verdict).toBe('duplicate');
    expect(second.flags.some(f => f.text.includes('document number'))).toBe(true);
  });

  it('falls back to records-only when the AI fails', async () => {
    const fetchImpl = jest.fn(async () => ({ ok: false, status: 429 })) as unknown as typeof fetch;
    const r = await checkDocument('d1', { vision: { apiKey: 'k', model: 'm', fetchImpl }, hash, today });
    expect(r.verdict).toBe('review');
    expect(r.flags.some(f => f.text.includes('429'))).toBe(true);
  });
});
