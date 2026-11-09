import { getDatabase } from '../migrations/init';
import { generateId, now } from '../../utils/helpers';

const ADMIN_EMAIL = 'admin@kalawguide.app';
const ADMIN_PASSWORD = 'admin2024!';

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
  const { storage } = await import('../../utils/storage');

  await storage.setItem('pwd_admin_kalawguide_001', hashPassword(ADMIN_PASSWORD));

  const adminExists = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM users WHERE email = ?', [ADMIN_EMAIL]
  );
  const catCount = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM destination_categories'
  );

  const needsAdmin = !adminExists;
  const needsSeed = !catCount || catCount.count === 0;

  if (!needsAdmin && !needsSeed) return;

  const ts = now();

  await db.execAsync('BEGIN;');
  try {
    if (needsAdmin) {
      await db.runAsync(
        `INSERT OR IGNORE INTO users (id, email, display_name, role, provider, status, created_at, updated_at)
         VALUES ('admin_kalawguide_001', ?, 'KalawGuide Admin', 'admin', 'email', 'active', ?, ?)`,
        [ADMIN_EMAIL, ts, ts]
      );
    }

    if (needsSeed) {
      const catIds = Array.from({ length: 6 }, () => generateId());

      await db.runAsync('INSERT OR IGNORE INTO destination_categories (id,name,icon,color) VALUES (?,?,?,?)', [catIds[0],'Beach','waves','#075C73']);
      await db.runAsync('INSERT OR IGNORE INTO destination_categories (id,name,icon,color) VALUES (?,?,?,?)', [catIds[1],'Nature','tree','#197151']);
      await db.runAsync('INSERT OR IGNORE INTO destination_categories (id,name,icon,color) VALUES (?,?,?,?)', [catIds[2],'Cultural','landmark','#956112']);
      await db.runAsync('INSERT OR IGNORE INTO destination_categories (id,name,icon,color) VALUES (?,?,?,?)', [catIds[3],'Adventure','mountain','#AC3545']);
      await db.runAsync('INSERT OR IGNORE INTO destination_categories (id,name,icon,color) VALUES (?,?,?,?)', [catIds[4],'Food','utensils','#087F75']);
      await db.runAsync('INSERT OR IGNORE INTO destination_categories (id,name,icon,color) VALUES (?,?,?,?)', [catIds[5],'Accommodation','bed','#57717A']);

      const dests: [string, string, string, string, number, number, number, number, number][] = [
        [generateId(),'Dahican Beach','A pristine white-sand beach in Mati City, famous for surfing and skimboarding.',catIds[0],6.9333,126.2167,0,0,1],
        [generateId(),'Cape San Agustin','A scenic cape at the southeastern tip of Mindanao offering stunning ocean views.',catIds[1],6.8167,126.2333,0,0,1],
        [generateId(),'Pujada Bay','A protected bay with crystal-clear waters and diverse marine life.',catIds[0],6.9500,126.2500,0,0,1],
        [generateId(),'Mount Hamiguitan Range','A UNESCO World Heritage Site and wildlife sanctuary.',catIds[3],7.0833,126.1667,500,0,1],
        [generateId(),'Aliwagwag Falls','A spectacular series of cascading waterfalls in Cateel.',catIds[1],7.7833,126.4500,50,0,0],
        [generateId(),'Mati City Public Market','The central market offering fresh local produce and seafood.',catIds[4],6.9500,126.2167,0,0,0],
      ];
      const locs = ['Mati City, Davao Oriental','Mati City, Davao Oriental','Mati City, Davao Oriental','San Isidro, Davao Oriental','Cateel, Davao Oriental','Mati City, Davao Oriental'];
      for (let i = 0; i < dests.length; i++) {
        const [id, name, desc, catId, lat, lng, fee, feeV, featured] = dests[i];
        await db.runAsync(
          `INSERT OR IGNORE INTO destinations (id,name,description,category_id,location,latitude,longitude,estimated_fee,fee_verified,is_featured,is_active,image_urls,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,'[]',?,?)`,
          [id, name, desc, catId, locs[i], lat, lng, fee, feeV, featured, ts, ts]
        );
      }

      const ecs: [string, string, string, string, string][] = [
        [generateId(),'Mati City Police Station','Philippine National Police','(087) 388-1234','Local police emergency response'],
        [generateId(),'Davao Oriental Provincial Hospital','Department of Health','(087) 388-5678','Main provincial hospital in Mati City'],
        [generateId(),'Bureau of Fire Protection — Mati','Bureau of Fire Protection','(087) 388-9012','Fire emergency response'],
        [generateId(),'Philippine Coast Guard — Davao Oriental','Philippine Coast Guard','(087) 388-3456','Maritime emergency and sea rescue'],
        [generateId(),'Mati City Disaster Risk Reduction','CDRRMO Mati City','(087) 388-7890','Disaster response and coordination'],
      ];
      for (const [id, name, org, num, desc] of ecs) {
        await db.runAsync(
          `INSERT OR IGNORE INTO emergency_contacts (id,name,organization,contact_number,description,is_verified,created_at,updated_at) VALUES (?,?,?,?,?,0,?,?)`,
          [id, name, org, num, desc, ts, ts]
        );
      }
    }

    await db.execAsync('COMMIT;');
  } catch (e) {
    await db.execAsync('ROLLBACK;');
    throw e;
  }
}
