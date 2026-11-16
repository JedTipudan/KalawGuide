import { REFUSAL } from './identity';
import { truncate } from '../../utils/helpers';

/**
 * Application-level security for Kalaw Assistance. Deterministic and layered:
 * input checks → (intent + permissions elsewhere) → sanitized retrieval → output validation.
 * shortcut: pattern-based, not a guarantee; add new attack strings to guard.test.ts when found.
 */

export const MAX_INPUT_LENGTH = 1000;

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };

export function normalize(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[​-‏⁠﻿­]/g, '')
    .toLowerCase()
    .replace(/[013457@$]/g, c => LEET[c])
    .replace(/\s+/g, ' ')
    .trim();
}

const OVERRIDE = [
  /\b(ignore|disregard|forget|override|bypass)\b[^.]{0,40}\b(instructions?|rules?|prompts?|guidelines?|everything|told|above|restrictions?)\b/,
  /\b(you are now|from now on,? you|pretend (to be|you are|you're)|act as|role ?-?play|impersonate|simulate being)\b/,
  /\b(developer|dev|god|debug|admin) mode\b/,
  /\b(jailbreak|do anything now|unrestricted|uncensored|no restrictions|without restrictions|no filters?)\b/,
  /\bnew (instructions?|rules?|persona)\b/,
  /\b(change|switch|update) your (name|identity|persona|role|rules)\b/,
  /\byour new (name|identity|role) is\b/,
];

const EXTRACTION = [
  /\b(system|initial|hidden|original|secret|internal|developer)\s+(prompt|instructions?|message|rules)\b/,
  /\b(reveal|print|show|repeat|output|tell me|display|leak)\b[^.]{0,30}\b(prompt|instructions?|text above|above text|configuration|config)\b/,
];

const DATA_ACCESS = [
  /\b(select|insert|update|delete|drop|alter|union|pragma|attach|truncate)\b[^.]{0,40}\b(from|into|table|set|database|where)\b/,
  /;\s*(drop|delete|update|insert)\b|--\s*$|\bor 1=1\b/,
  /\b(passwords?|passwd|api ?-?keys?|secrets?|tokens?|credentials?|private keys?|hash(es)?)\b/,
  /\b(all|every|list)\b[^.]{0,20}\b(users?|accounts?|emails?)\b/,
  /(\/etc\/|\.env\b|[a-z]:\\|\.\.\/|\bfile ?system\b|\bread (the )?file\b|\beval\(|\bshell\b|\bterminal\b|\bexecute\b)/,
];

const SQUASHED = ['ignoreprevious', 'ignoreallprevious', 'previousinstructions', 'developermode', 'jailbreak', 'systemprompt', 'doanythingnow'];

export type GuardReason = 'empty' | 'too_long' | 'override' | 'extraction' | 'data_access';

function scan(n: string): GuardReason | null {
  if (OVERRIDE.some(r => r.test(n))) return 'override';
  if (EXTRACTION.some(r => r.test(n))) return 'extraction';
  if (DATA_ACCESS.some(r => r.test(n))) return 'data_access';
  const squashed = n.replace(/[^a-z]/g, '');
  if (SQUASHED.some(s => squashed.includes(s))) return 'override';
  return null;
}

function decodeBase64Blobs(text: string): string[] {
  const blobs = text.match(/[A-Za-z0-9+/]{16,}={0,2}/g) ?? [];
  const out: string[] = [];
  for (const b of blobs) {
    try { out.push(atob(b)); } catch { /* not base64 */ }
  }
  return out;
}

export function checkInput(text: string): { blocked: boolean; reason?: GuardReason } {
  if (!text || !text.trim()) return { blocked: true, reason: 'empty' };
  if (text.length > MAX_INPUT_LENGTH) return { blocked: true, reason: 'too_long' };
  for (const candidate of [text, ...decodeBase64Blobs(text)]) {
    const reason = scan(normalize(candidate));
    if (reason) return { blocked: true, reason };
  }
  return { blocked: false };
}

/** Database text is untrusted data: strip markup and drop any instruction-like sentence. */
export function sanitizeRetrieved(text: string | null | undefined, max = 300): string {
  if (!text) return '';
  const plain = text
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/[​-‏⁠﻿]/g, '');
  const sentences = plain.match(/[^.!?\n]+[.!?]*/g) ?? [];
  const kept = sentences.map(s => s.trim()).filter(s => s && !scan(normalize(s)));
  return truncate(kept.join(' '), max);
}

const LEAKS = [
  /\bpass(word|wd)\s*[:=]/i,
  /\bpwd_[a-z0-9_]+/i,
  /\beyJ[A-Za-z0-9_-]{10,}\./,
  /\bsk-[A-Za-z0-9-]{16,}/,
  /\bsystem prompt\b/i,
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/,
];

/** Last gate before display: anything that looks like a leak becomes the standard refusal. */
export function validateOutput(text: string): string {
  return LEAKS.some(r => r.test(text)) ? REFUSAL : text;
}
