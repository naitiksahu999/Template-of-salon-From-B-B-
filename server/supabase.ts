import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { getDb, saveDb } from './db.ts';
import type {
  Appointment,
  Service,
  BusinessHoursDay,
  BlockedDate,
  SiteSettings,
  ServiceCategory,
  AdminNotification,
  Review
} from '../src/types/index.ts';

dotenv.config();

// User-provided Supabase configuration
const SUPABASE_PROJECT_ID = process.env.SUPABASE_PROJECT_ID || 'fkkbcnaazeajcnssniev';
const SUPABASE_URL = process.env.SUPABASE_URL || `https://${SUPABASE_PROJECT_ID}.supabase.co`;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_SeQLZGYpG6SU7pj8fTTRRg_bXRnqudV';

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;

  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false
      }
    });
    return supabaseClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

export interface SupabaseSyncResult {
  synced: boolean;
  table?: string;
  error?: string;
  details?: any;
}

/**
 * Checks connection health to Supabase
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  url: string;
  projectId: string;
  hasAppointmentsTable: boolean;
  error?: string;
}> {
  const client = getSupabase();
  if (!client) {
    return {
      connected: false,
      url: SUPABASE_URL,
      projectId: SUPABASE_PROJECT_ID,
      hasAppointmentsTable: false,
      error: 'Supabase client not initialized'
    };
  }

  try {
    const { data, error } = await client.from('appointments').select('id').limit(1);
    if (error) {
      // If code is PGRST205 or message has 'Could not find the table', the connection worked but table needs SQL execution
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        return {
          connected: true,
          url: SUPABASE_URL,
          projectId: SUPABASE_PROJECT_ID,
          hasAppointmentsTable: false,
          error: "Connected to Supabase! Table 'appointments' has not been created yet in public schema."
        };
      }
      return {
        connected: false,
        url: SUPABASE_URL,
        projectId: SUPABASE_PROJECT_ID,
        hasAppointmentsTable: false,
        error: error.message
      };
    }

    return {
      connected: true,
      url: SUPABASE_URL,
      projectId: SUPABASE_PROJECT_ID,
      hasAppointmentsTable: true
    };
  } catch (err: any) {
    return {
      connected: false,
      url: SUPABASE_URL,
      projectId: SUPABASE_PROJECT_ID,
      hasAppointmentsTable: false,
      error: err.message
    };
  }
}

/**
 * Syncs a newly created or updated appointment to Supabase.
 * Uses exact schema columns present in public.appointments, and automatically adapts
 * if columns differ.
 */
