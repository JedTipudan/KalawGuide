import { getDatabase } from '../../database/migrations/init';
import { generateId, now } from '../../utils/helpers';

/**
 * Platform activity log (admin "Activity Logs" screens).
 * Writes never throw: a failed log must never break the action that triggered it.
 */

export type ActivityCategory = 'account' | 'business' | 'content';

export interface ActivityInput {
  /** Who did it. null for system / anonymous events (e.g. a failed sign-in). */
  userId: string | null;
  action: string;
  entityType: 'user' | 'business' | 'listing' | 'price' | 'product' | 'destination' | 'category' | 'emergency_contact' | 'system';
  entityId: string;
  entityName?: string | null;
  details?: string | null;
}

export interface ActivityEntry {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  entity_name: string | null;
  details: string | null;
  created_at: string;
  user_email: string | null;
  user_name: string | null;
}

const CATEGORY_BY_ENTITY: Record<string, ActivityCategory> = {
  user: 'account',
  system: 'account',
  business: 'business',
  listing: 'business',
  price: 'business',
  product: 'business',
  destination: 'content',
  category: 'content',
  emergency_contact: 'content',
};

export const ACTION_META: Record<string, { icon: string; label: string }> = {
  signed_in: { icon: '🔑', label: 'Signed in' },
  signed_in_google: { icon: '🔑', label: 'Signed in with Google' },
  sign_in_failed: { icon: '⚠️', label: 'Failed sign-in attempt' },
  signed_out: { icon: '👋', label: 'Signed out' },
  registered: { icon: '🆕', label: 'Created an account' },
  role_set: { icon: '🎭', label: 'Chose account role' },
  role_changed: { icon: '🎭', label: 'Changed a user role' },
  user_blocked: { icon: '🚫', label: 'Blocked a user' },
  user_unblocked: { icon: '✅', label: 'Unblocked a user' },
  submitted_for_approval: { icon: '📤', label: 'Submitted business for verification' },
  approved: { icon: '✅', label: 'Business verified' },
  rejected: { icon: '❌', label: 'Business rejected' },
  suspended: { icon: '⛔', label: 'Business suspended' },
  activated: { icon: '🔄', label: 'Business reactivated' },
  listing_deleted: { icon: '🗑', label: 'Deleted a draft listing' },
  price_added: { icon: '💰', label: 'Added a price' },
  price_removed: { icon: '💸', label: 'Removed a price' },
  price_approved: { icon: '✅', label: 'Price change approved' },
  price_rejected: { icon: '❌', label: 'Price change rejected' },
  product_saved: { icon: '🛍', label: 'Saved a product or service' },
  product_deleted: { icon: '🗑', label: 'Deleted a product or service' },
  destination_created: { icon: '📍', label: 'Added a destination' },
  destination_updated: { icon: '✏️', label: 'Edited a destination' },
  destination_hidden: { icon: '🙈', label: 'Hid a destination' },
  destination_shown: { icon: '👁', label: 'Published a destination' },
  destination_deleted: { icon: '🗑', label: 'Deleted a destination' },
  category_saved: { icon: '🏷', label: 'Saved a category' },
  category_deleted: { icon: '🗑', label: 'Deleted a category' },
  contact_saved: { icon: '☎️', label: 'Saved an emergency contact' },
  contact_deleted: { icon: '🗑', label: 'Deleted an emergency contact' },
};

export function describeAction(action: string): { icon: string; label: string } {
  return ACTION_META[action] ?? { icon: '📋', label: action.replace(/_/g, ' ') };
}

export function categoryOf(entityType: string): ActivityCategory {
  return CATEGORY_BY_ENTITY[entityType] ?? 'account';
}

export async function logActivity(e: ActivityInput): Promise<void> {
  try {
    const db = await getDatabase();
    await db.runAsync(
      'INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, entity_name, details, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [generateId(), e.userId ?? 'system', e.action, e.entityType, e.entityId, e.entityName ?? null, e.details ?? null, now()],
    );
  } catch {
    /* logging is best-effort */
  }
}

export async function getActivityLogs(opts: { category?: ActivityCategory | 'all'; limit?: number } = {}): Promise<ActivityEntry[]> {
  const db = await getDatabase();
  const types = Object.entries(CATEGORY_BY_ENTITY).filter(([, c]) => c === opts.category).map(([t]) => t);
  const filter = opts.category && opts.category !== 'all' ? `WHERE al.entity_type IN (${types.map(() => '?').join(',')})` : '';
  return db.getAllAsync<ActivityEntry>(
    `SELECT al.id, al.user_id, al.action, al.entity_type, al.entity_id, al.entity_name, al.details, al.created_at,
            u.email AS user_email, u.display_name AS user_name
     FROM activity_logs al
     LEFT JOIN users u ON u.id = al.user_id
     ${filter}
     ORDER BY al.created_at DESC
     LIMIT ?`,
    [...(filter ? types : []), opts.limit ?? 200],
  );
}
