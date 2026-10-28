export type BookingStatus = 'pending' | 'confirmed' | 'postponed' | 'completed' | 'cancelled' | 'no-show';

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: string;
  createdAt: string;
}

export interface ServiceCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  sortOrder: number;
}

export interface Service {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number; // in INR
  durationMinutes: number;
  imageUrl?: string;
  isActive: boolean;
  isFeatured: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  passwordHash?: string;
  isVerified?: boolean;
  isRegistered?: boolean;
  notes?: string;
  totalBookings: number;
  lastBookingDate?: string;
  createdAt: string;
}

export interface Appointment {
  id: string;
  bookingNumber: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number; // minutes
  date: string; // YYYY-MM-DD
  time: string; // HH:MM (24h)
  endTime: string; // HH:MM
  status: BookingStatus;
  stylistId?: string;
  stylistName?: string;
  notes?: string;
  internalNotes?: string;
  cancellationReason?: string;
  cancelledAt?: string;
  cancelledBy?: 'customer' | 'admin';
  actualAmountCollected?: number;
  paymentMethod?: string;
  amountNotes?: string;
  createdAtIST?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminNotification {
  id: string;
  appointmentId?: string;
  bookingNumber?: string;
  type: 'new_booking' | 'confirmed' | 'cancelled' | 'rejected' | 'rescheduled' | 'general';
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface StaffMember {
  id: string;
  name: string;
  role: string;
  specialties: string[];
  experienceYears: number;
  rating: number;
  bio: string;
  imageUrl: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BreakPeriod {
  start: string; // HH:MM
  end: string; // HH:MM
  label: string;
}

export interface BusinessHoursDay {
  dayOfWeek: number; // 0=Sunday, 1=Monday, ..., 6=Saturday
  dayName: string;
  isOpen: boolean;
  openTime: string; // HH:MM
  closeTime: string; // HH:MM
  breaks: BreakPeriod[];
}

export interface BlockedDate {
  id: string;
  date: string; // YYYY-MM-DD
  reason: string;
  allDay: boolean;
  startTime?: string; // HH:MM if not all day
  endTime?: string; // HH:MM if not all day
  createdAt: string;
}

export type ReviewSource = 'Google Maps' | 'Website Customer' | string;
export type ReviewStatus = 'approved' | 'pending' | 'rejected' | 'hidden';

export interface Review {
  id: string;
  authorName: string;
  rating: number; // 1-5
  reviewText: string;
  reviewDate: string;
  source: ReviewSource; // e.g. "Google Maps" or "Website Customer"
  status?: ReviewStatus; // 'approved' | 'pending' | 'rejected' | 'hidden'
  customerId?: string;
  customerEmail?: string;
  isVerified: boolean;
  isFeatured: boolean;
  sourceUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: 'Ambience' | 'Hair' | 'Beauty & Skin' | 'Makeup';
  imageUrl: string;
  description?: string;
  isFeatured: boolean;
}

export interface SiteSettings {
  salonName: string;
  alternateName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  landmarks: string;
  city: string;
  state: string;
  pincode: string;
  googleMapsUrl: string;
  slotIntervalMinutes: number; // default 30
  autoConfirmBookings: boolean;
  cancellationDeadlineHours?: number; // Minimum hours before appointment to allow customer cancellation (e.g. 2)
  adminNotificationEmail?: string;
  notificationWebhookUrl?: string;
  enableSmsNotifications: boolean;
  enableWhatsAppNotifications: boolean;
  enableEmailNotifications: boolean;
  // Real Gmail SMTP Configuration
  gmailUser?: string;
  gmailAppPassword?: string;
  // Photo text size and arrangement options
  photoTextSize?: 'small' | 'medium' | 'large' | 'extralarge';
  photoTextArrangement?: 'overlay-bottom' | 'overlay-center' | 'card-below' | 'badge-minimal';
  // Map coordinates & embed configuration
  mapLatitude?: number;
  mapLongitude?: number;
  mapZoom?: number;
  mapEmbedUrl?: string;
  // Admin WhatsApp messenger number
  adminWhatsAppPhone?: string;
  // Hero Main Banner (Top of Homepage)
  heroBannerUrl?: string;
  heroBadge?: string;
  heroHeadline?: string;
  heroSubtitle?: string;
  // Second Hero Banner (Ambience & Experience Sanctuary Showcase)
  secondHeroBannerUrl?: string;
  secondHeroBadge?: string;
  secondHeroTitle?: string;
  secondHeroSubtitle?: string;
  secondHeroHighlight?: string;
}

export interface NotificationLog {
  id: string;
  appointmentId: string;
  eventType: 'booking_created' | 'booking_confirmed' | 'booking_cancelled' | 'booking_rescheduled';
  recipientPhone: string;
  recipientEmail?: string;
  message: string;
  status: 'simulated_ready' | 'sent' | 'failed';
  provider: 'WhatsApp' | 'SMS' | 'Email' | 'System';
  createdAt: string;
}

export interface TimeSlotAvailability {
  time: string; // HH:MM
  displayTime: string; // e.g. "10:30 AM"
  isAvailable: boolean;
  reason?: string;
  slotType?: 'available' | 'passed' | 'booked' | 'blocked';
}

export interface DayAvailabilityResponse {
  date: string;
  isOpen: boolean;
  openTime?: string;
  closeTime?: string;
  message?: string;
  slots: TimeSlotAvailability[];
}
