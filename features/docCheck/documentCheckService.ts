import * as Crypto from 'expo-crypto';
import { getDatabase } from '../../database/migrations/init';
import { now } from '../../utils/helpers';
import { readDocument, splitDataUri, visionConfigFromEnv, type VisionConfig } from './aiVision';
import { decide, normalizeDocNumber, type AiFindings, type DocVerdict, type DuplicateHit, type Flag } from './verdict';

/**
 * Runs the AI Document Check for one uploaded business document and saves the result in
 * document_checks (online-only, like the documents themselves). See verdict.ts for the rules.
 */

/** What each upload slot should contain (keys match DOCUMENT_TYPES in the business profile). */
export const EXPECTED_DOCUMENT: Record<string, string> = {
  business_permit: "Business Permit (Mayor's permit or DTI business name registration)",
  bir_certificate: 'BIR Certificate of Registration (BIR Form 2303)',
  ownership_proof: 'Proof of ownership or right to operate: land title, lease contract or deed of sale',
  valid_id: "Owner's Philippine government-issued ID",
  other: 'A supporting business document',
};

/** Below this the photo is too small to verify (~30 KB of image). */
const LOW_QUALITY_LENGTH = 40_000;

export interface DocCheck {
  documentId: string;
  verdict: DocVerdict;
  score: number;
  summary: string;
  flags: Flag[];
  findings: AiFindings | null;
  checkedAt: string;
}

interface Deps {
  vision?: VisionConfig | null;
  hash?: (text: string) => Promise<string>;
  today?: Date;
}

const sha256 = (t: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, t);

export async function checkDocument(documentId: string, deps: Deps = {}): Promise<DocCheck> {
  const db = await getDatabase();
  const doc = await db.getFirstAsync<{
    id: string; business_id: string; document_type: string; label: string; uri: string;
    business_name: string; address: string; owner_name: string | null;
  }>(
    `SELECT bd.id, bd.business_id, bd.document_type, bd.label, bd.uri,
            b.name as business_name, b.address, u.display_name as owner_name
     FROM business_documents bd JOIN businesses b ON b.id = bd.business_id
     LEFT JOIN users u ON u.id = b.owner_id WHERE bd.id = ?`,
    [documentId]
  );
  if (!doc) throw new Error('Document not found');

  const image = splitDataUri(doc.uri);
  const imageHash = await (deps.hash ?? sha256)(image ? image.data : doc.uri);

  // 1. KalawGuide's own records: has this image been submitted before?
  const sameImage = await db.getAllAsync<{ business_id: string; business_name: string; label: string }>(
    `SELECT bd.business_id, b.name as business_name, bd.label
     FROM document_checks dc JOIN business_documents bd ON bd.id = dc.document_id
     JOIN businesses b ON b.id = bd.business_id
     WHERE dc.image_hash = ? AND dc.document_id <> ?`,
    [imageHash, doc.id]
  );

  // 2. The AI's reading of the image.
  const vision = deps.vision === undefined ? visionConfigFromEnv() : deps.vision;
  let findings: AiFindings | null = null;
  let aiError: string | null = null;
  if (image && vision) {
    try {
      findings = await readDocument(image, {
        expectedType: EXPECTED_DOCUMENT[doc.document_type] ?? doc.label,
        businessName: doc.business_name,
        ownerName: doc.owner_name,
        address: doc.address,
      }, vision);
    } catch (e) {
      aiError = e instanceof Error ? e.message : String(e);
    }
  }

  // 3. Same permit/registration number used by another business?
  const docNumber = normalizeDocNumber(findings?.documentNumber ?? null);
  const sameNumber = docNumber
    ? await db.getAllAsync<{ business_name: string; label: string }>(
      `SELECT b.name as business_name, bd.label
       FROM document_checks dc JOIN business_documents bd ON bd.id = dc.document_id
       JOIN businesses b ON b.id = bd.business_id
       WHERE dc.doc_number = ? AND bd.business_id <> ?`,
      [docNumber, doc.business_id]
    )
    : [];

  const hit = (r: { business_name: string; label: string }): DuplicateHit => ({ businessName: r.business_name, label: r.label });
  const decision = decide(findings, {
    sameImageElsewhere: sameImage.filter(r => r.business_id !== doc.business_id).map(hit),
    sameNumberElsewhere: sameNumber.map(hit),
    sameImageOtherType: sameImage.filter(r => r.business_id === doc.business_id).map(r => r.label),
    lowQuality: !!image && image.data.length < LOW_QUALITY_LENGTH,
    unreadable: !image,
  }, deps.today);
  if (aiError) decision.flags.push({ level: 'info', text: `The AI could not read it this time (${aiError}). Try again later.` });

  const summary = findings?.summary || (image ? 'Checked against KalawGuide records only.' : 'The file could not be read.');
  const checkedAt = now();
  await db.runAsync('DELETE FROM document_checks WHERE document_id = ?', [doc.id]);
  await db.runAsync(
    `INSERT INTO document_checks (document_id, business_id, image_hash, doc_number, verdict, score, summary, flags, findings, model, checked_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [doc.id, doc.business_id, imageHash, docNumber, decision.verdict, decision.score, summary,
      JSON.stringify(decision.flags), findings ? JSON.stringify(findings) : null, findings ? vision!.model : null, checkedAt]
  );
  return { documentId: doc.id, ...decision, summary, findings, checkedAt };
}

/** All saved checks, keyed by document id. */
export async function getDocumentChecks(): Promise<Record<string, DocCheck>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{
    document_id: string; verdict: DocVerdict; score: number; summary: string | null;
    flags: string; findings: string | null; checked_at: string;
  }>('SELECT document_id, verdict, score, summary, flags, findings, checked_at FROM document_checks');
  const out: Record<string, DocCheck> = {};
  for (const r of rows) {
    out[r.document_id] = {
      documentId: r.document_id, verdict: r.verdict, score: r.score, summary: r.summary ?? '',
      flags: safeJson<Flag[]>(r.flags, []), findings: safeJson<AiFindings | null>(r.findings, null), checkedAt: r.checked_at,
    };
  }
  return out;
}

function safeJson<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  try { return JSON.parse(text) as T; } catch { return fallback; }
}

const RANK: Record<DocVerdict, number> = { legit: 0, review: 1, suspicious: 2, duplicate: 3 };

/** The worst verdict among a business's checked documents (for the Businesses list). */
export function worstVerdict(checks: (DocCheck | undefined)[]): DocVerdict | null {
  let worst: DocVerdict | null = null;
  for (const c of checks) if (c && (worst === null || RANK[c.verdict] > RANK[worst])) worst = c.verdict;
  return worst;
}