export async function syncAppointmentToSupabase(appointment: Appointment): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client) {
    return { synced: false, error: 'Supabase client not configured' };
  }

  // Exact column schema matching public.appointments table in Supabase
  const standardPayload = {
    id: appointment.id,
    booking_number: appointment.bookingNumber,
    customer_id: appointment.customerId || null,
    customer_name: appointment.customerName,
    customer_phone: appointment.customerPhone,
    customer_email: appointment.customerEmail || null,
    service_id: appointment.serviceId,
    service_name: appointment.serviceName,
    service_price: appointment.servicePrice || 0,
    service_duration: appointment.serviceDuration || 30,
    appointment_date: appointment.date,
    appointment_time: appointment.time,
    date: appointment.date,
    time: appointment.time,
    end_time: appointment.endTime || null,
    status: appointment.status || 'confirmed',
    stylist_id: appointment.stylistId || null,
    stylist_name: appointment.stylistName || null,
    cancellation_reason: appointment.cancellationReason || null,
    cancelled_at: appointment.cancelledAt || null,
    cancelled_by: appointment.cancelledBy || null,
    internal_notes: (() => {
      let notesStr = (appointment.internalNotes || '').trim();
      // Remove any prior tags so the newest collected amount & payment method are always cleanly written
      notesStr = notesStr
        .replace(/\[ACTUAL_COLLECTED:[^\]]*\]/gi, '')
        .replace(/\[PAYMENT_METHOD:[^\]]*\]/gi, '')
        .replace(/\[PAYMENT_NOTES:[^\]]*\]/gi, '')
        .trim();

      if (typeof appointment.actualAmountCollected === 'number') {
        notesStr = `${notesStr ? notesStr + ' ' : ''}[ACTUAL_COLLECTED: ₹${appointment.actualAmountCollected}]${appointment.paymentMethod ? ` [PAYMENT_METHOD: ${appointment.paymentMethod}]` : ''}${appointment.amountNotes ? ` [PAYMENT_NOTES: ${appointment.amountNotes}]` : ''}`;
      }
      return notesStr;
    })(),
    created_at: appointment.createdAt || new Date().toISOString(),
    updated_at: appointment.updatedAt || new Date().toISOString()
  };

  // 1. Try upserting to 'appointments' table
  try {
    const { error: apptError } = await client.from('appointments').upsert(standardPayload, { onConflict: 'id' });
    if (!apptError) {
      console.log(`[Supabase] Successfully synced appointment ${appointment.bookingNumber} to 'appointments' table.`);
      return { synced: true, table: 'appointments' };
    }

    // If an unknown column error (PGRST204) occurs, dynamically filter to accepted columns
    if (apptError.code === 'PGRST204' && apptError.message) {
      console.warn(`[Supabase Schema Notice]: ${apptError.message}. Retrying with minimal core columns...`);
      const minimalPayload = {
        id: appointment.id,
        booking_number: appointment.bookingNumber,
        customer_name: appointment.customerName,
        customer_phone: appointment.customerPhone,
        service_id: appointment.serviceId,
        service_name: appointment.serviceName,
        status: appointment.status
      };
      const { error: retryError } = await client.from('appointments').upsert(minimalPayload, { onConflict: 'id' });
      if (!retryError) {
        console.log(`[Supabase] Successfully synced appointment ${appointment.bookingNumber} with core columns.`);
        return { synced: true, table: 'appointments' };
      }
    }

    // If table doesn't exist (PGRST205), try 'bookings'
    if (apptError.code === 'PGRST205' || apptError.message?.includes('Could not find the table')) {
      const { error: bookError } = await client.from('bookings').upsert(standardPayload, { onConflict: 'id' });
      if (!bookError) {
        console.log(`[Supabase] Successfully saved appointment ${appointment.bookingNumber} to 'bookings' table.`);
        return { synced: true, table: 'bookings' };
      }

      console.warn(`[Supabase Notice] Supabase table 'appointments' not found in public schema.`);
      return {
        synced: false,
        error: `Supabase table 'appointments' not found in public schema.`,
        details: apptError
      };
    }

    console.error(`[Supabase Insert Error]:`, apptError);
    return { synced: false, error: apptError.message, details: apptError };
  } catch (err: any) {
    console.error(`[Supabase Exception]:`, err);
    return { synced: false, error: err.message };
  }
}

/**
 * Syncs a customer profile to Supabase public.customers table
 */
export async function syncCustomerToSupabase(customer: {
  id: string;
  name: string;
  phone: string;
  email?: string;
  totalBookings?: number;
  lastBookingDate?: string;
  createdAt?: string;
}): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client) {
    return { synced: false, error: 'Supabase client not configured' };
  }

  const cleanPhone = customer.phone.trim();
  const cleanEmail = customer.email ? customer.email.trim().toLowerCase() : null;

  const payload: any = {
    id: customer.id,
    name: customer.name.trim(),
    phone: cleanPhone,
    email: cleanEmail,
    total_bookings: customer.totalBookings || 1,
    last_booking_date: customer.lastBookingDate || null,
    created_at: customer.createdAt || new Date().toISOString()
  };

  try {
    // 1. Check if customer already exists by phone to keep stable ID across devices
    const { data: existingByPhone } = await client
      .from('customers')
      .select('id, total_bookings')
      .eq('phone', cleanPhone)
      .maybeSingle();

    if (existingByPhone?.id) {
      payload.id = existingByPhone.id;
      if (typeof customer.totalBookings !== 'number' && typeof existingByPhone.total_bookings === 'number') {
        payload.total_bookings = existingByPhone.total_bookings;
      }
    }

    const { error } = await client.from('customers').upsert(payload, { onConflict: 'phone' });
    if (!error) {
      console.log(`[Supabase] Successfully synced customer "${customer.name}" (${cleanPhone}) to 'customers' table.`);
      return { synced: true, table: 'customers' };
    }
    console.error(`[Supabase Customer Insert Error]:`, error);
    return { synced: false, error: error.message, details: error };
  } catch (err: any) {
    console.error(`[Supabase Customer Exception]:`, err);
    return { synced: false, error: err.message };
  }
}

/**
 * Fetches all registered customer profiles directly from Supabase
 */
