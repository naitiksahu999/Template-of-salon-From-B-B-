import React, { useState, useEffect } from 'react';
import {
  Lock,
  LogOut,
  Calendar as CalendarIcon,
  Clock,
  User,
  Phone,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Search,
  Plus,
  Edit2,
  Trash2,
  Save,
  RefreshCw,
  Eye,
  Settings,
  Shield,
  Layers,
  Sparkles,
  ChevronLeft,
  X,
  Bell,
  Download,
  Check,
  Send,
  Database,
  Copy,
  ExternalLink,
  UserPlus,
  Image as ImageIcon,
  Upload,
  Camera,
  MessageCircle,
  MapPin,
  Sliders,
  Navigation,
  ArrowLeftRight,
  LayoutGrid,
  Mail,
  Sun,
  Moon,
  Users,
  Star,
  Award,
  MessageSquare,
  ShieldCheck,
  EyeOff
} from 'lucide-react';
import {
  Appointment,
  Service,
  ServiceCategory,
  BusinessHoursDay,
  BlockedDate,
  Customer,
  Review,
  ReviewStatus,
  GalleryItem,
  SiteSettings,
  NotificationLog,
  StaffMember,
  AdminNotification
} from '../types/index.ts';
import { api, getAdminToken, setAdminToken, clearAdminToken, EmailHubData } from '../api.ts';
import {
  generateWhatsAppBookingCard,
  openCustomerWhatsApp,
  WhatsAppCardType
} from '../utils/whatsapp.ts';
import {
  formatTime12,
  formatTimeRange12,
  formatDateIST,
  formatAppointmentSchedule,
  formatTimestampIST,
  parseTimeToMinutes,
  getCurrentIST,
  getAppointmentTemporalStatus
} from '../utils/timeFormat.ts';

