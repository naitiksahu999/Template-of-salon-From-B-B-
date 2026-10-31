import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MapPin,
  ExternalLink,
  Download,
  MessageCircle,
  Ban,
  Lock,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  Send,
  Check,
  Star,
  Scissors,
  Users,
  ArrowLeftRight,
  Eye,
  EyeOff
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Service, ServiceCategory, DayAvailabilityResponse, Appointment, SiteSettings, BusinessHoursDay, BlockedDate, StaffMember, formatServicePrice } from '../types/index.ts';
import { api, setCustomerToken, getCustomerToken } from '../api.ts';
import { generateWhatsAppBookingCard, generateCustomerInquiryWhatsAppMessage, openAdminWhatsApp } from '../utils/whatsapp.ts';
import { formatTime12, formatTimeRange12, formatDateIST } from '../utils/timeFormat.ts';

export interface CustomerUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  isVerified?: boolean;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  preSelectedServiceId?: string | null;
  services: Service[];
  categories: ServiceCategory[];
  settings?: SiteSettings | null;
  customerUser?: CustomerUser | null;
  onCustomerUserChange?: (user: CustomerUser | null) => void;
  onOpenCustomerSettings?: () => void;
  businessHours?: BusinessHoursDay[];
  blockedDates?: BlockedDate[];
}

