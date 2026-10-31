import {
  Service,
  ServiceCategory,
  Appointment,
  BusinessHoursDay,
  BlockedDate,
  Review,
  GalleryItem,
  SiteSettings,
  DayAvailabilityResponse,
  NotificationLog,
  StaffMember,
  AdminNotification
} from './types/index.ts';

const ADMIN_TOKEN_KEY = 'bnb_admin_token';
const LEGACY_ADMIN_TOKEN_KEY = 'salon_admin_token';
const CUSTOMER_TOKEN_KEY = 'salon_customer_token';

export interface EmailHubData {
  bookingAlertEmail: string;
  adminLoginEmail: string;
  adminUsername: string;
  adminUsers?: Array<{
    id: string;
    username: string;
    email: string;
    role?: string;
    createdAt?: string;
  }>;
  publicContactEmail: string;
  smtpUser: string;
  smtpConfigured: boolean;
  handoverOwnerEmail?: string;
  handoverOwnerName?: string;
  handoverBookingAlert?: boolean;
  handoverPublicContact?: boolean;
  handoverAdminLogin?: boolean;
  handoverSmtpUser?: boolean;
}

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(ADMIN_TOKEN_KEY) || sessionStorage.getItem(LEGACY_ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  try {
    sessionStorage.setItem(ADMIN_TOKEN_KEY, token);
    sessionStorage.setItem(LEGACY_ADMIN_TOKEN_KEY, token);
    // Explicitly clean up any stale localStorage tokens so closing the tab/website ends the active session
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
  } catch {}
}

export function clearAdminToken(): void {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_KEY);
    sessionStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
    sessionStorage.removeItem('salon_admin_user');
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    localStorage.removeItem(LEGACY_ADMIN_TOKEN_KEY);
    localStorage.removeItem('salon_admin_user');
  } catch {}
}

export function getCustomerToken(): string | null {
  return localStorage.getItem(CUSTOMER_TOKEN_KEY);
}

export function setCustomerToken(token: string): void {
  localStorage.setItem(CUSTOMER_TOKEN_KEY, token);
}

export function clearCustomerToken(): void {
  localStorage.removeItem(CUSTOMER_TOKEN_KEY);
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const adminToken = getAdminToken();
  if (adminToken) {
    headers.set('Authorization', `Bearer ${adminToken}`);
  }

  const customerToken = getCustomerToken();
  if (customerToken) {
    headers.set('x-customer-token', customerToken);
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || `HTTP error ${res.status}`);
  }
  return data as T;
}

