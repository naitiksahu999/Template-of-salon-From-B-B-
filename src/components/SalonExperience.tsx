import React from 'react';
import { ShieldCheck, Users, Sparkles, Award, ArrowRight } from 'lucide-react';
import { SiteSettings } from '../types/index.ts';

interface SalonExperienceProps {
  settings?: SiteSettings | null;
  onOpenBooking?: () => void;
}

export const SalonExperience: React.FC<SalonExperienceProps> = ({ settings, onOpenBooking }) => {
  const pillars = [
    {
      icon: ShieldCheck,
      title: 'Hospital-Grade Hygiene Protocol',
      description: 'Sterilized shears, heat-autoclaved tools, single-use disposables, and pristine station sanitation after every service.'
    },
    {
      icon: Users,
      title: 'Unisex & Family-Centered Comfort',
      description: 'Thoughtfully designed zones ensuring comfortable styling for gentlemen, gentle care for children, and privacy for ladies.'
    },
    {
      icon: Sparkles,
      title: 'Certified Stylists & Aestheticians',
      description: 'Experienced professionals who listen carefully, assess your skin/hair texture, and recommend customized treatments.'
    },
    {
      icon: Award,
      title: 'Tested International Products',
      description: 'Exclusively using genuine salon-grade hair colors, keratin complexes, and dermatologically tested botanical skincare.'
    }
  ];

  const secondBannerPhoto = settings?.secondHeroBannerUrl || '/assets/images/salon_ambience_lounge_1790779524195.jpg';
  const salonName = settings?.salonName || 'Tassel Unisex Salon';
  const city = settings?.city || 'Bhopal';

  return (
    <section id="experience" className="py-16 sm:py-24 bg-[#FAF6F0] dark:bg-[#141211] border-t border-[#E8DDD3] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        
        {/* Signature Terracotta Split Story Banner inspired by reference image */}
        <div className="bg-[#B86546] text-white rounded-3xl overflow-hidden shadow-xl grid grid-cols-1 lg:grid-cols-12 items-stretch">
          {/* Left Text Side */}
          <div className="lg:col-span-6 p-8 sm:p-12 lg:p-16 flex flex-col justify-center space-y-6">
            <span className="text-[11px] sm:text-xs uppercase tracking-widest font-bold text-[#F4EAE1]/90">
              More Than A Salon
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-normal leading-[1.15] text-[#FAF6F0]">
              It's Your Time.<br />
              <span className="italic font-light text-[#F4EAE1]">It's Your Glow.</span>
            </h2>
            <p className="text-sm sm:text-base font-normal text-[#F4EAE1]/90 leading-relaxed max-w-lg">
              We create more than beautiful hair and glowing skin — we create moments of self-care and confidence that stay with you long after you leave {salonName}, {city}.
            </p>
            <div className="pt-2">
              {onOpenBooking ? (
                <button
                  type="button"
                  onClick={onOpenBooking}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#FAF6F0] hover:bg-white text-[#B86546] font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-98 cursor-pointer"
                >
                  <span>Our Story & Experience</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <a
                  href="#services"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#FAF6F0] hover:bg-white text-[#B86546] font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md active:scale-98"
                >
                  <span>Our Story & Experience</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Right Image Side */}
          <div className="lg:col-span-6 relative min-h-[300px] lg:min-h-full">
            <img
              src={secondBannerPhoto}
              alt="Ambience and comfortable seating at Tassel Unisex Salon Bhopal"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=80';
              }}
              className="w-full h-full object-cover object-center"
              loading="lazy"
            />
            {/* Subtle inset highlight badge */}
            <div className="absolute bottom-4 right-4 bg-[#2B2523]/80 backdrop-blur-md px-3.5 py-1.5 rounded-lg border border-white/20 text-[11px] text-[#FAF6F0] font-medium">
              Mandakini Colony · Kolar Road
            </div>
          </div>
        </div>

        {/* Ready for Your Best Hair Callout with Arched Portal */}
        <div className="bg-[#FDFBF7] dark:bg-[#1A1716] border border-[#E8DDD3] dark:border-white/10 rounded-3xl p-8 sm:p-10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex items-center gap-6 flex-1">
            {/* Architectural Arched Portal Image */}
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0 rounded-t-[60px] rounded-b-2xl overflow-hidden border-2 border-[#E8DDD3] shadow-md bg-[#F4EDE4]">
              <img
                src="/assets/images/hero_salon_interior_1790779465939.jpg"
                alt="Tassel Salon styling sanctuary interior"
                className="w-full h-full object-cover object-center"
                loading="lazy"
              />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-[#2B2523] dark:text-white">
                Ready for <span className="italic font-normal text-[#B86546] dark:text-[#D98263]">Your Best Hair?</span>
              </h3>
              <p className="text-xs sm:text-sm text-[#665B55] dark:text-gray-300 max-w-md">
                Book your appointment today and let's craft your next head-turning hair and skincare moment.
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            {onOpenBooking ? (
              <button
                type="button"
                onClick={onOpenBooking}
                className="w-full md:w-auto px-6 py-3 bg-[#B86546] hover:bg-[#A25336] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Book Appointment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <a
                href="#services"
                className="w-full md:w-auto px-6 py-3 bg-[#B86546] hover:bg-[#A25336] text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Book Appointment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            )}
          </div>
        </div>

        {/* 4 Sanctuary Standard Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="space-y-2.5 p-5 rounded-2xl bg-[#FDFBF7] dark:bg-[#1A1716] border border-[#E8DDD3] dark:border-white/10 shadow-2xs hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-xl bg-[#F4EAE1] dark:bg-white/5 border border-[#E8DDD3] dark:border-white/10 flex items-center justify-center text-[#B86546] dark:text-[#D98263]">
                  <Icon className="w-4 h-4" />
                </div>
                <h4 className="text-sm font-bold text-[#2B2523] dark:text-white leading-snug">
                  {pillar.title}
                </h4>
                <p className="text-xs text-[#665B55] dark:text-gray-400 leading-relaxed">
                  {pillar.description}
                </p>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
};