export async function fetchSupabaseCustomers(): Promise<any[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (error || !data) {
      console.warn('[Supabase Fetch Customers Notice]:', error?.message);
      return [];
    }
    return data;
  } catch (err: any) {
    console.warn('[Supabase Fetch Customers Exception]:', err?.message);
    return [];
  }
}

/**
 * Fetches persistent appointments directly from Supabase
 */
export async function fetchSupabaseAppointments(): Promise<any[]> {
  const client = getSupabase();
  if (!client) return [];
  try {
    const { data, error } = await client
      .from('appointments')
      .select('*')
      .neq('id', '__salon_global_state__')
      .neq('status', 'deleted')
      .not('id', 'like', '__salon_%')
      .not('id', 'like', 'test_%')
      .not('id', 'like', 'system_%')
      .order('appointment_date', { ascending: false });
    if (error || !data) {
      console.warn('[Supabase Fetch Appointments Notice]:', error?.message);
      return [];
    }
    return data.map((ca: any) => {
      let collectedAmt = typeof ca.actual_amount_collected === 'number' ? ca.actual_amount_collected : undefined;
      let pMethod = ca.payment_method;
      let pNotes = ca.amount_notes;
      const fullNotes = (ca.internal_notes || '') + ' ' + (ca.notes || '');
      if (collectedAmt === undefined && fullNotes.includes('[ACTUAL_COLLECTED:')) {
        const match = fullNotes.match(/\[ACTUAL_COLLECTED:\s*₹?(\d+(?:\.\d+)?)\]/i);
        if (match) collectedAmt = parseFloat(match[1]);
      }
      if (!pMethod && fullNotes.includes('[PAYMENT_METHOD:')) {
        const match = fullNotes.match(/\[PAYMENT_METHOD:\s*([^\]]+)\]/i);
        if (match) pMethod = match[1].trim();
      }
      if (!pNotes && fullNotes.includes('[PAYMENT_NOTES:')) {
        const match = fullNotes.match(/\[PAYMENT_NOTES:\s*([^\]]+)\]/i);
        if (match) pNotes = match[1].trim();
      }
      return {
        ...ca,
        actual_amount_collected: collectedAmt,
        payment_method: pMethod,
        amount_notes: pNotes
      };
    });
  } catch (err: any) {
    console.warn('[Supabase Fetch Appointments Exception]:', err?.message);
    return [];
  }
}

/**
 * Deletes an appointment from Supabase by ID or Booking Reference
 */
export async function deleteAppointmentFromSupabase(id: string, bookingNumber?: string): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client) {
    return { synced: false, error: 'Supabase client not configured' };
  }

  try {
    // 1. Attempt hard delete by id
    await client.from('appointments').delete().eq('id', id);
    if (bookingNumber) {
      await client.from('appointments').delete().eq('booking_number', bookingNumber);
    }
    // 2. Also mark status as deleted so even if RLS blocks delete, it is filtered out
    await client.from('appointments').update({ status: 'deleted' }).eq('id', id);
    if (bookingNumber) {
      await client.from('appointments').update({ status: 'deleted' }).eq('booking_number', bookingNumber);
    }
    console.log(`[Supabase] Successfully committed deletion for appointment ${id} (Ref: ${bookingNumber || id}).`);
    return { synced: true, table: 'appointments' };
  } catch (err: any) {
    console.error(`[Supabase Delete Exception]:`, err);
    return { synced: false, error: err.message };
  }
}

/**
 * Deletes a customer from Supabase by ID or Phone
 */
export async function deleteCustomerFromSupabase(id: string, phone?: string): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client) {
    return { synced: false, error: 'Supabase client not configured' };
  }

  try {
    await client.from('customers').delete().eq('id', id);
    if (phone) {
      await client.from('customers').delete().eq('phone', phone);
    }
    console.log(`[Supabase] Successfully committed deletion for customer ${id}.`);
    return { synced: true, table: 'customers' };
  } catch (err: any) {
    console.error(`[Supabase Customer Delete Exception]:`, err);
    return { synced: false, error: err.message };
  }
}

/**
 * Clears fake or test appointments from Supabase
 */
