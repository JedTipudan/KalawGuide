// KalawGuide — Shared TypeScript Types

// ─── User & Auth ────────────────────────────────────────────────────────────

export type UserRole = 'tourist' | 'business_owner' | 'admin';

export type AuthProvider = 'email' | 'google';

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
  provider: AuthProvider;
  createdAt: string;
  updatedAt: string;
}

export interface AuthSession {
  user: User;
  token: string;
  expiresAt: string;
}

export interface SignInCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  displayName: string;
  role: 'tourist' | 'business_owner';
}

// ─── Destinations ────────────────────────────────────────────────────────────

export interface DestinationCategory {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Destination {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  category?: DestinationCategory;
  location: string;
  latitude?: number;
  longitude?: number;
  coverImageUrl?: string;
  imageUrls: string[];
  estimatedFee?: number;
  feeVerified: boolean;
  isFeatured: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Business ────────────────────────────────────────────────────────────────

export type BusinessVerificationStatus =
  | 'not_submitted'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type BusinessCategory =
  | 'accommodation'
  | 'restaurant'
  | 'tour_operator'
  | 'transport'
  | 'retail'
  | 'activity'
  | 'other';

export interface Business {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  category: BusinessCategory;
  address: string;
  contactNumber?: string;
  email?: string;
  website?: string;
  coverImageUrl?: string;
  imageUrls: string[];
  verificationStatus: BusinessVerificationStatus;
  verificationNote?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessProduct {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  price: number;
  priceVerified: boolean;
  isAvailable: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessService {
  id: string;
  businessId: string;
  name: string;
  description?: string;
  price: number;
  priceVerified: boolean;
  duration?: string;
  isAvailable: boolean;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Bookings (kept for DB compatibility but UI removed) ────────────────────

export type BookingStatus =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'completed';

// ─── Listing Prices ───────────────────────────────────────────────────────────

export type PriceCategory =
  | 'entrance_fee'
  | 'cottage_rental'
  | 'room_rate'
  | 'overnight'
  | 'day_use'
  | 'per_person'
  | 'group_package'
  | 'activity_fee'
  | 'other';

export interface ListingPrice {
  id: string;
  businessId: string;
  title: string;
  amount: number;
  unit: string;
  category: PriceCategory;
  description?: string;
  conditions?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Listing Facilities ───────────────────────────────────────────────────────

export interface ListingFacility {
  id: string;
  businessId: string;
  name: string;
  icon?: string;
  createdAt: string;
}

// ─── Listing Revisions ────────────────────────────────────────────────────────

export type RevisionStatus = 'pending' | 'approved' | 'rejected';

export interface ListingRevision {
  id: string;
  businessId: string;
  submittedBy: string;
  fieldName: string;
  oldValue?: string;
  newValue: string;
  status: RevisionStatus;
  reviewedBy?: string;
  reviewNote?: string;
  reviewedAt?: string;
  createdAt: string;
}

// ─── Favorites ────────────────────────────────────────────────────────────────

export interface Favorite {
  id: string;
  userId: string;
  entityType: 'destination' | 'business';
  entityId: string;
  createdAt: string;
}

// ─── Activity Logs ────────────────────────────────────────────────────────────

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  entityName?: string;
  details?: string;
  createdAt: string;
}

// ─── Itineraries ─────────────────────────────────────────────────────────────

export interface Itinerary {
  id: string;
  userId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  items: ItineraryItem[];
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

export interface ItineraryItem {
  id: string;
  itineraryId: string;
  dayNumber: number;
  time?: string;
  title: string;
  description?: string;
  destinationId?: string;
  destination?: Destination;
  estimatedCost?: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Budget ───────────────────────────────────────────────────────────────────

export interface BudgetPlan {
  id: string;
  userId: string;
  title: string;
  destinationId?: string;
  destinationName?: string;
  travelers: number;
  durationDays: number;
  transportation: number;
  accommodation: number;
  food: number;
  activities: number;
  miscellaneous: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetSummary {
  transportation: number;
  accommodation: number;
  food: number;
  activities: number;
  miscellaneous: number;
  total: number;
  perPerson: number;
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export type ExpenseCategory =
  | 'transportation'
  | 'accommodation'
  | 'food'
  | 'activities'
  | 'shopping'
  | 'other';

export interface Expense {
  id: string;
  userId: string;
  itineraryId?: string;
  name: string;
  amount: number;
  category: ExpenseCategory;
  date: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
}

// ─── Emergency ────────────────────────────────────────────────────────────────

export interface EmergencyContact {
  id: string;
  name: string;
  organization: string;
  contactNumber: string;
  description?: string;
  isVerified: boolean;
  lastVerifiedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'booking_update'
  | 'verification_update'
  | 'system'
  | 'reminder';

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ─── Sync ─────────────────────────────────────────────────────────────────────

export type SyncStatus = 'synced' | 'pending' | 'failed' | 'local_only';

export interface SyncRecord {
  id: string;
  entityType: string;
  entityId: string;
  operation: 'create' | 'update' | 'delete';
  payload: string;
  status: SyncStatus;
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
}

// ─── Theme ────────────────────────────────────────────────────────────────────

export type ThemeMode = 'light' | 'dark' | 'system';

// ─── KalawAssistance ──────────────────────────────────────────────────────────

export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface AssistantSuggestion {
  id: string;
  label: string;
  query: string;
}
