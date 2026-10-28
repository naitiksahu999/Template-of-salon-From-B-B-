import React from 'react';
import { Phone, MapPin, Mail, Lock, UserPlus, Sliders, LogOut } from 'lucide-react';
import { SiteSettings, BusinessHoursDay } from '../types/index.ts';

interface FooterProps {
  onOpenBooking: () => void;
  onOpenAdmin: (mode?: 'login' | 'signup') => void;
  isSetupCompleted?: boolean;
  settings?: SiteSettings | null;
  businessHours?: BusinessHoursDay[];
  isAdminLoggedIn?: boolean;
  onAdminLogout?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenBooking,
  onOpenAdmin,
  isSetupCompleted = true,
  settings,
  businessHours = [],
  isAdminLoggedIn = false,
  onAdminLogout
}) => {
  const salonTitle = settings?.salonName || 'B & B Family Salon';
  const salonAddress = settings?.address || '2nd Floor, Ultimate Arcade, F11-12, Kolar Road';
  const salonLandmarks = settings?.landmarks || 'Near Sagar Gaire & Vishal Mega Mart';
  const salonCityState = `${settings?.city || 'Bhopal'}, ${settings?.state || 'MP'} ${settings?.pincode || '462042'}`;
  const salonPhone = settings?.phone || '+91 91316 29031';
  const cleanPhone = salonPhone.replace(/[^0-9+]/g, '');
  const salonEmail = settings?.email || 'contact@bbfamilysalon.com';

  const formatTimeStr = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h)) return t;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const openDays = businessHours.filter((b) => b.isOpen);
  const openDaysLabel = openDays.length === 7 ? 'Monday – Sunday' : `${openDays.length} Days a Week`;
  const scheduleDisplay =
    openDays.length > 0 && openDays[0].openTime && openDays[0].closeTime
      ? `${formatTimeStr(openDays[0].openTime)} – ${formatTimeStr(openDays[0].closeTime)}`
      : '10:00 AM – 9:00 PM';

  return (
    <footer className="bg-[#FAF7F2] dark:bg-[#141312] text-[#1C1B1A] dark:text-white/80 pt-16 pb-36 sm:pb-28 md:pb-16 border-t border-[#E6D4BA]/60 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#E6D4BA]/50 dark:border-white/10 text-xs">
          {/* Brand Info */}
          <div className="space-y-3">
            <h3 className="text-xl font-serif font-bold text-[#1C1B1A] dark:text-white tracking-tight">
              {salonTitle}
            </h3>
            <p className="text-[#79746D] dark:text-white/60 leading-relaxed">
              {settings?.alternateName || 'B&B Unisex Salon'} is a premier grooming and personal care destination at {salonAddress}, {salonLandmarks}, {settings?.city || 'Bhopal'}. Dedicated to precision hair styling, skincare rituals, and couture bridal makeup.
            </p>
            <p className="text-[#9C753D] dark:text-[#C29F67] font-bold">
              4.9 ★ Rated on Google Reviews
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-[#1C1B1A] dark:text-white">
              Navigation
            </h4>
            <ul className="space-y-2 text-[#79746D] dark:text-white/70">
              <li>
                <a href="#services" className="hover:text-[#1C1B1A] dark:hover:text-white transition-colors">
                  Hair Craft & Treatments
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-[#1C1B1A] dark:hover:text-white transition-colors">
                  Facials & Skin Care
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-[#1C1B1A] dark:hover:text-white transition-colors">
                  Bridal & Occasion Makeup
                </a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-[#1C1B1A] dark:hover:text-white transition-colors">
                  Salon Gallery & Ambience
                </a>
              </li>
              <li>
                <a href="#reviews" className="hover:text-[#1C1B1A] dark:hover:text-white transition-colors">
                  Customer Testimonials
                </a>
              </li>
              <li className="pt-2 border-t border-[#E6D4BA]/40 dark:border-white/10">
                {isAdminLoggedIn ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenAdmin('login')}
                      className="flex items-center gap-1.5 text-[#9C753D] dark:text-[#C29F67] hover:underline underline-offset-4 transition-colors font-bold cursor-pointer text-left"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#C29F67] shrink-0" />
                      <span>Switch to Admin Dashboard</span>
                    </button>
                    {onAdminLogout && (
                      <button
                        type="button"
                        onClick={onAdminLogout}
                        className="text-red-500 hover:text-red-600 transition-colors font-semibold cursor-pointer text-[11px]"
                      >
                        Sign Out
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenAdmin('login')}
                    className="flex items-center gap-1.5 text-[#79746D] dark:text-white/70 hover:text-[#1C1B1A] dark:hover:text-white transition-colors cursor-pointer text-left font-semibold"
                  >
                    <Lock className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67] shrink-0" />
                    <span>Admin Console Login</span>
                  </button>
                )}
              </li>
            </ul>
          </div>

          {/* Address & Contact */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-[#1C1B1A] dark:text-white">
              Contact & Location
            </h4>
            <div className="space-y-2 text-[#79746D] dark:text-white/70">
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67] shrink-0 mt-0.5" />
                <span>
                  {salonAddress} ({salonLandmarks}), {salonCityState}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67] shrink-0" />
                <a href={`tel:${cleanPhone}`} className="hover:text-[#1C1B1A] dark:hover:text-white transition-colors">
                  {salonPhone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67] shrink-0" />
                <a href={`mailto:${salonEmail}`} className="hover:text-[#1C1B1A] dark:hover:text-white transition-colors">
                  {salonEmail}
                </a>
              </div>
            </div>
          </div>

          {/* Booking Hours */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider font-bold text-[#1C1B1A] dark:text-white">
              Operating Hours
            </h4>
            <p className="text-[#79746D] dark:text-white/70">
              {openDaysLabel}: <br />
              <strong className="text-[#1C1B1A] dark:text-white font-bold">{scheduleDisplay}</strong>
            </p>
            <p className="text-[11px] text-[#79746D]/80 dark:text-white/50">
              Walk-ins welcome based on stylist availability. Advance reservations recommended.
            </p>
            <button
              type="button"
              onClick={onOpenBooking}
              className="mt-2 w-full py-2.5 px-4 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Book an Appointment
            </button>
          </div>
        </div>

        {/* Quiet Sub-footer */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#79746D] dark:text-white/50">
          <p>© {new Date().getFullYear()} B & B Family Salon. All rights reserved. Bhopal, Madhya Pradesh.</p>
          <div className="flex items-center gap-4">
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onOpenAdmin('login')}
                  className="flex items-center gap-1.5 text-[#9C753D] dark:text-[#C29F67] hover:underline underline-offset-4 transition-colors font-bold cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Switch to Admin Dashboard</span>
                </button>
                {onAdminLogout && (
                  <button
                    type="button"
                    onClick={onAdminLogout}
                    className="text-red-500 hover:text-red-600 transition-colors font-semibold cursor-pointer text-[11px]"
                  >
                    Sign Out
                  </button>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAdmin('login')}
                className="hover:text-[#1C1B1A] dark:hover:text-white flex items-center gap-1.5 text-[#9C753D] dark:text-[#C29F67] hover:underline underline-offset-4 transition-colors font-bold cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Admin Login (Slot Booked)</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean cushion so page clears the fixed bottom mobile bar without unnecessary scrolling */}
        <div className="h-20 sm:h-10 w-full pointer-events-none" aria-hidden="true" />
      </div>
    </footer>
  );
};
