import { getDatabase } from '../migrations/init';
import { generateId, now } from '../../utils/helpers';

const ADMIN_EMAIL = 'admin@kalawguide.app';
const ADMIN_PASSWORD = 'admin2024!';

// Pure-JS hash — crypto.subtle is unavailable on Hermes (React Native)
function hashPassword(password: string): string {
  const str = password + 'kalawguide_salt_2024';
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(16, '0');
}

export async function seedDatabase(): Promise<void> {
  const db = await getDatabase();

  // Seed default admin account — admin@kalawguide.app / admin2024!
  const adminExists = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]
  );
  const { storage } = await import('../../utils/storage');
  if (!adminExists) {
    const adminId = 'admin_kalawguide_001';
    const timestamp = now();
    await db.runAsync(
      `INSERT INTO users (id, email, display_name, role, provider, created_at, updated_at)
       VALUES (?, ?, 'KalawGuide Admin', 'admin', 'email', ?, ?)`,
      [adminId, ADMIN_EMAIL, timestamp, timestamp]
    );
  }
  // Always re-sync the admin password hash (handles hash function changes)
  await storage.setItem('pwd_admin_kalawguide_001', hashPassword(ADMIN_PASSWORD));

  // Check if destinations already seeded
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM destination_categories'
  );
  if (existing && existing.count > 0) return;

  const categories = [
    { id: generateId(), name: 'Beach', icon: 'waves', color: '#075C73' },
    { id: generateId(), name: 'Nature', icon: 'tree', color: '#197151' },
    { id: generateId(), name: 'Cultural', icon: 'landmark', color: '#956112' },
    { id: generateId(), name: 'Adventure', icon: 'mountain', color: '#AC3545' },
    { id: generateId(), name: 'Food', icon: 'utensils', color: '#087F75' },
    { id: generateId(), name: 'Accommodation', icon: 'bed', color: '#57717A' },
  ];

  for (const cat of categories) {
    await db.runAsync(
      'INSERT INTO destination_categories (id, name, icon, color) VALUES (?, ?, ?, ?)',
      [cat.id, cat.name, cat.icon, cat.color]
    );
  }

  const beachCatId = categories[0].id;
  const natureCatId = categories[1].id;
  const adventureCatId = categories[3].id;

  const destinations = [
    {
      id: generateId(),
      name: 'Dahican Beach',
      description: 'A pristine white-sand beach in Mati City, famous for surfing and skimboarding. One of the longest beaches in Davao Oriental.',
      categoryId: beachCatId,
      location: 'Mati City, Davao Oriental',
      latitude: 6.9333, longitude: 126.2167,
      estimatedFee: 0, feeVerified: 0, isFeatured: 1,
    },
    {
      id: generateId(),
      name: 'Cape San Agustin',
      description: 'A scenic cape at the southeastern tip of Mindanao offering stunning ocean views and a historic lighthouse.',
      categoryId: natureCatId,
      location: 'Mati City, Davao Oriental',
      latitude: 6.8167, longitude: 126.2333,
      estimatedFee: 0, feeVerified: 0, isFeatured: 1,
    },
    {
      id: generateId(),
      name: 'Pujada Bay',
      description: 'A protected bay with crystal-clear waters, mangroves, and diverse marine life. Ideal for snorkeling and island hopping.',
      categoryId: beachCatId,
      location: 'Mati City, Davao Oriental',
      latitude: 6.9500, longitude: 126.2500,
      estimatedFee: 0, feeVerified: 0, isFeatured: 1,
    },
    {
      id: generateId(),
      name: 'Mount Hamiguitan Range',
      description: 'A UNESCO World Heritage Site and wildlife sanctuary home to the Philippine Eagle and rare pygmy forest.',
      categoryId: adventureCatId,
      location: 'San Isidro, Davao Oriental',
      latitude: 7.0833, longitude: 126.1667,
      estimatedFee: 500, feeVerified: 0, isFeatured: 1,
    },
    {
      id: generateId(),
      name: 'Aliwagwag Falls',
      description: 'A spectacular series of cascading waterfalls in Cateel, Davao Oriental — one of the highest in the Philippines.',
      categoryId: natureCatId,
      location: 'Cateel, Davao Oriental',
      latitude: 7.7833, longitude: 126.4500,
      estimatedFee: 50, feeVerified: 0, isFeatured: 0,
    },
    {
      id: generateId(),
      name: 'Mati City Public Market',
      description: 'The central market of Mati City offering fresh local produce, seafood, and regional delicacies.',
      categoryId: categories[4].id,
      location: 'Mati City, Davao Oriental',
      latitude: 6.9500, longitude: 126.2167,
      estimatedFee: 0, feeVerified: 0, isFeatured: 0,
    },
  ];

  for (const dest of destinations) {
    await db.runAsync(
      `INSERT INTO destinations
        (id, name, description, category_id, location, latitude, longitude,
         estimated_fee, fee_verified, is_featured, is_active, image_urls, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, '[]', ?, ?)`,
      [
        dest.id, dest.name, dest.description, dest.categoryId,
        dest.location, dest.latitude, dest.longitude,
        dest.estimatedFee, dest.feeVerified, dest.isFeatured,
        now(), now(),
      ]
    );
  }

  const emergencyContacts = [
    { id: generateId(), name: 'Mati City Police Station', organization: 'Philippine National Police', contactNumber: '(087) 388-1234', description: 'Local police emergency response', isVerified: 0 },
    { id: generateId(), name: 'Davao Oriental Provincial Hospital', organization: 'Department of Health', contactNumber: '(087) 388-5678', description: 'Main provincial hospital in Mati City', isVerified: 0 },
    { id: generateId(), name: 'Bureau of Fire Protection — Mati', organization: 'Bureau of Fire Protection', contactNumber: '(087) 388-9012', description: 'Fire emergency response', isVerified: 0 },
    { id: generateId(), name: 'Philippine Coast Guard — Davao Oriental', organization: 'Philippine Coast Guard', contactNumber: '(087) 388-3456', description: 'Maritime emergency and sea rescue', isVerified: 0 },
    { id: generateId(), name: 'Mati City Disaster Risk Reduction', organization: 'CDRRMO Mati City', contactNumber: '(087) 388-7890', description: 'Disaster response and coordination', isVerified: 0 },
  ];

  for (const contact of emergencyContacts) {
    await db.runAsync(
      `INSERT INTO emergency_contacts
        (id, name, organization, contact_number, description, is_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [contact.id, contact.name, contact.organization, contact.contactNumber, contact.description, contact.isVerified, now(), now()]
    );
  }
}