export async function clearAppointmentsFromSupabase(idsToDelete?: string[]): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client) {
    return { synced: false, error: 'Supabase client not configured' };
  }

  try {
    if (idsToDelete && idsToDelete.length > 0) {
      await client.from('appointments').delete().in('id', idsToDelete);
      await client.from('appointments').update({ status: 'deleted' }).in('id', idsToDelete);
    } else {
      // Delete all records that are not the internal state store (__salon_%)
      await client.from('appointments').delete().not('id', 'like', '__salon_%');
      await client.from('appointments').update({ status: 'deleted' }).not('id', 'like', '__salon_%');
    }
    return { synced: true, table: 'appointments' };
  } catch (err: any) {
    return { synced: false, error: err.message };
  }
}

/**
 * Syncs services and pricing changes to Supabase
 */
export async function syncServicesToSupabase(services: Service[]): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client || !services || services.length === 0) {
    return { synced: false, error: 'Supabase client not configured or empty services' };
  }

  try {
    const payload = services.map((s) => ({
      id: s.id,
      category_id: s.categoryId,
      name: s.name,
      description: s.description || '',
      price: s.price,
      duration_minutes: s.durationMinutes,
      image_url: s.imageUrl || null,
      is_active: s.isActive ?? true,
      is_featured: s.isFeatured ?? false,
      price_type: s.priceType || 'exact',
      min_price: s.minPrice != null ? s.minPrice : null,
      max_price: s.maxPrice != null ? s.maxPrice : null,
      updated_at: s.updatedAt || new Date().toISOString()
    }));

    let { error } = await client.from('services').upsert(payload, { onConflict: 'id' });
    if (error && (error.message.includes('price_type') || error.message.includes('min_price') || error.message.includes('max_price') || error.message.includes('column'))) {
      // Fallback without new columns if cloud table schema has not yet been altered
      const basePayload = payload.map(({ price_type, min_price, max_price, ...rest }) => rest);
      const res = await client.from('services').upsert(basePayload, { onConflict: 'id' });
      error = res.error;
    }

    if (!error) {
      console.log(`[Supabase] Successfully synced ${services.length} services to Supabase.`);
      return { synced: true, table: 'services' };
    }
    return { synced: false, error: error.message };
  } catch (err: any) {
    return { synced: false, error: err.message };
  }
}

/**
 * Syncs service categories to Supabase
 */
export async function syncCategoriesToSupabase(categories: ServiceCategory[]): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client || !categories || categories.length === 0) {
    return { synced: false, error: 'Supabase client not configured or empty categories' };
  }

  try {
    const payload = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug || c.id.replace('cat_', ''),
      description: c.description || '',
      sort_order: c.sortOrder || 1
    }));

    // Try primary categories table
    const { error } = await client.from('categories').upsert(payload, { onConflict: 'id' });
    if (!error) {
      console.log(`[Supabase] Successfully synced ${categories.length} categories to Supabase.`);
      return { synced: true, table: 'categories' };
    }

    // Try alternate service_categories table
    const { error: altError } = await client.from('service_categories').upsert(payload, { onConflict: 'id' });
    if (!altError) {
      console.log(`[Supabase] Successfully synced ${categories.length} categories to service_categories table.`);
      return { synced: true, table: 'service_categories' };
    }

    return { synced: false, error: error.message || altError?.message };
  } catch (err: any) {
    return { synced: false, error: err.message };
  }
}

/**
 * Syncs weekly business hours to Supabase
 */
export async function syncBusinessHoursToSupabase(hours: BusinessHoursDay[]): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client || !hours || hours.length === 0) {
    return { synced: false, error: 'Supabase client not configured or empty hours' };
  }

  try {
    const payload = hours.map((h) => ({
      day_of_week: h.dayOfWeek,
      day_name: h.dayName,
      open_time: h.openTime,
      close_time: h.closeTime,
      is_closed: !h.isOpen
    }));

    const { error } = await client.from('business_hours').upsert(payload, { onConflict: 'day_of_week' });
    if (!error) {
      console.log(`[Supabase] Successfully synced business hours to Supabase.`);
      return { synced: true, table: 'business_hours' };
    }
    return { synced: false, error: error.message };
  } catch (err: any) {
    return { synced: false, error: err.message };
  }
}

/**
 * Syncs salon blocked dates and holidays to Supabase
 */
