import { getDb, saveDb } from './db.ts';
import { syncAppointmentToSupabase, syncCustomerToSupabase } from './supabase.ts';
import type {
  DayAvailabilityResponse,
  TimeSlotAvailability,
  Appointment,
  Customer,
  NotificationLog
} from '../src/types/index.ts';

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTimeDisplay(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayHours = h % 12 === 0 ? 12 : h % 12;
  return `${displayHours}:${String(m).padStart(2, '0')} ${period}`;
}

export async function checkSlotAvailability(
  dateStr: string,
  serviceId: string
): Promise<DayAvailabilityResponse> {
  const db = await getDb();

  const service = db.services.find((s) => s.id === serviceId && s.isActive);
  if (!service) {
    return {
      date: dateStr,
      isOpen: false,
      message: 'Selected service is currently inactive or not found.',
      slots: []
    };
  }

  // Parse target date
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay(); // 0 is Sunday, 1 is Monday...

  // Check past dates (using Indian timezone context Asia/Kolkata)
  const nowInBhopal = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const todayStr = `${nowInBhopal.getFullYear()}-${String(nowInBhopal.getMonth() + 1).padStart(2, '0')}-${String(nowInBhopal.getDate()).padStart(2, '0')}`;
  const currentMinutesToday = nowInBhopal.getHours() * 60 + nowInBhopal.getMinutes();

  if (dateStr < todayStr) {
    return {
      date: dateStr,
      isOpen: false,
      message: 'Cannot book appointments for past dates.',
      slots: []
    };
  }

  // Check blocked dates
  const fullDayBlock = db.blockedDates.find(
    (b) => b.date === dateStr && b.allDay
  );
  if (fullDayBlock) {
    return {
      date: dateStr,
      isOpen: false,
      message: `Salon is temporarily closed on this date: ${fullDayBlock.reason}`,
      slots: []
    };
  }

  // Check business hours
  const dayConfig = db.businessHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!dayConfig || !dayConfig.isOpen) {
    return {
      date: dateStr,
      isOpen: false,
      message: `B&B Family Salon is closed on ${dayConfig?.dayName || 'this day'}.`,
      slots: []
    };
  }

  const openMinutes = timeToMinutes(dayConfig.openTime || '10:00');
  const closeMinutes = timeToMinutes(dayConfig.closeTime || '21:00');
  const duration = service.durationMinutes || 30;
  const interval = db.settings.slotIntervalMinutes || 30;

  // Partial blocked periods
  const partialBlocks = db.blockedDates.filter(
    (b) => b.date === dateStr && !b.allDay && b.startTime && b.endTime
  );

  // Active appointments on this date (not cancelled)
  const existingAppointments = db.appointments.filter(
    (a) => a.date === dateStr && a.status !== 'cancelled'
  );

  const slots: TimeSlotAvailability[] = [];
  const isTargetToday = dateStr === todayStr;

  // Generate slots
  for (let startM = openMinutes; startM + duration <= closeMinutes; startM += interval) {
    const endM = startM + duration;
    const timeStr = minutesToTime(startM);
    const displayTime = formatTimeDisplay(timeStr);

    let isAvailable = true;
    let reason: string | undefined = undefined;
    let slotType: 'available' | 'passed' | 'booked' | 'blocked' = 'available';

    // Check if slot has already passed today (strict past time check)
    if (isTargetToday && startM <= currentMinutesToday) {
      isAvailable = false;
      reason = 'Time has already passed';
      slotType = 'passed';
    }

    // Check breaks
    if (isAvailable && dayConfig.breaks && dayConfig.breaks.length > 0) {
      for (const brk of dayConfig.breaks) {
        const breakStart = timeToMinutes(brk.start);
        const breakEnd = timeToMinutes(brk.end);
        if (Math.max(startM, breakStart) < Math.min(endM, breakEnd)) {
          isAvailable = false;
          reason = `Staff break: ${brk.label || 'Break'}`;
          slotType = 'blocked';
          break;
        }
      }
    }

    // Check partial blocks
    if (isAvailable && partialBlocks.length > 0) {
      for (const blk of partialBlocks) {
        const blkStart = timeToMinutes(blk.startTime!);
        const blkEnd = timeToMinutes(blk.endTime!);
        if (Math.max(startM, blkStart) < Math.min(endM, blkEnd)) {
          isAvailable = false;
          reason = blk.reason || 'Blocked period';
          slotType = 'blocked';
          break;
        }
      }
    }

    // Check existing appointments
    if (isAvailable && existingAppointments.length > 0) {
      for (const appt of existingAppointments) {
        const apptStart = timeToMinutes(appt.time);
        const apptEnd = timeToMinutes(appt.endTime || minutesToTime(apptStart + appt.serviceDuration));
        if (Math.max(startM, apptStart) < Math.min(endM, apptEnd)) {
          isAvailable = false;
          reason = 'Slot is already booked';
          slotType = 'booked';
          break;
        }
      }
    }

    slots.push({
      time: timeStr,
      displayTime,
      isAvailable,
      reason,
      slotType
    });
  }

  return {
    date: dateStr,
    isOpen: true,
    openTime: dayConfig.openTime,
    closeTime: dayConfig.closeTime,
    slots
  };
}

