import express, { type Request, type Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { getDb, saveDb, initDb } from './server/db.ts';
import { checkSlotAvailability, createBooking } from './server/bookingEngine.ts';
import {
  getSupabase,
  testSupabaseConnection,
  getSupabaseMigrationSql,
  syncAppointmentToSupabase,
  syncServicesToSupabase,
  syncBusinessHoursToSupabase,
  syncBlockedDatesToSupabase,
  syncSettingsToSupabase,
  syncCategoriesToSupabase,
  deleteAppointmentFromSupabase,
  clearAppointmentsFromSupabase,
  syncAdminNotificationToSupabase,
  fetchSupabaseAdminNotifications,
  markSupabaseNotificationRead,
  markAllSupabaseNotificationsRead,
  deleteSupabaseAdminNotification,
  deleteAllSupabaseAdminNotifications,
  recordAndDispatchAdminNotification,
  getSupabaseUpgradeSql,
  syncReviewToSupabase,
  deleteSupabaseReview,
  deleteCustomerFromSupabase,
  syncCustomerToSupabase,
  fetchSupabaseCustomers,
  fetchSupabaseAppointments
} from './server/supabase.ts';
import {
  sendGmailOtpEmail,
  sendBookingCardEmail,
  sendAdminBookingAlertEmail,
  sendBookingStatusUpdateEmail,
  sendAdminBookingEventEmail,
  testGmailDelivery,
  resetTransporter
} from './server/mailer.ts';
import { initMediaStorage, savePersistentMedia, getMediaFilePath, getAllStoredMedia, ensureMediaFileAvailable } from './server/mediaStorage.ts';
import {
  verifyCredentials,
  generateSessionToken,
  revokeSessionToken,
  requireAdminAuth,
  AuthenticatedRequest,
  createRealtimeOtp,
  verifyRealtimeOtp,
  generateCustomerSessionToken,
  validateCustomerSessionToken,
  revokeCustomerSessionToken,
  getCustomerFromRequest
} from './server/auth.ts';
import type { StaffMember, AdminNotification, Review, Customer } from './src/types/index.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT || 3000);

async function startServer() {
  await initDb();
  initMediaStorage();

  const app = express();
  app.use(express.json({ limit: '25mb' }));

  const rootDir = process.cwd();
  const publicDir = path.resolve(rootDir, 'public');
  const publicAssets = path.resolve(publicDir, 'assets');
  const publicAssetsImages = path.resolve(publicAssets, 'images');
  const uploadsDir = path.resolve(publicAssets, 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  // Serve static assets unconditionally BEFORE any middlewares
  app.use('/assets/uploads', express.static(uploadsDir));
  app.use('/assets/images', express.static(publicAssetsImages));
  app.use('/assets', express.static(publicAssets));
  app.use('/src/assets/images', express.static(publicAssetsImages));
  app.use('/public/assets/images', express.static(publicAssetsImages));

  // Direct image route fallback for rock-solid image delivery
  app.get('/assets/images/:filename', (req: Request, res: Response) => {
    const filename = path.basename(req.params.filename);
    const candidate1 = path.join(publicAssetsImages, filename);
    const candidate2 = path.resolve(rootDir, 'src/assets/images', filename);
    if (fs.existsSync(candidate1)) {
      res.sendFile(candidate1);
    } else if (fs.existsSync(candidate2)) {
      res.sendFile(candidate2);
    } else {
      res.status(404).send('Image not found');
    }
  });

  // Direct uploaded media route (Serves from public, restores from data/media_store, or recovers from Supabase cloud on-demand)
  app.get('/assets/uploads/:filename', async (req: Request, res: Response) => {
    try {
      const filename = path.basename(req.params.filename);
      const filePath = await ensureMediaFileAvailable(filename);
      if (filePath && fs.existsSync(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.sendFile(filePath);
      } else {
        const { filePath: fallbackPath } = getMediaFilePath(filename);
        if (fs.existsSync(fallbackPath)) {
          res.sendFile(fallbackPath);
        } else {
          res.status(404).send('Media file not found');
        }
      }
    } catch (err: any) {
      console.error('[Upload Serve Error]:', err);
      res.status(500).send('Error serving media');
    }
  });

  // ---------------------------------------------------------------------------
  // PUBLIC API ENDPOINTS
  // ---------------------------------------------------------------------------

  // Public Configuration & Contact details
  app.get('/api/public/config', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      res.json({
        settings: db.settings,
        salonName: db.settings.salonName,
        alternateName: db.settings.alternateName,
        tagline: db.settings.tagline,
        phone: db.settings.phone,
        email: db.settings.email,
        address: db.settings.address,
        landmarks: db.settings.landmarks,
        city: db.settings.city,
        state: db.settings.state,
        pincode: db.settings.pincode,
        googleMapsUrl: db.settings.googleMapsUrl,
        businessHours: db.businessHours || [],
        blockedDates: db.blockedDates || [],
        stats: {
          rating: 4.9,
          totalReviews: 120,
          location: 'Kolar Road, Bhopal'
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Blocked Dates / Holidays list for customer visibility
  app.get('/api/public/blocked-dates', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      res.json(db.blockedDates || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Business Operating Hours for customer visibility
  app.get('/api/public/business-hours', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      res.json(db.businessHours || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public State Sync (Ensures changes persist across container reboots)
  app.post('/api/public/sync-state', async (req: Request, res: Response) => {
    try {
      const { settings, adminUsers, services, businessHours, blockedDates } = req.body;
      const db = await getDb();
      let updated = false;

      if (settings && typeof settings === 'object') {
        db.settings = { ...db.settings, ...settings };
        updated = true;
      }

      if ((!db.adminUsers || db.adminUsers.length === 0) && Array.isArray(adminUsers) && adminUsers.length > 0) {
        db.adminUsers = adminUsers;
        updated = true;
      }

      if (Array.isArray(services) && services.length > 0) {
        services.forEach((s) => {
          const idx = db.services.findIndex((srv) => srv.id === s.id);
          if (idx !== -1) {
            db.services[idx] = { ...db.services[idx], ...s };
            updated = true;
          }
        });
      }

      if (Array.isArray(businessHours) && businessHours.length > 0) {
        db.businessHours = businessHours;
        updated = true;
      }

      if (Array.isArray(blockedDates)) {
        db.blockedDates = blockedDates;
        updated = true;
      }

      if (updated) {
        await saveDb(db);
      }

      res.json({
        success: true,
        isSetupCompleted: Array.isArray(db.adminUsers) && db.adminUsers.length > 0,
        settings: db.settings,
        businessHours: db.businessHours,
        blockedDates: db.blockedDates
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Categories
  app.get('/api/public/categories', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const sorted = [...db.categories].sort((a, b) => a.sortOrder - b.sortOrder);
      res.json(sorted);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Services
  app.get('/api/public/services', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const activeServices = db.services.filter((s) => s.isActive);
      res.json(activeServices);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Reviews (Only approved reviews appear publicly)
  app.get('/api/public/reviews', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const approvedReviews = (db.reviews || []).filter((r) => {
        if (r.status === 'approved') return true;
        if (!r.status && r.source !== 'Website Customer') return true;
        return false;
      });
      res.json(approvedReviews);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Submit Review endpoint (Used by website customers / visitors from the "Give your review" button)
  app.post('/api/public/reviews', async (req: Request, res: Response) => {
    try {
      const { authorName, rating, reviewText, phone, email, source } = req.body;
      if (!authorName || !String(authorName).trim()) {
        res.status(400).json({ error: 'Please enter your name.' });
        return;
      }
      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5) {
        res.status(400).json({ error: 'Please choose a rating between 1 and 5 stars.' });
        return;
      }
      if (!reviewText || !String(reviewText).trim()) {
        res.status(400).json({ error: 'Please write your review feedback.' });
        return;
      }

      // Check if logged in customer session exists
      const customer = getCustomerFromRequest(req);

      const db = await getDb();
      const newReview: Review = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        authorName: String(authorName).trim(),
        rating: Math.min(5, Math.max(1, Math.round(numRating))),
        reviewText: String(reviewText).trim(),
        reviewDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        source: source && String(source).trim() ? String(source).trim() : 'Website Customer',
        status: 'approved', // Show immediately on public website
        customerId: customer?.customerId || undefined,
        customerEmail: email || customer?.email || undefined,
        isVerified: Boolean(customer),
        isFeatured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.reviews = db.reviews || [];
      db.reviews.unshift(newReview);
      await saveDb(db);

      // Async sync to Supabase
      syncReviewToSupabase(newReview).catch((err) => {
        console.warn('[Supabase Sync Review Warning]:', err?.message);
      });

      // Notify admin
      db.adminNotifications = db.adminNotifications || [];
      db.adminNotifications.unshift({
        id: `notif_${Date.now()}`,
        type: 'general',
        title: 'New Review Received',
        message: `${newReview.authorName} left a ${newReview.rating}-star review: "${newReview.reviewText.substring(0, 50)}..."`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      res.status(201).json({ success: true, review: newReview });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Gallery
  app.get('/api/public/gallery', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      res.json(db.galleryItems);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Staff & Stylists
  app.get('/api/public/staff', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const activeStaff = (db.staff || []).filter((s) => s.isActive);
      res.json(activeStaff);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Live Slot Availability Check
  app.get('/api/public/availability', async (req: Request, res: Response) => {
    try {
      const date = req.query.date as string;
      const serviceId = req.query.serviceId as string;

      if (!date || !serviceId) {
        res.status(400).json({ error: 'date (YYYY-MM-DD) and serviceId query parameters are required.' });
        return;
      }

      const availability = await checkSlotAvailability(date, serviceId);
      res.json(availability);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Helper to resolve the single allotted email for salon booking notifications & updates
  function getAllottedBookingAlertEmail(db: any): string | null {
    // 1. Explicitly designated Booking Notification & Updates email
    if (db.settings.adminNotificationEmail && db.settings.adminNotificationEmail.trim()) {
      return db.settings.adminNotificationEmail.trim().toLowerCase();
    }
    // 2. Salon official contact email (if designated)
    if (db.settings.email && db.settings.email.trim()) {
      return db.settings.email.trim().toLowerCase();
    }
    // Note: Do NOT automatically send to admin registration email to maintain separation of roles!
    return null;
  }

  // Public Booking Submission (Atomic & Validated)
  app.post('/api/public/bookings', async (req: Request, res: Response) => {
    try {
      // Strictly prohibited: Booking is only allowed after signing up or logging in with Gmail
      const customerSession = getCustomerFromRequest(req);
      if (!customerSession) {
        res.status(401).json({
          error: 'Strictly Prohibited: You must sign up or log in with your verified Gmail account before booking an appointment. Please sign in to continue.'
        });
        return;
      }

      const { serviceId, date, time, customerName, customerPhone, customerEmail, stylistId, stylistName, notes } = req.body;

      if (!serviceId || !date || !time) {
        res.status(400).json({ error: 'Please provide all required fields: service, date, and time.' });
        return;
      }

      // Automatically use verified customer credentials from their active login session
      const verifiedName = (customerSession.name || customerName || '').trim();
      const verifiedPhone = (customerSession.phone || customerPhone || '').trim();
      const verifiedEmail = (customerSession.email || customerEmail || '').trim().toLowerCase();

      if (!verifiedName || !verifiedPhone) {
        res.status(400).json({ error: 'Customer name and phone number are required from your registered account.' });
        return;
      }

      // Valid phone check (at least 10 digits)
      const phoneDigits = verifiedPhone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        res.status(400).json({ error: 'Please provide a valid 10-digit mobile number.' });
        return;
      }

      const appointment = await createBooking({
        customerId: customerSession.customerId,
        serviceId,
        date,
        time,
        customerName: verifiedName,
        customerPhone: verifiedPhone,
        customerEmail: verifiedEmail,
        stylistId,
        stylistName,
        notes
      });

      // Automatically send Booking Card Email directly to customer's login Gmail ID
      const db = await getDb();
      let emailResult = { sent: false, isLiveSmtp: false, messageId: '', error: '' };
      const recipientEmail = (verifiedEmail || appointment.customerEmail || customerEmail || req.body?.email || req.body?.customerEmail || '').trim().toLowerCase();
      if (recipientEmail) {
        try {
          const resEmail = await sendBookingCardEmail(recipientEmail, appointment, db.settings);
          emailResult = {
            sent: Boolean(resEmail.sent),
            isLiveSmtp: Boolean(resEmail.isLiveSmtp),
            messageId: resEmail.messageId || '',
            error: resEmail.error || ''
          };
          console.log(`[Booking Email Dispatch]: To=${recipientEmail}, Sent=${emailResult.sent}, LiveSMTP=${emailResult.isLiveSmtp}, MsgId=${emailResult.messageId}`);
        } catch (err: any) {
          console.error('[Booking Email Dispatch Error]:', err);
          emailResult = { sent: false, isLiveSmtp: false, messageId: '', error: err.message };
        }

        // Record in notification logs with real delivery status
        db.notificationsLog.push({
          id: `notif_email_${Date.now()}`,
          appointmentId: appointment.id,
          eventType: 'booking_confirmed',
          recipientEmail: recipientEmail,
          recipientPhone: verifiedPhone,
          message: emailResult.sent
            ? `Booking confirmation card #${appointment.bookingNumber} for ${appointment.serviceName} dispatched to customer: ${recipientEmail}`
            : `Booking confirmation card dispatch pending for ${recipientEmail}: ${emailResult.error || 'SMTP queue'}`,
          status: emailResult.sent ? 'sent' : 'failed',
          provider: 'Email',
          createdAt: new Date().toISOString()
        });
        await saveDb(db);
      }

      // Automatically dispatch high-priority Booking Notification ONLY to the single allotted Booking Updates email
      const allottedAlertEmail = getAllottedBookingAlertEmail(db);
      if (allottedAlertEmail) {
        sendAdminBookingAlertEmail(allottedAlertEmail, appointment, db.settings).catch((err) => {
          console.error(`[Admin Booking Alert Dispatch Error to ${allottedAlertEmail}]:`, err.message);
        });
      }

      // Persistent In-App Admin Notification
      await recordAndDispatchAdminNotification(
        'new_booking',
        'New Booking Received',
        `Customer ${appointment.customerName} (${appointment.customerPhone}) booked ${appointment.serviceName} on ${appointment.date} at ${appointment.time}. Reference: #${appointment.bookingNumber}.`,
        appointment.id,
        appointment.bookingNumber
      );

      res.status(200).json({
        success: true,
        appointment,
        emailSentTo: recipientEmail,
        emailDispatched: emailResult.sent,
        isLiveSmtp: emailResult.isLiveSmtp,
        message: appointment.status === 'pending'
          ? 'Your appointment request has been submitted and is pending salon confirmation.'
          : 'Your appointment is confirmed!'
      });
    } catch (err: any) {
      res.status(409).json({ error: err.message || 'Unable to book appointment' });
    }
  });

  // Public Booking Details (for customer tracking/lookup)
  app.get('/api/public/bookings/:identifier', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const identifier = req.params.identifier;
      const appointment = db.appointments.find(
        (a) => a.id === identifier || a.bookingNumber.toLowerCase() === identifier.toLowerCase()
      );

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      // Public view omits sensitive admin internal notes
      const publicView = {
        bookingNumber: appointment.bookingNumber,
        customerName: appointment.customerName,
        serviceName: appointment.serviceName,
        servicePrice: appointment.servicePrice,
        serviceDuration: appointment.serviceDuration,
        date: appointment.date,
        time: appointment.time,
        endTime: appointment.endTime,
        status: appointment.status,
        notes: appointment.notes,
        createdAt: appointment.createdAt
      };

      res.json(publicView);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // CUSTOMER AUTHENTICATION (GMAIL SIGNUP, LOGIN & OTP VERIFICATION)
  // ---------------------------------------------------------------------------

  // Customer Sign Up with Gmail verification
  app.post('/api/customer/signup', async (req: Request, res: Response) => {
    try {
      const { name, email, phone, password, otpCode } = req.body;
      if (!name || !email || !phone || !password) {
        res.status(400).json({ error: 'Name, Gmail ID, mobile phone, and password are required.' });
        return;
      }

      const cleanName = String(name).trim();
      const cleanEmail = String(email).trim().toLowerCase();
      const cleanPhone = String(phone).trim();
      const cleanPassword = String(password).trim();

      if (!cleanEmail.includes('@')) {
        res.status(400).json({ error: 'Please enter a valid Gmail address.' });
        return;
      }

      const phoneDigits = cleanPhone.replace(/\D/g, '');
      if (phoneDigits.length < 10) {
        res.status(400).json({ error: 'Please enter a valid 10-digit mobile phone number.' });
        return;
      }

      if (cleanPassword.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }

      // Strict Real Verification through OTP to confirm ownership of the Gmail ID
      if (!otpCode) {
        res.status(400).json({ error: '6-digit OTP verification code is strictly required to verify ownership of your Gmail address.' });
        return;
      }

      const otpCheck = verifyRealtimeOtp(cleanEmail, String(otpCode));
      if (!otpCheck.success) {
        res.status(400).json({ error: otpCheck.error || 'Invalid OTP code. Please verify the code sent to your Gmail.' });
        return;
      }

      const db = await getDb();

      // Check if already registered
      const existing = db.customers.find(
        (c) => c.email && c.email.toLowerCase() === cleanEmail && c.isRegistered
      );
      if (existing) {
        res.status(409).json({ error: 'An account with this Gmail address is already registered. Please sign in.' });
        return;
      }

      const passwordHash = bcrypt.hashSync(cleanPassword, 10);
      const newCustId = `cust_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      const newCustomer = {
        id: newCustId,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        passwordHash,
        isVerified: true,
        isRegistered: true,
        notes: '',
        totalBookings: 0,
        createdAt: new Date().toISOString()
      };

      // 1. Sync customer profile to Supabase persistent table if table exists
      try {
        const syncRes = await syncCustomerToSupabase(newCustomer);
        if (syncRes.synced && syncRes.details?.id && syncRes.details.id !== newCustomer.id) {
          newCustomer.id = syncRes.details.id;
        } else if (!syncRes.synced) {
          console.warn(`[Supabase Customer Registration Notice]:`, syncRes.error, '- customer record preserved in salon database.');
        }
      } catch (syncErr: any) {
        console.warn(`[Supabase Customer Registration Warning]:`, syncErr.message);
      }

      db.customers.push(newCustomer);
      await saveDb(db);

      const token = generateCustomerSessionToken(newCustomer.id, newCustomer.name, newCustomer.email, newCustomer.phone);

      res.status(201).json({
        success: true,
        message: 'Account created and Gmail confirmed successfully!',
        token,
        customer: {
          id: newCustomer.id,
          name: newCustomer.name,
          email: newCustomer.email,
          phone: newCustomer.phone,
          isVerified: true,
          isRegistered: true
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customer Login (Gmail / Mobile + Password OR Gmail + OTP)
  app.post('/api/customer/login', async (req: Request, res: Response) => {
    try {
      const { identifier, password, otpCode } = req.body;
      const cleanId = String(identifier || '').trim().toLowerCase();

      if (!cleanId) {
        res.status(400).json({ error: 'Please enter your registered Gmail or phone number.' });
        return;
      }

      const db = await getDb();
      let customer = db.customers.find((c) => {
        const emailMatch = c.email && c.email.toLowerCase() === cleanId;
        const cPhoneDigits = c.phone ? c.phone.replace(/\D/g, '') : '';
        const idDigits = cleanId.replace(/\D/g, '');
        const phoneMatch = idDigits.length >= 10 && cPhoneDigits.includes(idDigits);
        return emailMatch || phoneMatch;
      });

      if (!customer) {
        // Query Supabase customers table so customers registered on other devices/browsers are found
        try {
          const supabase = getSupabase();
          if (supabase) {
            const idDigits = cleanId.replace(/\D/g, '');
            let query = supabase.from('customers').select('*');
            if (cleanId.includes('@')) {
              query = query.eq('email', cleanId);
            } else if (idDigits.length >= 10) {
              query = query.ilike('phone', `%${idDigits.slice(-10)}%`);
            }
            const { data: cloudCust } = await query.maybeSingle();
            if (cloudCust) {
              customer = {
                id: cloudCust.id,
                name: cloudCust.name,
                phone: cloudCust.phone,
                email: cloudCust.email || undefined,
                totalBookings: cloudCust.total_bookings || 1,
                lastBookingDate: cloudCust.last_booking_date || undefined,
                createdAt: cloudCust.created_at || new Date().toISOString(),
                isRegistered: true,
                isVerified: true,
                notes: ''
              };
              db.customers.push(customer);
              await saveDb(db);
            }
          }
        } catch (cloudErr: any) {
          console.warn('[Customer Login Cloud Lookup Notice]:', cloudErr?.message);
        }
      }

      if (!customer) {
        res.status(404).json({ error: 'No account registered with this Gmail or phone. Please sign up first.' });
        return;
      }

      // Check OTP login vs Password login
      if (otpCode) {
        const target = customer.email || cleanId;
        const otpCheck = verifyRealtimeOtp(target, String(otpCode));
        if (!otpCheck.success) {
          res.status(400).json({ error: otpCheck.error || 'Invalid OTP code' });
          return;
        }
      } else {
        if (!password) {
          res.status(400).json({ error: 'Please enter your password or login via Gmail OTP code.' });
          return;
        }
        if (!customer.passwordHash) {
          res.status(400).json({ error: 'No password set for this account. Please log in using Gmail OTP code.' });
          return;
        }
        const isMatch = bcrypt.compareSync(String(password), customer.passwordHash);
        if (!isMatch) {
          res.status(401).json({ error: 'Incorrect password. Please verify and try again, or use Gmail OTP.' });
          return;
        }
      }

      customer.isRegistered = true;
      customer.isVerified = true;
      await saveDb(db);

      const token = generateCustomerSessionToken(customer.id, customer.name, customer.email || cleanId, customer.phone);

      res.json({
        success: true,
        token,
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          isVerified: true,
          isRegistered: true
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customer Password Reset with Gmail OTP
  app.post('/api/customer/reset-password', async (req: Request, res: Response) => {
    try {
      const { email, otpCode, newPassword } = req.body;
      if (!email || !otpCode || !newPassword) {
        res.status(400).json({ error: 'Gmail address, 6-digit OTP code, and new password are required.' });
        return;
      }

      const cleanEmail = String(email).trim().toLowerCase();
      const cleanPassword = String(newPassword).trim();

      if (cleanPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        return;
      }

      const otpCheck = verifyRealtimeOtp(cleanEmail, String(otpCode));
      if (!otpCheck.success) {
        res.status(400).json({ error: otpCheck.error || 'Invalid or expired OTP code.' });
        return;
      }

      const db = await getDb();
      const customer = db.customers.find((c) => c.email && c.email.toLowerCase() === cleanEmail);
      if (!customer) {
        res.status(404).json({ error: 'No account registered with this Gmail address.' });
        return;
      }

      customer.passwordHash = bcrypt.hashSync(cleanPassword, 10);
      customer.isVerified = true;
      customer.isRegistered = true;
      await saveDb(db);

      res.json({ success: true, message: 'Password reset successfully! You can now log in with your new password.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customer Profile Me
  app.get('/api/customer/me', (req: Request, res: Response) => {
    const customer = getCustomerFromRequest(req);
    if (!customer) {
      res.status(401).json({ error: 'Not logged in' });
      return;
    }
    res.json({ customer });
  });

  // Customer Logout (revokes active session token without deleting account, profile or booking history)
  app.post('/api/customer/logout', (req: Request, res: Response) => {
    const token = (req.headers['x-customer-token'] as string) || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
    if (token) {
      revokeCustomerSessionToken(token);
    }
    res.json({ success: true, message: 'Logged out successfully' });
  });

  // Resend Booking Card to verified customer Gmail
  app.post('/api/customer/resend-booking-card', async (req: Request, res: Response) => {
    try {
      const customer = getCustomerFromRequest(req);
      if (!customer) {
        res.status(401).json({ error: 'Strictly Prohibited: Please sign in to your verified Gmail account.' });
        return;
      }
      const { bookingNumber, appointmentId } = req.body;
      const db = await getDb();
      const appointment = db.appointments.find(
        (a) =>
          (bookingNumber && a.bookingNumber.toLowerCase() === String(bookingNumber).toLowerCase()) ||
          (appointmentId && a.id === appointmentId)
      );

      if (!appointment) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      const targetEmail = customer.email;
      if (!targetEmail) {
        res.status(400).json({ error: 'No verified Gmail address on record for this account.' });
        return;
      }

      const sendRes = await sendBookingCardEmail(targetEmail, appointment, db.settings);
      res.json({
        success: Boolean(sendRes.sent),
        isLiveSmtp: Boolean(sendRes.isLiveSmtp),
        message: sendRes.sent
          ? `Booking confirmation card #${appointment.bookingNumber} has been delivered to ${targetEmail}!`
          : `Booking confirmation card prepared for ${targetEmail}.`
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Public Customer Appointments Lookup (Requires login or active session)
  // Rule: "without Login or signup User booking will not be shown."
  app.get('/api/public/customer-appointments', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const customerSession = getCustomerFromRequest(req);
      const phoneParam = req.query.phone ? String(req.query.phone).replace(/[^0-9]/g, '') : '';
      const emailParam = req.query.email ? String(req.query.email).trim().toLowerCase() : '';
      const numbersParam = req.query.numbers ? String(req.query.numbers) : '';
      const numbersList = numbersParam ? numbersParam.split(',').map((s) => s.trim().toLowerCase()) : [];

      // Without login or signup, user booking will not be shown
      if (!customerSession) {
        res.json([]);
        return;
      }

      const targetEmail = customerSession.email ? customerSession.email.toLowerCase() : '';
      const targetPhone = customerSession.phone ? customerSession.phone.replace(/[^0-9]/g, '') : '';

      const matches = db.appointments.filter((a) => {
        // Match by verified customer email
        if (targetEmail && a.customerEmail && a.customerEmail.toLowerCase() === targetEmail) {
          return true;
        }
        // Match by phone
        if (targetPhone) {
          const cleanAptPhone = a.customerPhone.replace(/[^0-9]/g, '');
          const targetLast10 = targetPhone.length >= 10 ? targetPhone.slice(-10) : targetPhone;
          const aptLast10 = cleanAptPhone.length >= 10 ? cleanAptPhone.slice(-10) : cleanAptPhone;
          if (targetLast10 && aptLast10 && (targetLast10 === aptLast10 || cleanAptPhone.includes(targetPhone) || targetPhone.includes(cleanAptPhone))) {
            return true;
          }
        }
        // Match by booking numbers if provided with session
        if (numbersList.length > 0 && (numbersList.includes(a.bookingNumber.toLowerCase()) || numbersList.includes(a.id.toLowerCase()))) {
          return true;
        }
        return false;
      });

      // Sort by newest/most recent first
      matches.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.updatedAt || `${a.date}T${a.time}:00`).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || `${b.date}T${b.time}:00`).getTime();
        return timeB - timeA;
      });

      const sanitized = matches.map((a) => ({
        id: a.id,
        bookingNumber: a.bookingNumber,
        customerName: a.customerName,
        customerPhone: a.customerPhone,
        customerEmail: a.customerEmail,
        serviceId: a.serviceId,
        serviceName: a.serviceName,
        servicePrice: a.servicePrice,
        serviceDuration: a.serviceDuration,
        date: a.date,
        time: a.time,
        endTime: a.endTime,
        status: a.status,
        stylistId: a.stylistId,
        stylistName: a.stylistName,
        cancellationReason: a.cancellationReason,
        cancelledAt: a.cancelledAt,
        cancelledBy: a.cancelledBy,
        notes: a.notes,
        createdAt: a.createdAt,
        updatedAt: a.updatedAt
      }));

      res.json(sanitized);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Dedicated authenticated customer bookings & appointments endpoint
  const handleGetCustomerAppointments = async (req: Request, res: Response) => {
    try {
      const customerSession = getCustomerFromRequest(req);
      if (!customerSession) {
        res.status(401).json({ error: 'Customer authentication session required' });
        return;
      }
      const db = await getDb();
      const targetCustomerId = customerSession.customerId;
      const targetEmail = customerSession.email ? customerSession.email.toLowerCase() : '';
      const targetPhone = customerSession.phone ? customerSession.phone.replace(/[^0-9]/g, '') : '';

      // Check Supabase cloud appointments if available so history is permanent across devices
      try {
        const supabase = getSupabase();
        if (supabase) {
          const { data: cloudAppts } = await supabase
            .from('appointments')
            .select('*')
            .or(`customer_id.eq.${targetCustomerId}${targetEmail ? `,customer_email.eq.${targetEmail}` : ''}${targetPhone ? `,customer_phone.eq.${targetPhone}` : ''}`);

          if (Array.isArray(cloudAppts) && cloudAppts.length > 0) {
            const deletedSet = new Set(db.deletedAppointmentIds || []);
            cloudAppts.forEach((ca: any) => {
              if (
                ca.id &&
                !ca.id.startsWith('__salon_') &&
                ca.status !== 'deleted' &&
                !deletedSet.has(ca.id)
              ) {
                const existingIdx = db.appointments.findIndex((a) => a.id === ca.id || a.bookingNumber === ca.booking_number);
                if (existingIdx === -1) {
                  db.appointments.push({
                    id: ca.id,
                    bookingNumber: ca.booking_number || `TS-${ca.id}`,
                    customerId: ca.customer_id || targetCustomerId,
                    customerName: ca.customer_name || 'Customer',
                    customerPhone: ca.customer_phone || targetPhone,
                    customerEmail: ca.customer_email || targetEmail,
                    serviceId: ca.service_id || 'srv_hair_1',
                    serviceName: ca.service_name || 'Haircut',
                    servicePrice: Number(ca.service_price || 0),
                    serviceDuration: Number(ca.service_duration || 30),
                    date: ca.appointment_date || ca.date,
                    time: ca.appointment_time || ca.time || '10:00',
                    endTime: ca.end_time || ca.endTime,
                    status: ca.status || 'confirmed',
                    notes: ca.notes || '',
                    stylistId: ca.stylist_id,
                    stylistName: ca.stylist_name,
                    internalNotes: ca.internal_notes || '',
                    createdAtIST: ca.created_at || new Date().toISOString(),
                    createdAt: ca.created_at || new Date().toISOString(),
                    updatedAt: ca.updated_at || new Date().toISOString()
                  });
                }
              }
            });
          }
        }
      } catch (cloudErr) {
        // Non-blocking fallback to local dbCache
      }

      const matches = db.appointments.filter((a) => {
        if (targetCustomerId && a.customerId === targetCustomerId) return true;
        if (targetEmail && a.customerEmail && a.customerEmail.toLowerCase() === targetEmail) return true;
        if (targetPhone) {
          const cleanAptPhone = a.customerPhone.replace(/[^0-9]/g, '');
          const targetLast10 = targetPhone.length >= 10 ? targetPhone.slice(-10) : targetPhone;
          const aptLast10 = cleanAptPhone.length >= 10 ? cleanAptPhone.slice(-10) : cleanAptPhone;
          if (targetLast10 && aptLast10 && targetLast10 === aptLast10) return true;
        }
        return false;
      });

      // Permanently heal customerId on all matches to customer's stable authenticated ID
      let healed = false;
      matches.forEach((a) => {
        if (!a.customerId || a.customerId !== targetCustomerId) {
          a.customerId = targetCustomerId;
          healed = true;
        }
      });
      if (healed) {
        saveDb(db).catch(console.error);
      }

      matches.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.updatedAt || `${a.date}T${a.time}:00`).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || `${b.date}T${b.time}:00`).getTime();
        return timeB - timeA;
      });

      res.json(matches);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  app.get('/api/customer/bookings', handleGetCustomerAppointments);
  app.get('/api/customer/appointments', handleGetCustomerAppointments);

  // ---------------------------------------------------------------------------
  // CUSTOMER CANCELLATION & TIME SLOT RELEASE
  // ---------------------------------------------------------------------------
  app.post('/api/customer/appointments/:id/cancel', async (req: Request, res: Response) => {
    try {
      const customerSession = getCustomerFromRequest(req);
      if (!customerSession) {
        res.status(401).json({ error: 'Unauthorized: Please log in with your Gmail account to manage bookings.' });
        return;
      }

      const db = await getDb();
      const apptId = String(req.params.id || '').trim();
      const reason = String(req.body?.reason || '').trim() || 'Cancelled by customer via My Bookings';

      const apptIndex = db.appointments.findIndex(
        (a) => a.id === apptId || a.bookingNumber.toLowerCase() === apptId.toLowerCase()
      );

      if (apptIndex === -1) {
        res.status(404).json({ error: 'Appointment not found.' });
        return;
      }

      const appt = db.appointments[apptIndex];

      // Strict Customer Ownership Validation
      const customerEmail = customerSession.email ? customerSession.email.trim().toLowerCase() : '';
      const customerPhone = customerSession.phone ? customerSession.phone.replace(/\D/g, '') : '';
      const apptEmail = appt.customerEmail ? appt.customerEmail.trim().toLowerCase() : '';
      const apptPhone = appt.customerPhone ? appt.customerPhone.replace(/\D/g, '') : '';

      const isOwner =
        (appt.customerId && appt.customerId === customerSession.customerId) ||
        (customerEmail && apptEmail && customerEmail === apptEmail) ||
        (customerPhone && apptPhone && (apptPhone === customerPhone || apptPhone.endsWith(customerPhone.slice(-10)) || customerPhone.endsWith(apptPhone.slice(-10))));

      if (!isOwner) {
        res.status(403).json({ error: 'Forbidden: You are not authorized to cancel this appointment.' });
        return;
      }

      // Check current status
      if (appt.status === 'cancelled') {
        res.status(400).json({ error: 'This appointment has already been cancelled.' });
        return;
      }
      if (appt.status === 'completed') {
        res.status(400).json({ error: 'Completed appointments cannot be cancelled.' });
        return;
      }
      if (appt.status !== 'pending' && appt.status !== 'confirmed') {
        res.status(400).json({ error: `Appointments with status "${appt.status}" cannot be cancelled.` });
        return;
      }

      // Configurable Cancellation Deadline Check (default: 2 hours)
      const deadlineHours = Number(db.settings.cancellationDeadlineHours ?? 2);
      const apptDateTime = new Date(`${appt.date}T${appt.time}:00`);
      const now = new Date();
      const diffHours = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 0) {
        res.status(400).json({ error: 'Past appointments cannot be cancelled online.' });
        return;
      }

      if (diffHours < deadlineHours) {
        res.status(400).json({
          error: `Cancellation deadline passed. Cancellations must be made at least ${deadlineHours} hour(s) before your scheduled time. Please call salon reception directly at ${db.settings.phone || '+91 78800 86990'}.`
        });
        return;
      }

      // Perform atomic cancellation & slot release
      appt.status = 'cancelled';
      appt.cancelledAt = new Date().toISOString();
      appt.cancelledBy = 'customer';
      appt.cancellationReason = reason;
      appt.updatedAt = new Date().toISOString();

      // Record in notificationsLog
      const notifMsg = `Tassel Unisex Salon: Booking #${appt.bookingNumber} for ${appt.serviceName} on ${appt.date} at ${appt.time} was cancelled by customer. Reason: "${reason}". Reserved slot has been safely released.`;
      db.notificationsLog.push({
        id: `notif_${Date.now()}`,
        appointmentId: appt.id,
        eventType: 'booking_cancelled',
        recipientPhone: appt.customerPhone,
        recipientEmail: appt.customerEmail,
        message: notifMsg,
        status: 'sent',
        provider: 'System',
        createdAt: new Date().toISOString()
      });

      await saveDb(db);

      // Sync cancellation to Supabase Cloud
      syncAppointmentToSupabase(appt).catch((err) => {
        console.error('[Supabase Cancellation Sync Error]:', err);
      });

      // Dispatch real Gmail SMTP emails (resilient: failures do not block DB update)
      // 1. Email to customer
      if (appt.customerEmail) {
        sendBookingStatusUpdateEmail(appt.customerEmail, appt, 'cancelled', reason, db.settings).catch((err) => {
          console.error('[Customer Cancellation Email Error]:', err.message);
        });
      }

      // 2. Alert ONLY to the single allotted Booking Updates email
      const allottedAlertEmail = getAllottedBookingAlertEmail(db);
      if (allottedAlertEmail) {
        sendAdminBookingEventEmail(allottedAlertEmail, appt, 'cancelled', `Customer (${customerSession.name})`, reason, db.settings).catch((err) => {
          console.error(`[Admin Cancellation Alert Error to ${allottedAlertEmail}]:`, err.message);
        });
      }

      // 3. Persistent in-app admin notification
      await recordAndDispatchAdminNotification(
        'cancelled',
        'Booking Cancelled by Customer',
        `Customer ${appt.customerName} cancelled appointment #${appt.bookingNumber} (${appt.serviceName}) for ${appt.date} at ${appt.time}. Reason: "${reason}". Slot has been released.`,
        appt.id,
        appt.bookingNumber
      );

      res.json({
        success: true,
        message: `Booking #${appt.bookingNumber} has been successfully cancelled and your reserved slot is released.`,
        appointment: appt
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // REAL-TIME OTP VERIFICATION (MOBILE & GMAIL)
  // ---------------------------------------------------------------------------
  app.post('/api/public/send-otp', async (req: Request, res: Response) => {
    try {
      const { target, type } = req.body;
      if (!target) {
        res.status(400).json({ error: 'Target mobile number or Gmail is required' });
        return;
      }

      const otpType: 'mobile' | 'email' = type === 'email' || String(target).includes('@') ? 'email' : 'mobile';
      const cleanTarget = String(target).trim();
      const result = createRealtimeOtp(cleanTarget, otpType);

      const db = await getDb();
      let emailDispatchResult: { sent: boolean; isLiveSmtp?: boolean; messageId?: string; error?: string } = { sent: false };

      // If email/Gmail, dispatch verification email
      if (otpType === 'email') {
        try {
          emailDispatchResult = await sendGmailOtpEmail(cleanTarget, result.code, req.body.name, db.settings);
        } catch (err: any) {
          console.error('[Gmail OTP Dispatch Error]:', err);
          emailDispatchResult = { sent: false, error: err.message };
        }
      }

      // Record in notification logs
      db.notificationsLog.push({
        id: `notif_otp_${Date.now()}`,
        appointmentId: 'verification',
        eventType: 'booking_created',
        recipientPhone: otpType === 'mobile' ? cleanTarget : '',
        recipientEmail: otpType === 'email' ? cleanTarget : undefined,
        message: result.message,
        status: 'sent',
        provider: otpType === 'email' ? 'Email' : 'SMS',
        createdAt: new Date().toISOString()
      });
      await saveDb(db);

      res.json({
        success: true,
        message: otpType === 'email' 
          ? `A 6-digit verification code has been dispatched to your Gmail (${cleanTarget}). Please open your Gmail, read the code, and enter it below.`
          : `A 6-digit verification code has been sent to ${cleanTarget}.`,
        expiresAt: result.expiresAt,
        isLiveSmtp: Boolean(emailDispatchResult.isLiveSmtp)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // CUSTOMER REVIEWS (1-5 Star Customer Rating & Written Feedback)
  // ---------------------------------------------------------------------------
  app.get('/api/customer/reviews', async (req: Request, res: Response) => {
    try {
      const customer = getCustomerFromRequest(req);
      if (!customer) {
        res.status(401).json({ error: 'Unauthorized: Please log in with your Gmail account to view your reviews.' });
        return;
      }
      const db = await getDb();
      const cEmail = customer.email ? customer.email.toLowerCase() : '';
      const myReviews = (db.reviews || []).filter(
        (r) =>
          (r.customerId && r.customerId === customer.customerId) ||
          (cEmail && r.customerEmail && r.customerEmail.toLowerCase() === cEmail)
      );
      res.json(myReviews);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/customer/reviews', async (req: Request, res: Response) => {
    try {
      const customer = getCustomerFromRequest(req);
      if (!customer) {
        res.status(401).json({ error: 'Unauthorized: Please log in with your Gmail account to submit a review.' });
        return;
      }
      const { rating, reviewText } = req.body;
      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5) {
        res.status(400).json({ error: 'Please choose a star rating from 1 to 5.' });
        return;
      }
      if (!reviewText || !String(reviewText).trim()) {
        res.status(400).json({ error: 'Please enter your written review or feedback.' });
        return;
      }

      const db = await getDb();
      const newReview: Review = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        authorName: customer.name || 'Verified Customer',
        rating: Math.min(5, Math.max(1, Math.round(numRating))),
        reviewText: String(reviewText).trim(),
        reviewDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        source: 'Website Customer',
        status: 'pending', // Moderation approval required before appearing publicly
        customerId: customer.customerId,
        customerEmail: customer.email,
        isVerified: true,
        isFeatured: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.reviews = db.reviews || [];
      db.reviews.unshift(newReview);
      await saveDb(db);

      // Asynchronously sync to Supabase persistent table
      syncReviewToSupabase(newReview).catch((err) => {
        console.warn('[Supabase Sync Review Warning]:', err?.message);
      });

      // Notify admin of incoming review submission
      recordAndDispatchAdminNotification(
        'general',
        'New Customer Review Submitted',
        `${newReview.authorName} submitted a ${newReview.rating}★ review: "${newReview.reviewText.slice(0, 50)}..." (Pending admin approval)`
      ).catch(() => {});

      res.status(201).json({
        success: true,
        review: newReview,
        message: 'Thank you for your feedback! Your review has been submitted and will appear publicly once approved by salon management.'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/customer/reviews/:id', async (req: Request, res: Response) => {
    try {
      const customer = getCustomerFromRequest(req);
      if (!customer) {
        res.status(401).json({ error: 'Unauthorized: Please log in with your Gmail account.' });
        return;
      }
      const db = await getDb();
      const rev = (db.reviews || []).find((r) => r.id === req.params.id);
      if (!rev) {
        res.status(404).json({ error: 'Review not found.' });
        return;
      }

      const cEmail = customer.email ? customer.email.toLowerCase() : '';
      const isOwner =
        (rev.customerId && rev.customerId === customer.customerId) ||
        (cEmail && rev.customerEmail && rev.customerEmail.toLowerCase() === cEmail);

      if (!isOwner) {
        res.status(403).json({ error: 'Forbidden: You are only permitted to edit your own reviews.' });
        return;
      }

      const { rating, reviewText } = req.body;
      if (rating !== undefined) {
        const numRating = Number(rating);
        if (numRating >= 1 && numRating <= 5) {
          rev.rating = Math.round(numRating);
        }
      }
      if (reviewText !== undefined && String(reviewText).trim()) {
        rev.reviewText = String(reviewText).trim();
      }
      // Re-submit for moderation upon modification
      rev.status = 'pending';
      rev.updatedAt = new Date().toISOString();

      await saveDb(db);
      syncReviewToSupabase(rev).catch(() => {});

      res.json({
        success: true,
        review: rev,
        message: 'Review updated successfully. It has been resubmitted for salon moderation.'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/customer/reviews/:id', async (req: Request, res: Response) => {
    try {
      const customer = getCustomerFromRequest(req);
      if (!customer) {
        res.status(401).json({ error: 'Unauthorized: Please log in with your Gmail account.' });
        return;
      }
      const db = await getDb();
      const rev = (db.reviews || []).find((r) => r.id === req.params.id);
      if (!rev) {
        res.status(404).json({ error: 'Review not found.' });
        return;
      }

      const cEmail = customer.email ? customer.email.toLowerCase() : '';
      const isOwner =
        (rev.customerId && rev.customerId === customer.customerId) ||
        (cEmail && rev.customerEmail && rev.customerEmail.toLowerCase() === cEmail);

      if (!isOwner) {
        res.status(403).json({ error: 'Forbidden: You are only permitted to delete your own reviews.' });
        return;
      }

      db.reviews = db.reviews.filter((r) => r.id !== req.params.id);
      await saveDb(db);
      deleteSupabaseReview(req.params.id).catch(() => {});

      res.json({ success: true, message: 'Review successfully deleted.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/public/verify-otp', async (req: Request, res: Response) => {
    try {
      const { target, code } = req.body;
      if (!target || !code) {
        res.status(400).json({ error: 'Target and 6-digit OTP code are required' });
        return;
      }
      const verifyRes = verifyRealtimeOtp(String(target), String(code));
      if (!verifyRes.success) {
        res.status(400).json({ error: verifyRes.error || 'Invalid OTP code' });
        return;
      }
      res.json({ success: true, message: 'OTP verified successfully!' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // ADMIN AUTHENTICATION & SINGLE-SLOT SETUP
  // ---------------------------------------------------------------------------

  // Check if an admin account is already registered (Single Slot Rule)
  app.get('/api/admin/setup-status', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      const hasAdmin = Array.isArray(db.adminUsers) && db.adminUsers.length > 0;
      res.json({
        isSetupCompleted: hasAdmin,
        adminCount: db.adminUsers ? db.adminUsers.length : 0,
        registeredUsername: hasAdmin ? db.adminUsers[0].username : null,
        registeredEmail: hasAdmin ? db.adminUsers[0].email : null
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Single-Slot Admin Account Registration
  // Strictly blocked after 1 admin account exists!
  app.post('/api/admin/signup', async (req: Request, res: Response) => {
    try {
      const db = await getDb();
      if (Array.isArray(db.adminUsers) && db.adminUsers.length > 0) {
        res.status(403).json({
          error: 'Registration is closed. An admin account has already been created for this system. Only that single admin account is authorized to log in.'
        });
        return;
      }

      const { username, password, email, otpCode } = req.body;
      if (!password) {
        res.status(400).json({ error: 'Password is required.' });
        return;
      }

      const cleanPassword = String(password).trim();
      if (cleanPassword.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }

      // Can provide username OR email (e.g. Gmail)
      const cleanEmail = email ? String(email).trim().toLowerCase() : '';
      let cleanUsername = username ? String(username).trim() : '';

      if (!cleanUsername && cleanEmail) {
        cleanUsername = cleanEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');
      }

      if (!cleanUsername || cleanUsername.length < 3) {
        res.status(400).json({ error: 'Username or valid Gmail/Email address is required.' });
        return;
      }

      // Optional OTP validation if code was requested
      if (otpCode && cleanEmail) {
        const otpCheck = verifyRealtimeOtp(cleanEmail, String(otpCode));
        if (!otpCheck.success) {
          res.status(400).json({ error: otpCheck.error || 'Invalid OTP code.' });
          return;
        }
      }

      const passwordHash = bcrypt.hashSync(cleanPassword, 10);
      const newAdmin = {
        id: `admin_${Date.now()}`,
        username: cleanUsername,
        email: cleanEmail,
        passwordHash,
        role: 'superadmin',
        createdAt: new Date().toISOString()
      };

      db.adminUsers = [newAdmin];
      await saveDb(db);

      const token = generateSessionToken(newAdmin.id, newAdmin.username, newAdmin.email);

      console.log(`[Admin Account Created]: Successfully created primary admin slot: ${cleanUsername} (${newAdmin.email})`);

      res.status(201).json({
        success: true,
        message: 'Admin account successfully created! Single registration slot is now permanently locked.',
        token,
        user: { id: newAdmin.id, username: newAdmin.username, email: newAdmin.email, role: newAdmin.role }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/login', async (req: Request, res: Response) => {
    try {
      const { username, identifier, email, password, otpCode } = req.body;
      const loginTarget = identifier || email || username;
      if (!loginTarget) {
        res.status(400).json({ error: 'Registered Gmail address or username is required.' });
        return;
      }

      const db = await getDb();
      const cleanId = String(loginTarget).trim().toLowerCase();
      let user = db.adminUsers.find(
        (u) =>
          u.username.toLowerCase() === cleanId ||
          (u.email && u.email.toLowerCase() === cleanId)
      );

      if (!user && (cleanId === 'admin' || cleanId === 'naitik' || cleanId === 'naitik sahu' || cleanId === 'naitiksahu054@gmail.com' || cleanId === 'mrtechsahu@gmail.com')) {
        user = db.adminUsers[0];
      }

      if (!user) {
        res.status(401).json({ error: 'Invalid Gmail/username or password. Access denied.' });
        return;
      }

      if (otpCode) {
        const targetEmail = user.email;
        if (!targetEmail) {
          res.status(400).json({ error: 'Registered Gmail address is required for OTP login.' });
          return;
        }
        const otpCheck = verifyRealtimeOtp(targetEmail, String(otpCode));
        if (!otpCheck.success) {
          res.status(401).json({ error: otpCheck.error || 'Invalid OTP code. Please enter the valid code sent to your Gmail.' });
          return;
        }
        const token = generateSessionToken(user.id, user.username, user.email);
        res.json({
          token,
          user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });
        return;
      }

      if (!password) {
        res.status(400).json({ error: 'Password is required to access the Admin dashboard.' });
        return;
      }

      const verifiedUser = await verifyCredentials(loginTarget, password);
      if (!verifiedUser) {
        res.status(401).json({ error: 'Incorrect password. Access denied.' });
        return;
      }

      const token = generateSessionToken(verifiedUser.id, verifiedUser.username, verifiedUser.email);
      res.json({
        token,
        user: { id: verifiedUser.id, username: verifiedUser.username, email: verifiedUser.email, role: verifiedUser.role }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-session-token'] as string);
    if (token) {
      revokeSessionToken(token);
    }
    res.json({ success: true });
  });

  app.get('/api/admin/me', requireAdminAuth, (req: AuthenticatedRequest, res: Response) => {
    res.json({ user: req.adminUser });
  });

  // Admin Change Password Endpoint
  app.put('/api/admin/change-password', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required.' });
        return;
      }

      const cleanNewPassword = String(newPassword).trim();
      if (cleanNewPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        return;
      }

      const db = await getDb();
      const adminId = req.adminUser?.userId;
      const userIndex = db.adminUsers.findIndex((u) => u.id === adminId);
      if (userIndex === -1) {
        res.status(404).json({ error: 'Admin account not found in database.' });
        return;
      }

      const user = db.adminUsers[userIndex];
      const isMatch = bcrypt.compareSync(String(currentPassword), user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Current password is incorrect. Please verify and try again.' });
        return;
      }

      const newHash = bcrypt.hashSync(cleanNewPassword, 10);
      db.adminUsers[userIndex].passwordHash = newHash;
      await saveDb(db);

      console.log(`[Admin Password Changed]: Admin ${user.username} (${user.email}) successfully changed password.`);

      res.json({ success: true, message: 'Password has been updated successfully! Please use your new password for future logins.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Update Full Login Credentials (Gmail, Username, and/or Password)
  app.put('/api/admin/credentials', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { currentPassword, newUsername, newEmail, newPassword, otpCode } = req.body;
      if (!currentPassword) {
        res.status(400).json({ error: 'Current password is required to verify and authorize credential changes.' });
        return;
      }

      const db = await getDb();
      const adminId = req.adminUser?.userId;
      const userIndex = db.adminUsers.findIndex((u) => u.id === adminId);
      if (userIndex === -1) {
        res.status(404).json({ error: 'Admin account not found in database.' });
        return;
      }

      const user = db.adminUsers[userIndex];
      const isMatch = bcrypt.compareSync(String(currentPassword), user.passwordHash);
      if (!isMatch) {
        res.status(401).json({ error: 'Current password is incorrect. Please verify and try again.' });
        return;
      }

      // If updating Gmail
      if (newEmail) {
        const cleanEmail = String(newEmail).trim().toLowerCase();
        if (!cleanEmail.includes('@')) {
          res.status(400).json({ error: 'Please enter a valid Gmail address.' });
          return;
        }
        if (otpCode) {
          const otpCheck = verifyRealtimeOtp(cleanEmail, String(otpCode));
          if (!otpCheck.success) {
            res.status(400).json({ error: otpCheck.error || 'Invalid OTP code. Please enter the valid code sent to your Gmail.' });
            return;
          }
        }
        user.email = cleanEmail;
      }

      // If updating Username
      if (newUsername) {
        const cleanUsername = String(newUsername).trim();
        if (cleanUsername.length < 3) {
          res.status(400).json({ error: 'Username must be at least 3 characters long.' });
          return;
        }
        user.username = cleanUsername;
      }

      // If updating Password
      if (newPassword) {
        const cleanNewPassword = String(newPassword).trim();
        if (cleanNewPassword.length < 6) {
          res.status(400).json({ error: 'New password must be at least 6 characters long.' });
          return;
        }
        user.passwordHash = bcrypt.hashSync(cleanNewPassword, 10);
      }

      await saveDb(db);

      const token = generateSessionToken(user.id, user.username, user.email);

      console.log(`[Admin Credentials Updated]: Admin username: ${user.username}, email: ${user.email}`);

      res.json({
        success: true,
        message: 'Admin login credentials (Gmail, Username, and Password) have been updated successfully!',
        token,
        user: { id: user.id, username: user.username, email: user.email, role: user.role }
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Reset Slot (Reopens first-time setup by clearing admin login credentials)
  app.post('/api/admin/reset-slot', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      db.adminUsers = [];
      await saveDb(db);
      console.log('[Admin Slot Reset]: Admin info has been reset. First-time registration is reopened.');
      res.json({ success: true, message: 'Admin login info has been reset successfully. First-time setup is now open.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // ADMIN MANAGEMENT (PROTECTED)
  // ---------------------------------------------------------------------------

  // Dashboard Overview Metrics
  app.get('/api/admin/overview', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();

      // Ensure latest appointments and their actual collected amounts are fetched from Supabase
      try {
        const cloudAppts = await fetchSupabaseAppointments();
        if (Array.isArray(cloudAppts) && cloudAppts.length > 0) {
          const deletedApptSet = new Set(db.deletedAppointmentIds || []);
          cloudAppts.forEach((ca: any) => {
            if (!deletedApptSet.has(ca.id)) {
              const existingIdx = db.appointments.findIndex((a) => a.id === ca.id);
              const mapped: any = {
                id: ca.id,
                bookingNumber: ca.booking_number || `BB-${ca.id}`,
                customerId: ca.customer_id,
                customerName: ca.customer_name || 'Customer',
                customerPhone: ca.customer_phone || '',
                customerEmail: ca.customer_email || '',
                serviceId: ca.service_id || 'srv_hair_1',
                serviceName: ca.service_name || 'Service',
                servicePrice: Number(ca.service_price || 0),
                serviceDuration: Number(ca.service_duration || 30),
                date: ca.appointment_date || ca.date,
                time: ca.appointment_time || ca.time || '10:00',
                endTime: ca.end_time,
                status: ca.status || 'confirmed',
                notes: ca.notes || '',
                stylistId: ca.stylist_id,
                stylistName: ca.stylist_name,
                cancellationReason: ca.cancellation_reason,
                cancelledAt: ca.cancelled_at,
                cancelledBy: ca.cancelled_by,
                internalNotes: ca.internal_notes || '',
                actualAmountCollected: ca.actual_amount_collected,
                paymentMethod: ca.payment_method,
                amountNotes: ca.amount_notes,
                createdAt: ca.created_at,
                updatedAt: ca.updated_at || ca.created_at
              };
              if (existingIdx !== -1) {
                db.appointments[existingIdx] = { ...db.appointments[existingIdx], ...mapped };
              } else {
                db.appointments.push(mapped);
              }
            }
          });
        }
      } catch (cloudErr: any) {
        console.warn('[Admin Overview Supabase Merge Notice]:', cloudErr?.message);
      }

      const realAppointments = db.appointments.filter((a) => a.id && !a.id.startsWith('__salon_'));
      const today = new Date();
      const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

      // In Indian Standard Time (Asia/Kolkata) to accurately match the salon's operational day
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const istTodayStr = `${nowIST.getFullYear()}-${String(nowIST.getMonth() + 1).padStart(2, '0')}-${String(nowIST.getDate()).padStart(2, '0')}`;
      const localTodayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      const currentMinutesIST = nowIST.getHours() * 60 + nowIST.getMinutes();

      const parseTimeToMinutes = (t?: string) => {
        if (!t) return 0;
        const match = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
        if (!match) return 0;
        let h = parseInt(match[1], 10);
        const m = parseInt(match[2], 10);
        const ampm = match[3]?.toUpperCase();
        if (ampm === 'PM' && h < 12) h += 12;
        if (ampm === 'AM' && h === 12) h = 0;
        return (isNaN(h) ? 0 : h) * 60 + (isNaN(m) ? 0 : m);
      };

      // Today's activity strictly in Indian Standard Time (Asia/Kolkata)
      const todayAppointmentsList = realAppointments
        .filter((a) => a.date === istTodayStr)
        .sort((a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time));

      const todayAppointments = todayAppointmentsList;

      // Truly Upcoming (Future): Only genuinely future appointments
      // (future IST date, or today with start time strictly > currentMinutesIST) and active (not completed, cancelled, or rejected)
      const upcomingAppointments = realAppointments.filter((a) => {
        if (a.status === 'cancelled' || a.status === 'completed' || (a.status as string) === 'rejected') return false;
        if (a.date > istTodayStr) return true;
        if (a.date === istTodayStr) {
          const apptStart = parseTimeToMinutes(a.time);
          return apptStart > currentMinutesIST;
        }
        return false;
      });
      const pendingBookings = realAppointments.filter((a) => a.status === 'pending');
      const confirmedBookings = realAppointments.filter((a) => a.status === 'confirmed');
      const completedBookings = realAppointments.filter((a) => a.status === 'completed');
      const cancelledBookings = realAppointments.filter((a) => a.status === 'cancelled');

      // Calculate revenue: ONLY completed appointments add to revenue, using actual amount collected if available
      const totalRevenue = realAppointments
        .filter((a) => a.status === 'completed')
        .reduce((sum, a) => {
          const effectiveRevenue = typeof a.actualAmountCollected === 'number' ? a.actualAmountCollected : (a.servicePrice || 0);
          return sum + effectiveRevenue;
        }, 0);

      const recentAppointments = [...realAppointments]
        .sort((a, b) => {
          const timeA = new Date(a.createdAt || `${a.date}T${a.time}:00`).getTime();
          const timeB = new Date(b.createdAt || `${b.date}T${b.time}:00`).getTime();
          return timeB - timeA;
        })
        .slice(0, 15);

      // Only registered / signed up customers are counted
      const registeredCustomers = db.customers.filter((c) => c.isRegistered || c.isVerified);

      res.json({
        metrics: {
          todayCount: todayAppointmentsList.length,
          upcomingCount: upcomingAppointments.length,
          pendingCount: pendingBookings.length,
          confirmedCount: confirmedBookings.length,
          completedCount: completedBookings.length,
          cancelledCount: cancelledBookings.length,
          totalRevenue,
          totalCustomers: registeredCustomers.length,
          totalServices: db.services.length
        },
        todayDateStr: istTodayStr,
        todayAppointments: todayAppointmentsList,
        recentAppointments
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Appointments List with Filters
  app.get('/api/admin/appointments', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const { date, status, search } = req.query;

      // Always merge persistent appointments from Supabase so bookings from any device appear immediately
      try {
        const cloudAppts = await fetchSupabaseAppointments();
        if (Array.isArray(cloudAppts) && cloudAppts.length > 0) {
          const deletedApptSet = new Set(db.deletedAppointmentIds || []);
          const deletedBNumSet = new Set(db.deletedBookingNumbers || []);
          cloudAppts.forEach((ca: any) => {
            if (
              ca.id &&
              ca.status !== 'deleted' &&
              !deletedApptSet.has(ca.id) &&
              (!ca.booking_number || !deletedBNumSet.has(ca.booking_number))
            ) {
              const existingIdx = db.appointments.findIndex((a) => a.id === ca.id || (ca.booking_number && a.bookingNumber === ca.booking_number));
              const mapped: any = {
                id: ca.id,
                bookingNumber: ca.booking_number || `TS-${ca.id}`,
                customerId: ca.customer_id,
                customerName: ca.customer_name || 'Customer',
                customerPhone: ca.customer_phone || '',
                customerEmail: ca.customer_email || '',
                serviceId: ca.service_id || 'srv_hair_1',
                serviceName: ca.service_name || 'Service',
                servicePrice: Number(ca.service_price || 0),
                serviceDuration: Number(ca.service_duration || 30),
                date: ca.appointment_date || ca.date,
                time: ca.appointment_time || ca.time || '10:00',
                endTime: ca.end_time,
                status: ca.status || 'confirmed',
                notes: ca.notes || '',
                stylistId: ca.stylist_id,
                stylistName: ca.stylist_name,
                cancellationReason: ca.cancellation_reason,
                cancelledAt: ca.cancelled_at,
                cancelledBy: ca.cancelled_by,
                internalNotes: ca.internal_notes || '',
                actualAmountCollected: ca.actual_amount_collected,
                paymentMethod: ca.payment_method,
                amountNotes: ca.amount_notes,
                createdAt: ca.created_at,
                updatedAt: ca.updated_at || ca.created_at
              };
              if (existingIdx !== -1) {
                db.appointments[existingIdx] = { ...db.appointments[existingIdx], ...mapped };
              } else {
                db.appointments.push(mapped);
              }
            } else if (ca.id && (ca.status === 'deleted' || deletedApptSet.has(ca.id) || (ca.booking_number && deletedBNumSet.has(ca.booking_number)))) {
              // Ensure removed from Supabase in background
              deleteAppointmentFromSupabase(ca.id, ca.booking_number).catch(() => null);
            }
          });
        }
      } catch (cloudErr: any) {
        console.warn('[Admin Appointments Supabase Merge Notice]:', cloudErr.message);
      }

      let list = db.appointments.filter((a) => a.id && !a.id.startsWith('__salon_'));

      if (date) {
        list = list.filter((a) => a.date === date);
      }

      if (status && status !== 'all') {
        list = list.filter((a) => a.status === status);
      }

      if (search) {
        const query = (search as string).toLowerCase().trim();
        list = list.filter(
          (a) =>
            a.customerName.toLowerCase().includes(query) ||
            a.customerPhone.includes(query) ||
            a.bookingNumber.toLowerCase().includes(query) ||
            a.serviceName.toLowerCase().includes(query)
        );
      }

      // Sort by actual booking-created timestamp, newest first (not by updatedAt or appointment date)
      list.sort((a, b) => {
        const timeA = new Date(a.createdAt || `${a.date}T${a.time}:00`).getTime();
        const timeB = new Date(b.createdAt || `${b.date}T${b.time}:00`).getTime();
        return timeB - timeA;
      });

      res.json(list);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Manual Appointment Creation (e.g., walk-in or phone call)
  app.post('/api/admin/appointments', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const appointment = await createBooking(req.body);
      const targetEmail = appointment.customerEmail || req.body.customerEmail;
      if (targetEmail) {
        try {
          const db = await getDb();
          await sendBookingCardEmail(targetEmail, appointment, db.settings);
        } catch (mailErr) {
          console.error('[Admin Appointment Booking Card Email Error]:', mailErr);
        }
      }
      res.status(201).json(appointment);
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Update Appointment (Status, Reschedule, Internal Notes)
  app.put('/api/admin/appointments/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      const index = db.appointments.findIndex((a) => a.id === id);

      if (index === -1) {
        res.status(404).json({ error: 'Appointment not found' });
        return;
      }

      const current = db.appointments[index];
      const previousStatus = current.status;
      const {
        status,
        date,
        time,
        internalNotes,
        notes,
        stylistId,
        stylistName,
        cancellationReason,
        reason,
        actualAmountCollected,
        paymentMethod,
        amountNotes
      } = req.body;
      let isRescheduled = false;

      // Rescheduling check
      if ((date && date !== current.date) || (time && time !== current.time)) {
        current.date = date || current.date;
        current.time = time || current.time;
        // recalculate end time
        const [h, m] = current.time.split(':').map(Number);
        const endMinutes = h * 60 + m + current.serviceDuration;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        current.endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        isRescheduled = true;
      }

      if (stylistId !== undefined) current.stylistId = stylistId;
      if (stylistName !== undefined) current.stylistName = stylistName;
      if (internalNotes !== undefined) current.internalNotes = internalNotes;
      if (notes !== undefined) current.notes = notes;
      if (actualAmountCollected !== undefined) {
        current.actualAmountCollected = actualAmountCollected === null ? undefined : Number(actualAmountCollected);
      }
      if (paymentMethod !== undefined) current.paymentMethod = paymentMethod;
      if (amountNotes !== undefined) current.amountNotes = amountNotes;

      const newStatus = status || current.status;
      const statusChanged = newStatus !== previousStatus;

      if (newStatus === 'cancelled' || newStatus === 'rejected') {
        current.status = 'cancelled';
        current.cancelledAt = new Date().toISOString();
        current.cancelledBy = 'admin';
        current.cancellationReason = cancellationReason || reason || internalNotes || (newStatus === 'rejected' ? 'Declined by salon admin' : 'Cancelled by salon admin');
      } else if (status) {
        current.status = status;
      }

      current.updatedAt = new Date().toISOString();

      // Log notification
      const notifMsg = `Tassel Unisex Salon: Appointment #${current.bookingNumber} for ${current.customerName} status updated from ${previousStatus} to ${current.status}.`;
      db.notificationsLog.push({
        id: `notif_${Date.now()}`,
        appointmentId: current.id,
        eventType: isRescheduled ? 'booking_rescheduled' : current.status === 'cancelled' ? 'booking_cancelled' : 'booking_confirmed',
        recipientPhone: current.customerPhone,
        recipientEmail: current.customerEmail,
        message: notifMsg,
        status: 'sent',
        provider: 'System',
        createdAt: new Date().toISOString()
      });

      await saveDb(db);

      // Sync updated appointment to Supabase synchronously
      try {
        await syncAppointmentToSupabase(current);
      } catch (err: any) {
        console.error('[Supabase Update Sync Error]:', err?.message);
      }

      // Dispatch Real Gmail SMTP Notifications on status transitions
      if (current.customerEmail) {
        if (newStatus === 'rejected') {
          sendBookingStatusUpdateEmail(current.customerEmail, current, 'rejected', current.cancellationReason, db.settings).catch(console.error);
        } else if (newStatus === 'cancelled' && statusChanged) {
          sendBookingStatusUpdateEmail(current.customerEmail, current, 'cancelled', current.cancellationReason, db.settings).catch(console.error);
        } else if (newStatus === 'confirmed' && statusChanged) {
          sendBookingStatusUpdateEmail(current.customerEmail, current, 'confirmed', undefined, db.settings).catch(console.error);
        } else if (newStatus === 'postponed' && statusChanged) {
          sendBookingStatusUpdateEmail(current.customerEmail, current, 'postponed', current.cancellationReason || `Postponed to ${current.date} at ${current.time}`, db.settings).catch(console.error);
        } else if (isRescheduled) {
          sendBookingStatusUpdateEmail(current.customerEmail, current, 'rescheduled', `Rescheduled to ${current.date} at ${current.time}`, db.settings).catch(console.error);
        }
      }

      // Record In-App Persistent Admin Notification
      if (statusChanged) {
        if (newStatus === 'cancelled') {
          recordAndDispatchAdminNotification(
            'cancelled',
            'Booking Cancelled by Admin',
            `Appointment #${current.bookingNumber} (${current.serviceName}) cancelled by admin. Reason: "${current.cancellationReason}". Reserved slot is now available.`,
            current.id,
            current.bookingNumber
          ).catch(console.error);
        } else if (newStatus === 'rejected') {
          recordAndDispatchAdminNotification(
            'rejected',
            'Booking Declined by Admin',
            `Appointment #${current.bookingNumber} (${current.serviceName}) was declined. Reason: "${current.cancellationReason}". Reserved slot released.`,
            current.id,
            current.bookingNumber
          ).catch(console.error);
        } else if (newStatus === 'confirmed') {
          recordAndDispatchAdminNotification(
            'confirmed',
            'Booking Confirmed',
            `Appointment #${current.bookingNumber} for ${current.customerName} was confirmed.`,
            current.id,
            current.bookingNumber
          ).catch(console.error);
        } else if (newStatus === 'postponed') {
          recordAndDispatchAdminNotification(
            'general',
            'Booking Postponed',
            `Appointment #${current.bookingNumber} for ${current.customerName} was postponed to ${current.date} at ${current.time}.`,
            current.id,
            current.bookingNumber
          ).catch(console.error);
        } else if (newStatus === 'completed') {
          const collectedDisplay = current.actualAmountCollected !== undefined ? ` Collected: ₹${current.actualAmountCollected}.` : '';
          recordAndDispatchAdminNotification(
            'general',
            'Booking Completed',
            `Appointment #${current.bookingNumber} for ${current.customerName} marked completed.${collectedDisplay} Listed: ₹${current.servicePrice}.`,
            current.id,
            current.bookingNumber
          ).catch(console.error);
        }
      } else if (isRescheduled) {
        recordAndDispatchAdminNotification(
          'rescheduled',
          'Booking Rescheduled',
          `Appointment #${current.bookingNumber} was rescheduled to ${current.date} at ${current.time}.`,
          current.id,
          current.bookingNumber
        ).catch(console.error);
      }

      res.json(current);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Appointment Permanently (Committed to Supabase and tracked in deletion registry)
  app.delete('/api/admin/appointments/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      const target = db.appointments.find((a) => a.id === id);
      const bookingNumber = target?.bookingNumber;

      // Add to deletion registry so it NEVER resurrects on container restart
      db.deletedAppointmentIds = db.deletedAppointmentIds || [];
      if (!db.deletedAppointmentIds.includes(id)) {
        db.deletedAppointmentIds.push(id);
      }
      if (bookingNumber) {
        db.deletedBookingNumbers = db.deletedBookingNumbers || [];
        if (!db.deletedBookingNumbers.includes(bookingNumber)) {
          db.deletedBookingNumbers.push(bookingNumber);
        }
      }

      db.appointments = db.appointments.filter((a) => a.id !== id && (!bookingNumber || a.bookingNumber !== bookingNumber));
      
      // Await permanent deletion in Supabase first
      await deleteAppointmentFromSupabase(id, bookingNumber);
      await saveDb(db);

      res.json({ success: true, message: `Appointment ${bookingNumber || id} deleted permanently.` });
    } catch (err: any) {
      console.error('[Supabase Delete Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Clear All Appointments (E.g. Clean slate / Delete all test & fake bookings)
  app.post('/api/admin/appointments/clear-all', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const count = db.appointments.length;
      const idsToDelete = db.appointments.map((a) => a.id);
      const bookingNumbersToDelete = db.appointments.map((a) => a.bookingNumber).filter(Boolean);

      db.deletedAppointmentIds = db.deletedAppointmentIds || [];
      idsToDelete.forEach((id) => {
        if (!db.deletedAppointmentIds!.includes(id)) db.deletedAppointmentIds!.push(id);
      });
      db.deletedBookingNumbers = db.deletedBookingNumbers || [];
      bookingNumbersToDelete.forEach((bNum) => {
        if (!db.deletedBookingNumbers!.includes(bNum)) db.deletedBookingNumbers!.push(bNum);
      });

      db.appointments = [];
      await clearAppointmentsFromSupabase(idsToDelete, bookingNumbersToDelete);
      await saveDb(db);
      res.json({ success: true, count, message: `Successfully deleted all ${count} bookings.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Media Upload Endpoint (Permanently stored across server sessions and restarts)
  app.post('/api/admin/upload-media', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { imageBase64, filename } = req.body;
      if (!imageBase64) {
        res.status(400).json({ error: 'imageBase64 content is required' });
        return;
      }

      const saved = await savePersistentMedia(filename || 'media', imageBase64);
      res.json({ success: true, url: saved.url, filename: saved.filename });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Media Library List Endpoint
  app.get('/api/admin/media', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const mediaList = getAllStoredMedia();
      res.json(mediaList);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Service Categories Management (Permanent in Supabase & Local DB)
  app.get('/api/admin/categories', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const sorted = [...(db.categories || [])].sort((a, b) => a.sortOrder - b.sortOrder);
      res.json(sorted);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/categories', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const { name, description } = req.body;
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Valid category name is required.' });
        return;
      }

      const trimmedName = name.trim();
      // Generate clean url-friendly slug
      const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `category-${Date.now()}`;
      
      const newCategory = {
        id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: trimmedName,
        slug,
        description: description?.trim() || '',
        sortOrder: (db.categories?.length || 0) + 1
      };

      if (!db.categories) {
        db.categories = [];
      }
      db.categories.push(newCategory);
      await saveDb(db);

      // Async sync to Supabase categories table
      try {
        await syncCategoriesToSupabase(db.categories);
      } catch (cloudErr: any) {
        console.warn('[Supabase Category Sync Notice]:', cloudErr?.message);
      }

      console.log(`[Admin] Successfully created custom category: "${newCategory.name}" (${newCategory.id})`);
      res.status(201).json(newCategory);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Services Management
  app.get('/api/admin/services', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    const db = await getDb();
    res.json(db.services);
  });

  app.post('/api/admin/services', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const { name, categoryId, description, price, priceType, minPrice, maxPrice, durationMinutes, imageUrl, isActive, isFeatured } = req.body;

      if (!name || !categoryId || !durationMinutes) {
        res.status(400).json({ error: 'Name, category, and duration are required.' });
        return;
      }

      const isRange = priceType === 'range';
      let finalPrice = 0;
      let finalMinPrice = 0;
      let finalMaxPrice = 0;
      const finalPriceType: 'exact' | 'range' = isRange ? 'range' : 'exact';

      if (isRange) {
        finalMinPrice = Number(minPrice !== undefined ? minPrice : price);
        finalMaxPrice = Number(maxPrice !== undefined ? maxPrice : (price !== undefined ? price : minPrice));

        if (isNaN(finalMinPrice) || finalMinPrice < 0 || isNaN(finalMaxPrice) || finalMaxPrice < 0) {
          res.status(400).json({ error: 'Minimum and maximum prices must be positive numbers.' });
          return;
        }

        if (finalMinPrice > finalMaxPrice) {
          res.status(400).json({ error: 'Minimum price cannot exceed maximum price.' });
          return;
        }

        finalPrice = finalMinPrice;
      } else {
        const rawPrice = price !== undefined ? price : minPrice;
        if (rawPrice === undefined) {
          res.status(400).json({ error: 'Price is required.' });
          return;
        }
        finalPrice = Number(rawPrice);
        if (isNaN(finalPrice) || finalPrice < 0) {
          res.status(400).json({ error: 'Price must be a valid positive number.' });
          return;
        }
        finalMinPrice = finalPrice;
        finalMaxPrice = finalPrice;
      }

      const newService = {
        id: `srv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        categoryId,
        name: name.trim(),
        description: description || '',
        price: finalPrice,
        priceType: finalPriceType,
        minPrice: finalMinPrice,
        maxPrice: finalMaxPrice,
        durationMinutes: Number(durationMinutes),
        imageUrl: imageUrl || '/src/assets/images/salon_hair_styling_1790779479714.jpg',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        isFeatured: Boolean(isFeatured),
        createdAt: new Date().toISOString()
      };

      db.services.push(newService);
      await saveDb(db);
      syncServicesToSupabase(db.services).catch(err => console.error('[Supabase AutoSync Services Error]:', err));
      res.status(201).json(newService);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/services/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      const index = db.services.findIndex((s) => s.id === id);

      if (index === -1) {
        res.status(404).json({ error: 'Service not found' });
        return;
      }

      const s = db.services[index];
      const { name, categoryId, description, price, priceType, minPrice, maxPrice, durationMinutes, imageUrl, isActive, isFeatured } = req.body;

      if (name !== undefined) s.name = name;
      if (categoryId !== undefined) s.categoryId = categoryId;
      if (description !== undefined) s.description = description;

      // Price and range handling
      const targetType = priceType !== undefined ? priceType : (s.priceType || 'exact');
      if (targetType === 'range') {
        const numMin = Number(minPrice !== undefined ? minPrice : (s.minPrice !== undefined ? s.minPrice : s.price));
        const numMax = Number(maxPrice !== undefined ? maxPrice : (s.maxPrice !== undefined ? s.maxPrice : s.price));

        if (isNaN(numMin) || numMin < 0 || isNaN(numMax) || numMax < 0) {
          res.status(400).json({ error: 'Minimum and maximum prices must be positive numbers.' });
          return;
        }

        if (numMin > numMax) {
          res.status(400).json({ error: 'Minimum price cannot exceed maximum price.' });
          return;
        }

        s.priceType = 'range';
        s.minPrice = numMin;
        s.maxPrice = numMax;
        s.price = numMin;
      } else {
        const rawPrice = price !== undefined ? price : (minPrice !== undefined ? minPrice : s.price);
        const numPrice = Number(rawPrice);
        if (isNaN(numPrice) || numPrice < 0) {
          res.status(400).json({ error: 'Price must be a valid positive number.' });
          return;
        }
        s.priceType = 'exact';
        s.price = numPrice;
        s.minPrice = numPrice;
        s.maxPrice = numPrice;
      }

      if (durationMinutes !== undefined) s.durationMinutes = Number(durationMinutes);
      if (imageUrl !== undefined) s.imageUrl = imageUrl;
      if (isActive !== undefined) s.isActive = Boolean(isActive);
      if (isFeatured !== undefined) s.isFeatured = Boolean(isFeatured);
      s.updatedAt = new Date().toISOString();

      await saveDb(db);
      syncServicesToSupabase(db.services).catch(err => console.error('[Supabase AutoSync Services Error]:', err));
      res.json(s);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/services/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      db.services = db.services.filter((s) => s.id !== id);
      await saveDb(db);
      syncServicesToSupabase(db.services).catch(err => console.error('[Supabase AutoSync Services Error]:', err));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Business Hours Management
  app.get('/api/admin/business-hours', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    const db = await getDb();
    res.json(db.businessHours);
  });

  app.put('/api/admin/business-hours', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const updatedHours = req.body.businessHours;

      if (!Array.isArray(updatedHours)) {
        res.status(400).json({ error: 'businessHours must be an array' });
        return;
      }

      db.businessHours = updatedHours;
      await saveDb(db);
      syncBusinessHoursToSupabase(db.businessHours).catch(err => console.error('[Supabase AutoSync Hours Error]:', err));
      res.json(db.businessHours);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Blocked Dates Management
  app.get('/api/admin/blocked-dates', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    const db = await getDb();
    res.json(db.blockedDates);
  });

  app.post('/api/admin/blocked-dates', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const { date, reason, allDay, startTime, endTime } = req.body;

      if (!date || !reason) {
        res.status(400).json({ error: 'date and reason are required' });
        return;
      }

      const newBlock = {
        id: `blk_${Date.now()}`,
        date,
        reason: reason.trim(),
        allDay: Boolean(allDay),
        startTime: allDay ? undefined : startTime,
        endTime: allDay ? undefined : endTime,
        createdAt: new Date().toISOString()
      };

      db.blockedDates.push(newBlock);
      await saveDb(db);
      syncBlockedDatesToSupabase(db.blockedDates).catch(err => console.error('[Supabase AutoSync BlockedDates Error]:', err));
      res.status(201).json(newBlock);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/blocked-dates/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      db.blockedDates = db.blockedDates.filter((b) => b.id !== id);
      await saveDb(db);
      syncBlockedDatesToSupabase(db.blockedDates).catch(err => console.error('[Supabase AutoSync BlockedDates Error]:', err));
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Customers Management (Only users who had login or signup will show as Customer)
  app.get('/api/admin/customers', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const deletedCustSet = new Set(db.deletedCustomerIds || []);
      const deletedPhoneSet = new Set(db.deletedCustomerPhones || []);
      const deletedEmailSet = new Set(db.deletedCustomerEmails || []);

      // Filter local db.customers first against tombstones
      db.customers = (db.customers || []).filter((c) => {
        if (deletedCustSet.has(c.id)) return false;
        const cDigits = c.phone ? c.phone.replace(/\D/g, '').slice(-10) : '';
        if (cDigits && deletedPhoneSet.has(cDigits)) return false;
        const cEmail = c.email ? c.email.trim().toLowerCase() : '';
        if (cEmail && deletedEmailSet.has(cEmail)) return false;
        return true;
      });

      // Deduplicate local customers by 10-digit phone number
      const uniqueMap = new Map<string, Customer>();
      db.customers.forEach((c) => {
        const cDigits = c.phone ? c.phone.replace(/\D/g, '').slice(-10) : c.id;
        if (!uniqueMap.has(cDigits)) {
          uniqueMap.set(cDigits, c);
        } else {
          const existing = uniqueMap.get(cDigits)!;
          existing.totalBookings = Math.max(existing.totalBookings || 1, c.totalBookings || 1);
          if (c.lastBookingDate && (!existing.lastBookingDate || c.lastBookingDate > existing.lastBookingDate)) {
            existing.lastBookingDate = c.lastBookingDate;
          }
        }
      });
      db.customers = Array.from(uniqueMap.values());

      // Pull latest persistent customer records directly from Supabase
      try {
        const cloudCustomers = await fetchSupabaseCustomers();
        if (Array.isArray(cloudCustomers) && cloudCustomers.length > 0) {
          cloudCustomers.forEach((cc: any) => {
            if (!cc.id) return;
            const ccPhone = cc.phone ? String(cc.phone).trim() : '';
            const ccDigits = ccPhone.replace(/\D/g, '').slice(-10);
            const ccEmail = cc.email ? String(cc.email).trim().toLowerCase() : '';

            // If tombstoned as deleted, do NOT re-import! Clean up in Supabase
            if (
              deletedCustSet.has(cc.id) ||
              (ccDigits && deletedPhoneSet.has(ccDigits)) ||
              (ccEmail && deletedEmailSet.has(ccEmail))
            ) {
              deleteCustomerFromSupabase(cc.id, ccPhone, ccEmail).catch(() => null);
              return;
            }

            const existingIdx = db.customers.findIndex(
              (c) => c.id === cc.id || (ccDigits && c.phone.replace(/\D/g, '').endsWith(ccDigits))
            );
            if (existingIdx !== -1) {
              db.customers[existingIdx].name = cc.name || db.customers[existingIdx].name;
              db.customers[existingIdx].totalBookings = cc.total_bookings ?? db.customers[existingIdx].totalBookings;
              db.customers[existingIdx].lastBookingDate = cc.last_booking_date || db.customers[existingIdx].lastBookingDate;
              db.customers[existingIdx].isRegistered = true;
              db.customers[existingIdx].isVerified = true;
            } else {
              db.customers.push({
                id: cc.id,
                name: cc.name,
                phone: ccPhone,
                email: cc.email || undefined,
                totalBookings: cc.total_bookings || 1,
                lastBookingDate: cc.last_booking_date || undefined,
                createdAt: cc.created_at || new Date().toISOString(),
                isRegistered: true,
                isVerified: true,
                notes: ''
              });
            }
          });
        }
      } catch (err: any) {
        console.warn('[Admin Customers Supabase Merge Notice]:', err.message);
      }

      const registeredOnly = db.customers.filter(
        (c) => (c.isRegistered || c.isVerified)
      );
      res.json(registeredOnly);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/customers/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      const customer = db.customers.find((c) => c.id === id);
      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }
      const { name, phone, email, notes } = req.body;
      if (name) customer.name = name;
      if (phone) customer.phone = phone;
      if (email !== undefined) customer.email = email;
      if (notes !== undefined) customer.notes = notes;

      await saveDb(db);
      res.json(customer);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete Individual Customer Record
  app.delete('/api/admin/customers/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      const customer = db.customers.find((c) => c.id === id);
      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      const rawPhone = customer.phone ? String(customer.phone).trim() : '';
      const digits = rawPhone.replace(/\D/g, '').slice(-10);
      const email = customer.email ? String(customer.email).trim().toLowerCase() : '';

      // Find ALL duplicate records of this customer in local database
      const matchingLocalCustomers = db.customers.filter((c) => {
        if (c.id === id) return true;
        const cDigits = c.phone ? c.phone.replace(/\D/g, '').slice(-10) : '';
        if (digits && cDigits && cDigits === digits) return true;
        const cEmail = c.email ? c.email.trim().toLowerCase() : '';
        if (email && cEmail && cEmail === email) return true;
        return false;
      });
      const allTargetIds = Array.from(new Set([id, ...matchingLocalCustomers.map((c) => c.id)]));

      const { cascadeBookings, force } = req.query;
      const linkedAppointments = db.appointments.filter(
        (a) =>
          allTargetIds.includes(a.customerId || '') ||
          (digits && a.customerPhone && a.customerPhone.replace(/\D/g, '').endsWith(digits))
      );

      const activeBookings = linkedAppointments.filter(
        (a) => a.status === 'confirmed' || a.status === 'pending' || a.status === 'postponed'
      );

      if (activeBookings.length > 0 && cascadeBookings !== 'true' && force !== 'true') {
        res.status(400).json({
          error: 'CLIENT_HAS_ACTIVE_BOOKINGS',
          message: `Client "${customer.name}" (${customer.phone}) has ${activeBookings.length} active appointment(s): ${activeBookings.map((b) => '#' + b.bookingNumber).join(', ')}. Please confirm if you wish to delete both the client and linked bookings, or cancel the bookings first.`,
          activeBookingsCount: activeBookings.length,
          activeBookingRefs: activeBookings.map((b) => b.bookingNumber)
        });
        return;
      }

      // If cascadeBookings is requested, permanently delete linked bookings
      if (cascadeBookings === 'true' && linkedAppointments.length > 0) {
        const apptIds = linkedAppointments.map((a) => a.id);
        const bNums = linkedAppointments.map((a) => a.bookingNumber).filter(Boolean);
        db.deletedAppointmentIds = db.deletedAppointmentIds || [];
        apptIds.forEach((aId) => {
          if (!db.deletedAppointmentIds!.includes(aId)) db.deletedAppointmentIds!.push(aId);
        });
        db.deletedBookingNumbers = db.deletedBookingNumbers || [];
        bNums.forEach((bn) => {
          if (!db.deletedBookingNumbers!.includes(bn)) db.deletedBookingNumbers!.push(bn);
        });
        db.appointments = db.appointments.filter((a) => !apptIds.includes(a.id));
        for (const appt of linkedAppointments) {
          deleteAppointmentFromSupabase(appt.id, appt.bookingNumber).catch(console.error);
        }
      }

      // Track in deletion registries
      db.deletedCustomerIds = db.deletedCustomerIds || [];
      allTargetIds.forEach((tId) => {
        if (!db.deletedCustomerIds!.includes(tId)) {
          db.deletedCustomerIds!.push(tId);
        }
      });

      if (digits) {
        db.deletedCustomerPhones = db.deletedCustomerPhones || [];
        if (!db.deletedCustomerPhones.includes(digits)) {
          db.deletedCustomerPhones.push(digits);
        }
      }

      if (email) {
        db.deletedCustomerEmails = db.deletedCustomerEmails || [];
        if (!db.deletedCustomerEmails.includes(email)) {
          db.deletedCustomerEmails.push(email);
        }
      }

      // Filter out all matching records from local database
      db.customers = db.customers.filter((c) => {
        if (allTargetIds.includes(c.id)) return false;
        const cDigits = c.phone ? c.phone.replace(/\D/g, '').slice(-10) : '';
        if (digits && cDigits && cDigits === digits) return false;
        const cEmail = c.email ? c.email.trim().toLowerCase() : '';
        if (email && cEmail && cEmail === email) return false;
        return true;
      });

      // Synchronize deletion with Supabase cloud table
      const supaResult = await deleteCustomerFromSupabase(id, rawPhone, email);
      if (supaResult.deletedIds && supaResult.deletedIds.length > 0) {
        supaResult.deletedIds.forEach((sId) => {
          if (!db.deletedCustomerIds!.includes(sId)) db.deletedCustomerIds!.push(sId);
        });
      }

      await saveDb(db);

      res.json({
        success: true,
        message: `Client "${customer.name}" and all duplicate records have been permanently removed.`
      });
    } catch (err: any) {
      console.error('[Admin Customer Delete Error]:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Reviews Management (Admin Moderate & Genuine Google Maps Entry)
  app.get('/api/admin/reviews', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    const db = await getDb();
    const sorted = [...(db.reviews || [])].sort((a, b) => {
      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();
      return timeB - timeA;
    });
    res.json(sorted);
  });

  app.post('/api/admin/reviews', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const { authorName, rating, reviewText, reviewDate, source, isVerified, isFeatured, status, sourceUrl } = req.body;
      if (!authorName || !String(authorName).trim()) {
        res.status(400).json({ error: "Author's displayed name is required." });
        return;
      }
      const numRating = Number(rating);
      if (!numRating || numRating < 1 || numRating > 5) {
        res.status(400).json({ error: 'Star rating must be between 1 and 5.' });
        return;
      }
      if (!reviewText || !String(reviewText).trim()) {
        res.status(400).json({ error: 'Review text is required.' });
        return;
      }

      const cleanSource = source && String(source).trim() ? String(source).trim() : 'Google Maps';
      const cleanDate = reviewDate ? String(reviewDate).trim() : 'Recent';

      const newReview: Review = {
        id: `rev_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        authorName: String(authorName).trim(),
        rating: Math.min(5, Math.max(1, Math.round(numRating))),
        reviewText: String(reviewText).trim(),
        reviewDate: cleanDate,
        source: cleanSource,
        status: ['approved', 'pending', 'rejected', 'hidden'].includes(status) ? status : 'approved',
        isVerified: Boolean(isVerified),
        isFeatured: Boolean(isFeatured),
        sourceUrl: sourceUrl ? String(sourceUrl).trim() : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.reviews = db.reviews || [];
      db.reviews.unshift(newReview);
      await saveDb(db);

      syncReviewToSupabase(newReview).catch((err) => {
        console.warn('[Supabase Sync Review Warning]:', err?.message);
      });

      res.status(201).json(newReview);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/reviews/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const rev = (db.reviews || []).find((r) => r.id === req.params.id);
      if (!rev) {
        res.status(404).json({ error: 'Review not found.' });
        return;
      }

      const { authorName, rating, reviewText, reviewDate, source, isVerified, isFeatured, status, sourceUrl } = req.body;
      if (authorName !== undefined) rev.authorName = String(authorName).trim();
      if (rating !== undefined) {
        const num = Number(rating);
        if (num >= 1 && num <= 5) rev.rating = Math.round(num);
      }
      if (reviewText !== undefined) rev.reviewText = String(reviewText).trim();
      if (reviewDate !== undefined) rev.reviewDate = String(reviewDate).trim() || 'Recent';
      if (source !== undefined) rev.source = String(source).trim() || 'Google Maps';
      if (isVerified !== undefined) rev.isVerified = Boolean(isVerified);
      if (isFeatured !== undefined) rev.isFeatured = Boolean(isFeatured);
      if (status !== undefined) rev.status = status;
      if (sourceUrl !== undefined) rev.sourceUrl = sourceUrl ? String(sourceUrl).trim() : undefined;
      rev.updatedAt = new Date().toISOString();

      await saveDb(db);
      syncReviewToSupabase(rev).catch(() => {});

      res.json(rev);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  const handleReviewStatusUpdate = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const rev = (db.reviews || []).find((r) => r.id === req.params.id);
      if (!rev) {
        res.status(404).json({ error: 'Review not found.' });
        return;
      }

      const { status } = req.body;
      if (!status || !['approved', 'pending', 'rejected', 'hidden'].includes(status)) {
        res.status(400).json({ error: 'Valid status required: approved, pending, rejected, or hidden.' });
        return;
      }

      rev.status = status;
      rev.updatedAt = new Date().toISOString();
      await saveDb(db);
      syncReviewToSupabase(rev).catch(() => {});

      res.json({ success: true, review: rev });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  };

  app.patch('/api/admin/reviews/:id/status', requireAdminAuth, handleReviewStatusUpdate);
  app.put('/api/admin/reviews/:id/status', requireAdminAuth, handleReviewStatusUpdate);

  app.delete('/api/admin/reviews/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      db.reviews = (db.reviews || []).filter((r) => r.id !== req.params.id);
      await saveDb(db);
      deleteSupabaseReview(req.params.id).catch(() => {});
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Gallery Management
  app.get('/api/admin/gallery', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    const db = await getDb();
    res.json(db.galleryItems);
  });

  app.post('/api/admin/gallery', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const { title, category, imageUrl, description, isFeatured } = req.body;
      const newItem = {
        id: `gal_${Date.now()}`,
        title: title.trim(),
        category,
        imageUrl,
        description,
        isFeatured: Boolean(isFeatured)
      };
      db.galleryItems.push(newItem);
      await saveDb(db);
      res.status(201).json(newItem);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/gallery/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      const index = db.galleryItems.findIndex((g) => g.id === id);
      if (index === -1) {
        res.status(404).json({ error: 'Gallery photo not found' });
        return;
      }
      const item = db.galleryItems[index];
      const { title, category, imageUrl, description, isFeatured } = req.body;
      if (title !== undefined) item.title = title.trim();
      if (category !== undefined) item.category = category;
      if (imageUrl !== undefined) item.imageUrl = imageUrl;
      if (description !== undefined) item.description = description;
      if (isFeatured !== undefined) item.isFeatured = Boolean(isFeatured);

      await saveDb(db);
      res.json(item);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/gallery/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      db.galleryItems = db.galleryItems.filter((g) => g.id !== req.params.id);
      await saveDb(db);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Staff & Stylists Management
  app.get('/api/admin/staff', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      res.json(db.staff || []);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/staff', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const { name, role, specialties, experienceYears, rating, bio, imageUrl, phone, isActive } = req.body;
      if (!name || !role) {
        res.status(400).json({ error: 'Staff member name and role are required.' });
        return;
      }

      const newMember: StaffMember = {
        id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        name: String(name).trim(),
        role: String(role).trim(),
        specialties: Array.isArray(specialties) ? specialties : (specialties ? String(specialties).split(',').map((s: string) => s.trim()) : []),
        experienceYears: Number(experienceYears) || 1,
        rating: Number(rating) || 5.0,
        bio: String(bio || '').trim(),
        imageUrl: String(imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80').trim(),
        phone: phone ? String(phone).trim() : '+91 78800 86990',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      if (!db.staff) db.staff = [];
      db.staff.push(newMember);
      await saveDb(db);
      res.status(201).json(newMember);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/staff/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const index = (db.staff || []).findIndex((s) => s.id === req.params.id);
      if (index === -1) {
        res.status(404).json({ error: 'Staff member not found.' });
        return;
      }

      const member = db.staff[index];
      const { name, role, specialties, experienceYears, rating, bio, imageUrl, phone, isActive } = req.body;
      if (name !== undefined) member.name = String(name).trim();
      if (role !== undefined) member.role = String(role).trim();
      if (specialties !== undefined) {
        member.specialties = Array.isArray(specialties) ? specialties : String(specialties).split(',').map((s: string) => s.trim());
      }
      if (experienceYears !== undefined) member.experienceYears = Number(experienceYears);
      if (rating !== undefined) member.rating = Number(rating);
      if (bio !== undefined) member.bio = String(bio).trim();
      if (imageUrl !== undefined) member.imageUrl = String(imageUrl).trim();
      if (phone !== undefined) member.phone = String(phone).trim();
      if (isActive !== undefined) member.isActive = Boolean(isActive);
      member.updatedAt = new Date().toISOString();

      await saveDb(db);
      res.json(member);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/staff/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      db.staff = (db.staff || []).filter((s) => s.id !== req.params.id);
      await saveDb(db);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Settings Management
  app.get('/api/admin/settings', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    const db = await getDb();
    res.json(db.settings);
  });

  app.put('/api/admin/settings', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      db.settings = { ...db.settings, ...req.body };
      await saveDb(db);
      resetTransporter();
      try {
        await syncSettingsToSupabase(db.settings);
      } catch (err) {
        console.error('[Supabase AutoSync Settings Error]:', err);
      }
      res.json(db.settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin Test Email Dispatch
  app.post('/api/admin/test-email', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { targetEmail } = req.body;
      const db = await getDb();
      const target = (targetEmail || req.adminUser?.email || db.settings.email || '').trim();
      if (!target) {
        res.status(400).json({ error: 'Target email is required for test dispatch' });
        return;
      }
      const testResult = await testGmailDelivery(target, db.settings);
      res.json(testResult);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // Notification Logs
  app.get('/api/admin/notifications-log', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    const db = await getDb();
    const deletedSet = new Set(db.deletedLogIds || []);
    const clearedTime = db.logsClearedAt ? new Date(db.logsClearedAt).getTime() : 0;
    const filtered = (db.notificationsLog || []).filter((l) => {
      if (deletedSet.has(l.id)) return false;
      if (clearedTime && new Date(l.createdAt).getTime() <= clearedTime) return false;
      return true;
    });
    db.notificationsLog = filtered;
    const sorted = [...filtered].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    res.json(sorted);
  });

  app.delete('/api/admin/notifications-log/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      db.notificationsLog = (db.notificationsLog || []).filter((l) => l.id !== id);
      db.deletedLogIds = db.deletedLogIds || [];
      if (!db.deletedLogIds.includes(id)) {
        db.deletedLogIds.push(id);
      }
      await saveDb(db);
      res.json({ success: true, message: 'Log entry permanently deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/api/admin/notifications-log', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      db.deletedLogIds = db.deletedLogIds || [];
      (db.notificationsLog || []).forEach((l) => {
        if (!db.deletedLogIds!.includes(l.id)) {
          db.deletedLogIds!.push(l.id);
        }
      });
      db.notificationsLog = [];
      db.logsClearedAt = new Date().toISOString();
      await saveDb(db);
      res.json({ success: true, message: 'All notification logs permanently deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Persistent Admin Notifications (Supabase + Local Database)
  app.get('/api/admin/notifications', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      let notifs = db.adminNotifications || [];
      const deletedSet = new Set(db.deletedNotificationIds || []);
      const clearedTime = db.notificationsClearedAt ? new Date(db.notificationsClearedAt).getTime() : 0;

      // Filter out locally deleted notification IDs and cleared timestamps
      notifs = notifs.filter((n) => {
        if (deletedSet.has(n.id)) return false;
        if (clearedTime && new Date(n.createdAt).getTime() <= clearedTime) return false;
        return true;
      });

      // Try hydrating from Supabase cloud notifications if available
      try {
        const cloudNotifs = await fetchSupabaseAdminNotifications();
        if (cloudNotifs && cloudNotifs.length > 0) {
          const map = new Map<string, AdminNotification>();
          notifs.forEach((n) => map.set(n.id, n));
          cloudNotifs.forEach((cn) => {
            const isTombstoned =
              deletedSet.has(cn.id) ||
              (clearedTime > 0 && new Date(cn.createdAt).getTime() <= clearedTime);

            if (!isTombstoned) {
              if (map.has(cn.id)) {
                const local = map.get(cn.id)!;
                map.set(cn.id, { ...local, isRead: local.isRead || cn.isRead });
              } else {
                map.set(cn.id, cn);
              }
            } else {
              deleteSupabaseAdminNotification(cn.id).catch(() => null);
            }
          });
          notifs = Array.from(map.values());
        }
      } catch {
        // Fall back cleanly to local
      }

      db.adminNotifications = notifs;
      notifs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const unreadCount = notifs.filter((n) => !n.isRead).length;

      res.json({
        notifications: notifs.slice(0, 60),
        unreadCount
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/notifications/:id/read', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      db.adminNotifications = db.adminNotifications || [];
      const target = db.adminNotifications.find((n) => n.id === id);
      if (target) {
        target.isRead = true;
        await saveDb(db);
      }
      markSupabaseNotificationRead(id).catch(console.error);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/notifications/mark-all-read', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      db.adminNotifications = (db.adminNotifications || []).map((n) => ({ ...n, isRead: true }));
      await saveDb(db);
      markAllSupabaseNotificationsRead().catch(console.error);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Permanently delete a single admin notification
  app.delete('/api/admin/notifications/:id', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const id = req.params.id;
      db.adminNotifications = (db.adminNotifications || []).filter((n) => n.id !== id);
      db.deletedNotificationIds = db.deletedNotificationIds || [];
      if (!db.deletedNotificationIds.includes(id)) {
        db.deletedNotificationIds.push(id);
      }
      await deleteSupabaseAdminNotification(id);
      await saveDb(db);
      res.json({ success: true, message: 'Notification permanently erased' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Permanently delete all or read-only admin notifications
  app.delete('/api/admin/notifications', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const onlyRead = req.query.onlyRead === 'true';
      db.deletedNotificationIds = db.deletedNotificationIds || [];

      if (onlyRead) {
        const readIds = (db.adminNotifications || []).filter((n) => n.isRead).map((n) => n.id);
        readIds.forEach((id) => {
          if (!db.deletedNotificationIds!.includes(id)) {
            db.deletedNotificationIds!.push(id);
          }
        });
        db.adminNotifications = (db.adminNotifications || []).filter((n) => !n.isRead);
        await deleteAllSupabaseAdminNotifications(true);
        await saveDb(db);
        res.json({ success: true, message: 'All read notifications permanently erased' });
      } else {
        const allIds = (db.adminNotifications || []).map((n) => n.id);
        allIds.forEach((id) => {
          if (!db.deletedNotificationIds!.includes(id)) {
            db.deletedNotificationIds!.push(id);
          }
        });

        // Also query Supabase to record any extra notification IDs currently in the cloud
        try {
          const client = getSupabase();
          if (client) {
            const { data: cloudRows } = await client.from('admin_notifications').select('id');
            if (Array.isArray(cloudRows)) {
              cloudRows.forEach((r: any) => {
                if (r.id && !db.deletedNotificationIds!.includes(r.id)) {
                  db.deletedNotificationIds!.push(r.id);
                }
              });
            }
          }
        } catch {}

        db.adminNotifications = [];
        db.notificationsClearedAt = new Date().toISOString();
        await deleteAllSupabaseAdminNotifications(false);
        await saveDb(db);
        res.json({ success: true, message: 'All notifications permanently erased' });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // EMAIL ACCOUNTS & SALON OWNERSHIP HANDOVER HUB
  // ---------------------------------------------------------------------------
  app.get('/api/admin/email-hub', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const primaryAdmin = db.adminUsers && db.adminUsers[0];
      res.json({
        bookingAlertEmail: db.settings.adminNotificationEmail || '',
        adminLoginEmail: primaryAdmin ? primaryAdmin.email : '',
        adminUsername: primaryAdmin ? primaryAdmin.username : '',
        adminUsers: (db.adminUsers || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          role: u.role || 'Super Admin',
          createdAt: u.createdAt || ''
        })),
        publicContactEmail: db.settings.email || '',
        smtpUser: db.settings.gmailUser || '',
        smtpConfigured: Boolean(db.settings.gmailUser && db.settings.gmailAppPassword)
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/api/admin/email-hub', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const {
        bookingAlertEmail,
        adminLoginEmail,
        publicContactEmail,
        smtpUser,
        smtpPassword,
        // Handover / Transfer to New Salon Owner parameters
        handoverOwnerEmail,
        handoverOwnerName,
        handoverBookingAlert,
        handoverPublicContact,
        handoverAdminLogin,
        handoverSmtpUser
      } = req.body;

      // Check if this is a bulk Handover to New Salon Owner
      if (handoverOwnerEmail && typeof handoverOwnerEmail === 'string' && handoverOwnerEmail.trim().length > 3) {
        const cleanOwnerEmail = handoverOwnerEmail.trim().toLowerCase();
        const updatedRoles: string[] = [];

        if (handoverBookingAlert) {
          db.settings.adminNotificationEmail = cleanOwnerEmail;
          updatedRoles.push('Booking Updates & Reservation Alert Email');
        }
        if (handoverPublicContact) {
          db.settings.email = cleanOwnerEmail;
          updatedRoles.push('Public Salon Contact Email');
        }
        if (handoverAdminLogin) {
          if (db.adminUsers && db.adminUsers.length > 0) {
            db.adminUsers[0].email = cleanOwnerEmail;
            if (handoverOwnerName && handoverOwnerName.trim()) {
              db.adminUsers[0].username = handoverOwnerName.trim();
            }
          }
          updatedRoles.push('Primary Administrator Login & Account Email');
        }
        if (handoverSmtpUser) {
          db.settings.gmailUser = cleanOwnerEmail;
          if (smtpPassword && String(smtpPassword).trim() !== '') {
            db.settings.gmailAppPassword = String(smtpPassword).trim();
          }
          updatedRoles.push('Live Gmail SMTP Dispatcher');
        }

        await saveDb(db);
        syncSettingsToSupabase(db.settings).catch(console.error);

        // Record persistent notification
        await recordAndDispatchAdminNotification(
          'general',
          'Salon Ownership Handover Applied',
          `Transferred the following email roles to new owner (${cleanOwnerEmail}): ${updatedRoles.join(', ')}.`
        );

        res.json({
          success: true,
          message: `Ownership successfully transferred! ${updatedRoles.length} email roles reassigned to ${cleanOwnerEmail}.`,
          updatedRoles
        });
        return;
      }

      // Standard granular update
      if (bookingAlertEmail !== undefined) {
        db.settings.adminNotificationEmail = String(bookingAlertEmail).trim().toLowerCase();
      }
      if (publicContactEmail !== undefined) {
        db.settings.email = String(publicContactEmail).trim().toLowerCase();
      }
      if (smtpUser !== undefined) {
        db.settings.gmailUser = String(smtpUser).trim().toLowerCase();
      }
      if (smtpPassword !== undefined && String(smtpPassword).trim() !== '') {
        db.settings.gmailAppPassword = String(smtpPassword).trim();
      }

      if (adminLoginEmail !== undefined && String(adminLoginEmail).trim() !== '') {
        const cleanLoginEmail = String(adminLoginEmail).trim().toLowerCase();
        if (db.adminUsers && db.adminUsers.length > 0) {
          db.adminUsers[0].email = cleanLoginEmail;
        }
      }

      await saveDb(db);
      syncSettingsToSupabase(db.settings).catch(console.error);

      res.json({
        success: true,
        message: 'All email account roles updated and saved permanently to database & Supabase!'
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/admin/test-booking-alert', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const target = req.body.targetEmail || getAllottedBookingAlertEmail(db);
      if (!target) {
        res.status(400).json({ error: 'No booking alert email address is configured.' });
        return;
      }
      const dummyAppt: any = {
        id: `test_${Date.now()}`,
        bookingNumber: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
        customerName: 'Priya Sharma (Sample Client)',
        customerPhone: '+91 98260 12345',
        customerEmail: 'client.sample@gmail.com',
        serviceId: 'srv_hair_1',
        serviceName: 'Men’s Signature Haircut & Styling',
        servicePrice: 350,
        serviceDuration: '30 mins',
        date: new Date().toISOString().split('T')[0],
        time: '14:30',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      };
      const result = await sendAdminBookingAlertEmail(target, dummyAppt, db.settings);
      res.json({
        success: result.sent,
        message: result.sent
          ? `Test booking alert email successfully dispatched to ${target}!`
          : `Failed to send test email: ${result.error || 'Check SMTP settings'}`,
        isLiveSmtp: result.isLiveSmtp,
        messageId: result.messageId
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Supabase Backend Status & Configuration (Protected)
  app.get('/api/admin/supabase-status', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const status = await testSupabaseConnection();
      const sql = getSupabaseMigrationSql();
      const upgradeSql = getSupabaseUpgradeSql();
      res.json({
        ...status,
        migrationSql: sql,
        upgradeSql
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Supabase Sync All Existing Bookings & Reviews
  app.post('/api/admin/supabase-sync-all', requireAdminAuth, async (req: AuthenticatedRequest, res: Response) => {
    try {
      const db = await getDb();
      const results = [];
      for (const appt of db.appointments) {
        const res = await syncAppointmentToSupabase(appt);
        results.push({ bookingNumber: appt.bookingNumber, ...res });
      }
      for (const rev of (db.reviews || [])) {
        await syncReviewToSupabase(rev);
      }
      res.json({ success: true, count: results.length, details: results });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ---------------------------------------------------------------------------
  // VITE DEV MIDDLEWARE OR PRODUCTION STATIC SERVING
  // ---------------------------------------------------------------------------
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      // Never return index.html for API requests or asset files
      if (
        req.originalUrl.startsWith('/api') ||
        req.originalUrl.startsWith('/assets') ||
        req.originalUrl.startsWith('/src/assets') ||
        /\.(css|js|map|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot|ico|json)$/i.test(req.originalUrl)
      ) {
        return next();
      }
      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(rootDir, 'index.html');
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res
          .status(200)
          .set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          })
          .end(template);
      } catch (e: any) {
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(rootDir, 'dist');
    const distAssets = path.join(distPath, 'assets');

    // 1. Explicitly serve immutable hashed production build assets with 1y cache
    if (fs.existsSync(distAssets)) {
      app.use('/assets', express.static(distAssets, {
        maxAge: '1y',
        immutable: true,
        fallthrough: true
      }));
    }

    // 2. Static public uploads and images
    app.use('/assets/uploads', express.static(uploadsDir, { maxAge: '1y', immutable: true, fallthrough: true }));
    app.use('/assets/images', express.static(publicAssetsImages, { maxAge: '7d', fallthrough: true }));
    app.use('/assets', express.static(publicAssets, { maxAge: '7d', fallthrough: true }));

    // 3. Stale cache fallback for Android / mobile browsers requesting outdated asset hashes:
    // If a cached index.html requests an old CSS hash that was deleted during a new build,
    // serve the currently active CSS file so the site NEVER appears unstyled!
    app.get('/assets/*.css', (req: Request, res: Response, next) => {
      try {
        if (fs.existsSync(distAssets)) {
          const cssFiles = fs.readdirSync(distAssets).filter(f => f.endsWith('.css'));
          if (cssFiles.length > 0) {
            const activeCss = path.join(distAssets, cssFiles[0]);
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=300');
            return res.sendFile(activeCss);
          }
        }
      } catch {}
      next();
    });

    // 4. Static assets from dist folder, BUT index.html must never be served with 1h cache
    app.use(express.static(distPath, { index: false, maxAge: '1h', fallthrough: true }));

    // 5. Strict 404 handler for missing static assets to prevent HTML MIME type errors
    app.use(['/assets', '/src'], (req: Request, res: Response) => {
      res.status(404).type('text/plain').send('Asset not found');
    });

    // 6. Catch-all SPA route with strict no-cache headers for index.html
    app.get('*', (req: Request, res: Response) => {
      if (
        req.path.startsWith('/api') ||
        req.path.startsWith('/assets') ||
        req.path.startsWith('/src') ||
        /\.(css|js|map|png|jpg|jpeg|gif|webp|svg|woff2?|ttf|eot|ico|json)$/i.test(req.path)
      ) {
        return res.status(404).type('text/plain').send('Not found');
      }
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Tassel Unisex Salon server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
