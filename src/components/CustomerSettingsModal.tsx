import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Calendar,
  Moon,
  Sun,
  Laptop,
  Clock,
  Phone,
  MessageCircle,
  Download,
  CheckCircle,
  AlertCircle,
  Save,
  Sparkles,
  ChevronRight,
  MapPin,
  Check,
  Mail,
  Lock,
  KeyRound,
  LogOut,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  XCircle,
  Star,
  Trash2,
  Edit3,
  MessageSquare,
  Eye,
  EyeOff
} from 'lucide-react';
import { Appointment, SiteSettings, BookingStatus, Review } from '../types/index.ts';
import { api, getCustomerToken, setCustomerToken, clearCustomerToken } from '../api.ts';
import { formatTime12, formatTimeRange12, formatDateIST } from '../utils/timeFormat.ts';

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  isVerified?: boolean;
}

interface CustomerSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings?: SiteSettings | null;
  onOpenBooking: () => void;
  currentTheme: 'light' | 'dark' | 'system';
  onThemeChange: (theme: 'light' | 'dark' | 'system') => void;
  customerUser?: CustomerUser | null;
  onCustomerUserChange?: (user: CustomerUser | null) => void;
  initialTab?: 'bookings' | 'reviews' | 'profile' | 'theme';
}

export const CustomerSettingsModal: React.FC<CustomerSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onOpenBooking,
  currentTheme,
  onThemeChange,
  customerUser: externalCustomerUser,
  onCustomerUserChange,
  initialTab
}) => {
  const [activeTab, setActiveTab] = useState<'bookings' | 'reviews' | 'profile' | 'theme'>(initialTab || 'bookings');

  // Customer Session State
  const [customer, setCustomer] = useState<CustomerUser | null>(() => {
    if (externalCustomerUser) return externalCustomerUser;
    try {
      const stored = localStorage.getItem('salon_customer_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Auth UI state
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'forgot'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [authError, setAuthError] = useState<string>('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // Sign up fields
  const [signupName, setSignupName] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPhone, setSignupPhone] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupOtpCode, setSignupOtpCode] = useState<string>('');
  const [signupOtpSent, setSignupOtpSent] = useState<boolean>(false);
  const [signupOtpCountdown, setSignupOtpCountdown] = useState<number>(0);

  // Login fields
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginOtpCode, setLoginOtpCode] = useState<string>('');
  const [loginOtpSent, setLoginOtpSent] = useState<boolean>(false);
  const [loginOtpCountdown, setLoginOtpCountdown] = useState<number>(0);

  // Forgot Password fields
  const [forgotEmail, setForgotEmail] = useState<string>('');
  const [forgotOtpCode, setForgotOtpCode] = useState<string>('');
  const [forgotNewPassword, setForgotNewPassword] = useState<string>('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState<string>('');
  const [forgotOtpSent, setForgotOtpSent] = useState<boolean>(false);
  const [forgotOtpCountdown, setForgotOtpCountdown] = useState<number>(0);

  // Show/Hide Password Eye States
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showSignupPassword, setShowSignupPassword] = useState<boolean>(false);
  const [showForgotNewPassword, setShowForgotNewPassword] = useState<boolean>(false);
  const [showForgotConfirmPassword, setShowForgotConfirmPassword] = useState<boolean>(false);
  const [showChangePassNew, setShowChangePassNew] = useState<boolean>(false);

  // Profile preferences
  const [preferredStylist, setPreferredStylist] = useState<string>('Any Available Master Stylist');
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [whatsappNotify, setWhatsappNotify] = useState<boolean>(true);
  const [smsNotify, setSmsNotify] = useState<boolean>(true);

  // Change password in profile
  const [changePasswordModal, setChangePasswordModal] = useState<boolean>(false);
  const [changePassNew, setChangePassNew] = useState<string>('');
  const [changePassOtp, setChangePassOtp] = useState<string>('');
  const [changePassOtpSent, setChangePassOtpSent] = useState<boolean>(false);
  const [changePassCountdown, setChangePassCountdown] = useState<number>(0);
  const [changePassMsg, setChangePassMsg] = useState<string>('');
  const [changePassError, setChangePassError] = useState<string>('');


  // Bookings State
  const [customerBookings, setCustomerBookings] = useState<Appointment[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);
  const [bookingFilterStatus, setBookingFilterStatus] = useState<string>('all');
  const [viewingCardAppt, setViewingCardAppt] = useState<Appointment | null>(null);

  // Cancellation State
  const [cancellingAppt, setCancellingAppt] = useState<Appointment | null>(null);
  const [cancelReasonPreset, setCancelReasonPreset] = useState<string>('Schedule Conflict / Change of Plans');
  const [cancelCustomReason, setCancelCustomReason] = useState<string>('');
  const [cancelSubmitting, setCancelSubmitting] = useState<boolean>(false);
  const [cancelError, setCancelError] = useState<string>('');
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string>('');

  // Confirmation dialog
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Customer Reviews state
  const [customerReviews, setCustomerReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState<boolean>(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewHoverRating, setReviewHoverRating] = useState<number>(0);
  const [reviewText, setReviewText] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);
  const [reviewSuccessMsg, setReviewSuccessMsg] = useState<string>('');
  const [reviewError, setReviewError] = useState<string>('');
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [editRating, setEditRating] = useState<number>(5);
  const [editHoverRating, setEditHoverRating] = useState<number>(0);
  const [editText, setEditText] = useState<string>('');
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSignupOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      setLoginOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      setForgotOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      setChangePassCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync external customerUser
  useEffect(() => {
    if (externalCustomerUser) {
      setCustomer(externalCustomerUser);
    }
  }, [externalCustomerUser]);

  // Load profile & check session when modal opens
  useEffect(() => {
    if (isOpen) {
      setAuthError('');
      setAuthSuccessMsg('');

      // Check stored preferences
      try {
        const stored = localStorage.getItem('salon_customer_profile');
        if (stored) {
          const p = JSON.parse(stored);
          if (p.preferredStylist) setPreferredStylist(p.preferredStylist);
          if (p.specialRequests) setSpecialRequests(p.specialRequests);
          if (p.whatsappNotify !== undefined) setWhatsappNotify(p.whatsappNotify);
          if (p.smsNotify !== undefined) setSmsNotify(p.smsNotify);
        }
      } catch {}

      // Verify customer token
      const token = getCustomerToken();
      if (token) {
        api
          .getCustomerMe()
          .then((res) => {
            if (res?.customer) {
              setCustomer(res.customer);
              onCustomerUserChange?.(res.customer);
              localStorage.setItem('salon_customer_user', JSON.stringify(res.customer));
              loadCustomerBookings();
              loadCustomerReviews();
            } else {
              handleLogout(false);
            }
          })
          .catch(() => {
            // Keep local cached user if offline, but load bookings & reviews
            if (customer) {
              loadCustomerBookings();
              loadCustomerReviews();
            }
          });
      } else {
        setCustomer(null);
        setCustomerBookings([]);
        setCustomerReviews([]);
      }

      if (initialTab) {
        setActiveTab(initialTab);
      }
    }
  }, [isOpen, initialTab]);

  // Load customer bookings (ONLY for authenticated customer)
  const loadCustomerBookings = async () => {
    const token = getCustomerToken();
    if (!token) {
      setCustomerBookings([]);
      return;
    }

    setLoadingBookings(true);
    try {
      const res = await api.getCustomerBookings();
      // Server returns all historical, upcoming, completed, and cancelled bookings for this customer
      setCustomerBookings(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load authenticated customer appointments:', err);
      try {
        const fallbackRes = await api.getCustomerAppointments({ phone: customer?.phone });
        setCustomerBookings(Array.isArray(fallbackRes) ? fallbackRes : []);
      } catch {
        setCustomerBookings([]);
      }
    } finally {
      setLoadingBookings(false);
    }
  };

  // Load customer reviews
  const loadCustomerReviews = async () => {
    const token = getCustomerToken();
    if (!token) {
      setCustomerReviews([]);
      return;
    }
    setLoadingReviews(true);
    try {
      const res = await api.getCustomerReviews();
      setCustomerReviews(Array.isArray(res) ? res : []);
    } catch (err) {
      console.error('Failed to load customer reviews:', err);
      setCustomerReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Submit customer review
  const handleSubmitCustomerReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      setReviewError('Please write your review feedback.');
      return;
    }
    setReviewSubmitting(true);
    setReviewError('');
    setReviewSuccessMsg('');
    try {
      const res = await api.createCustomerReview({
        rating: reviewRating,
        reviewText: reviewText.trim()
      });
      setReviewSuccessMsg(res.message || 'Thank you! Your review has been submitted and will appear publicly once approved by salon management.');
      setReviewText('');
      setReviewRating(5);
      loadCustomerReviews();
    } catch (err: any) {
      setReviewError(err.message || 'Failed to submit review.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Update existing customer review
  const handleUpdateCustomerReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingReview || !editText.trim()) return;
    setEditSubmitting(true);
    try {
      await api.updateCustomerReview(editingReview.id, {
        rating: editRating,
        reviewText: editText.trim()
      });
      setEditingReview(null);
      setReviewSuccessMsg('Review updated successfully! It has been resubmitted for moderation.');
      loadCustomerReviews();
    } catch (err: any) {
      alert(err.message || 'Failed to update review.');
    } finally {
      setEditSubmitting(false);
    }
  };

  // Delete customer review
  const handleDeleteCustomerReview = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this review? This action cannot be undone.')) return;
    setDeletingReviewId(id);
    try {
      await api.deleteCustomerReview(id);
      loadCustomerReviews();
    } catch (err: any) {
      alert(err.message || 'Failed to delete review.');
    } finally {
      setDeletingReviewId(null);
    }
  };

  // ---------------------------------------------------------------------------
  // AUTHENTICATION HANDLERS
  // ---------------------------------------------------------------------------

  // Send OTP for Sign Up (Gmail Verification)
  const handleSendSignupOtp = async () => {
    if (!signupEmail || !signupEmail.includes('@')) {
      setAuthError('Please enter a valid Gmail address to verify.');
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.sendOtp(signupEmail.trim().toLowerCase(), 'email');
      setSignupOtpSent(true);
      setSignupOtpCountdown(60);
      setAuthSuccessMsg(res.message || `✓ A 6-digit OTP code has been sent to your Gmail (${signupEmail}). Please check your inbox, read the code, and enter it below.`);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send OTP to Gmail');
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit Sign Up
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (!signupName.trim() || !signupEmail.trim() || !signupPhone.trim() || !signupPassword) {
      setAuthError('Please fill in all required registration fields.');
      return;
    }

    if (signupPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    if (!signupOtpCode || signupOtpCode.length < 4) {
      setAuthError('Please verify your Gmail by requesting and entering the 6-digit OTP code.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.customerSignup({
        name: signupName.trim(),
        email: signupEmail.trim().toLowerCase(),
        phone: signupPhone.trim(),
        password: signupPassword,
        otpCode: signupOtpCode.trim()
      });

      setCustomerToken(res.token);
      setCustomer(res.customer);
      onCustomerUserChange?.(res.customer);
      localStorage.setItem('salon_customer_user', JSON.stringify(res.customer));

      // Cache profile
      const profile = {
        name: res.customer.name,
        phone: res.customer.phone,
        email: res.customer.email,
        preferredStylist,
        specialRequests,
        whatsappNotify,
        smsNotify
      };
      localStorage.setItem('salon_customer_profile', JSON.stringify(profile));

      setAuthSuccessMsg('Account created and Gmail verified successfully!');
      await loadCustomerBookings();
      setActiveTab('bookings');

      setConfirmModal({
        isOpen: true,
        title: 'Welcome to Tassel Unisex Salon!',
        message: `Hello ${res.customer.name}! Your account has been verified. You can now view and manage all your bookings.`
      });
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Please check your details and OTP.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Send OTP for Login
  const handleSendLoginOtp = async () => {
    if (!loginIdentifier || !loginIdentifier.includes('@')) {
      setAuthError('Please enter your registered Gmail address to receive the login code.');
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.sendOtp(loginIdentifier.trim().toLowerCase(), 'email');
      setLoginOtpSent(true);
      setLoginOtpCountdown(60);
      setAuthSuccessMsg(res.message || `✓ A 6-digit login OTP code was sent to ${loginIdentifier}. Please check your Gmail inbox, read the code, and enter it below.`);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send login OTP');
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (!loginIdentifier.trim()) {
      setAuthError('Please enter your Gmail address or registered mobile number.');
      return;
    }

    if (loginMethod === 'password' && !loginPassword) {
      setAuthError('Please enter your account password.');
      return;
    }

    if (loginMethod === 'otp' && (!loginOtpCode || loginOtpCode.length < 4)) {
      setAuthError('Please request and enter the 6-digit OTP sent to your Gmail.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.customerLogin({
        identifier: loginIdentifier.trim(),
        password: loginMethod === 'password' ? loginPassword : undefined,
        otpCode: loginMethod === 'otp' ? loginOtpCode.trim() : undefined
      });

      setCustomerToken(res.token);
      setCustomer(res.customer);
      onCustomerUserChange?.(res.customer);
      localStorage.setItem('salon_customer_user', JSON.stringify(res.customer));

      setAuthSuccessMsg('Logged in successfully!');
      await loadCustomerBookings();
      setActiveTab('bookings');
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please check your credentials or use Gmail OTP.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Send OTP for Password Reset
  const handleSendForgotOtp = async () => {
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setAuthError('Please enter your registered Gmail address.');
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.sendOtp(forgotEmail.trim().toLowerCase(), 'email');
      setForgotOtpSent(true);
      setForgotOtpCountdown(60);
      setAuthSuccessMsg(res.message || `✓ A 6-digit verification code was sent to ${forgotEmail}. Please check your Gmail inbox, read the code, and enter it below.`);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send verification code');
    } finally {
      setAuthLoading(false);
    }
  };

  // Submit Password Reset
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (!forgotEmail.trim() || !forgotOtpCode.trim() || !forgotNewPassword) {
      setAuthError('Please enter your Gmail, the 6-digit OTP code, and new password.');
      return;
    }

    if (forgotNewPassword.length < 6) {
      setAuthError('New password must be at least 6 characters.');
      return;
    }

    if (forgotNewPassword !== forgotConfirmPassword) {
      setAuthError('Passwords do not match. Please re-enter.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.customerResetPassword({
        email: forgotEmail.trim().toLowerCase(),
        otpCode: forgotOtpCode.trim(),
        newPassword: forgotNewPassword
      });

      setAuthSuccessMsg(res.message || 'Password updated! Please log in with your new password.');
      setAuthMode('login');
      setLoginIdentifier(forgotEmail);
      setLoginPassword('');
      setForgotNewPassword('');
      setForgotConfirmPassword('');
      setForgotOtpCode('');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to reset password. Please check your OTP.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Handle Logout (ends session without deleting account, profile or booking history)
  const handleLogout = (showConfirm = true) => {
    api.customerLogout();
    clearCustomerToken();
    localStorage.removeItem('salon_customer_user');
    setCustomer(null);
    setCustomerBookings([]);
    setCustomerReviews([]);
    onCustomerUserChange?.(null);
    setAuthMode('login');
    if (showConfirm) {
      setConfirmModal({
        isOpen: true,
        title: 'Logged Out',
        message: 'You have been successfully signed out of your customer account. Your account profile, booking history, and reviews are preserved.'
      });
    }
  };

  // Send OTP for Profile Change Password
  const handleSendChangePassOtp = async () => {
    if (!customer?.email) return;
    setChangePassError('');
    try {
      const res = await api.sendOtp(customer.email.toLowerCase(), 'email');
      setChangePassOtpSent(true);
      setChangePassCountdown(60);
      setChangePassMsg(res.message || `✓ A 6-digit verification code was sent to your Gmail (${customer.email}). Please check your Gmail inbox, read the code, and enter it below.`);
    } catch (err: any) {
      setChangePassError(err.message || 'Failed to send OTP');
    }
  };

  // Submit Profile Change Password
  const handleChangePassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer?.email) return;
    setChangePassError('');
    setChangePassMsg('');

    if (changePassNew.length < 6) {
      setChangePassError('Password must be at least 6 characters long.');
      return;
    }

    if (!changePassOtp || changePassOtp.length < 4) {
      setChangePassError('Please enter the 6-digit OTP code sent to your Gmail.');
      return;
    }

    try {
      const res = await api.customerResetPassword({
        email: customer.email.toLowerCase(),
        otpCode: changePassOtp.trim(),
        newPassword: changePassNew
      });
      setChangePassMsg(res.message || 'Password changed successfully!');
      setTimeout(() => {
        setChangePasswordModal(false);
        setChangePassNew('');
        setChangePassOtp('');
        setChangePassOtpSent(false);
      }, 1500);
    } catch (err: any) {
      setChangePassError(err.message || 'Failed to update password');
    }
  };

  // Save styling preferences
  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    const profile = {
      name: customer?.name || '',
      phone: customer?.phone || '',
      email: customer?.email || '',
      preferredStylist,
      specialRequests,
      whatsappNotify,
      smsNotify
    };
    localStorage.setItem('salon_customer_profile', JSON.stringify(profile));

    setConfirmModal({
      isOpen: true,
      title: 'Preferences Saved',
      message: 'Your personal salon styling preferences and notification options have been updated.'
    });
  };

  const handleDownloadIcs = (appt: Appointment) => {
    const salonTitle = settings?.salonName || 'Tassel Unisex Salon';
    const salonPhone = settings?.phone || '+91 78800 86990';
    const salonAddress = settings?.address || 'Kolar Road, Good Shapard Kalan, Mandakini Colony, Bhopal';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//${salonTitle}//Appointment//EN`,
      'BEGIN:VEVENT',
      `UID:${appt.id}@tasselunisexsalon.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${appt.date.replace(/-/g, '')}T${appt.time.replace(':', '')}00`,
      `DTEND:${appt.date.replace(/-/g, '')}T${appt.endTime.replace(':', '')}00`,
      `SUMMARY:${appt.serviceName} at ${salonTitle}`,
      `DESCRIPTION:Appointment Ref: ${appt.bookingNumber}\\nService: ${appt.serviceName} (₹${appt.servicePrice})\\nStatus: ${appt.status.toUpperCase()}\\nPhone: ${salonPhone}`,
      `LOCATION:${salonAddress}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `appointment_${appt.bookingNumber}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenWhatsAppForBooking = (appt: Appointment) => {
    const adminPhone = settings?.adminWhatsAppPhone || settings?.phone || '+91 78800 86990';
    const cleanAdmin = adminPhone.replace(/[^0-9]/g, '');
    const phone = cleanAdmin.length === 10 ? `91${cleanAdmin}` : cleanAdmin;
    const salonTitle = settings?.salonName || 'Tassel Unisex Salon';

    const message = [
      `👋 *Hello ${salonTitle} Admin*,`,
      `I would like to discuss my appointment:`,
      `📋 *Booking Ref:* #${appt.bookingNumber}`,
      `✂️ *Service:* ${appt.serviceName} (₹${appt.servicePrice})`,
      `📅 *Schedule:* ${formatDateIST(appt.date)} at ${formatTimeRange12(appt.time, appt.endTime)}`,
      `👤 *Customer:* ${appt.customerName} (${appt.customerPhone})`,
      `🏷️ *Status:* ${appt.status.toUpperCase()}`,
      ``,
      `Please assist me regarding my reservation. Thank you!`
    ].join('\n');

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingAppt) return;
    setCancelSubmitting(true);
    setCancelError('');
    try {
      const fullReason =
        cancelReasonPreset === 'Other'
          ? cancelCustomReason.trim() || 'Other reason'
          : cancelCustomReason.trim()
          ? `${cancelReasonPreset}: ${cancelCustomReason.trim()}`
          : cancelReasonPreset;

      const res = await api.cancelCustomerAppointment(cancellingAppt.id, fullReason);

      // Immediately update local state
      setCustomerBookings((prev) =>
        prev.map((a) =>
          a.id === cancellingAppt.id || a.bookingNumber === cancellingAppt.bookingNumber
            ? {
                ...a,
                status: 'cancelled',
                cancelledAt: new Date().toISOString(),
                cancelledBy: 'customer',
                cancellationReason: fullReason
              }
            : a
        )
      );

      setCancelSuccessMsg(res.message || 'Appointment cancelled successfully. Reserved slot has been released.');
      setCancellingAppt(null);
      setCancelCustomReason('');

      // Auto clear success message after 5s
      setTimeout(() => setCancelSuccessMsg(''), 5000);

      // Reload bookings to ensure full sync
      loadCustomerBookings();
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel appointment. Please try again.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const filteredBookings = customerBookings.filter((b) => {
    if (bookingFilterStatus === 'all') return true;
    return b.status === bookingFilterStatus;
  });

  const pendingCount = customerBookings.filter((b) => b.status === 'pending').length;
  const confirmedCount = customerBookings.filter((b) => b.status === 'confirmed').length;
  const completedCount = customerBookings.filter((b) => b.status === 'completed').length;
  const cancelledCount = customerBookings.filter((b) => b.status === 'cancelled').length;

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300">
            Confirmed
          </span>
        );
      case 'postponed':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300">
            Postponed
          </span>
        );
      case 'completed':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300">
            Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-red-100 text-red-800 dark:bg-red-950/70 dark:text-red-300">
            Cancelled
          </span>
        );
      case 'no-show':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
            No-Show
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
            Pending
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-5 overflow-hidden animate-in fade-in duration-150">
      <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border-t sm:border border-[#E6D4BA]/80 dark:border-white/10 rounded-t-2xl sm:rounded-2xl max-w-2xl w-full h-[94dvh] sm:h-auto sm:max-h-[88vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header - Sticky and shrink-proof */}
        <div className="p-3 sm:p-5 border-b border-[#E6D4BA]/40 dark:border-white/10 flex items-center justify-between gap-2.5 bg-[#FAF7F2] dark:bg-[#141312] shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white dark:bg-white/5 border border-[#C29F67]/60 flex items-center justify-center text-[#9C753D] dark:text-[#C29F67] shrink-0">
              <User className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-lg font-serif font-bold text-[#1C1B1A] dark:text-white truncate">
                  Customer Portal & Bookings
                </h3>
                {customer && (
                  <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full font-bold shrink-0">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>Verified</span>
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#79746D] dark:text-gray-400 truncate">
                {customer
                  ? `Signed in as ${customer.name} (${customer.email})`
                  : 'Sign in with Gmail to view all past and upcoming bookings'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {customer && (
              <button
                type="button"
                onClick={() => handleLogout(true)}
                className="px-2 sm:px-2.5 py-1.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 text-[#79746D] hover:text-red-600 dark:text-gray-300 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                title="Sign out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            )}
            <button
              onClick={onClose}
              type="button"
              className="w-10 h-10 min-w-[40px] min-h-[40px] p-2 text-gray-500 hover:text-gray-800 dark:text-gray-300 dark:hover:text-white rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
              aria-label="Close customer portal modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E6D4BA]/40 dark:border-white/10 bg-[#FAF7F2]/50 dark:bg-black/20 px-4 sm:px-6 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab('bookings')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'bookings'
                ? 'border-[#C29F67] text-[#1C1B1A] dark:text-white'
                : 'border-transparent text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white'
            }`}
          >
            <Calendar className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
            <span>My Bookings</span>
            {customer && customerBookings.length > 0 && (
              <span className="text-[10px] bg-[#C29F67]/20 text-[#9C753D] dark:text-[#E6D4BA] px-1.5 py-0.2 rounded-full font-mono">
                {customerBookings.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('reviews')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'reviews'
                ? 'border-[#C29F67] text-[#1C1B1A] dark:text-white'
                : 'border-transparent text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white'
            }`}
          >
            <Star className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
            <span>My Reviews</span>
            {customer && customerReviews.length > 0 && (
              <span className="text-[10px] bg-[#C29F67]/20 text-[#9C753D] dark:text-[#E6D4BA] px-1.5 py-0.2 rounded-full font-mono">
                {customerReviews.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'profile'
                ? 'border-[#C29F67] text-[#1C1B1A] dark:text-white'
                : 'border-transparent text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white'
            }`}
          >
            <User className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
            <span>{customer ? 'Profile & Preferences' : 'Account & Sign In'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              activeTab === 'theme'
                ? 'border-[#C29F67] text-[#1C1B1A] dark:text-white'
                : 'border-transparent text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white'
            }`}
          >
            <Moon className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
            <span>Theme & Display</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-5 pb-28 sm:pb-8">
          {/* TAB 1: MY BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="space-y-4">
              {/* IF NOT LOGGED IN: SHOW GMAIL LOGIN / SIGNUP PROMPT */}
              {!customer ? (
                <div className="space-y-5 max-w-lg mx-auto py-2">
                  <div className="text-center space-y-1.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                      <Lock className="w-6 h-6" />
                    </div>
                    <h4 className="text-base sm:text-lg font-serif font-bold text-[#1C1B1A] dark:text-white">
                      Customer Sign In & Gmail Verification
                    </h4>
                    <p className="text-xs text-[#79746D] dark:text-gray-300">
                      Without login or signup, customer bookings cannot be displayed to safeguard privacy. Sign in or register below to access your appointment history.
                    </p>
                  </div>

                  {/* Auth Mode Toggle Buttons */}
                  <div className="flex bg-[#FAF7F2] dark:bg-white/5 p-1 rounded-xl border border-gray-200 dark:border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setAuthError('');
                        setAuthSuccessMsg('');
                      }}
                      className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer ${
                        authMode === 'login'
                          ? 'bg-white dark:bg-white/15 text-[#1C1B1A] dark:text-white shadow-2xs'
                          : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A]'
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setAuthError('');
                        setAuthSuccessMsg('');
                      }}
                      className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer ${
                        authMode === 'signup'
                          ? 'bg-white dark:bg-white/15 text-[#1C1B1A] dark:text-white shadow-2xs'
                          : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A]'
                      }`}
                    >
                      Sign Up with Real Gmail
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('forgot');
                        setAuthError('');
                        setAuthSuccessMsg('');
                      }}
                      className={`flex-1 py-2 font-bold rounded-lg transition-colors cursor-pointer ${
                        authMode === 'forgot'
                          ? 'bg-white dark:bg-white/15 text-[#1C1B1A] dark:text-white shadow-2xs'
                          : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A]'
                      }`}
                    >
                      Forgot Password
                    </button>
                  </div>

                  {/* Error & Success Messages */}
                  {authError && (
                    <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{authError}</span>
                    </div>
                  )}
                  {authSuccessMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                      <span>{authSuccessMsg}</span>
                    </div>
                  )}

                  {/* FORM 1: LOGIN */}
                  {authMode === 'login' && (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      {/* Method Toggle: Password vs OTP */}
                      <div className="flex items-center justify-between text-xs border-b border-gray-100 dark:border-white/10 pb-2">
                        <span className="font-semibold text-[#1C1B1A] dark:text-gray-200">Login Method:</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => setLoginMethod('password')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                              loginMethod === 'password'
                                ? 'bg-[#C29F67] text-white'
                                : 'bg-gray-100 dark:bg-white/10 text-[#79746D] dark:text-gray-300'
                            }`}
                          >
                            Password
                          </button>
                          <button
                            type="button"
                            onClick={() => setLoginMethod('otp')}
                            className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                              loginMethod === 'otp'
                                ? 'bg-[#C29F67] text-white'
                                : 'bg-gray-100 dark:bg-white/10 text-[#79746D] dark:text-gray-300'
                            }`}
                          >
                            Gmail OTP
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                          {loginMethod === 'otp' ? 'Registered Gmail Address *' : 'Gmail Address or Mobile Phone *'}
                        </label>
                        <input
                          type={loginMethod === 'otp' ? 'email' : 'text'}
                          required
                          placeholder={loginMethod === 'otp' ? 'yourname@gmail.com' : 'Gmail or 10-digit mobile'}
                          value={loginIdentifier}
                          onChange={(e) => setLoginIdentifier(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                        />
                      </div>

                      {loginMethod === 'password' ? (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white">
                              Password *
                            </label>
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode('forgot');
                                setForgotEmail(loginIdentifier.includes('@') ? loginIdentifier : '');
                              }}
                              className="text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline font-semibold cursor-pointer"
                            >
                              Forgot Password?
                            </button>
                          </div>
                          <div className="relative">
                            <input
                              type={showLoginPassword ? 'text' : 'password'}
                              required
                              placeholder="Enter your account password"
                              value={loginPassword}
                              onChange={(e) => setLoginPassword(e.target.value)}
                              className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => setShowLoginPassword(!showLoginPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                              tabIndex={-1}
                              aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                              title={showLoginPassword ? 'Hide password' : 'Show password'}
                            >
                              {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white">
                              6-Digit Gmail OTP Code *
                            </label>
                            <button
                              type="button"
                              onClick={handleSendLoginOtp}
                              disabled={authLoading || loginOtpCountdown > 0}
                              className="text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                            >
                              <Mail className="w-3 h-3" />
                              <span>
                                {loginOtpCountdown > 0
                                  ? `Resend in ${loginOtpCountdown}s`
                                  : loginOtpSent
                                  ? 'Resend OTP'
                                  : 'Send OTP to Gmail'}
                              </span>
                            </button>
                          </div>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="e.g. 123456"
                            value={loginOtpCode}
                            onChange={(e) => setLoginOtpCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3.5 py-2.5 text-center tracking-widest font-mono text-sm bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-bold"
                          />
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {authLoading ? 'Verifying...' : 'Sign In to View Bookings'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  {/* FORM 2: SIGN UP WITH REAL GMAIL & OTP */}
                  {authMode === 'signup' && (
                    <form onSubmit={handleSignupSubmit} className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={signupName}
                          onChange={(e) => setSignupName(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                        />
                      </div>

                      {/* Gmail Field with OTP Button */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white">
                            Gmail Address * <span className="text-emerald-700 dark:text-emerald-400 font-normal">(Real Gmail Verified)</span>
                          </label>
                          <button
                            type="button"
                            onClick={handleSendSignupOtp}
                            disabled={authLoading || signupOtpCountdown > 0}
                            className="text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Mail className="w-3 h-3" />
                            <span>
                              {signupOtpCountdown > 0
                                ? `Resend (${signupOtpCountdown}s)`
                                : signupOtpSent
                                ? 'Resend OTP'
                                : 'Verify Real Gmail via OTP'}
                            </span>
                          </button>
                        </div>
                        <input
                          type="email"
                          required
                          placeholder="e.g. rahul.sharma@gmail.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                        />
                      </div>

                      {/* OTP code input */}
                      {signupOtpSent && (
                        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1.5">
                          <label className="block text-xs font-bold text-amber-900 dark:text-amber-300">
                            Enter 6-digit OTP code sent to {signupEmail}:
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="123456"
                            value={signupOtpCode}
                            onChange={(e) => setSignupOtpCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3.5 py-2 text-center tracking-widest font-mono text-sm bg-white dark:bg-black/40 border border-amber-300 dark:border-amber-700 rounded-lg text-[#1C1B1A] dark:text-white font-bold outline-hidden"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            Mobile Phone *
                          </label>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. 9826012345"
                            value={signupPhone}
                            onChange={(e) => setSignupPhone(e.target.value)}
                            className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            Password * <span className="text-gray-400 font-normal">(Min 6 chars)</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showSignupPassword ? 'text' : 'password'}
                              required
                              minLength={6}
                              placeholder="Create password"
                              value={signupPassword}
                              onChange={(e) => setSignupPassword(e.target.value)}
                              className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSignupPassword(!showSignupPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                              tabIndex={-1}
                              aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                              title={showSignupPassword ? 'Hide password' : 'Show password'}
                            >
                              {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {authLoading ? 'Creating Account...' : 'Register & Verify Account'}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </form>
                  )}

                  {/* FORM 3: FORGOT PASSWORD VIA GMAIL OTP */}
                  {authMode === 'forgot' && (
                    <form onSubmit={handleForgotSubmit} className="space-y-4">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white">
                            Your Registered Gmail *
                          </label>
                          <button
                            type="button"
                            onClick={handleSendForgotOtp}
                            disabled={authLoading || forgotOtpCountdown > 0}
                            className="text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Mail className="w-3 h-3" />
                            <span>
                              {forgotOtpCountdown > 0
                                ? `Resend (${forgotOtpCountdown}s)`
                                : forgotOtpSent
                                ? 'Resend Code'
                                : 'Send OTP Code'}
                            </span>
                          </button>
                        </div>
                        <input
                          type="email"
                          required
                          placeholder="yourname@gmail.com"
                          value={forgotEmail}
                          onChange={(e) => setForgotEmail(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                        />
                      </div>

                      {forgotOtpSent && (
                        <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1.5">
                          <label className="block text-xs font-bold text-amber-900 dark:text-amber-300">
                            Enter 6-digit OTP code sent to your Gmail:
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            placeholder="123456"
                            value={forgotOtpCode}
                            onChange={(e) => setForgotOtpCode(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-3.5 py-2 text-center tracking-widest font-mono text-sm bg-white dark:bg-black/40 border border-amber-300 dark:border-amber-700 rounded-lg text-[#1C1B1A] dark:text-white font-bold outline-hidden"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            New Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showForgotNewPassword ? 'text' : 'password'}
                              required
                              minLength={6}
                              placeholder="At least 6 characters"
                              value={forgotNewPassword}
                              onChange={(e) => setForgotNewPassword(e.target.value)}
                              className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                              tabIndex={-1}
                              aria-label={showForgotNewPassword ? 'Hide password' : 'Show password'}
                              title={showForgotNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showForgotNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            Confirm Password *
                          </label>
                          <div className="relative">
                            <input
                              type={showForgotConfirmPassword ? 'text' : 'password'}
                              required
                              minLength={6}
                              placeholder="Re-enter new password"
                              value={forgotConfirmPassword}
                              onChange={(e) => setForgotConfirmPassword(e.target.value)}
                              className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                            />
                            <button
                              type="button"
                              onClick={() => setShowForgotConfirmPassword(!showForgotConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                              tabIndex={-1}
                              aria-label={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                              title={showForgotConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showForgotConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={authLoading}
                        className="w-full py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                      >
                        {authLoading ? 'Updating Password...' : 'Reset Password with Gmail OTP'}
                      </button>
                    </form>
                  )}
                </div>
              ) : (
                /* AUTHENTICATED CUSTOMER BOOKINGS VIEW */
                <div className="space-y-4">
                  {/* Verified Banner */}
                  <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-emerald-900 dark:text-emerald-300 font-semibold">
                        Showing confirmed bookings for <strong>{customer.name}</strong> ({customer.email})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => loadCustomerBookings()}
                      disabled={loadingBookings}
                      className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded text-emerald-800 dark:text-emerald-300 cursor-pointer"
                      title="Refresh bookings"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingBookings ? 'animate-spin' : ''}`} />
                    </button>
                  </div>

                  {/* Status Filter */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setBookingFilterStatus('all')}
                      className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        bookingFilterStatus === 'all'
                          ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]'
                          : 'bg-gray-100 dark:bg-white/5 text-[#79746D] dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/10'
                      }`}
                    >
                      All ({customerBookings.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingFilterStatus('confirmed')}
                      className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        bookingFilterStatus === 'confirmed'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300'
                      }`}
                    >
                      Confirmed ({confirmedCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingFilterStatus('pending')}
                      className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        bookingFilterStatus === 'pending'
                          ? 'bg-amber-600 text-white'
                          : 'bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300'
                      }`}
                    >
                      Pending ({pendingCount})
                    </button>
                    {completedCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setBookingFilterStatus('completed')}
                        className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          bookingFilterStatus === 'completed'
                            ? 'bg-blue-600 text-white'
                            : 'bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-300'
                        }`}
                      >
                        Completed ({completedCount})
                      </button>
                    )}
                    {cancelledCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setBookingFilterStatus('cancelled')}
                        className={`px-3 py-1 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                          bookingFilterStatus === 'cancelled'
                            ? 'bg-red-600 text-white'
                            : 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300'
                        }`}
                      >
                        Cancelled ({cancelledCount})
                      </button>
                    )}
                  </div>

                  {/* Cancellation Success Feedback */}
                  {cancelSuccessMsg && (
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-2 shadow-2xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{cancelSuccessMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setCancelSuccessMsg('')}
                        className="text-emerald-700 hover:text-emerald-900 dark:text-emerald-300 p-0.5 rounded cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Bookings List (Most recent shown at top) */}
                  {loadingBookings ? (
                    <div className="text-center py-10 text-xs text-[#79746D] dark:text-gray-400">
                      <div className="w-5 h-5 border-2 border-[#C29F67] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      <span>Loading your reservations...</span>
                    </div>
                  ) : filteredBookings.length === 0 ? (
                    <div className="text-center py-10 bg-white dark:bg-white/5 rounded-2xl border border-dashed border-[#E6D4BA] dark:border-white/10 space-y-3 p-6">
                      <Calendar className="w-9 h-9 text-[#C29F67] mx-auto opacity-75" />
                      <div>
                        <p className="text-sm font-bold text-[#1C1B1A] dark:text-white">No bookings to show</p>
                        <p className="text-xs text-[#79746D] dark:text-gray-400 mt-1 max-w-sm mx-auto">
                          You don't have any appointments currently scheduled. Reserve your next sanctuary grooming session below.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenBooking();
                        }}
                        className="px-5 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] text-xs font-bold rounded-lg hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center gap-1.5 shadow-xs"
                      >
                        <span>Book New Appointment</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredBookings.map((appt) => {
                        // Calculate cancellation deadline eligibility
                        const deadlineHours = Number(settings?.cancellationDeadlineHours ?? 2);
                        const apptDateTime = new Date(`${appt.date}T${appt.time}:00`);
                        const now = new Date();
                        const hoursUntilAppt = (apptDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
                        const isCancellableStatus = appt.status === 'pending' || appt.status === 'confirmed';
                        const isPast = hoursUntilAppt < 0;
                        const isWithinDeadline = !isPast && hoursUntilAppt < deadlineHours;
                        const isEligibleForCancellation = isCancellableStatus && !isPast && !isWithinDeadline;

                        return (
                          <div
                            key={appt.id || appt.bookingNumber}
                            className="p-4 bg-white dark:bg-white/5 border border-[#E6D4BA]/70 dark:border-white/10 rounded-xl space-y-3 shadow-2xs hover:border-[#C29F67] transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-[#1C1B1A] dark:text-white">
                                    #{appt.bookingNumber}
                                  </span>
                                  {getStatusBadge(appt.status)}
                                </div>
                                <h4 className="font-bold text-sm text-[#1C1B1A] dark:text-white mt-1">
                                  {appt.serviceName}
                                </h4>
                                {appt.stylistName && (
                                  <p className="text-[11px] text-[#9C753D] dark:text-[#E6D4BA] font-semibold mt-0.5">
                                    Stylist: {appt.stylistName}
                                  </p>
                                )}
                                <p className="text-xs text-[#79746D] dark:text-gray-300 mt-0.5 flex items-center gap-1.5 font-medium">
                                  <Clock className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                                  <span>{formatDateIST(appt.date)} · {formatTimeRange12(appt.time, appt.endTime)}</span>
                                  <span>·</span>
                                  <span className="font-bold text-[#9C753D] dark:text-[#E6D4BA]">₹{appt.servicePrice}</span>
                                </p>
                              </div>
                            </div>

                            {/* Cancellation History Details if Cancelled */}
                            {appt.status === 'cancelled' && (
                              <div className="p-2.5 bg-red-50/70 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 rounded-lg text-xs space-y-1">
                                <div className="flex items-center gap-1.5 font-bold text-red-800 dark:text-red-300">
                                  <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400 shrink-0" />
                                  <span>Reservation Cancelled</span>
                                  {appt.cancelledBy && (
                                    <span className="text-[10px] font-normal text-red-600 dark:text-red-400">
                                      (by {appt.cancelledBy === 'customer' ? 'You' : 'Salon Admin'})
                                    </span>
                                  )}
                                </div>
                                {appt.cancellationReason && (
                                  <p className="text-[11px] text-red-700 dark:text-red-300 italic">
                                    Reason: "{appt.cancellationReason}"
                                  </p>
                                )}
                                {appt.cancelledAt && (
                                  <p className="text-[10px] text-[#79746D] dark:text-gray-400">
                                    Cancelled at: {new Date(appt.cancelledAt).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            )}

                            {appt.notes && (
                              <p className="text-[11px] bg-[#FAF7F2] dark:bg-white/5 p-2 rounded text-[#79746D] dark:text-gray-300 italic">
                                "{appt.notes}"
                              </p>
                            )}

                            <div className="pt-2.5 border-t border-gray-100 dark:border-white/10 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => setViewingCardAppt(appt)}
                                  className="px-3 py-1.5 bg-[#FAF7F2] dark:bg-white/10 hover:bg-[#F3EBDD] dark:hover:bg-white/15 text-[#1C1B1A] dark:text-white border border-[#E6D4BA]/90 dark:border-white/20 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                >
                                  <Sparkles className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                                  <span>Booking Card</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenWhatsAppForBooking(appt)}
                                  className="px-3 py-1.5 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                  title="Chat with Salon Admin on WhatsApp regarding this booking"
                                >
                                  <MessageCircle className="w-3.5 h-3.5 fill-white" />
                                  <span>WhatsApp Admin</span>
                                </button>

                                {/* PROMINENT CUSTOMER CANCEL BOOKING BUTTON */}
                                {isEligibleForCancellation && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setCancellingAppt(appt);
                                      setCancelReasonPreset('Schedule Conflict / Change of Plans');
                                      setCancelCustomReason('');
                                      setCancelError('');
                                    }}
                                    className="px-3 py-1.5 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs active:scale-95"
                                    title="Cancel reservation and release reserved time slot"
                                  >
                                    <XCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                                    <span>Cancel Booking</span>
                                  </button>
                                )}

                                {/* Within Deadline Notice */}
                                {isCancellableStatus && isWithinDeadline && (
                                  <span
                                    className="text-[11px] font-medium text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-lg inline-flex items-center gap-1"
                                    title={`Within ${deadlineHours} hour(s) of appointment. Please contact salon reception directly.`}
                                  >
                                    <AlertCircle className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>Within {deadlineHours}h cutoff (Call salon)</span>
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={() => handleDownloadIcs(appt)}
                                className="px-3 py-1.5 bg-white dark:bg-white/5 text-[#79746D] dark:text-gray-300 border border-gray-200 dark:border-white/10 text-xs font-semibold rounded-lg hover:text-[#1C1B1A] dark:hover:text-white transition-colors flex items-center gap-1.5 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                                <span>.ics</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB: MY REVIEWS & FEEDBACK */}
          {activeTab === 'reviews' && (
            <div className="space-y-6">
              {!customer ? (
                <div className="space-y-4 max-w-lg mx-auto py-6 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center mx-auto">
                    <Star className="w-6 h-6 fill-amber-400 text-amber-500" />
                  </div>
                  <h4 className="text-base sm:text-lg font-serif font-bold text-[#1C1B1A] dark:text-white">
                    Verified Customer Reviews
                  </h4>
                  <p className="text-xs text-[#79746D] dark:text-gray-300 max-w-sm mx-auto">
                    Please sign in with your verified Gmail account to write and manage your salon reviews.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className="px-5 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl transition-all cursor-pointer inline-flex items-center gap-2 shadow-xs"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span>Sign In / Register</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Feedback Banner / Alerts */}
                  {reviewSuccessMsg && (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{reviewSuccessMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewSuccessMsg('')}
                        className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {reviewError && (
                    <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{reviewError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReviewError('')}
                        className="text-red-700 hover:text-red-900 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* SECTION 1: WRITE A NEW REVIEW */}
                  <div className="p-4 sm:p-5 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-2xl shadow-xs space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E6D4BA]/40 dark:border-white/10 pb-3">
                      <div>
                        <h4 className="font-serif font-bold text-sm text-[#1C1B1A] dark:text-white flex items-center gap-2">
                          <Star className="w-4 h-4 text-[#C29F67] fill-[#C29F67]" />
                          <span>Leave Your Salon Review</span>
                        </h4>
                        <p className="text-[11px] text-[#79746D] dark:text-gray-400 mt-0.5">
                          Reviewing as <strong>{customer.name}</strong> ({customer.email})
                        </p>
                      </div>
                      <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                        Verified Account
                      </span>
                    </div>

                    <form onSubmit={handleSubmitCustomerReview} className="space-y-4">
                      {/* Star Rating Selector */}
                      <div>
                        <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1.5">
                          Star Rating (1 to 5 Stars) *
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                onMouseEnter={() => setReviewHoverRating(star)}
                                onMouseLeave={() => setReviewHoverRating(0)}
                                className="p-1 text-[#C29F67] hover:scale-110 transition-transform cursor-pointer"
                                aria-label={`${star} star rating`}
                              >
                                <Star
                                  className={`w-6 h-6 ${
                                    (reviewHoverRating || reviewRating) >= star
                                      ? 'fill-[#C29F67] text-[#C29F67]'
                                      : 'text-gray-300 dark:text-gray-600'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                          <span className="text-xs font-bold text-[#9C753D] dark:text-[#C29F67] ml-2">
                            {reviewRating === 5
                              ? '5 ★ - Excellent'
                              : reviewRating === 4
                              ? '4 ★ - Great'
                              : reviewRating === 3
                              ? '3 ★ - Good'
                              : reviewRating === 2
                              ? '2 ★ - Fair'
                              : '1 ★ - Poor'}
                          </span>
                        </div>
                      </div>

                      {/* Review Textarea */}
                      <div>
                        <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                          Written Review & Experience *
                        </label>
                        <textarea
                          required
                          rows={3}
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder="Share your experience with our salon services, hair styling, skin care, staff hospitality, or ambience..."
                          className="w-full p-3 text-xs bg-[#FAF7F2] dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden transition-all"
                        />
                        <p className="text-[10px] text-[#79746D] dark:text-gray-400 mt-1">
                          Moderation notice: Your genuine feedback will appear publicly once approved by salon administration.
                        </p>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={reviewSubmitting || !reviewText.trim()}
                          className="px-5 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                        >
                          {reviewSubmitting ? (
                            <>
                              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Submit Review</span>
                            </>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* EDIT REVIEW MODAL / INLINE DRAWER */}
                  {editingReview && (
                    <div className="p-4 sm:p-5 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800 rounded-2xl shadow-xs space-y-4">
                      <div className="flex items-center justify-between border-b border-amber-200 dark:border-amber-800/60 pb-2">
                        <div className="flex items-center gap-2">
                          <Edit3 className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
                          <h4 className="font-bold text-xs text-[#1C1B1A] dark:text-white">
                            Edit Your Review
                          </h4>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditingReview(null)}
                          className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      <form onSubmit={handleUpdateCustomerReview} className="space-y-3">
                        <div>
                          <label className="block text-[11px] font-bold text-[#1C1B1A] dark:text-white mb-1">
                            Updated Rating:
                          </label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setEditRating(star)}
                                onMouseEnter={() => setEditHoverRating(star)}
                                onMouseLeave={() => setEditHoverRating(0)}
                                className="p-0.5 text-[#C29F67] cursor-pointer"
                              >
                                <Star
                                  className={`w-5 h-5 ${
                                    (editHoverRating || editRating) >= star
                                      ? 'fill-[#C29F67] text-[#C29F67]'
                                      : 'text-gray-300 dark:text-gray-600'
                                  }`}
                                />
                              </button>
                            ))}
                            <span className="text-xs font-semibold text-[#9C753D] dark:text-[#C29F67] ml-2">
                              {editRating} ★
                            </span>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-[#1C1B1A] dark:text-white mb-1">
                            Updated Review Text:
                          </label>
                          <textarea
                            rows={3}
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full p-2.5 text-xs bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white outline-hidden"
                          />
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingReview(null)}
                            className="px-3 py-1.5 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-black/5 rounded-lg cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={editSubmitting || !editText.trim()}
                            className="px-4 py-1.5 bg-[#1C1B1A] dark:bg-[#C29F67] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {editSubmitting ? 'Saving...' : 'Save & Resubmit'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  {/* SECTION 2: LIST OF SUBMITTED REVIEWS */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-serif font-bold text-sm text-[#1C1B1A] dark:text-white flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
                        <span>My Reviews History ({customerReviews.length})</span>
                      </h4>
                      <button
                        type="button"
                        onClick={loadCustomerReviews}
                        className="text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingReviews ? 'animate-spin' : ''}`} />
                        <span>Refresh</span>
                      </button>
                    </div>

                    {loadingReviews ? (
                      <div className="p-8 text-center text-xs text-[#79746D]">
                        Loading your reviews...
                      </div>
                    ) : customerReviews.length === 0 ? (
                      <div className="p-8 text-center bg-white dark:bg-white/5 border border-dashed border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl space-y-2">
                        <Star className="w-8 h-8 text-[#C29F67] mx-auto opacity-50" />
                        <p className="text-xs font-bold text-[#1C1B1A] dark:text-white">
                          No reviews submitted yet
                        </p>
                        <p className="text-[11px] text-[#79746D] dark:text-gray-400 max-w-sm mx-auto">
                          Have you visited Tassel Unisex Salon recently? Share your feedback with us above!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {customerReviews.map((rev) => {
                          const isApproved = rev.status === 'approved';
                          const isRejected = rev.status === 'rejected';
                          const isHidden = rev.status === 'hidden';
                          const isPending = !rev.status || rev.status === 'pending';

                          return (
                            <div
                              key={rev.id}
                              className="p-4 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl space-y-3 shadow-2xs hover:border-[#C29F67]/60 transition-colors"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <div className="flex items-center gap-0.5 text-[#C29F67]">
                                      {[...Array(rev.rating)].map((_, i) => (
                                        <Star key={i} className="w-3.5 h-3.5 fill-[#C29F67]" />
                                      ))}
                                    </div>
                                    <span className="text-[11px] font-bold text-[#1C1B1A] dark:text-white">
                                      {rev.rating} / 5 Stars
                                    </span>
                                  </div>
                                  <p className="text-[10px] text-[#79746D] dark:text-gray-400">
                                    Submitted on {rev.reviewDate} · Source: {rev.source}
                                  </p>
                                </div>

                                {/* Status Badge */}
                                {isApproved && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Approved & Public</span>
                                  </span>
                                )}
                                {isPending && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    <span>Under Moderation</span>
                                  </span>
                                )}
                                {isRejected && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800">
                                    Declined
                                  </span>
                                )}
                                {isHidden && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 border border-gray-200 dark:border-white/10">
                                    Hidden
                                  </span>
                                )}
                              </div>

                              <p className="text-xs text-[#1C1B1A] dark:text-gray-200 italic leading-relaxed bg-[#FAF7F2] dark:bg-white/5 p-3 rounded-lg border border-[#E6D4BA]/30 dark:border-white/5">
                                "{rev.reviewText}"
                              </p>

                              {/* Actions: Edit & Delete */}
                              <div className="flex items-center justify-between pt-1 border-t border-gray-100 dark:border-white/10 text-xs">
                                <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" />
                                  <span>Verified Client Review</span>
                                </span>

                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingReview(rev);
                                      setEditRating(rev.rating);
                                      setEditText(rev.reviewText);
                                    }}
                                    className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-[#9C753D] dark:hover:text-[#C29F67] hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    disabled={deletingReviewId === rev.id}
                                    onClick={() => handleDeleteCustomerReview(rev.id)}
                                    className="p-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-md transition-colors flex items-center gap-1 text-[11px] font-bold cursor-pointer disabled:opacity-50"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{deletingReviewId === rev.id ? 'Deleting...' : 'Delete'}</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PROFILE & PREFERENCES */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {!customer ? (
                <div className="text-center py-8 space-y-3">
                  <User className="w-10 h-10 text-[#C29F67] mx-auto opacity-70" />
                  <h4 className="font-serif font-bold text-base text-[#1C1B1A] dark:text-white">
                    Sign In to Access Profile & Settings
                  </h4>
                  <p className="text-xs text-[#79746D] dark:text-gray-300 max-w-sm mx-auto">
                    Log in with your Gmail to view and customize your styling profile, sensitive scalp requests, and notification preferences.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('bookings')}
                    className="px-5 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] text-white text-xs font-bold rounded-lg cursor-pointer"
                  >
                    Go to Sign In / Sign Up
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Account Information Card */}
                  <div className="p-4 bg-white dark:bg-white/5 border border-[#E6D4BA]/70 dark:border-white/10 rounded-xl space-y-3 shadow-2xs">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <h4 className="font-bold text-sm text-[#1C1B1A] dark:text-white">
                          Verified Customer Account
                        </h4>
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        Active Account
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-[#79746D] dark:text-gray-400 block font-medium">Customer Name:</span>
                        <span className="font-bold text-[#1C1B1A] dark:text-white">{customer.name}</span>
                      </div>
                      <div>
                        <span className="text-[#79746D] dark:text-gray-400 block font-medium">Verified Gmail:</span>
                        <span className="font-bold text-[#1C1B1A] dark:text-white">{customer.email}</span>
                      </div>
                      <div>
                        <span className="text-[#79746D] dark:text-gray-400 block font-medium">Mobile Phone:</span>
                        <span className="font-bold text-[#1C1B1A] dark:text-white">{customer.phone}</span>
                      </div>
                      <div>
                        <span className="text-[#79746D] dark:text-gray-400 block font-medium">Security:</span>
                        <button
                          type="button"
                          onClick={() => setChangePasswordModal(true)}
                          className="text-[#9C753D] dark:text-[#C29F67] hover:underline font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5" />
                          <span>Change Password (Gmail OTP)</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Styling Preferences Form */}
                  <form onSubmit={handleSavePreferences} className="space-y-4">
                    <h4 className="font-serif font-bold text-sm text-[#1C1B1A] dark:text-white">
                      Styling Preferences & Special Requests
                    </h4>

                    <div>
                      <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                        Preferred Stylist / Specialist
                      </label>
                      <select
                        value={preferredStylist}
                        onChange={(e) => setPreferredStylist(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-[#1A1918] border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                      >
                        <option value="Any Available Master Stylist">Any Available Master Stylist</option>
                        <option value="Senior Hair Craft Artisan">Senior Hair Craft Artisan</option>
                        <option value="Skin & Aesthetician Expert">Skin & Aesthetician Expert</option>
                        <option value="Bridal & Occasion Makeup Specialist">Bridal & Occasion Makeup Specialist</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                        Hair & Skin Sensitivities / Special Requests
                      </label>
                      <textarea
                        rows={2}
                        placeholder="e.g. Sensitive scalp, prefer ammonia-free organic hair color, aloe vera facial soothe."
                        value={specialRequests}
                        onChange={(e) => setSpecialRequests(e.target.value)}
                        className="w-full px-3.5 py-2 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden font-medium"
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-between">
                      <button
                        type="submit"
                        className="px-6 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Preferences</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleLogout(true)}
                        className="px-4 py-2 border border-red-200 dark:border-red-900/60 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: THEME & DISPLAY */}
          {activeTab === 'theme' && (
            <div className="space-y-5 text-xs">
              <div>
                <h4 className="font-bold text-sm text-[#1C1B1A] dark:text-white">
                  Color Theme Preference
                </h4>
                <p className="text-[#79746D] dark:text-gray-400 text-xs mt-0.5">
                  Set how Tassel Unisex Salon displays across your device. The entire website immediately adapts.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => onThemeChange('light')}
                  className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                    currentTheme === 'light'
                      ? 'border-[#C29F67] bg-[#FAF7F2] dark:bg-white/10 shadow-xs ring-2 ring-[#C29F67]/50'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-white/5'
                  }`}
                >
                  <Sun className="w-5 h-5 mx-auto text-[#C29F67] mb-1.5" />
                  <span className="block font-bold text-[#1C1B1A] dark:text-white">Light Mode</span>
                  <span className="text-[10px] text-[#79746D] dark:text-gray-400">Warm Ivory & Gold</span>
                </button>

                <button
                  type="button"
                  onClick={() => onThemeChange('dark')}
                  className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                    currentTheme === 'dark'
                      ? 'border-[#C29F67] bg-[#FAF7F2] dark:bg-white/10 shadow-xs ring-2 ring-[#C29F67]/50'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-white/5'
                  }`}
                >
                  <Moon className="w-5 h-5 mx-auto text-[#9C753D] dark:text-[#C29F67] mb-1.5" />
                  <span className="block font-bold text-[#1C1B1A] dark:text-white">Dark Mode</span>
                  <span className="text-[10px] text-[#79746D] dark:text-gray-400">Luxury Onyx & Gold</span>
                </button>

                <button
                  type="button"
                  onClick={() => onThemeChange('system')}
                  className={`p-3.5 rounded-xl border text-center transition-all cursor-pointer ${
                    currentTheme === 'system'
                      ? 'border-[#C29F67] bg-[#FAF7F2] dark:bg-white/10 shadow-xs ring-2 ring-[#C29F67]/50'
                      : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 bg-white dark:bg-white/5'
                  }`}
                >
                  <Laptop className="w-5 h-5 mx-auto text-[#79746D] mb-1.5" />
                  <span className="block font-bold text-[#1C1B1A] dark:text-white">System Auto</span>
                  <span className="text-[10px] text-[#79746D] dark:text-gray-400">Match Device</span>
                </button>
              </div>

              {/* Notification Toggles */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/10 space-y-3">
                <h4 className="font-bold text-sm text-[#1C1B1A] dark:text-white">
                  WhatsApp & Alerts Channels
                </h4>

                <label className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-[#1C1B1A] dark:text-white block">WhatsApp Booking Updates</span>
                      <span className="text-[11px] text-[#79746D] dark:text-gray-400">
                        Receive instant status changes and reminders from salon admin
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={whatsappNotify}
                    onChange={(e) => setWhatsappNotify(e.target.checked)}
                    className="w-4 h-4 text-[#C29F67] rounded border-gray-300 focus:ring-[#C29F67]"
                  />
                </label>

                <label className="flex items-center justify-between p-3 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
                    <div>
                      <span className="font-bold text-[#1C1B1A] dark:text-white block">SMS Reminder Notifications</span>
                      <span className="text-[11px] text-[#79746D] dark:text-gray-400">
                        Standard text notifications for upcoming appointments
                      </span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={smsNotify}
                    onChange={(e) => setSmsNotify(e.target.checked)}
                    className="w-4 h-4 text-[#C29F67] rounded border-gray-300 focus:ring-[#C29F67]"
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CHANGE PASSWORD WITH REAL GMAIL OTP */}
      {changePasswordModal && customer && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border border-[#E6D4BA]/90 dark:border-white/20 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-[#E6D4BA]/40 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-[#C29F67]" />
                <h4 className="font-serif font-bold text-base text-[#1C1B1A] dark:text-white">
                  Change Password (Gmail OTP)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setChangePasswordModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {changePassMsg && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-lg text-xs font-semibold">
                {changePassMsg}
              </div>
            )}
            {changePassError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg text-xs font-semibold">
                {changePassError}
              </div>
            )}

            <form onSubmit={handleChangePassSubmit} className="space-y-3.5 text-xs">
              <div className="p-3 bg-[#FAF7F2] dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 flex items-center justify-between">
                <div>
                  <span className="block font-bold text-[#1C1B1A] dark:text-white">Gmail ID:</span>
                  <span className="text-[#79746D] dark:text-gray-400 font-mono">{customer.email}</span>
                </div>
                <button
                  type="button"
                  onClick={handleSendChangePassOtp}
                  disabled={changePassCountdown > 0}
                  className="px-3 py-1.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {changePassCountdown > 0
                    ? `Resend (${changePassCountdown}s)`
                    : changePassOtpSent
                    ? 'Resend OTP'
                    : 'Send OTP'}
                </button>
              </div>

              {changePassOtpSent && (
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Enter 6-Digit OTP Code Sent to Gmail *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    required
                    placeholder="123456"
                    value={changePassOtp}
                    onChange={(e) => setChangePassOtp(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-center font-mono text-sm tracking-widest bg-white dark:bg-black/30 border border-gray-300 dark:border-white/20 rounded-lg text-[#1C1B1A] dark:text-white font-bold outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                  New Password * (Min 6 characters)
                </label>
                <div className="relative">
                  <input
                    type={showChangePassNew ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Enter new password"
                    value={changePassNew}
                    onChange={(e) => setChangePassNew(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowChangePassNew(!showChangePassNew)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showChangePassNew ? 'Hide password' : 'Show password'}
                    title={showChangePassNew ? 'Hide password' : 'Show password'}
                  >
                    {showChangePassNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] text-white font-bold rounded-lg cursor-pointer"
                >
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* POPUP: PREVIEW CUSTOM BOOKING CARD */}
      {viewingCardAppt && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border border-[#E6D4BA]/90 dark:border-white/20 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between border-b border-[#E6D4BA]/40 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#C29F67]" />
                <h4 className="font-serif font-bold text-base text-[#1C1B1A] dark:text-white">
                  Booking Confirmation Card
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setViewingCardAppt(null)}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl space-y-2.5 text-xs">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-2">
                <span className="text-[#79746D] dark:text-gray-400 font-semibold">Reference No:</span>
                <span className="font-mono font-bold text-[#1C1B1A] dark:text-white text-sm">
                  #{viewingCardAppt.bookingNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#79746D] dark:text-gray-400 font-semibold">Service:</span>
                <span className="font-bold text-[#1C1B1A] dark:text-white">{viewingCardAppt.serviceName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#79746D] dark:text-gray-400 font-semibold">Price & Time:</span>
                <span className="font-bold text-[#9C753D] dark:text-[#E6D4BA]">
                  ₹{viewingCardAppt.servicePrice} · {viewingCardAppt.serviceDuration} mins
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#79746D] dark:text-gray-400 font-semibold">Date & Slot:</span>
                <span className="font-bold text-[#1C1B1A] dark:text-white">
                  {formatDateIST(viewingCardAppt.date)} at {formatTimeRange12(viewingCardAppt.time, viewingCardAppt.endTime)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#79746D] dark:text-gray-400 font-semibold">Customer:</span>
                <span className="font-bold text-[#1C1B1A] dark:text-white">
                  {viewingCardAppt.customerName} ({viewingCardAppt.customerPhone})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#79746D] dark:text-gray-400 font-semibold">Status:</span>
                <div>{getStatusBadge(viewingCardAppt.status)}</div>
              </div>
              <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-start gap-1.5 text-[11px] text-[#79746D] dark:text-gray-400">
                <MapPin className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67] shrink-0 mt-0.5" />
                <span>2nd Floor, Ultimate Arcade, F11-12, Kolar Road, Bhopal</span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleOpenWhatsAppForBooking(viewingCardAppt)}
                className="w-full py-2.5 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-xs"
              >
                <MessageCircle className="w-4 h-4 fill-white" />
                <span>Chat with Admin on WhatsApp</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadIcs(viewingCardAppt)}
                className="w-full py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#1C1B1A] dark:text-white text-xs font-bold rounded-lg hover:bg-gray-50 dark:hover:bg-white/15 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                <span>Save to Calendar (.ics)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CUSTOMER CANCELLATION CONFIRMATION DIALOG */}
      {cancellingAppt && (
        <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
          <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border border-red-200 dark:border-red-900/60 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                  <XCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-bold text-base text-[#1C1B1A] dark:text-white">
                    Cancel Appointment
                  </h4>
                  <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                    Ref #{cancellingAppt.bookingNumber}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCancellingAppt(null);
                  setCancelError('');
                }}
                disabled={cancelSubmitting}
                className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error banner if any */}
            {cancelError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{cancelError}</span>
              </div>
            )}

            {/* Booking Details Summary */}
            <div className="p-3.5 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/70 dark:border-white/10 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#79746D] dark:text-gray-400">Service:</span>
                <span className="font-bold text-[#1C1B1A] dark:text-white">{cancellingAppt.serviceName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#79746D] dark:text-gray-400">Date & Time:</span>
                <span className="font-semibold text-[#1C1B1A] dark:text-white">
                  {formatDateIST(cancellingAppt.date)} at {formatTimeRange12(cancellingAppt.time, cancellingAppt.endTime)}
                </span>
              </div>
              {cancellingAppt.stylistName && (
                <div className="flex items-center justify-between">
                  <span className="text-[#79746D] dark:text-gray-400">Stylist:</span>
                  <span className="font-semibold text-[#9C753D] dark:text-[#E6D4BA]">{cancellingAppt.stylistName}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-[#79746D] dark:text-gray-400">Price:</span>
                <span className="font-bold text-[#9C753D] dark:text-[#E6D4BA]">₹{cancellingAppt.servicePrice}</span>
              </div>
            </div>

            <p className="text-xs text-[#79746D] dark:text-gray-300 leading-relaxed">
              Are you sure you want to cancel this booking? Once cancelled, <strong>your reserved time slot will be released</strong> immediately for other clients, and cancellation confirmations will be dispatched to your Gmail and the salon admin.
            </p>

            {/* Reason selection */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white">
                Reason for Cancellation:
              </label>
              <select
                value={cancelReasonPreset}
                onChange={(e) => setCancelReasonPreset(e.target.value)}
                disabled={cancelSubmitting}
                className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
              >
                <option value="Schedule Conflict / Change of Plans">Schedule Conflict / Change of Plans</option>
                <option value="Feeling unwell / Medical emergency">Feeling unwell / Medical emergency</option>
                <option value="Travelling / Out of Bhopal">Travelling / Out of Bhopal</option>
                <option value="Booked wrong date/time slot">Booked wrong date/time slot</option>
                <option value="Other">Other / Custom Note</option>
              </select>

              {cancelReasonPreset === 'Other' && (
                <textarea
                  rows={2}
                  placeholder="Please specify your reason (optional)..."
                  value={cancelCustomReason}
                  onChange={(e) => setCancelCustomReason(e.target.value)}
                  disabled={cancelSubmitting}
                  className="w-full px-3 py-2 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67] resize-none"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  setCancellingAppt(null);
                  setCancelError('');
                }}
                disabled={cancelSubmitting}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-[#1C1B1A] dark:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                Keep Booking
              </button>

              <button
                type="button"
                onClick={handleConfirmCancellation}
                disabled={cancelSubmitting}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                {cancelSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Releasing Slot...</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Confirm Cancel & Release</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POPUP: REALISTIC CONFIRMATION DIALOG */}
      {confirmModal && (
        <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border border-[#E6D4BA]/90 dark:border-white/20 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-center space-y-3 my-auto">
            <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <Check className="w-6 h-6" />
            </div>
            <h4 className="font-serif font-bold text-lg text-[#1C1B1A] dark:text-white">
              {confirmModal.title}
            </h4>
            <p className="text-xs text-[#79746D] dark:text-gray-300">
              {confirmModal.message}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="w-full py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
