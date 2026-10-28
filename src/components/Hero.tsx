import React from 'react';
import { Calendar, ArrowRight, Star, Clock, MapPin, Sparkles } from 'lucide-react';
import { SiteSettings, BusinessHoursDay } from '../types/index.ts';

interface HeroProps {
  onOpenBooking: () => void;
  onExploreServices: () => void;
  settings?: SiteSettings | null;
  businessHours?: BusinessHoursDay[];
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking, onExploreServices, settings, businessHours = [] }) => {
  const salonTitle = settings?.salonName || 'B & B Family Salon';
  const salonTagline = settings?.tagline || 'The Art of Refined Grooming & Beauty Sanctuary in Bhopal';
  const salonLandmarks = settings?.landmarks || 'Near Sagar Gaire, Kolar Rd';
  const salonAddress = settings?.address || '2nd Floor, Ultimate Arcade, F11-12, Kolar Road';

  // Compute live operating hours from businessHours
  const formatTimeStr = (t?: string) => {
    if (!t) return '';
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h)) return t;
    const period = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, '0')} ${period}`;
  };

  const currentDayOfWeek = new Date().getDay();
  const todaySchedule = businessHours.find((b) => b.dayOfWeek === currentDayOfWeek);
  const openDaysCount = businessHours.filter((b) => b.isOpen).length;

  let hoursDisplayText = 'Open 7 Days a Week (10 AM – 9 PM)';
  let hoursSubtext = 'Instant appointments with live WhatsApp confirmations';

  if (businessHours.length > 0) {
    const firstOpen = businessHours.find((b) => b.isOpen);
    if (firstOpen) {
      const openFormatted = formatTimeStr(firstOpen.openTime);
      const closeFormatted = formatTimeStr(firstOpen.closeTime);
      const daysText = openDaysCount === 7 ? 'Open 7 Days a Week' : `Open ${openDaysCount} Days a Week`;
      hoursDisplayText = `${daysText} (${openFormatted} – ${closeFormatted})`;
    }
    if (todaySchedule) {
      hoursSubtext = todaySchedule.isOpen
        ? `Today: Open ${formatTimeStr(todaySchedule.openTime)} – ${formatTimeStr(todaySchedule.closeTime)}`
        : 'Closed Today · Walk-ins & advance bookings welcome';
    }
  }

  return (
    <section className="relative overflow-hidden pt-8 pb-16 lg:py-20 bg-[#FBFBFA] dark:bg-[#141312] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* CENTER-ALIGNED BIG BOLD SALON HEADING */}
        <div className="text-center max-w-4xl mx-auto mb-10 sm:mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-[#9C753D] dark:text-[#C29F67] uppercase tracking-widest mb-3 bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 px-3.5 py-1.5 rounded-full shadow-2xs">
            <Star className="w-3.5 h-3.5 fill-[#C29F67] text-[#C29F67]" />
            <span>{settings?.heroBadge || `4.9 / 5.0 Google Verified Luxury Sanctuary · ${settings?.city || 'Bhopal'}`}</span>
          </div>

          <h1 className="text-center font-serif font-black tracking-tight text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl text-[#1C1B1A] dark:text-white uppercase leading-tight sm:leading-[1.04] break-words">
            {salonTitle}
          </h1>

          <p className="text-center text-base sm:text-xl lg:text-2xl font-bold text-[#9C753D] dark:text-[#E6D4BA] max-w-3xl mx-auto mt-3 tracking-wide">
            {settings?.heroHeadline || salonTagline}
          </p>

          <p className="text-center text-xs sm:text-sm lg:text-base font-medium text-[#79746D] dark:text-gray-300 max-w-2xl mx-auto mt-2.5 sm:mt-3 leading-relaxed">
            {settings?.heroSubtitle || (
              <>Welcome to <strong className="text-[#1C1B1A] dark:text-white font-bold">{salonTitle}</strong> — A serene sanctuary offering precision haircuts, restorative skin therapies, and couture bridal artistry at <span className="font-semibold text-[#1C1B1A] dark:text-white">{salonAddress}</span> ({salonLandmarks}).</>
            )}
          </p>

          {/* Central CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-3.5 pt-5 sm:pt-6">
            <button
              type="button"
              onClick={onOpenBooking}
              className="w-full sm:w-auto px-7 sm:px-8 py-3.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2.5 cursor-pointer active:scale-98"
            >
              <Calendar className="w-4 h-4 text-[#C29F67] dark:text-[#1C1B1A]" />
              <span>Book Appointment Now</span>
            </button>
            <button
              type="button"
              onClick={onExploreServices}
              className="w-full sm:w-auto px-6 sm:px-7 py-3.5 bg-white dark:bg-white/10 hover:bg-[#FAF7F2] dark:hover:bg-white/15 text-[#1C1B1A] dark:text-white border border-[#E6D4BA]/90 dark:border-white/20 text-xs uppercase tracking-wider font-bold rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-98"
            >
              <span>Explore Services & Menu</span>
              <ArrowRight className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
            </button>
          </div>
        </div>

        {/* Feature & Ambience Showcase Grid - Visual First on Mobile for Instant Engagement */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center pt-2">
          {/* Right Column: Hero Showcase Image (order-1 on mobile, order-2 on lg) */}
          <div className="order-1 lg:order-2 lg:col-span-7">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-[#E6D4BA]/80 dark:border-white/10 bg-[#FAF7F2] dark:bg-white/5 group">
              <img
                src={settings?.heroBannerUrl || "/assets/images/hero_salon_interior_1790779465939.jpg"}
                alt="Interior view of B&B Family Salon featuring luxury styling stations and ambient lighting"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80';
                }}
                className="w-full aspect-[16/10] sm:aspect-[16/9] lg:aspect-[16/10] object-cover object-center transition-transform duration-700 group-hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute bottom-3.5 sm:bottom-5 left-3.5 sm:left-5 right-3.5 sm:right-5 text-white">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#E6D4BA] font-bold">
                  B&B Salon Sanctuary Ambience
                </span>
                <p className="text-xs sm:text-base font-bold text-white/95 mt-0.5 leading-snug">
                  Ergonomic styling chairs & halo vanity mirrors at Ultimate Arcade, Kolar Road
                </p>
              </div>
            </div>
          </div>

          {/* Left Column: Trust Proof Highlights (order-2 on mobile, order-1 on lg) */}
          <div className="order-2 lg:order-1 lg:col-span-5 space-y-3 sm:space-y-4">
            <div className="p-4 sm:p-5 bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/70 dark:border-white/10 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-white/5 flex items-center justify-center text-[#9C753D] shrink-0">
                  <Sparkles className="w-5 h-5 text-[#C29F67]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#1C1B1A] dark:text-white text-xs sm:text-sm truncate sm:whitespace-normal">Unisex & Dedicated Family Zones</h3>
                  <p className="text-[11px] sm:text-xs text-[#79746D] dark:text-gray-400 mt-0.5 font-medium leading-relaxed">Separate styling chairs & private hygienic aesthetic suites</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/70 dark:border-white/10 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-white/5 flex items-center justify-center text-[#9C753D] shrink-0">
                  <Clock className="w-5 h-5 text-[#C29F67]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#1C1B1A] dark:text-white text-xs sm:text-sm truncate sm:whitespace-normal">{hoursDisplayText}</h3>
                  <p className="text-[11px] sm:text-xs text-[#79746D] dark:text-gray-400 mt-0.5 font-medium leading-relaxed">{hoursSubtext}</p>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-5 bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/70 dark:border-white/10 rounded-2xl shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FAF7F2] dark:bg-white/5 flex items-center justify-center text-[#9C753D] shrink-0">
                  <MapPin className="w-5 h-5 text-[#C29F67]" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#1C1B1A] dark:text-white text-xs sm:text-sm truncate sm:whitespace-normal">Ultimate Arcade, Kolar Road</h3>
                  <p className="text-[11px] sm:text-xs text-[#79746D] dark:text-gray-400 mt-0.5 font-medium leading-relaxed">{salonLandmarks}, Bhopal (Pincode: {settings?.pincode || '462042'})</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
