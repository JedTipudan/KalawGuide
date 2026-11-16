jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));
jest.mock('expo-crypto', () => ({ randomUUID: () => jest.requireActual('crypto').randomUUID() }));

import * as SQLite from 'expo-sqlite';
import { openFakeDatabase, resetDatabase } from '../../testing/fakeSqlite';
import { getDatabase } from '../../database/migrations/init';
import { getActivityLogs, logActivity, describeAction } from './activityLog';
import { getReport } from './reportsService';

const open = SQLite.openDatabaseAsync as jest.Mock;
const old = '2020-01-01T00:00:00Z';
const recent = () => new Date().toISOString();

beforeEach(() => {
  resetDatabase();
  open.mockReset();
  open.mockImplementation(async () => openFakeDatabase());
});

async function seed() {
  const db = await getDatabase();
  const user = 'INSERT INTO users (id,email,display_name,role,provider,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)';
  await db.runAsync(user, ['a', 'admin@x', 'Admin', 'admin', 'email', 'active', old, old]);
  await db.runAsync(user, ['t1', 't1@x', 'Tina', 'tourist', 'email', 'active', old, old]);
  await db.runAsync(user, ['t2', 't2@x', 'Tom', 'tourist', 'email', 'blocked', recent(), recent()]);
  await db.runAsync(user, ['o1', 'o1@x', 'Owner', 'business_owner', 'email', 'active', recent(), recent()]);
  const biz = 'INSERT INTO businesses (id,owner_id,name,description,category,address,verification_status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)';
  await db.runAsync(biz, ['b1', 'o1', 'Sunrise Resort', 'x', 'accommodation', 'Mati', 'approved', old, old]);
  await db.runAsync(biz, ['b2', 'o1', 'Shady Inn', 'x', 'accommodation', 'Mati', 'pending', recent(), recent()]);
  await db.runAsync("INSERT INTO destination_categories VALUES ('c1','Beach','waves','#000000')");
  const dest = 'INSERT INTO destinations (id,name,description,category_id,location,is_featured,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)';
  await db.runAsync(dest, ['d1', 'Dahican Beach', 'x', 'c1', 'Mati', 1, 1, old, old]);
  await db.runAsync(dest, ['d2', 'Pujada Bay', 'x', 'c1', 'Mati', 0, 1, old, old]);
  await db.runAsync('INSERT INTO favorites (id,user_id,entity_type,entity_id,created_at) VALUES (?,?,?,?,?)', ['f1', 't1', 'destination', 'd2', recent()]);
  await db.runAsync('INSERT INTO favorites (id,user_id,entity_type,entity_id,created_at) VALUES (?,?,?,?,?)', ['f2', 't2', 'destination', 'd2', old]);
  await db.runAsync('INSERT INTO expenses (id,user_id,name,amount,category,date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)', ['e1', 't1', 'Van', 300, 'transportation', old, recent(), recent()]);
}

const metric = (r: Awaited<ReturnType<typeof getReport>>, section: string, label: string) =>
  r.sections.find(s => s.title === section)?.metrics.find(m => m.label === label)?.value;

describe('reports', () => {
  it('counts live data and excludes admins from user totals', async () => {
    await seed();
    const r = await getReport('all');
    expect(metric(r, 'Users', 'Registered users')).toBe(3);
    expect(metric(r, 'Users', 'Blocked accounts')).toBe(1);
    expect(metric(r, 'Business verification', 'Verified (legit)')).toBe(1);
    expect(metric(r, 'Business verification', 'Awaiting review')).toBe(1);
    expect(metric(r, 'Tourist activity', 'Amount tracked')).toBe('₱300');
    expect(r.topDestinations[0]).toEqual({ name: 'Pujada Bay', count: 2 });
    expect(r.businessCategories).toEqual([{ name: 'accommodation', count: 1 }]);
  });

  it('period filter only counts recent records', async () => {
    await seed();
    const r = await getReport('7d');
    expect(metric(r, 'Users', 'New sign-ups')).toBe(2);
    expect(metric(r, 'Business verification', 'New registrations')).toBe(1);
    expect(r.topDestinations[0]).toEqual({ name: 'Pujada Bay', count: 1 });
  });

  it('works on an empty database', async () => {
    const r = await getReport('30d');
    expect(metric(r, 'Users', 'Registered users')).toBe(0);
    expect(r.topDestinations).toEqual([]);
  });
});

describe('activity log', () => {
  it('records events newest first with the actor, and filters by category', async () => {
    await seed();
    await logActivity({ userId: 't1', action: 'signed_in', entityType: 'user', entityId: 't1', entityName: 'Tina' });
    await logActivity({ userId: 'a', action: 'approved', entityType: 'business', entityId: 'b1', entityName: 'Sunrise Resort' });
    await logActivity({ userId: 'a', action: 'destination_created', entityType: 'destination', entityId: 'd1', entityName: 'Dahican Beach' });

    const all = await getActivityLogs();
    expect(all.map(l => l.action)).toHaveLength(3);
    expect(all.find(l => l.action === 'signed_in')?.user_email).toBe('t1@x');

    expect((await getActivityLogs({ category: 'business' })).map(l => l.action)).toEqual(['approved']);
    expect((await getActivityLogs({ category: 'content' })).map(l => l.action)).toEqual(['destination_created']);
    expect((await getActivityLogs({ category: 'account' })).map(l => l.action)).toEqual(['signed_in']);
  });

  it('never throws, even if the database is unavailable', async () => {
    open.mockImplementation(async () => { throw new Error('no db'); });
    await expect(logActivity({ userId: null, action: 'sign_in_failed', entityType: 'system', entityId: 'x' })).resolves.toBeUndefined();
  });

  it('has readable labels, with a fallback for unknown actions', () => {
    expect(describeAction('approved').label).toBe('Business verified');
    expect(describeAction('something_new').label).toBe('something new');
  });
});