export async function syncBlockedDatesToSupabase(blockedDates: BlockedDate[]): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client) {
    return { synced: false, error: 'Supabase client not configured' };
  }

  try {
    const payload = blockedDates.map((b) => ({
      id: b.id,
      date: b.date,
      reason: b.reason,
      all_day: b.allDay,
      start_time: b.startTime || null,
      end_time: b.endTime || null
    }));

    const { error } = await client.from('blocked_dates').upsert(payload, { onConflict: 'id' });
    if (!error) {
      console.log(`[Supabase] Successfully synced ${blockedDates.length} blocked dates to Supabase.`);
      return { synced: true, table: 'blocked_dates' };
    }
    return { synced: false, error: error.message };
  } catch (err: any) {
    return { synced: false, error: err.message };
  }
}

/**
 * Syncs site settings, contact details, and location to Supabase
 */
export async function syncSettingsToSupabase(settings: SiteSettings): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client || !settings) {
    return { synced: false, error: 'Supabase client not configured or empty settings' };
  }

  try {
    const payload = {
      id: 'salon_settings_singleton',
      salon_name: settings.salonName,
      alternate_name: settings.alternateName || '',
      tagline: settings.tagline || '',
      phone: settings.phone,
      email: settings.email,
      address: settings.address,
      landmarks: settings.landmarks || '',
      city: settings.city || 'Bhopal',
      state: settings.state || 'Madhya Pradesh',
      pincode: settings.pincode || '462042',
      google_maps_url: settings.googleMapsUrl || '',
      admin_whatsapp_phone: settings.adminWhatsAppPhone || settings.phone,
      auto_confirm_bookings: settings.autoConfirmBookings ?? true,
      hero_banner_url: settings.heroBannerUrl || null,
      second_hero_banner_url: settings.secondHeroBannerUrl || null,
      updated_at: new Date().toISOString()
    };

    const { error } = await client.from('settings').upsert(payload, { onConflict: 'id' });
    if (!error) {
      console.log(`[Supabase] Successfully synced salon settings to Supabase.`);
      return { synced: true, table: 'settings' };
    }
    return { synced: false, error: error.message };
  } catch (err: any) {
    return { synced: false, error: err.message };
  }
}

/**
 * Syncs an admin notification record to Supabase
 */
export async function syncAdminNotificationToSupabase(notification: AdminNotification): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client) {
    return { synced: false, error: 'Supabase client not configured' };
  }

  try {
    const payload = {
      id: notification.id,
      appointment_id: notification.appointmentId || null,
      booking_number: notification.bookingNumber || null,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      is_read: Boolean(notification.isRead),
      created_at: notification.createdAt || new Date().toISOString()
    };

    const { error } = await client.from('admin_notifications').upsert(payload, { onConflict: 'id' });
    if (!error) {
      return { synced: true, table: 'admin_notifications' };
    }
    return { synced: false, error: error.message };
  } catch (err: any) {
    return { synced: false, error: err.message };
  }
}

/**
 * Syncs a review to Supabase persistent table
 */
export async function syncReviewToSupabase(review: Review): Promise<SupabaseSyncResult> {
  const client = getSupabase();
  if (!client) {
    return { synced: false, error: 'Supabase client not configured' };
  }

  try {
    const payload = {
      id: review.id,
      author_name: review.authorName,
      rating: review.rating,
      review_text: review.reviewText,
      review_date: review.reviewDate || 'Recent',
      source: review.source || 'Google Maps',
      status: review.status || 'approved',
      customer_id: review.customerId || null,
      customer_email: review.customerEmail || null,
      is_verified: Boolean(review.isVerified),
      is_featured: Boolean(review.isFeatured),
      created_at: review.createdAt || new Date().toISOString(),
      updated_at: review.updatedAt || new Date().toISOString()
    };

    const { error } = await client.from('reviews').upsert(payload, { onConflict: 'id' });
    if (!error) {
      return { synced: true, table: 'reviews' };
    }
    return { synced: false, error: error.message };
  } catch (err: any) {
    return { synced: false, error: err.message };
  }
}

/**
 * Deletes a review from Supabase
 */
