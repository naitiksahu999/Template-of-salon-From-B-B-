import { Appointment, SiteSettings } from '../types/index.ts';
import { formatTimeRange12, formatDateIST } from './timeFormat.ts';

export type WhatsAppCardType =
  | 'confirmed'
  | 'postponed'
  | 'rescheduled'
  | 'reminder'
  | 'completed'
  | 'cancelled'
  | 'pending'
  | 'general_update';

/**
 * Generates an official WhatsApp booking card message.
 * Uses bulletproof UTF-8 encoding and WhatsApp formatting with standard emojis
 * that display reliably across all mobile devices without converting to "?".
 */
export function generateWhatsAppBookingCard(
  appt: Appointment,
  settings: SiteSettings | null | undefined,
  cardType: WhatsAppCardType = 'general_update',
  customNote: string = ''
): string {
  const salonTitle = settings?.salonName || 'Tassel Unisex Salon';
  const salonPhone = settings?.phone || '+91 78800 86990';
  const salonAddress = settings?.address || 'Kolar Road, Good Shapard Kalan, Mandakini Colony, Bhopal';
  const salonLandmarks = settings?.landmarks || 'Mandakini Colony, Kolar Road';
  const mapsUrl = settings?.googleMapsUrl || 'https://www.google.co.in/maps/place/Tassel+Unisex+Salon,+Kolar+Rd,+Good+Shapard+Kalan,+Mandakini+Colony,+Kolar+Rd,+Bhopal,+Madhya+Pradesh+462042/@23.1823711,77.4175763,17z/';

  let titleHeader = `*${salonTitle.toUpperCase()} - BOOKING UPDATE*`;
  let badgeLabel = 'APPOINTMENT STATUS UPDATE';

  switch (cardType) {
    case 'confirmed':
      titleHeader = `✅ *${salonTitle.toUpperCase()} - BOOKING CONFIRMED* ✅`;
      badgeLabel = 'CONFIRMED & RESERVED';
      break;
    case 'postponed':
      titleHeader = `⏳ *${salonTitle.toUpperCase()} - APPOINTMENT POSTPONED* ⏳`;
      badgeLabel = 'APPOINTMENT POSTPONED';
      break;
    case 'rescheduled':
      titleHeader = `🗓️ *${salonTitle.toUpperCase()} - SCHEDULE RESCHEDULED* 🗓️`;
      badgeLabel = 'NEW TIME SLOT ALLOCATED';
      break;
    case 'reminder':
      titleHeader = `⏰ *${salonTitle.toUpperCase()} - APPOINTMENT REMINDER* ⏰`;
      badgeLabel = 'UPCOMING SALON VISIT';
      break;
    case 'completed':
      titleHeader = `✨ *${salonTitle.toUpperCase()} - THANK YOU FOR VISITING* ✨`;
      badgeLabel = 'SERVICE COMPLETED';
      break;
    case 'cancelled':
      titleHeader = `❌ *${salonTitle.toUpperCase()} - BOOKING CANCELLED* ❌`;
      badgeLabel = 'CANCELLED';
      break;
    case 'pending':
      titleHeader = `⏳ *${salonTitle.toUpperCase()} - BOOKING REQUEST RECEIVED* ⏳`;
      badgeLabel = 'PENDING SALON CONFIRMATION';
      break;
  }

  const divider = '----------------------------------------';

  const lines = [
    titleHeader,
    divider,
    `Hello *${appt.customerName}*,`,
    cardType === 'postponed'
      ? `Please note that your appointment has been postponed. Here are the updated details:`
      : cardType === 'pending'
      ? `We have received your appointment request. It is currently awaiting salon confirmation:`
      : `Here is the official update for your appointment:`,
    ``,
    `📋 *Booking ID:* #${appt.bookingNumber}`,
    `✂️ *Service:* ${appt.serviceName}`,
    `💰 *Price:* ₹${appt.servicePrice} (${appt.serviceDuration} mins)`,
    cardType === 'postponed' || cardType === 'rescheduled'
      ? `📅 *Revised Date:* ${formatDateIST(appt.date)}`
      : `📅 *Date:* ${formatDateIST(appt.date)}`,
    cardType === 'postponed' || cardType === 'rescheduled'
      ? `⏰ *Revised Time:* ${formatTimeRange12(appt.time, appt.endTime)}`
      : `⏰ *Time Slot:* ${formatTimeRange12(appt.time, appt.endTime)}`,
    `🏷️ *Status:* *${appt.status.toUpperCase()}* (${badgeLabel})`
  ];

  if (appt.cancellationReason && (cardType === 'postponed' || cardType === 'cancelled')) {
    lines.push(`📝 *Note/Reason:* "${appt.cancellationReason}"`);
  }

  if (appt.notes) {
    lines.push(`💬 *Your Special Request:* "${appt.notes}"`);
  }

  if (customNote && customNote.trim()) {
    lines.push(`📝 *Stylist Note:* ${customNote.trim()}`);
  }

  lines.push(
    ``,
    `📍 *Salon Sanctuary Location:*`,
    `${salonAddress}`,
    `Landmark: ${salonLandmarks}`,
    `🗺️ *Google Maps Route:* ${mapsUrl}`,
    `📞 *Reception Helpline:* ${salonPhone}`,
    ``,
    divider,
    `_Warm regards,_`,
    `*Management Team - ${salonTitle}*`,
    `_Sent directly via Admin WhatsApp Messenger_`
  );

  return lines.join('\n');
}

/**
 * Opens WhatsApp chat directly to the customer phone with encoded message.
 * Uses api.whatsapp.com/send to bypass 302 character corruption on some devices.
 */
export function openCustomerWhatsApp(
  customerPhone: string,
  message: string
): void {
  const cleanDigits = customerPhone.replace(/[^0-9]/g, '');
  const targetPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
  const encodedText = encodeURIComponent(message);
  const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;
  window.open(waUrl, '_blank');
}

/**
 * Opens WhatsApp chat to the salon admin.
 */
export function openAdminWhatsApp(
  adminPhone: string,
  message: string
): void {
  const cleanDigits = adminPhone.replace(/[^0-9]/g, '');
  const targetPhone = cleanDigits.length === 10 ? `91${cleanDigits}` : cleanDigits;
  const encodedText = encodeURIComponent(message);
  const waUrl = `https://api.whatsapp.com/send?phone=${targetPhone}&text=${encodedText}`;
  window.open(waUrl, '_blank');
}

/**
 * Customer Inquiry message template sent FROM customer TO admin
 */
export function generateCustomerInquiryWhatsAppMessage(
  appt: Appointment,
  settings: SiteSettings | null | undefined
): string {
  const salonTitle = settings?.salonName || 'Tassel Unisex Salon';
  return `Hello ${salonTitle}, I have booked appointment #${appt.bookingNumber} (${appt.serviceName}) on your website and would like to speak with the salon admin. Could you please assist me?`;
}