export const api = {
  // Public
  getConfig: () => request<any>('/api/public/config'),
  syncState: (data: any) =>
    request<{ success: boolean; isSetupCompleted: boolean; settings?: any }>('/api/public/sync-state', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getCategories: () => request<ServiceCategory[]>('/api/public/categories'),
  getServices: () => request<Service[]>('/api/public/services'),
  getReviews: () => request<Review[]>('/api/public/reviews'),
  submitPublicReview: (data: {
    authorName: string;
    rating: number;
    reviewText: string;
    phone?: string;
    email?: string;
    source?: string;
  }) =>
    request<{ success: boolean; review: Review }>('/api/public/reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getGallery: () => request<GalleryItem[]>('/api/public/gallery'),
  getAvailability: (date: string, serviceId: string) =>
    request<DayAvailabilityResponse>(`/api/public/availability?date=${date}&serviceId=${serviceId}`),
  createBooking: (data: {
    serviceId: string;
    date: string;
    time: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    stylistId?: string;
    stylistName?: string;
    notes?: string;
    customerId?: string;
  }) =>
    request<{ success: boolean; appointment: Appointment; message: string }>('/api/public/bookings', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getBooking: (identifier: string) => request<any>(`/api/public/bookings/${identifier}`),
  getCustomerAppointments: (params: { phone?: string; numbers?: string }) => {
    const q = new URLSearchParams();
    if (params.phone) q.append('phone', params.phone);
    if (params.numbers) q.append('numbers', params.numbers);
    return request<Appointment[]>(`/api/public/customer-appointments?${q.toString()}`);
  },

  // Real-time OTP Verification
  sendOtp: (target: string, type?: 'mobile' | 'email') =>
    request<{ success: boolean; message: string; expiresAt: number }>('/api/public/send-otp', {
      method: 'POST',
      body: JSON.stringify({ target, type })
    }),
  verifyOtp: (target: string, code: string) =>
    request<{ success: boolean; message: string }>('/api/public/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ target, code })
    }),

  // Customer Auth (Gmail Sign Up, Login & OTP Verification)
  customerSignup: (data: { name: string; email: string; phone: string; password: string; otpCode?: string }) =>
    request<{
      success: boolean;
      token: string;
      customer: { id: string; name: string; email: string; phone: string; isVerified: boolean };
      message: string;
    }>('/api/customer/signup', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  customerLogin: (data: { identifier: string; password?: string; otpCode?: string }) =>
    request<{
      success: boolean;
      token: string;
      customer: { id: string; name: string; email: string; phone: string; isVerified: boolean };
    }>('/api/customer/login', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  customerResetPassword: (data: { email: string; otpCode: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/customer/reset-password', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  getCustomerMe: () =>
    request<{ customer: { id: string; name: string; email: string; phone: string; isVerified: boolean } }>('/api/customer/me'),
  getCustomerBookings: () => request<Appointment[]>('/api/customer/bookings'),
  customerLogout: () =>
    request<{ success: boolean; message: string }>('/api/customer/logout', {
      method: 'POST'
    }).catch(() => ({ success: true, message: 'Logged out' })),
  resendBookingCard: (data: { bookingNumber?: string; appointmentId?: string }) =>
    request<{ success: boolean; message: string }>('/api/customer/resend-booking-card', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  cancelCustomerAppointment: (id: string, reason?: string) =>
    request<{ success: boolean; message: string; appointment: Appointment }>(`/api/customer/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),

  // Customer Reviews (Submission & Management)
  getCustomerReviews: () => request<Review[]>('/api/customer/reviews'),
  createCustomerReview: (data: { rating: number; reviewText: string }) =>
    request<{ success: boolean; review: Review; message: string }>('/api/customer/reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCustomerReview: (id: string, data: { rating: number; reviewText: string }) =>
    request<{ success: boolean; review: Review; message: string }>(`/api/customer/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteCustomerReview: (id: string) =>
    request<{ success: boolean }>(`/api/customer/reviews/${id}`, {
      method: 'DELETE'
    }),

  // Admin Auth
  getAdminToken,
  setAdminToken,
  clearAdminToken,
  getCustomerToken,
  setCustomerToken,
  clearCustomerToken,
  getAdminSetupStatus: () =>
    request<{ isSetupCompleted: boolean; adminCount: number; registeredUsername: string | null; registeredEmail: string | null }>(
      '/api/admin/setup-status'
    ),
  adminSignup: (data: { username?: string; password: string; email?: string; otpCode?: string }) =>
    request<{ success: boolean; token: string; user: { id: string; username: string; email?: string; role: string }; message: string }>(
      '/api/admin/signup',
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    ),
  adminLogin: (credentials: { username?: string; identifier?: string; email?: string; password?: string; otpCode?: string }) =>
    request<{ token: string; user: { id: string; username: string; email?: string; role: string } }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),
  adminLogout: () =>
    request<{ success: boolean }>('/api/admin/logout', {
      method: 'POST'
    }),
  adminMe: () => request<{ user: { userId: string; username: string; email?: string } }>('/api/admin/me'),
  changeAdminPassword: (data: { currentPassword: string; newPassword: string }) =>
    request<{ success: boolean; message: string }>('/api/admin/change-password', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  updateAdminCredentials: (data: {
    currentPassword: string;
    newUsername?: string;
    newEmail?: string;
    newPassword?: string;
    otpCode?: string;
  }) =>
    request<{
      success: boolean;
      message: string;
      token?: string;
      user?: { id: string; username: string; email: string; role: string };
    }>('/api/admin/credentials', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  resetAdminSlot: () =>
    request<{ success: boolean; message: string }>('/api/admin/reset-slot', {
      method: 'POST'
    }),

  // Admin Media Upload & Library (Say NO to image URLs!)
  uploadAdminMedia: (imageBase64: string, filename?: string) =>
    request<{ success: boolean; url: string; filename: string }>('/api/admin/upload-media', {
      method: 'POST',
      body: JSON.stringify({ imageBase64, filename })
    }),
  getAdminMedia: () =>
    request<{ name: string; url: string; createdAt?: string }[]>('/api/admin/media'),

  // Admin Overview & Appointments
  getAdminOverview: () => request<any>('/api/admin/overview'),
  getAdminAppointments: (params?: { date?: string; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params?.date) q.append('date', params.date);
    if (params?.status) q.append('status', params.status);
    if (params?.search) q.append('search', params.search);
    return request<Appointment[]>(`/api/admin/appointments?${q.toString()}`);
  },
  createAdminAppointment: (data: any) =>
    request<Appointment>('/api/admin/appointments', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateAdminAppointment: (id: string, data: any) =>
    request<Appointment>(`/api/admin/appointments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteAdminAppointment: (id: string) =>
    request<{ success: boolean }>(`/api/admin/appointments/${id}`, {
      method: 'DELETE'
    }),
  clearAllAdminAppointments: () =>
    request<{ success: boolean; count: number; message: string }>('/api/admin/appointments/clear-all', {
      method: 'POST'
    }),

  // Admin Categories
  getAdminCategories: () => request<ServiceCategory[]>('/api/admin/categories'),
  createAdminCategory: (data: { name: string; description?: string }) =>
    request<ServiceCategory>('/api/admin/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Admin Services
  getAdminServices: () => request<Service[]>('/api/admin/services'),
  createAdminService: (data: Partial<Service>) =>
    request<Service>('/api/admin/services', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateAdminService: (id: string, data: Partial<Service>) =>
    request<Service>(`/api/admin/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteAdminService: (id: string) =>
    request<{ success: boolean }>(`/api/admin/services/${id}`, {
      method: 'DELETE'
    }),

  // Admin Business Hours
  getAdminBusinessHours: () => request<BusinessHoursDay[]>('/api/admin/business-hours'),
  updateAdminBusinessHours: (businessHours: BusinessHoursDay[]) =>
    request<BusinessHoursDay[]>('/api/admin/business-hours', {
      method: 'PUT',
      body: JSON.stringify({ businessHours })
    }),

  // Admin Blocked Dates
  getAdminBlockedDates: () => request<BlockedDate[]>('/api/admin/blocked-dates'),
  createAdminBlockedDate: (data: Partial<BlockedDate>) =>
    request<BlockedDate>('/api/admin/blocked-dates', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteAdminBlockedDate: (id: string) =>
    request<{ success: boolean }>(`/api/admin/blocked-dates/${id}`, {
      method: 'DELETE'
    }),

  // Admin Customers
  getAdminCustomers: () => request<any[]>('/api/admin/customers'),
  updateAdminCustomer: (id: string, data: any) =>
    request<any>(`/api/admin/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteAdminCustomer: (id: string, options?: { cascadeBookings?: boolean; force?: boolean }) => {
    const q = new URLSearchParams();
    if (options?.cascadeBookings) q.append('cascadeBookings', 'true');
    if (options?.force) q.append('force', 'true');
    const qs = q.toString() ? `?${q.toString()}` : '';
    return request<{ success: boolean; message: string }>(`/api/admin/customers/${id}${qs}`, {
      method: 'DELETE'
    });
  },

  // Admin Gallery
  getAdminGallery: () => request<GalleryItem[]>('/api/admin/gallery'),
  createAdminGallery: (data: Partial<GalleryItem>) =>
    request<GalleryItem>('/api/admin/gallery', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateAdminGallery: (id: string, data: Partial<GalleryItem>) =>
    request<GalleryItem>(`/api/admin/gallery/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteAdminGallery: (id: string) =>
    request<{ success: boolean }>(`/api/admin/gallery/${id}`, {
      method: 'DELETE'
    }),

  // Admin Reviews
  getAdminReviews: () => request<Review[]>('/api/admin/reviews'),
  createAdminReview: (data: Partial<Review>) =>
    request<Review>('/api/admin/reviews', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateAdminReview: (id: string, data: Partial<Review>) =>
    request<Review>(`/api/admin/reviews/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  updateAdminReviewStatus: (id: string, status: string) =>
    request<{ success: boolean; review: Review }>(`/api/admin/reviews/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status })
    }),
  deleteAdminReview: (id: string) =>
    request<{ success: boolean }>(`/api/admin/reviews/${id}`, {
      method: 'DELETE'
    }),

  // Admin Settings
  getAdminSettings: () => request<SiteSettings>('/api/admin/settings'),
  updateAdminSettings: (data: Partial<SiteSettings>) =>
    request<SiteSettings>('/api/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Admin Notifications Log & Persistent Alerts
  getAdminNotifications: () => request<NotificationLog[]>('/api/admin/notifications-log'),
  getPersistentAdminNotifications: () =>
    request<{ notifications: AdminNotification[]; unreadCount: number }>('/api/admin/notifications'),
  markAdminNotificationRead: (id: string) =>
    request<{ success: boolean }>(`/api/admin/notifications/${id}/read`, {
      method: 'POST'
    }),
  markAllAdminNotificationsRead: () =>
    request<{ success: boolean }>('/api/admin/notifications/mark-all-read', {
      method: 'POST'
    }),
  deleteAdminNotification: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/notifications/${id}`, {
      method: 'DELETE'
    }),
  deleteAllAdminNotifications: (onlyRead = false) =>
    request<{ success: boolean; message: string }>(`/api/admin/notifications${onlyRead ? '?onlyRead=true' : ''}`, {
      method: 'DELETE'
    }),
  deleteAdminNotificationLog: (id: string) =>
    request<{ success: boolean; message: string }>(`/api/admin/notifications-log/${id}`, {
      method: 'DELETE'
    }),
  clearAllAdminNotificationLogs: () =>
    request<{ success: boolean; message: string }>('/api/admin/notifications-log', {
      method: 'DELETE'
    }),
  testAdminEmail: (targetEmail?: string) =>
    request<{ success: boolean; message: string; isLiveSmtp?: boolean; messageId?: string }>('/api/admin/test-email', {
      method: 'POST',
      body: JSON.stringify({ targetEmail })
    }),
  testBookingAlertEmail: (targetEmail?: string) =>
    request<{ success: boolean; message: string; isLiveSmtp?: boolean; messageId?: string }>('/api/admin/test-booking-alert', {
      method: 'POST',
      body: JSON.stringify({ targetEmail })
    }),
  getEmailHub: () => request<EmailHubData>('/api/admin/email-hub'),
  updateEmailHub: (data: Partial<EmailHubData & { smtpPassword?: string }>) =>
    request<{ success: boolean; message: string }>('/api/admin/email-hub', {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Supabase Backend Status & Sync
  getSupabaseStatus: () =>
    request<{
      connected: boolean;
      url: string;
      projectId: string;
      hasAppointmentsTable: boolean;
      error?: string;
      migrationSql: string;
    }>('/api/admin/supabase-status'),
  syncAllAppointmentsToSupabase: () =>
    request<{ success: boolean; count: number; details: any[] }>('/api/admin/supabase-sync-all', {
      method: 'POST'
    }),

  // Staff Management (Stylists & Specialists)
  getPublicStaff: () => request<StaffMember[]>('/api/public/staff'),
  getAdminStaff: () => request<StaffMember[]>('/api/admin/staff'),
  createAdminStaff: (data: Partial<StaffMember>) =>
    request<StaffMember>('/api/admin/staff', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateAdminStaff: (id: string, data: Partial<StaffMember>) =>
    request<StaffMember>(`/api/admin/staff/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteAdminStaff: (id: string) =>
    request<{ success: boolean }>(`/api/admin/staff/${id}`, {
      method: 'DELETE'
    })
};
