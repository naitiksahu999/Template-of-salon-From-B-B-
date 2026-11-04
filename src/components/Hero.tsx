import React from 'react';
import { Calendar, ArrowRight, Star, Clock, MapPin, Sparkles, Heart, Leaf, Scissors } from 'lucide-react';
import { SiteSettings, BusinessHoursDay } from '../types/index.ts';

interface HeroProps {
  onOpenBooking: () => void;
  onExploreServices: () => void;
  settings?: SiteSettings | null;
  businessHours?: BusinessHoursDay[];
}

export const Hero: React.FC<HeroProps> = ({ onOpenBooking, onExploreServices, settings, businessHours = [] }) => {
  const salonTitle = settings?.salonName || 'Tassel Unisex Salon';
  const salonAddress = settings?.address || 'Kolar Road, Good Shapard Kalan, Mandakini Colony';

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
  if (businessHours.length > 0) {
    const firstOpen = businessHours.find((b) => b.isOpen);
    if (firstOpen) {
      const openFormatted = formatTimeStr(firstOpen.openTime);
      const closeFormatted = formatTimeStr(firstOpen.closeTime);
      const daysText = openDaysCount === 7 ? 'Open 7 Days a Week' : `Open ${openDaysCount} Days a Week`;
      hoursDisplayText = `${daysText} (${openFormatted} – ${closeFormatted})`;
    }
  }

  const heroImage = settings?.heroBannerUrl || '/assets/images/hero_salon_interior_1790779465939.jpg';

  return (
    <section className="relative overflow-hidden pt-8 sm:pt-12 pb-16 lg:pb-24 bg-[#FAF6F0] dark:bg-[#181514] text-[#2B2523] dark:text-[#F5EDE6] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main 2-Column Hero Section matching reference photo */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          {/* Left Column: Editorial Headline & Actions */}
          <div className="lg:col-span-6 space-y-6">
            {/* Kicker label */}
            <div className="inline-block">
              <span className="text-[11px] sm:text-xs uppercase tracking-[0.22em] font-bold text-[#B86546] dark:text-[#D6AFA0] block">
                {settings?.heroBadge || 'WHERE CONFIDENCE BLOSSOMS'}
              </span>
            </div>

            {/* Editorial Serif Heading matching photo */}
            <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl text-[#2B2523] dark:text-white leading-[1.08] tracking-tight">
              Healthy Hair.<br />
              Beautiful You.<br />
              <span className="text-[#B86546] dark:text-[#D6AFA0] italic font-normal">Every Day.</span>
            </h1>

            {/* Thin Warm Line Accent */}
            <div className="w-14 h-0.5 bg-[#B86546]/60 dark:bg-[#D6AFA0]/60" />

            {/* Subtitle & Value Proposition */}
            <p className="text-sm sm:text-base text-[#665B55] dark:text-gray-300 max-w-lg leading-relaxed font-medium">
              {settings?.heroSubtitle || (
                <>Expert care. Personalized treatments. Effortless beauty that lasts. Welcome to <strong className="text-[#2B2523] dark:text-white font-bold">{salonTitle}</strong> at Mandakini Colony, Kolar Road, Bhopal.</>
              )}
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center gap-3.5 pt-2">
              <button
                type="button"
                onClick={onOpenBooking}
                className="px-7 py-3.5 bg-[#B86546] hover:bg-[#A25336] text-white text-xs uppercase tracking-wider font-bold rounded-md shadow-md hover:shadow-lg transition-all flex items-center gap-2.5 cursor-pointer active:scale-98"
              >
                <span>Book Your Experience</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={onExploreServices}
                className="px-6 py-3.5 bg-white dark:bg-white/10 hover:bg-[#F4EAE1] dark:hover:bg-white/15 text-[#2B2523] dark:text-white border border-[#E8DDD3] dark:border-white/15 text-xs uppercase tracking-wider font-bold rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
              >
                <span>View All Services</span>
              </button>
            </div>

            {/* Social Proof (Avatar cluster + ratings) */}
            <div className="flex items-center gap-3 pt-3">
              <div className="flex -space-x-2">
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80"
                  alt="Client"
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#FAF6F0] dark:border-[#181514]"
                />
                <img
                  src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80"
                  alt="Client"
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#FAF6F0] dark:border-[#181514]"
                />
                <img
                  src="https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&q=80"
                  alt="Client"
                  className="w-9 h-9 rounded-full object-cover border-2 border-[#FAF6F0] dark:border-[#181514]"
                />
              </div>
              <div className="text-xs">
                <p className="font-bold text-[#2B2523] dark:text-white leading-tight">Loved by 500+ clients</p>
                <div className="flex items-center gap-1 text-[#B86546] dark:text-[#D6AFA0] mt-0.5">
                  <span className="tracking-widest">★★★★★</span>
                  <span className="text-[11px] font-semibold text-[#665B55] dark:text-gray-400">4.9/5 (120+ reviews)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Architectural Arched Frame with Circular Artisan Stamp */}
          <div className="lg:col-span-6 relative flex justify-center">
            {/* The Arched Portal Frame inspired by the reference photo */}
            <div className="relative w-full max-w-[460px] aspect-[3/4] sm:aspect-[4/5] rounded-t-[140px] sm:rounded-t-[200px] lg:rounded-t-[240px] rounded-b-3xl overflow-hidden shadow-2xl border-4 border-white/80 dark:border-white/10 bg-white/50 dark:bg-white/5">
              <img
                src={heroImage}
                alt="Stylist crafting luxury hair treatment at Tassel Unisex Salon, Bhopal"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/assets/images/hero_salon_interior_1790779465939.jpg';
                }}
                className="w-full h-full object-cover object-center transition-transform duration-700 hover:scale-105"
                loading="eager"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {/* Bottom Subtle Location Badge */}
              <div className="absolute bottom-4 left-4 right-4 text-white text-xs pointer-events-none">
                <span className="text-[10px] uppercase tracking-wider text-[#F4EAE1] font-bold block">
                  Tassel Salon Sanctuary
                </span>
                <span className="font-semibold text-white/95 text-xs truncate block">
                  Mandakini Colony, Kolar Road, Bhopal
                </span>
              </div>
            </div>

            {/* Circular Artisan Stamp floating at the bottom right corner (from photo) */}
            <div className="absolute -bottom-4 right-4 sm:right-6 lg:-right-4 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#B86546] text-white flex flex-col items-center justify-center p-2 shadow-xl border-2 border-white/60 dark:border-[#181514] select-none pointer-events-none transform rotate-6">
              <Leaf className="w-5 h-5 text-[#F4EAE1] mb-0.5" />
              <span className="text-[8px] sm:text-[9px] uppercase tracking-widest font-black leading-tight text-center">
                TASSEL<br />SALON
              </span>
              <span className="text-[7px] text-[#F4EAE1] tracking-wider mt-0.5">EST. BHOPAL</span>
            </div>
          </div>
        </div>

        {/* 4 Feature Highlights Row (Directly matching the 4 icon pillars in the photo) */}
        <div className="mt-14 sm:mt-20 pt-8 sm:pt-10 border-t border-[#E8DDD3] dark:border-white/10 grid grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Pillar 1: Premium Products */}
          <div className="text-center sm:text-left space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#F4EAE1] dark:bg-white/5 flex items-center justify-center text-[#B86546] dark:text-[#D6AFA0] mx-auto sm:mx-0">
              <Leaf className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#2B2523] dark:text-white">
              Premium Products
            </h3>
            <p className="text-xs text-[#665B55] dark:text-gray-400 leading-relaxed font-medium">
              We use high-quality, international hair & skin formulations for lasting health and shine.
            </p>
          </div>

          {/* Pillar 2: Expert Stylists */}
          <div className="text-center sm:text-left space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#F4EAE1] dark:bg-white/5 flex items-center justify-center text-[#B86546] dark:text-[#D6AFA0] mx-auto sm:mx-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#2B2523] dark:text-white">
              Expert Stylists
            </h3>
            <p className="text-xs text-[#665B55] dark:text-gray-400 leading-relaxed font-medium">
              Highly trained professionals passionate about hair craft, restorative skin, and modern cuts.
            </p>
          </div>

          {/* Pillar 3: Personalized Care */}
          <div className="text-center sm:text-left space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#F4EAE1] dark:bg-white/5 flex items-center justify-center text-[#B86546] dark:text-[#D6AFA0] mx-auto sm:mx-0">
              <Heart className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#2B2523] dark:text-white">
              Personalized Care
            </h3>
            <p className="text-xs text-[#665B55] dark:text-gray-400 leading-relaxed font-medium">
              Custom treatments tailored to your hair texture, scalp condition, and unique aesthetic goals.
            </p>
          </div>

          {/* Pillar 4: Easy Booking */}
          <div className="text-center sm:text-left space-y-2">
            <div className="w-10 h-10 rounded-full bg-[#F4EAE1] dark:bg-white/5 flex items-center justify-center text-[#B86546] dark:text-[#D6AFA0] mx-auto sm:mx-0">
              <Calendar className="w-5 h-5" />
            </div>
            <h3 className="font-serif font-bold text-base sm:text-lg text-[#2B2523] dark:text-white">
              Easy Booking
            </h3>
            <p className="text-xs text-[#665B55] dark:text-gray-400 leading-relaxed font-medium">
              Book online in seconds, choose your preferred stylist, and receive live WhatsApp cards.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
