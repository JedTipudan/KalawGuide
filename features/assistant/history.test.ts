jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

import * as SQLite from 'expo-sqlite';
import { openFakeDatabase, resetDatabase } from '../../testing/fakeSqlite';
import { clearHistory, loadHistory, saveMessage } from './history';
import { AssistantMessage } from '../../types';

beforeEach(() => {
  resetDatabase();
  (SQLite.openDatabaseAsync as jest.Mock).mockImplementation(async () => openFakeDatabase());
});

const msg = (id: string, timestamp: string, extra: Partial<AssistantMessage> = {}): AssistantMessage =>
  ({ id, role: 'user', content: `text ${id}`, timestamp, ...extra });

it('persists per user, in order, with metadata', async () => {
  await saveMessage('u1', msg('a', '2026-01-01T00:00:01Z'));
  await saveMessage('u2', msg('x', '2026-01-01T00:00:02Z'));
  await saveMessage('u1', msg('b', '2026-01-01T00:00:03Z', {
    role: 'assistant',
    metadata: { intent: 'app_help', sources: [], offline: true, hasEstimates: false, model: 'deterministic' },
  }));

  const h = await loadHistory('u1');
  expect(h.map(m => m.id)).toEqual(['a', 'b']);
  expect(h[1].metadata).toMatchObject({ intent: 'app_help', offline: true });
});

it('clearing one user leaves others untouched', async () => {
  await saveMessage('u1', msg('a', '2026-01-01T00:00:01Z'));
  await saveMessage('u2', msg('x', '2026-01-01T00:00:02Z'));
  await clearHistory('u1');
  expect(await loadHistory('u1')).toEqual([]);
  expect((await loadHistory('u2')).map(m => m.id)).toEqual(['x']);
});
