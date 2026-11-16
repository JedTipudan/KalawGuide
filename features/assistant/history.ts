import { getDatabase } from '../../database/migrations/init';
import { AssistantMessage, AssistantReplyMeta } from '../../types';

// Chat history in the existing assistant_messages table, always scoped to the owning user.
const LIMIT = 100;

export async function loadHistory(userId: string): Promise<AssistantMessage[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string; role: string; content: string; timestamp: string; metadata: string | null }>(
    `SELECT id, role, content, timestamp, metadata FROM (
       SELECT * FROM assistant_messages WHERE user_id = ? ORDER BY timestamp DESC LIMIT ${LIMIT}
     ) ORDER BY timestamp ASC`,
    [userId]
  );
  return rows.map(r => {
    let metadata: AssistantReplyMeta | undefined;
    try { metadata = r.metadata ? JSON.parse(r.metadata) : undefined; } catch { /* ignore corrupt row metadata */ }
    return { id: r.id, role: r.role === 'assistant' ? 'assistant' : 'user', content: r.content, timestamp: r.timestamp, metadata };
  });
}

export async function saveMessage(userId: string, m: AssistantMessage): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO assistant_messages (id, session_id, user_id, role, content, timestamp, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [m.id, userId, userId, m.role, m.content, m.timestamp, m.metadata ? JSON.stringify(m.metadata) : null]
  );
}

export async function clearHistory(userId: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM assistant_messages WHERE user_id = ?', [userId]);
}
