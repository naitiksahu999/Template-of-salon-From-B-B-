import React from 'react';
import { ShieldCheck, Users, Sparkles, Award } from 'lucide-react';
import { SiteSettings } from '../types/index.ts';

interface SalonExperienceProps {
  settings?: SiteSettings | null;
}

export const SalonExperience: React.FC<SalonExperienceProps> = ({ settings }) => {
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
  const secondBannerBadge = settings?.secondHeroBadge || 'The B&B Experience';
  const secondBannerTitle = settings?.secondHeroTitle || 'A Higher Standard for Everyday Personal Care in Bhopal';
  const secondBannerSubtitle = settings?.secondHeroSubtitle || 'We founded B&B Family Salon with a simple principle: modern hair styling and restorative beauty should be an unhurried, comfortable experience in an exceptionally clean environment. Whether you are stepping in for a quick precision haircut or a complete bridal transformation, our team respects your time and comfort.';
  const secondBannerHighlight = settings?.secondHeroHighlight || `Clean, calm, and climate-controlled at Ultimate Arcade, ${settings?.city || 'Bhopal'}.`;

  return (
    <section id="experience" className="py-20 bg-[#FBFBFA] dark:bg-[#141312] border-t border-[#E6D4BA]/30 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Second Hero Showcase Banner */}
          <div className="lg:col-span-6 relative">
            <div className="relative rounded-2xl overflow-hidden shadow-xl border border-[#E6D4BA]/60 dark:border-white/10 bg-[#FAF7F2] dark:bg-white/5">
              <img
                src={secondBannerPhoto}
                alt="Client reception and waiting lounge at B&B Family Salon"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=1000&q=80';
                }}
                className="w-full aspect-[4/3] object-cover transition-transform duration-700 hover:scale-105"
                loading="lazy"
              />
            </div>
            {/* Small floating detail accent */}
            <div className="hidden sm:block absolute -bottom-6 -right-6 w-60 p-4 bg-white/95 dark:bg-[#1C1B1A]/95 backdrop-blur-md border border-[#E6D4BA]/80 dark:border-white/20 rounded-xl shadow-lg">
              <span className="text-[10px] uppercase font-bold text-[#9C753D] dark:text-[#C29F67] tracking-wider">
                Sanctuary Standard
              </span>
              <p className="text-xs font-serif font-bold text-[#1C1B1A] dark:text-white mt-0.5">
                {secondBannerHighlight}
              </p>
            </div>
          </div>

          {/* Right Column: Values & Story */}
          <div className="lg:col-span-6 space-y-6">
            <span className="text-xs uppercase tracking-widest text-[#9C753D] dark:text-[#C29F67] font-bold">
              {secondBannerBadge}
            </span>
            <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#1C1B1A] dark:text-white leading-tight">
              {secondBannerTitle}
            </h2>
            <p className="text-sm font-medium text-[#79746D] dark:text-gray-300 leading-relaxed">
              {secondBannerSubtitle}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-4">
              {pillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.title} className="space-y-1.5 p-3 rounded-xl bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/50 dark:border-white/10 shadow-2xs">
                    <div className="w-8 h-8 rounded-lg bg-[#FAF7F2] dark:bg-white/5 border border-[#E6D4BA]/60 dark:border-white/10 flex items-center justify-center text-[#C29F67]">
                      <Icon className="w-4 h-4" />
                    </div>
                    <h3 className="text-xs font-bold text-[#1C1B1A] dark:text-white">
                      {pillar.title}
                    </h3>
                    <p className="text-[11px] text-[#79746D] dark:text-gray-400 leading-relaxed font-medium">
                      {pillar.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