export async function createBooking(data: {
  customerId?: string;
  serviceId: string;
  date: string;
  time: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  stylistId?: string;
  stylistName?: string;
  notes?: string;
}): Promise<Appointment> {
  const db = await getDb();

  // Validate service
  const service = db.services.find((s) => s.id === data.serviceId && s.isActive);
  if (!service) {
    throw new Error('Service is not available.');
  }

  // Atomic check availability
  const availability = await checkSlotAvailability(data.date, data.serviceId);
  if (!availability.isOpen) {
    throw new Error(availability.message || 'Salon is closed on this date.');
  }

  const requestedSlot = availability.slots.find((s) => s.time === data.time);
  if (!requestedSlot || !requestedSlot.isAvailable) {
    throw new Error(requestedSlot?.reason || 'Selected time slot is no longer available. Please pick another.');
  }

  // Calculate end time
  const startMinutes = timeToMinutes(data.time);
  const endMinutes = startMinutes + service.durationMinutes;
  const endTimeStr = minutesToTime(endMinutes);

  // Resolve stylist if selected
  let resolvedStylistId = data.stylistId || undefined;
  let resolvedStylistName = data.stylistName || undefined;
  if (resolvedStylistId && !resolvedStylistName && db.staff) {
    const staffMatch = db.staff.find((st) => st.id === resolvedStylistId);
    if (staffMatch) resolvedStylistName = staffMatch.name;
  }

  // Find or link customer (strictly preventing duplicate accounts)
  const cleanPhone = data.customerPhone.trim();
  const cleanEmail = data.customerEmail ? data.customerEmail.trim().toLowerCase() : '';
  let customer: Customer | undefined;

  if (data.customerId) {
    customer = db.customers.find((c) => c.id === data.customerId);
  }
  if (!customer) {
    customer = db.customers.find((c) => {
      const emailMatch = cleanEmail && c.email && c.email.trim().toLowerCase() === cleanEmail;
      const phoneMatch = cleanPhone && c.phone.replace(/\D/g, '') === cleanPhone.replace(/\D/g, '');
      return emailMatch || phoneMatch;
    });
  }

  if (!customer) {
    customer = {
      id: data.customerId || `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: data.customerName.trim(),
      phone: cleanPhone,
      email: data.customerEmail?.trim(),
      notes: '',
      totalBookings: 1,
      lastBookingDate: data.date,
      createdAt: new Date().toISOString(),
      isRegistered: Boolean(data.customerId),
      isVerified: Boolean(data.customerId)
    };
    db.customers.push(customer);
  } else {
    // If authenticated customerId was passed, ensure the customer record adopts this stable ID
    if (data.customerId && customer.id !== data.customerId) {
      const prevId = customer.id;
      customer.id = data.customerId;
      customer.isRegistered = true;
      customer.isVerified = true;
      db.appointments.forEach((a) => {
        if (a.customerId === prevId) a.customerId = data.customerId!;
      });
    }
    customer.name = data.customerName.trim();
    if (data.customerEmail && !customer.email) customer.email = data.customerEmail.trim();
    if (cleanPhone) customer.phone = cleanPhone;
    customer.totalBookings = (customer.totalBookings || 0) + 1;
    customer.lastBookingDate = data.date;
  }

  // Generate Booking Reference Number
  const dateFormatted = data.date.replace(/-/g, '').slice(0, 6); // YYYYMM
  const count = db.appointments.length + 1;
  const bookingNumber = `BB-${dateFormatted}-${String(count).padStart(3, '0')}`;

  const initialStatus = db.settings.autoConfirmBookings ? 'confirmed' : 'pending';

  const newAppointment: Appointment = {
    id: `appt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    bookingNumber,
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerEmail: data.customerEmail?.trim() || customer.email,
    serviceId: service.id,
    serviceName: service.name,
    servicePrice: service.price,
    serviceDuration: service.durationMinutes,
    date: data.date,
    time: data.time,
    endTime: endTimeStr,
    status: initialStatus,
    stylistId: resolvedStylistId,
    stylistName: resolvedStylistName || 'Any Available Specialist',
    notes: data.notes?.trim() || '',
    internalNotes: '',
    createdAtIST: new Date().toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }) + ' IST',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.appointments.push(newAppointment);

  // Create notification log entry
  const notifMsg = `B&B Family Salon: Booking ${bookingNumber} for ${service.name} on ${data.date} at ${formatTimeDisplay(data.time)} is ${initialStatus}. Address: 2nd Floor, Ultimate Arcade, Kolar Road, Bhopal. Help: +91 91316 29031`;

  const newNotification: NotificationLog = {
    id: `notif_${Date.now()}`,
    appointmentId: newAppointment.id,
    eventType: initialStatus === 'confirmed' ? 'booking_confirmed' : 'booking_created',
    recipientPhone: customer.phone,
    recipientEmail: customer.email,
    message: notifMsg,
    status: 'simulated_ready',
    provider: 'WhatsApp',
    createdAt: new Date().toISOString()
  };

  db.notificationsLog.push(newNotification);

  // 1. Sync customer profile to Supabase persistent table
  try {
    const custSyncResult = await syncCustomerToSupabase(customer);
    if (!custSyncResult.synced) {
      console.warn(`[Supabase Customer Sync Warning]:`, custSyncResult.error);
    }
  } catch (custErr: any) {
    console.warn(`[Supabase Customer Sync Exception]:`, custErr?.message);
  }

  // 2. Sync appointment to Supabase persistent table BEFORE proceeding
  const apptSyncResult = await syncAppointmentToSupabase(newAppointment);
  if (!apptSyncResult.synced) {
    console.error(`[Supabase Persistent Booking Error]: Failed to commit appointment ${newAppointment.bookingNumber} to Supabase:`, apptSyncResult.error);
    // Rollback unpersisted appointment from local db to maintain absolute consistency
    db.appointments = db.appointments.filter((a) => a.id !== newAppointment.id);
    await saveDb(db);
    throw new Error(`Booking could not be saved to persistent database: ${apptSyncResult.error || 'Write failed'}. Please retry.`);
  }

  console.log(`[Supabase] Appointment ${newAppointment.bookingNumber} successfully committed to persistent Supabase table '${apptSyncResult.table}'.`);

  return newAppointment;
}
