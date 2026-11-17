jest.mock('expo-sqlite', () => ({ openDatabaseAsync: jest.fn() }));

import * as SQLite from 'expo-sqlite';
import { openFakeDatabase, resetDatabase } from '../../testing/fakeSqlite';
import { getDatabase } from '../../database/migrations/init';
import { seedDemoContent } from '../../database/seeds/demoContent';
import { getAssistantReply } from './assistantEngine';
import { TripBudgetResult } from '../../types';
import { placeImage } from '../../utils/placeImages';

const open = SQLite.openDatabaseAsync as jest.Mock;
const ts = '2026-01-01T00:00:00Z';
const ask = (q: string) => getAssistantReply(q, null, { offline: true });

async function seed() {
  const db = await getDatabase();
  for (const [id, name] of [['c1', 'Beach'], ['c2', 'Nature'], ['c3', 'Cultural']]) {
    await db.runAsync('INSERT INTO destination_categories VALUES (?,?,?,?)', [id, name, 'x', '#000']);
  }
  await db.runAsync(
    `INSERT INTO destinations (id,name,description,category_id,location,estimated_fee,fee_verified,is_featured,is_active,created_at,updated_at)
     VALUES ('d1','Dahican Beach','White sand surfing beach.','c1','Mati City',0,0,1,1,?,?)`, [ts, ts]);
  await seedDemoContent(db, ts);
}

beforeEach(async () => {
  resetDatabase();
  open.mockReset();
  open.mockImplementation(async () => openFakeDatabase());
  await seed();
});

describe('demo seed', () => {
  it('is idempotent and adds approved businesses with prices and new destinations', async () => {
    const db = await getDatabase();
    await seedDemoContent(db, ts); // second run must not duplicate anything
    const biz = await db.getFirstAsync<{ n: number }>("SELECT COUNT(*) AS n FROM businesses WHERE verification_status = 'approved'");
    const prices = await db.getFirstAsync<{ n: number }>('SELECT COUNT(*) AS n FROM listing_prices');
    const dests = await db.getAllAsync<{ name: string }>('SELECT name FROM destinations ORDER BY name');
    expect(biz!.n).toBe(13);
    expect(prices!.n).toBeGreaterThan(25);
    expect(dests.map(d => d.name)).toEqual(expect.arrayContaining(['Sleeping Dinosaur', 'Waniban Island', 'Dahican Beach']));
  });
});

describe('demo seed photos and positions', () => {
  it('gives every seeded destination and business its own photo', async () => {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ name: string; category: string }>(
      `SELECT d.name, c.name AS category FROM destinations d LEFT JOIN destination_categories c ON c.id = d.category_id
       UNION ALL SELECT name, category FROM businesses`);
    const keys = rows.map(r => JSON.stringify(placeImage(r.name, null, r.category)));
    const dupes = rows.filter((_, i) => keys.indexOf(keys[i]) !== i).map(r => r.name);
    expect(dupes).toEqual([]);
  });

  it('puts every demo pin inside Davao Oriental', async () => {
    const db = await getDatabase();
    const pins = await db.getAllAsync<{ name: string; latitude: number; longitude: number }>(
      "SELECT name, latitude, longitude FROM businesses UNION ALL SELECT name, latitude, longitude FROM destinations WHERE id LIKE 'seed_dest_%'");
    for (const p of pins) {
      expect([p.name, p.latitude > 6.2 && p.latitude < 7.9 && p.longitude > 126.0 && p.longitude < 126.6]).toEqual([p.name, true]);
    }
  });
});

describe('demo seed v2 (Mati-based prices)', () => {
  it('updates old sample prices and untouched fees on existing installs, but not edited ones', async () => {
    const db = await getDatabase();
    // Simulate a v1 install: old island-hopping price, no v2 marker, old Waniban fee, and an admin-verified fee.
    await db.runAsync("DELETE FROM listing_prices WHERE id = 'seed_biz_dahicansurf_p3'");
    await db.runAsync("UPDATE listing_prices SET amount = 450 WHERE id = 'seed_biz_pujadatours_p0'");
    await db.runAsync("UPDATE destinations SET estimated_fee = 30 WHERE name = 'Waniban Island'");
    await db.runAsync("UPDATE destinations SET estimated_fee = 0, fee_verified = 1 WHERE name = 'Dahican Beach'");

    await seedDemoContent(db, ts);

    const hop = await db.getFirstAsync<{ amount: number }>("SELECT amount FROM listing_prices WHERE id = 'seed_biz_pujadatours_p0'");
    const waniban = await db.getFirstAsync<{ estimated_fee: number }>("SELECT estimated_fee FROM destinations WHERE name = 'Waniban Island'");
    const dahican = await db.getFirstAsync<{ estimated_fee: number }>("SELECT estimated_fee FROM destinations WHERE name = 'Dahican Beach'");
    const entrance = await db.getFirstAsync<{ amount: number }>("SELECT amount FROM listing_prices WHERE id = 'seed_biz_dahicansurf_p3'");
    expect(hop!.amount).toBe(250);
    expect(waniban!.estimated_fee).toBe(50);
    expect(dahican!.estimated_fee).toBe(0); // verified by an admin → left alone
    expect(entrance!.amount).toBe(100);
  });
});

describe('what is cheapest', () => {
  it('cheapest place to stay lists room rates lowest first, labelled as estimates', async () => {
    const r = await ask('What is the cheapest place to stay?');
    expect(r.content).toContain('Cheapest places to stay');
    const first = r.content.indexOf('₱1,200.00');
    const later = r.content.indexOf('₱1,500.00');
    expect(first).toBeGreaterThan(-1);
    expect(later).toBeGreaterThan(first);
    expect(r.content).toContain('Dahican Surf Resort');
    expect(r.content).toContain('(estimate)');
    expect(r.content).not.toContain('(verified)');
    expect(r.meta.hasEstimates).toBe(true);
  });

  it('cheapest food and transport pick the lowest prices', async () => {
    const food = await ask('cheapest food in Mati');
    expect(food.content).toContain('Budget meal');
    const ride = await ask('pinakamura nga transport');
    expect(ride.content).toContain('Cheapest transport');
    expect(ride.content).toContain('Habal-habal');
  });

  it('"what is cheapest?" builds the cheapest full trip', async () => {
    const r = await ask('What is cheapest for 2 people, 3 days?');
    expect(r.content).toContain('Cheapest trip to Mati');
    const budget = r.meta.cards?.find(c => c.type === 'budget')?.data as TripBudgetResult;
    expect(budget.travelers).toBe(2);
    expect(budget.days).toBe(3);
    // Bus (₱230) beats the van (₱300); the ₱1,200 fan room is the cheapest stay.
    expect(r.content).toContain('Bus fare Davao City');
    expect(budget.subtotals.accommodation).toBe(1200 * 2);
    expect(budget.subtotals.food).toBe(90 * 3 * 3 * 2);
    expect(budget.groupTotal).toBeGreaterThan(0);
  });

  it('checks the cheapest trip against a stated budget', async () => {
    const r = await ask('cheapest trip for 2 people, 2 days with ₱20,000');
    expect(r.content).toContain('Fits your ₱20,000.00 budget');
  });

  it('a budget for a named place still uses the itemized destination estimate', async () => {
    const r = await ask('How much for a cheap trip to Dahican Beach for 2 people, 2 days?');
    expect(r.content).toContain('Trip estimate: Dahican Beach');
  });
});
