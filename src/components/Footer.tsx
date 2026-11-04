import React from 'react';
import { Phone, MapPin, Mail, Lock, Sliders, Instagram, Facebook, MessageCircle } from 'lucide-react';
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
  const salonTitle = settings?.salonName || 'Tassel Unisex Salon';
  const salonAddress = settings?.address || 'Kolar Road, Good Shapard Kalan, Mandakini Colony';
  const salonLandmarks = settings?.landmarks || 'Mandakini Colony, Kolar Road';
  const salonCityState = `${settings?.city || 'Bhopal'}, ${settings?.state || 'MP'} ${settings?.pincode || '462042'}`;
  const salonPhone = settings?.phone || '+91 78800 86990';
  const cleanPhone = salonPhone.replace(/[^0-9+]/g, '');
  const salonEmail = settings?.email || 'contact@tasselunisexsalon.com';

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
    <footer className="bg-[#B86546] text-[#FAF6F0] pt-16 pb-36 sm:pb-28 md:pb-16 border-t border-[#A25336] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 pb-12 border-b border-[#FAF6F0]/20 text-xs">
          
          {/* Brand & Wordmark matching bottom of reference photo */}
          <div className="space-y-4">
            <div className="space-y-1">
              <span className="font-serif text-2xl sm:text-3xl font-light tracking-wide text-white block">
                TASSEL
              </span>
              <span className="text-[10px] uppercase tracking-[0.25em] text-[#F4EAE1]/80 font-bold block">
                UNISEX SALON · BHOPAL
              </span>
            </div>
            <p className="text-[#F4EAE1]/85 leading-relaxed text-xs max-w-xs">
              Where beauty meets confidence. Dedicated to precision hair craft, skin wellness, and bespoke grooming rituals.
            </p>
            {/* Circular Social Buttons matching reference image */}
            <div className="flex items-center gap-2.5 pt-1">
              <a
                href={`https://wa.me/${cleanPhone.replace('+', '')}`}
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="WhatsApp salon"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="Instagram"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="Facebook"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href={`tel:${cleanPhone}`}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white transition-colors cursor-pointer"
                title="Call salon"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-widest font-bold text-white">
              Quick Links
            </h4>
            <ul className="space-y-2 text-[#F4EAE1]/85">
              <li>
                <a href="#home" className="hover:text-white transition-colors">
                  Home
                </a>
              </li>
              <li>
                <a href="#services" className="hover:text-white transition-colors">
                  Hair & Skin Services
                </a>
              </li>
              <li>
                <a href="#experience" className="hover:text-white transition-colors">
                  About Our Salon
                </a>
              </li>
              <li>
                <a href="#gallery" className="hover:text-white transition-colors">
                  Salon Gallery & Portfolio
                </a>
              </li>
              <li>
                <a href="#location" className="hover:text-white transition-colors">
                  Visit & Directions
                </a>
              </li>
            </ul>
          </div>

          {/* Information & Admin */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-widest font-bold text-white">
              Information
            </h4>
            <ul className="space-y-2 text-[#F4EAE1]/85">
              <li>
                <button
                  type="button"
                  onClick={onOpenBooking}
                  className="hover:text-white transition-colors cursor-pointer text-left"
                >
                  Book Appointment
                </button>
              </li>
              <li>
                <span className="text-[#F4EAE1]/60">Transparent Pricing</span>
              </li>
              <li>
                <span className="text-[#F4EAE1]/60">Expert Certified Stylists</span>
              </li>
              <li>
                <span className="text-[#F4EAE1]/60">Mandakini Colony, Kolar Road</span>
              </li>
              <li className="pt-2 border-t border-white/15">
                {isAdminLoggedIn ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onOpenAdmin('login')}
                      className="flex items-center gap-1.5 text-white hover:underline underline-offset-4 transition-colors font-bold cursor-pointer text-left"
                    >
                      <Sliders className="w-3.5 h-3.5 text-[#F4EAE1] shrink-0" />
                      <span>Admin Dashboard</span>
                    </button>
                    {onAdminLogout && (
                      <button
                        type="button"
                        onClick={onAdminLogout}
                        className="text-[#F4EAE1]/80 hover:text-white transition-colors font-semibold cursor-pointer text-[11px] underline"
                      >
                        Sign Out
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenAdmin('login')}
                    className="flex items-center gap-1.5 text-[#F4EAE1]/90 hover:text-white transition-colors cursor-pointer text-left font-semibold"
                  >
                    <Lock className="w-3.5 h-3.5 text-white shrink-0" />
                    <span>Admin Portal Login</span>
                  </button>
                )}
              </li>
            </ul>
          </div>

          {/* Contact Details */}
          <div className="space-y-3">
            <h4 className="text-[11px] uppercase tracking-widest font-bold text-white">
              Contact & Hours
            </h4>
            <div className="space-y-2.5 text-[#F4EAE1]/85">
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-white shrink-0" />
                <a href={`tel:${cleanPhone}`} className="hover:text-white transition-colors font-semibold">
                  {salonPhone}
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-white shrink-0" />
                <a href={`mailto:${salonEmail}`} className="hover:text-white transition-colors truncate">
                  {salonEmail}
                </a>
              </div>
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-white shrink-0 mt-0.5" />
                <span>
                  {salonAddress}, {salonLandmarks}, {salonCityState}
                </span>
              </div>
              <div className="pt-2 border-t border-white/15 text-[11px] text-[#F4EAE1]/80">
                <span>{openDaysLabel}: </span>
                <strong className="text-white font-bold">{scheduleDisplay}</strong>
              </div>
            </div>
          </div>

        </div>

        {/* Sub-footer copyright */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-[#F4EAE1]/75">
          <p>© {new Date().getFullYear()} Tassel Unisex Salon. All rights reserved. Bhopal, Madhya Pradesh.</p>
          <div className="flex items-center gap-4">
            {isAdminLoggedIn ? (
              <button
                type="button"
                onClick={() => onOpenAdmin('login')}
                className="hover:text-white transition-colors cursor-pointer font-medium"
              >
                Admin Console
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onOpenAdmin('login')}
                className="hover:text-white transition-colors cursor-pointer font-medium flex items-center gap-1"
              >
                <Lock className="w-3 h-3" />
                <span>Admin Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Cushion so page clears the fixed bottom mobile bar */}
        <div className="h-20 sm:h-10 w-full pointer-events-none" aria-hidden="true" />
      </div>
    </footer>
  );
};
