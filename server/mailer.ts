import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { Appointment, SiteSettings } from '../src/types/index.ts';

// Configurable SMTP / Gmail Transporter
let transporter: Transporter | null = null;
let lastConfigHash: string = '';

function formatTime12(timeStr?: string | null): string {
  if (!timeStr) return '';
  const trimmed = String(timeStr).trim();
  if (/[ap]m/i.test(trimmed)) return trimmed.replace(/\s*([ap]m)/i, ' $1').toUpperCase();
  const parts = trimmed.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (!isNaN(hours) && !isNaN(minutes)) {
      const period = hours >= 12 ? 'PM' : 'AM';
      const h12 = hours % 12 === 0 ? 12 : hours % 12;
      return `${h12}:${String(minutes).padStart(2, '0')} ${period}`;
    }
  }
  return trimmed;
}

function formatTimeRange12(startTime?: string | null, endTime?: string | null): string {
  const start = formatTime12(startTime);
  const end = formatTime12(endTime);
  if (start && end && start !== end) return `${start} - ${end}`;
  return start || end || '';
}

function formatDateIST(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const trimmed = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      const [y, m, d] = trimmed.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d, 12, 0, 0);
      return dateObj.toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' });
    }
  } catch {}
  return String(dateStr);
}

export function resetTransporter(): void {
  transporter = null;
  lastConfigHash = '';
}

export function getTransporter(settings?: SiteSettings): { transport: Transporter; isLiveSmtp: boolean; user?: string } {
  const rawUser = (
    settings?.gmailUser ||
    (settings?.email && settings.email.toLowerCase().includes('@gmail.com') ? settings.email : '') ||
    process.env.GMAIL_USER ||
    process.env.EMAIL_USER ||
    ''
  ).trim();

  const rawPass = (
    settings?.gmailAppPassword ||
    process.env.GMAIL_APP_PASSWORD ||
    process.env.EMAIL_PASS ||
    process.env.GMAIL_PASSWORD ||
    ''
  ).trim();

  // Strip all whitespace from Google App Password (users often copy the 16-char code formatted with spaces like 'xxxx xxxx xxxx xxxx')
  const gmailPass = rawPass.replace(/\s+/g, '');
  const gmailUser = rawUser;

  const smtpHost = (process.env.SMTP_HOST || '').trim();
  const smtpPort = Number(process.env.SMTP_PORT || 587);

  const currentHash = `${gmailUser}:${gmailPass ? 'SET_' + gmailPass.length : 'NONE'}:${smtpHost}:${smtpPort}`;

  if (transporter && currentHash === lastConfigHash) {
    return {
      transport: transporter,
      isLiveSmtp: Boolean(gmailUser && gmailPass) || Boolean(smtpHost),
      user: gmailUser || undefined
    };
  }

  lastConfigHash = currentHash;

  if (gmailUser && gmailPass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailPass
      }
    });
    console.log(`[Mailer] Initialized Live Gmail SMTP transport with account: ${gmailUser}`);
    return { transport: transporter, isLiveSmtp: true, user: gmailUser };
  } else if (smtpHost) {
    transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || ''
      } : undefined
    });
    console.log(`[Mailer] Initialized custom SMTP transport: ${smtpHost}:${smtpPort}`);
    return { transport: transporter, isLiveSmtp: true, user: process.env.SMTP_USER };
  } else {
    // Development / Server sandbox fallback transporter
    transporter = nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true
    });
    console.log('[Mailer] Initialized stream transport (Sandbox mode - Live Gmail credentials not yet configured)');
    return { transport: transporter, isLiveSmtp: false };
  }
}

/**
 * Sends a real 6-digit verification OTP to the customer's Gmail address
 */
