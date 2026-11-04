import fs from 'fs';
import path from 'path';

const DB_FILE = path.join(process.cwd(), 'data', 'salon_db.json');

function getLatestOtp(email: string): string | null {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(raw);
    const logs = db.notificationsLog || [];
    for (let i = logs.length - 1; i >= 0; i--) {
      const log = logs[i];
      if (log.recipientEmail && log.recipientEmail.toLowerCase() === email.toLowerCase()) {
        const match = log.message.match(/\b\d{6}\b/);
        if (match) return match[0];
      }
    }
  } catch (e) {
    console.error('Error reading OTP from DB:', e);
  }
  return null;
}

async function api(pathUrl: string, options: any = {}) {
  const url = `http://localhost:3000${pathUrl}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  let body: any;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}

async function run() {
  console.log('===========================================================');
  console.log('  TASSEL UNISEX SALON - REAL AUTOMATED TEST SUITE EXECUTION ');
  console.log('===========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail || 'Failed'}`);
      failed++;
    }
  }

  const testEmail = `priya.sharma.${Date.now()}@gmail.com`;
  const testPhone = '9826019999';
  const testPassword = 'Password123!';
  const testName = 'Priya Sharma';

  // ---------------------------------------------------------
  // 1. CUSTOMER REGISTRATION VIA REAL GMAIL OTP
  // ---------------------------------------------------------
  console.log('--- 1. Testing Customer Registration via OTP ---');
  const otpRes = await api('/api/public/send-otp', {
    method: 'POST',
    body: JSON.stringify({ target: testEmail, type: 'email' })
  });
  assert(otpRes.status === 200, 'OTP request succeeds with 200 OK');

  const customerOtp = getLatestOtp(testEmail);
  assert(Boolean(customerOtp), `Retrieved generated verification code for ${testEmail}: ${customerOtp}`);

  const signupRes = await api('/api/customer/signup', {
    method: 'POST',
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      phone: testPhone,
      password: testPassword,
      otpCode: customerOtp
    })
  });
  assert(signupRes.status === 201, 'Customer signup with verified OTP returns 201 Created');
  assert(Boolean(signupRes.body?.token), 'Customer signup returns active session token');
  assert(signupRes.body?.customer?.isVerified === true, 'Customer is marked as verified');
  const customerToken = signupRes.body?.token;
  const customerId = signupRes.body?.customer?.id;

  // ---------------------------------------------------------
  // 2. SESSION VERIFICATION & AUTH SYNCHRONIZATION
  // ---------------------------------------------------------
  console.log('\n--- 2. Testing Session Verification & Auth State Sync ---');
  const meAuthRes = await api('/api/customer/me', {
    headers: { 'x-customer-token': customerToken }
  });
  assert(meAuthRes.status === 200, 'GET /api/customer/me returns 200 OK for verified customer');
  assert(meAuthRes.body?.customer?.email === testEmail, 'Session profile matches verified Gmail');

  const meUnauthRes = await api('/api/customer/me');
  assert(meUnauthRes.status === 401, 'GET /api/customer/me without token returns 401 (Never falsely signed in)');

  // ---------------------------------------------------------
  // 3. BOOKING CREATION & CONFIRMATION
  // ---------------------------------------------------------
  console.log('\n--- 3. Testing Booking Creation ---');
  // Query availability to pick an open slot
  const testDate = '2026-11-20';
  const availRes = await api(`/api/public/availability?date=${testDate}&serviceId=srv_hair_1`);
  const openSlot = (availRes.body?.slots || []).find((s: any) => s.isAvailable)?.time || '15:30';

  // First verify booking without token is blocked
  const unauthBookingRes = await api('/api/public/bookings', {
    method: 'POST',
    body: JSON.stringify({
      serviceId: 'srv_hair_1',
      date: testDate,
      time: openSlot,
      customerName: testName,
      customerPhone: testPhone
    })
  });
  assert(unauthBookingRes.status === 401, 'Booking without login token is strictly blocked (401)');

  // Book with verified customer token
  const authBookingRes = await api('/api/public/bookings', {
    method: 'POST',
    headers: { 'x-customer-token': customerToken },
    body: JSON.stringify({
      serviceId: 'srv_hair_1',
      date: testDate,
      time: openSlot,
      customerName: testName,
      customerPhone: testPhone,
      customerEmail: testEmail,
      notes: 'Please keep appointment on schedule'
    })
  });
  if (authBookingRes.status !== 200) {
    console.error('authBookingRes failed:', authBookingRes.status, authBookingRes.body);
  }
  assert(authBookingRes.status === 200, 'Booking with verified session succeeds (200 OK)');
  assert(Boolean(authBookingRes.body?.appointment?.bookingNumber), 'Booking returns reference number');
  assert(authBookingRes.body?.appointment?.customerId === customerId, 'Booking is linked to registered customer account');
  const bookingNumber = authBookingRes.body?.appointment?.bookingNumber;

  // ---------------------------------------------------------
  // 4. CUSTOMER BOOKINGS HISTORY
  // ---------------------------------------------------------
  console.log('\n--- 4. Testing Customer Bookings History ---');
  const historyRes = await api('/api/customer/appointments', {
    headers: { 'x-customer-token': customerToken }
  });
  assert(historyRes.status === 200, 'GET /api/customer/appointments returns 200 OK');
  assert(
    Array.isArray(historyRes.body) && historyRes.body.some((a: any) => a.bookingNumber === bookingNumber),
    'New booking is present in customer appointment history'
  );

  // ---------------------------------------------------------
  // 5. CUSTOMER LOGOUT & DATA PERSISTENCE
  // ---------------------------------------------------------
  console.log('\n--- 5. Testing Customer Logout & Data Preservation ---');
  const logoutRes = await api('/api/customer/logout', {
    method: 'POST',
    headers: { 'x-customer-token': customerToken }
  });
  assert(logoutRes.status === 200, 'Customer logout endpoint returns 200 OK');

  const meAfterLogout = await api('/api/customer/me', {
    headers: { 'x-customer-token': customerToken }
  });
  assert(meAfterLogout.status === 401, 'Revoked token is rejected (session ended successfully)');

  // Log customer back in using password
  const reloginRes = await api('/api/customer/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: testEmail,
      password: testPassword
    })
  });
  assert(reloginRes.status === 200, 'Customer logs back in successfully');
  const freshCustomerToken = reloginRes.body?.token;

  // Verify booking history is preserved across logout/login
  const historyAfterRelogin = await api('/api/customer/appointments', {
    headers: { 'x-customer-token': freshCustomerToken }
  });
  assert(
    Array.isArray(historyAfterRelogin.body) && historyAfterRelogin.body.some((a: any) => a.bookingNumber === bookingNumber),
    'Customer booking history is preserved across logout/login'
  );

  // ---------------------------------------------------------
  // 6. CUSTOMER REVIEWS (SUBMIT, VIEW, EDIT, DELETE)
  // ---------------------------------------------------------
  console.log('\n--- 6. Testing Customer Review System ---');
  const reviewPostRes = await api('/api/customer/reviews', {
    method: 'POST',
    headers: { 'x-customer-token': freshCustomerToken },
    body: JSON.stringify({
      rating: 5,
      reviewText: 'Outstanding master haircut and hygienic salon environment on Kolar Road!'
    })
  });
  assert(reviewPostRes.status === 201, 'Customer review submission returns 201 Created');
  assert(reviewPostRes.body?.review?.status === 'pending', 'Review is set to pending for salon moderation');
  assert(reviewPostRes.body?.review?.source === 'Website Customer', 'Review source is "Website Customer"');
  const customerReviewId = reviewPostRes.body?.review?.id;

  // View own reviews
  const myReviewsRes = await api('/api/customer/reviews', {
    headers: { 'x-customer-token': freshCustomerToken }
  });
  assert(
    Array.isArray(myReviewsRes.body) && myReviewsRes.body.some((r: any) => r.id === customerReviewId),
    'Customer can view their own submitted review'
  );

  // Verify pending review does NOT appear publicly
  const publicReviews1 = await api('/api/public/reviews');
  assert(
    !publicReviews1.body?.some((r: any) => r.id === customerReviewId),
    'Pending review is hidden from public website'
  );

  // Edit own review
  const editReviewRes = await api(`/api/customer/reviews/${customerReviewId}`, {
    method: 'PUT',
    headers: { 'x-customer-token': freshCustomerToken },
    body: JSON.stringify({
      rating: 5,
      reviewText: 'Updated: Exceptional styling experience, very courteous staff and premium ambience!'
    })
  });
  assert(editReviewRes.status === 200, 'Customer can edit their own review');
  assert(editReviewRes.body?.review?.status === 'pending', 'Edited review is re-submitted as pending');

  // ---------------------------------------------------------
  // 7. ADMIN REVIEW MANAGEMENT
  // ---------------------------------------------------------
  console.log('\n--- 7. Testing Admin Review Management ---');
  // Admin login via OTP
  const dbRaw = JSON.parse(fs.readFileSync('data/salon_db.json', 'utf8'));
  const registeredAdminEmail = dbRaw.adminUsers?.[0]?.email || 'mrtechsahu@gmail.com';

  await api('/api/public/send-otp', {
    method: 'POST',
    body: JSON.stringify({ target: registeredAdminEmail, type: 'email' })
  });
  const adminOtp = getLatestOtp(registeredAdminEmail);
  const adminLoginRes = await api('/api/admin/login', {
    method: 'POST',
    body: JSON.stringify({ identifier: registeredAdminEmail, otpCode: adminOtp })
  });
  assert(adminLoginRes.status === 200, 'Admin login succeeds');
  const adminToken = adminLoginRes.body?.token;

  // Admin gets all reviews
  const adminReviewsRes = await api('/api/admin/reviews', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminReviewsRes.status === 200, 'Admin can fetch all reviews');
  assert(
    Array.isArray(adminReviewsRes.body) && adminReviewsRes.body.some((r: any) => r.id === customerReviewId),
    'Admin sees the pending customer review'
  );

  // Admin approves customer review
  const approveRes = await api(`/api/admin/reviews/${customerReviewId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'approved' })
  });
  assert(approveRes.status === 200, 'Admin can approve review');

  // Verify approved review now appears publicly
  const publicReviews2 = await api('/api/public/reviews');
  assert(
    publicReviews2.body?.some((r: any) => r.id === customerReviewId),
    'Approved customer review now appears on public website'
  );

  // Admin manually adds a genuine Google Maps review
  console.log('\n--- 8. Testing Admin Manual Entry of Genuine Google Maps Review ---');
  const addGoogleReviewRes = await api('/api/admin/reviews', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      authorName: 'Ritu Sen (Google Local Guide)',
      rating: 5,
      reviewText: 'Best family salon on Kolar Road Bhopal. Got global hair color and smoothing done. The staff is professional and ambience is very calm.',
      reviewDate: '3 weeks ago',
      source: 'Google Maps',
      status: 'approved',
      isVerified: true,
      sourceUrl: 'https://maps.google.com/?cid=123456789'
    })
  });
  assert(addGoogleReviewRes.status === 201, 'Admin manually adds Google Maps review (201 Created)');
  assert(addGoogleReviewRes.body?.source === 'Google Maps', 'Review source is correctly recorded as "Google Maps"');
  const googleReviewId = addGoogleReviewRes.body?.id;

  // Check public feed has Google review
  const publicReviews3 = await api('/api/public/reviews');
  const foundGoogle = publicReviews3.body?.find((r: any) => r.id === googleReviewId);
  assert(Boolean(foundGoogle), 'Google Maps review is rendered in public reviews');
  assert(foundGoogle?.source === 'Google Maps', 'Distinguished clearly as Google Maps review');

  // Admin hides the Google review
  const hideRes = await api(`/api/admin/reviews/${googleReviewId}/status`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ status: 'hidden' })
  });
  assert(hideRes.status === 200, 'Admin can hide review');

  // Verify hidden review does NOT appear publicly
  const publicReviews4 = await api('/api/public/reviews');
  assert(
    !publicReviews4.body?.some((r: any) => r.id === googleReviewId),
    'Hidden review is immediately excluded from public website'
  );

  // Admin deletes the Google review
  const deleteAdminRevRes = await api(`/api/admin/reviews/${googleReviewId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(deleteAdminRevRes.status === 200, 'Admin can permanently delete review');

  // Customer deletes own review
  const custDeleteRes = await api(`/api/customer/reviews/${customerReviewId}`, {
    method: 'DELETE',
    headers: { 'x-customer-token': freshCustomerToken }
  });
  assert(custDeleteRes.status === 200, 'Customer can delete their own review');

  // ---------------------------------------------------------
  // 9. NOTIFICATIONS & LOGS PERMANENT DELETION
  // ---------------------------------------------------------
  console.log('\n--- 9. Testing Notification & Log Permanent Deletion ---');
  // Fetch admin notifications
  const notifsListRes = await api('/api/admin/notifications', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(notifsListRes.status === 200, 'Admin can fetch persistent notifications');

  if (notifsListRes.body?.notifications?.length > 0) {
    const targetNotif = notifsListRes.body.notifications[0];
    // Mark as read
    await api(`/api/admin/notifications/${targetNotif.id}/read`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    // Erase individual notification
    const delNotifRes = await api(`/api/admin/notifications/${targetNotif.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(delNotifRes.status === 200, 'Admin can permanently erase individual notification');

    // Verify it is permanently removed
    const notifsCheckRes = await api('/api/admin/notifications', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      !notifsCheckRes.body?.notifications?.some((n: any) => n.id === targetNotif.id),
      'Erased notification does not return after reload'
    );

    // Test Delete All Read notifications
    const delReadRes = await api('/api/admin/notifications?onlyRead=true', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(delReadRes.status === 200, 'Admin can erase all read notifications');
  }

  // Fetch logs
  const logsListRes = await api('/api/admin/notifications-log', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(logsListRes.status === 200, 'Admin can fetch notification event logs');

  if (Array.isArray(logsListRes.body) && logsListRes.body.length > 0) {
    const targetLog = logsListRes.body[0];
    // Delete individual log
    const delLogRes = await api(`/api/admin/notifications-log/${targetLog.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(delLogRes.status === 200, 'Admin can permanently delete single log entry');

    // Verify log is permanently gone
    const logsCheckRes = await api('/api/admin/notifications-log', {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    assert(
      !logsCheckRes.body?.some((l: any) => l.id === targetLog.id),
      'Deleted log entry does not return after reload'
    );
  }

  // ---------------------------------------------------------
  // 10. EMAIL ACCOUNTS, ROLE SEPARATION & SALON HANDOVER
  // ---------------------------------------------------------
  console.log('\n--- 10. Testing Email Roles, Booking Isolation & Handover ---');
  // 1. Fetch Email Hub
  const emailHubGetRes = await api('/api/admin/email-hub', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(emailHubGetRes.status === 200, 'Admin can fetch Email Accounts Directory (GET /api/admin/email-hub)');
  assert(typeof emailHubGetRes.body?.bookingAlertEmail === 'string', 'Email Hub contains allotted booking alert email');
  assert(typeof emailHubGetRes.body?.adminLoginEmail === 'string', 'Email Hub contains admin login email');
  assert(Array.isArray(emailHubGetRes.body?.adminUsers), 'Email Hub lists registered administrator directory');

  // 2. Set Dedicated Allotted Booking Updates Email
  const dedicatedAlertEmail = 'bookings.allotted@bnbfamilysalon.com';
  const updateAlertRes = await api('/api/admin/email-hub', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      bookingAlertEmail: dedicatedAlertEmail
    })
  });
  assert(updateAlertRes.status === 200, 'Admin can allocate dedicated email for booking updates');

  // Verify dedicated booking alert email is preserved
  const verifyAlertRes = await api('/api/admin/email-hub', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    verifyAlertRes.body?.bookingAlertEmail === dedicatedAlertEmail,
    'Dedicated booking updates email is preserved and isolated from registration email'
  );

  // 3. Test Ownership Handover Tool
  const newOwnerEmail = 'owner@tasselunisexsalon.com';
  const handoverRes = await api('/api/admin/email-hub', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      handoverOwnerEmail: newOwnerEmail,
      handoverOwnerName: 'Tassel Unisex Salon Owner',
      handoverBookingAlert: true,
      handoverPublicContact: true,
      handoverAdminLogin: true,
      handoverSmtpUser: false
    })
  });
  assert(handoverRes.status === 200, 'Website ownership handover endpoint executes successfully');
  assert(handoverRes.body?.success === true, 'Handover reports success with reassigned roles');

  // Verify handover applied
  const postHandoverHubRes = await api('/api/admin/email-hub', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(
    postHandoverHubRes.body?.bookingAlertEmail === newOwnerEmail,
    'Booking updates email successfully transferred to new salon owner'
  );
  assert(
    postHandoverHubRes.body?.publicContactEmail === newOwnerEmail,
    'Public contact email successfully transferred to new salon owner'
  );
  assert(
    postHandoverHubRes.body?.adminLoginEmail === newOwnerEmail,
    'Primary admin login email successfully transferred to new salon owner'
  );

  // Restore Naitik's primary admin configuration
  await api('/api/admin/email-hub', {
    method: 'PUT',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      handoverOwnerEmail: 'naitiksahu054@gmail.com',
      handoverOwnerName: 'Naitik Sahu',
      handoverBookingAlert: true,
      handoverPublicContact: true,
      handoverAdminLogin: true,
      handoverSmtpUser: false
    })
  });

  console.log('\n===========================================================');
  console.log(`TOTAL TESTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('===========================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((err) => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
