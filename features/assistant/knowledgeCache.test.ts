const mockDb = { getAllAsync: jest.fn() };
let mockReachable = true;
jest.mock('../../database/migrations/init', () => ({
  DATABASE_MODE: 'online',
  getDatabase: jest.fn(async () => {
    if (!mockReachable) throw new Error('offline');
    return mockDb;
  }),
}));

import { getDestinations, getPrices, lastSnapshotUsed, setOfflineHint, syncKnowledge } from './knowledge';

const destRow = { id: 'd1', name: 'Dahican Beach', location: 'Mati', description: 'Beach.', fee: 20, fee_verified: 1, is_featured: 1, latitude: null, longitude: null, category: 'Beach' };
const bizRow = { id: 'b1', name: 'Kalaw Inn', category: 'accommodation', address: 'Dahican', description: '', contact_number: null, operating_hours: null };
const priceRow = { business_id: 'b1', business_name: 'Kalaw Inn', business_category: 'accommodation', title: 'Room', amount: 1500, unit: 'per night', category: 'room', verified: 1 };

beforeEach(() => {
  mockReachable = true;
  setOfflineHint(false);
  mockDb.getAllAsync.mockImplementation(async (sql: string) => {
    if (sql.includes('FROM destinations')) return [destRow];
    if (sql.includes('FROM listing_prices')) return [priceRow];
    if (sql.includes('FROM listing_facilities')) return [{ business_id: 'b1', name: 'WiFi' }];
    if (sql.includes('FROM businesses b WHERE')) return [bizRow];
    return [];
  });
});

it('answers from the last synced copy when the online database is unreachable', async () => {
  const snap = await syncKnowledge();
  expect(snap.prices).toHaveLength(1);
  expect(snap.facilities.b1).toEqual(['WiFi']);

  mockReachable = false;
  const dests = await getDestinations();
  expect(dests.map(d => d.name)).toEqual(['Dahican Beach']);
  expect(lastSnapshotUsed()).toBe(snap.syncedAt);
  expect((await getPrices(['b1']))[0].amount).toBe(1500);
});

it('skips the network when the device is known to be offline', async () => {
  await syncKnowledge();
  mockDb.getAllAsync.mockClear();
  setOfflineHint(true);
  await getDestinations();
  expect(mockDb.getAllAsync).not.toHaveBeenCalled();
});

it('uses live data when online', async () => {
  await syncKnowledge();
  await getDestinations();
  expect(lastSnapshotUsed()).toBeNull();
});
