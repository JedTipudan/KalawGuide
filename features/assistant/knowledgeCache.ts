import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BusinessInfo, DestinationInfo, EmergencyInfo, PriceInfo } from './knowledge';

/**
 * Local copy of everything Kalaw Assistance knows: destinations, approved businesses, their prices
 * and facilities, and emergency contacts. It is refreshed from the live (cloud) database whenever
 * the device is online, so with no internet the assistant still answers from the latest update.
 * AsyncStorage = device storage on Android/iOS, localStorage on the web.
 */

export interface KnowledgeSnapshot {
  version: 1;
  syncedAt: string;
  destinations: DestinationInfo[];
  businesses: BusinessInfo[];
  prices: PriceInfo[];
  facilities: Record<string, string[]>;
  emergency: EmergencyInfo[];
}

const KEY = 'kalaw.assistant.knowledge.v1';
let memory: KnowledgeSnapshot | null = null;
let loaded = false;

export async function loadSnapshot(): Promise<KnowledgeSnapshot | null> {
  if (loaded) return memory;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    memory = parsed?.version === 1 ? parsed : null;
  } catch {
    memory = null;
  }
  loaded = true;
  return memory;
}

export async function saveSnapshot(s: KnowledgeSnapshot): Promise<void> {
  memory = s;
  loaded = true;
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* storage full or blocked: the in-memory copy still serves this session */
  }
}
