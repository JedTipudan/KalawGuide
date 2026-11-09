// Rewrite bare web paths BEFORE expo-router/entry loads.
// ExpoRoot.js captures window.location.href at module evaluation time,
// so this must run first. We use require() not import because ES module
// imports are hoisted — require() executes in order.
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  const MAP: Record<string, string> = {
    '/home': '/(web)/home',
    '/explore': '/(web)/explore',
    '/budget': '/(web)/budget',
    '/budget-results': '/(web)/budget-results',
    '/my-budgets': '/(web)/my-budgets',
    '/trips': '/(web)/trips',
    '/expenses': '/(web)/expenses',
    '/add-expense': '/(web)/add-expense',
    '/booking-history': '/(web)/booking-history',
    '/businesses': '/(web)/businesses',
    '/emergency': '/(web)/emergency',
    '/profile': '/(web)/profile',
    '/settings': '/(web)/settings',
    '/recommendations': '/(web)/recommendations',
    '/sign-in': '/(web)/sign-in',
    '/register-tourist': '/(web)/register-tourist',
    '/register-business': '/(web)/register-business',
    '/forgot-password': '/(web)/forgot-password',
    '/role-select': '/(web)/role-select',
    '/landing': '/(web)/landing',
    '/business-dashboard': '/(web)/business-dashboard',
    '/business-profile': '/(web)/business-profile',
    '/business-products': '/(web)/business-products',
    '/business-prices': '/(web)/business-prices',
    '/business-facilities': '/(web)/business-facilities',
    '/business-bookings': '/(web)/business-bookings',
    '/business-notifications': '/(web)/business-notifications',
    '/business-settings': '/(web)/business-settings',
    '/admin-dashboard': '/(web)/admin-dashboard',
    '/admin-users': '/(web)/admin-users',
    '/admin-businesses': '/(web)/admin-businesses',
    '/admin-destinations': '/(web)/admin-destinations',
    '/admin-emergency': '/(web)/admin-emergency',
    '/admin-reports': '/(web)/admin-reports',
    '/admin-activity-logs': '/(web)/admin-activity-logs',
    '/admin-settings': '/(web)/admin-settings',
  };
  const bare = window.location.pathname.replace(/\/$/, '') || '/';
  const mapped = MAP[bare];
  if (mapped) {
    window.history.replaceState(null, '', mapped);
  }
}

require('expo-router/entry');