export const BookingModal: React.FC<BookingModalProps> = ({
  isOpen,
  onClose,
  preSelectedServiceId,
  services,
  categories,
  settings,
  customerUser,
  onCustomerUserChange,
  onOpenCustomerSettings,
  businessHours = [],
  blockedDates = []
}) => {
  const [step, setStep] = useState<number>(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedServiceId, setSelectedServiceId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');

  // Mobile services right-to-left scroll ref & progress tracker
  const servicesScrollRef = useRef<HTMLDivElement>(null);
  const [serviceScrollProgress, setServiceScrollProgress] = useState<number>(0);

  const handleServicesScroll = () => {
    if (servicesScrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = servicesScrollRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        setServiceScrollProgress(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
      } else {
        setServiceScrollProgress(0);
      }
    }
  };

  // Stylist Selection State
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [selectedStylistId, setSelectedStylistId] = useState<string>('');
  const [selectedStylistName, setSelectedStylistName] = useState<string>('Any Available Specialist');

  // Customer details (Strictly auto-filled from verified customer login)
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Authentication state for mandatory booking verification
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [loginOtpCode, setLoginOtpCode] = useState<string>('');
  const [loginOtpSent, setLoginOtpSent] = useState<boolean>(false);
  const [loginCountdown, setLoginCountdown] = useState<number>(0);

  const [signupName, setSignupName] = useState<string>('');
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupPhone, setSignupPhone] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');
  const [signupOtpCode, setSignupOtpCode] = useState<string>('');
  const [signupOtpSent, setSignupOtpSent] = useState<boolean>(false);
  const [signupCountdown, setSignupCountdown] = useState<number>(0);

  const [authError, setAuthError] = useState<string>('');
  const [authSuccessMsg, setAuthSuccessMsg] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [showSignupPassword, setShowSignupPassword] = useState<boolean>(false);

  // Availability state
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [availability, setAvailability] = useState<DayAvailabilityResponse | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string>('');

  // Submitting state
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string>('');
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);
  const [resendingCard, setResendingCard] = useState<boolean>(false);
  const [resendCardSuccess, setResendCardSuccess] = useState<string>('');

  const handleResendBookingCard = async () => {
    if (!confirmedBooking) return;
    setResendingCard(true);
    setResendCardSuccess('');
    try {
      const res = await api.resendBookingCard({ bookingNumber: confirmedBooking.bookingNumber });
      setResendCardSuccess(res.message || `✓ Booking card re-dispatched to ${confirmedBooking.customerEmail || email}!`);
    } catch (err: any) {
      setResendCardSuccess(err.message || 'Failed to resend booking card');
    } finally {
      setResendingCard(false);
    }
  };

  // Set today as default date in YYYY-MM-DD format (IST aware)
  const getTodayStr = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };

  const todayStr = getTodayStr();

  // Countdown timer for OTP resend
  useEffect(() => {
    const timer = setInterval(() => {
      setSignupCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      setLoginCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch live public stylists and staff members
  useEffect(() => {
    if (isOpen) {
      api.getPublicStaff()
        .then((res) => {
          if (Array.isArray(res) && res.length > 0) {
            setStaffList(res);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Sync customer details from active login session and verify token integrity
  useEffect(() => {
    if (!isOpen) return;

    const token = getCustomerToken();
    if (!token) {
      if (customerUser) {
        onCustomerUserChange?.(null);
      }
      setName('');
      setPhone('');
      setEmail('');
      return;
    }

    if (customerUser) {
      setName(customerUser.name || '');
      setPhone(customerUser.phone || '');
      setEmail(customerUser.email || '');
    } else {
      try {
        const stored = localStorage.getItem('salon_customer_user');
        if (stored) {
          const u = JSON.parse(stored);
          onCustomerUserChange?.(u);
          setName(u.name || '');
          setPhone(u.phone || '');
          setEmail(u.email || '');
        }
      } catch {}
    }

    // Actively verify session with server to guarantee no desynchronization
    api.getCustomerMe()
      .then((res) => {
        if (res?.customer) {
          onCustomerUserChange?.(res.customer);
          setName(res.customer.name || '');
          setPhone(res.customer.phone || '');
          setEmail(res.customer.email || '');
          localStorage.setItem('salon_customer_user', JSON.stringify(res.customer));
        } else {
          api.clearCustomerToken();
          onCustomerUserChange?.(null);
          setName('');
          setPhone('');
          setEmail('');
        }
      })
      .catch(() => {
        api.clearCustomerToken();
        onCustomerUserChange?.(null);
        setName('');
        setPhone('');
        setEmail('');
      });
  }, [isOpen]);

  // Real-time OTP dispatch for Signup
  const handleSendBookingSignupOtp = async () => {
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setAuthError('Please enter a valid Gmail address to receive the verification OTP.');
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.sendOtp(signupEmail.trim().toLowerCase(), 'email');
      setSignupOtpSent(true);
      setSignupCountdown(60);
      setAuthSuccessMsg(res.message || `✓ A 6-digit verification code was sent to ${signupEmail}. Please check your Gmail inbox, read the code, and enter it below.`);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to dispatch verification OTP to Gmail.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Real-time OTP dispatch for Login
  const handleSendBookingLoginOtp = async () => {
    if (!loginIdentifier.trim() || !loginIdentifier.includes('@')) {
      setAuthError('Please enter your registered Gmail address to receive the login OTP.');
      return;
    }
    setAuthError('');
    setAuthLoading(true);
    try {
      const res = await api.sendOtp(loginIdentifier.trim().toLowerCase(), 'email');
      setLoginOtpSent(true);
      setLoginCountdown(60);
      setAuthSuccessMsg(res.message || `✓ A 6-digit login code was sent to ${loginIdentifier}. Please check your Gmail inbox, read the code, and enter it below.`);
    } catch (err: any) {
      setAuthError(err.message || 'Failed to send login OTP to Gmail.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign up with real Gmail OTP verification
  const handleBookingSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (!signupName.trim() || !signupEmail.trim() || !signupPhone.trim() || !signupPassword) {
      setAuthError('All fields (Name, Gmail, Mobile Phone, and Password) are required.');
      return;
    }

    if (signupPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }

    if (!signupOtpCode.trim()) {
      setAuthError('Verification OTP is strictly required to confirm that this Gmail belongs to you.');
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
      localStorage.setItem('salon_customer_user', JSON.stringify(res.customer));
      onCustomerUserChange?.(res.customer);

      // Auto-fill customer details for the booking
      setName(res.customer.name);
      setPhone(res.customer.phone);
      setEmail(res.customer.email);

      setAuthSuccessMsg('✓ Account created and Gmail verified! Details have been automatically filled.');
      setStep(selectedServiceId ? 2 : 1);
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed. Please check your OTP and try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  // Sign in with Gmail (Password or OTP)
  const handleBookingLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccessMsg('');

    if (!loginIdentifier.trim()) {
      setAuthError('Please enter your registered Gmail address or phone number.');
      return;
    }

    if (loginMethod === 'password' && !loginPassword) {
      setAuthError('Please enter your password.');
      return;
    }

    if (loginMethod === 'otp' && !loginOtpCode.trim()) {
      setAuthError('Please enter the 6-digit OTP code sent to your Gmail.');
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
      localStorage.setItem('salon_customer_user', JSON.stringify(res.customer));
      onCustomerUserChange?.(res.customer);

      // Auto-fill customer details for the booking
      setName(res.customer.name);
      setPhone(res.customer.phone);
      setEmail(res.customer.email);

      setAuthSuccessMsg('✓ Logged in successfully! Details have been automatically filled.');
      setStep(selectedServiceId ? 2 : 1);
    } catch (err: any) {
      setAuthError(err.message || 'Login failed. Please verify your credentials or OTP.');
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedDate) {
      setSelectedDate(todayStr);
    }
  }, [todayStr]);

  // Sync pre-selected service when modal opens
  useEffect(() => {
    if (preSelectedServiceId) {
      setSelectedServiceId(preSelectedServiceId);
      setStep(2); // Jump straight to date & time selection
    } else if (services.length > 0 && !selectedServiceId) {
      const firstActive = services.find((s) => s.isActive);
      if (firstActive) setSelectedServiceId(firstActive.id);
    }
  }, [preSelectedServiceId, services]);

  // Fetch slots whenever selectedDate or selectedServiceId changes
  useEffect(() => {
    if (!selectedDate || !selectedServiceId || !isOpen) return;

    let isMounted = true;
    setLoadingSlots(true);
    setAvailabilityError('');

    api
      .getAvailability(selectedDate, selectedServiceId)
      .then((res) => {
        if (!isMounted) return;
        setAvailability(res);
        if (!res.isOpen) {
          setAvailabilityError(res.message || 'Salon is closed on this date.');
        } else if (res.slots.length === 0) {
          setAvailabilityError('No available time slots remaining for this date.');
        } else {
          // If previously selected time is not available in new date, clear it
          if (selectedTime && !res.slots.find((s) => s.time === selectedTime && s.isAvailable)) {
            setSelectedTime('');
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setAvailabilityError(err.message || 'Failed to check availability.');
        setAvailability(null);
      })
      .finally(() => {
        if (isMounted) setLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedServiceId, isOpen]);

  const selectedService = services.find((s) => s.id === selectedServiceId);

  // Generate next 14 dates for rapid date chip selection
  const upcomingDates = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    d.setDate(d.getDate() + i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const dayLabel = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
    const dateLabel = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    return { dateStr, dayLabel, dateLabel };
  });

  // Calculate current minutes passed today in India (IST)
  const getCurrentBhopalMinutes = () => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return now.getHours() * 60 + now.getMinutes();
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerUser || !getCustomerToken()) {
      api.clearCustomerToken();
      onCustomerUserChange?.(null);
      setAuthError('Your login session expired. Please sign in or register with your verified Gmail account before booking.');
      return;
    }

    if (!selectedServiceId || !selectedDate || !selectedTime || !name || !phone) {
      setSubmitError('Please complete all required fields.');
      return;
    }

    // Strict validation: Don't allow booking passed slots
    if (selectedDate === todayStr) {
      const [h, m] = selectedTime.split(':').map(Number);
      const slotM = h * 60 + m;
      if (slotM <= getCurrentBhopalMinutes()) {
        setSubmitError('This time slot has already passed. Please select an upcoming available slot.');
        return;
      }
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const bookingName = (name || customerUser.name).trim();
      const bookingPhone = (phone || customerUser.phone).trim();
      const bookingEmail = (email || customerUser.email).trim();

      const res = await api.createBooking({
        serviceId: selectedServiceId,
        date: selectedDate,
        time: selectedTime,
        customerName: bookingName,
        customerPhone: bookingPhone,
        customerEmail: bookingEmail || undefined,
        stylistId: selectedStylistId || undefined,
        stylistName: selectedStylistName || 'Any Available Specialist',
        notes: notes || undefined,
        customerId: customerUser.id
      });

      setConfirmedBooking(res.appointment);

      // 1. Permanently cache profile for user convenience
      try {
        const profile = { name, phone, email };
        localStorage.setItem('salon_customer_profile', JSON.stringify(profile));
      } catch {}

      // 2. Save booking number to salon_my_booking_numbers array
      try {
        const existingRaw = localStorage.getItem('salon_my_booking_numbers');
        const numList: string[] = existingRaw ? JSON.parse(existingRaw) : [];
        if (!numList.includes(res.appointment.bookingNumber)) {
          numList.unshift(res.appointment.bookingNumber);
          localStorage.setItem('salon_my_booking_numbers', JSON.stringify(numList));
        }
      } catch {}

      // 3. Save full appointment to salon_customer_bookings array
      try {
        const existingAptRaw = localStorage.getItem('salon_customer_bookings');
        const aptList: Appointment[] = existingAptRaw ? JSON.parse(existingAptRaw) : [];
        const filtered = aptList.filter((a) => a.id !== res.appointment.id && a.bookingNumber !== res.appointment.bookingNumber);
        filtered.unshift(res.appointment);
        localStorage.setItem('salon_customer_bookings', JSON.stringify(filtered));
      } catch {}

      // Trigger celebratory confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#C29F67', '#1C1B1A', '#E6D4BA']
      });
    } catch (err: any) {
      const errMsg = err.message || 'Could not complete appointment. Please pick another time slot.';
      if (errMsg.includes('log in') || errMsg.includes('sign in') || errMsg.includes('401') || errMsg.includes('Unauthorized') || errMsg.includes('Strictly Prohibited')) {
        api.clearCustomerToken();
        onCustomerUserChange?.(null);
        setAuthError('Your login session expired. Please verify your Gmail or enter your password to confirm reservation.');
        setSubmitError('');
      } else {
        setSubmitError(errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadCalendar = () => {
    if (!confirmedBooking) return;
    const startIso = `${confirmedBooking.date.replace(/-/g, '')}T${confirmedBooking.time.replace(':', '')}00`;
    const endIso = `${confirmedBooking.date.replace(/-/g, '')}T${confirmedBooking.endTime.replace(':', '')}00`;
    const salonTitle = settings?.salonName || 'B & B Family Salon';
    const salonPhone = settings?.phone || '+91 91316 29031';
    const salonAddress = settings?.address
      ? `${settings.address}, ${settings.city || 'Bhopal'}, ${settings.state || 'MP'}`
      : '2nd Floor, Ultimate Arcade, F11-12, Kolar Road, Bhopal, Madhya Pradesh';

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//${salonTitle}//Appointment//EN`,
      'BEGIN:VEVENT',
      `UID:${confirmedBooking.id}@bbfamilysalon.com`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `SUMMARY:Appointment: ${confirmedBooking.serviceName} at ${salonTitle}`,
      `DESCRIPTION:Booking #${confirmedBooking.bookingNumber}\\nService: ${confirmedBooking.serviceName}\\nDuration: ${confirmedBooking.serviceDuration} mins\\nCustomer: ${confirmedBooking.customerName}\\nPhone: ${salonPhone}`,
      `LOCATION:${salonAddress}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.setAttribute('download', `appointment-${confirmedBooking.bookingNumber}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  const currentMinutesToday = getCurrentBhopalMinutes();

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-hidden animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-2xl h-[94dvh] sm:h-auto sm:max-h-[88vh] flex flex-col bg-[#FBFBFA] dark:bg-[#1A1918] border-t sm:border border-[#E6D4BA]/60 dark:border-white/10 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden transition-all"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        {/* Header Bar - Sticky & shrink-proof close button */}
        <div className="px-3.5 sm:px-6 py-3 sm:py-4 border-b border-[#E6D4BA]/40 dark:border-white/10 bg-[#FAF7F2] dark:bg-[#141312] flex items-center justify-between gap-2.5 shrink-0 sticky top-0 z-20">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#9C753D] dark:text-[#C29F67] font-semibold flex items-center gap-2 truncate">
              <span>B&B Family Salon · Bhopal</span>
              {!customerUser && (
                <span className="text-amber-800 dark:text-amber-300 font-bold bg-amber-100 dark:bg-amber-950/70 px-2 py-0.5 rounded-full text-[10px] flex items-center gap-1 border border-amber-300 dark:border-amber-700 shrink-0">
                  <Lock className="w-3 h-3" />
                  <span>Login Required</span>
                </span>
              )}
            </div>
            <h2 id="modal-title" className="text-base sm:text-2xl font-serif text-[#1C1B1A] dark:text-white font-bold truncate">
              {!customerUser
                ? 'Gmail Verification Required'
                : confirmedBooking
                ? confirmedBooking.status === 'pending'
                  ? 'Appointment Request Received'
                  : 'Appointment Confirmed'
                : 'Reserve Your Appointment'}
            </h2>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-10 h-10 min-w-[40px] min-h-[40px] text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white rounded-xl bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
            aria-label="Close booking modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator */}
        {!customerUser ? (
          <div className="px-6 py-3 bg-amber-50/70 dark:bg-amber-950/30 border-b border-amber-200/60 dark:border-amber-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] text-[11px] font-bold flex items-center justify-center">
                1
              </span>
              <span className="font-bold text-[#1C1B1A] dark:text-white">
                Step 1: Verify Gmail OTP & Log In (Required)
              </span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
            <div className="flex items-center gap-1.5 text-gray-400 dark:text-gray-500 font-medium">
              <Lock className="w-3.5 h-3.5" />
              <span>Step 2: Service, Stylist & Schedule (Locked)</span>
            </div>
          </div>
        ) : !confirmedBooking ? (
          <div>
            <div className="px-3 sm:px-6 py-2.5 bg-white dark:bg-[#1C1B1A] border-b border-[#E6D4BA]/30 dark:border-white/10 flex items-center justify-between text-xs overflow-x-auto no-scrollbar gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold ${
                    step === 1 ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]' : step > 1 ? 'bg-[#C29F67] text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  1
                </span>
                <span className={`text-[11px] sm:text-xs font-semibold ${step === 1 ? 'text-[#1C1B1A] dark:text-white font-bold' : 'text-[#79746D] dark:text-gray-400'}`}>
                  Service
                </span>
              </div>
              <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold ${
                    step === 2 ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]' : step > 2 ? 'bg-[#C29F67] text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  2
                </span>
                <span className={`text-[11px] sm:text-xs font-semibold ${step === 2 ? 'text-[#1C1B1A] dark:text-white font-bold' : 'text-[#79746D] dark:text-gray-400'}`}>
                  Stylist
                </span>
              </div>
              <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold ${
                    step === 3 ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]' : step > 3 ? 'bg-[#C29F67] text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  3
                </span>
                <span className={`text-[11px] sm:text-xs font-semibold ${step === 3 ? 'text-[#1C1B1A] dark:text-white font-bold' : 'text-[#79746D] dark:text-gray-400'}`}>
                  Schedule
                </span>
              </div>
              <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold ${
                    step === 4 ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]' : step > 4 ? 'bg-[#C29F67] text-white' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  4
                </span>
                <span className={`text-[11px] sm:text-xs font-semibold ${step === 4 ? 'text-[#1C1B1A] dark:text-white font-bold' : 'text-[#79746D] dark:text-gray-400'}`}>
                  Details
                </span>
              </div>
              <ChevronRight className="w-3 h-3 text-gray-300 dark:text-gray-600 shrink-0" />
              <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-semibold ${
                    step === 5 ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                  }`}
                >
                  5
                </span>
                <span className={`text-[11px] sm:text-xs font-semibold ${step === 5 ? 'text-[#1C1B1A] dark:text-white font-bold' : 'text-[#79746D] dark:text-gray-400'}`}>
                  Confirm
                </span>
              </div>
            </div>

            {/* Customer Session Banner with Switch Account Action */}
            <div className="px-4 sm:px-6 py-2 bg-emerald-50/90 dark:bg-emerald-950/40 border-b border-emerald-200/60 dark:border-emerald-800/40 flex items-center justify-between text-xs">
              <div className="flex items-center gap-1.5 min-w-0">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="truncate text-emerald-900 dark:text-emerald-200 text-[11px] sm:text-xs">
                  Signed in as <strong>{customerUser.name}</strong> ({customerUser.email})
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  api.clearCustomerToken();
                  onCustomerUserChange?.(null);
                  setName('');
                  setPhone('');
                  setEmail('');
                }}
                className="text-[11px] text-red-600 dark:text-red-400 hover:underline font-bold shrink-0 ml-2 cursor-pointer whitespace-nowrap"
              >
                Not you? Switch Account
              </button>
            </div>
          </div>
        ) : null}

        {/* Modal Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto overscroll-contain pb-6">
          {!customerUser ? (
            <div className="space-y-4">
              {/* Strictly Prohibited Notice */}
              <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-1.5 text-xs text-amber-900 dark:text-amber-200">
                <div className="flex items-center gap-2 font-bold text-amber-950 dark:text-amber-100">
                  <Lock className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67] shrink-0" />
                  <span>Strictly Prohibited: Sign-Up or Login with Gmail Required</span>
                </div>
                <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-relaxed">
                  Booking an appointment without an authenticated account is strictly prohibited. You must verify and log in with your Gmail address to unlock appointment booking. Upon login, your username and phone number will be automatically filled into the booking form, and your official <strong>Booking Card</strong> will be automatically delivered directly to your verified Gmail inbox.
                </p>
              </div>

              {/* Sub-tabs: Sign In vs Sign Up with Gmail */}
              <div className="flex items-center border-b border-gray-200 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError('');
                    setAuthSuccessMsg('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                    authMode === 'login'
                      ? 'border-[#C29F67] text-[#1C1B1A] dark:text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Sign In (Existing User)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setAuthError('');
                    setAuthSuccessMsg('');
                  }}
                  className={`flex-1 py-2 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1.5 ${
                    authMode === 'signup'
                      ? 'border-[#C29F67] text-[#1C1B1A] dark:text-white'
                      : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                  <span>Sign Up with Gmail OTP</span>
                </button>
              </div>

              {/* Messages */}
              {authError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{authError}</span>
                </div>
              )}

              {authSuccessMsg && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{authSuccessMsg}</span>
                </div>
              )}

              {/* SIGN IN VIEW */}
              {authMode === 'login' && (
                <form onSubmit={handleBookingLogin} className="space-y-3">
                  <div className="flex items-center gap-3 text-xs mb-1">
                    <span className="text-[#79746D] dark:text-gray-400 font-medium">Login via:</span>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="loginMethod"
                        checked={loginMethod === 'password'}
                        onChange={() => setLoginMethod('password')}
                        className="accent-[#C29F67]"
                      />
                      <span className="font-semibold text-[#1C1B1A] dark:text-white">Password</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="radio"
                        name="loginMethod"
                        checked={loginMethod === 'otp'}
                        onChange={() => setLoginMethod('otp')}
                        className="accent-[#C29F67]"
                      />
                      <span className="font-semibold text-[#1C1B1A] dark:text-white">Gmail OTP</span>
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                      Registered Gmail or Mobile Phone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. yourname@gmail.com or 9826012345"
                        value={loginIdentifier}
                        onChange={(e) => setLoginIdentifier(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden"
                      />
                    </div>
                  </div>

                  {loginMethod === 'password' ? (
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type={showLoginPassword ? 'text' : 'password'}
                          required
                          placeholder="Enter your password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden"
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
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            6-Digit Gmail OTP Code <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Enter 6-digit code"
                              value={loginOtpCode}
                              onChange={(e) => setLoginOtpCode(e.target.value)}
                              className="w-full pl-9 pr-3 py-2.5 text-xs font-mono tracking-widest bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden"
                            />
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleSendBookingLoginOtp}
                          disabled={authLoading || loginCountdown > 0 || !loginIdentifier.includes('@')}
                          className="py-2.5 px-3 bg-[#FAF7F2] dark:bg-white/10 border border-[#E6D4BA]/90 dark:border-white/20 text-[#1C1B1A] dark:text-white text-xs font-bold rounded-lg hover:bg-[#F3EBDD] disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
                        >
                          {loginCountdown > 0 ? `Resend (${loginCountdown}s)` : 'Send OTP'}
                        </button>
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
                    <span>Sign In & Unlock Booking</span>
                  </button>
                </form>
              )}

              {/* SIGN UP VIEW WITH REAL GMAIL OTP VERIFICATION */}
              {authMode === 'signup' && (
                <form onSubmit={handleBookingSignup} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                      Gmail Address <span className="text-red-500">*</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="email"
                          required
                          placeholder="e.g. rahul.sharma@gmail.com"
                          value={signupEmail}
                          onChange={(e) => setSignupEmail(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleSendBookingSignupOtp}
                        disabled={authLoading || signupCountdown > 0 || !signupEmail.includes('@')}
                        className="py-2 px-3 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] text-white text-xs font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                      >
                        {signupCountdown > 0 ? `Resend (${signupCountdown}s)` : signupOtpSent ? 'Resend OTP' : 'Send OTP'}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#79746D] dark:text-gray-400 mt-1">
                      A real 6-digit OTP will be dispatched to confirm this is your own Gmail address.
                    </p>
                  </div>

                  {signupOtpSent && (
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                        6-Digit Gmail OTP Verification Code <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <KeyRound className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          maxLength={6}
                          required
                          placeholder="Enter 6-digit code received on Gmail"
                          value={signupOtpCode}
                          onChange={(e) => setSignupOtpCode(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs font-mono tracking-widest bg-white dark:bg-white/5 border-2 border-[#C29F67] rounded-lg text-[#1C1B1A] dark:text-white outline-hidden"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                        Mobile Phone (WhatsApp) <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="tel"
                          required
                          placeholder="+91 98260 12345"
                          value={signupPhone}
                          onChange={(e) => setSignupPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                        Create Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type={showSignupPassword ? 'text' : 'password'}
                          required
                          placeholder="At least 6 chars"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                          className="w-full pl-9 pr-10 py-2 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden"
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
                    disabled={authLoading || !signupOtpSent}
                    className="w-full py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    <span>Verify Gmail OTP & Unlock Booking</span>
                  </button>
                </form>
              )}

              <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-[11px] text-[#79746D] dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                  <span>Services &amp; time slots unlock immediately after sign in</span>
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-xs font-semibold hover:text-[#1C1B1A] dark:hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* STEP 1: Select Service */}
              {step === 1 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs sm:text-sm text-[#79746D] dark:text-gray-300 font-medium">
                  Select the grooming or beauty service you would like to experience:
                </p>
              </div>

              {/* Category Segmented Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-100 dark:border-white/10 text-xs no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] font-bold shadow-xs'
                      : 'text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                  }`}
                >
                  All Services
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] font-bold shadow-xs'
                        : 'text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* MOBILE VIEW: HORIZONTAL RIGHT-TO-LEFT SCROLLING SERVICES WITH SCROLLBAR (MOBILE ONLY) */}
              <div className="block sm:hidden space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#9C753D] dark:text-[#C29F67] font-semibold px-0.5">
                  <span className="flex items-center gap-1">
                    <ArrowLeftRight className="w-3 h-3" />
                    <span>Scroll Right to Left to select service</span>
                  </span>
                  <span>{services.filter((s) => s.isActive && (selectedCategory === 'all' || s.categoryId === selectedCategory)).length} options</span>
                </div>
                <div
                  ref={servicesScrollRef}
                  onScroll={handleServicesScroll}
                  className="flex gap-2.5 overflow-x-auto pb-3 pt-1 px-1 snap-x snap-mandatory scroll-smooth touch-pan-x mobile-scrollbar [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#E6D4BA]/30 dark:[&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#C29F67] [&::-webkit-scrollbar-thumb]:rounded-full"
                >
                  {services
                    .filter((s) => s.isActive && (selectedCategory === 'all' || s.categoryId === selectedCategory))
                    .map((service) => {
                      const isSelected = selectedServiceId === service.id;
                      return (
                        <div
                          key={service.id}
                          onClick={() => setSelectedServiceId(service.id)}
                          className={`w-[230px] shrink-0 snap-start p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col justify-between shadow-2xs ${
                            isSelected
                              ? 'border-[#C29F67] bg-[#FAF7F2] dark:bg-white/10 shadow-xs ring-1 ring-[#C29F67]'
                              : 'border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white line-clamp-1">{service.name}</h4>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? 'border-[#C29F67] bg-[#C29F67] text-white'
                                    : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent'
                                }`}
                              >
                                {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                              </div>
                            </div>
                            <p className="text-xs text-[#79746D] dark:text-gray-300 line-clamp-2">{service.description}</p>
                          </div>
                          <div className="flex items-center justify-between text-xs pt-2 mt-2 border-t border-gray-100 dark:border-white/10">
                            <span className="flex items-center gap-1 text-[#79746D] dark:text-gray-400 font-medium">
                              <Clock className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                              {service.durationMinutes}m
                            </span>
                            <span className="font-bold text-[#1C1B1A] dark:text-white tabular-nums">
                              {formatServicePrice(service)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>

                {/* Dedicated Visible Right-to-Left Scroll Bar & Progress Track */}
                {(() => {
                  const filteredCount = services.filter((s) => s.isActive && (selectedCategory === 'all' || s.categoryId === selectedCategory)).length;
                  return (
                    <div className="mt-1 px-1">
                      <div
                        className="w-full bg-[#E6D4BA]/40 dark:bg-white/10 h-2.5 rounded-full overflow-hidden relative shadow-inner cursor-pointer"
                        title="Touch or tap along the bar to scroll right to left"
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                          if (servicesScrollRef.current) {
                            const maxScroll = servicesScrollRef.current.scrollWidth - servicesScrollRef.current.clientWidth;
                            servicesScrollRef.current.scrollTo({ left: maxScroll * clickRatio, behavior: 'smooth' });
                          }
                        }}
                      >
                        <div
                          className="bg-[#C29F67] dark:bg-[#C29F67] h-full rounded-full transition-all duration-75 shadow-xs"
                          style={{
                            width: `${Math.max(25, 100 / Math.max(1, filteredCount))}%`,
                            marginLeft: `${(serviceScrollProgress * (100 - Math.max(25, 100 / Math.max(1, filteredCount)))) / 100}%`
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-[#9C753D] dark:text-[#C29F67] font-semibold mt-1 px-0.5">
                        <span className="flex items-center gap-1">
                          <ArrowLeftRight className="w-3 h-3" />
                          <span>Scroll Right to Left to select service</span>
                        </span>
                        <span>{filteredCount} options</span>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* DESKTOP VIEW: SERVICES LIST (HIDDEN ON MOBILE) */}
              <div className="hidden sm:grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {services
                  .filter((s) => s.isActive && (selectedCategory === 'all' || s.categoryId === selectedCategory))
                  .map((service) => {
                    const isSelected = selectedServiceId === service.id;
                    return (
                      <div
                        key={service.id}
                        onClick={() => setSelectedServiceId(service.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected
                            ? 'border-[#C29F67] bg-[#FAF7F2] dark:bg-white/10 shadow-xs ring-1 ring-[#C29F67]'
                            : 'border-gray-200/80 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300 dark:hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white">{service.name}</h4>
                              {service.isFeatured && (
                                <span className="text-[10px] text-[#9C753D] dark:text-[#E6D4BA] font-semibold tracking-wide bg-[#FAF7F2] dark:bg-white/10 px-2 py-0.5 rounded-full border border-[#E6D4BA]/60 dark:border-white/10">
                                  Featured
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#79746D] dark:text-gray-300 line-clamp-1">{service.description}</p>
                            <div className="flex items-center gap-3 text-xs text-[#79746D] dark:text-gray-400 pt-1 font-medium">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                                {service.durationMinutes} mins
                              </span>
                              <span className="text-gray-300 dark:text-gray-600">·</span>
                              <span className="font-bold text-[#1C1B1A] dark:text-white tabular-nums">
                                {formatServicePrice(service)}
                              </span>
                            </div>
                          </div>
                          <div
                            className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                              isSelected
                                ? 'border-[#C29F67] bg-[#C29F67] text-white'
                                : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-transparent'
                            }`}
                          >
                            {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex justify-end pt-3 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  disabled={!selectedServiceId}
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Choose Preferred Stylist
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: STYLIST SELECTION / STAFF PROFILE CHOICE */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-[#9C753D] dark:text-[#C29F67] font-bold uppercase tracking-wider">
                  <Scissors className="w-3.5 h-3.5" />
                  <span>Stylist & Specialist Selection</span>
                </div>
                <h3 className="text-base sm:text-lg font-serif font-bold text-[#1C1B1A] dark:text-white">
                  Pick Your Preferred Hairdresser or Specialist
                </h3>
                <p className="text-xs text-[#79746D] dark:text-gray-300">
                  Salon clients often have strong loyalty to specific hairdressers. Choose your favorite stylist below or select Any Available Stylist for the fastest booking.
                </p>
              </div>

              {/* Selected Service Snippet */}
              {selectedService && (
                <div className="p-3 bg-[#FAF7F2] dark:bg-white/5 rounded-xl border border-[#E6D4BA]/50 dark:border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#9C753D] dark:text-[#C29F67] font-semibold text-[11px]">Selected Service:</span>
                    <p className="font-bold text-[#1C1B1A] dark:text-white">{selectedService.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#1C1B1A] dark:text-white tabular-nums">{formatServicePrice(selectedService)}</p>
                    <span className="text-[10px] text-[#79746D] dark:text-gray-400">{selectedService.durationMinutes} mins</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Default Choice: Any Available Stylist */}
                <div
                  onClick={() => {
                    setSelectedStylistId('');
                    setSelectedStylistName('Any Available Specialist');
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                    !selectedStylistId
                      ? 'border-[#C29F67] bg-[#FAF7F2] dark:bg-white/10 ring-1 ring-[#C29F67]'
                      : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-12 h-12 rounded-full bg-[#FAF7F2] dark:bg-white/10 border border-[#E6D4BA] dark:border-white/20 flex items-center justify-center text-[#9C753D] dark:text-[#C29F67] shrink-0 shadow-2xs">
                      <Sparkles className="w-5 h-5 text-[#C29F67]" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-serif text-sm font-bold text-[#1C1B1A] dark:text-white truncate">
                          Any Available Stylist
                        </h4>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded font-bold shrink-0">
                          Fastest
                        </span>
                      </div>
                      <p className="text-[11px] text-[#79746D] dark:text-gray-400 mt-0.5 truncate">
                        Assigned to the first available master artisan on duty
                      </p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-2 ${
                      !selectedStylistId
                        ? 'border-[#C29F67] bg-[#C29F67] text-white'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                  >
                    {!selectedStylistId && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                {/* Specific Stylists */}
                {staffList.filter((s) => s.isActive).map((staff) => {
                  const isSelected = selectedStylistId === staff.id;
                  return (
                    <div
                      key={staff.id}
                      onClick={() => {
                        setSelectedStylistId(staff.id);
                        setSelectedStylistName(staff.name);
                      }}
                      className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-[#C29F67] bg-[#FAF7F2] dark:bg-white/10 ring-1 ring-[#C29F67]'
                          : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-3 min-w-0">
                          <img
                            src={staff.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'}
                            alt={staff.name}
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
                            }}
                            className="w-12 h-12 rounded-full object-cover border border-[#E6D4BA] dark:border-white/20 shrink-0 shadow-2xs"
                          />
                          <div className="min-w-0">
                            <h4 className="font-serif text-sm font-bold text-[#1C1B1A] dark:text-white leading-tight truncate">
                              {staff.name}
                            </h4>
                            <span className="inline-block text-[10px] text-[#9C753D] dark:text-[#C29F67] font-semibold mt-0.5 truncate max-w-full">
                              {staff.role}
                            </span>
                            <div className="flex items-center gap-2 text-[11px] text-[#79746D] dark:text-gray-400 mt-0.5">
                              <span className="flex items-center gap-0.5 text-amber-500 font-bold">
                                <Star className="w-3 h-3 fill-amber-500" />
                                {staff.rating.toFixed(1)}
                              </span>
                              <span>·</span>
                              <span>{staff.experienceYears}+ yrs exp</span>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                            isSelected
                              ? 'border-[#C29F67] bg-[#C29F67] text-white'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                      </div>

                      {staff.specialties && staff.specialties.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 pt-1.5 border-t border-gray-100 dark:border-white/10">
                          {staff.specialties.slice(0, 3).map((spec, i) => (
                            <span
                              key={i}
                              className="text-[9px] bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 px-1.5 py-0.5 rounded text-[#79746D] dark:text-gray-300"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 text-xs font-bold text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back to Service
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-5 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
                >
                  Continue to Schedule
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Select Date & Time Slot */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Selected Service Snippet */}
              {selectedService && (
                <div className="p-3 bg-[#FAF7F2] dark:bg-white/5 rounded-xl border border-[#E6D4BA]/50 dark:border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[#9C753D] dark:text-[#C29F67] font-semibold">Selected Service:</span>
                    <p className="font-bold text-[#1C1B1A] dark:text-white">{selectedService.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-[#1C1B1A] dark:text-white tabular-nums">{formatServicePrice(selectedService)}</p>
                    <p className="text-[#79746D] dark:text-gray-400">{selectedService.durationMinutes} mins</p>
                  </div>
                </div>
              )}

              {/* Date Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#1C1B1A] dark:text-white">
                    1. Pick Appointment Date
                  </label>
                  {blockedDates.length > 0 && (
                    <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold">
                      Live Holiday & Schedule Aware
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-[#E6D4BA]/30 dark:[&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#C29F67] [&::-webkit-scrollbar-thumb]:rounded-full">
                  {upcomingDates.map((item) => {
                    const isSelected = selectedDate === item.dateStr;
                    const blockMatch = blockedDates.find((b) => b.date === item.dateStr && b.allDay);
                    const partialMatch = blockedDates.find((b) => b.date === item.dateStr && !b.allDay);
                    const [y, m, d] = item.dateStr.split('-').map(Number);
                    const dayOfWeek = new Date(y, m - 1, d).getDay();
                    const dayCfg = businessHours.find((h) => h.dayOfWeek === dayOfWeek);
                    const isDayClosed = dayCfg ? !dayCfg.isOpen : false;

                    let statusBadge = null;
                    if (blockMatch) {
                      statusBadge = (
                        <span className="text-[8px] uppercase tracking-wider font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 px-1 py-0.2 rounded-xs mt-0.5">
                          Holiday
                        </span>
                      );
                    } else if (isDayClosed) {
                      statusBadge = (
                        <span className="text-[8px] uppercase tracking-wider font-bold bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 px-1 py-0.2 rounded-xs mt-0.5">
                          Closed
                        </span>
                      );
                    } else if (partialMatch) {
                      statusBadge = (
                        <span className="text-[8px] uppercase tracking-wider font-bold bg-blue-100 dark:bg-blue-950/80 text-blue-800 dark:text-blue-300 px-1 py-0.2 rounded-xs mt-0.5">
                          Special
                        </span>
                      );
                    }

                    return (
                      <button
                        key={item.dateStr}
                        type="button"
                        onClick={() => setSelectedDate(item.dateStr)}
                        className={`flex flex-col items-center justify-center p-2.5 min-w-[76px] rounded-xl border transition-all text-center cursor-pointer relative ${
                          isSelected
                            ? 'border-[#C29F67] bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] shadow-xs'
                            : blockMatch || isDayClosed
                            ? 'border-amber-200/80 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 text-[#1C1B1A] dark:text-white hover:border-amber-300'
                            : 'border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 text-[#1C1B1A] dark:text-white hover:border-gray-300 dark:hover:border-white/20'
                        }`}
                      >
                        <span className={`text-[10px] uppercase font-bold ${isSelected ? 'text-[#E6D4BA] dark:text-[#1C1B1A]' : 'text-[#79746D] dark:text-gray-400'}`}>
                          {item.dayLabel}
                        </span>
                        <span className="text-sm font-bold tracking-tight mt-0.5">
                          {item.dateLabel}
                        </span>
                        {statusBadge}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Date Notice if Blocked */}
                {(() => {
                  const currentBlock = blockedDates.find((b) => b.date === selectedDate);
                  const [y, m, d] = selectedDate.split('-').map(Number);
                  const dayOfWeek = new Date(y, m - 1, d).getDay();
                  const dayCfg = businessHours.find((h) => h.dayOfWeek === dayOfWeek);
                  const isClosed = dayCfg ? !dayCfg.isOpen : false;

                  if (currentBlock) {
                    return (
                      <div className="mt-2.5 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">
                            {currentBlock.allDay ? 'Salon Holiday / Closure on this Date' : 'Special Operating Window'}
                          </p>
                          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
                            <strong>Reason:</strong> {currentBlock.reason}
                            {!currentBlock.allDay && currentBlock.startTime && ` (Blocked from ${currentBlock.startTime} to ${currentBlock.endTime})`}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  if (isClosed) {
                    return (
                      <div className="mt-2.5 p-3 bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-gray-700 dark:text-gray-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="font-bold">Salon is Closed on this Day</p>
                          <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                            Per weekly schedule, B&B Family Salon is closed on {dayCfg?.dayName || 'this day'}. Please select an open date.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return null;
                })()}
              </div>

              {/* Time Slots Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-[#1C1B1A] dark:text-white">
                    2. Select Available Time Slot
                  </label>
                  {availability?.openTime && (
                    <span className="text-[11px] text-[#79746D] dark:text-gray-400">
                      Salon Hours: {formatTimeRange12(availability.openTime, availability.closeTime)}
                    </span>
                  )}
                </div>

                {loadingSlots ? (
                  <div className="py-8 flex flex-col items-center justify-center text-xs text-[#79746D] dark:text-gray-400">
                    <div className="w-6 h-6 border-2 border-[#C29F67] border-t-transparent rounded-full animate-spin mb-2" />
                    Checking real-time slot availability...
                  </div>
                ) : availabilityError ? (
                  <div className="p-4 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">{availabilityError}</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-0.5">
                        Please choose an alternative date above.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-52 overflow-y-auto pr-1">
                      {availability?.slots.map((slot) => {
                        const isSelected = selectedTime === slot.time;

                        // Check if slot start time has already passed today
                        let isPassed = false;
                        if (selectedDate === todayStr) {
                          const [h, m] = slot.time.split(':').map(Number);
                          const slotM = h * 60 + m;
                          if (slotM <= currentMinutesToday) {
                            isPassed = true;
                          }
                        }

                        // Check if booked (either marked by backend or booked reason)
                        const isBooked =
                          slot.slotType === 'booked' ||
                          (!slot.isAvailable && !isPassed && (slot.reason?.toLowerCase().includes('book') || false));

                        // Slot can only be chosen if it's available AND not passed AND not booked
                        const canSelect = slot.isAvailable && !isPassed && !isBooked;

                        if (isPassed) {
                          // Past slot: clearly disabled, cannot select
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled
                              title="This time slot has already passed"
                              className="py-2 px-2 text-[11px] font-medium rounded-lg border text-center transition-all bg-gray-100 dark:bg-white/5 border-gray-200/60 dark:border-white/5 text-gray-400 dark:text-gray-500 cursor-not-allowed opacity-40 select-none flex flex-col items-center justify-center"
                            >
                              <span>{slot.displayTime}</span>
                              <span className="text-[9px] uppercase tracking-wider font-semibold text-gray-400 dark:text-gray-500">Passed</span>
                            </button>
                          );
                        }

                        if (isBooked) {
                          // Already booked slot: clearly visible with crossed mark, cannot select
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled
                              title="Slot is already booked by another customer"
                              className="py-2 px-2 text-[11px] font-semibold rounded-lg border text-center transition-all bg-red-50/60 dark:bg-red-950/20 border-red-200/70 dark:border-red-900/30 text-red-500 dark:text-red-400 cursor-not-allowed opacity-75 select-none flex flex-col items-center justify-center relative overflow-hidden"
                            >
                              <span className="line-through decoration-red-500 decoration-2">{slot.displayTime}</span>
                              <span className="text-[9px] uppercase tracking-wider font-bold text-red-600 dark:text-red-400">Booked ✕</span>
                            </button>
                          );
                        }

                        if (!canSelect) {
                          // Other unavailable (e.g. staff break or blocked)
                          return (
                            <button
                              key={slot.time}
                              type="button"
                              disabled
                              title={slot.reason || 'Slot unavailable'}
                              className="py-2 px-2 text-[11px] font-medium rounded-lg border text-center transition-all bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-400 dark:text-gray-500 line-through cursor-not-allowed opacity-50"
                            >
                              {slot.displayTime}
                            </button>
                          );
                        }

                        // Available slot: selectable!
                        return (
                          <button
                            key={slot.time}
                            type="button"
                            onClick={() => setSelectedTime(slot.time)}
                            className={`py-2 px-2.5 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#C29F67] border-[#C29F67] text-white shadow-xs ring-2 ring-[#C29F67]/50'
                                : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-[#1C1B1A] dark:text-white hover:border-[#C29F67] hover:bg-[#FAF7F2] dark:hover:bg-white/10'
                            }`}
                          >
                            {slot.displayTime}
                          </button>
                        );
                      })}
                    </div>

                    {/* Slot legend */}
                    <div className="flex items-center gap-4 text-[10px] text-[#79746D] dark:text-gray-400 pt-1 border-t border-gray-100 dark:border-white/10">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-white dark:bg-white/10 border border-[#C29F67]" />
                        <span>Available</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-red-100 dark:bg-red-950/40 border border-red-300 text-red-600 line-through text-[8px] flex items-center justify-center font-bold">✕</span>
                        <span>Already Booked (Crossed)</span>
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm bg-gray-200 dark:bg-white/10 opacity-50" />
                        <span>Time Passed</span>
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 text-xs font-bold text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep(4)}
                  className="px-5 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Enter Details
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Customer Details (Strictly Auto-filled from Verified Login) */}
          {step === 4 && customerUser && !confirmedBooking && (
            <div className="space-y-4">
              {/* LOGGED-IN CUSTOMER DETAILS (AUTOMATICALLY FILLED) */}
              <div className="space-y-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold text-emerald-950 dark:text-emerald-100">
                        Logged In as {customerUser.name}
                      </span>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                        Verified Gmail: <strong>{customerUser.email}</strong> · Customer details filled automatically
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    Verified
                  </span>
                </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                        Full Name <span className="text-emerald-600 text-[10px] font-normal">(✓ Auto-filled from login)</span>
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                        Mobile Number (WhatsApp) <span className="text-emerald-600 text-[10px] font-normal">(✓ Auto-filled from login)</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="tel"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                        Verified Gmail Address <span className="text-emerald-600 text-[10px] font-normal">(✓ Auto-filled · Booking Card will be delivered here)</span>
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="email"
                          required
                          readOnly
                          value={email}
                          className="w-full pl-9 pr-3 py-2.5 text-xs bg-gray-50 dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white font-medium cursor-not-allowed outline-hidden"
                        />
                      </div>
                      <p className="text-[10px] text-[#79746D] dark:text-gray-400 mt-1">
                        Your official appointment card and confirmation details will be automatically sent to this verified Gmail address.
                      </p>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                        Special Requests or Hair/Skin Notes <span className="text-gray-400 font-normal">(Optional)</span>
                      </label>
                      <div className="relative">
                        <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                        <textarea
                          rows={2}
                          placeholder="Any sensitivities, hair history, styling preferences..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Navigation buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setStep(3)}
                      className="px-4 py-2 text-xs font-bold text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      type="button"
                      disabled={!name.trim() || !phone.trim() || !email.trim()}
                      onClick={() => setStep(5)}
                      className="px-5 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Review Summary
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
            </div>
          )}

          {/* STEP 5: Review & Confirm */}
          {step === 5 && !confirmedBooking && (
            <div className="space-y-4">
              <div className="p-4 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between border-b border-[#E6D4BA]/40 dark:border-white/10 pb-2">
                  <span className="text-xs uppercase tracking-wider text-[#9C753D] dark:text-[#C29F67] font-bold">
                    Appointment Summary
                  </span>
                  <span className="text-xs font-bold text-[#1C1B1A] dark:text-white tabular-nums">
                    {formatServicePrice(selectedService)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-[#79746D] dark:text-gray-400 text-[11px]">Service</span>
                    <p className="font-bold text-[#1C1B1A] dark:text-white">{selectedService?.name}</p>
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400">{selectedService?.durationMinutes} minutes duration</p>
                  </div>
                  <div>
                    <span className="text-[#79746D] dark:text-gray-400 text-[11px]">Date & Time</span>
                    <p className="font-bold text-[#1C1B1A] dark:text-white">{formatDateIST(selectedDate)}</p>
                    <p className="text-[#9C753D] dark:text-[#C29F67] font-bold">{formatTime12(selectedTime)}</p>
                  </div>
                  <div>
                    <span className="text-[#79746D] dark:text-gray-400 text-[11px]">Customer & Gmail</span>
                    <p className="font-bold text-[#1C1B1A] dark:text-white">{name}</p>
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400">{phone}</p>
                    <p className="text-[11px] text-[#9C753D] dark:text-[#C29F67] font-semibold flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />
                      <span>{email}</span>
                    </p>
                  </div>
                  <div>
                    <span className="text-[#79746D] dark:text-gray-400 text-[11px]">Selected Stylist</span>
                    <p className="font-bold text-[#1C1B1A] dark:text-white flex items-center gap-1">
                      <Scissors className="w-3.5 h-3.5 text-[#C29F67]" />
                      <span>{selectedStylistName || 'Any Available Specialist'}</span>
                    </p>
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400">Ultimate Arcade, Kolar Rd</p>
                  </div>
                </div>

                {/* Simple, unhighlighted email notice */}
                {email && (
                  <div className="text-center pt-1">
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                      Confirmation will be sent to <span className="font-medium text-[#1C1B1A] dark:text-white">{email}</span>
                    </p>
                  </div>
                )}

                {notes && (
                  <div className="pt-2 border-t border-[#E6D4BA]/30 dark:border-white/10 text-xs">
                    <span className="text-[#79746D] dark:text-gray-400 text-[11px]">Client Notes:</span>
                    <p className="text-[#1C1B1A] dark:text-white italic">"{notes}"</p>
                  </div>
                )}
              </div>

              {submitError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                  <span>{submitError}</span>
                </div>
              )}

              <div className="text-[11px] text-[#79746D] dark:text-gray-400 bg-white dark:bg-white/5 p-3 border border-gray-100 dark:border-white/10 rounded-lg">
                <p className="font-bold text-[#1C1B1A] dark:text-white">Notice & Payment Policy:</p>
                <p className="mt-0.5">
                  No advance payment is required online. Pay seamlessly at the salon via UPI, Card, or Cash after your session. Please arrive 5 minutes prior to your reserved slot.
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setStep(4)}
                  className="px-4 py-2 text-xs font-bold text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleBookingSubmit}
                  className="px-6 py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Securing Slot...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Confirm Reservation
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Booking Confirmed Success Screen */}
          {confirmedBooking && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 bg-[#FAF7F2] dark:bg-white/10 border border-[#C29F67] rounded-full flex items-center justify-center mx-auto text-[#C29F67] shadow-inner">
                <Sparkles className="w-7 h-7" />
              </div>

              <div>
                <span className={`text-xs uppercase tracking-widest font-bold ${
                  confirmedBooking.status === 'pending'
                    ? 'text-amber-700 dark:text-amber-400'
                    : 'text-[#9C753D] dark:text-[#C29F67]'
                }`}>
                  {confirmedBooking.status === 'pending' ? '⏳ Request Submitted (Pending Salon Confirmation)' : 'Reservation Confirmed'}
                </span>
                <h3 className="text-2xl font-serif text-[#1C1B1A] dark:text-white mt-0.5 font-bold">
                  {confirmedBooking.status === 'pending'
                    ? 'Appointment Request Received!'
                    : 'We look forward to hosting you!'}
                </h3>
                <p className="text-xs text-[#79746D] dark:text-gray-300 max-w-md mx-auto mt-1">
                  {confirmedBooking.status === 'pending'
                    ? 'Your booking request is safely recorded in your account. The salon reception will review and confirm your slot. You will receive an update once confirmed.'
                    : 'Your appointment has been registered and permanently saved to your salon account.'}
                </p>
              </div>

              <div className="p-4 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl text-left max-w-md mx-auto space-y-2 text-xs">
                <div className="flex items-center justify-between border-b border-[#E6D4BA]/40 dark:border-white/10 pb-2">
                  <span className="text-[#79746D] dark:text-gray-400">Booking Reference:</span>
                  <span className="font-mono font-bold text-[#1C1B1A] dark:text-white text-sm">
                    {confirmedBooking.bookingNumber}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#79746D] dark:text-gray-400">Service:</span>
                  <span className="font-bold text-[#1C1B1A] dark:text-white">{confirmedBooking.serviceName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#79746D] dark:text-gray-400">Date & Time:</span>
                  <span className="font-bold text-[#1C1B1A] dark:text-white">
                    {formatDateIST(confirmedBooking.date)} · {formatTimeRange12(confirmedBooking.time, confirmedBooking.endTime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#79746D] dark:text-gray-400">Customer:</span>
                  <span className="font-bold text-[#1C1B1A] dark:text-white">{confirmedBooking.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#79746D] dark:text-gray-400">Status:</span>
                  <span
                    className={`font-bold capitalize px-2 py-0.5 rounded-sm border ${
                      confirmedBooking.status === 'pending'
                        ? 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800'
                        : 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800'
                    }`}
                  >
                    {confirmedBooking.status === 'pending' ? '⏳ Pending Salon Confirmation' : '✓ Confirmed'}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E6D4BA]/40 dark:border-white/10 flex items-start gap-2 text-[11px] text-[#79746D] dark:text-gray-400">
                  <MapPin className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67] shrink-0 mt-0.5" />
                  <span>
                    2nd Floor, Ultimate Arcade, F11-12, Kolar Road (near Sagar Gaire & Vishal Mega Mart), Bhopal
                  </span>
                </div>
              </div>

              {/* Simple, unhighlighted email delivery note */}
              {(confirmedBooking.customerEmail || email) && (
                <div className="py-2 text-center space-y-1.5 max-w-md mx-auto">
                  <p className="text-xs text-[#79746D] dark:text-gray-400">
                    Confirmation details sent to <span className="font-semibold text-[#1C1B1A] dark:text-white">{confirmedBooking.customerEmail || email}</span>
                  </p>
                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      disabled={resendingCard}
                      onClick={handleResendBookingCard}
                      className="inline-flex items-center gap-1 text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline font-medium cursor-pointer disabled:opacity-50"
                    >
                      {resendingCard ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3" />}
                      <span>{resendingCard ? 'Resending...' : 'Resend confirmation email'}</span>
                    </button>
                  </div>
                  {resendCardSuccess && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {resendCardSuccess}
                    </p>
                  )}
                </div>
              )}

              {/* Quick actions for customer */}
              <div className="space-y-2 pt-2 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    const adminNum = settings?.adminWhatsAppPhone || settings?.phone || '+91 91316 29031';
                    const customerInquiryMsg = generateCustomerInquiryWhatsAppMessage(confirmedBooking, settings);
                    openAdminWhatsApp(adminNum, customerInquiryMsg);
                  }}
                  className="w-full py-2.5 px-4 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Talk to Admin on WhatsApp</span>
                </button>

                <div className="flex flex-wrap items-center justify-center gap-2.5">
                  {onOpenCustomerSettings && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCustomerSettings();
                      }}
                      className="flex-1 px-3 py-2 bg-[#1C1B1A] dark:bg-[#C29F67] text-white text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>View in My Bookings</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleDownloadCalendar}
                    className="flex-1 px-3 py-2 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/10 text-[#1C1B1A] dark:text-white text-xs font-semibold rounded-lg hover:bg-gray-50 dark:hover:bg-white/15 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                    Add Calendar (.ics)
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-[#E6D4BA]/80 dark:border-white/20 text-[#1C1B1A] dark:text-white text-xs font-bold rounded-lg hover:bg-[#F3EBDD] dark:hover:bg-white/15 transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
