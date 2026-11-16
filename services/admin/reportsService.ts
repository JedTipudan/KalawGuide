import { getDatabase } from '../../database/migrations/init';

/** Admin "Reports & Analytics" — every number is a live COUNT over the local database. */

export type ReportPeriod = '7d' | '30d' | 'all';

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
};

export interface ReportMetric { label: string; value: string | number; hint?: string }
export interface ReportSection { title: string; icon: string; metrics: ReportMetric[] }
export interface RankedItem { name: string; count: number }

export interface Report {
  period: ReportPeriod;
  generatedAt: string;
  sections: ReportSection[];
  topDestinations: RankedItem[];
  businessCategories: RankedItem[];
}

function cutoff(period: ReportPeriod): string | null {
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

const peso = (n: number) => `₱${Math.round(n).toLocaleString('en-PH')}`;

export async function getReport(period: ReportPeriod): Promise<Report> {
  const db = await getDatabase();
  const since = cutoff(period);

  const count = async (sql: string, params: (string | number)[] = []) =>
    (await db.getFirstAsync<{ n: number }>(sql, params))?.n ?? 0;
  // "Created in this period": all-time when no cutoff.
  const inPeriod = (table: string, where = '1=1', col = 'created_at') =>
    since
      ? count(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where} AND ${col} >= ?`, [since])
      : count(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`);

  const [
    users, tourists, owners, newUsers, blocked,
    businesses, verified, pending, rejected, suspended, newBusinesses,
    destinations, activeDest, featured, newDest,
    prices, products, services,
    trips, budgets, expenses, favorites,
    events,
  ] = await Promise.all([
    count("SELECT COUNT(*) AS n FROM users WHERE role <> 'admin'"),
    count("SELECT COUNT(*) AS n FROM users WHERE role = 'tourist'"),
    count("SELECT COUNT(*) AS n FROM users WHERE role = 'business_owner'"),
    inPeriod('users', "role <> 'admin'"),
    count("SELECT COUNT(*) AS n FROM users WHERE status = 'blocked'"),
    count('SELECT COUNT(*) AS n FROM businesses'),
    count("SELECT COUNT(*) AS n FROM businesses WHERE verification_status = 'approved'"),
    count("SELECT COUNT(*) AS n FROM businesses WHERE verification_status = 'pending'"),
    count("SELECT COUNT(*) AS n FROM businesses WHERE verification_status = 'rejected'"),
    count("SELECT COUNT(*) AS n FROM businesses WHERE verification_status = 'suspended'"),
    inPeriod('businesses'),
    count('SELECT COUNT(*) AS n FROM destinations'),
    count('SELECT COUNT(*) AS n FROM destinations WHERE is_active = 1'),
    count('SELECT COUNT(*) AS n FROM destinations WHERE is_featured = 1'),
    inPeriod('destinations'),
    count('SELECT COUNT(*) AS n FROM listing_prices WHERE is_active = 1'),
    count('SELECT COUNT(*) AS n FROM business_products'),
    count('SELECT COUNT(*) AS n FROM business_services'),
    inPeriod('itineraries'),
    inPeriod('budget_plans'),
    inPeriod('expenses'),
    inPeriod('favorites'),
    inPeriod('activity_logs'),
  ]);

  const spend = since
    ? await db.getFirstAsync<{ total: number | null }>('SELECT SUM(amount) AS total FROM expenses WHERE created_at >= ?', [since])
    : await db.getFirstAsync<{ total: number | null }>('SELECT SUM(amount) AS total FROM expenses');

  const verifiedPct = businesses ? Math.round((verified / businesses) * 100) : 0;
  const scope = period === 'all' ? 'total' : PERIOD_LABELS[period].toLowerCase();

  const sections: ReportSection[] = [
    {
      title: 'Users', icon: '👥', metrics: [
        { label: 'Registered users', value: users, hint: 'Tourists + business owners' },
        { label: 'Tourists', value: tourists },
        { label: 'Business owners', value: owners },
        { label: period === 'all' ? 'All sign-ups' : 'New sign-ups', value: newUsers, hint: scope },
        { label: 'Blocked accounts', value: blocked },
      ],
    },
    {
      title: 'Business verification', icon: '🏪', metrics: [
        { label: 'Businesses', value: businesses },
        { label: 'Verified (legit)', value: verified, hint: `${verifiedPct}% of all` },
        { label: 'Awaiting review', value: pending },
        { label: 'Rejected', value: rejected },
        { label: 'Suspended', value: suspended },
        { label: period === 'all' ? 'All registrations' : 'New registrations', value: newBusinesses, hint: scope },
      ],
    },
    {
      title: 'Listings & destinations', icon: '🗺', metrics: [
        { label: 'Destinations', value: destinations, hint: `${activeDest} published` },
        { label: 'Featured', value: featured },
        { label: period === 'all' ? 'Destinations added' : 'Added', value: newDest, hint: scope },
        { label: 'Published prices', value: prices },
        { label: 'Products', value: products },
        { label: 'Services', value: services },
      ],
    },
    {
      title: 'Tourist activity', icon: '🧳', metrics: [
        { label: 'Trips planned', value: trips, hint: scope },
        { label: 'Budget plans', value: budgets, hint: scope },
        { label: 'Expenses logged', value: expenses, hint: scope },
        { label: 'Amount tracked', value: peso(spend?.total ?? 0), hint: scope },
        { label: 'Places saved', value: favorites, hint: scope },
        { label: 'Logged events', value: events, hint: scope },
      ],
    },
  ];

  const topDestinations = await db.getAllAsync<RankedItem>(
    `SELECT d.name AS name, COUNT(*) AS count FROM (
       SELECT entity_id AS id FROM favorites WHERE entity_type = 'destination'${since ? ' AND created_at >= ?' : ''}
       UNION ALL
       SELECT destination_id AS id FROM itinerary_items WHERE destination_id IS NOT NULL${since ? ' AND created_at >= ?' : ''}
     ) x JOIN destinations d ON d.id = x.id
     GROUP BY d.id ORDER BY count DESC, d.name LIMIT 5`,
    since ? [since, since] : [],
  );

  const businessCategories = await db.getAllAsync<RankedItem>(
    `SELECT category AS name, COUNT(*) AS count FROM businesses
     WHERE verification_status = 'approved' GROUP BY category ORDER BY count DESC LIMIT 6`,
  );

  return { period, generatedAt: new Date().toISOString(), sections, topDestinations, businessCategories };
}
