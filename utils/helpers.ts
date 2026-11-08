import * as Crypto from 'expo-crypto';

export function generateId(): string {
  return Crypto.randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCurrencyCompact(amount: number): string {
  if (amount >= 1_000_000) return `₱${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `₱${(amount / 1_000).toFixed(1)}K`;
  return formatCurrency(amount);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function safeNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return isNaN(n) || !isFinite(n) ? fallback : n;
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

export function getDaysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diff = endDate.getTime() - startDate.getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
}