export async function sendGmailOtpEmail(
  toEmail: string,
  otpCode: string,
  customerName?: string,
  settings?: SiteSettings
): Promise<{ sent: boolean; messageId?: string; isLiveSmtp?: boolean; previewUrl?: string; error?: string }> {
  try {
    const { transport, isLiveSmtp, user: senderUser } = getTransporter(settings);
    const cleanEmail = toEmail.trim().toLowerCase();
    const displayName = customerName?.trim() || 'Valued Guest';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tassel Unisex Salon - Gmail Verification OTP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1C1B1A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F2; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="560" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E6D4BA; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
          <!-- Header -->
          <tr>
            <td style="background-color: #1C1B1A; padding: 25px 30px; text-align: center;">
              <h1 style="margin: 0; color: #C29F67; font-size: 22px; font-weight: 900; letter-spacing: 1.5px; text-transform: uppercase;">
                TASSEL UNISEX SALON
              </h1>
              <p style="margin: 5px 0 0; color: #E6D4BA; font-size: 11px; letter-spacing: 0.5px; text-transform: uppercase;">
                Premium Unisex Salon &amp; Beauty Sanctuary · Bhopal
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 35px 30px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; color: #1C1B1A; font-weight: 700;">
                Verify Your Gmail Address
              </h2>
              <p style="margin: 0 0 20px; font-size: 14px; color: #79746D; line-height: 1.6;">
                Hello <strong>${displayName}</strong>,<br>
                Please use the following 6-digit One-Time Password (OTP) to confirm that <strong>${cleanEmail}</strong> is your personal Gmail address and authorize your account:
              </p>

              <!-- OTP Box -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                <tr>
                  <td align="center" style="background-color: #FAF7F2; border: 2px dashed #C29F67; border-radius: 12px; padding: 20px;">
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 900; color: #1C1B1A; letter-spacing: 8px;">
                      ${otpCode}
                    </span>
                    <p style="margin: 8px 0 0; font-size: 12px; color: #9C753D; font-weight: 600;">
                      ⏱ Valid for 5 minutes only · Do not share this code
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 10px; font-size: 13px; color: #79746D; line-height: 1.5;">
                Once verified, you will be granted access to reserve appointments with live real-time synchronization, auto-filled details, and direct confirmation receipts delivered to this Gmail.
              </p>
              <p style="margin: 0; font-size: 12px; color: #A8A29E; line-height: 1.4;">
                If you did not request this verification, please safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F2; padding: 20px 30px; border-top: 1px solid #E6D4BA; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #79746D;">
                <strong>Tassel Unisex Salon</strong> · Kolar Road, Good Shapard Kalan, Mandakini Colony, Bhopal<br>
                Direct Support &amp; Queries: <a href="tel:+917880086990" style="color: #9C753D; text-decoration: none; font-weight: 600;">+91 78800 86990</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const senderAddress = senderUser || (settings?.email || process.env.GMAIL_USER || 'no-reply@tasselunisexsalon.com');

    const info = await transport.sendMail({
      from: `"Tassel Unisex Salon" <${senderAddress}>`,
      to: cleanEmail,
      subject: `Your Tassel Unisex Salon Gmail Verification OTP: ${otpCode}`,
      text: `Hello ${displayName},\n\nYour 6-digit Gmail verification OTP for Tassel Unisex Salon is: ${otpCode}\n\nThis code is valid for 5 minutes. Do not share this code with anyone.\n\nSalon Address: Kolar Road, Good Shapard Kalan, Mandakini Colony, Bhopal\nPhone: +91 78800 86990`,
      html: htmlContent
    });

    console.log(`[Mailer] OTP email dispatched to ${cleanEmail}. Live SMTP: ${isLiveSmtp}. MessageId: ${info.messageId || 'streamed'}`);
    return { sent: true, messageId: info.messageId, isLiveSmtp };
  } catch (err: any) {
    console.error(`[Mailer Error] Failed to send OTP email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Sends a high-fidelity Booking Appointment Card email directly to the customer's login Gmail ID
 */
export async function sendBookingCardEmail(
  toEmail: string,
  appointment: Appointment,
  settings?: SiteSettings
): Promise<{ sent: boolean; messageId?: string; isLiveSmtp?: boolean; error?: string }> {
  try {
    const { transport, isLiveSmtp, user: senderUser } = getTransporter(settings);
    const cleanEmail = toEmail.trim().toLowerCase();
    const salonName = settings?.salonName || 'Tassel Unisex Salon';
    const salonPhone = settings?.phone || '+91 78800 86990';
    const salonAddress = settings?.address || 'Kolar Road, Good Shapard Kalan, Mandakini Colony';
    const salonCity = settings?.city || 'Bhopal';
    const salonLandmarks = settings?.landmarks || 'Mandakini Colony, Kolar Road';

    const mapsUrl = settings?.googleMapsUrl ||
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salonName + ' ' + salonAddress + ' ' + salonCity)}`;

    const isPending = appointment.status === 'pending';
    const isConfirmed = appointment.status === 'confirmed';
    const isPostponed = appointment.status === 'postponed';

    const bannerText = isPending
      ? '⏳ APPOINTMENT REQUEST PENDING'
      : isPostponed
      ? '⏳ APPOINTMENT POSTPONED'
      : isConfirmed
      ? '✓ APPOINTMENT CONFIRMED'
      : `APPOINTMENT ${appointment.status.toUpperCase()}`;

    const badgeColor = isPending
      ? '#F59E0B'
      : isPostponed
      ? '#8B5CF6'
      : isConfirmed
      ? '#10B981'
      : '#6B7280';

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${isPending ? 'Appointment Request' : 'Appointment Confirmation'} - ${appointment.bookingNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1C1B1A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F2; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E6D4BA; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #1C1B1A; padding: 30px; text-align: center;">
              <span style="display: inline-block; background-color: rgba(194, 159, 103, 0.2); color: #C29F67; border: 1px solid #C29F67; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">
                ${bannerText}
              </span>
              <h1 style="margin: 8px 0 0; color: #FFFFFF; font-size: 24px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
                ${salonName}
              </h1>
              <p style="margin: 6px 0 0; color: #E6D4BA; font-size: 12px; letter-spacing: 0.5px;">
                Luxury Grooming &amp; Aesthetic Sanctuary · Bhopal
              </p>
            </td>
          </tr>

          <!-- Booking Reference Card -->
          <tr>
            <td style="padding: 30px 30px 20px;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #FAF7F2 0%, #F5EFE6 100%); border-radius: 12px; border: 1px solid #E6D4BA; padding: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #79746D; font-weight: 700;">
                      Booking Reference Number
                    </p>
                    <h2 style="margin: 4px 0 0; font-family: 'Courier New', Courier, monospace; font-size: 26px; color: #1C1B1A; font-weight: 900;">
                      ${appointment.bookingNumber}
                    </h2>
                  </td>
                  <td align="right">
                    <span style="background-color: ${badgeColor}; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 30px; text-transform: uppercase; letter-spacing: 0.5px;">
                      ${appointment.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              </table>

              ${isPending ? `
              <div style="background-color: #FEF3C7; border: 1px solid #F59E0B; border-radius: 8px; padding: 12px 16px; margin: 20px 0 10px; font-size: 13px; color: #92400E; line-height: 1.5;">
                <strong>⏳ Request Received:</strong> Your appointment request has been recorded and is currently awaiting staff confirmation. Our team will verify your slot and notify you once approved.
              </div>` : ''}

              <!-- Appointment Details -->
              <h3 style="margin: 25px 0 12px; font-size: 15px; color: #1C1B1A; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                Appointment Details
              </h3>

              <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size: 13px; border-collapse: collapse;">
                <tr style="border-bottom: 1px solid #FAF7F2;">
                  <td style="color: #79746D; width: 38%; padding: 10px 0;">Service Reserved</td>
                  <td style="color: #1C1B1A; font-weight: 700; padding: 10px 0;">${appointment.serviceName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #FAF7F2;">
                  <td style="color: #79746D; padding: 10px 0;">Preferred Stylist</td>
                  <td style="color: #9C753D; font-weight: 700; padding: 10px 0;">${appointment.stylistName || 'Any Available Specialist'}</td>
                </tr>
                <tr style="border-bottom: 1px solid #FAF7F2;">
                  <td style="color: #79746D; padding: 10px 0;">Date</td>
                  <td style="color: #1C1B1A; font-weight: 700; padding: 10px 0;">${appointment.date}</td>
                </tr>
                <tr style="border-bottom: 1px solid #FAF7F2;">
                  <td style="color: #79746D; padding: 10px 0;">Time Slot</td>
                  <td style="color: #1C1B1A; font-weight: 700; padding: 10px 0;">${appointment.time} (Duration: ${appointment.serviceDuration} mins)</td>
                </tr>
                <tr style="border-bottom: 1px solid #FAF7F2;">
                  <td style="color: #79746D; padding: 10px 0;">Total Amount</td>
                  <td style="color: #9C753D; font-weight: 800; font-size: 15px; padding: 10px 0;">₹${Math.round(appointment.servicePrice)}</td>
                </tr>
                <tr style="border-bottom: 1px solid #FAF7F2;">
                  <td style="color: #79746D; padding: 10px 0;">Guest Name</td>
                  <td style="color: #1C1B1A; font-weight: 600; padding: 10px 0;">${appointment.customerName}</td>
                </tr>
                <tr style="border-bottom: 1px solid #FAF7F2;">
                  <td style="color: #79746D; padding: 10px 0;">Registered Phone</td>
                  <td style="color: #1C1B1A; font-weight: 600; padding: 10px 0;">${appointment.customerPhone}</td>
                </tr>
                ${appointment.notes ? `
                <tr>
                  <td style="color: #79746D; padding: 10px 0;">Special Requests</td>
                  <td style="color: #1C1B1A; font-style: italic; padding: 10px 0;">"${appointment.notes}"</td>
                </tr>` : ''}
              </table>

              <!-- Venue / Address Card -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F2; border-radius: 12px; border: 1px solid #E6D4BA; margin: 25px 0 10px; padding: 18px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; text-transform: uppercase; color: #9C753D; font-weight: 800; letter-spacing: 0.5px;">
                      📍 Salon Sanctuary Location
                    </p>
                    <p style="margin: 6px 0 0; font-size: 13px; color: #1C1B1A; font-weight: 600; line-height: 1.5;">
                      ${salonAddress}<br>
                      <span style="color: #79746D; font-weight: normal;">Landmark: ${salonLandmarks}, ${salonCity}</span>
                    </p>
                    <div style="margin-top: 12px;">
                      <a href="${mapsUrl}" target="_blank" style="display: inline-block; background-color: #1C1B1A; color: #FFFFFF; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 8px 16px; border-radius: 6px; text-decoration: none;">
                        Open in Google Maps &rarr;
                      </a>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F2; padding: 25px 30px; border-top: 1px solid #E6D4BA; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 12px; color: #1C1B1A; font-weight: 700;">
                Questions or Need to Reschedule?
              </p>
              <p style="margin: 0; font-size: 12px; color: #79746D;">
                Call us at <a href="tel:${salonPhone.replace(/[^0-9+]/g, '')}" style="color: #9C753D; text-decoration: none; font-weight: 700;">${salonPhone}</a> or show this digital card upon arrival at the salon reception desk.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const senderAddress = senderUser || (settings?.email || process.env.GMAIL_USER || 'appointments@tasselunisexsalon.com');
    const replyAddress = (settings?.email || senderAddress).trim();

    const emailSubject = isPending
      ? `Appointment Request Received (Pending): ${appointment.serviceName} (#${appointment.bookingNumber}) - ${salonName}`
      : isPostponed
      ? `Appointment Postponed: ${appointment.serviceName} (#${appointment.bookingNumber}) - ${salonName}`
      : `Booking Confirmed: ${appointment.serviceName} (#${appointment.bookingNumber}) - ${salonName}`;

    const emailText = isPending
      ? `Appointment Request Received (Pending Confirmation)\n\nBooking Reference: ${appointment.bookingNumber}\nService: ${appointment.serviceName}\nDate: ${appointment.date}\nTime: ${appointment.time}\nAmount: ₹${appointment.servicePrice}\nStatus: PENDING SALON CONFIRMATION\n\nYour appointment request has been received by ${salonName} and is currently awaiting staff confirmation. You will receive a confirmation update once approved.\n\nVenue: ${salonAddress} (${salonLandmarks}), ${salonCity}\nContact: ${salonPhone}\n\nThank you for choosing ${salonName}!`
      : isPostponed
      ? `Appointment Postponed\n\nBooking Reference: ${appointment.bookingNumber}\nService: ${appointment.serviceName}\nRevised Date: ${appointment.date}\nRevised Time: ${appointment.time}\nAmount: ₹${appointment.servicePrice}\nStatus: POSTPONED\n\nYour appointment has been postponed. Please review your revised schedule above.\n\nVenue: ${salonAddress} (${salonLandmarks}), ${salonCity}\nContact: ${salonPhone}`
      : `Appointment Confirmed!\n\nBooking Reference: ${appointment.bookingNumber}\nService: ${appointment.serviceName}\nDate: ${appointment.date}\nTime: ${appointment.time}\nAmount: ₹${appointment.servicePrice}\nStatus: CONFIRMED\n\nVenue: ${salonAddress} (${salonLandmarks}), ${salonCity}\nContact: ${salonPhone}\n\nThank you for choosing ${salonName}!`;

    const info = await transport.sendMail({
      from: `"${salonName}" <${senderAddress}>`,
      to: cleanEmail,
      replyTo: replyAddress,
      subject: emailSubject,
      text: emailText,
      html: htmlContent
    });

    console.log(`[Mailer] Booking Confirmation Card sent to ${cleanEmail} for appointment ${appointment.bookingNumber}. Live SMTP: ${isLiveSmtp}. MessageId: ${info.messageId || 'streamed'}`);
    return { sent: true, messageId: info.messageId, isLiveSmtp };
  } catch (err: any) {
    console.error(`[Mailer Error] Failed to send Booking Card email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Tests Gmail SMTP delivery by dispatching a test message
 */
export async function testGmailDelivery(
  targetEmail: string,
  settings?: SiteSettings
): Promise<{ success: boolean; message: string; isLiveSmtp: boolean; messageId?: string }> {
  try {
    const { transport, isLiveSmtp, user: senderUser } = getTransporter(settings);
    const cleanEmail = targetEmail.trim().toLowerCase();
    const sender = senderUser || (settings?.email || 'admin@tasselunisexsalon.com');

    const info = await transport.sendMail({
      from: `"Tassel Unisex Salon - Test" <${sender}>`,
      to: cleanEmail,
      subject: `Tassel Unisex Salon - Gmail SMTP Connection Test`,
      text: `Congratulations! Your Gmail SMTP integration is working successfully. Outbound OTPs and Appointment Confirmation Cards will be delivered directly from this account.`,
      html: `<div style="font-family:sans-serif;padding:20px;background:#FAF7F2;border-radius:12px;border:1px solid #E6D4BA;"><h2 style="color:#1C1B1A;">✓ Gmail SMTP Test Successful</h2><p style="color:#79746D;">Your Gmail credentials are authenticated and connected. OTP codes and appointment booking confirmation cards are ready for delivery.</p></div>`
    });

    return {
      success: true,
      isLiveSmtp,
      messageId: info.messageId,
      message: isLiveSmtp
        ? `Test email dispatched to ${cleanEmail} via Gmail SMTP (Message ID: ${info.messageId})`
        : `Simulated test email sent via Stream sandbox (Configure Gmail App Password for live inboxes)`
    };
  } catch (err: any) {
    return {
      success: false,
      isLiveSmtp: false,
      message: `SMTP Test Failed: ${err.message}`
    };
  }
}

/**
 * Sends a high-priority Booking Notification email directly to the Administrator's email address
 */
export async function sendAdminBookingAlertEmail(
  adminEmail: string,
  appointment: Appointment,
  settings?: SiteSettings
): Promise<{ sent: boolean; messageId?: string; isLiveSmtp?: boolean; error?: string }> {
  try {
    const { transport, isLiveSmtp, user: senderUser } = getTransporter(settings);
    const cleanAdminEmail = adminEmail.trim().toLowerCase();
    const senderAddress = senderUser || (settings?.email || process.env.GMAIL_USER || 'admin@tasselunisexsalon.com');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Customer Booking Alert - ${appointment.bookingNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1C1B1A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 25px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 14px; border: 1px solid #E6D4BA; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color: #1C1B1A; padding: 22px 25px; text-align: left;">
              <span style="display: inline-block; background-color: rgba(194, 159, 103, 0.25); color: #E6D4BA; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                🔔 NEW CUSTOMER BOOKING
              </span>
              <h1 style="margin: 8px 0 0; color: #C29F67; font-size: 20px; font-weight: 900; letter-spacing: 0.5px;">
                B&amp;B Family Salon · Admin Alert
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #1C1B1A; line-height: 1.5;">
                A new appointment has just been reserved on your website by customer <strong>${appointment.customerName}</strong>.
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size: 13px; background-color: #FAF7F2; border-radius: 10px; border: 1px solid #E6D4BA; border-collapse: collapse;">
                <tr><td style="color: #79746D; width: 35%; border-bottom: 1px solid #E6D4BA; padding: 8px;">Booking Number</td><td style="font-weight: 800; font-family: monospace; font-size: 14px; border-bottom: 1px solid #E6D4BA; padding: 8px;">${appointment.bookingNumber}</td></tr>
                <tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Service Reserved</td><td style="font-weight: 700; color: #1C1B1A; border-bottom: 1px solid #E6D4BA; padding: 8px;">${appointment.serviceName}</td></tr>
                <tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Selected Stylist</td><td style="font-weight: 700; color: #9C753D; border-bottom: 1px solid #E6D4BA; padding: 8px;">${appointment.stylistName || 'Any Available Specialist'}</td></tr>
                <tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Date &amp; Time</td><td style="font-weight: 700; border-bottom: 1px solid #E6D4BA; padding: 8px;">${formatDateIST(appointment.date)} at ${formatTimeRange12(appointment.time, appointment.endTime)} (${appointment.serviceDuration} mins)</td></tr>
                <tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Customer Name</td><td style="font-weight: 700; border-bottom: 1px solid #E6D4BA; padding: 8px;">${appointment.customerName}</td></tr>
                <tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Customer Phone</td><td style="font-weight: 700; border-bottom: 1px solid #E6D4BA; padding: 8px;"><a href="tel:${appointment.customerPhone}" style="color: #9C753D; text-decoration: none;">${appointment.customerPhone}</a></td></tr>
                ${appointment.customerEmail ? `<tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Customer Gmail</td><td style="border-bottom: 1px solid #E6D4BA; padding: 8px;">${appointment.customerEmail}</td></tr>` : ''}
                <tr><td style="color: #79746D; padding: 8px;">Total Bill</td><td style="font-weight: 800; color: #10B981; font-size: 14px; padding: 8px;">₹${appointment.servicePrice}</td></tr>
                ${appointment.notes ? `<tr><td style="color: #79746D; padding: 8px;">Special Requests</td><td style="font-style: italic; padding: 8px;">"${appointment.notes}"</td></tr>` : ''}
              </table>
              <p style="margin: 20px 0 0; font-size: 12px; color: #79746D; line-height: 1.4;">
                This appointment has been safely recorded in your Salon Management Database &amp; Supabase Cloud. Log in to your Admin Console at any time to manage staff assignments or reschedule.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const info = await transport.sendMail({
      from: `"Tassel Unisex Salon - Bookings" <${senderAddress}>`,
      to: cleanAdminEmail,
      subject: `🔔 New Booking #${appointment.bookingNumber}: ${appointment.customerName} (${appointment.serviceName})`,
      text: `New Booking Received!\n\nBooking Reference: ${appointment.bookingNumber}\nCustomer: ${appointment.customerName} (${appointment.customerPhone})\nService: ${appointment.serviceName}\nStylist: ${appointment.stylistName || 'Any Available'}\nDate & Time: ${formatDateIST(appointment.date)} at ${formatTimeRange12(appointment.time, appointment.endTime)}\nAmount: ₹${appointment.servicePrice}\nNotes: ${appointment.notes || 'None'}`,
      html: htmlContent
    });

    console.log(`[Mailer] Admin Booking Alert dispatched to ${cleanAdminEmail} for #${appointment.bookingNumber}. Live SMTP: ${isLiveSmtp}. MessageId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId, isLiveSmtp };
  } catch (err: any) {
    console.error(`[Mailer Error] Failed to send Admin Booking Alert to ${adminEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Sends a real status change notification email to customer (Confirmation, Cancellation, Rejection, Reschedule)
 */
export async function sendBookingStatusUpdateEmail(
  toEmail: string,
  appointment: Appointment,
  statusType: 'confirmed' | 'cancelled' | 'rejected' | 'rescheduled' | 'postponed',
  reason?: string,
  settings?: SiteSettings
): Promise<{ sent: boolean; messageId?: string; isLiveSmtp?: boolean; error?: string }> {
  try {
    const { transport, isLiveSmtp, user: senderUser } = getTransporter(settings);
    const cleanEmail = toEmail.trim().toLowerCase();
    const salonName = settings?.salonName || 'Tassel Unisex Salon';
    const salonPhone = settings?.phone || '+91 78800 86990';
    const salonAddress = settings?.address || 'Kolar Road, Good Shapard Kalan, Mandakini Colony, Bhopal';
    const senderAddress = senderUser || (settings?.email || process.env.GMAIL_USER || 'appointments@tasselunisexsalon.com');

    let badgeText = 'APPOINTMENT UPDATE';
    let badgeBg = '#10B981';
    let titleText = 'Booking Status Update';
    let subjectLine = `Appointment Update: ${appointment.serviceName} (#${appointment.bookingNumber}) - ${salonName}`;
    let introMessage = `Here is an update regarding your appointment at ${salonName}.`;

    if (statusType === 'confirmed') {
      badgeText = '✓ CONFIRMED';
      badgeBg = '#10B981';
      titleText = 'Appointment Confirmed';
      subjectLine = `Booking Confirmed: ${appointment.serviceName} (#${appointment.bookingNumber}) - ${salonName}`;
      introMessage = `Great news! Your booking has been confirmed by our salon team. We look forward to welcoming you.`;
    } else if (statusType === 'postponed') {
      badgeText = 'POSTPONED';
      badgeBg = '#8B5CF6';
      titleText = 'Appointment Postponed';
      subjectLine = `Appointment Postponed: ${appointment.serviceName} (#${appointment.bookingNumber}) - ${salonName}`;
      introMessage = `Please note that your appointment at ${salonName} has been postponed. Please review your revised schedule below:`;
    } else if (statusType === 'cancelled') {
      badgeText = 'CANCELLED';
      badgeBg = '#EF4444';
      titleText = 'Booking Cancelled';
      subjectLine = `Booking Cancelled: ${appointment.serviceName} (#${appointment.bookingNumber}) - ${salonName}`;
      introMessage = `Your appointment reservation has been cancelled and the reserved time slot has been released.`;
    } else if (statusType === 'rejected') {
      badgeText = 'DECLINED / REJECTED';
      badgeBg = '#DC2626';
      titleText = 'Booking Request Declined';
      subjectLine = `Booking Request Update: ${appointment.serviceName} (#${appointment.bookingNumber}) - ${salonName}`;
      introMessage = `We regret to inform you that your booking request could not be accommodated at this time.`;
    } else if (statusType === 'rescheduled') {
      badgeText = 'RESCHEDULED';
      badgeBg = '#8B5CF6';
      titleText = 'Appointment Rescheduled';
      subjectLine = `Appointment Rescheduled: ${appointment.serviceName} (#${appointment.bookingNumber}) - ${salonName}`;
      introMessage = `Your appointment schedule has been updated. Please find your revised timing details below.`;
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titleText} - ${appointment.bookingNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1C1B1A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 30px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E6D4BA; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color: #1C1B1A; padding: 28px; text-align: center;">
              <span style="display: inline-block; background-color: ${badgeBg}; color: #FFFFFF; padding: 4px 14px; border-radius: 20px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">
                ${badgeText}
              </span>
              <h1 style="margin: 10px 0 0; color: #C29F67; font-size: 22px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">
                ${salonName}
              </h1>
              <p style="margin: 4px 0 0; color: #E6D4BA; font-size: 11px;">
                Premium Unisex Salon &amp; Aesthetic Sanctuary · Bhopal
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 28px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #1C1B1A; line-height: 1.5;">
                Dear <strong>${appointment.customerName}</strong>,<br><br>
                ${introMessage}
              </p>

              <table width="100%" border="0" cellspacing="0" cellpadding="8" style="background-color: #FAF7F2; border-radius: 12px; border: 1px solid #E6D4BA; font-size: 13px; margin: 20px 0; border-collapse: collapse;">
                <tr><td style="color: #79746D; width: 38%; padding: 10px; border-bottom: 1px solid #E6D4BA;">Booking Ref</td><td style="font-weight: 800; font-family: monospace; font-size: 14px; padding: 10px; border-bottom: 1px solid #E6D4BA;">${appointment.bookingNumber}</td></tr>
                <tr><td style="color: #79746D; padding: 10px; border-bottom: 1px solid #E6D4BA;">Service</td><td style="font-weight: 700; color: #1C1B1A; padding: 10px; border-bottom: 1px solid #E6D4BA;">${appointment.serviceName}</td></tr>
                <tr><td style="color: #79746D; padding: 10px; border-bottom: 1px solid #E6D4BA;">Stylist / Specialist</td><td style="font-weight: 700; color: #9C753D; padding: 10px; border-bottom: 1px solid #E6D4BA;">${appointment.stylistName || 'Any Available Specialist'}</td></tr>
                <tr><td style="color: #79746D; padding: 10px; border-bottom: 1px solid #E6D4BA;">Date &amp; Time</td><td style="font-weight: 700; padding: 10px; border-bottom: 1px solid #E6D4BA;">${formatDateIST(appointment.date)} at ${formatTimeRange12(appointment.time, appointment.endTime)}</td></tr>
                <tr><td style="color: #79746D; padding: 10px; border-bottom: 1px solid #E6D4BA;">Status</td><td style="padding: 10px; border-bottom: 1px solid #E6D4BA;"><strong style="text-transform: uppercase; color: ${badgeBg};">${statusType.toUpperCase()}</strong></td></tr>
                ${reason ? `<tr><td style="color: #79746D; padding: 10px; border-bottom: 1px solid #E6D4BA;">Reason / Note</td><td style="font-style: italic; color: #1C1B1A; padding: 10px; border-bottom: 1px solid #E6D4BA;">"${reason}"</td></tr>` : ''}
                <tr><td style="color: #79746D; padding: 10px;">Amount</td><td style="font-weight: 800; color: #9C753D; padding: 10px;">₹${appointment.servicePrice}</td></tr>
              </table>

              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #FAF7F2; border-radius: 10px; border: 1px solid #E6D4BA; padding: 14px; margin-top: 20px;">
                <tr>
                  <td>
                    <p style="margin: 0; font-size: 11px; font-weight: 700; text-transform: uppercase; color: #9C753D;">📍 Venue &amp; Support</p>
                    <p style="margin: 4px 0 0; font-size: 12px; color: #1C1B1A; line-height: 1.4;">
                      ${salonAddress}<br>
                      Phone / WhatsApp: <a href="tel:${salonPhone.replace(/[^0-9+]/g, '')}" style="color: #9C753D; font-weight: bold; text-decoration: none;">${salonPhone}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color: #FAF7F2; padding: 18px 25px; border-top: 1px solid #E6D4BA; text-align: center; font-size: 11px; color: #79746D;">
              Thank you for choosing ${salonName}. If you have questions, please reach out via phone or WhatsApp.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const info = await transport.sendMail({
      from: `"${salonName}" <${senderAddress}>`,
      to: cleanEmail,
      subject: subjectLine,
      text: `${titleText}\n\nBooking: ${appointment.bookingNumber}\nService: ${appointment.serviceName}\nDate/Time: ${formatDateIST(appointment.date)} at ${formatTimeRange12(appointment.time, appointment.endTime)}\nStatus: ${statusType.toUpperCase()}\n${reason ? `Note: ${reason}\n` : ''}\nVenue: ${salonAddress}\nContact: ${salonPhone}`,
      html: htmlContent
    });

    console.log(`[Mailer] Status update (${statusType}) sent to customer ${cleanEmail} for #${appointment.bookingNumber}. Live: ${isLiveSmtp}. MsgId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId, isLiveSmtp };
  } catch (err: any) {
    console.error(`[Mailer Error] Failed to send status update email to ${toEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

/**
 * Sends a real-time event alert to the admin's email for any booking event
 */
export async function sendAdminBookingEventEmail(
  adminEmail: string,
  appointment: Appointment,
  eventType: 'new_booking' | 'confirmed' | 'cancelled' | 'rejected' | 'rescheduled',
  actor: string,
  reason?: string,
  settings?: SiteSettings
): Promise<{ sent: boolean; messageId?: string; isLiveSmtp?: boolean; error?: string }> {
  try {
    const { transport, isLiveSmtp, user: senderUser } = getTransporter(settings);
    const cleanAdminEmail = adminEmail.trim().toLowerCase();
    const senderAddress = senderUser || (settings?.email || process.env.GMAIL_USER || 'admin@tasselunisexsalon.com');

    let eventTitle = 'Booking Update Alert';
    let eventEmoji = '🔔';
    if (eventType === 'new_booking') {
      eventTitle = 'New Booking Created';
      eventEmoji = '✨';
    } else if (eventType === 'cancelled') {
      eventTitle = `Booking Cancelled (by ${actor})`;
      eventEmoji = '❌';
    } else if (eventType === 'confirmed') {
      eventTitle = 'Booking Confirmed';
      eventEmoji = '✓';
    } else if (eventType === 'rejected') {
      eventTitle = 'Booking Rejected';
      eventEmoji = '⛔';
    } else if (eventType === 'rescheduled') {
      eventTitle = 'Booking Rescheduled';
      eventEmoji = '📅';
    }

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${eventTitle} - #${appointment.bookingNumber}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1C1B1A;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="padding: 25px 15px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" border="0" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 14px; border: 1px solid #E6D4BA; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.06);">
          <tr>
            <td style="background-color: #1C1B1A; padding: 22px 25px; text-align: left;">
              <span style="display: inline-block; background-color: rgba(194, 159, 103, 0.25); color: #E6D4BA; padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase;">
                ${eventEmoji} ADMIN ALERT · ${eventType.toUpperCase()}
              </span>
              <h1 style="margin: 8px 0 0; color: #C29F67; font-size: 20px; font-weight: 900; letter-spacing: 0.5px;">
                ${eventTitle}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 25px;">
              <p style="margin: 0 0 16px; font-size: 14px; color: #1C1B1A; line-height: 1.5;">
                Event on booking <strong>#${appointment.bookingNumber}</strong> triggered by <strong>${actor}</strong>.
              </p>
              <table width="100%" border="0" cellspacing="0" cellpadding="8" style="font-size: 13px; background-color: #FAF7F2; border-radius: 10px; border: 1px solid #E6D4BA; border-collapse: collapse;">
                <tr><td style="color: #79746D; width: 35%; border-bottom: 1px solid #E6D4BA; padding: 8px;">Booking Number</td><td style="font-weight: 800; font-family: monospace; font-size: 14px; border-bottom: 1px solid #E6D4BA; padding: 8px;">${appointment.bookingNumber}</td></tr>
                <tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Service</td><td style="font-weight: 700; color: #1C1B1A; border-bottom: 1px solid #E6D4BA; padding: 8px;">${appointment.serviceName}</td></tr>
                <tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Customer</td><td style="font-weight: 700; border-bottom: 1px solid #E6D4BA; padding: 8px;">${appointment.customerName} (<a href="tel:${appointment.customerPhone}" style="color: #9C753D; text-decoration: none;">${appointment.customerPhone}</a>)</td></tr>
                ${appointment.customerEmail ? `<tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Customer Gmail</td><td style="border-bottom: 1px solid #E6D4BA; padding: 8px;">${appointment.customerEmail}</td></tr>` : ''}
                <tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Date &amp; Time</td><td style="font-weight: 700; border-bottom: 1px solid #E6D4BA; padding: 8px;">${formatDateIST(appointment.date)} at ${formatTimeRange12(appointment.time, appointment.endTime)}</td></tr>
                <tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Status</td><td style="font-weight: 700; text-transform: uppercase; border-bottom: 1px solid #E6D4BA; padding: 8px;">${appointment.status}</td></tr>
                ${reason ? `<tr><td style="color: #79746D; border-bottom: 1px solid #E6D4BA; padding: 8px;">Reason / Notes</td><td style="font-style: italic; border-bottom: 1px solid #E6D4BA; padding: 8px;">"${reason}"</td></tr>` : ''}
                <tr><td style="color: #79746D; padding: 8px;">Price</td><td style="font-weight: 800; color: #10B981; font-size: 14px; padding: 8px;">₹${appointment.servicePrice}</td></tr>
              </table>
              <p style="margin: 20px 0 0; font-size: 12px; color: #79746D; line-height: 1.4;">
                This update has been logged and synchronized with your Salon Management Database &amp; Supabase Cloud.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const info = await transport.sendMail({
      from: `"Tassel Unisex Salon - Admin Alerts" <${senderAddress}>`,
      to: cleanAdminEmail,
      subject: `${eventEmoji} ${eventTitle}: #${appointment.bookingNumber} - ${appointment.customerName}`,
      text: `${eventTitle}\n\nBooking: ${appointment.bookingNumber}\nCustomer: ${appointment.customerName} (${appointment.customerPhone})\nService: ${appointment.serviceName}\nSchedule: ${formatDateIST(appointment.date)} at ${formatTimeRange12(appointment.time, appointment.endTime)}\nStatus: ${appointment.status}\n${reason ? `Reason: ${reason}\n` : ''}Actor: ${actor}`,
      html: htmlContent
    });

    console.log(`[Mailer] Admin event alert (${eventType}) dispatched to ${cleanAdminEmail}. Live: ${isLiveSmtp}. MsgId: ${info.messageId}`);
    return { sent: true, messageId: info.messageId, isLiveSmtp };
  } catch (err: any) {
    console.error(`[Mailer Error] Failed to send admin event alert to ${adminEmail}:`, err.message);
    return { sent: false, error: err.message };
  }
}