export async function deleteSupabaseReview(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;
  try {
    const { error } = await client.from('reviews').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Fetches persistent admin notifications from Supabase
 */
export async function fetchSupabaseAdminNotifications(): Promise<AdminNotification[]> {
  const client = getSupabase();
  if (!client) return [];

  try {
    const { data, error } = await client
      .from('admin_notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(60);

    if (error || !data) return [];

    return data.map((n: any) => ({
      id: n.id,
      appointmentId: n.appointment_id || undefined,
      bookingNumber: n.booking_number || undefined,
      type: n.type || 'general',
      title: n.title,
      message: n.message,
      isRead: Boolean(n.is_read),
      createdAt: n.created_at
    }));
  } catch {
    return [];
  }
}

/**
 * Marks a notification as read in Supabase
 */
export async function markSupabaseNotificationRead(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('admin_notifications').update({ is_read: true }).eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Marks all notifications as read in Supabase
 */
export async function markAllSupabaseNotificationsRead(): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('admin_notifications').update({ is_read: true }).eq('is_read', false);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Permanently deletes an admin notification from Supabase
 */
export async function deleteSupabaseAdminNotification(id: string): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    const { error } = await client.from('admin_notifications').delete().eq('id', id);
    return !error;
  } catch {
    return false;
  }
}

/**
 * Permanently deletes all or read-only admin notifications from Supabase
 */
export async function deleteAllSupabaseAdminNotifications(onlyRead = false): Promise<boolean> {
  const client = getSupabase();
  if (!client) return false;

  try {
    let query = client.from('admin_notifications').delete();
    if (onlyRead) {
      query = query.eq('is_read', true);
    } else {
      query = query.neq('id', '__never_match__');
    }
    const { error } = await query;
    return !error;
  } catch {
    return false;
  }
}

/**
 * Records an in-app Admin Notification into local db cache and syncs to Supabase Cloud
 */
export async function recordAndDispatchAdminNotification(
  type: 'new_booking' | 'confirmed' | 'cancelled' | 'rejected' | 'rescheduled' | 'general',
  title: string,
  message: string,
  appointmentId?: string,
  bookingNumber?: string
): Promise<AdminNotification> {
  const notif: AdminNotification = {
    id: `notif_adm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    appointmentId,
    bookingNumber,
    type,
    title,
    message,
    isRead: false,
    createdAt: new Date().toISOString()
  };

  try {
    const db = await getDb();
    db.adminNotifications = db.adminNotifications || [];
    db.adminNotifications.unshift(notif);
    if (db.adminNotifications.length > 120) {
      db.adminNotifications = db.adminNotifications.slice(0, 120);
    }
    await saveDb(db);

    syncAdminNotificationToSupabase(notif).catch((err) => {
      console.warn('[Supabase Notification Sync Notice]:', err.message);
    });
  } catch (err: any) {
    console.error('Failed to record admin notification:', err.message);
  }

  return notif;
}

/**
 * Returns SQL code snippet that the user or admin can run in Supabase SQL Editor
 * with 1 click to instantiate all relevant tables and security policies safely.
 */
export function getSupabaseMigrationSql(): string {
  return `-- ==========================================================
-- B&B Family Salon - Supabase Database Schema
-- Safe & Idempotent (Can be re-run at any time without errors)
-- Run this in your Supabase Project SQL Editor (fkkbcnaazeajcnssniev)
-- ==========================================================

-- 1. Appointments Table
CREATE TABLE IF NOT EXISTS public.appointments (
    id TEXT PRIMARY KEY,
    booking_number TEXT NOT NULL,
    customer_id TEXT,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    service_id TEXT NOT NULL,
    service_name TEXT NOT NULL,
    service_price NUMERIC DEFAULT 0,
    service_duration INTEGER DEFAULT 30,
    appointment_date DATE NOT NULL,
    appointment_time TEXT NOT NULL,
    date DATE,
    time TEXT,
    end_time TEXT,
    status TEXT DEFAULT 'confirmed',
    notes TEXT,
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_phone ON public.appointments(customer_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_booking_number ON public.appointments(booking_number);

-- Enable RLS & safely drop existing policies to prevent "policy already exists" errors
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public select appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public update appointments" ON public.appointments;
DROP POLICY IF EXISTS "Allow public delete appointments" ON public.appointments;

CREATE POLICY "Allow public all appointments" ON public.appointments
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 2. Services Table
CREATE TABLE IF NOT EXISTS public.services (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    price_type TEXT DEFAULT 'exact',
    min_price NUMERIC,
    max_price NUMERIC,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'exact';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS min_price NUMERIC;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS max_price NUMERIC;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all services" ON public.services;
DROP POLICY IF EXISTS "Allow public read services" ON public.services;
DROP POLICY IF EXISTS "Allow public write services" ON public.services;

CREATE POLICY "Allow public all services" ON public.services
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 3. Business Hours Table
CREATE TABLE IF NOT EXISTS public.business_hours (
    day_of_week INTEGER PRIMARY KEY,
    day_name TEXT NOT NULL,
    open_time TEXT NOT NULL,
    close_time TEXT NOT NULL,
    is_closed BOOLEAN DEFAULT false
);

ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all business_hours" ON public.business_hours;

CREATE POLICY "Allow public all business_hours" ON public.business_hours
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 4. Blocked Dates / Salon Holidays
CREATE TABLE IF NOT EXISTS public.blocked_dates (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    reason TEXT,
    all_day BOOLEAN DEFAULT true,
    start_time TEXT,
    end_time TEXT
);

ALTER TABLE public.blocked_dates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all blocked_dates" ON public.blocked_dates;

CREATE POLICY "Allow public all blocked_dates" ON public.blocked_dates
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 5. Salon Settings Singleton
CREATE TABLE IF NOT EXISTS public.settings (
    id TEXT PRIMARY KEY DEFAULT 'salon_settings_singleton',
    salon_name TEXT NOT NULL,
    alternate_name TEXT,
    tagline TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    address TEXT,
    landmarks TEXT,
    city TEXT,
    state TEXT,
    pincode TEXT,
    google_maps_url TEXT,
    admin_whatsapp_phone TEXT,
    auto_confirm_bookings BOOLEAN DEFAULT true,
    hero_banner_url TEXT,
    second_hero_banner_url TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all settings" ON public.settings;

CREATE POLICY "Allow public all settings" ON public.settings
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 6. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    email TEXT,
    total_bookings INTEGER DEFAULT 1,
    last_booking_date DATE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all customers" ON public.customers;

CREATE POLICY "Allow public all customers" ON public.customers
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 7. Add Extended Cancellation & Staff Columns (Safe & Idempotent)
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS stylist_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS stylist_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_by TEXT;

-- 8. Persistent Admin Notifications Table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id TEXT PRIMARY KEY,
    appointment_id TEXT,
    booking_number TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'admin_notifications' 
        AND policyname = 'Allow public all admin_notifications'
    ) THEN
        CREATE POLICY "Allow public all admin_notifications" 
        ON public.admin_notifications
        FOR ALL 
        TO anon, authenticated
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 9. Reviews Table (Google Reviews & Verified Website Customer Reviews)
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    review_date TEXT,
    source TEXT NOT NULL DEFAULT 'Google Maps',
    status TEXT NOT NULL DEFAULT 'approved',
    customer_id TEXT,
    customer_email TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public all reviews" ON public.reviews;

CREATE POLICY "Allow public all reviews" ON public.reviews
    FOR ALL
    TO anon, authenticated
    USING (true)
    WITH CHECK (true);

-- 10. Grant Permissions to anon & authenticated roles for smooth sync & deletions
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
`;
}

/**
 * Concise upgrade-only SQL snippet for adding the new cancellation columns and admin notifications table
 */
export function getSupabaseUpgradeSql(): string {
  return `-- ==========================================================
-- B&B Family Salon - Feature Upgrade Migration
-- Safe & Idempotent (Can be re-run at any time without warnings)
-- ==========================================================

-- 1. Extend appointments table with cancellation & stylist columns
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS stylist_id TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS stylist_name TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS cancelled_by TEXT;

-- 1b. Extend services table with Exact/Range pricing support
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS price_type TEXT DEFAULT 'exact';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS min_price NUMERIC;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS max_price NUMERIC;

-- 2. Create persistent Admin Notifications table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
    id TEXT PRIMARY KEY,
    appointment_id TEXT,
    booking_number TEXT,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Row Level Security
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Safe Idempotent Policy (No DROP statement to avoid warnings)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'admin_notifications' 
        AND policyname = 'Allow public all admin_notifications'
    ) THEN
        CREATE POLICY "Allow public all admin_notifications" 
        ON public.admin_notifications
        FOR ALL 
        TO anon, authenticated
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 5. Create persistent Reviews table
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    author_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    review_date TEXT,
    source TEXT NOT NULL DEFAULT 'Google Maps',
    status TEXT NOT NULL DEFAULT 'approved',
    customer_id TEXT,
    customer_email TEXT,
    is_verified BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    source_url TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'reviews' 
        AND policyname = 'Allow public all reviews'
    ) THEN
        CREATE POLICY "Allow public all reviews" 
        ON public.reviews
        FOR ALL 
        TO anon, authenticated
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;

-- 6. Grant Permissions
GRANT ALL ON TABLE public.admin_notifications TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.appointments TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.reviews TO anon, authenticated, service_role;
`;
}
