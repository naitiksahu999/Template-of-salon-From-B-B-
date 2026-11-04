import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.tsx';
import { Hero } from './components/Hero.tsx';
import { ServicesCatalogue } from './components/ServicesCatalogue.tsx';
import { SalonExperience } from './components/SalonExperience.tsx';
import { GallerySection } from './components/GallerySection.tsx';
import { ReviewsSection } from './components/ReviewsSection.tsx';
import { LocationHours } from './components/LocationHours.tsx';
import { Footer } from './components/Footer.tsx';
import { BookingModal } from './components/BookingModal.tsx';
import { AdminPortal } from './components/AdminPortal.tsx';
import { CustomerSettingsModal } from './components/CustomerSettingsModal.tsx';
import { Calendar, Phone, User, Sliders, LogOut } from 'lucide-react';
import { Service, ServiceCategory, Review, GalleryItem, BusinessHoursDay, BlockedDate, SiteSettings } from './types/index.ts';
import { api, getCustomerToken, clearCustomerToken } from './api.ts';

export default function App() {
  // Read local storage cached state for instant offline / reload permanence
  const [settings, setSettings] = useState<SiteSettings | null>(() => {
    try {
      const cached = localStorage.getItem('salon_settings');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [services, setServices] = useState<Service[]>(() => {
    try {
      const cached = localStorage.getItem('salon_services');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [categories, setCategories] = useState<ServiceCategory[]>(() => {
    try {
      const cached = localStorage.getItem('salon_categories');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [reviews, setReviews] = useState<Review[]>([]);
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [businessHours, setBusinessHours] = useState<BusinessHoursDay[]>(() => {
    try {
      const cached = localStorage.getItem('salon_business_hours');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>(() => {
    try {
      const cached = localStorage.getItem('salon_blocked_dates');
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState<boolean>(true);

  // Authenticated Admin Session for instant switcher
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    return !!api.getAdminToken();
  });

  // Modal controls
  const [bookingModalOpen, setBookingModalOpen] = useState<boolean>(false);
  const [selectedServiceIdForBooking, setSelectedServiceIdForBooking] = useState<string | null>(null);
  const [customerSettingsOpen, setCustomerSettingsOpen] = useState<boolean>(false);
  const [customerInitialTab, setCustomerInitialTab] = useState<'bookings' | 'reviews' | 'profile' | 'theme'>('bookings');
  const [adminPortalOpen, setAdminPortalOpen] = useState<boolean>(false);
  const [isSetupCompleted, setIsSetupCompleted] = useState<boolean>(true);
  const [adminInitialMode, setAdminInitialMode] = useState<'login' | 'signup'>('login');

  // Authenticated Customer Session (Only populated if active token exists)
  const [customerUser, setCustomerUser] = useState<{ id: string; name: string; email: string; phone: string; isVerified?: boolean } | null>(() => {
    try {
      const token = getCustomerToken();
      if (!token) return null;
      const stored = localStorage.getItem('salon_customer_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Independent Customer Theme Preference (Dark / Light / System Mode) - Stored per device/browser
  const [customerTheme, setCustomerTheme] = useState<'light' | 'dark' | 'system'>(() => {
    try {
      const stored = localStorage.getItem('salon_customer_theme_mode') || localStorage.getItem('salon_theme_mode');
      return (stored as any) || 'light';
    } catch {
      return 'light';
    }
  });

  // Dedicated Admin Portal Theme Preference (Isolated from customer view)
  const [adminTheme, setAdminTheme] = useState<'light' | 'dark'>(() => {
    try {
      const stored = localStorage.getItem('salon_admin_theme_mode');
      return (stored as any) || 'light';
    } catch {
      return 'light';
    }
  });

  // Dynamic Theme Application: Public Customer Website Theme is strictly tied to Customer preference
  useEffect(() => {
    const root = document.documentElement;
    if (customerTheme === 'dark') {
      root.classList.add('dark');
    } else if (customerTheme === 'light') {
      root.classList.remove('dark');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [customerTheme]);

  // Persist customer theme independently
  useEffect(() => {
    try {
      localStorage.setItem('salon_customer_theme_mode', customerTheme);
      localStorage.setItem('salon_theme_mode', customerTheme);
    } catch {}
  }, [customerTheme]);

  // Persist admin theme independently
  useEffect(() => {
    try {
      localStorage.setItem('salon_admin_theme_mode', adminTheme);
    } catch {}
  }, [adminTheme]);

  // Synchronize and verify customer session with backend to guarantee consistent auth state
  useEffect(() => {
    const token = getCustomerToken();
    if (!token) {
      setCustomerUser(null);
      localStorage.removeItem('salon_customer_user');
      return;
    }

    api
      .getCustomerMe()
      .then((res) => {
        if (res?.customer) {
          setCustomerUser(res.customer);
          localStorage.setItem('salon_customer_user', JSON.stringify(res.customer));
        } else {
          clearCustomerToken();
          setCustomerUser(null);
          localStorage.removeItem('salon_customer_user');
        }
      })
      .catch(() => {
        clearCustomerToken();
        setCustomerUser(null);
        localStorage.removeItem('salon_customer_user');
      });
  }, []);

  const fetchPublicData = async () => {
    try {
      const [srvRes, catRes, revRes, galRes, cfgRes, setupRes] = await Promise.all([
        api.getServices(),
        api.getCategories(),
        api.getReviews(),
        api.getGallery(),
        api.getConfig(),
        api.getAdminSetupStatus().catch(() => ({ isSetupCompleted: false, adminCount: 0, registeredUsername: null, registeredEmail: null }))
      ]);

      if (srvRes && srvRes.length > 0) {
        setServices(srvRes);
        localStorage.setItem('salon_services', JSON.stringify(srvRes));
      }
      if (catRes && catRes.length > 0) {
        setCategories(catRes);
        localStorage.setItem('salon_categories', JSON.stringify(catRes));
      }
      setReviews(revRes);
      setGallery(galRes);

      if (cfgRes?.settings) {
        setSettings(cfgRes.settings);
        localStorage.setItem('salon_settings', JSON.stringify(cfgRes.settings));
      } else if (cfgRes) {
        const assembledSettings: SiteSettings = {
          salonName: cfgRes.salonName || 'Tassel Unisex Salon',
          alternateName: cfgRes.alternateName || 'Tassel Salon Bhopal',
          tagline: cfgRes.tagline || 'Luxury Unisex Salon & Beauty Sanctuary in Bhopal',
          phone: cfgRes.phone || '+91 78800 86990',
          email: cfgRes.email || 'contact@tasselunisexsalon.com',
          address: cfgRes.address || 'Kolar Road, Good Shapard Kalan, Mandakini Colony',
          landmarks: cfgRes.landmarks || 'Mandakini Colony, Kolar Road',
          city: cfgRes.city || 'Bhopal',
          state: cfgRes.state || 'Madhya Pradesh',
          pincode: cfgRes.pincode || '462042',
          googleMapsUrl: cfgRes.googleMapsUrl || 'https://www.google.co.in/maps/place/Tassel+Unisex+Salon,+Kolar+Rd,+Good+Shapard+Kalan,+Mandakini+Colony,+Kolar+Rd,+Bhopal,+Madhya+Pradesh+462042/@23.1823711,77.4175763,17z/',
          slotIntervalMinutes: 30,
          autoConfirmBookings: true,
          enableSmsNotifications: true,
          enableWhatsAppNotifications: true,
          enableEmailNotifications: false
        };
        setSettings(assembledSettings);
        localStorage.setItem('salon_settings', JSON.stringify(assembledSettings));
      }

      if (cfgRes?.businessHours && cfgRes.businessHours.length > 0) {
        setBusinessHours(cfgRes.businessHours);
        localStorage.setItem('salon_business_hours', JSON.stringify(cfgRes.businessHours));
      }

      if (cfgRes?.blockedDates) {
        setBlockedDates(cfgRes.blockedDates);
        localStorage.setItem('salon_blocked_dates', JSON.stringify(cfgRes.blockedDates));
      }

      if (setupRes) {
        setIsSetupCompleted(setupRes.isSetupCompleted);
        localStorage.setItem('salon_setup_completed', String(setupRes.isSetupCompleted));
      }

      // Check if we need to sync local storage customized state to server (container restart recovery)
      const cachedSettings = localStorage.getItem('salon_settings');
      if (cachedSettings && (!cfgRes?.phone || cfgRes.phone === '+91 78800 86990')) {
        try {
          const parsed = JSON.parse(cachedSettings);
          if (parsed.phone && parsed.phone !== '+91 78800 86990') {
            await api.syncState({ settings: parsed });
          }
        } catch {}
      }
    } catch (err) {
      console.error('Failed to load salon public data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize authenticated customer session with server to guarantee accurate auth state
  useEffect(() => {
    fetchPublicData();

    const token = api.getCustomerToken();
    if (!token) {
      if (customerUser) {
        setCustomerUser(null);
        localStorage.removeItem('salon_customer_user');
      }
      return;
    }

    // Verify customer token with backend
    api.getCustomerMe()
      .then((res) => {
        if (res && res.customer) {
          setCustomerUser(res.customer);
          localStorage.setItem('salon_customer_user', JSON.stringify(res.customer));
        }
      })
      .catch((err) => {
        console.warn('[Customer Auth Sync Notice]: Stale customer session cleared', err?.message);
        api.clearCustomerToken();
        localStorage.removeItem('salon_customer_user');
        setCustomerUser(null);
      });
  }, []);

  const handleCustomerUserChange = (u: { id: string; name: string; email: string; phone: string; isVerified?: boolean } | null) => {
    setCustomerUser(u);
    if (u) {
      localStorage.setItem('salon_customer_user', JSON.stringify(u));
    } else {
      localStorage.removeItem('salon_customer_user');
      api.clearCustomerToken();
    }
  };

  const handleOpenBooking = (serviceId?: string) => {
    if (serviceId) {
      setSelectedServiceIdForBooking(serviceId);
    } else {
      setSelectedServiceIdForBooking(null);
    }
    setBookingModalOpen(true);
  };

  const handleOpenAdmin = (mode?: 'login' | 'signup') => {
    if (mode) {
      setAdminInitialMode(mode);
    } else {
      setAdminInitialMode(isSetupCompleted ? 'login' : 'signup');
    }
    setAdminPortalOpen(true);
  };

  const handleExploreServices = () => {
    const el = document.getElementById('services');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const salonPhone = settings?.phone || '+91 91316 29031';
  const cleanPhone = salonPhone.replace(/[^0-9+]/g, '');

  return (
    <div className="w-full max-w-full overflow-x-hidden min-h-screen min-h-[100dvh] flex flex-col bg-[#FBFBFA] dark:bg-[#141312] text-[#1C1B1A] dark:text-white transition-colors">
      {/* 3-Zone Top Navigation Bar */}
      <Header
        onOpenBooking={() => handleOpenBooking()}
        onOpenCustomerSettings={() => setCustomerSettingsOpen(true)}
        settings={settings}
        currentTheme={customerTheme}
        onToggleTheme={() => setCustomerTheme(customerTheme === 'dark' ? 'light' : 'dark')}
        customerUser={customerUser}
        isAdminLoggedIn={isAdminLoggedIn}
        onOpenAdmin={() => handleOpenAdmin('login')}
      />

      {/* Main Public Content */}
      <main className="flex-1 w-full max-w-full pb-20 md:pb-0">
        {/* Luxury Hero Banner */}
        <Hero
          onOpenBooking={() => handleOpenBooking()}
          onExploreServices={handleExploreServices}
          settings={settings}
          businessHours={businessHours}
        />

        {/* Live Service Catalogue */}
        <ServicesCatalogue
          services={services}
          categories={categories}
          onSelectServiceToBook={(serviceId) => handleOpenBooking(serviceId)}
        />

        {/* Salon Experience & Ambience Story */}
        <SalonExperience settings={settings} onOpenBooking={() => handleOpenBooking()} />

        {/* Visual Gallery with Lightbox */}
        <GallerySection gallery={gallery} settings={settings} />

        {/* Verified Customer Reviews */}
        <ReviewsSection
          reviews={reviews}
          customerUser={customerUser}
          onReviewSubmitted={(newRev) => {
            setReviews((prev) => [newRev, ...prev.filter((r) => r.id !== newRev.id)]);
          }}
        />

        {/* Location, Click-to-Call, Hours & Maps */}
        <LocationHours
          businessHours={businessHours}
          blockedDates={blockedDates}
          onOpenBooking={() => handleOpenBooking()}
          settings={settings}
        />
      </main>

      {/* Luxury Footer (Contains Admin Sign-Up / Login links & generous mobile clearance) */}
      <Footer
        onOpenBooking={() => handleOpenBooking()}
        onOpenAdmin={handleOpenAdmin}
        isSetupCompleted={isSetupCompleted}
        settings={settings}
        businessHours={businessHours}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminLogout={async () => {
          try {
            await api.adminLogout();
          } catch {}
          api.clearAdminToken();
          setIsAdminLoggedIn(false);
        }}
      />

      {/* Interactive Appointment Booking Modal */}
      <BookingModal
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        preSelectedServiceId={selectedServiceIdForBooking}
        services={services}
        categories={categories}
        settings={settings}
        businessHours={businessHours}
        blockedDates={blockedDates}
        customerUser={customerUser}
        onCustomerUserChange={handleCustomerUserChange}
        onOpenCustomerSettings={() => {
          setCustomerInitialTab('bookings');
          setCustomerSettingsOpen(true);
        }}
      />

      {/* Customer Account, Profile, Theme (Dark/Light) & My Bookings Modal */}
      <CustomerSettingsModal
        isOpen={customerSettingsOpen}
        onClose={() => setCustomerSettingsOpen(false)}
        settings={settings}
        onOpenBooking={() => {
          setCustomerSettingsOpen(false);
          handleOpenBooking();
        }}
        currentTheme={customerTheme}
        onThemeChange={(newTheme) => setCustomerTheme(newTheme)}
        customerUser={customerUser}
        onCustomerUserChange={handleCustomerUserChange}
        initialTab={customerInitialTab}
      />

      {/* Protected Admin Management Portal */}
      <AdminPortal
        isOpen={adminPortalOpen}
        onClose={() => {
          setAdminPortalOpen(false);
          fetchPublicData();
        }}
        onDataChanged={fetchPublicData}
        initialMode={adminInitialMode}
        onSetupStatusChange={(status) => {
          setIsSetupCompleted(status);
          localStorage.setItem('salon_setup_completed', String(status));
        }}
        onAdminAuthChange={(isLoggedIn) => {
          setIsAdminLoggedIn(isLoggedIn);
        }}
        adminTheme={adminTheme}
        onAdminThemeToggle={() => setAdminTheme(adminTheme === 'dark' ? 'light' : 'dark')}
        settings={settings}
        onSettingsChange={(newSettings) => {
          setSettings(newSettings);
          localStorage.setItem('salon_settings', JSON.stringify(newSettings));
        }}
      />

      {/* Clean & Spacious Mobile Bottom Sticky Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 px-4 py-2.5 bg-[#FAF6F0]/95 dark:bg-[#1A1716]/95 backdrop-blur-md border-t border-[#E8DDD3] dark:border-white/10 shadow-xl flex items-center gap-2 pb-[max(env(safe-area-inset-bottom),0.75rem)]">
        {/* Direct Phone Call */}
        <a
          href={`tel:${cleanPhone}`}
          className="p-3 bg-white dark:bg-white/10 border border-[#E8DDD3] dark:border-white/20 text-[#2B2523] dark:text-white rounded-xl flex items-center justify-center shadow-2xs shrink-0 active:scale-95 transition-transform"
          title="Call salon directly"
        >
          <Phone className="w-4 h-4 text-[#B86546]" />
        </a>

        {/* Customer Account */}
        <button
          type="button"
          onClick={() => setCustomerSettingsOpen(true)}
          className="py-3 px-3 bg-white dark:bg-white/10 border border-[#E8DDD3] dark:border-white/20 text-[#2B2523] dark:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap active:scale-95 transition-transform"
          title="My Bookings & Theme"
        >
          <User className="w-4 h-4 text-[#B86546]" />
          <span>{customerUser ? customerUser.name.split(' ')[0] : 'Account'}</span>
        </button>

        {/* Admin Dashboard Switcher on Mobile (When authenticated) */}
        {isAdminLoggedIn && (
          <button
            type="button"
            onClick={() => handleOpenAdmin('login')}
            className="py-3 px-3 bg-[#F4EAE1] dark:bg-white/10 border border-[#B86546] text-[#B86546] dark:text-[#D98263] text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer whitespace-nowrap active:scale-95 transition-transform"
            title="Switch to Admin Dashboard"
          >
            <Sliders className="w-4 h-4 text-[#B86546]" />
            <span>Admin</span>
          </button>
        )}

        {/* Primary Book Appointment CTA */}
        <button
          type="button"
          onClick={() => handleOpenBooking()}
          className="flex-1 py-3 px-3.5 bg-[#B86546] hover:bg-[#A25336] text-white text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-md cursor-pointer whitespace-nowrap active:scale-95 transition-transform"
        >
          <Calendar className="w-4 h-4 text-white" />
          <span>Book</span>
        </button>
      </div>
    </div>
  );
}