interface AdminPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataChanged: () => void;
  initialMode?: 'login' | 'signup';
  onSetupStatusChange?: (isCompleted: boolean) => void;
  settings?: SiteSettings | null;
  onSettingsChange?: (newSettings: SiteSettings) => void;
  onAdminAuthChange?: (isLoggedIn: boolean) => void;
  adminTheme?: 'light' | 'dark';
  onAdminThemeToggle?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  isOpen,
  onClose,
  onDataChanged,
  initialMode = 'login',
  onSetupStatusChange,
  settings: initialSettings,
  onSettingsChange,
  onAdminAuthChange,
  adminTheme = 'light',
  onAdminThemeToggle
}) => {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!getAdminToken();
  });
  // Dedicated Login Inputs (Completely empty by default)
  const [loginIdentifier, setLoginIdentifier] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Dedicated First-Time Sign Up Inputs (Completely empty by default)
  const [signupEmail, setSignupEmail] = useState<string>('');
  const [signupUsername, setSignupUsername] = useState<string>('');
  const [signupPassword, setSignupPassword] = useState<string>('');

  const [loginError, setLoginError] = useState<string>('');
  const [signupSuccessMsg, setSignupSuccessMsg] = useState<string>('');
  const [loggingIn, setLoggingIn] = useState<boolean>(false);
  const [settingsSaveMsg, setSettingsSaveMsg] = useState<string>('');

  // Change password state inside dashboard
  const [currentPasswordInput, setCurrentPasswordInput] = useState<string>('');
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState<string>('');
  const [passwordChangeMsg, setPasswordChangeMsg] = useState<string>('');
  const [passwordChangeError, setPasswordChangeError] = useState<string>('');
  const [changingPassword, setChangingPassword] = useState<boolean>(false);

  // Full Admin Profile / Credentials State (Username, Gmail, Password)
  const [adminUsernameInput, setAdminUsernameInput] = useState<string>('');
  const [adminEmailInput, setAdminEmailInput] = useState<string>('');
  const [adminCredOtpInput, setAdminCredOtpInput] = useState<string>('');
  const [adminCredOtpSent, setAdminCredOtpSent] = useState<boolean>(false);
  const [adminCredOtpCountdown, setAdminCredOtpCountdown] = useState<number>(0);
  const [adminCredSendingOtp, setAdminCredSendingOtp] = useState<boolean>(false);
  const [adminCurrentPasswordInput, setAdminCurrentPasswordInput] = useState<string>('');
  const [adminNewPasswordInput, setAdminNewPasswordInput] = useState<string>('');
  const [adminConfirmPasswordInput, setAdminConfirmPasswordInput] = useState<string>('');
  const [adminCredMsg, setAdminCredMsg] = useState<string>('');
  const [adminCredError, setAdminCredError] = useState<string>('');
  const [updatingAdminCreds, setUpdatingAdminCreds] = useState<boolean>(false);

  // Real-time OTP Verification State
  const [authMethod, setAuthMethod] = useState<'password' | 'otp'>('password');
  const [otpSent, setOtpSent] = useState<boolean>(false);
  const [otpCodeInput, setOtpCodeInput] = useState<string>('');
  const [otpCountdown, setOtpCountdown] = useState<number>(0);
  const [sendingOtp, setSendingOtp] = useState<boolean>(false);
  const [testingEmail, setTestingEmail] = useState<boolean>(false);
  const [testEmailResult, setTestEmailResult] = useState<string>('');
  const [testEmailTarget, setTestEmailTarget] = useState<string>('');

  // Setup state for Single Admin Slot
  const [isSetupCompleted, setIsSetupCompleted] = useState<boolean>(() => {
    return localStorage.getItem('salon_setup_completed') === 'true';
  });
  const [checkingSetup, setCheckingSetup] = useState<boolean>(true);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'appointments' | 'calendar' | 'services' | 'staff' | 'media' | 'hours' | 'blocks' | 'customers' | 'reviews' | 'emails' | 'settings' | 'security' | 'notifications' | 'supabase'
  >('overview');

  // Dedicated Email Accounts Hub & Handover State
  const [emailHub, setEmailHub] = useState<EmailHubData | null>(null);
  const [loadingEmailHub, setLoadingEmailHub] = useState<boolean>(false);
  const [savingEmailHub, setSavingEmailHub] = useState<boolean>(false);
  const [emailHubSaveMsg, setEmailHubSaveMsg] = useState<string>('');
  const [testingBookingAlert, setTestingBookingAlert] = useState<boolean>(false);
  const [handoverOwnerEmail, setHandoverOwnerEmail] = useState<string>('');
  const [handoverOwnerName, setHandoverOwnerName] = useState<string>('');
  const [handoverBookingAlert, setHandoverBookingAlert] = useState<boolean>(true);
  const [handoverAdminLogin, setHandoverAdminLogin] = useState<boolean>(true);
  const [handoverPublicContact, setHandoverPublicContact] = useState<boolean>(true);
  const [handoverSmtp, setHandoverSmtp] = useState<boolean>(false);
  const [emailHubSmtpPassword, setEmailHubSmtpPassword] = useState<string>('');
  const [testBookingAlertResult, setTestBookingAlertResult] = useState<{ success: boolean; message: string } | null>(null);
  const [handoverExecuting, setHandoverExecuting] = useState<boolean>(false);
  const [handoverConfirmModal, setHandoverConfirmModal] = useState<boolean>(false);

  // Show/Hide Password Eye State (Universal UX)
  const [showAdminLoginPassword, setShowAdminLoginPassword] = useState<boolean>(false);
  const [showSmtpAppPassword, setShowSmtpAppPassword] = useState<boolean>(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState<boolean>(false);
  const [showNewPassword, setShowNewPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);
  const [showAdminCredCurrentPassword, setShowAdminCredCurrentPassword] = useState<boolean>(false);
  const [showAdminCredNewPassword, setShowAdminCredNewPassword] = useState<boolean>(false);
  const [showAdminCredConfirmPassword, setShowAdminCredConfirmPassword] = useState<boolean>(false);
  const [showEmailHubSmtpPassword, setShowEmailHubSmtpPassword] = useState<boolean>(false);

  // Data states
  const [loading, setLoading] = useState<boolean>(false);
  const [overview, setOverview] = useState<any>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHoursDay[]>([]);
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(initialSettings || null);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [notifications, setNotifications] = useState<NotificationLog[]>([]);
  const [supabaseStatus, setSupabaseStatus] = useState<any>(null);
  const [syncingSupabase, setSyncingSupabase] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);
  const [sqlViewMode, setSqlViewMode] = useState<'upgrade' | 'full'>('upgrade');
  // Periodic timer tick to re-evaluate IST clock and appointment statuses dynamically
  const [, setCurrentIstTimeTick] = useState<number>(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIstTimeTick(Date.now());
    }, 20000);
    return () => clearInterval(timer);
  }, []);

  // Staff & Stylists Management State
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [editingStaff, setEditingStaff] = useState<Partial<StaffMember> | null>(null);
  const [isNewStaffModal, setIsNewStaffModal] = useState<boolean>(false);
  const [savingStaff, setSavingStaff] = useState<boolean>(false);
  const [staffSearch, setStaffSearch] = useState<string>('');
  const [staffRoleFilter, setStaffRoleFilter] = useState<string>('all');
  const [staffPhotoUploadLoading, setStaffPhotoUploadLoading] = useState<boolean>(false);

  // Media upload & picker state
  const [uploadingMedia, setUploadingMedia] = useState<boolean>(false);
  const [uploadedMediaList, setUploadedMediaList] = useState<{ name: string; url: string }[]>(() => {
    try {
      const cached = localStorage.getItem('salon_media_list');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [showMediaPickerForService, setShowMediaPickerForService] = useState<boolean>(false);
  const [mediaActiveSection, setMediaActiveSection] = useState<'all' | 'hero' | 'services' | 'gallery' | 'text' | 'library'>('all');

  // Filter states for appointments
  const [appointmentFilterStatus, setAppointmentFilterStatus] = useState<string>('all');
  const [appointmentFilterDate, setAppointmentFilterDate] = useState<string>('');
  const [appointmentSearch, setAppointmentSearch] = useState<string>('');

  // Modals inside Admin
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [editingService, setEditingService] = useState<Partial<Service> | null>(null);
  const [newBlockDate, setNewBlockDate] = useState<string>('');
  const [newBlockReason, setNewBlockReason] = useState<string>('');
  const [newBlockAllDay, setNewBlockAllDay] = useState<boolean>(true);
  const [newBlockStartTime, setNewBlockStartTime] = useState<string>('12:00');
  const [newBlockEndTime, setNewBlockEndTime] = useState<string>('14:00');

  // Quick Walk-in Booking Modal inside Admin
  const [showWalkinModal, setShowWalkinModal] = useState<boolean>(false);
  const [walkinServiceId, setWalkinServiceId] = useState<string>('');
  const [walkinDate, setWalkinDate] = useState<string>('');
  const [walkinTime, setWalkinTime] = useState<string>('11:00');
  const [walkinName, setWalkinName] = useState<string>('');
  const [walkinPhone, setWalkinPhone] = useState<string>('');
  const [walkinNotes, setWalkinNotes] = useState<string>('');

  // Integrated WhatsApp Messenger State
  const [whatsappModalAppt, setWhatsappModalAppt] = useState<Appointment | null>(null);
  const [whatsappCardType, setWhatsappCardType] = useState<WhatsAppCardType>('confirmed');
  const [whatsappCustomNote, setWhatsappCustomNote] = useState<string>('');
  const [whatsappCopied, setWhatsappCopied] = useState<boolean>(false);

  // Gallery item editing state (for changing each photo's text, category, arrangement)
  const [editingGalleryItem, setEditingGalleryItem] = useState<Partial<GalleryItem> | null>(null);

  // Category filter in Services tab
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState<string>('all');

  // Mobile layout mode for Admin Services: horizontal scroll vs grid
  const [adminServicesMobileLayout, setAdminServicesMobileLayout] = useState<'horizontal' | 'grid'>('horizontal');

  // Mobile layout mode for Admin Bookings: horizontal right-to-left scroll vs stacked list
  const [adminBookingsMobileLayout, setAdminBookingsMobileLayout] = useState<'horizontal' | 'list'>('horizontal');

  // Client Directory search filter
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');

  // Modal to assign a selected photo to a service
  const [assigningPhotoModal, setAssigningPhotoModal] = useState<{ url: string; title: string } | null>(null);

  // Realistic Confirmation / Success Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type?: 'success' | 'confirm' | 'danger';
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Persistent Admin Notifications state
  const [adminNotifications, setAdminNotifications] = useState<AdminNotification[]>([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState<number>(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState<boolean>(false);

  // Admin Cancellation / Rejection Prompt Modal
  const [cancellationPrompt, setCancellationPrompt] = useState<{
    appointment: Appointment;
    action: 'cancel' | 'reject';
  } | null>(null);
  const [cancellationPromptReason, setCancellationPromptReason] = useState<string>('');

  const showSuccessModal = (title: string, message: string) => {
    setConfirmModal({
      isOpen: true,
      type: 'success',
      title,
      message,
      confirmLabel: 'Done',
      onConfirm: () => setConfirmModal(null)
    });
  };

  const showConfirmationModal = (
    title: string,
    message: string,
    onConfirmAction: () => void,
    confirmLabel = 'Confirm Changes',
    danger = false
  ) => {
    setConfirmModal({
      isOpen: true,
      type: danger ? 'danger' : 'confirm',
      title,
      message,
      confirmLabel,
      cancelLabel: 'Cancel',
      onConfirm: () => {
        setConfirmModal(null);
        onConfirmAction();
      },
      onCancel: () => setConfirmModal(null)
    });
  };

  // Reviews Management State & Handlers
  const [reviewFilterStatus, setReviewFilterStatus] = useState<string>('all');
  const [reviewFilterSource, setReviewFilterSource] = useState<string>('all');
  const [reviewSearch, setReviewSearch] = useState<string>('');
  const [isReviewModalOpen, setIsReviewModalOpen] = useState<boolean>(false);
  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [reviewFormAuthor, setReviewFormAuthor] = useState<string>('');
  const [reviewFormRating, setReviewFormRating] = useState<number>(5);
  const [reviewFormRatingHover, setReviewFormRatingHover] = useState<number>(0);
  const [reviewFormText, setReviewFormText] = useState<string>('');
  const [reviewFormDate, setReviewFormDate] = useState<string>('');
  const [reviewFormSource, setReviewFormSource] = useState<string>('From Google');
  const [reviewFormIsVerified, setReviewFormIsVerified] = useState<boolean>(false);
  const [reviewFormStatus, setReviewFormStatus] = useState<ReviewStatus>('approved');
  const [reviewFormSourceUrl, setReviewFormSourceUrl] = useState<string>('');
  const [reviewFormLoading, setReviewFormLoading] = useState<boolean>(false);
  const [reviewFormError, setReviewFormError] = useState<string>('');

  // Actual Amount Collected / Completion Modal State
  const [completionModalAppt, setCompletionModalAppt] = useState<Appointment | null>(null);
  const [completionActualAmount, setCompletionActualAmount] = useState<string>('');
  const [completionPaymentMethod, setCompletionPaymentMethod] = useState<string>('Cash');
  const [completionAmountNotes, setCompletionAmountNotes] = useState<string>('');
  const [completionSubmitting, setCompletionSubmitting] = useState<boolean>(false);

  // Client Deletion Prompt State
  const [clientDeletePrompt, setClientDeletePrompt] = useState<{
    customer: Customer;
    activeBookings: Appointment[];
    allBookings: Appointment[];
  } | null>(null);
  const [clientDeleteSubmitting, setClientDeleteSubmitting] = useState<boolean>(false);

  const handleOpenAddReview = () => {
    setEditingReview(null);
    setReviewFormAuthor('');
    setReviewFormRating(5);
    setReviewFormRatingHover(0);
    setReviewFormText('');
    setReviewFormDate(new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
    setReviewFormSource('From Google');
    setReviewFormIsVerified(false);
    setReviewFormStatus('approved');
    setReviewFormSourceUrl('');
    setReviewFormError('');
    setIsReviewModalOpen(true);
  };

  const handleOpenEditReview = (rev: Review) => {
    setEditingReview(rev);
    setReviewFormAuthor(rev.authorName);
    setReviewFormRating(rev.rating);
    setReviewFormRatingHover(0);
    setReviewFormText(rev.reviewText);
    setReviewFormDate(rev.reviewDate || '');
    setReviewFormSource(rev.source || 'From Google');
    setReviewFormIsVerified(Boolean(rev.isVerified));
    setReviewFormStatus((rev.status as ReviewStatus) || 'approved');
    setReviewFormSourceUrl(rev.sourceUrl || '');
    setReviewFormError('');
    setIsReviewModalOpen(true);
  };

  const handleSaveReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewFormAuthor.trim()) {
      setReviewFormError("Author's displayed name is required.");
      return;
    }
    if (!reviewFormText.trim()) {
      setReviewFormError("Written review text is required.");
      return;
    }
    setReviewFormLoading(true);
    setReviewFormError('');

    try {
      const payload: Partial<Review> = {
        authorName: reviewFormAuthor.trim(),
        rating: reviewFormRating,
        reviewText: reviewFormText.trim(),
        reviewDate: reviewFormDate.trim() || 'Recent',
        source: reviewFormSource,
        isVerified: reviewFormIsVerified,
        status: reviewFormStatus,
        sourceUrl: reviewFormSourceUrl.trim() || undefined
      };

      if (editingReview) {
        const updated = await api.updateAdminReview(editingReview.id, payload);
        setReviews((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
        showSuccessModal('Review Updated', `Review by ${updated.authorName} was updated successfully.`);
      } else {
        const created = await api.createAdminReview(payload);
        setReviews((prev) => [created, ...prev]);
        showSuccessModal('Review Added', `New review from ${created.authorName} (${created.source}) was added.`);
      }
      setIsReviewModalOpen(false);
      onDataChanged?.();
    } catch (err: any) {
      setReviewFormError(err.message || 'Failed to save review.');
    } finally {
      setReviewFormLoading(false);
    }
  };

  const handleUpdateReviewStatus = async (id: string, newStatus: ReviewStatus) => {
    try {
      await api.updateAdminReviewStatus(id, newStatus);
      setReviews((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
      );
      const statusLabels: Record<string, string> = {
        approved: 'Approved & Publicly Visible',
        pending: 'Pending Moderation',
        rejected: 'Declined/Rejected',
        hidden: 'Hidden from Public Website'
      };
      showSuccessModal('Review Status Updated', `Status updated to: ${statusLabels[newStatus] || newStatus}`);
      onDataChanged?.();
    } catch (err: any) {
      alert(err.message || 'Failed to update review status.');
    }
  };

  const handleDeleteReview = (id: string, authorName: string) => {
    showConfirmationModal(
      'Delete Review',
      `Are you sure you want to permanently delete the review by "${authorName}"? This action cannot be undone.`,
      async () => {
        try {
          await api.deleteAdminReview(id);
          setReviews((prev) => prev.filter((r) => r.id !== id));
          showSuccessModal('Review Deleted', `Review by ${authorName} was deleted.`);
          onDataChanged?.();
        } catch (err: any) {
          alert(err.message || 'Failed to delete review.');
        }
      },
      'Delete Permanently',
      true
    );
  };

  const handleDeletePhoto = (photoUrl: string, photoTitle: string) => {
    showConfirmationModal(
      'Delete Photo',
      `Are you sure you want to delete "${photoTitle}" from your photo library?`,
      async () => {
        try {
          const next = uploadedMediaList.filter((m) => m.url !== photoUrl);
          setUploadedMediaList(next);
          localStorage.setItem('salon_media_list', JSON.stringify(next));

          // Also remove from gallery if present
          const galleryItem = gallery.find((g) => g.imageUrl === photoUrl);
          if (galleryItem) {
            try {
              await api.deleteAdminGallery(galleryItem.id);
              await loadAllAdminData();
              onDataChanged();
            } catch {}
          }

          showSuccessModal('Photo Deleted', `"${photoTitle}" was deleted from your library.`);
        } catch (err: any) {
          showSuccessModal('Error', err.message || 'Failed to delete photo');
        }
      },
      'Delete Photo',
      true
    );
  };

  const handleReplacePhotoFile = (oldUrl: string, file: File) => {
    const reader = new FileReader();
    setUploadingMedia(true);
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        let newUrl = base64;
        try {
          const res = await api.uploadAdminMedia(base64, file.name);
          newUrl = res.url;
        } catch {}

        // Replace in uploadedMediaList
        const updatedList = uploadedMediaList.map((m) => (m.url === oldUrl ? { ...m, name: file.name, url: newUrl } : m));
        setUploadedMediaList(updatedList);
        localStorage.setItem('salon_media_list', JSON.stringify(updatedList));

        // If it was the hero banner, update hero banner
        if (settings?.heroBannerUrl === oldUrl) {
          const updatedSettings = { ...settings, heroBannerUrl: newUrl };
          await api.updateAdminSettings(updatedSettings);
          setSettings(updatedSettings);
          onSettingsChange?.(updatedSettings);
          localStorage.setItem('salon_settings', JSON.stringify(updatedSettings));
        }

        // If any service used it, update service
        for (const s of services) {
          if (s.imageUrl === oldUrl) {
            try {
              await api.updateAdminService(s.id, { ...s, imageUrl: newUrl });
            } catch {}
          }
        }

        // If gallery used it, update gallery
        for (const g of gallery) {
          if (g.imageUrl === oldUrl) {
            try {
              await api.updateAdminGallery(g.id, { ...g, imageUrl: newUrl });
            } catch {}
          }
        }

        await loadAllAdminData();
        onDataChanged();
        showSuccessModal('Photo Replaced', 'The photo has been successfully replaced across the website.');
      } catch (err: any) {
        showSuccessModal('Error', err.message || 'Failed to replace photo');
      } finally {
        setUploadingMedia(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAssignPhotoToService = async (serviceId: string, photoUrl: string) => {
    const targetService = services.find((s) => s.id === serviceId);
    if (!targetService) return;
    try {
      await api.updateAdminService(serviceId, { ...targetService, imageUrl: photoUrl });
      await loadAllAdminData();
      onDataChanged();
      setAssigningPhotoModal(null);
      showSuccessModal(
        'Photo Assigned',
        `Photo has been assigned to "${targetService.name}". It is now displayed in the catalogue.`
      );
    } catch (err: any) {
      showSuccessModal('Error', err.message || 'Failed to assign photo to service');
    }
  };

  const handleSaveStaffMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editingStaff.name || !editingStaff.role) {
      showSuccessModal('Missing Fields', 'Please provide both staff member name and role/designation.');
      return;
    }
    setSavingStaff(true);
    try {
      const payload: Partial<StaffMember> = {
        name: editingStaff.name.trim(),
        role: editingStaff.role.trim(),
        specialties: Array.isArray(editingStaff.specialties)
          ? editingStaff.specialties
          : typeof editingStaff.specialties === 'string'
          ? (editingStaff.specialties as string).split(',').map((s: string) => s.trim()).filter(Boolean)
          : [],
        experienceYears: Number(editingStaff.experienceYears) || 1,
        rating: Number(editingStaff.rating) || 5.0,
        bio: (editingStaff.bio || '').trim(),
        imageUrl: (editingStaff.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80').trim(),
        phone: (editingStaff.phone || '+91 91316 29031').trim(),
        isActive: editingStaff.isActive !== undefined ? editingStaff.isActive : true
      };

      if (editingStaff.id) {
        await api.updateAdminStaff(editingStaff.id, payload);
        showSuccessModal('Staff Profile Updated', `Stylist profile for "${payload.name}" updated and backed up to Supabase cloud.`);
      } else {
        await api.createAdminStaff(payload);
        showSuccessModal('Staff Member Added', `"${payload.name}" has been added to your staff directory and is now available in customer bookings!`);
      }

      setEditingStaff(null);
      setIsNewStaffModal(false);
      await loadAllAdminData();
      onDataChanged();
    } catch (err: any) {
      showSuccessModal('Error', err.message || 'Failed to save staff member');
    } finally {
      setSavingStaff(false);
    }
  };

  const handleDeleteStaffMember = (staff: StaffMember) => {
    showConfirmationModal(
      'Remove Staff Member',
      `Are you sure you want to remove "${staff.name}" (${staff.role}) from the salon team? Past appointments will keep their records.`,
      async () => {
        try {
          await api.deleteAdminStaff(staff.id);
          await loadAllAdminData();
          onDataChanged();
          showSuccessModal('Staff Removed', `"${staff.name}" was removed from the active salon directory.`);
        } catch (err: any) {
          showSuccessModal('Error', err.message || 'Failed to remove staff member');
        }
      },
      'Remove Member',
      true
    );
  };

  const handleToggleStaffActive = async (staff: StaffMember) => {
    try {
      const nextStatus = !staff.isActive;
      await api.updateAdminStaff(staff.id, { isActive: nextStatus });
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal(
        nextStatus ? 'Specialist Active' : 'Specialist Inactive',
        `"${staff.name}" is now ${nextStatus ? 'AVAILABLE for customer booking choices' : 'HIDDEN from customer bookings'}.`
      );
    } catch (err: any) {
      showSuccessModal('Error', err.message || 'Failed to update status');
    }
  };

  const handleStaffPhotoUpload = (file: File) => {
    if (!file) return;
    setStaffPhotoUploadLoading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        let finalUrl = base64;
        try {
          const res = await api.uploadAdminMedia(base64, file.name);
          if (res?.url) finalUrl = res.url;
        } catch (e) {
          console.warn('Fallback to base64 for staff photo:', e);
        }

        if (editingStaff) {
          setEditingStaff({ ...editingStaff, imageUrl: finalUrl });
        }
        showSuccessModal('Photo Uploaded', 'Staff profile photo uploaded and backed up to Supabase storage!');
      } catch (err: any) {
        showSuccessModal('Upload Failed', err.message || 'Could not upload photo');
      } finally {
        setStaffPhotoUploadLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const checkSetupStatus = async () => {
    setCheckingSetup(true);
    try {
      await api.getAdminSetupStatus();
      setIsSetupCompleted(true);
      onSetupStatusChange?.(true);
      localStorage.setItem('salon_setup_completed', 'true');
      setAuthMode('login');
    } catch (e) {
      console.error('Failed to query setup status:', e);
      setIsSetupCompleted(true);
      setAuthMode('login');
    } finally {
      setCheckingSetup(false);
    }
  };

  // Reset inputs and check existing token + setup status when modal opens or closes
  useEffect(() => {
    // Always wipe all input states so NO default Gmail or passwords ever linger
    setLoginIdentifier('');
    setLoginPassword('');
    setSignupEmail('');
    setSignupUsername('');
    setSignupPassword('');
    setLoginError('');
    setSignupSuccessMsg('');
    setOtpCodeInput('');
    setOtpSent(false);

    if (!isOpen) return;

    checkSetupStatus();

    const token = getAdminToken();
    if (token) {
      api
        .adminMe()
        .then(() => {
          setIsAuthenticated(true);
          onAdminAuthChange?.(true);
          loadAllAdminData();
        })
        .catch(() => {
          clearAdminToken();
          setIsAuthenticated(false);
          onAdminAuthChange?.(false);
        });
    } else {
      setIsAuthenticated(false);
      onAdminAuthChange?.(false);
    }
  }, [isOpen]);

  // Synchronize settings with initialSettings from parent to prevent reset
  useEffect(() => {
    if (initialSettings) {
      setSettings(initialSettings);
    }
  }, [initialSettings, isOpen]);

  const loadAllAdminData = async () => {
    setLoading(true);
    try {
      const [
        ovRes,
        apptRes,
        srvRes,
        catRes,
        hrsRes,
        blkRes,
        custRes,
        revRes,
        setRes,
        notifRes,
        supaRes,
        staffRes,
        persistentNotifsRes
      ] = await Promise.all([
        api.getAdminOverview(),
        api.getAdminAppointments(),
        api.getAdminServices(),
        api.getCategories(),
        api.getAdminBusinessHours(),
        api.getAdminBlockedDates(),
        api.getAdminCustomers(),
        api.getAdminReviews(),
        api.getAdminSettings(),
        api.getAdminNotifications(),
        api.getSupabaseStatus().catch(() => null),
        api.getAdminStaff().catch(() => []),
        api.getPersistentAdminNotifications().catch(() => ({ notifications: [], unreadCount: 0 }))
      ]);

      setOverview(ovRes);
      setAppointments(apptRes);
      setServices(srvRes);
      setCategories(catRes);
      setBusinessHours(hrsRes);
      setBlockedDates(blkRes);
      setCustomers(custRes);
      setReviews(revRes);
      setSettings(setRes);
      setNotifications(notifRes);
      setStaffMembers(staffRes || []);
      setAdminNotifications(persistentNotifsRes?.notifications || []);
      setUnreadNotifCount(persistentNotifsRes?.unreadCount || 0);
      const galRes = await api.getGallery();
      setGallery(galRes);
      if (supaRes) setSupabaseStatus(supaRes);
      api.getEmailHub().then(setEmailHub).catch(() => null);
    } catch (err: any) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAdminNotifications = async () => {
    try {
      const res = await api.getPersistentAdminNotifications();
      setAdminNotifications(res.notifications || []);
      setUnreadNotifCount(res.unreadCount || 0);
    } catch {
      // ignore
    }
  };

  const handleMarkNotificationRead = async (id: string) => {
    try {
      await api.markAdminNotificationRead(id);
      setAdminNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.markAllAdminNotificationsRead();
      setAdminNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
    } catch {
      // ignore
    }
  };

  const handleDeleteNotification = async (id: string) => {
    try {
      await api.deleteAdminNotification(id);
      setAdminNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadNotifCount((prev) => {
        const wasUnread = adminNotifications.find((n) => n.id === id && !n.isRead);
        return wasUnread ? Math.max(0, prev - 1) : prev;
      });
    } catch (err: any) {
      console.error('Failed to delete notification:', err);
    }
  };

  const handleClearReadNotifications = async () => {
    try {
      await api.deleteAllAdminNotifications(true);
      setAdminNotifications((prev) => prev.filter((n) => !n.isRead));
    } catch (err: any) {
      console.error('Failed to clear read notifications:', err);
    }
  };

  const handleDeleteAllNotifications = async () => {
    showConfirmationModal(
      'Delete All Notifications',
      'Are you sure you want to permanently delete all notifications? This will erase them permanently from website and Supabase so they never return on refresh.',
      async () => {
        try {
          await api.deleteAllAdminNotifications(false);
          setAdminNotifications([]);
          setUnreadNotifCount(0);
          showSuccessModal('Notifications Deleted', 'All notifications have been permanently erased.');
        } catch (err: any) {
          showSuccessModal('Error', err.message || 'Failed to delete notifications');
        }
      },
      'Delete All',
      true
    );
  };

  const handleDeleteLog = async (logId: string) => {
    try {
      await api.deleteAdminNotificationLog(logId);
      setNotifications((prev) => prev.filter((l) => l.id !== logId));
      showSuccessModal('Log Deleted', 'Notification log entry permanently erased.');
    } catch (err: any) {
      showSuccessModal('Error', err.message || 'Failed to delete log entry');
    }
  };

  const handleClearAllLogs = async () => {
    showConfirmationModal(
      'Clear All Notification Logs',
      'Are you sure you want to permanently erase all notification audit logs? They will not return on refresh.',
      async () => {
        try {
          await api.clearAllAdminNotificationLogs();
          setNotifications([]);
          showSuccessModal('Logs Cleared', 'All notification audit logs have been permanently erased.');
        } catch (err: any) {
          showSuccessModal('Error', err.message || 'Failed to clear logs');
        }
      },
      'Clear All Logs',
      true
    );
  };

  // Real-time polling for persistent admin notifications & new bookings every 15 seconds
  useEffect(() => {
    if (isAuthenticated && isOpen) {
      const interval = setInterval(() => {
        loadAdminNotifications();
      }, 15000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, isOpen]);

  // Body scroll lock effect when admin portal is open so the background webpage never moves
  useEffect(() => {
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [isOpen]);

  // OTP Countdown timer
  useEffect(() => {
    let timer: any;
    if (otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [otpCountdown]);

  // Admin Credential OTP Countdown timer
  useEffect(() => {
    let timer: any;
    if (adminCredOtpCountdown > 0) {
      timer = setInterval(() => {
        setAdminCredOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [adminCredOtpCountdown]);

  const handleSendOtp = async (target: string, type: 'email' | 'mobile') => {
    if (!target) {
      setLoginError('Please enter a valid Gmail address or mobile number to receive OTP.');
      return;
    }
    setSendingOtp(true);
    setLoginError('');
    try {
      await api.sendOtp(target, type);
      setOtpSent(true);
      setOtpCountdown(300); // 5 minutes
    } catch (err: any) {
      setLoginError(err.message || 'Failed to send verification OTP.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleTestGmailDelivery = async () => {
    setTestingEmail(true);
    setTestEmailResult('');
    try {
      const res = await api.testAdminEmail(testEmailTarget || undefined);
      setTestEmailResult(res.message);
    } catch (err: any) {
      setTestEmailResult(err.message || 'Test email failed');
    } finally {
      setTestingEmail(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingMedia(true);
    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64 = evt.target?.result as string;
        if (!base64) return;
        try {
          const res = await api.uploadAdminMedia(base64, file.name);
          const newMedia = { name: file.name, url: res.url };
          const updated = [newMedia, ...uploadedMediaList];
          setUploadedMediaList(updated);
          localStorage.setItem('salon_media_list', JSON.stringify(updated));
          if (editingService) {
            setEditingService((prev) => (prev ? { ...prev, imageUrl: res.url } : prev));
          }
        } catch {
          // If server upload endpoint is unavailable, store base64 directly
          const fallbackMedia = { name: file.name, url: base64 };
          const updated = [fallbackMedia, ...uploadedMediaList];
          setUploadedMediaList(updated);
          localStorage.setItem('salon_media_list', JSON.stringify(updated));
          if (editingService) {
            setEditingService((prev) => (prev ? { ...prev, imageUrl: base64 } : prev));
          }
        } finally {
          setUploadingMedia(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setUploadingMedia(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const target = loginIdentifier.trim();
    if (!target) {
      setLoginError('Please enter your registered Gmail address or username.');
      return;
    }
    if (authMethod === 'password' && !loginPassword) {
      setLoginError('Please enter your password.');
      return;
    }
    if (authMethod === 'otp' && !otpCodeInput.trim()) {
      setLoginError('Please enter the 6-digit OTP code sent to your Gmail.');
      return;
    }
    setLoggingIn(true);
    try {
      const res = await api.adminLogin({
        identifier: target,
        password: authMethod === 'password' ? loginPassword : '',
        otpCode: authMethod === 'otp' ? otpCodeInput.trim() : undefined
      });
      setAdminToken(res.token);
      setIsAuthenticated(true);
      setIsSetupCompleted(true);
      onSetupStatusChange?.(true);
      onAdminAuthChange?.(true);
      await loadAllAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Invalid Gmail or password. Please verify your credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const chosenEmail = signupEmail.trim();
    if (!chosenEmail) {
      setLoginError('Please enter your Gmail / email address.');
      return;
    }
    if (!signupPassword || signupPassword.length < 6) {
      setLoginError('Password must be at least 6 characters long.');
      return;
    }
    setLoggingIn(true);
    try {
      const chosenUsername = signupUsername.trim() || chosenEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_');

      const res = await api.adminSignup({
        username: chosenUsername,
        password: signupPassword,
        email: chosenEmail,
        otpCode: otpCodeInput.trim() || undefined
      });
      setAdminToken(res.token);
      setIsAuthenticated(true);
      setIsSetupCompleted(true);
      onSetupStatusChange?.(true);
      onAdminAuthChange?.(true);
      setSignupSuccessMsg(res.message || 'Admin account successfully established with Gmail! Single registration slot is permanently locked.');
      await loadAllAdminData();
    } catch (err: any) {
      setLoginError(err.message || 'Could not register admin account.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await api.adminLogout();
    } catch (e) {
      // ignore
    }
    clearAdminToken();
    setIsAuthenticated(false);
    onAdminAuthChange?.(false);
    setLoginIdentifier('');
    setLoginPassword('');
    checkSetupStatus();
  };

  const handleResetAdminSlot = () => {
    showConfirmationModal(
      'Reset Admin Login Info',
      'Are you sure you want to reset the admin login info? This will clear current admin credentials and reopen the single slot for first-time registration.',
      async () => {
        try {
          await api.resetAdminSlot();
          clearAdminToken();
          localStorage.removeItem('salon_admin_token');
          localStorage.removeItem('salon_admin_user');
          localStorage.removeItem('salon_setup_completed');
          setIsAuthenticated(false);
          setIsSetupCompleted(false);
          onSetupStatusChange?.(false);
          setAuthMode('signup');
          setLoginIdentifier('');
          setLoginPassword('');
          setSignupEmail('');
          setSignupUsername('');
          setSignupPassword('');
          showSuccessModal(
            'Admin Slot Reset',
            'Admin login info has been reset successfully. First-time registration is now open.'
          );
          await checkSetupStatus();
        } catch (err: any) {
          showSuccessModal('Reset Failed', err.message || 'Failed to reset admin slot');
        }
      },
      'Reset Admin Slot',
      true
    );
  };

  // Appointment actions
  const handleOpenWhatsAppModal = (appt: Appointment, defaultCardType?: WhatsAppCardType) => {
    setWhatsappModalAppt(appt);
    setWhatsappCardType(
      defaultCardType ||
        (appt.status === 'confirmed'
          ? 'confirmed'
          : appt.status === 'completed'
          ? 'completed'
          : appt.status === 'cancelled'
          ? 'cancelled'
          : 'general_update')
    );
    setWhatsappCustomNote('');
    setWhatsappCopied(false);
  };

  const handleConfirmAdminCancellation = async () => {
    if (!cancellationPrompt) return;
    const { appointment: appt, action } = cancellationPrompt;
    const reasonText =
      cancellationPromptReason.trim() ||
      (action === 'reject' ? 'Declined by salon admin' : 'Cancelled by salon admin');

    try {
      const updated = await api.updateAdminAppointment(appt.id, {
        status: 'cancelled',
        cancellationReason: reasonText,
        reason: reasonText
      });

      setAppointments((prev) => {
        const nextList = prev.map((a) =>
          a.id === appt.id
            ? {
                ...a,
                status: 'cancelled' as const,
                cancellationReason: reasonText,
                cancelledAt: new Date().toISOString(),
                cancelledBy: 'admin' as const,
                updatedAt: new Date().toISOString()
              }
            : a
        );
        return nextList.sort((a, b) => {
          const timeA = new Date(a.createdAt || `${a.date}T${a.time}:00`).getTime();
          const timeB = new Date(b.createdAt || `${b.date}T${b.time}:00`).getTime();
          return timeB - timeA;
        });
      });

      if (selectedAppointment && selectedAppointment.id === appt.id) {
        setSelectedAppointment((prev) =>
          prev
            ? {
                ...prev,
                status: 'cancelled',
                cancellationReason: reasonText,
                cancelledAt: new Date().toISOString(),
                cancelledBy: 'admin'
              }
            : null
        );
      }

      setCancellationPrompt(null);
      setCancellationPromptReason('');
      await loadAllAdminData();
      onDataChanged();

      showSuccessModal(
        action === 'reject' ? 'Booking Declined' : 'Booking Cancelled',
        `Appointment #${appt.bookingNumber} (${appt.serviceName}) has been cancelled and the reserved slot is safely released.`
      );

      // Open WhatsApp dialog for notification if admin desires
      handleOpenWhatsAppModal(
        { ...appt, status: 'cancelled', cancellationReason: reasonText },
        'cancelled'
      );
    } catch (err: any) {
      showSuccessModal('Operation Failed', err.message || 'Failed to cancel appointment');
    }
  };

  const handleUpdateAppointmentStatus = async (id: string, status: string, optionalReason?: string) => {
    const currentAppt = appointments.find((a) => a.id === id);
    const bookingRef = currentAppt ? currentAppt.bookingNumber : id;

    // Intercept completed status to require entering actual amount collected
    if (status === 'completed' && currentAppt) {
      handleInitiateCompleteAppointment(currentAppt);
      return;
    }

    // Intercept cancellation or rejection to capture specific reason
    if ((status === 'cancelled' || status === 'rejected') && !optionalReason && currentAppt) {
      setCancellationPrompt({
        appointment: currentAppt,
        action: status === 'rejected' ? 'reject' : 'cancel'
      });
      setCancellationPromptReason(
        status === 'rejected' ? 'Declined by salon admin' : 'Cancelled by salon admin'
      );
      return;
    }

    showConfirmationModal(
      'Confirm Status Change',
      `Are you sure you want to change appointment #${bookingRef} status to "${status.toUpperCase()}"?`,
      async () => {
        try {
          const payload: any = { status };
          if (optionalReason) {
            payload.cancellationReason = optionalReason;
            payload.reason = optionalReason;
          }
          const updated = await api.updateAdminAppointment(id, payload);
          setAppointments((prev) => {
            const nextList = prev.map((a) =>
              a.id === id
                ? {
                    ...a,
                    status: status as any,
                    cancellationReason: optionalReason || a.cancellationReason,
                    cancelledAt: status === 'cancelled' ? new Date().toISOString() : a.cancelledAt,
                    cancelledBy: status === 'cancelled' ? ('admin' as const) : a.cancelledBy,
                    updatedAt: new Date().toISOString()
                  }
                : a
            );
            return nextList.sort((a, b) => {
              const timeA = new Date(a.createdAt || `${a.date}T${a.time}:00`).getTime();
              const timeB = new Date(b.createdAt || `${b.date}T${b.time}:00`).getTime();
              return timeB - timeA;
            });
          });
          await loadAllAdminData();
          onDataChanged();
          if (selectedAppointment && selectedAppointment.id === id) {
            setSelectedAppointment((prev) =>
              prev
                ? {
                    ...prev,
                    status: status as any,
                    cancellationReason: optionalReason || prev.cancellationReason,
                    cancelledAt: status === 'cancelled' ? new Date().toISOString() : prev.cancelledAt,
                    cancelledBy: status === 'cancelled' ? ('admin' as const) : prev.cancelledBy
                  }
                : null
            );
          }

          showSuccessModal(
            'Status Updated',
            `Appointment #${bookingRef} is now marked as "${status.toUpperCase()}".`
          );

          // Open WhatsApp Messenger dialog to dispatch custom card directly to customer
          const apptToDispatch = currentAppt || updated;
          if (apptToDispatch) {
            handleOpenWhatsAppModal(
              { ...apptToDispatch, status: status as any },
              status === 'confirmed'
                ? 'confirmed'
                : status === 'postponed'
                ? 'postponed'
                : status === 'completed'
                ? 'completed'
                : status === 'cancelled'
                ? 'cancelled'
                : 'general_update'
            );
          }
        } catch (err: any) {
          showSuccessModal('Update Failed', err.message || 'Failed to update appointment');
        }
      }
    );
  };

  const handleSaveInternalNotes = async (id: string, internalNotes: string) => {
    try {
      await api.updateAdminAppointment(id, { internalNotes });
      await loadAllAdminData();
      if (selectedAppointment && selectedAppointment.id === id) {
        setSelectedAppointment((prev) => (prev ? { ...prev, internalNotes } : null));
      }
      showSuccessModal('Notes Saved', 'Internal stylist note has been updated.');
    } catch (err: any) {
      showSuccessModal('Error', err.message || 'Failed to save notes');
    }
  };

  const handleInitiateCompleteAppointment = (appt: Appointment) => {
    setCompletionModalAppt(appt);
    setCompletionActualAmount(
      appt.actualAmountCollected !== undefined ? String(appt.actualAmountCollected) : String(appt.servicePrice)
    );
    setCompletionPaymentMethod(appt.paymentMethod || 'Cash');
    setCompletionAmountNotes(appt.amountNotes || '');
  };

  const handleConfirmCompletionWithPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completionModalAppt) return;
    const numericAmt = parseFloat(completionActualAmount);
    if (isNaN(numericAmt) || numericAmt < 0) {
      showSuccessModal('Invalid Amount', 'Please enter a valid numeric collected amount (₹0 or higher).');
      return;
    }
    setCompletionSubmitting(true);
    try {
      const updated = await api.updateAdminAppointment(completionModalAppt.id, {
        status: 'completed',
        actualAmountCollected: numericAmt,
        paymentMethod: completionPaymentMethod,
        amountNotes: completionAmountNotes.trim()
      });

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === completionModalAppt.id
            ? {
                ...a,
                ...updated,
                status: 'completed',
                actualAmountCollected: numericAmt,
                paymentMethod: completionPaymentMethod,
                amountNotes: completionAmountNotes.trim()
              }
            : a
        )
      );
      if (selectedAppointment && selectedAppointment.id === completionModalAppt.id) {
        setSelectedAppointment((prev) =>
          prev
            ? {
                ...prev,
                ...updated,
                status: 'completed',
                actualAmountCollected: numericAmt,
                paymentMethod: completionPaymentMethod,
                amountNotes: completionAmountNotes.trim()
              }
            : null
        );
      }
      const savedAppt = completionModalAppt;
      setCompletionModalAppt(null);
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal(
        'Booking Completed & Payment Recorded',
        `Appointment #${savedAppt.bookingNumber} marked as Completed. Collected Amount: ₹${numericAmt} (Listed Price: ₹${savedAppt.servicePrice}) saved permanently in Supabase.`
      );
    } catch (err: any) {
      showSuccessModal('Error', err.message || 'Failed to complete appointment');
    } finally {
      setCompletionSubmitting(false);
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const currentAppt = appointments.find((a) => a.id === id);
    const bookingRef = currentAppt ? currentAppt.bookingNumber : id;
    const clientName = currentAppt ? currentAppt.customerName : 'Client';
    const srvName = currentAppt ? currentAppt.serviceName : 'Service';
    showConfirmationModal(
      'Permanent Booking Deletion',
      `Are you sure you want to permanently delete appointment #${bookingRef} for ${clientName} (${srvName})? This record will be permanently committed as deleted in Supabase and will never reappear after refreshes, re-login, or container restarts. All other bookings remain preserved.`,
      async () => {
        try {
          await api.deleteAdminAppointment(id);
          setAppointments((prev) => prev.filter((a) => a.id !== id));
          if (selectedAppointment && selectedAppointment.id === id) {
            setSelectedAppointment(null);
          }
          await loadAllAdminData();
          onDataChanged();
          showSuccessModal('Record Deleted', `Appointment #${bookingRef} has been permanently removed from Supabase.`);
        } catch (err: any) {
          showSuccessModal('Delete Failed', err.message || 'Failed to delete');
        }
      },
      'Permanently Delete Booking',
      true
    );
  };

  const handleDeleteCustomer = (customer: Customer) => {
    const linked = appointments.filter(
      (a) => a.customerId === customer.id || (customer.phone && a.customerPhone === customer.phone)
    );
    const active = linked.filter(
      (a) => a.status === 'confirmed' || a.status === 'pending' || a.status === 'postponed'
    );

    if (active.length > 0) {
      setClientDeletePrompt({
        customer,
        activeBookings: active,
        allBookings: linked
      });
      return;
    }

    showConfirmationModal(
      'Permanent Client Deletion',
      `Are you sure you want to permanently delete client profile "${customer.name}" (${customer.phone})? This client will be removed permanently from the database and Supabase.`,
      async () => {
        try {
          await api.deleteAdminCustomer(customer.id);
          setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
          await loadAllAdminData();
          onDataChanged();
          showSuccessModal('Client Deleted', `Client "${customer.name}" has been permanently removed.`);
        } catch (err: any) {
          showSuccessModal('Delete Failed', err.message || 'Failed to delete client');
        }
      },
      'Permanently Delete Client',
      true
    );
  };

  const handleConfirmCascadeClientDelete = async (cascadeBookings: boolean) => {
    if (!clientDeletePrompt) return;
    const { customer } = clientDeletePrompt;
    setClientDeleteSubmitting(true);
    try {
      await api.deleteAdminCustomer(customer.id, { cascadeBookings });
      setCustomers((prev) => prev.filter((c) => c.id !== customer.id));
      if (cascadeBookings) {
        const linkedIds = new Set(clientDeletePrompt.allBookings.map((b) => b.id));
        setAppointments((prev) => prev.filter((a) => !linkedIds.has(a.id)));
      }
      setClientDeletePrompt(null);
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal(
        'Client Deleted',
        `Client "${customer.name}" has been permanently removed${cascadeBookings ? ' along with linked bookings' : ''}.`
      );
    } catch (err: any) {
      showSuccessModal('Delete Failed', err.message || 'Failed to delete client');
    } finally {
      setClientDeleteSubmitting(false);
    }
  };

  const handleClearAllAppointments = () => {
    showConfirmationModal(
      'Delete All Demo & Test Bookings',
      `Are you sure you want to delete all ${appointments.length} bookings? This will clear all test records so your salon starts with a clean slate.`,
      async () => {
        try {
          await api.clearAllAdminAppointments();
          setSelectedAppointment(null);
          await loadAllAdminData();
          onDataChanged();
          showSuccessModal('Clean Slate Ready', 'All test and demo bookings have been successfully deleted.');
        } catch (err: any) {
          showSuccessModal('Clear Failed', err.message || 'Failed to clear bookings');
        }
      },
      'Delete All Bookings',
      true
    );
  };

  // Services actions
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    try {
      if (editingService.id) {
        await api.updateAdminService(editingService.id, editingService);
      } else {
        await api.createAdminService(editingService);
      }
      const sName = editingService.name || 'Service';
      setEditingService(null);
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal('Service Saved', `"${sName}" has been successfully saved to your service catalogue.`);
    } catch (err: any) {
      showSuccessModal('Save Failed', err.message || 'Failed to save service');
    }
  };

  const handleDeleteService = async (id: string) => {
    const srv = services.find((s) => s.id === id);
    showConfirmationModal(
      'Delete Service',
      `Delete "${srv?.name || 'this service'}"? Customers will no longer be able to book it.`,
      async () => {
        try {
          await api.deleteAdminService(id);
          await loadAllAdminData();
          onDataChanged();
          showSuccessModal('Service Deleted', 'Service was removed from the active catalogue.');
        } catch (err: any) {
          showSuccessModal('Delete Failed', err.message || 'Failed to delete service');
        }
      },
      'Delete Service',
      true
    );
  };

  // Hero Banner actions
  const handleSetHeroBanner = async (bannerUrl: string) => {
    if (!settings) return;
    try {
      const updatedSettings = { ...settings, heroBannerUrl: bannerUrl };
      await api.updateAdminSettings(updatedSettings);
      setSettings(updatedSettings);
      onSettingsChange?.(updatedSettings);
      localStorage.setItem('salon_settings', JSON.stringify(updatedSettings));
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal(
        'Hero Banner Updated',
        'The main hero banner photo has been updated and is now live at the top of your website.'
      );
    } catch (err: any) {
      showSuccessModal('Update Failed', err.message || 'Failed to update hero banner');
    }
  };

  const handleResetHeroBanner = () => {
    if (!settings) return;
    showConfirmationModal(
      'Reset Hero Banner',
      'Reset the hero banner to the default luxury salon interior photo?',
      async () => {
        const defaultBanner = '/assets/images/hero_salon_interior_1790779465939.jpg';
        const updatedSettings = { ...settings, heroBannerUrl: defaultBanner };
        await api.updateAdminSettings(updatedSettings);
        setSettings(updatedSettings);
        onSettingsChange?.(updatedSettings);
        localStorage.setItem('salon_settings', JSON.stringify(updatedSettings));
        await loadAllAdminData();
        onDataChanged();
        showSuccessModal('Hero Banner Reset', 'Hero banner was reset to the default salon interior view.');
      }
    );
  };

  // Second Hero Banner actions
  const handleSetSecondHeroBanner = async (bannerUrl: string) => {
    if (!settings) return;
    try {
      const updatedSettings = { ...settings, secondHeroBannerUrl: bannerUrl };
      await api.updateAdminSettings(updatedSettings);
      setSettings(updatedSettings);
      onSettingsChange?.(updatedSettings);
      localStorage.setItem('salon_settings', JSON.stringify(updatedSettings));
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal(
        'Second Hero Banner Updated',
        'The second hero banner (Salon Experience & Ambience Showcase) photo has been updated and is now live on your website.'
      );
    } catch (err: any) {
      showSuccessModal('Update Failed', err.message || 'Failed to update second hero banner');
    }
  };

  const handleResetSecondHeroBanner = () => {
    if (!settings) return;
    showConfirmationModal(
      'Reset Second Hero Banner',
      'Reset the second hero banner to the default luxury VIP ambience lounge photo?',
      async () => {
        const defaultBanner = '/assets/images/salon_ambience_lounge_1790779524195.jpg';
        const updatedSettings = { ...settings, secondHeroBannerUrl: defaultBanner };
        await api.updateAdminSettings(updatedSettings);
        setSettings(updatedSettings);
        onSettingsChange?.(updatedSettings);
        localStorage.setItem('salon_settings', JSON.stringify(updatedSettings));
        await loadAllAdminData();
        onDataChanged();
        showSuccessModal('Second Hero Banner Reset', 'Second hero banner was reset to the default lounge view.');
      }
    );
  };

  // Direct Service Photo update from Media Manager
  const handleUpdateServicePhoto = async (serviceId: string, newImageUrl: string) => {
    try {
      const targetService = services.find((s) => s.id === serviceId);
      if (!targetService) return;
      const updatedService = { ...targetService, imageUrl: newImageUrl, updatedAt: new Date().toISOString() };
      await api.updateAdminService(serviceId, updatedService);
      const updatedList = services.map((s) => (s.id === serviceId ? updatedService : s));
      setServices(updatedList);
      onDataChanged();
      showSuccessModal(
        'Service Photo Updated',
        `Photo for "${targetService.name}" updated successfully and is now active in customer view.`
      );
    } catch (err: any) {
      showSuccessModal('Update Failed', err.message || 'Failed to update service photo');
    }
  };

  const handleUploadServicePhotoFile = (serviceId: string, file: File) => {
    setUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        let finalUrl = base64;
        try {
          const res = await api.uploadAdminMedia(base64, file.name || 'service-photo.jpg');
          finalUrl = res.url;
        } catch {}
        await handleUpdateServicePhoto(serviceId, finalUrl);
      } catch (err: any) {
        showSuccessModal('Upload Failed', err.message || 'Failed to upload photo');
      } finally {
        setUploadingMedia(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleUploadGalleryPhotoFile = (galleryItemId: string, file: File) => {
    setUploadingMedia(true);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        let finalUrl = base64;
        try {
          const res = await api.uploadAdminMedia(base64, file.name || 'gallery-photo.jpg');
          finalUrl = res.url;
        } catch {}
        const targetItem = gallery.find((g) => g.id === galleryItemId);
        if (targetItem) {
          const updatedItem = { ...targetItem, imageUrl: finalUrl };
          await api.updateAdminGallery(galleryItemId, updatedItem);
          const galRes = await api.getGallery();
          setGallery(galRes);
          onDataChanged();
          showSuccessModal('Gallery Photo Updated', `Photo for "${targetItem.title}" updated.`);
        }
      } catch (err: any) {
        showSuccessModal('Upload Failed', err.message || 'Failed to update gallery photo');
      } finally {
        setUploadingMedia(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Hours actions
  const handleSaveBusinessHours = async () => {
    try {
      await api.updateAdminBusinessHours(businessHours);
      localStorage.setItem('salon_business_hours', JSON.stringify(businessHours));
      await api.syncState({ businessHours });
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal(
        'Time Management Saved ✓',
        'Shop opening and closing times have been successfully updated! Changes are live immediately in the Customer view, Hero banner, Footer, and Online Booking slots.'
      );
    } catch (err: any) {
      showSuccessModal('Update Failed', err.message || 'Failed to update hours');
    }
  };

  // Blocked Dates actions
  const handleAddBlockedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBlockDate || !newBlockReason) return;
    try {
      const added = await api.createAdminBlockedDate({
        date: newBlockDate,
        reason: newBlockReason,
        allDay: newBlockAllDay,
        startTime: newBlockAllDay ? undefined : newBlockStartTime,
        endTime: newBlockAllDay ? undefined : newBlockEndTime
      });
      const updatedList = [...blockedDates, added];
      localStorage.setItem('salon_blocked_dates', JSON.stringify(updatedList));
      await api.syncState({ blockedDates: updatedList });
      setNewBlockDate('');
      setNewBlockReason('');
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal(
        'Blocked Date / Holiday Saved ✓',
        'Salon holiday block has been saved! Customer view and booking calendar have been immediately updated.'
      );
    } catch (err: any) {
      showSuccessModal('Error', err.message || 'Failed to add block');
    }
  };

  const handleDeleteBlockedDate = async (id: string) => {
    try {
      await api.deleteAdminBlockedDate(id);
      const updatedList = blockedDates.filter((b) => b.id !== id);
      localStorage.setItem('salon_blocked_dates', JSON.stringify(updatedList));
      await api.syncState({ blockedDates: updatedList });
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal('Block Removed ✓', 'Salon holiday block was removed. Normal booking hours restored in Customer view.');
    } catch (err: any) {
      showSuccessModal('Error', err.message || 'Failed to remove block');
    }
  };

  // Walk-in booking submission
  const handleCreateWalkinBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkinServiceId || !walkinDate || !walkinTime || !walkinName || !walkinPhone) {
      showSuccessModal('Missing Fields', 'Please complete all required fields.');
      return;
    }
    try {
      await api.createAdminAppointment({
        serviceId: walkinServiceId,
        date: walkinDate,
        time: walkinTime,
        customerName: walkinName,
        customerPhone: walkinPhone,
        notes: walkinNotes
      });
      setShowWalkinModal(false);
      setWalkinName('');
      setWalkinPhone('');
      setWalkinNotes('');
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal('Walk-in Scheduled', 'Walk-in booking created and confirmed successfully!');
    } catch (err: any) {
      showSuccessModal('Booking Failed', err.message || 'Failed to schedule walk-in');
    }
  };

  // Dedicated Save Automatic Booking Confirmation Mode setting
  const handleSaveAutoConfirmSetting = async () => {
    if (!settings) return;
    try {
      await api.updateAdminSettings(settings);
      onSettingsChange?.(settings);
      localStorage.setItem('salon_settings', JSON.stringify(settings));
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal(
        'Confirmation Setting Saved',
        `Automatic Booking Confirmation is now permanently ${
          settings.autoConfirmBookings
            ? 'ENABLED (New customer bookings will automatically be Confirmed and receive Confirmed notifications)'
            : 'DISABLED (New customer bookings will default to Pending for manual admin review and receive Pending notifications)'
        }. Saved to Supabase cloud database.`
      );
    } catch (err: any) {
      showSuccessModal('Save Failed', err.message || 'Failed to update confirmation setting');
    }
  };

  // Settings update
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    try {
      await api.updateAdminSettings(settings);
      setSettingsSaveMsg('Salon settings and contact details saved successfully to website & database!');
      setTimeout(() => setSettingsSaveMsg(''), 6000);
      onSettingsChange?.(settings);
      localStorage.setItem('salon_settings', JSON.stringify(settings));
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal('Settings Saved', 'Salon contact, location, landmarks, and operational settings have been updated.');
    } catch (err: any) {
      showSuccessModal('Save Failed', err.message || 'Failed to update settings');
    }
  };

  // Dedicated Save Contact Details handler
  const handleSaveContactDetails = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;
    try {
      await api.updateAdminSettings(settings);
      setSettingsSaveMsg('Salon contact details updated and saved live to customer view!');
      setTimeout(() => setSettingsSaveMsg(''), 6000);
      onSettingsChange?.(settings);
      localStorage.setItem('salon_settings', JSON.stringify(settings));
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal(
        'Contact Details Saved',
        'Salon contact phone, WhatsApp number, email, and name have been saved and updated across the customer view.'
      );
    } catch (err: any) {
      showSuccessModal('Save Failed', err.message || 'Failed to update contact details');
    }
  };

  // Dedicated Save Location & Address handler
  const handleSaveLocation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!settings) return;
    try {
      await api.updateAdminSettings(settings);
      setSettingsSaveMsg('Salon location and address saved successfully to customer view!');
      setTimeout(() => setSettingsSaveMsg(''), 6000);
      onSettingsChange?.(settings);
      localStorage.setItem('salon_settings', JSON.stringify(settings));
      await loadAllAdminData();
      onDataChanged();
      showSuccessModal(
        'Location Saved',
        'Salon street address, landmark, and Google Maps location have been updated and are live on customer view.'
      );
    } catch (err: any) {
      showSuccessModal('Save Failed', err.message || 'Failed to update location');
    }
  };

  // Update Full Admin Credentials (Gmail, Username, and/or Password)
  const handleUpdateAdminCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminCredMsg('');
    setAdminCredError('');

    if (!adminCurrentPasswordInput) {
      setAdminCredError('Current password is required to verify and authorize credential changes.');
      return;
    }

    if (adminNewPasswordInput && adminNewPasswordInput.length < 6) {
      setAdminCredError('New password must be at least 6 characters long.');
      return;
    }

    if (adminNewPasswordInput && adminNewPasswordInput !== adminConfirmPasswordInput) {
      setAdminCredError('New password and confirmation password do not match.');
      return;
    }

    setUpdatingAdminCreds(true);
    try {
      const res = await api.updateAdminCredentials({
        currentPassword: adminCurrentPasswordInput,
        newUsername: adminUsernameInput || undefined,
        newEmail: adminEmailInput || undefined,
        newPassword: adminNewPasswordInput || undefined,
        otpCode: adminCredOtpInput || undefined
      });

      if (res.token) {
        setAdminToken(res.token);
        localStorage.setItem('salon_admin_token', res.token);
      }
      if (res.user) {
        localStorage.setItem('salon_admin_user', JSON.stringify(res.user));
      }

      setAdminCredMsg(res.message || 'Admin login credentials updated successfully!');
      setAdminCurrentPasswordInput('');
      setAdminNewPasswordInput('');
      setAdminConfirmPasswordInput('');
      setAdminCredOtpInput('');
      setAdminCredOtpSent(false);
      showSuccessModal(
        'Admin Credentials Updated',
        'Your admin login Gmail, Username, and/or Password have been updated. Use these new credentials for future logins.'
      );
    } catch (err: any) {
      setAdminCredError(err.message || 'Failed to update admin credentials. Please verify your current password.');
    } finally {
      setUpdatingAdminCreds(false);
    }
  };

  const handleSendAdminCredOtp = async () => {
    if (!adminEmailInput || !adminEmailInput.includes('@')) {
      setAdminCredError('Please enter a valid Gmail address to receive the verification OTP.');
      return;
    }
    setAdminCredSendingOtp(true);
    setAdminCredError('');
    try {
      await api.sendOtp(adminEmailInput, 'email');
      setAdminCredOtpSent(true);
      setAdminCredOtpCountdown(300);
      showSuccessModal(
        'OTP Sent to Gmail',
        `A 6-digit verification code was sent to ${adminEmailInput}. Please open your Gmail, read the code, and enter it below to confirm.`
      );
    } catch (err: any) {
      setAdminCredError(err.message || 'Failed to send OTP code to Gmail.');
    } finally {
      setAdminCredSendingOtp(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordChangeMsg('');
    setPasswordChangeError('');

    if (!currentPasswordInput || !newPasswordInput) {
      setPasswordChangeError('Please enter both your current password and new password.');
      return;
    }

    if (newPasswordInput.length < 6) {
      setPasswordChangeError('New password must be at least 6 characters long.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordChangeError('New password and confirmation password do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      const res = await api.changeAdminPassword({
        currentPassword: currentPasswordInput,
        newPassword: newPasswordInput
      });
      setPasswordChangeMsg(res.message || 'Password changed successfully!');
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
    } catch (err: any) {
      setPasswordChangeError(err.message || 'Failed to change password. Please check your current password.');
    } finally {
      setChangingPassword(false);
    }
  };

  // Email Accounts Hub & Salon Ownership Handover Actions
  const handleSaveEmailHub = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailHub) return;
    setSavingEmailHub(true);
    setEmailHubSaveMsg('');
    try {
      const res = await api.updateEmailHub({
        bookingAlertEmail: emailHub.bookingAlertEmail,
        adminLoginEmail: emailHub.adminLoginEmail,
        publicContactEmail: emailHub.publicContactEmail,
        smtpUser: emailHub.smtpUser,
        smtpPassword: emailHubSmtpPassword || undefined
      });
      setEmailHubSaveMsg(res.message || 'All email roles updated and saved permanently!');
      setEmailHubSmtpPassword('');
      // Keep local site settings in sync
      if (settings) {
        setSettings({
          ...settings,
          email: emailHub.publicContactEmail,
          adminNotificationEmail: emailHub.bookingAlertEmail,
          gmailUser: emailHub.smtpUser
        });
      }
      setTimeout(() => setEmailHubSaveMsg(''), 6000);
    } catch (err: any) {
      alert(`Failed to save email settings: ${err.message}`);
    } finally {
      setSavingEmailHub(false);
    }
  };

  const handleTestBookingAlert = async () => {
    const target = emailHub?.bookingAlertEmail || settings?.adminNotificationEmail;
    if (!target) {
      alert('Please enter and save an Allotted Booking Updates Email first.');
      return;
    }
    setTestingBookingAlert(true);
    setTestBookingAlertResult(null);
    try {
      const res = await api.testBookingAlertEmail(target);
      setTestBookingAlertResult({
        success: res.success,
        message: res.message
      });
    } catch (err: any) {
      setTestBookingAlertResult({
        success: false,
        message: err.message || 'Error dispatching test booking alert'
      });
    } finally {
      setTestingBookingAlert(false);
    }
  };

  const handleExecuteOwnershipHandover = async () => {
    if (!handoverOwnerEmail || !handoverOwnerEmail.includes('@')) {
      alert('Please enter a valid Gmail / Email address for the new owner of B&B Family Salon.');
      return;
    }
    setHandoverExecuting(true);
    try {
      const res = await api.updateEmailHub({
        handoverOwnerEmail: handoverOwnerEmail.trim().toLowerCase(),
        handoverOwnerName: handoverOwnerName.trim() || undefined,
        handoverBookingAlert,
        handoverPublicContact,
        handoverAdminLogin,
        handoverSmtpUser: handoverSmtp,
        smtpPassword: emailHubSmtpPassword || undefined
      });
      setHandoverConfirmModal(false);
      showSuccessModal(
        'Ownership Successfully Handed Over',
        `Website email roles have been transferred to ${handoverOwnerEmail.trim().toLowerCase()}. Your personal emails have been removed from the selected roles.`
      );
      // Reload email hub & admin data
      const updatedHub = await api.getEmailHub();
      setEmailHub(updatedHub);
      await loadAllAdminData();
    } catch (err: any) {
      alert(`Handover failed: ${err.message}`);
    } finally {
      setHandoverExecuting(false);
    }
  };

  if (!isOpen) return null;

  const navItems = [
    { id: 'overview', label: 'Overview', icon: Layers },
    { id: 'appointments', label: 'Bookings', icon: CalendarIcon },
    { id: 'services', label: 'Services', icon: Sparkles },
    { id: 'staff', label: 'Staff & Stylists', icon: Users },
    { id: 'media', label: 'Media & Photos', icon: ImageIcon },
    { id: 'hours', label: 'Time Management', icon: Clock },
    { id: 'blocks', label: 'Blocked Dates', icon: XCircle },
    { id: 'customers', label: 'Clients', icon: User },
    { id: 'reviews', label: 'Reviews', icon: CheckCircle },
    { id: 'emails', label: 'Email Accounts', icon: Mail },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'security', label: 'Security & Password', icon: Lock },
    { id: 'notifications', label: 'Logs', icon: Bell },
    { id: 'supabase', label: 'Cloud DB', icon: Database }
  ];

  return (
    <div className="fixed inset-0 z-50 w-full max-w-full h-screen min-h-screen bg-[#141312] flex flex-col overflow-hidden overscroll-none touch-manipulation">
      <div className="relative w-full h-full flex-1 bg-[#FBFBFA] dark:bg-[#141312] text-[#1C1B1A] dark:text-white flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <div className="h-16 px-4 sm:px-6 bg-[#141312] text-white flex items-center justify-between border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Shield className="w-5 h-5 text-[#C29F67] shrink-0" />
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-semibold tracking-wide flex items-center gap-1.5 sm:gap-2 truncate">
                <span className="truncate">{settings?.salonName || 'B&B Family Salon'}</span>
                <span className="text-[9px] sm:text-[10px] bg-[#C29F67]/20 text-[#E6D4BA] px-1.5 py-0.5 rounded-sm shrink-0">
                  Admin Console
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isAuthenticated && (
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-[#E6D4BA] hover:text-white border border-[#C29F67]/60 text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Switch to Customer Website (You remain logged in as Administrator)"
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-[#C29F67]" />
                <span className="hidden sm:inline">Switch to Customer View</span>
                <span className="sm:hidden">Customer View</span>
              </button>
            )}

            {isAuthenticated && (
              <button
                type="button"
                onClick={() => {
                  setWalkinDate(new Date().toISOString().split('T')[0]);
                  if (services.length > 0) setWalkinServiceId(services[0].id);
                  setShowWalkinModal(true);
                }}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Booking</span>
              </button>
            )}

            {onAdminThemeToggle && (
              <button
                type="button"
                onClick={onAdminThemeToggle}
                className="p-2 bg-white/10 hover:bg-white/20 text-[#E6D4BA] hover:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold shadow-2xs"
                title={adminTheme === 'dark' ? 'Admin Portal: Dark Mode (Click for Light Mode)' : 'Admin Portal: Light Mode (Click for Dark Mode)'}
                aria-label="Toggle admin portal theme"
              >
                {adminTheme === 'dark' ? (
                  <>
                    <Sun className="w-4 h-4 text-[#C29F67]" />
                    <span className="hidden xl:inline text-[11px]">Light Mode</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-[#E6D4BA]" />
                    <span className="hidden xl:inline text-[11px]">Dark Mode</span>
                  </>
                )}
              </button>
            )}

            {isAuthenticated && (
              <button
                type="button"
                onClick={loadAllAdminData}
                className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Refresh database"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* PERSISTENT SUPABASE-BACKED ADMIN NOTIFICATIONS BELL & DROPDOWN */}
            {isAuthenticated && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowNotifDropdown((prev) => !prev)}
                  className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer relative"
                  title="Admin Notifications"
                  aria-label="View notifications"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-600 text-white font-bold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                      {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                    </span>
                  )}
                </button>

                {showNotifDropdown && (
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#1A1918] border border-[#E6D4BA] dark:border-white/10 rounded-2xl shadow-2xl z-70 overflow-hidden text-xs animate-in zoom-in-95 duration-150">
                    <div className="p-3 bg-[#FAF7F2] dark:bg-[#141312] border-b border-[#E6D4BA]/60 dark:border-white/10 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Bell className="w-4 h-4 text-[#C29F67] shrink-0" />
                        <span className="font-bold text-[#1C1B1A] dark:text-white truncate">Notifications</span>
                        {unreadNotifCount > 0 && (
                          <span className="bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0">
                            {unreadNotifCount}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {unreadNotifCount > 0 && (
                          <button
                            type="button"
                            onClick={handleMarkAllNotificationsRead}
                            className="text-[10px] sm:text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline font-bold cursor-pointer"
                            title="Mark all notifications as read"
                          >
                            Mark read
                          </button>
                        )}
                        {adminNotifications.some((n) => n.isRead) && (
                          <button
                            type="button"
                            onClick={handleClearReadNotifications}
                            className="text-[10px] sm:text-[11px] text-amber-700 dark:text-amber-400 hover:underline font-bold cursor-pointer"
                            title="Permanently erase all read notifications from website and Supabase"
                          >
                            Erase Read
                          </button>
                        )}
                        {adminNotifications.length > 0 && (
                          <button
                            type="button"
                            onClick={handleDeleteAllNotifications}
                            className="text-[10px] sm:text-[11px] text-red-600 dark:text-red-400 hover:underline font-bold cursor-pointer"
                            title="Permanently erase all notifications"
                          >
                            Delete All
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto divide-y divide-gray-100 dark:divide-white/10">
                      {adminNotifications.length === 0 ? (
                        <div className="p-6 text-center text-[#79746D] dark:text-gray-400">
                          <Bell className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2 opacity-50" />
                          <p className="font-medium">No notifications yet.</p>
                          <p className="text-[11px] mt-0.5">Real-time alerts for bookings & cancellations will appear here.</p>
                        </div>
                      ) : (
                        adminNotifications.slice(0, 50).map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 transition-colors ${
                              !n.isRead
                                ? 'bg-amber-50/70 dark:bg-amber-950/25'
                                : 'hover:bg-[#FAF7F2] dark:hover:bg-white/5'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {!n.isRead && (
                                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                                  )}
                                  <span className="font-bold text-[#1C1B1A] dark:text-white">
                                    {n.title}
                                  </span>
                                  {n.bookingNumber && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAppointmentSearch(n.bookingNumber || '');
                                        setActiveTab('appointments');
                                        setShowNotifDropdown(false);
                                      }}
                                      className="font-mono text-[10px] bg-[#FAF7F2] dark:bg-white/10 border border-[#E6D4BA]/60 dark:border-white/10 text-[#9C753D] dark:text-[#C29F67] px-1.5 py-0.5 rounded hover:underline cursor-pointer"
                                      title="Filter by this booking"
                                    >
                                      #{n.bookingNumber}
                                    </button>
                                  )}
                                </div>
                                <p className="text-[11px] text-[#79746D] dark:text-gray-300 leading-snug">
                                  {n.message}
                                </p>
                                <span className="text-[10px] text-[#79746D]/80 dark:text-gray-400 block font-medium">
                                  {formatTimestampIST(n.createdAt)}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                {!n.isRead && (
                                  <button
                                    type="button"
                                    onClick={() => handleMarkNotificationRead(n.id)}
                                    className="text-[10px] text-[#9C753D] dark:text-[#C29F67] hover:underline p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNotification(n.id)}
                                  className="text-[10px] text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                                  title="Permanently erase notification"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-white/70 hover:text-red-400 transition-colors py-1.5 px-2.5 sm:px-3 rounded-lg hover:bg-white/5 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            ) : null}

            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Close admin portal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Horizontal Navigation Tab Bar */}
        {isAuthenticated && (
          <div className="md:hidden flex items-center gap-1.5 overflow-x-auto p-2 bg-[#1C1B1A] border-b border-white/10 shrink-0 no-scrollbar touch-pan-x">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#C29F67] text-white shadow-xs'
                      : 'text-white/70 hover:text-white bg-white/5'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Content Area */}
        {!isAuthenticated ? (
          /* AUTHENTICATION SCREEN: STRICT ADMIN LOGIN FOR THE BOOKED SLOT */
          <div className="flex-1 flex items-center justify-center p-4 sm:p-6 bg-[#FAF7F2] dark:bg-[#141312] overflow-y-auto">
            <div className="w-full max-w-md bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl p-6 sm:p-8 shadow-xl space-y-5">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 bg-[#FAF7F2] dark:bg-white/5 border border-[#C29F67] rounded-xl flex items-center justify-center mx-auto text-[#C29F67]">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-xl sm:text-2xl font-serif text-[#1C1B1A] dark:text-white font-bold">
                  Admin Portal Login
                </h3>
                <p className="text-xs text-[#79746D] dark:text-gray-400">
                  Enter your registered administrator Gmail or Username and Password to access the salon management console.
                </p>
              </div>

              {/* Status Badge */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                <Shield className="w-4 h-4 text-[#C29F67] shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-[#1C1B1A] dark:text-white">Salon Administrator & Staff Console</p>
                  <p className="text-[11px] text-[#79746D] dark:text-gray-300 mt-0.5">
                    This login is reserved for Salon Staff & Admins. If you are a client looking to book services or check your appointments, click below:
                  </p>
                  <button
                    type="button"
                    onClick={onClose}
                    className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#1C1B1A] dark:bg-[#C29F67] text-white rounded-lg text-xs font-bold hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] transition-colors cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Go to Customer Website & Bookings</span>
                  </button>
                </div>
              </div>

              {/* Form (Strict Login) */}
              <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
                <div>
                  <label className="block text-xs font-semibold text-[#1C1B1A] dark:text-white mb-1">
                    Gmail / Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your registered Gmail or username"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    className="w-full px-3.5 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] focus:ring-1 focus:ring-[#C29F67] outline-hidden"
                  />
                </div>

                {authMethod === 'password' ? (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-[#1C1B1A] dark:text-white">
                        Password *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('otp');
                          setLoginError('');
                        }}
                        className="text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline font-medium cursor-pointer"
                      >
                        Login via Gmail OTP instead
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showAdminLoginPassword ? 'text' : 'password'}
                        required
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        autoComplete="current-password"
                        className="w-full pl-3.5 pr-10 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white focus:border-[#C29F67] focus:ring-1 focus:ring-[#C29F67] outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => setShowAdminLoginPassword(!showAdminLoginPassword)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                        tabIndex={-1}
                        aria-label={showAdminLoginPassword ? 'Hide password' : 'Show password'}
                        title={showAdminLoginPassword ? 'Hide password' : 'Show password'}
                      >
                        {showAdminLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-[#1C1B1A] dark:text-white">
                        Gmail Verification Code *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMethod('password');
                          setLoginError('');
                        }}
                        className="text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline font-medium cursor-pointer"
                      >
                        Use Password instead
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="6-digit OTP"
                        value={otpCodeInput}
                        onChange={(e) => setOtpCodeInput(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 text-xs bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white font-mono tracking-widest text-center focus:border-[#C29F67] outline-hidden"
                      />
                      <button
                        type="button"
                        disabled={sendingOtp || !loginIdentifier}
                        onClick={() => handleSendOtp(loginIdentifier, 'email')}
                        className="px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-[#E6D4BA] dark:border-white/20 text-[#9C753D] dark:text-[#C29F67] text-xs font-semibold rounded-lg hover:bg-[#F3EBDD] transition-colors disabled:opacity-50 cursor-pointer whitespace-nowrap"
                      >
                        {sendingOtp ? 'Sending...' : otpSent ? (otpCountdown > 0 ? `Resend (${otpCountdown}s)` : 'Resend OTP') : 'Send OTP'}
                      </button>
                    </div>

                  </div>
                )}

                {loginError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                    <span>{loginError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loggingIn}
                  className="w-full py-3 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                >
                  {loggingIn ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Sign In to Dashboard</span>
                  )}
                </button>
              </form>
            </div>
          </div>
        ) : (
          /* AUTHENTICATED DASHBOARD */
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Navigation (Desktop only, mobile uses top horizontal bar) */}
            <aside className="hidden md:flex w-56 bg-white dark:bg-[#1A1918] border-r border-[#E6D4BA]/50 dark:border-white/10 flex-col justify-between p-3 shrink-0 overflow-y-auto">
              <div className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id as any)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg text-left transition-colors cursor-pointer ${
                        isActive
                          ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] shadow-xs'
                          : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-[#C29F67] dark:text-[#1C1B1A]' : 'text-[#79746D] dark:text-gray-400'}`} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* Bottom Quick Status */}
              <div className="pt-4 border-t border-gray-100 dark:border-white/10 px-2 text-[11px] text-[#79746D] dark:text-gray-400 space-y-1">
                <p className="font-semibold text-[#1C1B1A] dark:text-white">Active Database</p>
                <p>Kolar Road, Bhopal</p>
                <p className="text-[#9C753D] dark:text-[#C29F67]">v1.0 Production Ready</p>
              </div>
            </aside>

            {/* Main Content Workspace */}
            <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-48 sm:pb-36 bg-[#FAF7F2] dark:bg-[#141312]">
              {settingsSaveMsg && (
                <div className="mb-4 sm:mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-950">Settings & Contact Details Updated</p>
                      <p className="text-[11px] text-emerald-800">{settingsSaveMsg}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSettingsSaveMsg('')}
                    className="p-1 hover:bg-emerald-100 rounded text-emerald-700 transition-colors cursor-pointer"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              {signupSuccessMsg && (
                <div className="mb-6 p-4 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between text-xs text-emerald-900 shadow-xs animate-in slide-in-from-top-2">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
                      <Shield className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-emerald-950">Primary Admin Account Established & Slot Locked</p>
                      <p className="text-[11px] text-emerald-800">{signupSuccessMsg}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSignupSuccessMsg('')}
                    className="p-1 hover:bg-emerald-100 rounded text-emerald-700 transition-colors cursor-pointer"
                    aria-label="Dismiss banner"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* TAB 1: OVERVIEW */}
              {activeTab === 'overview' && overview && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-serif text-[#1C1B1A] dark:text-white font-bold">Operations Overview</h3>
                    <p className="text-xs text-[#79746D] dark:text-gray-400">
                      Live metrics and upcoming client reservations at B&B Family Salon.
                    </p>
                  </div>

                  {/* KPI Cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 p-4 rounded-xl shadow-xs space-y-1">
                      <span className="text-[11px] uppercase font-semibold text-[#79746D] dark:text-gray-400">
                        Today's Bookings
                      </span>
                      <p className="text-2xl font-serif font-bold text-[#1C1B1A] dark:text-white tabular-nums">
                        {overview.metrics.todayCount}
                      </p>
                      <p className="text-[10px] text-[#9C753D] dark:text-[#C29F67]">Real-time daily schedule</p>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 p-4 rounded-xl shadow-xs space-y-1">
                      <span className="text-[11px] uppercase font-semibold text-[#79746D] dark:text-gray-400">
                        Upcoming (Future)
                      </span>
                      <p className="text-2xl font-serif font-bold text-[#1C1B1A] dark:text-white tabular-nums">
                        {appointments.length > 0
                          ? appointments.filter((a) => {
                              if (a.status === 'cancelled' || a.status === 'completed' || (a.status as string) === 'rejected') return false;
                              const istNow = getCurrentIST();
                              if (a.date > istNow.dateStr) return true;
                              if (a.date === istNow.dateStr) {
                                return parseTimeToMinutes(a.time) > istNow.totalMinutes;
                              }
                              return false;
                            }).length
                          : overview.metrics.upcomingCount}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Confirmed & pending</p>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 p-4 rounded-xl shadow-xs space-y-1">
                      <span className="text-[11px] uppercase font-semibold text-[#79746D] dark:text-gray-400">
                        Total Customers
                      </span>
                      <p className="text-2xl font-serif font-bold text-[#1C1B1A] dark:text-white tabular-nums">
                        {overview.metrics.totalCustomers}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400">Signed up / registered only</p>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 p-4 rounded-xl shadow-xs space-y-1">
                      <span className="text-[11px] uppercase font-semibold text-[#79746D] dark:text-gray-400">
                        Total Realized Revenue
                      </span>
                      <p className="text-2xl font-serif font-bold text-[#1C1B1A] dark:text-white tabular-nums">
                        ₹{overview.metrics.totalRevenue}
                      </p>
                      <p className="text-[10px] text-emerald-700 dark:text-emerald-400">From completed services only</p>
                    </div>
                  </div>

                  {/* Status Breakdown Strip */}
                  <div className="p-4 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <span className="text-[#79746D] dark:text-gray-400">Pending:</span>
                      <span className="font-bold text-[#1C1B1A] dark:text-white">{overview.metrics.pendingCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-[#79746D] dark:text-gray-400">Confirmed:</span>
                      <span className="font-bold text-[#1C1B1A] dark:text-white">{overview.metrics.confirmedCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-[#79746D] dark:text-gray-400">Completed:</span>
                      <span className="font-bold text-[#1C1B1A] dark:text-white">{overview.metrics.completedCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                      <span className="text-[#79746D] dark:text-gray-400">Cancelled:</span>
                      <span className="font-bold text-[#1C1B1A] dark:text-white">{overview.metrics.cancelledCount}</span>
                    </div>
                  </div>

                  {/* TODAY'S ACTIVITY (REPLACED POPULAR SERVICES & RECENT ACTIVITY) */}
                  {(() => {
                    const ist = getCurrentIST();
                    const todayStr = overview?.todayDateStr || ist.dateStr;

                    // Prioritize appointments state for real-time reactivity
                    const todayFromState = appointments.filter((a) => a.date === todayStr);
                    const todayFromOverview = overview?.todayAppointments || [];
                    const todaySource = todayFromState.length > 0 ? todayFromState : todayFromOverview;

                    // Sort strictly chronologically by start time in minutes (supports 24h & 12h AM/PM)
                    const todayList: Appointment[] = [...todaySource].sort(
                      (a, b) => parseTimeToMinutes(a.time) - parseTimeToMinutes(b.time)
                    );

                    let formattedToday = todayStr;
                    try {
                      const parts = todayStr.split('-');
                      if (parts.length === 3) {
                        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
                        formattedToday = d.toLocaleDateString('en-IN', {
                          weekday: 'long',
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric'
                        });
                      }
                    } catch {}

                    // Active appointments today (not completed, cancelled, or rejected)
                    const activeTodayAppts = todayList.filter(
                      (a) => a.status !== 'completed' && a.status !== 'cancelled' && (a.status as string) !== 'rejected'
                    );

                    // Truly upcoming appointments today (start time is strictly in the future relative to current IST time)
                    const upcomingTodayAppts = activeTodayAppts.filter(
                      (a) => parseTimeToMinutes(a.time) > ist.totalMinutes
                    );

                    // The genuine Earliest Next appointment ID
                    const earliestUpcomingId = upcomingTodayAppts.length > 0 ? upcomingTodayAppts[0].id : null;

                    // In-progress appointment (start <= now < end)
                    const inProgressAppt = activeTodayAppts.find((a) => {
                      const start = parseTimeToMinutes(a.time);
                      const dur = Number(a.serviceDuration) || 30;
                      const end = a.endTime ? parseTimeToMinutes(a.endTime) : start + dur;
                      return ist.totalMinutes >= start && ist.totalMinutes < end;
                    });
                    const inProgressId = inProgressAppt ? inProgressAppt.id : null;

                    // Appointments whose scheduled time has passed and no action was taken
                    const overdueTodayAppts = activeTodayAppts.filter((a) => {
                      const start = parseTimeToMinutes(a.time);
                      const dur = Number(a.serviceDuration) || 30;
                      const end = a.endTime ? parseTimeToMinutes(a.endTime) : start + dur;
                      return ist.totalMinutes >= end;
                    });
                    const overdueCount = overdueTodayAppts.length;

                    return (
                      <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-white/10 pb-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <Clock className="w-4 h-4 text-[#C29F67]" />
                              <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                                Today’s Activity
                              </h4>
                              <span className="text-[11px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                {todayList.length} Scheduled Today
                              </span>
                              {overdueCount > 0 && (
                                <span className="text-[11px] bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
                                  {overdueCount} Action Required
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#79746D] dark:text-gray-400">
                              {formattedToday} · {earliestUpcomingId ? `Earliest upcoming appointment at ${formatTime12(upcomingTodayAppts[0].time)}` : overdueCount > 0 ? 'Status update required on passed appointment slots' : 'All scheduled appointments for today completed or elapsed'} · Real-time IST schedule
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => setActiveTab('appointments')}
                            className="px-3.5 py-1.5 bg-[#FAF7F2] dark:bg-white/10 hover:bg-[#FAF7F2]/80 dark:hover:bg-white/15 text-xs text-[#9C753D] dark:text-[#C29F67] font-bold rounded-lg border border-[#E6D4BA] dark:border-white/20 transition-all cursor-pointer flex items-center gap-1.5 self-start sm:self-auto shadow-2xs"
                          >
                            <span>View Full Booking History ({appointments.length})</span>
                            <span>→</span>
                          </button>
                        </div>

                        {/* Overdue Action Banner */}
                        {overdueCount > 0 && (
                          <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700/60 rounded-xl p-3.5 text-xs text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                            <div className="flex items-start sm:items-center gap-2.5">
                              <div className="p-1.5 bg-amber-200/80 dark:bg-amber-800/60 rounded-lg text-amber-900 dark:text-amber-100 shrink-0">
                                <AlertTriangle className="w-4 h-4" />
                              </div>
                              <div>
                                <p className="font-bold text-sm">
                                  {overdueCount} Appointment{overdueCount > 1 ? 's' : ''} Passed Scheduled Time · Action Required
                                </p>
                                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                                  The scheduled appointment slot has ended. Please update the status below (mark as Completed, Reschedule, or Cancel).
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 self-start sm:self-auto shrink-0 font-mono text-[11px] bg-white dark:bg-white/10 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-white/15">
                              <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                              <span>Current IST: {formatTime12(`${String(ist.hours).padStart(2, '0')}:${String(ist.minutes).padStart(2, '0')}`)}</span>
                            </div>
                          </div>
                        )}

                        {todayList.length === 0 ? (
                          <div className="p-8 text-center bg-[#FAF7F2]/50 dark:bg-white/5 rounded-xl border border-dashed border-[#E6D4BA] dark:border-white/10 space-y-2">
                            <CalendarIcon className="w-8 h-8 mx-auto text-[#C29F67]/60" />
                            <p className="font-semibold text-sm text-[#1C1B1A] dark:text-white">
                              No Appointments Scheduled for Today
                            </p>
                            <p className="text-xs text-[#79746D] dark:text-gray-400 max-w-md mx-auto">
                              There are no appointments booked for today yet. Staff can review upcoming days or view all historical bookings.
                            </p>
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => setActiveTab('appointments')}
                                className="px-4 py-2 bg-[#1C1B1A] dark:bg-[#C29F67] text-white text-xs font-bold rounded-lg hover:bg-black transition-colors cursor-pointer"
                              >
                                Browse All Bookings
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div className="overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr className="border-b border-gray-100 dark:border-white/10 text-[#79746D] dark:text-gray-400 text-[11px]">
                                    <th className="py-2.5 px-3 font-semibold">Schedule Time</th>
                                    <th className="py-2.5 px-3 font-semibold">Ref #</th>
                                    <th className="py-2.5 px-3 font-semibold">Client Name & Phone</th>
                                    <th className="py-2.5 px-3 font-semibold">Service & Duration</th>
                                    <th className="py-2.5 px-3 font-semibold">Stylist</th>
                                    <th className="py-2.5 px-3 font-semibold">Status</th>
                                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                  {todayList.map((appt) => {
                                    const startM = parseTimeToMinutes(appt.time);
                                    const dur = Number(appt.serviceDuration) || 30;
                                    const endM = appt.endTime ? parseTimeToMinutes(appt.endTime) : startM + dur;

                                    const isCompleted = appt.status === 'completed';
                                    const isCancelled = appt.status === 'cancelled' || (appt.status as string) === 'rejected';

                                    // Has the scheduled time passed today?
                                    const isTimePassed = ist.totalMinutes >= endM;

                                    // Overdue without action: time passed and status still pending/confirmed/postponed
                                    const isOverdue = isTimePassed && !isCompleted && !isCancelled;

                                    // Currently in progress: clock is within the scheduled slot
                                    const isInProgress = appt.id === inProgressId;

                                    // Earliest next: ONLY if it's strictly upcoming (startM > current IST time) and not completed/cancelled
                                    const isEarliestNext = appt.id === earliestUpcomingId;

                                    return (
                                      <React.Fragment key={appt.id}>
                                        <tr
                                          className={`transition-colors cursor-pointer ${
                                            isOverdue
                                              ? 'bg-rose-50/60 dark:bg-rose-950/20 hover:bg-rose-100/60 dark:hover:bg-rose-950/30 border-l-4 border-rose-500'
                                              : isInProgress
                                              ? 'bg-emerald-50/60 dark:bg-emerald-950/20 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/30 border-l-4 border-emerald-500'
                                              : isEarliestNext
                                              ? 'bg-amber-50/60 dark:bg-amber-950/20 hover:bg-amber-100/60 dark:hover:bg-amber-950/30 border-l-4 border-amber-500'
                                              : 'hover:bg-[#FAF7F2] dark:hover:bg-white/10'
                                          }`}
                                          onClick={() => setSelectedAppointment(appt)}
                                        >
                                          <td className="py-3 px-3 whitespace-nowrap">
                                            <div className="flex items-center gap-2 flex-wrap">
                                              <span className="font-mono font-bold text-sm text-[#1C1B1A] dark:text-white">
                                                {formatTime12(appt.time)}
                                              </span>
                                              {isEarliestNext && (
                                                <span className="text-[10px] bg-amber-500 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1">
                                                  ⭐ Earliest Next
                                                </span>
                                              )}
                                              {isInProgress && (
                                                <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1 animate-pulse">
                                                  🟢 In Progress
                                                </span>
                                              )}
                                              {isOverdue && (
                                                <span className="text-[10px] bg-rose-600 text-white font-bold px-1.5 py-0.5 rounded shadow-2xs flex items-center gap-1">
                                                  ⚠️ Time Passed
                                                </span>
                                              )}
                                            </div>
                                            <span className="text-[10px] text-[#79746D] dark:text-gray-400 block mt-0.5">
                                              {appt.endTime ? `Until ${formatTime12(appt.endTime)}` : `${dur} mins`}
                                            </span>
                                          </td>
                                          <td className="py-3 px-3 font-mono font-bold text-[#1C1B1A] dark:text-white">
                                            #{appt.bookingNumber}
                                          </td>
                                          <td className="py-3 px-3">
                                            <p className="font-semibold text-[#1C1B1A] dark:text-white">{appt.customerName}</p>
                                            <a
                                              href={`tel:${appt.customerPhone}`}
                                              onClick={(e) => e.stopPropagation()}
                                              className="text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline"
                                            >
                                              {appt.customerPhone}
                                            </a>
                                          </td>
                                          <td className="py-3 px-3">
                                            <p className="font-medium text-[#1C1B1A] dark:text-white">{appt.serviceName}</p>
                                            <span className="text-[10px] text-[#79746D] dark:text-gray-400">
                                              ₹{appt.actualAmountCollected ?? appt.servicePrice} · {appt.serviceDuration} mins
                                            </span>
                                          </td>
                                          <td className="py-3 px-3 text-[#79746D] dark:text-gray-300">
                                            {appt.stylistName || 'Any Available Specialist'}
                                          </td>
                                          <td className="py-3 px-3">
                                            <span
                                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                appt.status === 'confirmed'
                                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                                  : appt.status === 'postponed'
                                                  ? 'bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300'
                                                  : appt.status === 'completed'
                                                  ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                                                  : appt.status === 'cancelled'
                                                  ? 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                                                  : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                              }`}
                                            >
                                              {appt.status}
                                            </span>
                                            {isOverdue && (
                                              <span className="block text-[10px] text-rose-600 dark:text-rose-400 font-bold mt-1">
                                                ● Action Required
                                              </span>
                                            )}
                                          </td>
                                          <td className="py-3 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                              {isOverdue && (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleUpdateAppointmentStatus(appt.id, 'completed');
                                                  }}
                                                  className="px-2.5 py-1 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                                                  title="Quick mark completed"
                                                >
                                                  <Check className="w-3 h-3" />
                                                  <span>Complete</span>
                                                </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setSelectedAppointment(appt);
                                                }}
                                                className="px-2.5 py-1 text-[11px] bg-white dark:bg-white/10 hover:bg-[#FAF7F2] dark:hover:bg-white/20 border border-gray-200 dark:border-white/15 rounded text-[#1C1B1A] dark:text-white font-medium transition-colors cursor-pointer"
                                              >
                                                Details
                                              </button>
                                            </div>
                                          </td>
                                        </tr>

                                        {/* Overdue note banner directly with appointment */}
                                        {isOverdue && (
                                          <tr className="bg-rose-50/90 dark:bg-rose-950/35 border-b border-rose-200/80 dark:border-rose-900/60">
                                            <td colSpan={7} className="py-2.5 px-3">
                                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
                                                <div className="flex items-center gap-2 text-rose-800 dark:text-rose-300 font-medium">
                                                  <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                                  <span>
                                                    <strong>Note:</strong> Scheduled appointment time has passed ({appt.endTime ? `slot ended at ${formatTime12(appt.endTime)}` : `${dur} mins slot elapsed`}). Please update the status (mark completed or reschedule).
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleUpdateAppointmentStatus(appt.id, 'completed');
                                                    }}
                                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow-2xs transition-colors cursor-pointer flex items-center gap-1"
                                                  >
                                                    <Check className="w-3 h-3" />
                                                    <span>Mark Completed</span>
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      setSelectedAppointment(appt);
                                                    }}
                                                    className="px-2.5 py-1 bg-white dark:bg-white/10 hover:bg-rose-100 dark:hover:bg-white/20 border border-rose-300 dark:border-white/20 rounded font-semibold text-rose-800 dark:text-rose-200 transition-colors cursor-pointer"
                                                  >
                                                    Update Status / Reschedule →
                                                  </button>
                                                </div>
                                              </div>
                                            </td>
                                          </tr>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* TAB 2: APPOINTMENTS MANAGEMENT */}
              {activeTab === 'appointments' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h3 className="text-xl font-serif text-[#1C1B1A] dark:text-white font-bold">Appointments Management</h3>
                      <p className="text-xs text-[#79746D] dark:text-gray-400">
                        Manage customer reservations, change statuses, reschedule, or enter staff notes.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Mobile layout toggle: Horizontal Right-to-Left scroll vs List (Mobile Only) */}
                      <div className="flex md:hidden items-center border border-[#E6D4BA]/80 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 p-0.5">
                        <button
                          type="button"
                          onClick={() => setAdminBookingsMobileLayout('horizontal')}
                          className={`p-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                            adminBookingsMobileLayout === 'horizontal'
                              ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] font-bold'
                              : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white'
                          }`}
                          title="Scroll right-to-left"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Scroll R-to-L</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminBookingsMobileLayout('list')}
                          className={`p-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                            adminBookingsMobileLayout === 'list'
                              ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] font-bold'
                              : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white'
                          }`}
                          title="Stacked cards view"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Cards</span>
                        </button>
                      </div>

                      {appointments.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllAppointments}
                          className="px-3 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-100 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                          title="Delete all demo and test bookings"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete All Bookings</span>
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setWalkinDate(new Date().toISOString().split('T')[0]);
                          if (services.length > 0) setWalkinServiceId(services[0].id);
                          setShowWalkinModal(true);
                        }}
                        className="px-4 py-2 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#C29F67] dark:text-[#1C1B1A]" />
                        <span>Book Walk-in / Phone Client</span>
                      </button>
                    </div>
                  </div>

                  {/* Status Filter Pills with Live Accurate Booking Counts */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
                    <button
                      type="button"
                      onClick={() => setAppointmentFilterStatus('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        appointmentFilterStatus === 'all'
                          ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] shadow-xs'
                          : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A]'
                      }`}
                    >
                      All ({appointments.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppointmentFilterStatus('pending')}
                      className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        appointmentFilterStatus === 'pending'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                      }`}
                    >
                      Pending ({appointments.filter((a) => a.status === 'pending').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppointmentFilterStatus('confirmed')}
                      className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        appointmentFilterStatus === 'confirmed'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                      }`}
                    >
                      Confirmed ({appointments.filter((a) => a.status === 'confirmed').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppointmentFilterStatus('completed')}
                      className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        appointmentFilterStatus === 'completed'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                      }`}
                    >
                      Completed ({appointments.filter((a) => a.status === 'completed').length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAppointmentFilterStatus('cancelled')}
                      className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap transition-colors cursor-pointer ${
                        appointmentFilterStatus === 'cancelled'
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800/60'
                      }`}
                    >
                      Cancelled ({appointments.filter((a) => a.status === 'cancelled').length})
                    </button>
                  </div>

                  {/* Filter Toolbar */}
                  <div className="p-3 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl flex flex-wrap items-center gap-3 text-xs">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search client, phone, or Ref ID..."
                        value={appointmentSearch}
                        onChange={(e) => setAppointmentSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-[#FAF7F2] dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                      />
                    </div>

                    {/* Status filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#79746D] dark:text-gray-400">Status:</span>
                      <select
                        value={appointmentFilterStatus}
                        onChange={(e) => setAppointmentFilterStatus(e.target.value)}
                        className="px-2.5 py-1.5 bg-[#FAF7F2] dark:bg-[#1C1B1A] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                      >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="postponed">Postponed</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="no-show">No-Show</option>
                      </select>
                    </div>

                    {/* Date filter */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#79746D] dark:text-gray-400">Date:</span>
                      <input
                        type="date"
                        value={appointmentFilterDate}
                        onChange={(e) => setAppointmentFilterDate(e.target.value)}
                        className="px-2.5 py-1 bg-[#FAF7F2] dark:bg-[#1C1B1A] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                      />
                      {appointmentFilterDate && (
                        <button
                          type="button"
                          onClick={() => setAppointmentFilterDate('')}
                          className="text-[10px] text-red-600 dark:text-red-400 hover:underline cursor-pointer font-bold"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Realized Revenue Summary Banner when filtering Completed */}
                  {appointmentFilterStatus === 'completed' && (
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200 dark:border-blue-800/60 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
                          ₹
                        </div>
                        <div>
                          <p className="font-bold text-blue-900 dark:text-blue-200">
                            Realized Revenue from Completed Services
                          </p>
                          <p className="text-[11px] text-blue-700 dark:text-blue-300">
                            Calculated from actual collected payments (e.g. ₹1,050 collected on ₹1,100 service).
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400 block">
                            Actual Collected Revenue
                          </span>
                          <span className="text-xl font-bold font-serif text-blue-900 dark:text-white tabular-nums">
                            ₹
                            {appointments
                              .filter((a) => a.status === 'completed')
                              .reduce((sum, a) => {
                                const eff = typeof a.actualAmountCollected === 'number' ? a.actualAmountCollected : (a.servicePrice || 0);
                                return sum + eff;
                              }, 0)}
                          </span>
                        </div>
                        <div className="text-right border-l border-blue-200 dark:border-blue-800/60 pl-4">
                          <span className="text-[10px] uppercase font-semibold text-blue-600 dark:text-blue-400 block">
                            Services Completed
                          </span>
                          <span className="text-xl font-bold font-serif text-blue-900 dark:text-white tabular-nums">
                            {appointments.filter((a) => a.status === 'completed').length}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* MOBILE VIEW: RIGHT-TO-LEFT SCROLLING BOOKINGS SYSTEM (ONLY FOR MOBILE VIEW) */}
                  <div className="block md:hidden">
                    {(() => {
                      const mobileFilteredAppointments = appointments
                        .filter((a) => {
                          const matchesStatus =
                            appointmentFilterStatus === 'all' || a.status === appointmentFilterStatus;
                          const matchesDate = !appointmentFilterDate || a.date === appointmentFilterDate;
                          const matchesQuery =
                            !appointmentSearch ||
                            a.customerName.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
                            a.customerPhone.includes(appointmentSearch) ||
                            a.bookingNumber.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
                            a.serviceName.toLowerCase().includes(appointmentSearch.toLowerCase());
                          return matchesStatus && matchesDate && matchesQuery;
                        })
                        .sort((a, b) => {
                          const timeA = new Date(a.createdAt || `${a.date}T${a.time}:00`).getTime();
                          const timeB = new Date(b.createdAt || `${b.date}T${b.time}:00`).getTime();
                          return timeB - timeA;
                        });

                      if (mobileFilteredAppointments.length === 0) {
                        return (
                          <div className="p-8 text-center bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-2xl text-xs text-[#79746D] dark:text-gray-400">
                            <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-[#C29F67]/60" />
                            <p className="font-semibold text-sm text-[#1C1B1A] dark:text-white mb-1">No Bookings Found</p>
                            <p className="text-[11px]">No bookings match your current filter or search criteria.</p>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          {/* Mobile Right-to-Left Scroll Indicator Banner */}
                          <div className="flex items-center justify-between text-[11px] text-[#9C753D] dark:text-[#C29F67] px-1 font-bold">
                            <span className="flex items-center gap-1.5">
                              <ArrowLeftRight className="w-3.5 h-3.5 text-[#C29F67]" />
                              <span>Scroll Right to Left to browse bookings</span>
                            </span>
                            <span className="text-[10px] bg-[#9C753D]/10 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold">
                              {mobileFilteredAppointments.length} bookings
                            </span>
                          </div>

                          {adminBookingsMobileLayout === 'horizontal' ? (
                            /* HORIZONTAL RIGHT-TO-LEFT SCROLL CAROUSEL WITH SCROLLBAR */
                            <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 snap-x snap-mandatory scroll-smooth touch-pan-x mobile-scrollbar [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#E6D4BA]/30 dark:[&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#C29F67] [&::-webkit-scrollbar-thumb]:rounded-full">
                              {mobileFilteredAppointments.map((appt) => (
                                <div
                                  key={appt.id}
                                  className="w-[285px] shrink-0 snap-start bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/90 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-md hover:border-[#C29F67] transition-all text-xs"
                                >
                                  <div className="space-y-3">
                                    {/* Top Row: Ref # and Status */}
                                    <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
                                      <span className="font-mono font-bold text-xs text-[#1C1B1A] dark:text-white bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                                        #{appt.bookingNumber}
                                      </span>
                                      <span
                                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                          appt.status === 'confirmed'
                                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                            : appt.status === 'postponed'
                                            ? 'bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300'
                                            : appt.status === 'completed'
                                            ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                                            : appt.status === 'cancelled'
                                            ? 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                                            : appt.status === 'no-show'
                                            ? 'bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300'
                                            : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                        }`}
                                      >
                                        {appt.status}
                                      </span>
                                    </div>

                                    {/* Client Details */}
                                    <div>
                                      <h4 className="font-serif font-bold text-sm text-[#1C1B1A] dark:text-white leading-tight">
                                        {appt.customerName}
                                      </h4>
                                      <a
                                        href={`tel:${appt.customerPhone}`}
                                        className="inline-flex items-center gap-1.5 text-xs text-[#9C753D] dark:text-[#C29F67] hover:underline font-semibold mt-0.5"
                                      >
                                        <Phone className="w-3 h-3" />
                                        <span>{appt.customerPhone}</span>
                                      </a>
                                    </div>

                                    {/* Service & Stylist */}
                                    <div className="p-2.5 bg-[#FAF7F2] dark:bg-white/5 rounded-xl border border-[#E6D4BA]/40 dark:border-white/10 space-y-1">
                                      <div className="font-semibold text-xs text-[#1C1B1A] dark:text-white">
                                        {appt.serviceName}
                                      </div>
                                      <div className="flex items-center justify-between text-[11px] text-[#79746D] dark:text-gray-400">
                                        <span>{appt.stylistName || 'Any Specialist'}</span>
                                        <span>{appt.serviceDuration} mins</span>
                                      </div>
                                    </div>

                                    {/* Appointment Schedule & Exact IST Booking Timestamp */}
                                    <div className="space-y-1 text-[11px]">
                                      <div className="flex items-center gap-1.5 font-bold text-[#1C1B1A] dark:text-white">
                                        <CalendarIcon className="w-3.5 h-3.5 text-[#C29F67]" />
                                        <span>{formatDateIST(appt.date)} · {formatTimeRange12(appt.time, appt.endTime)}</span>
                                      </div>
                                      <div
                                        className="text-[10px] text-amber-800 dark:text-amber-400 font-medium pl-5"
                                        title="Exact server booking creation timestamp in Indian Standard Time (IST)"
                                      >
                                        🕒 Booked: {formatTimestampIST(appt.createdAt) || appt.createdAtIST || 'N/A'}
                                      </div>
                                    </div>

                                    {/* Pricing & Actual Collected Amount */}
                                    <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs">
                                      <div>
                                        <div className={`font-semibold ${appt.status === 'completed' && appt.actualAmountCollected !== undefined ? 'text-gray-400 line-through text-[11px]' : 'text-[#1C1B1A] dark:text-white'}`}>
                                          Listed: ₹{appt.servicePrice}
                                        </div>
                                        {appt.status === 'completed' ? (
                                          <div className="mt-0.5">
                                            <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200 dark:border-emerald-800">
                                              Paid: ₹{appt.actualAmountCollected !== undefined ? appt.actualAmountCollected : appt.servicePrice}
                                            </span>
                                            {appt.actualAmountCollected !== undefined && appt.actualAmountCollected < appt.servicePrice && (
                                              <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                                Saved ₹{appt.servicePrice - appt.actualAmountCollected}
                                              </span>
                                            )}
                                          </div>
                                        ) : (
                                          <span className="text-[10px] text-gray-400 block mt-0.5">Payment pending</span>
                                        )}
                                      </div>
                                      {appt.status === 'completed' && (
                                        <button
                                          type="button"
                                          onClick={() => handleInitiateCompleteAppointment(appt)}
                                          className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline font-bold cursor-pointer"
                                        >
                                          Correct Amt
                                        </button>
                                      )}
                                    </div>

                                    {/* Cancellation Details if Cancelled */}
                                    {appt.status === 'cancelled' && (
                                      <div className="p-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg text-[10px] text-red-700 dark:text-red-300">
                                        <span className="font-bold">Cancelled {appt.cancelledBy ? `by ${appt.cancelledBy === 'customer' ? 'Customer' : 'Admin'}` : ''}:</span>{' '}
                                        <span>"{appt.cancellationReason || 'No reason provided'}"</span>
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions Bar */}
                                  <div className="pt-3 border-t border-gray-100 dark:border-white/10 mt-3 flex items-center justify-between gap-1">
                                    <div className="flex items-center gap-1">
                                      {appt.status === 'pending' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateAppointmentStatus(appt.id, 'confirmed')}
                                            className="p-2 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                            title="Confirm Booking"
                                          >
                                            <Check className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateAppointmentStatus(appt.id, 'rejected')}
                                            className="p-2 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                                            title="Decline Booking"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                      {appt.status === 'confirmed' && (
                                        <>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateAppointmentStatus(appt.id, 'completed')}
                                            className="p-2 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                            title="Mark as Completed"
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleUpdateAppointmentStatus(appt.id, 'cancelled')}
                                            className="p-2 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer"
                                            title="Cancel Booking"
                                          >
                                            <XCircle className="w-4 h-4" />
                                          </button>
                                        </>
                                      )}
                                      {appt.status === 'completed' && (
                                        <button
                                          type="button"
                                          onClick={() => handleInitiateCompleteAppointment(appt)}
                                          className="p-2 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                                          title="Correct Actual Amount"
                                        >
                                          <Sliders className="w-4 h-4" />
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleOpenWhatsAppModal(appt)}
                                        className="p-2 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-lg transition-colors cursor-pointer"
                                        title="WhatsApp"
                                      >
                                        <MessageCircle className="w-4 h-4 fill-emerald-600/20" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedAppointment(appt)}
                                        className="p-2 text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                                        title="View Details"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </div>

                                    {/* Individual Booking Delete Action */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAppointment(appt.id)}
                                      className="p-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                                      title={`Delete booking #${appt.bookingNumber}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* STACKED LIST VIEW (IF TOGGLED) */
                            <div className="space-y-3">
                              {mobileFilteredAppointments.map((appt) => (
                                <div
                                  key={appt.id}
                                  className="bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/90 dark:border-white/10 rounded-2xl p-4 space-y-3 shadow-xs"
                                >
                                  <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-white/10">
                                    <span className="font-mono font-bold text-xs text-[#1C1B1A] dark:text-white bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-md">
                                      #{appt.bookingNumber}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                        appt.status === 'confirmed'
                                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                          : appt.status === 'postponed'
                                          ? 'bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300'
                                          : appt.status === 'completed'
                                          ? 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                                          : appt.status === 'cancelled'
                                          ? 'bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                                          : appt.status === 'no-show'
                                          ? 'bg-gray-100 dark:bg-white/10 border border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300'
                                          : 'bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                      }`}
                                    >
                                      {appt.status}
                                    </span>
                                  </div>

                                  <div className="flex items-start justify-between">
                                    <div>
                                      <h4 className="font-serif font-bold text-sm text-[#1C1B1A] dark:text-white">
                                        {appt.customerName}
                                      </h4>
                                      <a
                                        href={`tel:${appt.customerPhone}`}
                                        className="inline-flex items-center gap-1.5 text-xs text-[#9C753D] dark:text-[#C29F67] hover:underline font-semibold mt-0.5"
                                      >
                                        <Phone className="w-3 h-3" />
                                        <span>{appt.customerPhone}</span>
                                      </a>
                                    </div>
                                    <div className="text-right">
                                      <div className={`font-semibold text-xs ${appt.status === 'completed' && appt.actualAmountCollected !== undefined ? 'text-gray-400 line-through text-[11px]' : 'text-[#1C1B1A] dark:text-white'}`}>
                                        ₹{appt.servicePrice}
                                      </div>
                                      {appt.status === 'completed' && (
                                        <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-[10px] border border-emerald-200 dark:border-emerald-800 mt-0.5">
                                          Paid: ₹{appt.actualAmountCollected !== undefined ? appt.actualAmountCollected : appt.servicePrice}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="p-2 bg-[#FAF7F2] dark:bg-white/5 rounded-xl border border-[#E6D4BA]/40 dark:border-white/10 flex items-center justify-between text-[11px]">
                                    <span className="font-medium text-[#1C1B1A] dark:text-white">{appt.serviceName}</span>
                                    <span className="text-[#79746D] dark:text-gray-400">{appt.stylistName || 'Specialist'}</span>
                                  </div>

                                  <div className="space-y-0.5 text-[11px]">
                                    <div className="flex items-center gap-1.5 font-bold text-[#1C1B1A] dark:text-white">
                                      <CalendarIcon className="w-3.5 h-3.5 text-[#C29F67]" />
                                      <span>{formatDateIST(appt.date)} · {formatTimeRange12(appt.time, appt.endTime)}</span>
                                    </div>
                                    <div className="text-[10px] text-amber-800 dark:text-amber-400 pl-5">
                                      🕒 Booked: {formatTimestampIST(appt.createdAt) || appt.createdAtIST || 'N/A'}
                                    </div>
                                  </div>

                                  <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => handleOpenWhatsAppModal(appt)}
                                        className="p-1.5 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg"
                                      >
                                        <MessageCircle className="w-4 h-4 fill-emerald-600/20" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setSelectedAppointment(appt)}
                                        className="p-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAppointment(appt.id)}
                                      className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* DESKTOP VIEW: APPOINTMENTS TABLE (ONLY FOR DESKTOP VIEW, HIDDEN ON MOBILE) */}
                  <div className="hidden md:block bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF7F2] dark:bg-white/5 border-b border-[#E6D4BA]/40 dark:border-white/10 text-[#79746D] dark:text-gray-400 text-[11px]">
                          <tr>
                            <th className="py-3 px-4 font-semibold">Ref #</th>
                            <th className="py-3 px-4 font-semibold">Customer</th>
                            <th className="py-3 px-4 font-semibold">Phone</th>
                            <th className="py-3 px-4 font-semibold">Service</th>
                            <th className="py-3 px-4 font-semibold">Schedule</th>
                            <th className="py-3 px-4 font-semibold">Price</th>
                            <th className="py-3 px-4 font-semibold">Status</th>
                            <th className="py-3 px-4 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                          {(() => {
                            const desktopFiltered = appointments
                              .filter((a) => {
                                const matchesStatus =
                                  appointmentFilterStatus === 'all' || a.status === appointmentFilterStatus;
                                const matchesDate = !appointmentFilterDate || a.date === appointmentFilterDate;
                                const matchesQuery =
                                  !appointmentSearch ||
                                  a.customerName.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
                                  a.customerPhone.includes(appointmentSearch) ||
                                  a.bookingNumber.toLowerCase().includes(appointmentSearch.toLowerCase()) ||
                                  a.serviceName.toLowerCase().includes(appointmentSearch.toLowerCase());
                                return matchesStatus && matchesDate && matchesQuery;
                              })
                              .sort((a, b) => {
                                const timeA = new Date(a.createdAt || `${a.date}T${a.time}:00`).getTime();
                                const timeB = new Date(b.createdAt || `${b.date}T${b.time}:00`).getTime();
                                return timeB - timeA;
                              });

                            if (desktopFiltered.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={8} className="py-12 text-center text-xs text-[#79746D] dark:text-gray-400">
                                    <CalendarIcon className="w-8 h-8 mx-auto mb-2 text-[#C29F67]/60" />
                                    <p className="font-semibold text-sm text-[#1C1B1A] dark:text-white mb-0.5">No Bookings Found</p>
                                    <p className="text-[11px]">No bookings match your current filter or search criteria.</p>
                                  </td>
                                </tr>
                              );
                            }

                            // Count total bookings per creation date key for group badges
                            const dateCountMap = new Map<string, number>();
                            desktopFiltered.forEach((a) => {
                              const raw = a.createdAt || `${a.date}T${a.time}:00`;
                              const d = new Date(raw);
                              const validD = isNaN(d.getTime()) ? new Date() : d;
                              const key = `${validD.getFullYear()}-${String(validD.getMonth() + 1).padStart(2, '0')}-${String(validD.getDate()).padStart(2, '0')}`;
                              dateCountMap.set(key, (dateCountMap.get(key) || 0) + 1);
                            });

                            let lastGroupKey = '';

                            return desktopFiltered.map((appt) => {
                              const raw = appt.createdAt || `${appt.date}T${appt.time}:00`;
                              const d = new Date(raw);
                              const validD = isNaN(d.getTime()) ? new Date() : d;
                              const dateKey = `${validD.getFullYear()}-${String(validD.getMonth() + 1).padStart(2, '0')}-${String(validD.getDate()).padStart(2, '0')}`;

                              const isNewGroup = dateKey !== lastGroupKey;
                              if (isNewGroup) {
                                lastGroupKey = dateKey;
                              }

                              const today = new Date();
                              const isToday = today.toDateString() === validD.toDateString();
                              const yest = new Date();
                              yest.setDate(yest.getDate() - 1);
                              const isYesterday = yest.toDateString() === validD.toDateString();
                              const formatted = validD.toLocaleDateString('en-IN', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric'
                              });
                              let displayDate = formatted;
                              if (isToday) displayDate = `Today — ${formatted}`;
                              else if (isYesterday) displayDate = `Yesterday — ${formatted}`;

                              const groupTotal = dateCountMap.get(dateKey) || 1;

                              return (
                                <React.Fragment key={appt.id}>
                                  {isNewGroup && (
                                    <tr className="bg-[#FAF7F2] dark:bg-white/10 border-t-2 border-b border-[#E6D4BA]/80 dark:border-white/15">
                                      <td colSpan={8} className="py-2.5 px-4">
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-2">
                                            <CalendarIcon className="w-3.5 h-3.5 text-[#C29F67]" />
                                            <span className="font-bold text-xs text-[#1C1B1A] dark:text-white">
                                              📅 Booked on: {displayDate}
                                            </span>
                                          </div>
                                          <span className="text-[10px] font-bold bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] px-2.5 py-0.5 rounded-full">
                                            {groupTotal} {groupTotal === 1 ? 'Booking' : 'Bookings'}
                                          </span>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="hover:bg-[#FAF7F2] dark:hover:bg-white/10 transition-colors">
                                <td className="py-3 px-4 font-mono font-bold text-[#1C1B1A] dark:text-white">
                                  {appt.bookingNumber}
                                </td>
                                <td className="py-3 px-4 font-medium text-[#1C1B1A] dark:text-white">
                                  {appt.customerName}
                                </td>
                                <td className="py-3 px-4 text-[#79746D] dark:text-gray-300">
                                  <a href={`tel:${appt.customerPhone}`} className="hover:underline">
                                    {appt.customerPhone}
                                  </a>
                                </td>
                                <td className="py-3 px-4 font-medium text-[#1C1B1A] dark:text-white">
                                  {appt.serviceName}
                                </td>
                                <td className="py-3 px-4 text-[#79746D] dark:text-gray-300">
                                  <div className="font-semibold text-[#1C1B1A] dark:text-white whitespace-nowrap">
                                    {formatDateIST(appt.date)} · {formatTimeRange12(appt.time, appt.endTime)}
                                  </div>
                                  <div className="text-[10px] text-amber-700 dark:text-amber-400 font-medium whitespace-nowrap mt-0.5" title="Exact server booking creation timestamp in Indian Standard Time (IST)">
                                    🕒 Booked: {formatTimestampIST(appt.createdAt) || appt.createdAtIST || 'N/A'}
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  <div className={`font-semibold tabular-nums text-xs ${appt.status === 'completed' && appt.actualAmountCollected !== undefined ? 'text-gray-400 dark:text-gray-500 line-through text-[11px]' : 'text-[#1C1B1A] dark:text-white'}`}>
                                    Listed: ₹{appt.servicePrice}
                                  </div>
                                  {appt.status === 'completed' ? (
                                    <div className="mt-0.5">
                                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded text-[11px] border border-emerald-200 dark:border-emerald-800">
                                        Paid: ₹{appt.actualAmountCollected !== undefined ? appt.actualAmountCollected : appt.servicePrice}
                                      </span>
                                      {appt.actualAmountCollected !== undefined && appt.actualAmountCollected < appt.servicePrice && (
                                        <span className="block text-[9px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                                          Saved ₹{appt.servicePrice - appt.actualAmountCollected}
                                        </span>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => handleInitiateCompleteAppointment(appt)}
                                        className="text-[9px] text-blue-600 dark:text-blue-400 hover:underline block mt-0.5 cursor-pointer font-medium"
                                        title="Correct or update actual collected amount"
                                      >
                                        Correct Amount
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-gray-400 block mt-0.5">Payment pending</span>
                                  )}
                                </td>
                                <td className="py-3 px-4">
                                  <div className="flex flex-col gap-1">
                                    <select
                                      value={appt.status}
                                      onChange={(e) => handleUpdateAppointmentStatus(appt.id, e.target.value)}
                                      className={`px-2 py-1 rounded text-[11px] font-semibold capitalize outline-hidden border ${
                                        appt.status === 'confirmed'
                                          ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                                          : appt.status === 'postponed'
                                          ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800 text-purple-800 dark:text-purple-300'
                                          : appt.status === 'completed'
                                          ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                                          : appt.status === 'cancelled'
                                          ? 'bg-red-50 dark:bg-red-950/60 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                                          : appt.status === 'no-show'
                                          ? 'bg-gray-100 dark:bg-white/10 border-gray-300 dark:border-white/20 text-gray-700 dark:text-gray-300'
                                          : 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                      }`}
                                    >
                                      <option value="pending">Pending</option>
                                      <option value="confirmed">Confirmed</option>
                                      <option value="postponed">Postponed</option>
                                      <option value="completed">Completed</option>
                                      <option value="cancelled">Cancelled</option>
                                      <option value="no-show">No-Show</option>
                                    </select>
                                    {appt.status === 'cancelled' && (
                                      <span
                                        className="text-[10px] text-red-600 dark:text-red-400 font-medium truncate max-w-[140px]"
                                        title={appt.cancellationReason || 'Cancelled'}
                                      >
                                        {appt.cancelledBy ? `by ${appt.cancelledBy === 'customer' ? 'Customer' : 'Admin'}` : ''}
                                        {appt.cancellationReason ? `: "${appt.cancellationReason}"` : ''}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <div className="flex items-center justify-end gap-1">
                                    {/* Direct Status Actions for Authorized Admins */}
                                    {appt.status === 'pending' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateAppointmentStatus(appt.id, 'confirmed')}
                                          className="p-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                          title="Confirm Booking"
                                        >
                                          <Check className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateAppointmentStatus(appt.id, 'rejected')}
                                          className="p-1.5 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                          title="Decline / Reject Booking"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}
                                    {appt.status === 'confirmed' && (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateAppointmentStatus(appt.id, 'completed')}
                                          className="p-1.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                          title="Mark as Completed"
                                        >
                                          <CheckCircle className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleUpdateAppointmentStatus(appt.id, 'cancelled')}
                                          className="p-1.5 text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                          title="Cancel Booking & Release Slot"
                                        >
                                          <XCircle className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}

                                    {appt.status === 'completed' && (
                                      <button
                                        type="button"
                                        onClick={() => handleInitiateCompleteAppointment(appt)}
                                        className="p-1.5 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                        title="Correct Actual Amount Collected"
                                      >
                                        <Sliders className="w-3.5 h-3.5" />
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleOpenWhatsAppModal(appt)}
                                      className="p-1.5 text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                      title="Send Custom Booking Card via WhatsApp from Admin's number"
                                    >
                                      <MessageCircle className="w-4 h-4 fill-emerald-600/20" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAppointment(appt)}
                                      className="p-1.5 text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white rounded-md hover:bg-gray-100 dark:hover:bg-white/10 transition-colors inline-flex items-center cursor-pointer"
                                      title="View full details and notes"
                                    >
                                      <Eye className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteAppointment(appt.id)}
                                      className="p-1.5 text-red-600 dark:text-red-400 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors cursor-pointer inline-flex items-center"
                                      title={`Permanently delete booking #${appt.bookingNumber}`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: SERVICES MANAGEMENT */}
              {activeTab === 'services' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-xl font-serif font-bold text-[#1C1B1A] dark:text-white">Service Catalogue Management</h3>
                      <p className="text-xs text-[#79746D] dark:text-gray-400">
                        Configure treatments, pricing (₹), durations, categories, photos, and live availability.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-start sm:self-auto">
                      {/* Mobile layout toggle: Horizontal Right-to-Left scroll vs Grid */}
                      <div className="flex md:hidden items-center border border-[#E6D4BA]/80 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 p-0.5">
                        <button
                          type="button"
                          onClick={() => setAdminServicesMobileLayout('horizontal')}
                          className={`p-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                            adminServicesMobileLayout === 'horizontal'
                              ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] font-bold'
                              : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white'
                          }`}
                          title="Swipe right-to-left"
                        >
                          <ArrowLeftRight className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Swipe</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdminServicesMobileLayout('grid')}
                          className={`p-1.5 rounded text-xs transition-colors cursor-pointer flex items-center gap-1 ${
                            adminServicesMobileLayout === 'grid'
                              ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] font-bold'
                              : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white'
                          }`}
                          title="Grid view"
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span className="text-[10px]">Grid</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setEditingService({
                            categoryId: categories[0]?.id || 'cat_hair',
                            name: '',
                            description: '',
                            price: 300,
                            durationMinutes: 30,
                            isActive: true,
                            isFeatured: false
                          })
                        }
                        className="px-4 py-2 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#C29F67] dark:text-[#1C1B1A]" />
                        <span>Add New Service</span>
                      </button>
                    </div>
                  </div>

                  {/* Horizontal Scrollable Category Filter on Mobile & Desktop */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar border-b border-[#E6D4BA]/40 dark:border-white/10">
                    <button
                      type="button"
                      onClick={() => setServiceCategoryFilter('all')}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                        serviceCategoryFilter === 'all'
                          ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] shadow-xs'
                          : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white'
                      }`}
                    >
                      All Services ({services.length})
                    </button>
                    {categories.map((c) => {
                      const count = services.filter((s) => s.categoryId === c.id).length;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setServiceCategoryFilter(c.id)}
                          className={`px-3 py-1.5 text-xs font-bold rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
                            serviceCategoryFilter === c.id
                              ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] shadow-xs'
                              : 'bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white'
                          }`}
                        >
                          {c.name} ({count})
                        </button>
                      );
                    })}
                  </div>

                  {/* MOBILE VIEW: HORIZONTAL RIGHT-TO-LEFT CAROUSEL OR GRID */}
                  <div className="block md:hidden">
                    {adminServicesMobileLayout === 'horizontal' ? (
                      <div>
                        <div className="flex items-center justify-between text-[11px] text-[#9C753D] dark:text-[#C29F67] mb-2 px-1 font-bold">
                          <span className="flex items-center gap-1.5">
                            <ArrowLeftRight className="w-3.5 h-3.5 text-[#C29F67]" />
                            <span>Scroll Right to Left to view & edit treatments</span>
                          </span>
                          <span className="text-[10px] bg-[#9C753D]/10 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold">
                            {services.filter((s) => serviceCategoryFilter === 'all' || s.categoryId === serviceCategoryFilter).length} services
                          </span>
                        </div>

                        <div className="flex gap-3 overflow-x-auto pb-4 pt-1 px-1 snap-x snap-mandatory scroll-smooth touch-pan-x mobile-scrollbar [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#E6D4BA]/30 dark:[&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#C29F67] [&::-webkit-scrollbar-thumb]:rounded-full">
                          {services
                            .filter((s) => serviceCategoryFilter === 'all' || s.categoryId === serviceCategoryFilter)
                            .map((service) => (
                              <div
                                key={service.id}
                                className="w-[230px] shrink-0 snap-start bg-white dark:bg-white/5 border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl p-3 flex flex-col justify-between shadow-xs hover:border-[#C29F67] transition-all"
                              >
                                <div>
                                  {/* Service Thumbnail */}
                                  <div className="relative aspect-[16/10] h-24 rounded-xl overflow-hidden mb-2 bg-gray-100 dark:bg-gray-800">
                                    <img
                                      src={service.imageUrl || '/assets/images/salon_hair_styling_1790779479714.jpg'}
                                      alt={service.name}
                                      className="w-full h-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = '/assets/images/salon_hair_styling_1790779479714.jpg';
                                      }}
                                    />
                                    <span
                                      className={`absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold ${
                                        service.isActive
                                          ? 'bg-emerald-600 text-white shadow-xs'
                                          : 'bg-gray-800 text-gray-200'
                                      }`}
                                    >
                                      {service.isActive ? 'Active' : 'Inactive'}
                                    </span>
                                  </div>

                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <h4 className="font-bold text-xs text-[#1C1B1A] dark:text-white line-clamp-1">
                                      {service.name}
                                    </h4>
                                    <span className="font-bold text-xs text-[#9C753D] dark:text-[#C29F67] shrink-0 tabular-nums">
                                      ₹{service.price}
                                    </span>
                                  </div>

                                  <p className="text-[10px] text-[#79746D] dark:text-gray-400 line-clamp-2 mb-2 leading-tight">
                                    {service.description}
                                  </p>

                                  <div className="flex items-center gap-2 text-[10px] text-[#79746D] dark:text-gray-400 mb-2 font-medium">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-[#9C753D] dark:text-[#C29F67]" />
                                      {service.durationMinutes}m
                                    </span>
                                    <span>·</span>
                                    <span className="truncate">{categories.find((c) => c.id === service.categoryId)?.name}</span>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setEditingService(service)}
                                    className="flex-1 py-1.5 px-2 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] text-white dark:text-[#1C1B1A] text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                    <span>Edit Service</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteService(service.id)}
                                    className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg cursor-pointer transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    ) : (
                      /* Mobile 2-column Grid */
                      <div className="grid grid-cols-2 gap-2.5">
                        {services
                          .filter((s) => serviceCategoryFilter === 'all' || s.categoryId === serviceCategoryFilter)
                          .map((service) => (
                            <div
                              key={service.id}
                              className="bg-white dark:bg-white/5 border border-[#E6D4BA]/70 dark:border-white/10 rounded-xl p-2.5 flex flex-col justify-between shadow-2xs"
                            >
                              <div>
                                <div className="relative aspect-[16/10] h-20 rounded-lg overflow-hidden mb-2 bg-gray-100 dark:bg-gray-800">
                                  <img
                                    src={service.imageUrl || '/assets/images/salon_hair_styling_1790779479714.jpg'}
                                    alt={service.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <h4 className="font-bold text-xs text-[#1C1B1A] dark:text-white line-clamp-1 mb-0.5">
                                  {service.name}
                                </h4>
                                <span className="font-bold text-xs text-[#9C753D] dark:text-[#C29F67] tabular-nums block mb-1">
                                  ₹{service.price} · {service.durationMinutes}m
                                </span>
                              </div>

                              <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setEditingService(service)}
                                  className="flex-1 py-1.5 bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] text-[10px] font-bold rounded-md flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteService(service.id)}
                                  className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md cursor-pointer"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  {/* DESKTOP VIEW: LUXURY 3-COLUMN EDITORIAL SERVICE CARDS */}
                  <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {services
                      .filter((s) => serviceCategoryFilter === 'all' || s.categoryId === serviceCategoryFilter)
                      .map((service) => (
                      <div
                        key={service.id}
                        className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-2xl p-4 flex flex-col justify-between shadow-xs hover:border-[#C29F67] transition-all group"
                      >
                        <div>
                          <div className="flex items-start gap-3 mb-3">
                            <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shrink-0 border border-gray-200 dark:border-white/10">
                              <img
                                src={service.imageUrl || '/assets/images/salon_hair_styling_1790779479714.jpg'}
                                alt={service.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = '/assets/images/salon_hair_styling_1790779479714.jpg';
                                }}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-1">
                                <h4 className="font-bold text-sm text-[#1C1B1A] dark:text-white truncate">
                                  {service.name}
                                </h4>
                                <span className="font-bold text-sm text-[#1C1B1A] dark:text-white tabular-nums shrink-0">
                                  ₹{service.price}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-[#79746D] dark:text-gray-400 mt-1 font-medium">
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                                  {service.durationMinutes} mins
                                </span>
                                <span>·</span>
                                <span className="truncate">{categories.find((c) => c.id === service.categoryId)?.name}</span>
                              </div>
                            </div>
                          </div>

                          <p className="text-xs text-[#79746D] dark:text-gray-300 line-clamp-2 mb-3">
                            {service.description}
                          </p>
                        </div>

                        <div className="pt-3 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs">
                          <span
                            className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                              service.isActive ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300' : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                            }`}
                          >
                            {service.isActive ? 'Active' : 'Inactive'}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingService(service)}
                              className="px-3 py-1.5 bg-[#FAF7F2] dark:bg-white/10 hover:bg-[#1C1B1A] hover:text-white dark:hover:bg-[#C29F67] dark:hover:text-[#1C1B1A] text-[#1C1B1A] dark:text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 font-bold text-xs shadow-2xs"
                              title="Edit service details"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit Details</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteService(service.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                              title="Delete service"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB: STAFF & STYLISTS MANAGEMENT */}
              {activeTab === 'staff' && (
                <div className="space-y-6">
                  {/* Top Header */}
                  <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/70 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#C29F67]/20 text-[#9C753D] dark:text-[#E6D4BA]">
                          Team & Specialists Directory
                        </span>
                        <h3 className="text-xl font-serif text-[#1C1B1A] dark:text-white font-bold">
                          Staff, Stylists & Specialists
                        </h3>
                      </div>
                      <p className="text-xs text-[#79746D] dark:text-gray-300 mt-1 max-w-2xl">
                        Manage your hairdressers and beauty specialists. Customers can pick their preferred stylist (e.g. Master Stylist, Colorist, Bridal Specialist) during booking. All profile edits and photos are backed up securely to Supabase.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStaff({
                            name: '',
                            role: 'Senior Hair Stylist',
                            specialties: ['Haircut', 'Styling', 'Hair Spa'],
                            experienceYears: 5,
                            rating: 4.9,
                            bio: '',
                            imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
                            phone: settings?.phone || '+91 91316 29031',
                            isActive: true
                          });
                          setIsNewStaffModal(true);
                        }}
                        className="px-4 py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add New Staff Member</span>
                      </button>
                      <button
                        type="button"
                        onClick={loadAllAdminData}
                        className="p-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-[#1C1B1A] dark:text-white rounded-xl transition-colors cursor-pointer"
                        title="Refresh Staff List"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Metrics Bar */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#C29F67]/15 text-[#9C753D] dark:text-[#E6D4BA] flex items-center justify-center font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#79746D] dark:text-gray-400 uppercase font-bold tracking-wider">Total Staff</p>
                        <p className="text-lg font-bold text-[#1C1B1A] dark:text-white font-serif">{staffMembers.length}</p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                        <CheckCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#79746D] dark:text-gray-400 uppercase font-bold tracking-wider">Active for Booking</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400 font-serif">
                          {staffMembers.filter((s) => s.isActive).length}
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                        <Star className="w-5 h-5 fill-amber-500 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#79746D] dark:text-gray-400 uppercase font-bold tracking-wider">Avg Rating</p>
                        <p className="text-lg font-bold text-amber-600 dark:text-amber-400 font-serif">
                          {staffMembers.length > 0
                            ? (staffMembers.reduce((acc, s) => acc + (s.rating || 5), 0) / staffMembers.length).toFixed(1)
                            : '5.0'} ★
                        </p>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-xl p-3.5 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] text-[#79746D] dark:text-gray-400 uppercase font-bold tracking-wider">Cloud Status</p>
                        <p className="text-xs font-bold text-purple-700 dark:text-purple-300">
                          Synced Supabase
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Search and Filters */}
                  <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between bg-white dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/10">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={staffSearch}
                        onChange={(e) => setStaffSearch(e.target.value)}
                        placeholder="Search stylist by name, designation, or specialty..."
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white placeholder-gray-400"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={staffRoleFilter}
                        onChange={(e) => setStaffRoleFilter(e.target.value)}
                        className="px-3 py-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white cursor-pointer"
                      >
                        <option value="all">All Statuses & Roles</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                      </select>
                    </div>
                  </div>

                  {/* Staff Cards Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                    {staffMembers
                      .filter((s) => {
                        if (staffRoleFilter === 'active' && !s.isActive) return false;
                        if (staffRoleFilter === 'inactive' && s.isActive) return false;
                        if (!staffSearch.trim()) return true;
                        const query = staffSearch.toLowerCase();
                        return (
                          s.name.toLowerCase().includes(query) ||
                          s.role.toLowerCase().includes(query) ||
                          (s.specialties && s.specialties.some((spec) => spec.toLowerCase().includes(query)))
                        );
                      })
                      .map((staff) => (
                        <div
                          key={staff.id}
                          className="bg-white dark:bg-white/5 border border-[#E6D4BA]/70 dark:border-white/10 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-[#C29F67] transition-all flex flex-col justify-between gap-4"
                        >
                          <div>
                            {/* Card Top: Photo + Badges + Toggle */}
                            <div className="flex items-start gap-3.5">
                              <div className="relative group shrink-0">
                                <img
                                  src={staff.imageUrl}
                                  alt={staff.name}
                                  onError={(e: any) => {
                                    e.currentTarget.src =
                                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80';
                                  }}
                                  className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#C29F67]/30 group-hover:border-[#C29F67] shadow-sm transition-all"
                                />
                                <label
                                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 rounded-2xl flex flex-col items-center justify-center text-white cursor-pointer transition-opacity text-[10px] font-bold p-1 text-center"
                                  title="Quick Upload Photo"
                                >
                                  <Camera className="w-4 h-4 mb-0.5" />
                                  <span>Change</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        setEditingStaff(staff);
                                        handleStaffPhotoUpload(file);
                                      }
                                    }}
                                  />
                                </label>
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-1.5">
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                        staff.isActive
                                          ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                                          : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-gray-400'
                                      }`}
                                    >
                                      {staff.isActive ? '● Accepting Bookings' : '○ Hidden from Bookings'}
                                    </span>
                                    <span className="text-[10px] font-semibold bg-[#C29F67]/15 text-[#9C753D] dark:text-[#E6D4BA] px-1.5 py-0.5 rounded-md">
                                      {staff.experienceYears} Yrs Exp
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.5 rounded-md text-amber-700 dark:text-amber-300 text-xs font-bold shrink-0">
                                    <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    <span>{staff.rating.toFixed(1)}</span>
                                  </div>
                                </div>

                                <h4 className="text-base sm:text-lg font-serif font-bold text-[#1C1B1A] dark:text-white mt-1 truncate">
                                  {staff.name}
                                </h4>

                                <p className="text-xs font-semibold text-[#9C753D] dark:text-[#C29F67] truncate">
                                  {staff.role}
                                </p>

                                {staff.phone && (
                                  <p className="text-[11px] text-[#79746D] dark:text-gray-300 flex items-center gap-1 mt-0.5">
                                    <Phone className="w-3 h-3 text-[#C29F67]" />
                                    <span>{staff.phone}</span>
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Bio Description */}
                            {staff.bio && (
                              <p className="text-xs text-[#79746D] dark:text-gray-300 mt-3 line-clamp-2 leading-relaxed">
                                {staff.bio}
                              </p>
                            )}

                            {/* Specialties Pills */}
                            {staff.specialties && staff.specialties.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3">
                                {staff.specialties.map((spec, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-2 py-0.5 bg-[#FAF7F2] dark:bg-white/10 text-[#1C1B1A] dark:text-gray-200 border border-[#E6D4BA]/60 dark:border-white/10 rounded-full font-medium"
                                  >
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Card Footer Actions */}
                          <div className="border-t border-gray-100 dark:border-white/10 pt-3 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleStaffActive(staff)}
                              className={`text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors cursor-pointer flex items-center gap-1.5 ${
                                staff.isActive
                                  ? 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 hover:bg-gray-100'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                              }`}
                            >
                              <span>{staff.isActive ? 'Hide from Booking' : 'Enable Booking'}</span>
                            </button>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingStaff(staff);
                                  setIsNewStaffModal(false);
                                }}
                                className="px-3 py-1.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                                <span>Edit Profile</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteStaffMember(staff)}
                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                title="Remove staff member"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {staffMembers.length === 0 && (
                    <div className="p-8 text-center bg-white dark:bg-white/5 border border-dashed border-[#E6D4BA] dark:border-white/10 rounded-2xl">
                      <Users className="w-10 h-10 text-gray-400 mx-auto mb-2" />
                      <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white">No Staff Members Found</h4>
                      <p className="text-xs text-[#79746D] dark:text-gray-400 mt-1">
                        Get started by adding your first hairdresser or specialist!
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingStaff({
                            name: '',
                            role: 'Master Hair Stylist',
                            specialties: ['Haircut', 'Coloring'],
                            experienceYears: 5,
                            rating: 4.9,
                            bio: '',
                            imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
                            phone: '+91 91316 29031',
                            isActive: true
                          });
                          setIsNewStaffModal(true);
                        }}
                        className="mt-3 px-4 py-2 bg-[#C29F67] text-white text-xs font-bold rounded-lg cursor-pointer"
                      >
                        + Add Staff Member
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB: MEDIA & PHOTOS MANAGEMENT */}
              {activeTab === 'media' && (
                <div className="space-y-8">
                  {/* Top Header */}
                  <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/70 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#C29F67]/20 text-[#9C753D] dark:text-[#E6D4BA]">
                          Visuals & Copy Studio
                        </span>
                        <h3 className="text-xl font-serif text-[#1C1B1A] dark:text-white font-bold">
                          Media, Photos & Content Management
                        </h3>
                      </div>
                      <p className="text-xs text-[#79746D] dark:text-gray-300 mt-1">
                        Easily change photos and customer-facing text across all sections: Hero Banners, Service Cards, Salon Gallery, and Website Text.
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-xs shrink-0">
                        <Camera className="w-4 h-4 text-[#C29F67] dark:text-[#1C1B1A]" />
                        <span>{uploadingMedia ? 'Uploading...' : 'Upload Photo from Device'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          disabled={uploadingMedia}
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Section Switcher Tabs / Navigator */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-[#E6D4BA]/50 dark:border-white/10">
                    {[
                      { id: 'all', label: '🌟 All Sections', count: null },
                      { id: 'hero', label: '🖼️ Hero Banners (Main & 2nd)', count: '2 Banners' },
                      { id: 'services', label: '✂️ Service Photos & Names', count: `${services.length} Services` },
                      { id: 'gallery', label: '📷 The Salon Gallery', count: `${gallery.length} Photos` },
                      { id: 'text', label: '✍️ Website Text Studio', count: 'All Copy' },
                      { id: 'library', label: '📁 Uploaded Library', count: `${uploadedMediaList.length} Files` }
                    ].map((tab) => {
                      const isActive = mediaActiveSection === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setMediaActiveSection(tab.id as any)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
                            isActive
                              ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] shadow-xs'
                              : 'bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white'
                          }`}
                        >
                          <span>{tab.label}</span>
                          {tab.count && (
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full font-normal ${
                                isActive
                                  ? 'bg-white/20 text-white dark:text-[#1C1B1A]'
                                  : 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {tab.count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* ============================================================== */}
                  {/* SECTION 1: HERO BANNER PHOTOS (MAIN HERO & SECOND HERO BANNER) */}
                  {/* ============================================================== */}
                  {(mediaActiveSection === 'all' || mediaActiveSection === 'hero') && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between border-b border-[#E6D4BA]/60 dark:border-white/10 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#C29F67]" />
                            <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                              Section 1: Hero Banners & Big Displays (Main & 2nd Hero)
                            </h4>
                          </div>
                          <p className="text-xs text-[#79746D] dark:text-gray-400 mt-0.5">
                            Manage the two prominent large banners shown to customers on the homepage.
                          </p>
                        </div>
                      </div>

                      {/* 1A. MAIN HERO BANNER (TOP OF HOMEPAGE) */}
                      <div className="bg-white dark:bg-white/5 border-2 border-[#C29F67]/60 dark:border-[#C29F67]/40 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6D4BA]/40 dark:border-white/10 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-[#C29F67]/20 text-[#9C753D] dark:text-[#E6D4BA]">
                                Homepage Header (Top of Website)
                              </span>
                              <h5 className="text-base font-serif font-black text-[#1C1B1A] dark:text-white">
                                1. Main Hero Banner Photo
                              </h5>
                            </div>
                            <p className="text-xs text-[#79746D] dark:text-gray-300 mt-1">
                              <strong>Customer View Name:</strong> Top Hero Showcase (Interior & Styling Stations). Displayed at the very top of your salon's website.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={handleResetHeroBanner}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-[#1C1B1A] dark:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                          >
                            Reset to Default
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                          <div className="md:col-span-5 relative aspect-[16/10] rounded-xl overflow-hidden border border-[#E6D4BA]/80 dark:border-white/10 bg-gray-100 dark:bg-white/5 shadow-inner group">
                            <img
                              src={settings?.heroBannerUrl || '/assets/images/hero_salon_interior_1790779465939.jpg'}
                              alt="Active Main Hero Banner"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                              <Sparkles className="w-3 h-3 text-[#C29F67]" />
                              <span>Active Main Hero Banner</span>
                            </div>
                          </div>

                          <div className="md:col-span-7 space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                                  Replace Photo from Device:
                                </label>
                                <label className="w-full py-2.5 px-3 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs">
                                  <Upload className="w-4 h-4 text-[#C29F67] dark:text-[#1C1B1A]" />
                                  <span>{uploadingMedia ? 'Uploading...' : 'Upload & Set Main Hero'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingMedia}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setUploadingMedia(true);
                                      const reader = new FileReader();
                                      reader.onload = async () => {
                                        try {
                                          const base64 = reader.result as string;
                                          const res = await api.uploadAdminMedia(base64, file.name || 'main-hero.jpg');
                                          await handleSetHeroBanner(res.url);
                                        } catch (err: any) {
                                          showSuccessModal('Upload Failed', err.message || 'Failed to upload photo');
                                        } finally {
                                          setUploadingMedia(false);
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              <div>
                                <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                                  Or Custom Web Image URL:
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="url"
                                    placeholder="https://..."
                                    defaultValue={settings?.heroBannerUrl || ''}
                                    id="main-hero-url-input"
                                    className="flex-1 px-3 py-2 bg-[#FAF7F2] dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById('main-hero-url-input') as HTMLInputElement;
                                      if (input && input.value.trim()) {
                                        handleSetHeroBanner(input.value.trim());
                                      }
                                    }}
                                    className="px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-[#E6D4BA] dark:border-white/20 text-[#1C1B1A] dark:text-white font-bold rounded-lg hover:bg-[#E6D4BA]/40 cursor-pointer"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Quick Select from Presets & Library */}
                            <div>
                              <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1.5">
                                Quick Select from Salon Photos / Library:
                              </label>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {[
                                  { title: 'Luxury Interior & Stations', url: '/assets/images/hero_salon_interior_1790779465939.jpg' },
                                  { title: 'Styling Workstation', url: '/assets/images/salon_hair_styling_1790779479714.jpg' },
                                  { title: 'Facial Suite', url: '/assets/images/salon_facial_skincare_1790779494754.jpg' },
                                  { title: 'VIP Ambience Lounge', url: '/assets/images/salon_ambience_lounge_1790779524195.jpg' },
                                  { title: 'Bridal Artistry', url: '/assets/images/salon_bridal_makeup_1790779508056.jpg' },
                                  ...uploadedMediaList.map((m) => ({ title: m.name, url: m.url }))
                                ].map((p, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSetHeroBanner(p.url)}
                                    className={`w-14 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition-transform hover:scale-105 cursor-pointer relative ${
                                      settings?.heroBannerUrl === p.url ? 'border-[#C29F67] ring-2 ring-[#C29F67]/50' : 'border-transparent'
                                    }`}
                                    title={`Set "${p.title}" as Main Hero`}
                                  >
                                    <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Edit Customer View Text for Main Hero */}
                            <div className="p-3 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C753D] dark:text-[#C29F67]">
                                Edit Customer-Facing Text on Main Hero:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-medium text-[#79746D] dark:text-gray-400 mb-0.5">Top Badge Text</label>
                                  <input
                                    type="text"
                                    value={settings?.heroBadge || ''}
                                    placeholder="4.9 / 5.0 Google Verified Luxury Sanctuary · Bhopal"
                                    onChange={(e) => settings && setSettings({ ...settings, heroBadge: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded text-xs text-[#1C1B1A] dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-[#79746D] dark:text-gray-400 mb-0.5">Hero Headline / Tagline</label>
                                  <input
                                    type="text"
                                    value={settings?.heroHeadline || settings?.tagline || ''}
                                    placeholder="Premium Grooming & Beauty Sanctuary in Bhopal"
                                    onChange={(e) => settings && setSettings({ ...settings, heroHeadline: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded text-xs text-[#1C1B1A] dark:text-white"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium text-[#79746D] dark:text-gray-400 mb-0.5">Hero Welcome Subtitle Text</label>
                                <textarea
                                  rows={2}
                                  value={settings?.heroSubtitle || ''}
                                  placeholder="Welcome to B&B Family Salon — A serene sanctuary offering precision haircuts, restorative skin therapies..."
                                  onChange={(e) => settings && setSettings({ ...settings, heroSubtitle: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded text-xs text-[#1C1B1A] dark:text-white"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleSaveSettings}
                                className="px-3 py-1.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Main Hero Text</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 1B. SECOND HERO BANNER (MID-PAGE EXPERIENCE & AMBIENCE SHOWCASE) */}
                      <div className="bg-white dark:bg-white/5 border-2 border-[#C29F67]/60 dark:border-[#C29F67]/40 rounded-2xl p-4 sm:p-6 shadow-sm space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6D4BA]/40 dark:border-white/10 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-300">
                                Mid-Page Section ("The B&B Experience")
                              </span>
                              <h5 className="text-base font-serif font-black text-[#1C1B1A] dark:text-white">
                                2. Second Hero Banner Photo
                              </h5>
                            </div>
                            <p className="text-xs text-[#79746D] dark:text-gray-300 mt-1">
                              <strong>Customer View Name:</strong> Second Hero Banner (Lounge Ambience & Sanctuary Experience). Displayed in the center experience section.
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={handleResetSecondHeroBanner}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-[#1C1B1A] dark:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer self-start sm:self-auto"
                          >
                            Reset to Default
                          </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                          <div className="md:col-span-5 relative aspect-[16/10] rounded-xl overflow-hidden border border-[#E6D4BA]/80 dark:border-white/10 bg-gray-100 dark:bg-white/5 shadow-inner group">
                            <img
                              src={settings?.secondHeroBannerUrl || '/assets/images/salon_ambience_lounge_1790779524195.jpg'}
                              alt="Active Second Hero Banner"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            />
                            <div className="absolute top-2 left-2 bg-emerald-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-xs">
                              <Shield className="w-3 h-3 text-[#C29F67]" />
                              <span>Active Second Hero Banner</span>
                            </div>
                          </div>

                          <div className="md:col-span-7 space-y-4 text-xs">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                                  Replace Photo from Device:
                                </label>
                                <label className="w-full py-2.5 px-3 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-xs">
                                  <Upload className="w-4 h-4 text-[#C29F67] dark:text-[#1C1B1A]" />
                                  <span>{uploadingMedia ? 'Uploading...' : 'Upload & Set 2nd Hero'}</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    disabled={uploadingMedia}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (!file) return;
                                      setUploadingMedia(true);
                                      const reader = new FileReader();
                                      reader.onload = async () => {
                                        try {
                                          const base64 = reader.result as string;
                                          const res = await api.uploadAdminMedia(base64, file.name || 'second-hero.jpg');
                                          await handleSetSecondHeroBanner(res.url);
                                        } catch (err: any) {
                                          showSuccessModal('Upload Failed', err.message || 'Failed to upload photo');
                                        } finally {
                                          setUploadingMedia(false);
                                        }
                                      };
                                      reader.readAsDataURL(file);
                                    }}
                                    className="hidden"
                                  />
                                </label>
                              </div>

                              <div>
                                <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                                  Or Custom Web Image URL:
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="url"
                                    placeholder="https://..."
                                    defaultValue={settings?.secondHeroBannerUrl || ''}
                                    id="second-hero-url-input"
                                    className="flex-1 px-3 py-2 bg-[#FAF7F2] dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const input = document.getElementById('second-hero-url-input') as HTMLInputElement;
                                      if (input && input.value.trim()) {
                                        handleSetSecondHeroBanner(input.value.trim());
                                      }
                                    }}
                                    className="px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-[#E6D4BA] dark:border-white/20 text-[#1C1B1A] dark:text-white font-bold rounded-lg hover:bg-[#E6D4BA]/40 cursor-pointer"
                                  >
                                    Apply
                                  </button>
                                </div>
                              </div>
                            </div>

                            {/* Quick Select from Presets & Library */}
                            <div>
                              <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1.5">
                                Quick Select from Salon Photos / Library:
                              </label>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                                {[
                                  { title: 'VIP Ambience Lounge', url: '/assets/images/salon_ambience_lounge_1790779524195.jpg' },
                                  { title: 'Luxury Interior & Chairs', url: '/assets/images/hero_salon_interior_1790779465939.jpg' },
                                  { title: 'Hair Styling & Craft', url: '/assets/images/salon_hair_styling_1790779479714.jpg' },
                                  { title: 'Facial & Skincare Suite', url: '/assets/images/salon_facial_skincare_1790779494754.jpg' },
                                  { title: 'Bridal & HD Makeup', url: '/assets/images/salon_bridal_makeup_1790779508056.jpg' },
                                  ...uploadedMediaList.map((m) => ({ title: m.name, url: m.url }))
                                ].map((p, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => handleSetSecondHeroBanner(p.url)}
                                    className={`w-14 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition-transform hover:scale-105 cursor-pointer relative ${
                                      settings?.secondHeroBannerUrl === p.url ? 'border-[#C29F67] ring-2 ring-[#C29F67]/50' : 'border-transparent'
                                    }`}
                                    title={`Set "${p.title}" as Second Hero`}
                                  >
                                    <img src={p.url} alt={p.title} className="w-full h-full object-cover" />
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Edit Customer View Text for Second Hero */}
                            <div className="p-3 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C753D] dark:text-[#C29F67]">
                                Edit Customer-Facing Text on Second Hero Banner:
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[11px] font-medium text-[#79746D] dark:text-gray-400 mb-0.5">Section Badge</label>
                                  <input
                                    type="text"
                                    value={settings?.secondHeroBadge || ''}
                                    placeholder="The B&B Experience"
                                    onChange={(e) => settings && setSettings({ ...settings, secondHeroBadge: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded text-xs text-[#1C1B1A] dark:text-white"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[11px] font-medium text-[#79746D] dark:text-gray-400 mb-0.5">Section Main Headline</label>
                                  <input
                                    type="text"
                                    value={settings?.secondHeroTitle || ''}
                                    placeholder="A Higher Standard for Everyday Personal Care in Bhopal"
                                    onChange={(e) => settings && setSettings({ ...settings, secondHeroTitle: e.target.value })}
                                    className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded text-xs text-[#1C1B1A] dark:text-white"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium text-[#79746D] dark:text-gray-400 mb-0.5">Sanctuary Story Description</label>
                                <textarea
                                  rows={2}
                                  value={settings?.secondHeroSubtitle || ''}
                                  placeholder="We founded B&B Family Salon with a simple principle: modern hair styling and restorative beauty should be an unhurried..."
                                  onChange={(e) => settings && setSettings({ ...settings, secondHeroSubtitle: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded text-xs text-[#1C1B1A] dark:text-white"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-medium text-[#79746D] dark:text-gray-400 mb-0.5">Floating Sanctuary Note</label>
                                <input
                                  type="text"
                                  value={settings?.secondHeroHighlight || ''}
                                  placeholder="Clean, calm, and climate-controlled at Ultimate Arcade."
                                  onChange={(e) => settings && setSettings({ ...settings, secondHeroHighlight: e.target.value })}
                                  className="w-full px-2.5 py-1.5 bg-white dark:bg-black/30 border border-gray-200 dark:border-white/10 rounded text-xs text-[#1C1B1A] dark:text-white"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={handleSaveSettings}
                                className="px-3 py-1.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                              >
                                <Save className="w-3.5 h-3.5" />
                                <span>Save Second Hero Text</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ============================================================== */}
                  {/* SECTION 2: SERVICE PHOTOS & SERVICE NAMES IN CUSTOMER VIEW     */}
                  {/* ============================================================== */}
                  {(mediaActiveSection === 'all' || mediaActiveSection === 'services') && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6D4BA]/60 dark:border-white/10 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#C29F67]" />
                            <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                              Section 2: Service Photos & Respective Names in Customer View
                            </h4>
                          </div>
                          <p className="text-xs text-[#79746D] dark:text-gray-400 mt-0.5">
                            Every service shown to customers with its exact customer-view name, price tag, and direct photo replace/upload.
                          </p>
                        </div>
                        <span className="text-xs font-bold text-[#9C753D] dark:text-[#C29F67]">
                          {services.length} Services Active
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {services.map((srv) => {
                          const categoryObj = categories.find((c) => c.id === srv.categoryId);
                          return (
                            <div
                              key={srv.id}
                              className="bg-white dark:bg-white/5 border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl overflow-hidden p-3.5 shadow-xs flex flex-col justify-between group hover:border-[#C29F67] transition-all"
                            >
                              <div className="space-y-2.5">
                                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                  <img
                                    src={srv.imageUrl || '/assets/images/salon_hair_styling_1790779479714.jpg'}
                                    alt={srv.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  <span className="absolute top-2 left-2 text-[10px] uppercase font-bold bg-[#1C1B1A]/90 dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] px-2 py-0.5 rounded-md shadow-xs">
                                    {categoryObj ? categoryObj.name : 'Service'}
                                  </span>
                                  <span className="absolute top-2 right-2 text-xs font-black bg-[#C29F67] text-[#1C1B1A] px-2 py-0.5 rounded-md shadow-xs">
                                    ₹{srv.price}
                                  </span>
                                </div>

                                <div>
                                  <div className="text-[10px] text-[#9C753D] dark:text-[#C29F67] uppercase font-bold tracking-wider">
                                    Respective Name in Customer View:
                                  </div>
                                  <h5 className="font-bold text-sm text-[#1C1B1A] dark:text-white leading-tight mt-0.5">
                                    {srv.name}
                                  </h5>
                                  <div className="flex items-center gap-2 text-[11px] text-[#79746D] dark:text-gray-400 mt-1">
                                    <span>⏱ {srv.durationMinutes} mins</span>
                                    <span>•</span>
                                    <span className="truncate">{srv.description || 'Premium salon care.'}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-2 mt-3">
                                {/* Direct File Upload for Service Photo */}
                                <label className="w-full py-1.5 px-3 bg-[#FAF7F2] dark:bg-white/10 hover:bg-[#C29F67] hover:text-white dark:hover:bg-[#C29F67] dark:hover:text-[#1C1B1A] text-[#1C1B1A] dark:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                                  <Upload className="w-3.5 h-3.5" />
                                  <span>Replace Photo from Device</span>
                                  <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadServicePhotoFile(srv.id, file);
                                    }}
                                    className="hidden"
                                  />
                                </label>

                                <div className="flex items-center gap-2">
                                  {/* Quick assign from library */}
                                  <button
                                    type="button"
                                    onClick={() => setAssigningPhotoModal({ url: srv.imageUrl || '', title: srv.name })}
                                    className="flex-1 py-1.5 bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[#79746D] dark:text-gray-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer text-center"
                                  >
                                    Select from Library
                                  </button>

                                  {/* Edit Service Details */}
                                  <button
                                    type="button"
                                    onClick={() => setEditingService(srv)}
                                    className="px-3 py-1.5 bg-[#FAF7F2] dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-[#C29F67] text-[#1C1B1A] dark:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                                    title="Edit Service Name & Price"
                                  >
                                    <Edit2 className="w-3 h-3 text-[#9C753D] dark:text-[#C29F67]" />
                                    <span>Edit</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ============================================================== */}
                  {/* SECTION 3: THE SALON GALLERY & PORTFOLIO PHOTOS                */}
                  {/* ============================================================== */}
                  {(mediaActiveSection === 'all' || mediaActiveSection === 'gallery') && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6D4BA]/60 dark:border-white/10 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#C29F67]" />
                            <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                              Section 3: The Salon Gallery & Portfolio Photos
                            </h4>
                          </div>
                          <p className="text-xs text-[#79746D] dark:text-gray-400 mt-0.5">
                            Customer portfolio showcase photos with respective titles, categories, and typography styling.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setEditingGalleryItem({
                              title: '',
                              category: 'Hair',
                              imageUrl: '/assets/images/salon_hair_styling_1790779479714.jpg',
                              description: 'Artisanal styling and premium luxury care.',
                              isFeatured: true
                            });
                          }}
                          className="px-3.5 py-2 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
                        >
                          <Plus className="w-4 h-4 text-[#C29F67] dark:text-[#1C1B1A]" />
                          <span>Add New Gallery Photo</span>
                        </button>
                      </div>

                      {/* Photo Text Size & Arrangement Customizer */}
                      <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/80 dark:border-white/10 rounded-xl p-4 sm:p-5 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-white/10 pb-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] dark:bg-white/5 border border-[#C29F67]/50 flex items-center justify-center text-[#9C753D] dark:text-[#C29F67]">
                              <Sliders className="w-4 h-4" />
                            </div>
                            <div>
                              <h5 className="text-sm font-bold text-[#1C1B1A] dark:text-white">Gallery Typography & Arrangement Studio</h5>
                              <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                                Configure photo caption sizes and placement styles in customer gallery.
                              </p>
                            </div>
                          </div>

                          {settings && (
                            <button
                              type="button"
                              onClick={async () => {
                                try {
                                  await api.updateAdminSettings(settings);
                                  showSuccessModal(
                                    'Arrangement Saved',
                                    'Photo text size & arrangement updated and applied across website!'
                                  );
                                  onSettingsChange?.(settings);
                                  onDataChanged();
                                } catch (err: any) {
                                  showSuccessModal('Save Failed', err.message || 'Failed to update arrangement');
                                }
                              }}
                              className="px-3.5 py-1.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-auto"
                            >
                              <Save className="w-3.5 h-3.5" />
                              <span>Save Typography Style</span>
                            </button>
                          )}
                        </div>

                        {settings && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                              <label className="block text-[#1C1B1A] dark:text-white font-bold mb-1">Photo Text Size</label>
                              <select
                                value={settings.photoTextSize || 'large'}
                                onChange={(e) => setSettings({ ...settings, photoTextSize: e.target.value as any })}
                                className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#1C1B1A] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-semibold text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                              >
                                <option value="small">Small Typography</option>
                                <option value="medium">Medium Typography</option>
                                <option value="large">Large Bold Typography (Recommended)</option>
                                <option value="extralarge">Extra Large / Massive Bold Typography</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[#1C1B1A] dark:text-white font-bold mb-1">Photo Text Arrangement Style</label>
                              <select
                                value={settings.photoTextArrangement || 'card-below'}
                                onChange={(e) => setSettings({ ...settings, photoTextArrangement: e.target.value as any })}
                                className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#1C1B1A] border border-gray-200 dark:border-white/10 rounded-lg text-xs font-semibold text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                              >
                                <option value="card-below">Card Below Photo (Always Visible Text)</option>
                                <option value="overlay-bottom">Overlay at Bottom (Gradient Backdrop)</option>
                                <option value="overlay-center">Overlay Centered (Luxury Glass Effect)</option>
                                <option value="badge-minimal">Minimalist Top Badges</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Gallery Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {gallery.map((item) => (
                          <div
                            key={item.id}
                            className="bg-white dark:bg-white/5 border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl overflow-hidden p-3.5 shadow-2xs space-y-2.5 flex flex-col justify-between group hover:border-[#C29F67] transition-all"
                          >
                            <div className="space-y-2">
                              <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                                <img
                                  src={item.imageUrl}
                                  alt={item.title}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                                <span className="absolute top-2 left-2 text-[10px] uppercase font-bold bg-[#1C1B1A]/85 dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] px-2 py-0.5 rounded-sm">
                                  {item.category}
                                </span>
                              </div>
                              <div>
                                <div className="text-[10px] text-[#9C753D] dark:text-[#C29F67] uppercase font-bold tracking-wider">
                                  Respective Title in Customer View:
                                </div>
                                <h5 className="font-bold text-sm text-[#1C1B1A] dark:text-white mt-0.5">{item.title}</h5>
                                {item.description && (
                                  <p className="text-[11px] text-[#79746D] dark:text-gray-300 line-clamp-2 mt-0.5">
                                    {item.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-gray-100 dark:border-white/10 space-y-2">
                              {/* Direct file upload to replace gallery photo */}
                              <label className="w-full py-1.5 px-3 bg-[#FAF7F2] dark:bg-white/10 hover:bg-[#C29F67] hover:text-white dark:hover:bg-[#C29F67] dark:hover:text-[#1C1B1A] text-[#1C1B1A] dark:text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs">
                                <Upload className="w-3.5 h-3.5" />
                                <span>Replace Photo from Device</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadGalleryPhotoFile(item.id, file);
                                  }}
                                  className="hidden"
                                />
                              </label>

                              <div className="flex items-center justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => setEditingGalleryItem(item)}
                                  className="flex-1 py-1.5 text-xs bg-[#FAF7F2] dark:bg-white/10 hover:bg-[#E6D4BA]/50 dark:hover:bg-white/15 text-[#1C1B1A] dark:text-white font-bold rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-3 h-3 text-[#9C753D] dark:text-[#C29F67]" />
                                  <span>Edit Title & Text</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    showConfirmationModal(
                                      'Delete Photo',
                                      `Delete "${item.title}" from gallery?`,
                                      async () => {
                                        try {
                                          await api.deleteAdminGallery(item.id);
                                          const galRes = await api.getGallery();
                                          setGallery(galRes);
                                          onDataChanged();
                                          showSuccessModal('Photo Deleted', `"${item.title}" removed from gallery.`);
                                        } catch (err: any) {
                                          showSuccessModal('Delete Failed', err.message || 'Failed to delete photo');
                                        }
                                      },
                                      'Delete Photo',
                                      true
                                    );
                                  }}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                  title="Delete Photo"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ============================================================== */}
                  {/* SECTION 4: WEBSITE TEXT & COPYWRITING STUDIO (ALL TEXT IN 1)   */}
                  {/* ============================================================== */}
                  {(mediaActiveSection === 'all' || mediaActiveSection === 'text') && settings && (
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6D4BA]/60 dark:border-white/10 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#C29F67]" />
                            <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                              Section 4: Website Text & Copywriting Studio (All Customer Text)
                            </h4>
                          </div>
                          <p className="text-xs text-[#79746D] dark:text-gray-400 mt-0.5">
                            Review and customize all slogans, headlines, stories, addresses, and announcements shown to clients.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleSaveSettings}
                          className="px-4 py-2 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-xs self-start sm:self-auto"
                        >
                          <Save className="w-4 h-4 text-[#C29F67] dark:text-[#1C1B1A]" />
                          <span>Save All Website Text</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                        {/* Group A: Brand & Identity */}
                        <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                          <h5 className="font-bold text-sm text-[#1C1B1A] dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/10 pb-2">
                            <span>Salon Branding & Slogans</span>
                          </h5>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Main Salon Name</label>
                            <input
                              type="text"
                              value={settings.salonName}
                              onChange={(e) => setSettings({ ...settings, salonName: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg font-bold"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Alternate / Short Name</label>
                            <input
                              type="text"
                              value={settings.alternateName || ''}
                              placeholder="B&B Unisex Salon"
                              onChange={(e) => setSettings({ ...settings, alternateName: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Tagline / Brand Slogan</label>
                            <input
                              type="text"
                              value={settings.tagline}
                              onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                        </div>

                        {/* Group B: Top Hero Banner Text */}
                        <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                          <h5 className="font-bold text-sm text-[#1C1B1A] dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/10 pb-2">
                            <span>Main Hero Banner Copy (Top of Website)</span>
                          </h5>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Top Verified Badge</label>
                            <input
                              type="text"
                              value={settings.heroBadge || ''}
                              placeholder="4.9 / 5.0 Google Verified Luxury Sanctuary · Bhopal"
                              onChange={(e) => setSettings({ ...settings, heroBadge: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Headline Text</label>
                            <input
                              type="text"
                              value={settings.heroHeadline || ''}
                              placeholder="Premium Grooming & Beauty Sanctuary in Bhopal"
                              onChange={(e) => setSettings({ ...settings, heroHeadline: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Hero Subtitle Story</label>
                            <textarea
                              rows={2}
                              value={settings.heroSubtitle || ''}
                              placeholder="Welcome to B&B Family Salon — A serene sanctuary offering precision haircuts..."
                              onChange={(e) => setSettings({ ...settings, heroSubtitle: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                        </div>

                        {/* Group C: Second Hero Banner Text */}
                        <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                          <h5 className="font-bold text-sm text-[#1C1B1A] dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/10 pb-2">
                            <span>Second Hero Banner Copy ("The B&B Experience")</span>
                          </h5>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Experience Section Badge</label>
                            <input
                              type="text"
                              value={settings.secondHeroBadge || ''}
                              placeholder="The B&B Experience"
                              onChange={(e) => setSettings({ ...settings, secondHeroBadge: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Experience Main Headline</label>
                            <input
                              type="text"
                              value={settings.secondHeroTitle || ''}
                              placeholder="A Higher Standard for Everyday Personal Care in Bhopal"
                              onChange={(e) => setSettings({ ...settings, secondHeroTitle: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Salon Sanctuary Philosophy</label>
                            <textarea
                              rows={2}
                              value={settings.secondHeroSubtitle || ''}
                              placeholder="We founded B&B Family Salon with a simple principle..."
                              onChange={(e) => setSettings({ ...settings, secondHeroSubtitle: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Floating Note Accent</label>
                            <input
                              type="text"
                              value={settings.secondHeroHighlight || ''}
                              placeholder="Clean, calm, and climate-controlled at Ultimate Arcade."
                              onChange={(e) => setSettings({ ...settings, secondHeroHighlight: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                        </div>

                        {/* Group D: Location & Address */}
                        <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                          <h5 className="font-bold text-sm text-[#1C1B1A] dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-white/10 pb-2">
                            <span>Address & Landmarks</span>
                          </h5>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Street Address</label>
                            <input
                              type="text"
                              value={settings.address}
                              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Landmarks</label>
                              <input
                                type="text"
                                value={settings.landmarks}
                                onChange={(e) => setSettings({ ...settings, landmarks: e.target.value })}
                                className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">City & State</label>
                              <input
                                type="text"
                                value={`${settings.city}, ${settings.state}`}
                                onChange={(e) => {
                                  const parts = e.target.value.split(',');
                                  setSettings({
                                    ...settings,
                                    city: parts[0]?.trim() || settings.city,
                                    state: parts[1]?.trim() || settings.state
                                  });
                                }}
                                className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block font-semibold text-[#1C1B1A] dark:text-white mb-1">Phone Number</label>
                            <input
                              type="tel"
                              value={settings.phone}
                              onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                              className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-[#141312] border border-gray-200 dark:border-white/10 rounded-lg"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={handleSaveSettings}
                          className="px-6 py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-colors cursor-pointer shadow-sm"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save All Text Changes to Live Site</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ============================================================== */}
                  {/* SECTION 5: UPLOADED MEDIA LIBRARY & QUICK ASSET PICKER         */}
                  {/* ============================================================== */}
                  {(mediaActiveSection === 'all' || mediaActiveSection === 'library') && (
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6D4BA]/60 dark:border-white/10 pb-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-[#C29F67]" />
                            <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                              Section 5: Uploaded Media Library & Quick Asset Picker
                            </h4>
                          </div>
                          <p className="text-xs text-[#79746D] dark:text-gray-400 mt-0.5">
                            All photos uploaded from phone camera or computer. 1-tap assign to Top Hero, Second Hero, any Service, or Gallery.
                          </p>
                        </div>

                        <label className="px-3.5 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-[#E6D4BA] dark:border-white/20 text-[#1C1B1A] dark:text-white text-xs font-bold rounded-xl flex items-center gap-2 hover:bg-[#E6D4BA]/30 cursor-pointer transition-colors self-start sm:self-auto">
                          <Upload className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
                          <span>{uploadingMedia ? 'Uploading...' : 'Upload New Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingMedia}
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                        {[
                          { title: 'Luxury Interior & Stations', url: '/assets/images/hero_salon_interior_1790779465939.jpg' },
                          { title: 'Hair Styling & Craft', url: '/assets/images/salon_hair_styling_1790779479714.jpg' },
                          { title: 'Facial & Skincare Suite', url: '/assets/images/salon_facial_skincare_1790779494754.jpg' },
                          { title: 'VIP Ambience Lounge', url: '/assets/images/salon_ambience_lounge_1790779524195.jpg' },
                          { title: 'Bridal & HD Makeup', url: '/assets/images/salon_bridal_makeup_1790779508056.jpg' },
                          ...uploadedMediaList.map((m) => ({ title: m.name, url: m.url }))
                        ].map((item, idx) => {
                          const isMainHero = settings?.heroBannerUrl === item.url;
                          const isSecondHero = settings?.secondHeroBannerUrl === item.url;
                          return (
                            <div
                              key={idx}
                              className={`bg-white dark:bg-white/5 border rounded-2xl overflow-hidden p-3 flex flex-col justify-between shadow-2xs hover:shadow-md transition-all group ${
                                isMainHero
                                  ? 'border-[#C29F67] ring-2 ring-[#C29F67]/60'
                                  : isSecondHero
                                  ? 'border-emerald-500 ring-2 ring-emerald-500/50'
                                  : 'border-[#E6D4BA]/70 dark:border-white/10'
                              }`}
                            >
                              <div>
                                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-2 bg-gray-100 dark:bg-gray-800">
                                  <img
                                    src={item.url}
                                    alt={item.title}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                  />
                                  {isMainHero && (
                                    <span className="absolute top-1.5 left-1.5 bg-[#C29F67] text-[#1C1B1A] text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                                      <Sparkles className="w-3 h-3 fill-current" />
                                      <span>Main Hero</span>
                                    </span>
                                  )}
                                  {isSecondHero && !isMainHero && (
                                    <span className="absolute top-1.5 left-1.5 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                                      <Shield className="w-3 h-3 fill-current" />
                                      <span>2nd Hero</span>
                                    </span>
                                  )}
                                </div>
                                <p className="font-bold text-xs text-[#1C1B1A] dark:text-white truncate mb-1" title={item.title}>
                                  {item.title}
                                </p>
                              </div>

                              <div className="pt-2 border-t border-gray-100 dark:border-white/10 space-y-1">
                                {/* Set as Main Hero */}
                                {!isMainHero ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSetHeroBanner(item.url)}
                                    className="w-full py-1 text-[10px] bg-[#FAF7F2] dark:bg-white/10 hover:bg-[#C29F67] hover:text-white dark:hover:bg-[#C29F67] dark:hover:text-[#1C1B1A] text-[#1C1B1A] dark:text-white rounded-md font-bold transition-colors text-center cursor-pointer"
                                  >
                                    ★ Set as Main Hero
                                  </button>
                                ) : (
                                  <span className="w-full py-0.5 text-[9px] text-[#C29F67] font-bold block text-center bg-[#C29F67]/15 rounded">
                                    ✓ Active Main Hero
                                  </span>
                                )}

                                {/* Set as Second Hero */}
                                {!isSecondHero ? (
                                  <button
                                    type="button"
                                    onClick={() => handleSetSecondHeroBanner(item.url)}
                                    className="w-full py-1 text-[10px] bg-[#FAF7F2] dark:bg-white/10 hover:bg-emerald-600 hover:text-white text-[#1C1B1A] dark:text-white rounded-md font-bold transition-colors text-center cursor-pointer"
                                  >
                                    🌟 Set as 2nd Hero
                                  </button>
                                ) : (
                                  <span className="w-full py-0.5 text-[9px] text-emerald-600 font-bold block text-center bg-emerald-50 dark:bg-emerald-950/40 rounded">
                                    ✓ Active 2nd Hero
                                  </span>
                                )}

                                {/* Assign to Service */}
                                <button
                                  type="button"
                                  onClick={() => setAssigningPhotoModal({ url: item.url, title: item.title })}
                                  className="w-full py-1 text-[10px] bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[#79746D] dark:text-gray-300 rounded-md font-medium transition-colors text-center cursor-pointer"
                                >
                                  Assign to Service
                                </button>

                                {/* Add to Gallery */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingGalleryItem({
                                      title: item.title,
                                      category: 'Hair',
                                      imageUrl: item.url,
                                      description: 'Luxury styling at B&B Family Salon.',
                                      isFeatured: true
                                    });
                                  }}
                                  className="w-full py-1 text-[10px] bg-gray-50 dark:bg-white/5 hover:bg-gray-100 dark:hover:bg-white/10 text-[#79746D] dark:text-gray-300 rounded-md font-medium transition-colors text-center cursor-pointer"
                                >
                                  Add to Gallery
                                </button>

                                {/* Delete Photo from library */}
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhoto(item.url, item.title)}
                                  className="w-full py-0.5 text-[9px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded font-medium transition-colors text-center cursor-pointer"
                                >
                                  Delete Photo
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: BUSINESS HOURS / TIME MANAGEMENT */}
              {activeTab === 'hours' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Top Header with Immediate Save Option */}
                  <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/70 dark:border-white/10 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[#C29F67]" />
                        <h3 className="text-xl font-serif font-bold text-[#1C1B1A] dark:text-white">
                          Time Management & Store Operating Hours
                        </h3>
                      </div>
                      <p className="text-xs text-[#79746D] dark:text-gray-400 max-w-xl">
                        Configure official opening and closing times for each day of the week. Updates are applied in real time to the website header, hero banner, footer, and customer booking slot engine.
                      </p>
                    </div>

                    {/* TOP SAVE BUTTON */}
                    <button
                      type="button"
                      onClick={handleSaveBusinessHours}
                      className="px-6 py-3 bg-[#1C1B1A] hover:bg-[#2A2826] dark:bg-[#C29F67] dark:hover:bg-[#B38C4F] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer shrink-0"
                    >
                      <Save className="w-4 h-4 text-[#C29F67] dark:text-[#1C1B1A]" />
                      <span>Save Time Management</span>
                    </button>
                  </div>

                  {/* Quick Timing Presets */}
                  <div className="p-4 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl space-y-2 text-xs">
                    <span className="font-bold text-[#1C1B1A] dark:text-white flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#C29F67]" />
                      Quick Presets & Multi-Day Apply:
                    </span>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const updated = businessHours.map((d) => ({
                            ...d,
                            isOpen: true,
                            openTime: '10:00',
                            closeTime: '21:00'
                          }));
                          setBusinessHours(updated);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-xs font-semibold hover:border-[#C29F67] transition-colors cursor-pointer"
                      >
                        Set All Days to 10:00 AM – 9:00 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = businessHours.map((d) => ({
                            ...d,
                            isOpen: true,
                            openTime: '09:00',
                            closeTime: '22:00'
                          }));
                          setBusinessHours(updated);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-xs font-semibold hover:border-[#C29F67] transition-colors cursor-pointer"
                      >
                        Set All Days to 9:00 AM – 10:00 PM
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (businessHours.length === 0) return;
                          const mon = businessHours[0];
                          const updated = businessHours.map((d) => ({
                            ...d,
                            openTime: mon.openTime,
                            closeTime: mon.closeTime
                          }));
                          setBusinessHours(updated);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-white/10 border border-gray-200 dark:border-white/20 rounded-lg text-xs font-semibold hover:border-[#C29F67] transition-colors cursor-pointer"
                      >
                        Copy First Day Times to All Days
                      </button>
                    </div>
                  </div>

                  {/* Day by Day Schedule List */}
                  <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl divide-y divide-gray-100 dark:divide-white/10 shadow-xs">
                    {businessHours.map((day, idx) => (
                      <div key={day.dayOfWeek} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                        <div className="w-36 flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={day.isOpen}
                            onChange={(e) => {
                              const updated = [...businessHours];
                              updated[idx].isOpen = e.target.checked;
                              setBusinessHours(updated);
                            }}
                            className="rounded border-gray-300 text-[#C29F67] focus:ring-[#C29F67] w-4 h-4 cursor-pointer"
                          />
                          <span className={`font-bold text-sm ${day.isOpen ? 'text-[#1C1B1A] dark:text-white' : 'text-gray-400'}`}>
                            {day.dayName}
                          </span>
                        </div>

                        {day.isOpen ? (
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center gap-2">
                              <span className="text-[#79746D] dark:text-gray-300 font-semibold">Opening Time:</span>
                              <input
                                type="time"
                                value={day.openTime}
                                onChange={(e) => {
                                  const updated = [...businessHours];
                                  updated[idx].openTime = e.target.value;
                                  setBusinessHours(updated);
                                }}
                                className="px-3 py-1.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-semibold text-[#1C1B1A] dark:text-white outline-hidden cursor-pointer"
                              />
                              <span className="text-xs font-bold text-[#C29F67]">({formatTime12(day.openTime)})</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[#79746D] dark:text-gray-300 font-semibold">Closing Time:</span>
                              <input
                                type="time"
                                value={day.closeTime}
                                onChange={(e) => {
                                  const updated = [...businessHours];
                                  updated[idx].closeTime = e.target.value;
                                  setBusinessHours(updated);
                                }}
                                className="px-3 py-1.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-semibold text-[#1C1B1A] dark:text-white outline-hidden cursor-pointer"
                              />
                              <span className="text-xs font-bold text-[#C29F67]">({formatTime12(day.closeTime)})</span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 dark:text-gray-500 italic font-semibold">Closed all day</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* BOTTOM SAVE BUTTON */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('blocks')}
                      className="text-xs text-[#9C753D] dark:text-[#C29F67] hover:underline font-semibold cursor-pointer"
                    >
                      Need to add single-day festival holidays or emergency closures? Go to Blocked Dates →
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveBusinessHours}
                      className="px-8 py-3 bg-[#1C1B1A] hover:bg-[#2A2826] dark:bg-[#C29F67] dark:hover:bg-[#B38C4F] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer w-full sm:w-auto"
                    >
                      <Save className="w-4 h-4 text-[#C29F67] dark:text-[#1C1B1A]" />
                      <span>Save Time Management</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 5: BLOCKED DATES & AVAILABILITY */}
              {activeTab === 'blocks' && (
                <div className="space-y-6 max-w-4xl">
                  <div>
                    <h3 className="text-xl font-serif text-[#1C1B1A]">Blocked Dates & Emergency Closures</h3>
                    <p className="text-xs text-[#79746D]">
                      Block full days or specific hourly windows for holidays, maintenance, or private VIP events. Blocked periods immediately vanish from customer slot booking.
                    </p>
                  </div>

                  {/* Add Block Form */}
                  <form onSubmit={handleAddBlockedDate} className="bg-white border border-[#E6D4BA]/60 rounded-xl p-5 shadow-xs space-y-4 text-xs">
                    <h4 className="font-semibold text-sm text-[#1C1B1A]">Add Blocked Period</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#1C1B1A] font-medium mb-1">Date</label>
                        <input
                          type="date"
                          required
                          value={newBlockDate}
                          onChange={(e) => setNewBlockDate(e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-[#1C1B1A] font-medium mb-1">Reason / Description</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Festival Holiday / Salon Maintenance"
                          value={newBlockReason}
                          onChange={(e) => setNewBlockReason(e.target.value)}
                          className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-200 rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newBlockAllDay}
                          onChange={(e) => setNewBlockAllDay(e.target.checked)}
                          className="rounded border-gray-300 text-[#C29F67] focus:ring-[#C29F67]"
                        />
                        <span className="font-medium text-[#1C1B1A]">Block Entire Day</span>
                      </label>
                    </div>

                    {!newBlockAllDay && (
                      <div className="flex items-center gap-4 pt-2">
                        <div>
                          <label className="block text-[11px] text-[#79746D] mb-1">From Time</label>
                          <input
                            type="time"
                            value={newBlockStartTime}
                            onChange={(e) => setNewBlockStartTime(e.target.value)}
                            className="px-3 py-1.5 bg-[#FAF7F2] border border-gray-200 rounded-lg text-xs"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] text-[#79746D] mb-1">To Time</label>
                          <input
                            type="time"
                            value={newBlockEndTime}
                            onChange={(e) => setNewBlockEndTime(e.target.value)}
                            className="px-3 py-1.5 bg-[#FAF7F2] border border-gray-200 rounded-lg text-xs"
                          />
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#1C1B1A] text-white font-semibold rounded-lg hover:bg-[#2A2826] transition-colors"
                    >
                      Add Block Rule
                    </button>
                  </form>

                  {/* List of blocked dates */}
                  <div className="bg-white border border-[#E6D4BA]/60 rounded-xl divide-y divide-gray-100 shadow-xs">
                    {blockedDates.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#79746D]">
                        No active blocked dates. Salon is open per normal weekly business hours.
                      </div>
                    ) : (
                      blockedDates.map((block) => (
                        <div key={block.id} className="p-4 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-[#1C1B1A]">{block.date}</span>
                            <span className="text-[#79746D] ml-2">({block.reason})</span>
                            <p className="text-[11px] text-[#9C753D] mt-0.5">
                              {block.allDay ? 'Closed all day' : `Blocked from ${block.startTime} to ${block.endTime}`}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteBlockedDate(block.id)}
                            className="p-1.5 text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove block"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: CUSTOMERS DIRECTORY */}
              {activeTab === 'customers' && (() => {
                const validCustomers = Array.isArray(customers) ? customers.filter((item): item is Customer => Boolean(item && item.id)) : [];
                const filteredCustomers = validCustomers.filter((c) => {
                  if (!customerSearchQuery.trim()) return true;
                  const q = customerSearchQuery.toLowerCase().trim();
                  return (
                    (c.name && c.name.toLowerCase().includes(q)) ||
                    (c.phone && c.phone.includes(q)) ||
                    (c.email && c.email.toLowerCase().includes(q)) ||
                    (c.notes && c.notes.toLowerCase().includes(q))
                  );
                });

                return (
                  <div className="space-y-5">
                    {/* Header with Title & Search Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl font-serif text-[#1C1B1A] dark:text-white font-bold">Client Directory</h3>
                          <span className="text-[11px] font-bold bg-[#C29F67]/20 text-[#9C753D] dark:text-[#E6D4BA] px-2.5 py-0.5 rounded-full">
                            {validCustomers.length} registered
                          </span>
                        </div>
                        <p className="text-xs text-[#79746D] dark:text-gray-400 mt-0.5">
                          Verified customer database recorded from online appointments and walk-in reservations.
                        </p>
                      </div>

                      {/* Search Bar */}
                      <div className="relative w-full sm:w-72">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="Search clients by name, phone, email..."
                          value={customerSearchQuery}
                          onChange={(e) => setCustomerSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 text-xs bg-white dark:bg-white/5 border border-[#E6D4BA]/80 dark:border-white/10 rounded-xl text-[#1C1B1A] dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#C29F67]"
                        />
                      </div>
                    </div>

                    {/* MOBILE VIEW: RESPONSIVE CLIENT CARDS (MOBILE ONLY) */}
                    <div className="block md:hidden space-y-3">
                      {filteredCustomers.length === 0 ? (
                        <div className="p-8 text-center text-gray-500 italic bg-white dark:bg-white/5 rounded-2xl border border-dashed border-[#E6D4BA]/60 dark:border-white/10">
                          {customerSearchQuery ? 'No matching clients found for your search.' : 'No client records found.'}
                        </div>
                      ) : (
                        filteredCustomers.map((c) => (
                          <div
                            key={c.id}
                            className="p-4 bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl shadow-xs space-y-3"
                          >
                            {/* Card Top: Name & Bookings Badge */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white truncate">
                                  {c.name || 'Unnamed Client'}
                                </h4>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                                    {c.totalBookings || 0} booking{(c.totalBookings || 0) !== 1 ? 's' : ''}
                                  </span>
                                  {c.isRegistered && (
                                    <span className="text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                                      Gmail Account
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="text-[11px] text-[#79746D] dark:text-gray-400 font-mono shrink-0">
                                #{c.id ? c.id.slice(-6) : '—'}
                              </span>
                            </div>

                            {/* Contact Details */}
                            <div className="grid grid-cols-1 gap-1.5 text-xs pt-1 border-t border-gray-100 dark:border-white/10">
                              <div className="flex items-center gap-2">
                                <Phone className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67] shrink-0" />
                                <a
                                  href={`tel:${c.phone}`}
                                  className="text-[#1C1B1A] dark:text-white font-medium hover:underline"
                                >
                                  {c.phone || '—'}
                                </a>
                              </div>
                              {c.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67] shrink-0" />
                                  <span className="text-[#79746D] dark:text-gray-300 truncate">{c.email}</span>
                                </div>
                              )}
                              {c.lastBookingDate && (
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                                  <span className="text-[#79746D] dark:text-gray-400 text-[11px]">
                                    Last booking: {c.lastBookingDate}
                                  </span>
                                </div>
                              )}
                              {c.notes && (
                                <div className="text-[11px] text-gray-500 italic bg-gray-50 dark:bg-white/5 p-2 rounded-lg mt-1">
                                  "{c.notes}"
                                </div>
                              )}
                            </div>

                            {/* Mobile Card Action: Clearly Visible & Tappable Delete Button */}
                            <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between gap-2">
                              <a
                                href={`tel:${c.phone}`}
                                className="flex-1 py-2 px-3 bg-gray-50 dark:bg-white/10 hover:bg-gray-100 text-[#1C1B1A] dark:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                                <span>Call Client</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleDeleteCustomer(c)}
                                className="py-2 px-3.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                                title={`Permanently delete client "${c.name}"`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete Client</span>
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {/* DESKTOP VIEW: FULLY SCROLLABLE CLIENTS TABLE (TABLET & DESKTOP) */}
                    <div className="hidden md:block bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
                      <div className="overflow-x-auto mobile-scrollbar">
                        <table className="w-full text-left text-xs min-w-[680px]">
                          <thead className="bg-[#FAF7F2] dark:bg-white/5 border-b border-[#E6D4BA]/40 dark:border-white/10 text-[#79746D] dark:text-gray-400 text-[11px]">
                            <tr>
                              <th className="py-3 px-4 font-semibold">Client Name</th>
                              <th className="py-3 px-4 font-semibold">Phone</th>
                              <th className="py-3 px-4 font-semibold">Email</th>
                              <th className="py-3 px-4 font-semibold text-center">Total Bookings</th>
                              <th className="py-3 px-4 font-semibold">Last Booking</th>
                              <th className="py-3 px-4 font-semibold">Notes</th>
                              <th className="py-3 px-4 font-semibold text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 dark:divide-white/10">
                            {filteredCustomers.length === 0 ? (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-gray-500 italic">
                                  {customerSearchQuery ? 'No matching clients found for your search.' : 'No client records found.'}
                                </td>
                              </tr>
                            ) : (
                              filteredCustomers.map((c) => (
                                <tr key={c.id} className="hover:bg-[#FAF7F2] dark:hover:bg-white/10 transition-colors">
                                  <td className="py-3 px-4 font-medium text-[#1C1B1A] dark:text-white">
                                    <div className="flex items-center gap-1.5">
                                      <span>{c.name}</span>
                                      {c.isRegistered && (
                                        <span className="text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 rounded-xs font-bold">
                                          Account
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-[#79746D] dark:text-gray-300">
                                    <a href={`tel:${c.phone}`} className="hover:underline text-[#1C1B1A] dark:text-white font-medium">
                                      {c.phone}
                                    </a>
                                  </td>
                                  <td className="py-3 px-4 text-[#79746D] dark:text-gray-300">{c.email || '—'}</td>
                                  <td className="py-3 px-4 font-semibold text-[#1C1B1A] dark:text-white tabular-nums text-center">
                                    <span className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full">
                                      {c.totalBookings || 0}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-[#79746D] dark:text-gray-300">{c.lastBookingDate || '—'}</td>
                                  <td className="py-3 px-4 text-[#79746D] dark:text-gray-300 italic max-w-xs truncate">
                                    {c.notes || '—'}
                                  </td>
                                  <td className="py-3 px-4 text-right whitespace-nowrap">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCustomer(c)}
                                      className="py-1 px-2.5 text-xs text-red-600 dark:text-red-400 hover:text-red-700 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1 font-semibold"
                                      title={`Permanently delete client "${c.name}" (${c.phone})`}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TAB 7: REVIEWS MANAGEMENT */}
              {activeTab === 'reviews' && (() => {
                const totalCount = reviews.length;
                const approvedCount = reviews.filter((r) => r.status === 'approved' || (!r.status && r.source !== 'Website Customer')).length;
                const pendingCount = reviews.filter((r) => r.status === 'pending').length;
                const hiddenCount = reviews.filter((r) => r.status === 'hidden' || r.status === 'rejected').length;
                const avgRating = totalCount > 0 ? (reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / totalCount).toFixed(1) : '5.0';

                const filteredReviews = reviews.filter((r) => {
                  if (reviewFilterStatus === 'approved') {
                    if (r.status !== 'approved' && (r.status || r.source === 'Website Customer')) return false;
                  } else if (reviewFilterStatus === 'pending') {
                    if (r.status !== 'pending') return false;
                  } else if (reviewFilterStatus === 'hidden') {
                    if (r.status !== 'hidden' && r.status !== 'rejected') return false;
                  }

                  if (reviewFilterSource === 'google') {
                    if (r.source === 'Website Customer') return false;
                  } else if (reviewFilterSource === 'website') {
                    if (r.source !== 'Website Customer') return false;
                  }

                  if (reviewSearch.trim()) {
                    const q = reviewSearch.toLowerCase().trim();
                    const authorMatch = r.authorName?.toLowerCase().includes(q);
                    const textMatch = r.reviewText?.toLowerCase().includes(q);
                    return authorMatch || textMatch;
                  }

                  return true;
                });

                return (
                  <div className="space-y-6">
                    {/* Header with Title and Add Review CTA */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h3 className="text-xl font-serif text-[#1C1B1A] dark:text-white font-bold">
                          Customer Reviews & Google Maps Moderation
                        </h3>
                        <p className="text-xs text-[#79746D] dark:text-gray-400 mt-0.5">
                          Curate authentic feedback. Only approved reviews appear on your public website.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={handleOpenAddReview}
                        className="px-4 py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all hover:scale-[1.02] shrink-0"
                      >
                        <Plus className="w-4 h-4 text-white" />
                        <span>+ Add Review</span>
                      </button>
                    </div>

                    {/* KPI Metrics Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                      <div className="p-4 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl shadow-xs">
                        <span className="text-[11px] text-[#79746D] dark:text-gray-400 font-semibold block">Total Reviews</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-2xl font-serif font-bold text-[#1C1B1A] dark:text-white tabular-nums">{totalCount}</span>
                          <Star className="w-5 h-5 text-[#C29F67]" />
                        </div>
                      </div>

                      <div className="p-4 bg-white dark:bg-white/5 border border-emerald-200 dark:border-emerald-800/40 rounded-xl shadow-xs">
                        <span className="text-[11px] text-emerald-800 dark:text-emerald-400 font-semibold block">Live / Approved</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-2xl font-serif font-bold text-emerald-900 dark:text-emerald-300 tabular-nums">{approvedCount}</span>
                          <CheckCircle className="w-5 h-5 text-emerald-600" />
                        </div>
                      </div>

                      <div className="p-4 bg-white dark:bg-white/5 border border-amber-200 dark:border-amber-800/40 rounded-xl shadow-xs">
                        <span className="text-[11px] text-amber-800 dark:text-amber-400 font-semibold block">Pending Moderation</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-2xl font-serif font-bold text-amber-900 dark:text-amber-300 tabular-nums">{pendingCount}</span>
                          <Clock className="w-5 h-5 text-amber-600" />
                        </div>
                      </div>

                      <div className="p-4 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl shadow-xs">
                        <span className="text-[11px] text-[#79746D] dark:text-gray-400 font-semibold block">Average Rating</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-2xl font-serif font-bold text-[#1C1B1A] dark:text-white tabular-nums">{avgRating} ★</span>
                          <Award className="w-5 h-5 text-[#C29F67]" />
                        </div>
                      </div>
                    </div>

                    {/* Filter & Search Bar */}
                    <div className="p-3 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={reviewSearch}
                          onChange={(e) => setReviewSearch(e.target.value)}
                          placeholder="Search reviews by author name or content..."
                          className="w-full pl-8 pr-3 py-1.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden"
                        />
                      </div>

                      {/* Filter Segmented Buttons */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Filter */}
                        <div className="flex items-center bg-[#FAF7F2] dark:bg-white/10 p-0.5 rounded-lg border border-gray-200 dark:border-white/10">
                          <button
                            type="button"
                            onClick={() => setReviewFilterStatus('all')}
                            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                              reviewFilterStatus === 'all'
                                ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]'
                                : 'text-[#79746D] dark:text-gray-300'
                            }`}
                          >
                            All ({totalCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewFilterStatus('approved')}
                            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                              reviewFilterStatus === 'approved'
                                ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]'
                                : 'text-[#79746D] dark:text-gray-300'
                            }`}
                          >
                            Approved ({approvedCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewFilterStatus('pending')}
                            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                              reviewFilterStatus === 'pending'
                                ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]'
                                : 'text-[#79746D] dark:text-gray-300'
                            }`}
                          >
                            Pending ({pendingCount})
                          </button>
                          <button
                            type="button"
                            onClick={() => setReviewFilterStatus('hidden')}
                            className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                              reviewFilterStatus === 'hidden'
                                ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]'
                                : 'text-[#79746D] dark:text-gray-300'
                            }`}
                          >
                            Hidden ({hiddenCount})
                          </button>
                        </div>

                        {/* Source Filter */}
                        <select
                          value={reviewFilterSource}
                          onChange={(e) => setReviewFilterSource(e.target.value)}
                          className="px-2.5 py-1 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-semibold text-[#1C1B1A] dark:text-white cursor-pointer outline-hidden"
                        >
                          <option value="all">All Sources</option>
                          <option value="google">Google Maps Only</option>
                          <option value="website">Website Customer Only</option>
                        </select>
                      </div>
                    </div>

                    {/* Notice on Integrity */}
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
                      <ShieldCheck className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67] shrink-0 mt-0.5" />
                      <p className="text-[11px] leading-relaxed">
                        <strong>Authentic Experience Guarantee:</strong> Only genuine Google Maps reviews or verified customer submissions should be published. Never invent fake reviews or mark unverified feedback as verified.
                      </p>
                    </div>

                    {/* Reviews List Grid */}
                    {filteredReviews.length === 0 ? (
                      <div className="p-12 text-center bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-2xl space-y-3">
                        <Star className="w-10 h-10 text-[#C29F67] mx-auto opacity-50" />
                        <h4 className="font-serif font-bold text-base text-[#1C1B1A] dark:text-white">
                          No reviews match current filters
                        </h4>
                        <p className="text-xs text-[#79746D] dark:text-gray-400">
                          Try adjusting your status or source filters, or import a genuine Google Maps review.
                        </p>
                        <button
                          type="button"
                          onClick={handleOpenAddReview}
                          className="px-4 py-2 bg-[#C29F67] text-white text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Add Google Review
                        </button>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredReviews.map((rev) => {
                          const isGoogle = rev.source !== 'Website Customer';
                          const status = rev.status || (isGoogle ? 'approved' : 'pending');

                          return (
                            <div
                              key={rev.id}
                              className={`bg-white dark:bg-white/5 border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-3 shadow-2xs transition-all ${
                                status === 'pending'
                                  ? 'border-amber-300 dark:border-amber-700/60 bg-amber-50/20'
                                  : status === 'hidden' || status === 'rejected'
                                  ? 'border-gray-200 dark:border-white/5 opacity-75'
                                  : 'border-[#E6D4BA]/60 dark:border-white/10'
                              }`}
                            >
                              <div className="space-y-2.5">
                                {/* Top Badges Row */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-1">
                                    <h4 className="font-serif font-bold text-sm text-[#1C1B1A] dark:text-white">
                                      {rev.authorName}
                                    </h4>
                                    <div className="flex items-center gap-1.5 text-xs">
                                      <div className="flex items-center gap-0.5 text-[#C29F67]">
                                        {[...Array(rev.rating)].map((_, i) => (
                                          <Star key={i} className="w-3.5 h-3.5 fill-[#C29F67]" />
                                        ))}
                                      </div>
                                      <span className="text-[11px] font-bold text-[#79746D] dark:text-gray-400">
                                        ({rev.rating} ★)
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-1">
                                    {/* Source Badge */}
                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                      rev.source?.toLowerCase().includes('google')
                                        ? 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800'
                                        : rev.source?.toLowerCase().includes('insta')
                                        ? 'text-pink-700 dark:text-pink-300 bg-pink-50 dark:bg-pink-950/40 border-pink-200 dark:border-pink-800'
                                        : rev.source?.toLowerCase().includes('walk') || rev.source?.toLowerCase().includes('salon')
                                        ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800'
                                        : 'text-[#9C753D] dark:text-[#C29F67] bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
                                    }`}>
                                      {rev.source?.toLowerCase().includes('google') ? (
                                        <MapPin className="w-3 h-3" />
                                      ) : (
                                        <MessageSquare className="w-3 h-3" />
                                      )}
                                      <span>{rev.source || 'Customer Review'}</span>
                                    </span>

                                    {/* Status Badge */}
                                    {status === 'approved' && (
                                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                        ✓ Approved & Public
                                      </span>
                                    )}
                                    {status === 'pending' && (
                                      <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700">
                                        ⏳ Pending Moderation
                                      </span>
                                    )}
                                    {status === 'hidden' && (
                                      <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full border border-gray-200 dark:border-white/10">
                                        Hidden
                                      </span>
                                    )}
                                    {status === 'rejected' && (
                                      <span className="text-[10px] font-bold text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-800">
                                        Rejected
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Review Content */}
                                <p className="text-xs text-[#1C1B1A]/85 dark:text-gray-200 italic leading-relaxed bg-[#FAF7F2] dark:bg-white/5 p-3 rounded-xl border border-[#E6D4BA]/30 dark:border-white/5">
                                  "{rev.reviewText}"
                                </p>

                                {/* Meta details */}
                                <div className="flex items-center justify-between text-[11px] text-[#79746D] dark:text-gray-400 pt-1">
                                  <span>Date: {rev.reviewDate || 'Recent'}</span>
                                  <div className="flex items-center gap-2">
                                    {rev.isVerified ? (
                                      <span className="text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                                        <ShieldCheck className="w-3 h-3" />
                                        <span>Verified Client</span>
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">Unverified</span>
                                    )}
                                    {rev.sourceUrl && (
                                      <a
                                        href={rev.sourceUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-[#9C753D] dark:text-[#C29F67] hover:underline flex items-center gap-0.5"
                                        title="View original Google review link"
                                      >
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons Toolbar */}
                              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10 text-xs">
                                <div className="flex items-center gap-1.5">
                                  {status !== 'approved' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateReviewStatus(rev.id, 'approved')}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shadow-2xs"
                                    >
                                      <CheckCircle className="w-3 h-3" />
                                      <span>Approve & Publish</span>
                                    </button>
                                  )}
                                  {status === 'approved' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateReviewStatus(rev.id, 'hidden')}
                                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/15 text-gray-700 dark:text-gray-200 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                                      title="Hide review from public display"
                                    >
                                      <EyeOff className="w-3 h-3" />
                                      <span>Hide</span>
                                    </button>
                                  )}
                                  {status === 'pending' && (
                                    <button
                                      type="button"
                                      onClick={() => handleUpdateReviewStatus(rev.id, 'rejected')}
                                      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg text-[11px] font-semibold flex items-center gap-1 cursor-pointer border border-red-200 dark:border-red-800"
                                    >
                                      <XCircle className="w-3 h-3" />
                                      <span>Reject</span>
                                    </button>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEditReview(rev)}
                                    className="p-1.5 text-gray-500 hover:text-[#1C1B1A] dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                                    title="Edit review"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteReview(rev.id, rev.authorName)}
                                    className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
                                    title="Delete review"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* TAB: EMAIL ACCOUNTS & ROLE HUB */}
              {activeTab === 'emails' && (
                <div className="space-y-6 max-w-4xl">
                  {/* Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-serif text-[#1C1B1A] dark:text-white font-bold">
                          Email Accounts &amp; Role Hub
                        </h3>
                        <span className="text-[11px] font-bold bg-[#C29F67]/20 text-[#9C753D] dark:text-[#E6D4BA] px-2.5 py-0.5 rounded-full">
                          Role Separation Active
                        </span>
                      </div>
                      <p className="text-xs text-[#79746D] dark:text-gray-400 mt-0.5">
                        Audit and manage all email addresses in use across B&amp;B Family Salon. Every role is strictly separated: booking notifications are only sent to the allotted email, leaving personal and registration emails untouched.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setLoadingEmailHub(true);
                        api.getEmailHub().then(setEmailHub).finally(() => setLoadingEmailHub(false));
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg hover:bg-gray-50 dark:hover:bg-white/10 transition-colors text-[#1C1B1A] dark:text-white cursor-pointer"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loadingEmailHub ? 'animate-spin' : ''}`} />
                      <span>Refresh Directory</span>
                    </button>
                  </div>

                  {/* Feedback Messages */}
                  {emailHubSaveMsg && (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{emailHubSaveMsg}</span>
                      </div>
                      <button type="button" onClick={() => setEmailHubSaveMsg('')} className="cursor-pointer">✕</button>
                    </div>
                  )}

                  {testBookingAlertResult && (
                    <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between shadow-xs ${
                      testBookingAlertResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-800 text-red-900 dark:text-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        {testBookingAlertResult.success ? (
                          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span>{testBookingAlertResult.message}</span>
                      </div>
                      <button type="button" onClick={() => setTestBookingAlertResult(null)} className="cursor-pointer">✕</button>
                    </div>
                  )}

                  {/* Active Email Breakdown Grid (4 Cards) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* Role 1: Allotted Booking Email */}
                    <div className="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 border-2 border-[#C29F67] rounded-xl relative shadow-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#9C753D] dark:text-[#E6D4BA] flex items-center gap-1">
                          <Bell className="w-3.5 h-3.5 text-[#C29F67]" />
                          Booking Alerts
                        </span>
                        <span className="text-[10px] font-bold bg-[#C29F67] text-white px-1.5 py-0.2 rounded">
                          Allotted
                        </span>
                      </div>
                      <p className="text-xs font-mono font-bold text-[#1C1B1A] dark:text-white truncate" title={emailHub?.bookingAlertEmail || 'Not set'}>
                        {emailHub?.bookingAlertEmail || 'Not Configured'}
                      </p>
                      <p className="text-[11px] text-[#79746D] dark:text-gray-400 mt-1">
                        Only this email receives customer reservations &amp; cancellation cards.
                      </p>
                    </div>

                    {/* Role 2: Admin Registration / Login Email */}
                    <div className="p-3.5 bg-white dark:bg-white/5 border border-blue-200 dark:border-blue-900/50 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" />
                          Admin Login
                        </span>
                        <span className="text-[10px] font-semibold bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 px-1.5 py-0.2 rounded">
                          Console
                        </span>
                      </div>
                      <p className="text-xs font-mono font-bold text-[#1C1B1A] dark:text-white truncate" title={emailHub?.adminLoginEmail || 'admin'}>
                        {emailHub?.adminLoginEmail || 'admin'}
                      </p>
                      <p className="text-[11px] text-[#79746D] dark:text-gray-400 mt-1">
                        Used by admin to log in. Does NOT receive booking alerts.
                      </p>
                    </div>

                    {/* Role 3: Public Contact Email */}
                    <div className="p-3.5 bg-white dark:bg-white/5 border border-purple-200 dark:border-purple-900/50 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400 flex items-center gap-1">
                          <User className="w-3.5 h-3.5" />
                          Public Contact
                        </span>
                        <span className="text-[10px] font-semibold bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300 px-1.5 py-0.2 rounded">
                          Clients
                        </span>
                      </div>
                      <p className="text-xs font-mono font-bold text-[#1C1B1A] dark:text-white truncate" title={emailHub?.publicContactEmail || 'Not set'}>
                        {emailHub?.publicContactEmail || 'Not Configured'}
                      </p>
                      <p className="text-[11px] text-[#79746D] dark:text-gray-400 mt-1">
                        Shown to customers in site header, footer, &amp; contact modal.
                      </p>
                    </div>

                    {/* Role 4: SMTP Live Mailer */}
                    <div className="p-3.5 bg-white dark:bg-white/5 border border-emerald-200 dark:border-emerald-900/50 rounded-xl shadow-xs">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          SMTP Mailer
                        </span>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                          emailHub?.smtpConfigured
                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300'
                            : 'bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300'
                        }`}>
                          {emailHub?.smtpConfigured ? 'Active' : 'Unconfigured'}
                        </span>
                      </div>
                      <p className="text-xs font-mono font-bold text-[#1C1B1A] dark:text-white truncate" title={emailHub?.smtpUser || 'Not set'}>
                        {emailHub?.smtpUser || 'Not Configured'}
                      </p>
                      <p className="text-[11px] text-[#79746D] dark:text-gray-400 mt-1">
                        Google SMTP user used to deliver OTPs &amp; confirmation cards.
                      </p>
                    </div>
                  </div>

                  {/* SECTION 1: DEDICATED AREA SET EMAIL FOR BOOKING UPDATES */}
                  <div className="p-5 bg-gradient-to-br from-amber-50/80 to-[#FAF7F2] dark:from-amber-950/20 dark:to-white/5 border-2 border-[#C29F67] rounded-2xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E6D4BA]/80 dark:border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#C29F67] text-white flex items-center justify-center shrink-0 shadow-xs">
                          <Bell className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white">
                            Allotted Email for Booking Updates &amp; Reservations
                          </h4>
                          <p className="text-[11px] text-[#79746D] dark:text-gray-300">
                            Strict single-recipient isolation. Notifications are sent ONLY here.
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-bold text-[#9C753D] dark:text-[#E6D4BA] bg-white dark:bg-white/10 px-2.5 py-1 rounded-lg border border-[#E6D4BA] dark:border-white/10 w-fit">
                        ✓ Isolated From Admin Login Email
                      </span>
                    </div>

                    <div className="space-y-3">
                      <p className="text-xs text-[#1C1B1A] dark:text-gray-200 leading-relaxed">
                        Whenever a customer books an appointment, cancels, or reschedules online, the system dispatches the booking alert <strong>exclusively to this single email address</strong>. Your personal login email and other admin accounts will not receive these alerts.
                      </p>

                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="flex-1 relative">
                          <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                          <input
                            type="email"
                            required
                            value={emailHub?.bookingAlertEmail || ''}
                            onChange={(e) => {
                              if (emailHub) {
                                setEmailHub({ ...emailHub, bookingAlertEmail: e.target.value });
                              }
                            }}
                            placeholder="e.g. bookings@bnbfamilysalon.com or salon.owner@gmail.com"
                            className="w-full pl-10 pr-3.5 py-2.5 bg-white dark:bg-white/10 border border-gray-300 dark:border-white/20 rounded-xl text-xs text-[#1C1B1A] dark:text-white font-mono font-bold focus:border-[#C29F67] outline-hidden shadow-xs"
                          />
                        </div>

                        <button
                          type="button"
                          disabled={savingEmailHub}
                          onClick={() => handleSaveEmailHub()}
                          className="px-5 py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          <span>{savingEmailHub ? 'Saving...' : 'Save Allotted Email'}</span>
                        </button>

                        <button
                          type="button"
                          disabled={testingBookingAlert}
                          onClick={handleTestBookingAlert}
                          className="px-4 py-2.5 bg-[#1C1B1A] dark:bg-white/15 hover:bg-[#2A2826] text-white text-xs font-semibold rounded-xl transition-colors shrink-0 flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                          title="Sends a test booking card alert directly to this email"
                        >
                          <Send className={`w-3.5 h-3.5 ${testingBookingAlert ? 'animate-bounce' : ''}`} />
                          <span>{testingBookingAlert ? 'Testing...' : 'Send Test Alert'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* SECTION 2: GRANULAR ROLE SEPARATION & SETTINGS */}
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-white/10 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center text-[#9C753D] dark:text-[#C29F67]">
                        <Sliders className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white">
                          Granular Role Configuration &amp; Outgoing Mailer
                        </h4>
                        <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                          Configure customer contact details and authenticated outgoing SMTP credentials.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleSaveEmailHub} className="space-y-4" autoComplete="off">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Public Contact Email */}
                        <div>
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            Public Salon Contact Email (Client-Facing) *
                          </label>
                          <input
                            type="email"
                            required
                            value={emailHub?.publicContactEmail || ''}
                            onChange={(e) => {
                              if (emailHub) {
                                setEmailHub({ ...emailHub, publicContactEmail: e.target.value });
                              }
                            }}
                            placeholder="contact@bnbfamilysalon.com"
                            className="w-full px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-[#1C1B1A] dark:text-white font-mono outline-hidden"
                          />
                          <p className="text-[10px] text-[#79746D] dark:text-gray-400 mt-1">
                            Displayed on website header, footer, &amp; contact card for customer queries.
                          </p>
                        </div>

                        {/* Admin Login Email */}
                        <div>
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            Primary Admin Login Email (Account Access) *
                          </label>
                          <input
                            type="email"
                            required
                            value={emailHub?.adminLoginEmail || ''}
                            onChange={(e) => {
                              if (emailHub) {
                                setEmailHub({ ...emailHub, adminLoginEmail: e.target.value });
                              }
                            }}
                            placeholder="admin@bnbfamilysalon.com"
                            className="w-full px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-[#1C1B1A] dark:text-white font-mono outline-hidden"
                          />
                          <p className="text-[10px] text-[#79746D] dark:text-gray-400 mt-1">
                            Username: <strong>{emailHub?.adminUsername || 'admin'}</strong>. Used strictly to sign in.
                          </p>
                        </div>

                        {/* Outgoing SMTP Gmail Address */}
                        <div>
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            Outgoing SMTP Gmail Account (Nodemailer Sender) *
                          </label>
                          <input
                            type="email"
                            value={emailHub?.smtpUser || ''}
                            onChange={(e) => {
                              if (emailHub) {
                                setEmailHub({ ...emailHub, smtpUser: e.target.value });
                              }
                            }}
                            placeholder="sender.bot@gmail.com"
                            className="w-full px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-[#1C1B1A] dark:text-white font-mono outline-hidden"
                          />
                          <p className="text-[10px] text-[#79746D] dark:text-gray-400 mt-1">
                            The Google account authenticated to send OTPs &amp; customer cards.
                          </p>
                        </div>

                        {/* Google App Password with Show/Hide Eye Button */}
                        <div>
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            Google App Password (16 Characters)
                          </label>
                          <div className="relative">
                            <input
                              type={showEmailHubSmtpPassword ? 'text' : 'password'}
                              value={emailHubSmtpPassword}
                              onChange={(e) => setEmailHubSmtpPassword(e.target.value)}
                              placeholder={emailHub?.smtpConfigured ? '•••• •••• •••• •••• (Configured & Saved)' : 'Enter 16-character Google App Password'}
                              className="w-full pl-3.5 pr-10 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-xl text-xs text-[#1C1B1A] dark:text-white font-mono outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => setShowEmailHubSmtpPassword(!showEmailHubSmtpPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                              tabIndex={-1}
                              aria-label={showEmailHubSmtpPassword ? 'Hide password' : 'Show password'}
                              title={showEmailHubSmtpPassword ? 'Hide password' : 'Show password'}
                            >
                              {showEmailHubSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-[#79746D] dark:text-gray-400 mt-1">
                            Leave blank to preserve existing configured Google App Password.
                          </p>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          disabled={savingEmailHub}
                          className="px-6 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          <span>{savingEmailHub ? 'Saving Roles...' : 'Save Role Configuration'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* SECTION 3: REGISTERED ADMIN DIRECTORY */}
                  <div className="bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl p-5 shadow-xs space-y-3">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 flex items-center justify-center text-[#9C753D] dark:text-[#C29F67]">
                          <Users className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white">
                            Registered Administrator Accounts
                          </h4>
                          <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                            Listing of all administrator accounts authorized to access the management console.
                          </p>
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 px-2.5 py-0.5 rounded-full">
                        {emailHub?.adminUsers?.length || 1} Account{(emailHub?.adminUsers?.length || 1) > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-white/10 text-[#79746D] dark:text-gray-400">
                            <th className="py-2.5 px-3 font-semibold">Username</th>
                            <th className="py-2.5 px-3 font-semibold">Registered Email</th>
                            <th className="py-2.5 px-3 font-semibold">Role</th>
                            <th className="py-2.5 px-3 font-semibold text-right">Protection</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-[#1C1B1A] dark:text-gray-200">
                          {emailHub?.adminUsers && emailHub.adminUsers.length > 0 ? (
                            emailHub.adminUsers.map((u, idx) => (
                              <tr key={u.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                                <td className="py-2.5 px-3 font-bold font-mono text-[#9C753D] dark:text-[#C29F67]">
                                  {u.username}
                                </td>
                                <td className="py-2.5 px-3 font-mono font-medium">
                                  {u.email}
                                </td>
                                <td className="py-2.5 px-3">
                                  <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF7F2] dark:bg-white/10 text-[#9C753D] dark:text-[#E6D4BA] border border-[#E6D4BA] dark:border-white/10">
                                    {u.role || 'Super Admin'}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Active &amp; Encrypted
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="py-2.5 px-3 font-bold font-mono text-[#9C753D] dark:text-[#C29F67]">
                                {emailHub?.adminUsername || 'admin'}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-medium">
                                {emailHub?.adminLoginEmail || 'admin@bbfamilysalon.com'}
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF7F2] dark:bg-white/10 text-[#9C753D] dark:text-[#E6D4BA] border border-[#E6D4BA] dark:border-white/10">
                                  Super Admin
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                  Active &amp; Encrypted
                                </span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* SECTION 4: SALON OWNERSHIP HANDOVER TOOL (TRANSFER TO BNB FAMILY SALON OWNER) */}
                  <div className="bg-gradient-to-br from-purple-50/60 to-indigo-50/60 dark:from-purple-950/20 dark:to-indigo-950/20 border-2 border-purple-300 dark:border-purple-800 rounded-2xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-2.5 border-b border-purple-200 dark:border-purple-900/40 pb-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <ArrowLeftRight className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white">
                          Website Ownership Handover &amp; Transfer to BNB Family Salon Owner
                        </h4>
                        <p className="text-[11px] text-[#79746D] dark:text-gray-300">
                          Selling or transferring the website? Remove your personal email addresses and replace them with the owner&apos;s email in 1 click.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-xs text-[#1C1B1A] dark:text-gray-200 leading-relaxed">
                        When handing over this website to the Owner of <strong>B&amp;B Family Salon</strong>, enter their email address below. You can select which email roles to reassign. This completely detaches your personal email address and saves the new owner&apos;s email permanently to both local disk and Supabase Cloud.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            New Salon Owner Email * (Owner of B&amp;B Family Salon)
                          </label>
                          <input
                            type="email"
                            required
                            value={handoverOwnerEmail}
                            onChange={(e) => setHandoverOwnerEmail(e.target.value)}
                            placeholder="e.g. owner@bnbfamilysalon.com or real owner Gmail"
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-white/10 border border-purple-300 dark:border-purple-700 rounded-xl text-xs text-[#1C1B1A] dark:text-white font-mono font-semibold outline-hidden shadow-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                            New Salon Owner Full Name / Username (Optional)
                          </label>
                          <input
                            type="text"
                            value={handoverOwnerName}
                            onChange={(e) => setHandoverOwnerName(e.target.value)}
                            placeholder="e.g. B&B Salon Owner"
                            className="w-full px-3.5 py-2.5 bg-white dark:bg-white/10 border border-purple-300 dark:border-purple-700 rounded-xl text-xs text-[#1C1B1A] dark:text-white outline-hidden shadow-xs"
                          />
                        </div>
                      </div>

                      {/* Role Transfer Checklist */}
                      <div className="p-3.5 bg-white/80 dark:bg-black/20 border border-purple-200 dark:border-purple-900/30 rounded-xl space-y-2">
                        <span className="block text-xs font-bold text-[#1C1B1A] dark:text-white mb-1">
                          Roles to Transfer to New Salon Owner:
                        </span>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30">
                            <input
                              type="checkbox"
                              checked={handoverBookingAlert}
                              onChange={(e) => setHandoverBookingAlert(e.target.checked)}
                              className="accent-purple-600 rounded"
                            />
                            <span className="font-semibold text-[#1C1B1A] dark:text-white">Allotted Booking Updates Email</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30">
                            <input
                              type="checkbox"
                              checked={handoverPublicContact}
                              onChange={(e) => setHandoverPublicContact(e.target.checked)}
                              className="accent-purple-600 rounded"
                            />
                            <span className="font-semibold text-[#1C1B1A] dark:text-white">Public Salon Contact Email</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30">
                            <input
                              type="checkbox"
                              checked={handoverAdminLogin}
                              onChange={(e) => setHandoverAdminLogin(e.target.checked)}
                              className="accent-purple-600 rounded"
                            />
                            <span className="font-semibold text-[#1C1B1A] dark:text-white">Primary Admin Login Email</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-purple-50 dark:hover:bg-purple-950/30">
                            <input
                              type="checkbox"
                              checked={handoverSmtp}
                              onChange={(e) => setHandoverSmtp(e.target.checked)}
                              className="accent-purple-600 rounded"
                            />
                            <span className="font-semibold text-[#1C1B1A] dark:text-white">Live Outbound SMTP Account</span>
                          </label>
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => setHandoverConfirmModal(true)}
                          disabled={!handoverOwnerEmail || !handoverOwnerEmail.includes('@') || handoverExecuting}
                          className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                        >
                          <ArrowLeftRight className="w-4 h-4" />
                          <span>Transfer Ownership to BNB Family Salon</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Handover Confirmation Modal */}
                  {handoverConfirmModal && (
                    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
                      <div className="w-full max-w-md bg-white dark:bg-[#1C1B1A] border border-purple-300 dark:border-purple-800 rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3 text-purple-700 dark:text-purple-400">
                          <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950 flex items-center justify-center shrink-0">
                            <ArrowLeftRight className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="text-base font-bold text-[#1C1B1A] dark:text-white">
                              Confirm Website Ownership Handover
                            </h4>
                            <p className="text-xs text-[#79746D] dark:text-gray-400">
                              Permanent Handover to BNB Family Salon Owner
                            </p>
                          </div>
                        </div>

                        <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                          <p className="font-bold">You are about to reassign selected website email roles to:</p>
                          <p className="font-mono font-bold text-purple-700 dark:text-purple-300 break-all">{handoverOwnerEmail}</p>
                          <p className="text-[11px] text-[#79746D] dark:text-gray-300 pt-1">
                            Your personal email address will be replaced in all selected roles. Future customer bookings, client queries, and admin logins will route to the new salon owner.
                          </p>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setHandoverConfirmModal(false)}
                            disabled={handoverExecuting}
                            className="px-4 py-2 border border-gray-200 dark:border-white/10 text-xs font-semibold rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-[#1C1B1A] dark:text-white cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleExecuteOwnershipHandover}
                            disabled={handoverExecuting}
                            className="px-5 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {handoverExecuting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            <span>{handoverExecuting ? 'Executing Handover...' : 'Confirm & Apply Handover'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: SALON SETTINGS */}
              {activeTab === 'settings' && settings && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-xl font-serif text-[#1C1B1A] dark:text-white font-bold">Salon & Booking Settings</h3>
                    <p className="text-xs text-[#79746D] dark:text-gray-400">
                      Update business contact details, location landmarks, and booking engine preferences.
                    </p>
                  </div>

                  {settingsSaveMsg && (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{settingsSaveMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingsSaveMsg('')}
                        className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* SECTION 1: SALON CONTACT DETAILS */}
                  <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl p-5 shadow-xs space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
                        <h4 className="font-bold text-sm text-[#1C1B1A] dark:text-white">
                          Salon Brand & Contact Details
                        </h4>
                      </div>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                        Live on Customer View
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">Salon Name *</label>
                        <input
                          type="text"
                          value={settings.salonName}
                          onChange={(e) => setSettings({ ...settings, salonName: e.target.value })}
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">Alternate / Short Name</label>
                        <input
                          type="text"
                          value={settings.alternateName}
                          onChange={(e) => setSettings({ ...settings, alternateName: e.target.value })}
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">Customer Contact Phone *</label>
                        <input
                          type="text"
                          value={settings.phone}
                          onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                          placeholder="+91 91316 29031"
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs font-semibold text-[#1C1B1A] dark:text-white"
                        />
                        <p className="text-[10px] text-[#79746D] dark:text-gray-400 mt-1">
                          Displayed on website header, footer, booking screen, and click-to-call buttons.
                        </p>
                      </div>
                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">Contact Email / Gmail *</label>
                        <input
                          type="email"
                          value={settings.email}
                          onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                          placeholder="contact@bbfamilysalon.com"
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                        />
                        <p className="text-[10px] text-[#79746D] dark:text-gray-400 mt-1">
                          Official salon email for inquiries and reservation notifications.
                        </p>
                      </div>
                    </div>

                    {/* Integrated WhatsApp Messenger Admin Phone */}
                    <div className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-xl space-y-2">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-bold text-xs">
                          Admin WhatsApp Messenger Phone Number
                        </label>
                      </div>
                      <input
                        type="text"
                        placeholder="+91 91316 29031"
                        value={settings.adminWhatsAppPhone || settings.phone || ''}
                        onChange={(e) => setSettings({ ...settings, adminWhatsAppPhone: e.target.value })}
                        className="w-full px-3 py-2 bg-white dark:bg-white/10 border border-emerald-300 dark:border-emerald-700 rounded-lg text-xs font-mono font-semibold text-[#1C1B1A] dark:text-white"
                      />
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                        Customers can directly chat with this WhatsApp number regarding their bookings.
                      </p>
                    </div>

                    {/* Direct Save Contact Details Button */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveContactDetails}
                        className="px-5 py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Contact Details</span>
                      </button>
                    </div>
                  </div>

                  {/* SECTION 2: SALON LOCATION & ADDRESS (EASY MODE - NO LATITUDE / LONGITUDE) */}
                  <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl p-5 shadow-xs space-y-4 text-xs">
                    <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
                        <h4 className="font-bold text-sm text-[#1C1B1A] dark:text-white">
                          Salon Location & Google Maps (Simple Address)
                        </h4>
                      </div>
                      <span className="text-[10px] text-[#9C753D] dark:text-[#C29F67] font-bold uppercase tracking-wider">
                        Easy Setup • No Lat/Long Needed
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">
                          Full Street Address *
                        </label>
                        <input
                          type="text"
                          value={settings.address}
                          onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                          placeholder="2nd Floor, Ultimate Arcade, F11-12, Kolar Road"
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">
                          Nearby Landmarks *
                        </label>
                        <input
                          type="text"
                          value={settings.landmarks}
                          onChange={(e) => setSettings({ ...settings, landmarks: e.target.value })}
                          placeholder="Near Sagar Gaire and Vishal Mega Mart"
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">City</label>
                        <input
                          type="text"
                          value={settings.city || 'Bhopal'}
                          onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">State</label>
                        <input
                          type="text"
                          value={settings.state || 'Madhya Pradesh'}
                          onChange={(e) => setSettings({ ...settings, state: e.target.value })}
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">Pincode</label>
                        <input
                          type="text"
                          value={settings.pincode || '462042'}
                          onChange={(e) => setSettings({ ...settings, pincode: e.target.value })}
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                        />
                      </div>
                    </div>

                    {/* Quick Bhopal Area Presets */}
                    <div className="p-3 bg-[#FAF7F2] dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 space-y-2">
                      <span className="block text-[11px] font-bold text-[#1C1B1A] dark:text-white">
                        Quick Location Selectors (Click to fill address & landmark):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { name: '📍 Ultimate Arcade, Kolar Road (Main)', addr: '2nd Floor, Ultimate Arcade, F11-12, Kolar Road', lm: 'Near Sagar Gaire & Vishal Mega Mart', city: 'Bhopal' },
                          { name: '📍 MP Nagar Zone 2', addr: 'Zone II, Maharana Pratap Nagar', lm: 'Near Jyoti Cineplex', city: 'Bhopal' },
                          { name: '📍 10 No. Market, Arera Colony', addr: '10 No. Stop, E-4, Arera Colony', lm: 'Near Sai Board', city: 'Bhopal' },
                          { name: '📍 Hoshangabad Rd / Aashima', addr: 'Hoshangabad Road', lm: 'Near Aashima Mall & Misrod', city: 'Bhopal' },
                          { name: '📍 New Market / TT Nagar', addr: 'Top Floor, GTB Complex, New Market', lm: 'Near Roshanpura', city: 'Bhopal' }
                        ].map((loc, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSettings({
                                ...settings,
                                address: loc.addr,
                                landmarks: loc.lm,
                                city: loc.city
                              });
                            }}
                            className="px-2.5 py-1 text-[11px] bg-white dark:bg-white/10 hover:bg-[#E6D4BA]/60 dark:hover:bg-white/20 border border-gray-200 dark:border-white/20 rounded-md font-semibold text-[#1C1B1A] dark:text-white transition-colors cursor-pointer"
                          >
                            {loc.name}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Live Google Maps Preview based on Address (No Lat/Lng Needed!) */}
                    <div className="space-y-1.5">
                      <span className="block text-[11px] font-bold text-[#1C1B1A] dark:text-white">
                        Live Google Maps Customer Embed Preview:
                      </span>
                      <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xs aspect-[16/7] relative bg-gray-100 dark:bg-black/30">
                        <iframe
                          title="Admin Map Preview"
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(`${settings.address || '2nd Floor, Ultimate Arcade, F11-12, Kolar Road'}, ${settings.landmarks || ''}, ${settings.city || 'Bhopal'}`)}&t=&z=16&ie=UTF8&iwloc=&output=embed`}
                          width="100%"
                          height="100%"
                          className="w-full h-full border-0"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2 bg-black/75 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded font-medium">
                          📍 {settings.address || 'Kolar Road, Bhopal'} ({settings.city || 'Bhopal'})
                        </div>
                      </div>
                    </div>

                    {/* Direct Save Location Details Button */}
                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveLocation}
                        className="px-5 py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Location Details</span>
                      </button>
                    </div>
                  </div>

                  {/* SECTION 3: OPERATIONAL & PHOTO DISPLAY SETTINGS */}
                  <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl p-5 shadow-xs space-y-4 text-xs">
                    <div className="flex items-center gap-2 border-b border-gray-100 dark:border-white/10 pb-3">
                      <Sliders className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
                      <h4 className="font-bold text-sm text-[#1C1B1A] dark:text-white">
                        Photo Display & Booking Automation
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">
                          Gallery Photo Text Size
                        </label>
                        <select
                          value={settings.photoTextSize || 'large'}
                          onChange={(e) => setSettings({ ...settings, photoTextSize: e.target.value as any })}
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                        >
                          <option value="small">Small Typography</option>
                          <option value="medium">Medium Typography</option>
                          <option value="large">Large Bold Typography (Recommended)</option>
                          <option value="extralarge">Extra Large / Massive Bold Typography</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">
                          Gallery Text Arrangement Style
                        </label>
                        <select
                          value={settings.photoTextArrangement || 'card-below'}
                          onChange={(e) => setSettings({ ...settings, photoTextArrangement: e.target.value as any })}
                          className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                        >
                          <option value="card-below">Card Below Photo (Always Visible Text)</option>
                          <option value="overlay-bottom">Overlay at Bottom (Gradient Backdrop)</option>
                          <option value="overlay-center">Overlay Centered (Luxury Glass Effect)</option>
                          <option value="badge-minimal">Minimalist Top Badges</option>
                        </select>
                      </div>
                    </div>

                    {/* SECTION: BOOKING AUTOMATION & OPERATIONAL SETTINGS */}
                    <div className="pt-2 border-t border-gray-100 dark:border-white/10 space-y-4">
                      {/* DEDICATED AUTOMATIC BOOKING CONFIRMATION SETTING CARD */}
                      <div className="bg-gradient-to-r from-amber-50/80 to-[#FAF7F2] dark:from-amber-950/20 dark:to-white/5 border-2 border-[#C29F67]/50 dark:border-[#C29F67]/40 rounded-xl p-4 shadow-2xs space-y-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[#E6D4BA]/60 dark:border-white/10">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-[#C29F67]" />
                            <h5 className="font-bold text-xs uppercase tracking-wider text-[#1C1B1A] dark:text-white">
                              Automatic Booking Confirmation Setting
                            </h5>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider self-start sm:self-auto ${
                            settings.autoConfirmBookings
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                              : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          }`}>
                            {settings.autoConfirmBookings ? '✓ Mode: Auto-Confirmed' : '⏳ Mode: Manual Review (Pending)'}
                          </span>
                        </div>

                        <label className="flex items-start gap-3 p-3 bg-white dark:bg-[#1A1918] rounded-lg border border-gray-200 dark:border-white/10 cursor-pointer hover:border-[#C29F67] transition-colors">
                          <input
                            type="checkbox"
                            checked={Boolean(settings.autoConfirmBookings)}
                            onChange={(e) =>
                              setSettings({ ...settings, autoConfirmBookings: e.target.checked })
                            }
                            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#C29F67] focus:ring-[#C29F67] cursor-pointer"
                          />
                          <div className="text-xs space-y-1">
                            <span className="font-bold text-[#1C1B1A] dark:text-white block">
                              Automatically confirm new customer reservations (Mark as 'Confirmed' immediately)
                            </span>
                            <p className="text-[11px] text-[#79746D] dark:text-gray-400 leading-relaxed">
                              {settings.autoConfirmBookings ? (
                                <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                  ✓ <strong>Enabled:</strong> New bookings from any device or browser are instantly marked as <strong>Confirmed</strong>. Customers receive a confirmed booking email and WhatsApp card.
                                </span>
                              ) : (
                                <span className="text-amber-700 dark:text-amber-400 font-medium">
                                  ⏳ <strong>Disabled:</strong> New bookings default to <strong>Pending</strong> status for manual salon admin review. Customers receive a Pending request receipt without false confirmation.
                                </span>
                              )}
                            </p>
                          </div>
                        </label>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                          <p className="text-[10px] text-[#79746D] dark:text-gray-400">
                            Synchronized permanently with Supabase <code className="font-mono bg-white dark:bg-white/10 px-1 py-0.5 rounded">settings.auto_confirm_bookings</code>.
                          </p>
                          <button
                            type="button"
                            onClick={handleSaveAutoConfirmSetting}
                            className="px-4 py-2 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                          >
                            <Save className="w-3.5 h-3.5" />
                            <span>Save Confirmation Setting</span>
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">
                            Cancellation Cutoff Deadline (Hours before appointment) *
                          </label>
                          <input
                            type="number"
                            min="0"
                            max="72"
                            value={settings.cancellationDeadlineHours ?? 2}
                            onChange={(e) =>
                              setSettings({
                                ...settings,
                                cancellationDeadlineHours: Math.max(0, parseInt(e.target.value, 10) || 0)
                              })
                            }
                            className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white font-mono font-semibold"
                          />
                          <p className="text-[11px] text-[#79746D] dark:text-gray-400 mt-1">
                            Clients can cancel online up to this cutoff (default: 2 hours). Within cutoff, they are prompted to call reception.
                          </p>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold text-xs">
                              Allotted Booking Updates Email (Exclusive Alert Recipient) *
                            </label>
                            <button
                              type="button"
                              onClick={() => setActiveTab('emails')}
                              className="text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline font-bold cursor-pointer"
                            >
                              Manage All Email Roles →
                            </button>
                          </div>
                          <input
                            type="email"
                            value={settings.adminNotificationEmail || ''}
                            onChange={(e) =>
                              setSettings({ ...settings, adminNotificationEmail: e.target.value })
                            }
                            placeholder="e.g. bookings@bnbfamilysalon.com or salon.owner@gmail.com"
                            className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white font-mono font-semibold"
                          />
                          <p className="text-[11px] text-[#79746D] dark:text-gray-400 mt-1">
                            Only this email receives real-time reservation and cancellation cards. Registration emails are strictly excluded unless entered here.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* ADMIN APPEARANCE & THEME INDEPENDENCE */}
                    <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#FAF7F2] dark:bg-white/5 p-3 rounded-xl border border-[#E6D4BA]/60 dark:border-white/10">
                        <div>
                          <h5 className="font-bold text-xs text-[#1C1B1A] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#C29F67]" />
                            <span>Admin Portal Appearance (Isolated Theme)</span>
                          </h5>
                          <p className="text-[11px] text-[#79746D] dark:text-gray-400 mt-0.5">
                            Your admin dashboard theme is personal to you and does not alter customer or website themes. Currently: <strong>{adminTheme === 'dark' ? 'Dark Mode' : 'Light Mode'}</strong>
                          </p>
                        </div>
                        {onAdminThemeToggle && (
                          <button
                            type="button"
                            onClick={onAdminThemeToggle}
                            className="px-3.5 py-1.5 bg-white dark:bg-white/10 border border-[#E6D4BA] dark:border-white/20 rounded-lg text-xs font-bold text-[#1C1B1A] dark:text-white flex items-center gap-1.5 cursor-pointer shadow-2xs hover:bg-[#FAF7F2] dark:hover:bg-white/15 transition-colors whitespace-nowrap self-start sm:self-auto"
                          >
                            {adminTheme === 'dark' ? <Sun className="w-3.5 h-3.5 text-[#C29F67]" /> : <Moon className="w-3.5 h-3.5 text-[#9C753D]" />}
                            <span>Switch to {adminTheme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* SECTION 4: REAL GMAIL SMTP & NOTIFICATION SYSTEM */}
                    <div className="pt-3 border-t border-gray-100 dark:border-white/10 space-y-3">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
                        <h5 className="font-bold text-xs text-[#1C1B1A] dark:text-white uppercase tracking-wider">
                          Live Gmail SMTP Delivery & OTP Dispatch
                        </h5>
                      </div>
                      <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                        Configure your salon Gmail account to dispatch live OTP verification emails and official Booking Confirmation Cards directly to customer and admin Gmail inboxes. (If not configured, OTP codes are still safely provided via instant on-screen verification).
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">
                            Dispatch Gmail Account (Email ID)
                          </label>
                          <input
                            type="email"
                            value={settings.gmailUser || ''}
                            onChange={(e) => setSettings({ ...settings, gmailUser: e.target.value })}
                            placeholder="e.g. bbfamilysalon@gmail.com"
                            className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-[#1C1B1A] dark:text-gray-200 font-semibold mb-1">
                            Google App Password (16 Characters)
                          </label>
                          <div className="relative">
                            <input
                              type={showSmtpAppPassword ? 'text' : 'password'}
                              value={settings.gmailAppPassword || ''}
                              onChange={(e) => setSettings({ ...settings, gmailAppPassword: e.target.value })}
                              placeholder="xxxx xxxx xxxx xxxx"
                              className="w-full pl-3 pr-10 py-2 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white font-mono"
                            />
                            <button
                              type="button"
                              onClick={() => setShowSmtpAppPassword(!showSmtpAppPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded transition-colors cursor-pointer"
                              tabIndex={-1}
                              aria-label={showSmtpAppPassword ? 'Hide password' : 'Show password'}
                              title={showSmtpAppPassword ? 'Hide password' : 'Show password'}
                            >
                              {showSmtpAppPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="p-3 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                            Test Email Delivery:
                          </span>
                          <div className="flex items-center gap-2">
                            <input
                              type="email"
                              value={testEmailTarget}
                              onChange={(e) => setTestEmailTarget(e.target.value)}
                              placeholder="Test recipient Gmail"
                              className="px-2.5 py-1 text-xs bg-white dark:bg-black/30 border border-amber-300 dark:border-amber-700 rounded-md text-[#1C1B1A] dark:text-white outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={handleTestGmailDelivery}
                              disabled={testingEmail}
                              className="px-3 py-1 bg-[#1C1B1A] dark:bg-[#C29F67] text-white text-[11px] font-bold rounded-md cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            >
                              {testingEmail ? 'Testing...' : 'Send Test Email'}
                            </button>
                          </div>
                        </div>
                        {testEmailResult && (
                          <p className="text-[11px] font-semibold text-amber-950 dark:text-amber-100 bg-white/60 dark:bg-black/30 p-2 rounded">
                            {testEmailResult}
                          </p>
                        )}
                        <p className="text-[10px] text-amber-800 dark:text-amber-400">
                          Tip: To generate a Google App Password, visit <strong>myaccount.google.com/apppasswords</strong> with 2-Step Verification enabled.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveSettings}
                        className="px-6 py-2.5 bg-[#1C1B1A] hover:bg-[#2A2826] dark:bg-[#C29F67] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save All Salon Settings</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB: SECURITY & PASSWORD (COMPLETE ADMIN LOGIN CREDENTIALS: GMAIL, USERNAME, PASSWORD) */}
              {activeTab === 'security' && (
                <div className="space-y-6 max-w-3xl pt-2">
                  <div>
                    <h3 className="text-xl font-serif text-[#1C1B1A] dark:text-white font-bold">Admin Login & Credentials</h3>
                    <p className="text-xs text-[#79746D] dark:text-gray-400">
                      Change every detail of your Admin account: Gmail address, Username, and Password.
                    </p>
                  </div>

                  {adminCredMsg && (
                    <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{adminCredMsg}</span>
                      </div>
                      <button type="button" onClick={() => setAdminCredMsg('')} className="cursor-pointer">✕</button>
                    </div>
                  )}

                  {adminCredError && (
                    <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{adminCredError}</span>
                      </div>
                      <button type="button" onClick={() => setAdminCredError('')} className="cursor-pointer">✕</button>
                    </div>
                  )}

                  {/* UNIFIED ADMIN CREDENTIALS CARD */}
                  <div className="bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl p-5 shadow-xs space-y-5">
                    <div className="flex items-center gap-2.5 border-b border-gray-100 dark:border-white/10 pb-3">
                      <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] dark:bg-white/10 border border-[#C29F67]/50 flex items-center justify-center text-[#9C753D] dark:text-[#C29F67]">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white">
                          Update Admin Login Gmail, Username & Password
                        </h4>
                        <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                          Modify any or all credentials below. Authenticate with your current password to save.
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleUpdateAdminCredentials} className="space-y-4 max-w-lg" autoComplete="off">
                      {/* Admin Username Field */}
                      <div>
                        <label className="block text-xs font-semibold text-[#1C1B1A] dark:text-gray-200 mb-1">
                          Admin Username
                        </label>
                        <input
                          type="text"
                          value={adminUsernameInput}
                          onChange={(e) => setAdminUsernameInput(e.target.value)}
                          placeholder="e.g. admin or bnb_manager"
                          className="w-full px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white font-semibold focus:border-[#C29F67] outline-hidden"
                        />
                        <p className="text-[10px] text-[#79746D] dark:text-gray-400 mt-1">
                          You can log into the admin dashboard using either this username or your Admin Gmail.
                        </p>
                      </div>

                      {/* Admin Gmail Field with OTP Verification */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-xs font-semibold text-[#1C1B1A] dark:text-gray-200">
                            Admin Login Gmail (Email)
                          </label>
                          <button
                            type="button"
                            onClick={handleSendAdminCredOtp}
                            disabled={adminCredSendingOtp || adminCredOtpCountdown > 0}
                            className="text-[11px] text-[#9C753D] dark:text-[#C29F67] hover:underline font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Mail className="w-3 h-3" />
                            <span>
                              {adminCredSendingOtp
                                ? 'Sending OTP...'
                                : adminCredOtpCountdown > 0
                                ? `Resend OTP (${adminCredOtpCountdown}s)`
                                : 'Verify Real Gmail via OTP'}
                            </span>
                          </button>
                        </div>
                        <input
                          type="email"
                          value={adminEmailInput}
                          onChange={(e) => setAdminEmailInput(e.target.value)}
                          placeholder="e.g. yourname@gmail.com"
                          className="w-full px-3.5 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white font-semibold focus:border-[#C29F67] outline-hidden"
                        />
                        {adminCredOtpSent && (
                          <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg space-y-1.5">
                            <span className="block text-[11px] font-bold text-amber-900 dark:text-amber-300">
                              Enter 6-digit OTP code sent to Gmail:
                            </span>
                            <input
                              type="text"
                              maxLength={6}
                              value={adminCredOtpInput}
                              onChange={(e) => setAdminCredOtpInput(e.target.value.replace(/\D/g, ''))}
                              placeholder="123456"
                              className="w-full px-3 py-1.5 bg-white dark:bg-black/40 border border-amber-300 dark:border-amber-700 rounded text-xs font-mono font-bold tracking-widest text-center"
                            />
                          </div>
                        )}
                      </div>

                      {/* Current Password Field (Required for authorization) */}
                      <div className="pt-2 border-t border-gray-100 dark:border-white/10">
                        <label className="block text-xs font-bold text-[#1C1B1A] dark:text-gray-200 mb-1">
                          Current Admin Password * <span className="text-red-500">(Required to save changes)</span>
                        </label>
                        <div className="relative">
                          <input
                            type={showAdminCredCurrentPassword ? 'text' : 'password'}
                            required
                            value={adminCurrentPasswordInput}
                            onChange={(e) => setAdminCurrentPasswordInput(e.target.value)}
                            placeholder="Enter your current password to authorize"
                            autoComplete="off"
                            className="w-full pl-3.5 pr-10 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden"
                          />
                          <button
                            type="button"
                            onClick={() => setShowAdminCredCurrentPassword(!showAdminCredCurrentPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                            tabIndex={-1}
                            aria-label={showAdminCredCurrentPassword ? 'Hide password' : 'Show password'}
                            title={showAdminCredCurrentPassword ? 'Hide password' : 'Show password'}
                          >
                            {showAdminCredCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Optional New Password Fields */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-semibold text-[#1C1B1A] dark:text-gray-200 mb-1">
                            New Password <span className="text-gray-400 font-normal">(Optional)</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showAdminCredNewPassword ? 'text' : 'password'}
                              minLength={6}
                              value={adminNewPasswordInput}
                              onChange={(e) => setAdminNewPasswordInput(e.target.value)}
                              placeholder="Leave blank to keep current"
                              autoComplete="new-password"
                              className="w-full pl-3.5 pr-10 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => setShowAdminCredNewPassword(!showAdminCredNewPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                              tabIndex={-1}
                              aria-label={showAdminCredNewPassword ? 'Hide password' : 'Show password'}
                              title={showAdminCredNewPassword ? 'Hide password' : 'Show password'}
                            >
                              {showAdminCredNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-[#1C1B1A] dark:text-gray-200 mb-1">
                            Confirm New Password
                          </label>
                          <div className="relative">
                            <input
                              type={showAdminCredConfirmPassword ? 'text' : 'password'}
                              minLength={6}
                              value={adminConfirmPasswordInput}
                              onChange={(e) => setAdminConfirmPasswordInput(e.target.value)}
                              placeholder="Re-enter new password"
                              autoComplete="new-password"
                              className="w-full pl-3.5 pr-10 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white focus:border-[#C29F67] outline-hidden"
                            />
                            <button
                              type="button"
                              onClick={() => setShowAdminCredConfirmPassword(!showAdminCredConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer"
                              tabIndex={-1}
                              aria-label={showAdminCredConfirmPassword ? 'Hide password' : 'Show password'}
                              title={showAdminCredConfirmPassword ? 'Hide password' : 'Show password'}
                            >
                              {showAdminCredConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3">
                        <button
                          type="submit"
                          disabled={updatingAdminCreds}
                          className="px-6 py-2.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" />
                          <span>{updatingAdminCreds ? 'Saving Changes...' : 'Save All Admin Login Details'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Permanent Single Admin Slot Protection */}
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-5 shadow-xs space-y-2">
                    <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300 font-semibold text-xs">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span>Permanent Single Administrator Protection Active</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                      Your single administrator account is permanently registered and secured with encryption. Your login credentials, contact info, operating hours, and blocked dates are saved permanently to disk and will never reset, even if the website is closed for hours or days.
                    </p>
                  </div>
                </div>
              )}

              {/* TAB 9: NOTIFICATIONS LOG */}
              {activeTab === 'notifications' && (
                <div className="space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-serif text-[#1C1B1A] dark:text-white font-bold">Notification Event Log</h3>
                        <span className="text-[11px] font-bold bg-[#C29F67]/20 text-[#9C753D] dark:text-[#E6D4BA] px-2.5 py-0.5 rounded-full">
                          {notifications.length} logged
                        </span>
                      </div>
                      <p className="text-xs text-[#79746D] dark:text-gray-400 mt-0.5">
                        Audit trail of outbound WhatsApp/SMS alerts generated on appointment bookings and rescheduling.
                      </p>
                    </div>

                    {notifications.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAllLogs}
                        className="self-start sm:self-auto px-3.5 py-2 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                        title="Permanently erase all notification logs"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Clear All Logs</span>
                      </button>
                    )}
                  </div>

                  <div className="p-4 bg-white dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl text-xs space-y-2">
                    <p className="font-semibold text-[#1C1B1A] dark:text-white">Integration Provider Architecture</p>
                    <p className="text-[#79746D] dark:text-gray-300">
                      Outbound messages are formatted and logged here. To deliver via live WhatsApp Cloud API or Twilio SMS, configure webhook credentials in settings or environment variables (<code className="font-mono bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded">WHATSAPP_TOKEN</code> / <code className="font-mono bg-gray-100 dark:bg-white/10 px-1 py-0.5 rounded">SMS_API_KEY</code>).
                    </p>
                  </div>

                  <div className="bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl divide-y divide-gray-100 dark:divide-white/10 shadow-xs">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-gray-500 italic">
                        No notification logs recorded yet. Outbound WhatsApp/SMS alerts will appear here.
                      </div>
                    ) : (
                      notifications.map((log) => (
                        <div key={log.id} className="p-4 text-xs space-y-2 hover:bg-gray-50/50 dark:hover:bg-white/5 transition-colors">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-[#1C1B1A] dark:text-white">
                              {log.provider.toUpperCase()} Alert · {log.recipientPhone}
                            </span>
                            <div className="flex items-center gap-2.5 shrink-0">
                              <span className="text-[10px] text-[#79746D] dark:text-gray-400">
                                {formatTimestampIST(log.createdAt)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleDeleteLog(log.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                                title="Permanently delete this log entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          <p className="text-[#79746D] dark:text-gray-300 font-mono text-[11px] bg-gray-50 dark:bg-white/5 p-2.5 rounded-lg break-words">
                            {log.message}
                          </p>
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="inline-block text-emerald-700 dark:text-emerald-300 font-semibold bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded-sm capitalize">
                              Status: {log.status}
                            </span>
                            <span className="text-gray-400 font-mono">
                              ID: #{log.id ? log.id.slice(-6) : '—'}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 10: SUPABASE BACKEND INTEGRATION */}
              {activeTab === 'supabase' && (
                <div className="space-y-6 max-w-4xl">
                  <div>
                    <h3 className="text-xl font-serif text-[#1C1B1A]">Supabase Backend Integration</h3>
                    <p className="text-xs text-[#79746D]">
                      Live connection status, database tables, and real-time appointment synchronization with your Supabase cloud database.
                    </p>
                  </div>

                  {/* Status Banner */}
                  <div className="bg-white border border-[#E6D4BA]/60 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-3.5 h-3.5 rounded-full ${supabaseStatus?.connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                        <div>
                          <h4 className="font-semibold text-sm text-[#1C1B1A]">
                            Supabase Cloud Connection: {supabaseStatus?.connected ? 'Connected & Active' : 'Connecting...'}
                          </h4>
                          <p className="text-[11px] text-[#79746D]">
                            Project ID: <code className="font-mono text-[#9C753D] font-bold">{supabaseStatus?.projectId || 'fkkbcnaazeajcnssniev'}</code>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setSyncingSupabase(true);
                            try {
                              const res = await api.syncAllAppointmentsToSupabase();
                              showSuccessModal(
                                'Supabase Sync Completed',
                                `Successfully synchronized ${res.count} appointment(s) with cloud database!`
                              );
                              await loadAllAdminData();
                            } catch (err: any) {
                              showSuccessModal('Sync Notification', err.message || 'Supabase sync failed');
                            } finally {
                              setSyncingSupabase(false);
                            }
                          }}
                          disabled={syncingSupabase}
                          className="px-4 py-2 bg-[#1C1B1A] hover:bg-[#2A2826] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingSupabase ? 'animate-spin' : ''}`} />
                          <span>{syncingSupabase ? 'Syncing...' : 'Sync All Appointments'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E6D4BA]/40 space-y-1">
                        <span className="text-[11px] text-[#79746D] font-medium">Endpoint URL</span>
                        <p className="font-mono text-[11px] text-[#1C1B1A] truncate">
                          {supabaseStatus?.url || 'https://fkkbcnaazeajcnssniev.supabase.co'}
                        </p>
                      </div>
                      <div className="p-3 bg-[#FAF7F2] rounded-lg border border-[#E6D4BA]/40 space-y-1">
                        <span className="text-[11px] text-[#79746D] font-medium">Appointments Table Status</span>
                        <p className="font-semibold text-[11px]">
                          {supabaseStatus?.hasAppointmentsTable ? (
                            <span className="text-emerald-700 flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Table 'appointments' Active & Receiving Bookings
                            </span>
                          ) : (
                            <span className="text-amber-700 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5" /> Table 'appointments' needs 1-click SQL setup below
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Schema instructions & 1-Click SQL Copy */}
                  <div className="bg-white border border-[#E6D4BA]/60 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="font-semibold text-sm text-[#1C1B1A]">
                          Supabase SQL Schema Script
                        </h4>
                        <p className="text-xs text-[#79746D]">
                          Run this SQL in your Supabase SQL Editor once to set up the tables, cancellation columns, and notification permissions.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href="https://supabase.com/dashboard/project/fkkbcnaazeajcnssniev/sql"
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-1.5 bg-[#FAF7F2] border border-[#E6D4BA]/80 text-[#1C1B1A] text-xs font-semibold rounded-lg hover:bg-[#F3EBDD] flex items-center gap-1.5 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#9C753D]" />
                          <span>Open Supabase SQL Editor</span>
                        </a>

                        <button
                          type="button"
                          onClick={() => {
                            const sqlToCopy =
                              sqlViewMode === 'upgrade'
                                ? supabaseStatus?.upgradeSql || ''
                                : supabaseStatus?.migrationSql || '';
                            if (sqlToCopy) {
                              navigator.clipboard.writeText(sqlToCopy);
                              setCopiedSql(true);
                              setTimeout(() => setCopiedSql(false), 2500);
                            }
                          }}
                          className="px-3.5 py-1.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedSql ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedSql ? 'Copied to Clipboard!' : sqlViewMode === 'upgrade' ? 'Copy Upgrade SQL' : 'Copy Full Schema'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode selector pills */}
                    <div className="flex items-center gap-2 border-b border-gray-100 pb-2 text-xs">
                      <button
                        type="button"
                        onClick={() => setSqlViewMode('upgrade')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          sqlViewMode === 'upgrade'
                            ? 'bg-[#1C1B1A] text-white'
                            : 'bg-gray-100 text-[#79746D] hover:text-[#1C1B1A]'
                        }`}
                      >
                        Feature Upgrade Migration (Recommended for existing DB)
                      </button>
                      <button
                        type="button"
                        onClick={() => setSqlViewMode('full')}
                        className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer ${
                          sqlViewMode === 'full'
                            ? 'bg-[#1C1B1A] text-white'
                            : 'bg-gray-100 text-[#79746D] hover:text-[#1C1B1A]'
                        }`}
                      >
                        Full Initial Database Schema
                      </button>
                    </div>

                    <div className="relative">
                      <pre className="p-4 bg-[#141312] text-[#E6D4BA] rounded-xl text-[11px] font-mono overflow-x-auto max-h-72 border border-white/10 scrollbar-thin">
                        {(sqlViewMode === 'upgrade' ? supabaseStatus?.upgradeSql : supabaseStatus?.migrationSql) || 'Loading SQL schema...'}
                      </pre>
                    </div>

                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 space-y-1">
                      <p className="font-semibold">How the automated sync works:</p>
                      <ul className="list-disc list-inside space-y-0.5 text-[11px] text-blue-800">
                        <li>Whenever any client reserves an appointment on the website, it is instantly inserted into your Supabase database.</li>
                        <li>Any status updates, reschedules, or walk-ins created from the admin portal are synchronized in real-time.</li>
                        <li>All customer fields (name, phone, email, date, time, service, price, duration, notes, status) are preserved.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Generous empty space spacer so every tab can be comfortably scrolled and explored without being cut off by mobile screens or bottom elements */}
              <div className="h-36 sm:h-28 w-full pointer-events-none" aria-hidden="true" />
            </main>
          </div>
        )}

        {/* MODAL: APPOINTMENT DETAILS & INTERNAL NOTES */}
        {selectedAppointment && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#9C753D] dark:text-[#C29F67]">Appointment Details</span>
                  <h4 className="text-lg font-serif font-bold text-[#1C1B1A] dark:text-white">
                    {selectedAppointment.bookingNumber}
                  </h4>
                </div>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-[#FAF7F2] dark:bg-white/5 p-3.5 rounded-xl border border-[#E6D4BA]/40 dark:border-white/10">
                <div>
                  <span className="text-[#79746D] dark:text-gray-400 text-[11px]">Customer:</span>
                  <p className="font-semibold text-[#1C1B1A] dark:text-white">{selectedAppointment.customerName}</p>
                  <p className="text-[#79746D] dark:text-gray-400">{selectedAppointment.customerPhone}</p>
                </div>
                <div>
                  <span className="text-[#79746D] dark:text-gray-400 text-[11px]">Service & Price:</span>
                  <p className="font-semibold text-[#1C1B1A] dark:text-white">{selectedAppointment.serviceName}</p>
                  <p className="text-[#9C753D] dark:text-[#C29F67] font-bold">₹{selectedAppointment.servicePrice} ({selectedAppointment.serviceDuration}m)</p>
                </div>
                <div>
                  <span className="text-[#79746D] dark:text-gray-400 text-[11px]">Date & Time:</span>
                  <p className="font-semibold text-[#1C1B1A] dark:text-white">{formatDateIST(selectedAppointment.date)}</p>
                  <p className="text-[#1C1B1A] dark:text-white">{formatTimeRange12(selectedAppointment.time, selectedAppointment.endTime)}</p>
                </div>
                <div>
                  <span className="text-[#79746D] dark:text-gray-400 text-[11px]">Current Status:</span>
                  <span className={`font-semibold capitalize block mt-0.5 ${
                    selectedAppointment.status === 'confirmed'
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : selectedAppointment.status === 'completed'
                      ? 'text-blue-700 dark:text-blue-400'
                      : selectedAppointment.status === 'cancelled'
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-amber-700 dark:text-amber-400'
                  }`}>
                    {selectedAppointment.status}
                  </span>
                </div>
              </div>

              {/* Cancellation History details */}
              {selectedAppointment.status === 'cancelled' && (
                <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-xl space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-800 dark:text-red-300">
                    <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                    <span>Booking Cancelled</span>
                    {selectedAppointment.cancelledBy && (
                      <span className="text-[11px] font-normal text-red-600 dark:text-red-400">
                        (by {selectedAppointment.cancelledBy === 'customer' ? 'Customer' : 'Salon Admin'})
                      </span>
                    )}
                  </div>
                  {selectedAppointment.cancellationReason && (
                    <p className="text-[11px] text-red-700 dark:text-red-300 italic">
                      Reason: "{selectedAppointment.cancellationReason}"
                    </p>
                  )}
                  {selectedAppointment.cancelledAt && (
                    <p className="text-[10px] text-[#79746D] dark:text-gray-400">
                      Cancelled at: {formatTimestampIST(selectedAppointment.cancelledAt)}
                    </p>
                  )}
                  <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold pt-0.5">
                    ✓ Reserved slot is released and available for other clients.
                  </p>
                </div>
              )}

              {/* Booking Creation Timestamp & IST Record */}
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Exact Booking Created (IST):
                  </span>
                  <span className="font-mono font-bold text-amber-950 dark:text-amber-200">
                    {selectedAppointment.createdAtIST ||
                      (selectedAppointment.createdAt
                        ? formatTimestampIST(selectedAppointment.createdAt)
                        : 'N/A')}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#79746D] dark:text-gray-400 pt-1 border-t border-amber-500/20">
                  <span>Scheduled Appointment: {formatDateIST(selectedAppointment.date)} at {formatTimeRange12(selectedAppointment.time, selectedAppointment.endTime)}</span>
                  {selectedAppointment.updatedAt && (
                    <span>Last Synced: {formatTime12(selectedAppointment.updatedAt)} IST</span>
                  )}
                </div>
              </div>

              {/* Price & Collected Amount Breakdown */}
              <div className="p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#79746D] dark:text-gray-400 block">Catalog Listed Price</span>
                  <span className="text-base font-bold text-[#1C1B1A] dark:text-white">₹{selectedAppointment.servicePrice}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#79746D] dark:text-gray-400 block">Actual Amount Received</span>
                  {selectedAppointment.status === 'completed' ? (
                    <div className="flex items-center gap-2">
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{selectedAppointment.actualAmountCollected !== undefined ? selectedAppointment.actualAmountCollected : selectedAppointment.servicePrice}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInitiateCompleteAppointment(selectedAppointment)}
                        className="px-2 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold rounded hover:underline cursor-pointer"
                      >
                        Correct
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400 italic">Pending service completion</span>
                  )}
                </div>
              </div>

              {/* Quick Status Change Actions */}
              <div className="p-3 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl space-y-2">
                <span className="font-semibold text-[#1C1B1A] dark:text-white block">Status Management:</span>
                <div className="flex flex-wrap items-center gap-2">
                  {selectedAppointment.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateAppointmentStatus(selectedAppointment.id, 'confirmed')}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Confirm Appointment</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateAppointmentStatus(selectedAppointment.id, 'rejected')}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Decline Request</span>
                      </button>
                    </>
                  )}
                  {selectedAppointment.status === 'confirmed' && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleInitiateCompleteAppointment(selectedAppointment)}
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Mark as Completed & Enter Amount</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateAppointmentStatus(selectedAppointment.id, 'cancelled')}
                        className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Cancel Booking</span>
                      </button>
                    </>
                  )}
                  {selectedAppointment.status === 'completed' && (
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4 text-blue-600" />
                        <span>Service completed & payment saved (₹{selectedAppointment.actualAmountCollected ?? selectedAppointment.servicePrice}).</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInitiateCompleteAppointment(selectedAppointment)}
                        className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 cursor-pointer"
                      >
                        Correct Amount
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {selectedAppointment.notes && (
                <div>
                  <span className="font-semibold text-[#1C1B1A] dark:text-white block mb-1">Customer Special Request:</span>
                  <p className="bg-gray-50 dark:bg-white/5 p-2.5 rounded-lg text-gray-700 dark:text-gray-300 italic border border-gray-100 dark:border-white/5">
                    "{selectedAppointment.notes}"
                  </p>
                </div>
              )}

              <div>
                <label className="font-semibold text-[#1C1B1A] dark:text-white block mb-1">Internal Staff Notes</label>
                <textarea
                  rows={2}
                  placeholder="Private notes (stylist preference, formula formula, etc.)..."
                  defaultValue={selectedAppointment.internalNotes || ''}
                  onBlur={(e) => handleSaveInternalNotes(selectedAppointment.id, e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => handleDeleteAppointment(selectedAppointment.id)}
                  className="px-3 py-1.5 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors cursor-pointer"
                >
                  Delete Record
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenWhatsAppModal(selectedAppointment);
                    }}
                    className="px-3.5 py-2 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                  >
                    <MessageCircle className="w-3.5 h-3.5 fill-white" />
                    <span>WhatsApp Booking Card</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAppointment(null)}
                    className="px-4 py-2 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: COMPLETE BOOKING & ENTER ACTUAL AMOUNT COLLECTED */}
        {completionModalAppt && (
          <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border border-[#C29F67]/60 dark:border-white/20 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#1C1B1A] dark:text-white">
                      Complete Booking & Record Payment
                    </h4>
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                      Ref #{completionModalAppt.bookingNumber} · {completionModalAppt.customerName}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCompletionModalAppt(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Service & Price Overview Card */}
              <div className="p-3 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#79746D] dark:text-gray-400 block">Service Selected</span>
                  <span className="font-bold text-[#1C1B1A] dark:text-white">{completionModalAppt.serviceName}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#79746D] dark:text-gray-400 block">Listed Catalog Price</span>
                  <span className="text-base font-bold text-[#9C753D] dark:text-[#C29F67]">₹{completionModalAppt.servicePrice}</span>
                </div>
              </div>

              <form onSubmit={handleConfirmCompletionWithPayment} className="space-y-4">
                {/* Actual Amount Collected Input */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Actual Amount Received (₹) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-base font-bold text-[#9C753D] dark:text-[#C29F67]">₹</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={completionActualAmount}
                      onChange={(e) => setCompletionActualAmount(e.target.value)}
                      placeholder="e.g. 450"
                      className="w-full pl-8 pr-3 py-2.5 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 rounded-xl text-base font-bold text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                    />
                  </div>

                  {/* Quick Preset Buttons for Common Discounts / Bargains */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <button
                      type="button"
                      onClick={() => setCompletionActualAmount(String(completionModalAppt.servicePrice))}
                      className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded text-[11px] font-semibold hover:border hover:border-[#C29F67] cursor-pointer"
                    >
                      Full Price (₹{completionModalAppt.servicePrice})
                    </button>
                    {completionModalAppt.servicePrice > 50 && (
                      <button
                        type="button"
                        onClick={() => setCompletionActualAmount(String(completionModalAppt.servicePrice - 50))}
                        className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded text-[11px] font-semibold hover:border hover:border-[#C29F67] cursor-pointer"
                      >
                        ₹50 Off (₹{completionModalAppt.servicePrice - 50})
                      </button>
                    )}
                    {completionModalAppt.servicePrice >= 200 && (
                      <button
                        type="button"
                        onClick={() => setCompletionActualAmount(String(Math.round(completionModalAppt.servicePrice * 0.9)))}
                        className="px-2 py-1 bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded text-[11px] font-semibold hover:border hover:border-[#C29F67] cursor-pointer"
                      >
                        10% Off (₹{Math.round(completionModalAppt.servicePrice * 0.9)})
                      </button>
                    )}
                  </div>

                  {/* Live Discount / Adjustment Indicator */}
                  {(() => {
                    const entered = parseFloat(completionActualAmount);
                    if (isNaN(entered)) return null;
                    const diff = completionModalAppt.servicePrice - entered;
                    if (diff > 0) {
                      const pct = Math.round((diff / completionModalAppt.servicePrice) * 100);
                      return (
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold mt-2">
                          ✓ Discount / Bargained: -₹{diff} ({pct}% off listed price)
                        </div>
                      );
                    } else if (diff < 0) {
                      return (
                        <div className="p-2 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-lg text-blue-800 dark:text-blue-300 text-[11px] font-semibold mt-2">
                          + Additional Add-on / Tip: +₹{Math.abs(diff)}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Payment Method Received
                  </label>
                  <select
                    value={completionPaymentMethod}
                    onChange={(e) => setCompletionPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                  >
                    <option value="Cash">Cash at Counter</option>
                    <option value="UPI / QR">UPI / QR (PhonePe, GPay, Paytm)</option>
                    <option value="Debit / Credit Card">Debit / Credit Card</option>
                    <option value="Other">Other / Split Payment</option>
                  </select>
                </div>

                {/* Payment / Discount Notes */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Payment / Discount Notes <span className="font-normal text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={completionAmountNotes}
                    onChange={(e) => setCompletionAmountNotes(e.target.value)}
                    placeholder="e.g. Regular family client discount, student offer..."
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setCompletionModalAppt(null)}
                    className="px-3.5 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={completionSubmitting}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>{completionSubmitting ? 'Saving...' : 'Save & Mark Completed'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: CLIENT DELETION & LINKED RECORDS HANDLER */}
        {clientDeletePrompt && (
          <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border border-amber-300 dark:border-amber-800 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#1C1B1A] dark:text-white">
                      Linked Bookings Warning
                    </h4>
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                      Client: {clientDeletePrompt.customer.name} ({clientDeletePrompt.customer.phone})
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setClientDeletePrompt(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <p className="text-gray-700 dark:text-gray-300">
                  This client currently has <strong className="text-amber-800 dark:text-amber-400 font-bold">{clientDeletePrompt.activeBookings.length} active scheduled booking(s)</strong>:
                </p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                  {clientDeletePrompt.activeBookings.map((b) => (
                    <div key={b.id} className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-white/5 rounded-lg text-[11px]">
                      <div>
                        <span className="font-mono font-bold text-[#1C1B1A] dark:text-white">#{b.bookingNumber}</span>
                        <span className="text-[#79746D] dark:text-gray-400 ml-1.5">{b.serviceName}</span>
                      </div>
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold uppercase">{b.status} ({b.date})</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                  How would you like to handle this client's profile and linked appointments?
                </p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  disabled={clientDeleteSubmitting}
                  onClick={() => handleConfirmCascadeClientDelete(true)}
                  className="w-full p-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-left flex items-start gap-2.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold">Delete Client & Also Delete Linked Bookings</span>
                    <span className="block text-[10px] opacity-90 font-normal">
                      Permanently removes client profile and cancels/deletes all linked appointments from Supabase.
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  disabled={clientDeleteSubmitting}
                  onClick={() => handleConfirmCascadeClientDelete(false)}
                  className="w-full p-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-left flex items-start gap-2.5 cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <User className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-xs font-bold">Delete Client Profile Only</span>
                    <span className="block text-[10px] opacity-90 font-normal">
                      Deletes customer account while keeping booking records intact for salon history.
                    </span>
                  </div>
                </button>
              </div>

              <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setClientDeletePrompt(null)}
                  className="px-4 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:underline cursor-pointer"
                >
                  Cancel / Keep Client
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADMIN CANCELLATION / REJECTION PROMPT WITH REASON SELECTION */}
        {cancellationPrompt && (
          <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150">
            <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border border-red-200 dark:border-red-900/60 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto text-xs">
              <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-white/10">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-serif font-bold text-base text-[#1C1B1A] dark:text-white">
                      {cancellationPrompt.action === 'reject' ? 'Decline Booking Request' : 'Cancel Appointment'}
                    </h4>
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                      Ref #{cancellationPrompt.appointment.bookingNumber}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setCancellationPrompt(null);
                    setCancellationPromptReason('');
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Booking Summary */}
              <div className="p-3.5 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/70 dark:border-white/10 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#79746D] dark:text-gray-400">Customer:</span>
                  <span className="font-bold text-[#1C1B1A] dark:text-white">
                    {cancellationPrompt.appointment.customerName} ({cancellationPrompt.appointment.customerPhone})
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#79746D] dark:text-gray-400">Service:</span>
                  <span className="font-bold text-[#1C1B1A] dark:text-white">
                    {cancellationPrompt.appointment.serviceName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#79746D] dark:text-gray-400">Schedule:</span>
                  <span className="font-semibold text-[#1C1B1A] dark:text-white">
                    {formatDateIST(cancellationPrompt.appointment.date)} at {formatTimeRange12(cancellationPrompt.appointment.time, cancellationPrompt.appointment.endTime)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-[#1C1B1A] dark:text-white block">
                  Select Cancellation Reason:
                </label>
                <div className="grid grid-cols-1 gap-1.5">
                  {[
                    'Client requested phone cancellation',
                    'Emergency salon maintenance / holiday closure',
                    'Stylist / Specialist unavailable',
                    'Double booking / Scheduling conflict',
                    'Other / Custom note'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCancellationPromptReason(preset)}
                      className={`text-left p-2.5 rounded-lg border transition-colors cursor-pointer text-xs ${
                        cancellationPromptReason === preset
                          ? 'bg-red-50 dark:bg-red-950/40 border-red-300 dark:border-red-700 text-red-900 dark:text-red-200 font-bold'
                          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-[#1C1B1A] dark:text-gray-300 hover:border-gray-300'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="font-semibold text-[#1C1B1A] dark:text-white block mb-1">
                  Custom Reason / Note (Sent in Email to Client):
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Rescheduled over phone with client to next Tuesday..."
                  value={cancellationPromptReason}
                  onChange={(e) => setCancellationPromptReason(e.target.value)}
                  className="w-full p-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                />
              </div>

              <p className="text-[11px] text-[#79746D] dark:text-gray-400 leading-relaxed">
                Releasing this slot will immediately make <strong>{formatDateIST(cancellationPrompt.appointment.date)} at {formatTimeRange12(cancellationPrompt.appointment.time, cancellationPrompt.appointment.endTime)}</strong> available for booking by other customers. Cancellation confirmation will be delivered to the client's Gmail via SMTP.
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setCancellationPrompt(null);
                    setCancellationPromptReason('');
                  }}
                  className="px-4 py-2 border border-gray-200 dark:border-white/15 text-[#79746D] dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Keep Appointment
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAdminCancellation}
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Confirm &amp; Release Slot</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: EDIT SERVICE - RESPONSIVE ON BOTH MOBILE & DESKTOP */}
        {editingService && (
          <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl text-xs animate-in zoom-in-95 duration-150 my-auto overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[#E6D4BA]/40 dark:border-white/10 flex items-center justify-between shrink-0 bg-[#FAF7F2] dark:bg-[#141312]">
                <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                  {editingService.id ? 'Edit Service Details' : 'Add New Service'}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingService(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveService} className="flex flex-col flex-1 overflow-hidden">
                <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-4">
                  <div>
                    <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">Service Name</label>
                    <input
                      type="text"
                      required
                      value={editingService.name || ''}
                      onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">Category</label>
                    <select
                      value={editingService.categoryId || categories[0]?.id}
                      onChange={(e) =>
                        setEditingService({ ...editingService, categoryId: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-[#1C1B1A] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">Price (₹)</label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={editingService.price ?? 300}
                        onChange={(e) =>
                          setEditingService({ ...editingService, price: Number(e.target.value) })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">Duration (Mins)</label>
                      <input
                        type="number"
                        required
                        min={10}
                        step={5}
                        value={editingService.durationMinutes ?? 30}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            durationMinutes: Number(e.target.value)
                          })
                        }
                        className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={editingService.description || ''}
                      onChange={(e) =>
                        setEditingService({ ...editingService, description: e.target.value })
                      }
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                    />
                  </div>

                  {/* Service Photo - SAY NO TO URLS, USE MEDIA UPLOAD */}
                  <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="block font-bold text-[#1C1B1A] dark:text-white">Service Photo</label>
                      <span className="text-[10px] text-[#9C753D] dark:text-[#C29F67] font-semibold">Direct upload or pick</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-20 h-16 rounded-lg bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 overflow-hidden shrink-0 relative">
                        {editingService.imageUrl ? (
                          <img
                            src={editingService.imageUrl}
                            alt="Service preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <ImageIcon className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="px-3 py-1.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-[11px] font-bold rounded-lg flex items-center gap-1.5 cursor-pointer transition-colors shadow-xs">
                            <Upload className="w-3.5 h-3.5 text-[#C29F67] dark:text-[#1C1B1A]" />
                            <span>{uploadingMedia ? 'Uploading...' : 'Upload Photo'}</span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingMedia}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingMedia(true);
                                const reader = new FileReader();
                                reader.onload = async () => {
                                  try {
                                    const base64 = reader.result as string;
                                    const res = await api.uploadAdminMedia(base64, file.name || 'service.jpg');
                                    setEditingService((prev) => (prev ? { ...prev, imageUrl: res.url } : prev));
                                  } catch (err: any) {
                                    showSuccessModal('Upload Failed', err.message || 'Failed to upload photo');
                                  } finally {
                                    setUploadingMedia(false);
                                  }
                                };
                                reader.readAsDataURL(file);
                              }}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => setShowMediaPickerForService(!showMediaPickerForService)}
                            className="px-3 py-1.5 bg-[#FAF7F2] dark:bg-white/10 border border-[#E6D4BA]/80 dark:border-white/20 text-[#1C1B1A] dark:text-white text-[11px] font-bold rounded-lg hover:bg-[#F3EBDD] dark:hover:bg-white/15 transition-colors cursor-pointer"
                          >
                            Pick from Library
                          </button>

                          {editingService.imageUrl && (
                            <button
                              type="button"
                              onClick={() => setEditingService({ ...editingService, imageUrl: '' })}
                              className="px-2 py-1 text-[11px] text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded transition-colors cursor-pointer font-semibold"
                            >
                              Remove
                            </button>
                          )}
                        </div>

                        <p className="text-[10px] text-[#79746D] dark:text-gray-400">
                          Upload JPG/PNG from your camera or select from existing salon library images.
                        </p>
                      </div>
                    </div>

                    {/* Media Library Thumbnails Picker for Service */}
                    {showMediaPickerForService && (
                      <div className="p-2.5 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/70 dark:border-white/10 rounded-xl space-y-1.5 animate-in fade-in">
                        <p className="text-[10px] font-bold text-[#1C1B1A] dark:text-white">Tap any photo to apply to this service:</p>
                        <div className="grid grid-cols-4 gap-2 max-h-36 overflow-y-auto pr-1">
                          {[
                            { title: 'Hair Cut', url: '/assets/images/salon_hair_styling_1790779479714.jpg' },
                            { title: 'Facial Suite', url: '/assets/images/salon_facial_skincare_1790779494754.jpg' },
                            { title: 'Bridal Art', url: '/assets/images/salon_bridal_makeup_1790779508056.jpg' },
                            { title: 'Interior', url: '/assets/images/hero_salon_interior_1790779465939.jpg' },
                            { title: 'VIP Lounge', url: '/assets/images/salon_ambience_lounge_1790779524195.jpg' },
                            ...uploadedMediaList.map((m) => ({ title: m.name, url: m.url }))
                          ].map((m, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setEditingService({ ...editingService, imageUrl: m.url });
                                setShowMediaPickerForService(false);
                              }}
                              className={`relative aspect-[4/3] rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                                editingService.imageUrl === m.url ? 'border-[#C29F67] ring-1 ring-[#C29F67]' : 'border-transparent hover:border-gray-300'
                              }`}
                            >
                              <img src={m.url} alt={m.title} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-6 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-[#1C1B1A] dark:text-white font-medium">
                      <input
                        type="checkbox"
                        checked={editingService.isActive ?? true}
                        onChange={(e) =>
                          setEditingService({ ...editingService, isActive: e.target.checked })
                        }
                        className="rounded border-gray-300 text-[#C29F67]"
                      />
                      <span>Active (Bookable)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-[#1C1B1A] dark:text-white font-medium">
                      <input
                        type="checkbox"
                        checked={editingService.isFeatured ?? false}
                        onChange={(e) =>
                          setEditingService({ ...editingService, isFeatured: e.target.checked })
                        }
                        className="rounded border-gray-300 text-[#C29F67]"
                      />
                      <span>Featured on Home</span>
                    </label>
                  </div>
                </div>

                {/* Sticky Action Footer */}
                <div className="shrink-0 p-4 border-t border-gray-100 dark:border-white/10 bg-white dark:bg-[#1A1918] flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setEditingService(null)}
                    className="px-4 py-2 border border-gray-200 dark:border-white/20 text-[#1C1B1A] dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs transition-colors"
                  >
                    Save Service
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: QUICK WALK-IN BOOKING */}
        {showWalkinModal && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                  New Walk-in / Phone Reservation
                </h4>
                <button onClick={() => setShowWalkinModal(false)} className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateWalkinBooking} className="space-y-3">
                <div>
                  <label className="block font-medium text-[#1C1B1A] dark:text-white mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Deepak Sahu"
                    value={walkinName}
                    onChange={(e) => setWalkinName(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1C1B1A] dark:text-white mb-1">Mobile Phone *</label>
                  <input
                    type="tel"
                    required
                    placeholder="+91 91316 29031"
                    value={walkinPhone}
                    onChange={(e) => setWalkinPhone(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                  />
                </div>

                <div>
                  <label className="block font-medium text-[#1C1B1A] dark:text-white mb-1">Service</label>
                  <select
                    value={walkinServiceId}
                    onChange={(e) => setWalkinServiceId(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-[#1C1B1A] border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} (₹{s.price} - {s.durationMinutes}m)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-medium text-[#1C1B1A] dark:text-white mb-1">Date</label>
                    <input
                      type="date"
                      required
                      value={walkinDate}
                      onChange={(e) => setWalkinDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-[#1C1B1A] dark:text-white mb-1">
                      Time {walkinTime ? <span className="text-[#C29F67]">({formatTime12(walkinTime)})</span> : ''}
                    </label>
                    <input
                      type="time"
                      required
                      value={walkinTime}
                      onChange={(e) => setWalkinTime(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-[#1C1B1A] dark:text-white mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Walk-in counter request"
                    value={walkinNotes}
                    onChange={(e) => setWalkinNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setShowWalkinModal(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-white/20 text-[#1C1B1A] dark:text-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs transition-colors"
                  >
                    Confirm Booking
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: EDIT GALLERY PHOTO TEXT, CATEGORY & ARRANGEMENT */}
        {editingGalleryItem && (
          <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] dark:bg-white/5 border border-[#C29F67]/50 flex items-center justify-center text-[#9C753D] dark:text-[#C29F67]">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                      {editingGalleryItem.id ? 'Edit Photo Text & Details' : 'Add New Salon Photo'}
                    </h4>
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                      Update the caption, text arrangement info, and image asset
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingGalleryItem(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!editingGalleryItem.title || !editingGalleryItem.imageUrl) {
                    showSuccessModal('Missing Fields', 'Please provide both a title and an image for the photo.');
                    return;
                  }
                  try {
                    if (editingGalleryItem.id) {
                      await api.updateAdminGallery(editingGalleryItem.id, editingGalleryItem);
                    } else {
                      await api.createAdminGallery(editingGalleryItem);
                    }
                    const galRes = await api.getGallery();
                    setGallery(galRes);
                    setEditingGalleryItem(null);
                    onDataChanged();
                    showSuccessModal('Photo Saved', 'Gallery photo text & arrangement updated successfully!');
                  } catch (err: any) {
                    showSuccessModal('Update Failed', err.message || 'Failed to update photo');
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">Photo Title / Caption *</label>
                  <input
                    type="text"
                    required
                    value={editingGalleryItem.title || ''}
                    onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, title: e.target.value })}
                    placeholder="e.g. Master Balayage & Gloss Finish"
                    className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">Category Zone</label>
                  <select
                    value={editingGalleryItem.category || 'Hair'}
                    onChange={(e) =>
                      setEditingGalleryItem({ ...editingGalleryItem, category: e.target.value as any })
                    }
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-200 rounded-lg text-xs"
                  >
                    <option value="Hair">Hair Styling & Treatments</option>
                    <option value="Ambience">Salon Ambience & Suite</option>
                    <option value="Beauty & Skin">Beauty, Facials & Skin</option>
                    <option value="Makeup">Bridal & HD Makeup</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#1C1B1A] mb-1">Description / Subtitle</label>
                  <textarea
                    rows={2}
                    value={editingGalleryItem.description || ''}
                    onChange={(e) =>
                      setEditingGalleryItem({ ...editingGalleryItem, description: e.target.value })
                    }
                    placeholder="Brief description displayed on cards or hover overlays..."
                    className="w-full px-3 py-2 bg-[#FAF7F2] border border-gray-200 rounded-lg text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#1C1B1A] mb-1">Image Source</label>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-14 rounded-lg bg-gray-100 overflow-hidden border border-gray-200 shrink-0">
                      {editingGalleryItem.imageUrl ? (
                        <img
                          src={editingGalleryItem.imageUrl}
                          alt="preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <input
                        type="text"
                        value={editingGalleryItem.imageUrl || ''}
                        onChange={(e) => setEditingGalleryItem({ ...editingGalleryItem, imageUrl: e.target.value })}
                        placeholder="Image path or URL"
                        className="w-full px-2.5 py-1.5 bg-[#FAF7F2] border border-gray-200 rounded text-xs font-mono"
                      />
                      <div className="flex items-center gap-2">
                        <label className="px-2.5 py-1 bg-[#1C1B1A] text-white rounded text-[11px] font-semibold cursor-pointer hover:bg-[#2A2826] transition-colors flex items-center gap-1">
                          <Camera className="w-3 h-3 text-[#C29F67]" />
                          <span>{uploadingMedia ? 'Uploading...' : 'Upload New Photo'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={uploadingMedia}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingMedia(true);
                              const reader = new FileReader();
                              reader.onload = async (evt) => {
                                const base64 = evt.target?.result as string;
                                if (!base64) {
                                  setUploadingMedia(false);
                                  return;
                                }
                                try {
                                  const res = await api.uploadAdminMedia(base64, file.name);
                                  setEditingGalleryItem((prev) => prev ? { ...prev, imageUrl: res.url } : null);
                                } catch (err: any) {
                                  showSuccessModal('Upload Failed', err.message || 'Failed to upload photo');
                                } finally {
                                  setUploadingMedia(false);
                                }
                              };
                              reader.readAsDataURL(file);
                            }}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => setEditingGalleryItem(null)}
                    className="px-4 py-2 border border-gray-200 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-[#C29F67] hover:bg-[#B38C4F] text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
                  >
                    Save Photo Details
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: INTEGRATED WHATSAPP MESSENGER WITH CUSTOM BOOKING CARD */}
        {whatsappModalAppt && (
          <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl max-w-xl w-full p-5 sm:p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
                    <MessageCircle className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white flex items-center gap-2">
                      <span>Integrated WhatsApp Messenger</span>
                      <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-sans font-bold px-2 py-0.5 rounded-full">
                        Custom Booking Card
                      </span>
                    </h4>
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                      Sending from Admin WhatsApp:{' '}
                      <strong className="text-[#1C1B1A] dark:text-white font-bold">
                        {settings?.adminWhatsAppPhone || settings?.phone || '+91 91316 29031'}
                      </strong>
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setWhatsappModalAppt(null)}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Recipient Details & Card Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#FAF7F2] dark:bg-white/5 p-3 rounded-xl border border-[#E6D4BA]/60 dark:border-white/10">
                <div>
                  <span className="text-[10px] text-[#79746D] dark:text-gray-400 uppercase font-bold">Recipient Customer</span>
                  <p className="font-bold text-[#1C1B1A] dark:text-white text-sm">{whatsappModalAppt.customerName}</p>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <Phone className="w-3 h-3" /> {whatsappModalAppt.customerPhone}
                  </p>
                </div>
                <div>
                  <span className="text-[10px] text-[#79746D] dark:text-gray-400 uppercase font-bold">Appointment Ref</span>
                  <p className="font-mono font-bold text-[#1C1B1A] dark:text-white">#{whatsappModalAppt.bookingNumber}</p>
                  <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                    {whatsappModalAppt.serviceName} · ₹{whatsappModalAppt.servicePrice}
                  </p>
                </div>
              </div>

              {/* Card Type Selector */}
              <div>
                <label className="block text-[11px] font-bold text-[#1C1B1A] dark:text-white uppercase tracking-wider mb-1.5">
                  Select Custom Booking Card Template
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'confirmed', label: '✅ Booking Confirmed', color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
                    { id: 'postponed', label: '⏳ Postponed Update', color: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-300 dark:border-indigo-800' },
                    { id: 'rescheduled', label: '🗓️ Rescheduled Update', color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-800 dark:text-blue-300 border-blue-300 dark:border-blue-800' },
                    { id: 'pending', label: '⏳ Pending Request', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800' },
                    { id: 'reminder', label: '⏰ Visit Reminder', color: 'bg-yellow-50 dark:bg-yellow-950/50 text-yellow-800 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800' },
                    { id: 'completed', label: '✨ Completed & Thanks', color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-800' },
                    { id: 'cancelled', label: '❌ Cancelled Notice', color: 'bg-red-50 dark:bg-red-950/50 text-red-800 dark:text-red-300 border-red-300 dark:border-red-800' },
                    { id: 'general_update', label: '📋 General Update', color: 'bg-gray-100 dark:bg-white/10 text-gray-800 dark:text-gray-200 border-gray-300 dark:border-white/20' }
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setWhatsappCardType(type.id as WhatsAppCardType)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border font-semibold transition-all cursor-pointer ${
                        whatsappCardType === type.id
                          ? `${type.color} ring-2 ring-emerald-500 shadow-2xs font-bold`
                          : 'bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/10'
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Stylist/Admin Note */}
              <div>
                <label className="block text-[11px] font-bold text-[#1C1B1A] dark:text-white mb-1">
                  Add Custom Note / Stylist Advice for Customer (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Please arrive 5 minutes early; complimentary hair wash included!"
                  value={whatsappCustomNote}
                  onChange={(e) => setWhatsappCustomNote(e.target.value)}
                  className="w-full px-3 py-2 bg-[#FAF7F2] dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                />
              </div>

              {/* Visual Custom Booking Card Preview */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-[#1C1B1A] dark:text-white uppercase tracking-wider">
                    Live Custom Booking Card Preview
                  </span>
                  <span className="text-[10px] text-[#79746D] dark:text-gray-400">
                    Formatted for WhatsApp typography & emojis
                  </span>
                </div>

                <div className="p-3.5 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA] dark:border-white/10 rounded-xl relative overflow-hidden font-sans">
                  <div className="flex items-center justify-between border-b border-[#E6D4BA]/60 dark:border-white/10 pb-2 mb-2">
                    <span className="font-serif font-black text-sm text-[#1C1B1A] dark:text-white tracking-tight uppercase">
                      {settings?.salonName || 'B & B Family Salon'}
                    </span>
                    <span className="text-[10px] font-mono font-bold bg-[#1C1B1A] dark:bg-[#C29F67] text-[#E6D4BA] dark:text-[#1C1B1A] px-2 py-0.5 rounded-sm">
                      #{whatsappModalAppt.bookingNumber}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                    <div>
                      <span className="text-[10px] text-[#79746D] dark:text-gray-400">Customer:</span>
                      <p className="font-bold text-[#1C1B1A] dark:text-white">{whatsappModalAppt.customerName}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#79746D] dark:text-gray-400">Service & Cost:</span>
                      <p className="font-bold text-[#1C1B1A] dark:text-white">{whatsappModalAppt.serviceName} (₹{whatsappModalAppt.servicePrice})</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#79746D] dark:text-gray-400">Schedule:</span>
                      <p className="font-bold text-[#1C1B1A] dark:text-white">{formatDateIST(whatsappModalAppt.date)} · {formatTimeRange12(whatsappModalAppt.time, whatsappModalAppt.endTime)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#79746D] dark:text-gray-400">Status:</span>
                      <p className="font-bold uppercase text-emerald-700 dark:text-emerald-400">{whatsappModalAppt.status}</p>
                    </div>
                  </div>

                  {whatsappCustomNote && (
                    <div className="text-[11px] bg-white dark:bg-black/30 p-2 rounded-lg border border-[#E6D4BA]/40 dark:border-white/10 text-[#79746D] dark:text-gray-300 italic mb-2">
                      Stylist Note: "{whatsappCustomNote}"
                    </div>
                  )}

                  <div className="text-[10px] text-[#79746D] dark:text-gray-400 border-t border-[#E6D4BA]/40 dark:border-white/10 pt-1.5 flex items-center justify-between">
                    <span>📍 {settings?.address || 'Ultimate Arcade, Kolar Rd, Bhopal'}</span>
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">Via Admin WhatsApp</span>
                  </div>
                </div>
              </div>

              {/* Raw Formatted Text Area */}
              <div>
                <label className="block text-[11px] font-bold text-[#1C1B1A] dark:text-white mb-1">
                  WhatsApp Formatted Message Preview
                </label>
                <textarea
                  rows={4}
                  readOnly
                  value={generateWhatsAppBookingCard(whatsappModalAppt, settings, whatsappCardType, whatsappCustomNote)}
                  className="w-full p-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[11px] font-mono text-[#1C1B1A] dark:text-white outline-hidden select-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-gray-100 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    const text = generateWhatsAppBookingCard(whatsappModalAppt, settings, whatsappCardType, whatsappCustomNote);
                    navigator.clipboard.writeText(text);
                    setWhatsappCopied(true);
                    setTimeout(() => setWhatsappCopied(false), 2500);
                  }}
                  className="px-3.5 py-2 bg-white dark:bg-white/5 border border-gray-300 dark:border-white/20 text-[#1C1B1A] dark:text-white hover:bg-gray-50 dark:hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {whatsappCopied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-[#79746D] dark:text-gray-400" />}
                  <span>{whatsappCopied ? 'Card Copied!' : 'Copy Card Text'}</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setWhatsappModalAppt(null)}
                    className="px-3.5 py-2 text-xs text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const text = generateWhatsAppBookingCard(whatsappModalAppt, settings, whatsappCardType, whatsappCustomNote);
                      openCustomerWhatsApp(whatsappModalAppt.customerPhone, text);
                    }}
                    className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20BD5A] text-white text-xs font-bold rounded-lg flex items-center gap-2 shadow-sm transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 fill-white" />
                    <span>Send via Admin WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ASSIGN PHOTO TO SERVICE */}
        {assigningPhotoModal && (
          <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#C29F67]" />
                  <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                    Assign Photo to Service
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setAssigningPhotoModal(null)}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Photo preview */}
              <div className="flex items-center gap-3 p-3 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl">
                <img
                  src={assigningPhotoModal.url}
                  alt={assigningPhotoModal.title}
                  className="w-16 h-12 rounded-lg object-cover shrink-0"
                />
                <div className="min-w-0">
                  <p className="font-bold text-xs text-[#1C1B1A] dark:text-white truncate">
                    {assigningPhotoModal.title}
                  </p>
                  <p className="text-[10px] text-[#79746D] dark:text-gray-400">
                    Select which service should display this photo in the catalogue.
                  </p>
                </div>
              </div>

              {/* Service selection list */}
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                <label className="block text-[11px] font-bold text-[#1C1B1A] dark:text-white uppercase tracking-wider mb-1">
                  Choose Service:
                </label>
                {services.map((srv) => (
                  <button
                    key={srv.id}
                    type="button"
                    onClick={() => handleAssignPhotoToService(srv.id, assigningPhotoModal.url)}
                    className="w-full p-2.5 rounded-xl border border-gray-100 dark:border-white/10 hover:border-[#C29F67] hover:bg-[#FAF7F2] dark:hover:bg-white/10 transition-colors flex items-center justify-between text-left cursor-pointer group"
                  >
                    <div>
                      <p className="font-bold text-xs text-[#1C1B1A] dark:text-white group-hover:text-[#9C753D] dark:group-hover:text-[#C29F67]">
                        {srv.name}
                      </p>
                      <span className="text-[10px] text-[#79746D] dark:text-gray-400">
                        ₹{srv.price} · {srv.durationMinutes} mins
                      </span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 font-bold group-hover:bg-[#C29F67] group-hover:text-white transition-colors">
                      Assign
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex justify-end">
                <button
                  type="button"
                  onClick={() => setAssigningPhotoModal(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-white/20 text-[#1C1B1A] dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/10 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD / EDIT STAFF MEMBER & PHOTO */}
        {editingStaff && (
          <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
            <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl text-xs animate-in zoom-in-95 duration-150 my-auto overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-[#E6D4BA]/40 dark:border-white/10 flex items-center justify-between shrink-0 bg-[#FAF7F2] dark:bg-[#141312]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#C29F67]/20 text-[#C29F67] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-base font-serif font-bold text-[#1C1B1A] dark:text-white">
                      {editingStaff.id ? 'Edit Staff Profile & Photo' : 'Add New Hairdresser / Specialist'}
                    </h4>
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400">
                      Changes are synchronized automatically with Supabase cloud database
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingStaff(null);
                    setIsNewStaffModal(false);
                  }}
                  className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveStaffMember} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {/* Photo Upload Section */}
                <div className="bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl p-3.5 space-y-3">
                  <label className="block font-bold text-[#1C1B1A] dark:text-white">
                    Stylist Profile Photo
                  </label>
                  <div className="flex items-center gap-4">
                    <img
                      src={editingStaff.imageUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80'}
                      alt="Preview"
                      className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-[#C29F67]/40 shrink-0"
                    />
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="px-3 py-1.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs font-semibold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-2xs">
                          <Upload className="w-3.5 h-3.5" />
                          <span>{staffPhotoUploadLoading ? 'Uploading...' : 'Upload From Device'}</span>
                          <input
                            type="file"
                            accept="image/*"
                            disabled={staffPhotoUploadLoading}
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleStaffPhotoUpload(file);
                            }}
                          />
                        </label>
                      </div>
                      <p className="text-[10px] text-[#79746D] dark:text-gray-400">
                        Uploaded photos are mirrored into Supabase storage so they never vanish.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#79746D] dark:text-gray-400 mb-1">
                      Or Image URL:
                    </label>
                    <input
                      type="url"
                      value={editingStaff.imageUrl || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, imageUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-3 py-1.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                    />
                  </div>
                </div>

                {/* Name & Role */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                      Staff Member Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingStaff.name || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, name: e.target.value })}
                      placeholder="e.g. Rajesh Sharma"
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                      Designation / Role *
                    </label>
                    <input
                      type="text"
                      required
                      value={editingStaff.role || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value })}
                      placeholder="e.g. Master Stylist & Colorist"
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                    />
                  </div>
                </div>

                {/* Quick Role Suggestions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] text-[#79746D] dark:text-gray-400 font-bold">Quick Titles:</span>
                  {[
                    'Master Hair Artist & Senior Stylist',
                    'Senior Hair Colorist & Balayage Specialist',
                    'Bridal & Aesthetic Specialist',
                    'Keratin & Texture Treatment Expert',
                    'Senior Aesthetician & Skin Care'
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setEditingStaff({ ...editingStaff, role: preset })}
                      className="text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-[#C29F67]/20 dark:bg-white/5 hover:text-[#9C753D] dark:hover:text-[#E6D4BA] rounded-md transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>

                {/* Experience, Rating & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                      Experience (Years)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="40"
                      value={editingStaff.experienceYears ?? 5}
                      onChange={(e) => setEditingStaff({ ...editingStaff, experienceYears: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                      Customer Rating (★)
                    </label>
                    <input
                      type="number"
                      min="1.0"
                      max="5.0"
                      step="0.1"
                      value={editingStaff.rating ?? 4.9}
                      onChange={(e) => setEditingStaff({ ...editingStaff, rating: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                      Phone / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={editingStaff.phone || ''}
                      onChange={(e) => setEditingStaff({ ...editingStaff, phone: e.target.value })}
                      placeholder="+91 91316 29031"
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                    />
                  </div>
                </div>

                {/* Specialties */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Specialties & Skills (Comma-separated)
                  </label>
                  <input
                    type="text"
                    value={
                      Array.isArray(editingStaff.specialties)
                        ? editingStaff.specialties.join(', ')
                        : (editingStaff.specialties as any || '')
                    }
                    onChange={(e) => {
                      const list = e.target.value.split(',').map((s) => s.trim());
                      setEditingStaff({ ...editingStaff, specialties: list });
                    }}
                    placeholder="e.g. Precision Fades, Balayage, Bridal Makeup, Keratin Spa"
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(Array.isArray(editingStaff.specialties) ? editingStaff.specialties : []).filter(Boolean).map((sp, i) => (
                      <span
                        key={i}
                        className="text-[10px] px-2 py-0.5 bg-[#FAF7F2] dark:bg-white/10 text-[#9C753D] dark:text-[#E6D4BA] rounded-full border border-[#E6D4BA]/40 font-medium"
                      >
                        ✓ {sp}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Bio & Professional Background
                  </label>
                  <textarea
                    rows={3}
                    value={editingStaff.bio || ''}
                    onChange={(e) => setEditingStaff({ ...editingStaff, bio: e.target.value })}
                    placeholder="Brief description of craftsmanship, signature style, and customer hospitality..."
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-xs text-[#1C1B1A] dark:text-white"
                  />
                </div>

                {/* Active Toggle */}
                <div className="flex items-center justify-between p-3 bg-[#FAF7F2] dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl">
                  <div>
                    <p className="font-bold text-[#1C1B1A] dark:text-white text-xs">Available for Customer Bookings</p>
                    <p className="text-[10px] text-[#79746D] dark:text-gray-400">
                      When enabled, clients can pick this hairdresser during online reservation.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={editingStaff.isActive !== false}
                    onChange={(e) => setEditingStaff({ ...editingStaff, isActive: e.target.checked })}
                    className="w-4 h-4 accent-[#C29F67] cursor-pointer"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingStaff(null);
                      setIsNewStaffModal(false);
                    }}
                    className="px-4 py-2 border border-gray-200 dark:border-white/20 text-[#1C1B1A] dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={savingStaff}
                    className="px-5 py-2 bg-[#C29F67] hover:bg-[#B38C4F] text-white font-bold rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    <span>{savingStaff ? 'Saving to Supabase...' : 'Save Staff Profile'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ADD / EDIT REVIEW MODAL */}
        {isReviewModalOpen && (
          <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#FBFBFA] dark:bg-[#1A1918] border border-[#E6D4BA]/90 dark:border-white/20 rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-[#E6D4BA]/40 dark:border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-[#C29F67] fill-[#C29F67]" />
                  <h4 className="font-serif font-bold text-base text-[#1C1B1A] dark:text-white">
                    {editingReview ? 'Edit Review' : 'Add Review / Copy Google Review'}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReviewModalOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-700 dark:hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Informational Guidance */}
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-[11px] text-amber-900 dark:text-amber-200 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                  <span>Google Maps Review Transparency</span>
                </div>
                <p>
                  Copy the author's real displayed name, exact star rating, and genuine review text from your Google Maps profile. Never fabricate reviews or falsely claim client verification.
                </p>
              </div>

              {reviewFormError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-xl text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{reviewFormError}</span>
                </div>
              )}

              <form onSubmit={handleSaveReviewSubmit} className="space-y-4 text-xs">
                {/* Author's Displayed Name */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Author's Displayed Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Priya Sharma or Rahul Verma"
                    value={reviewFormAuthor}
                    onChange={(e) => setReviewFormAuthor(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                  />
                </div>

                {/* Star Rating Picker */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Star Rating (1 to 5 Stars) *
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setReviewFormRating(star)}
                          onMouseEnter={() => setReviewFormRatingHover(star)}
                          onMouseLeave={() => setReviewFormRatingHover(0)}
                          className="p-1 text-[#C29F67] hover:scale-110 transition-transform cursor-pointer"
                        >
                          <Star
                            className={`w-6 h-6 ${
                              (reviewFormRatingHover || reviewFormRating) >= star
                                ? 'fill-[#C29F67] text-[#C29F67]'
                                : 'text-gray-300 dark:text-gray-600'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    <span className="text-xs font-bold text-[#9C753D] dark:text-[#C29F67] ml-2">
                      {reviewFormRating} ★
                    </span>
                  </div>
                </div>

                {/* Review Text */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Written Review Text *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Paste the genuine feedback or comments from the reviewer..."
                    value={reviewFormText}
                    onChange={(e) => setReviewFormText(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-[#1C1B1A] dark:text-white outline-hidden focus:border-[#C29F67]"
                  />
                </div>

                {/* Date & Source Selection Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                      Review Date (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. October 2026 or 2 weeks ago"
                      value={reviewFormDate}
                      onChange={(e) => setReviewFormDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                      Review Source / Tag * <span className="font-normal text-gray-400 text-[10px]">(e.g. From Google, From web customer)</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. From Google, From web customer, Instagram, Walk-in..."
                      value={reviewFormSource}
                      onChange={(e) => setReviewFormSource(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white font-medium outline-hidden focus:border-[#C29F67]"
                    />
                    {/* Quick source presets for fast 1-tap tagging */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {['From Google', 'From web customer', 'Google Maps', 'Website Customer', 'Instagram', 'Walk-in Client', 'WhatsApp'].map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setReviewFormSource(preset)}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border cursor-pointer transition-all ${
                            reviewFormSource === preset
                              ? 'bg-[#C29F67] text-white border-[#C29F67]'
                              : 'bg-gray-100 dark:bg-white/10 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-white/10 hover:border-[#C29F67]'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Source URL (Optional) */}
                <div>
                  <label className="block font-bold text-[#1C1B1A] dark:text-white mb-1">
                    Review Link / URL <span className="font-normal text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="url"
                    placeholder="https://maps.google.com/?cid=... or post link"
                    value={reviewFormSourceUrl}
                    onChange={(e) => setReviewFormSourceUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white outline-hidden"
                  />
                </div>

                {/* Status & Verification Grid */}
                <div className="p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-200 dark:border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1C1B1A] dark:text-white block">Moderation Status</span>
                      <span className="text-[11px] text-[#79746D] dark:text-gray-400">
                        Approved reviews immediately show on public website.
                      </span>
                    </div>
                    <select
                      value={reviewFormStatus}
                      onChange={(e) => setReviewFormStatus(e.target.value as ReviewStatus)}
                      className="px-2.5 py-1.5 bg-[#FAF7F2] dark:bg-black/30 border border-gray-300 dark:border-white/20 rounded-lg font-bold text-xs cursor-pointer outline-hidden"
                    >
                      <option value="approved">Approved (Public)</option>
                      <option value="pending">Pending Moderation</option>
                      <option value="hidden">Hidden from Website</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2.5 cursor-pointer pt-2 border-t border-gray-100 dark:border-white/10">
                    <input
                      type="checkbox"
                      checked={reviewFormIsVerified}
                      onChange={(e) => setReviewFormIsVerified(e.target.checked)}
                      className="w-4 h-4 text-[#C29F67] rounded border-gray-300 focus:ring-[#C29F67]"
                    />
                    <div>
                      <span className="font-bold text-[#1C1B1A] dark:text-white block">
                        Mark as Verified Client Experience
                      </span>
                      <span className="text-[10px] text-[#79746D] dark:text-gray-400">
                        Check only if the reviewer is a confirmed salon customer.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsReviewModalOpen(false)}
                    className="px-4 py-2 border border-gray-200 dark:border-white/20 text-[#1C1B1A] dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/10 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={reviewFormLoading || !reviewFormAuthor.trim() || !reviewFormText.trim()}
                    className="px-5 py-2 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white font-bold rounded-lg cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-2"
                  >
                    {reviewFormLoading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        <span>{editingReview ? 'Update Review' : 'Save Review'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* REALISTIC CONFIRMATION / SUCCESS POP-UP SCREEN */}
        {confirmModal?.isOpen && (
          <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-white dark:bg-[#1A1918] border border-[#E6D4BA]/80 dark:border-white/10 rounded-2xl max-w-sm w-full p-5 sm:p-6 shadow-2xl space-y-4 text-xs animate-in zoom-in-95 duration-150">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    confirmModal.type === 'danger'
                      ? 'bg-red-100 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                      : confirmModal.type === 'success'
                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                      : 'bg-[#FAF7F2] dark:bg-white/10 text-[#C29F67]'
                  }`}
                >
                  {confirmModal.type === 'danger' ? (
                    <AlertCircle className="w-5 h-5" />
                  ) : confirmModal.type === 'success' ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Sparkles className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white">
                    {confirmModal.title}
                  </h4>
                  <p className="text-[11px] text-[#79746D] dark:text-gray-400 mt-0.5">
                    {confirmModal.type === 'success' ? 'Confirmed & Applied' : 'Please review and confirm to proceed'}
                  </p>
                </div>
              </div>

              <p className="text-xs text-[#1C1B1A]/85 dark:text-gray-300 leading-relaxed bg-[#FAF7F2] dark:bg-white/5 p-3 rounded-xl border border-gray-100 dark:border-white/5">
                {confirmModal.message}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                {confirmModal.cancelLabel && (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirmModal.onCancel) confirmModal.onCancel();
                      else setConfirmModal(null);
                    }}
                    className="px-4 py-2 border border-gray-200 dark:border-white/20 text-[#1C1B1A] dark:text-gray-300 rounded-lg text-xs font-semibold hover:bg-gray-50 dark:hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    {confirmModal.cancelLabel}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.onConfirm) confirmModal.onConfirm();
                    else setConfirmModal(null);
                  }}
                  className={`px-5 py-2 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs transition-colors ${
                    confirmModal.type === 'danger'
                      ? 'bg-red-600 hover:bg-red-700'
                      : 'bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F]'
                  }`}
                >
                  {confirmModal.confirmLabel || 'OK'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
