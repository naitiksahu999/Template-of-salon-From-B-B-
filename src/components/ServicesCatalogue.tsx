import React, { useState, useRef } from 'react';
import { Clock, Search, Sparkles, Check, ArrowRight, ArrowLeftRight, LayoutGrid } from 'lucide-react';
import { Service, ServiceCategory, formatServicePrice } from '../types/index.ts';

interface ServicesCatalogueProps {
  services: Service[];
  categories: ServiceCategory[];
  onSelectServiceToBook: (serviceId: string) => void;
}

export const ServicesCatalogue: React.FC<ServicesCatalogueProps> = ({
  services,
  categories,
  onSelectServiceToBook
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [mobileLayout, setMobileLayout] = useState<'horizontal' | 'grid'>('horizontal');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      const maxScroll = scrollWidth - clientWidth;
      if (maxScroll > 0) {
        setScrollProgress(Math.min(100, Math.max(0, (scrollLeft / maxScroll) * 100)));
      }
    }
  };

  const filteredServices = services.filter((service) => {
    if (!service.isActive) return false;
    const matchesCategory = selectedCategory === 'all' || service.categoryId === selectedCategory;
    const matchesSearch =
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCleanImageUrl = (url?: string) => {
    if (!url) return '/assets/images/salon_hair_styling_1790779479714.jpg';
    if (url.startsWith('/src/assets/')) return url.replace('/src/assets/', '/assets/');
    return url;
  };

  const fallbackImage = 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80';

  return (
    <section id="services" className="py-12 sm:py-20 bg-[#FAF7F2] dark:bg-[#141312] border-y border-[#E6D4BA]/30 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="text-[11px] sm:text-xs uppercase tracking-widest text-[#9C753D] dark:text-[#C29F67] font-bold">
              Curated Menu & Treatments
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#1C1B1A] dark:text-white">
              Service Catalogue
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#79746D] dark:text-gray-300 max-w-xl">
              All prices and durations are verified. Transparent personal care with no surprise add-ons.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search bar */}
            <div className="relative flex-1 md:w-72">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#79746D] dark:text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search treatments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-3 py-2 text-xs bg-white dark:bg-white/5 border border-[#E6D4BA]/80 dark:border-white/10 rounded-lg text-[#1C1B1A] dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#C29F67]"
              />
            </div>

            {/* Mobile View Toggle */}
            <div className="flex md:hidden items-center border border-[#E6D4BA]/80 dark:border-white/10 rounded-lg bg-white dark:bg-white/5 p-0.5">
              <button
                type="button"
                onClick={() => setMobileLayout('horizontal')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  mobileLayout === 'horizontal'
                    ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]'
                    : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white'
                }`}
                title="Swipe right-to-left"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setMobileLayout('grid')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  mobileLayout === 'grid'
                    ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A]'
                    : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters (Segmented Control) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 sm:mb-8 border-b border-[#E6D4BA]/40 dark:border-white/10 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] shadow-xs'
                : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
            }`}
          >
            All Treatments ({services.filter((s) => s.isActive).length})
          </button>
          {categories.map((cat) => {
            const count = services.filter((s) => s.isActive && s.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] shadow-xs'
                    : 'text-[#79746D] dark:text-gray-400 hover:text-[#1C1B1A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Services View */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/40 dark:border-white/10 rounded-2xl">
            <p className="text-sm font-bold text-[#1C1B1A] dark:text-white">No services found</p>
            <p className="text-xs text-[#79746D] dark:text-gray-400 mt-1">Try clearing your search query or switching categories.</p>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW: HORIZONTAL RIGHT-TO-LEFT SWIPEABLE CAROUSEL */}
            <div className="block md:hidden">
              {mobileLayout === 'horizontal' ? (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#9C753D] dark:text-[#C29F67] mb-2 px-1 font-bold">
                    <span className="flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-[#C29F67]" />
                      <span>Scroll Right to Left to explore treatments</span>
                    </span>
                    <span className="text-[10px] bg-[#9C753D]/10 dark:bg-white/10 px-2 py-0.5 rounded-full font-bold">{filteredServices.length} items</span>
                  </div>

                    <div
                      ref={scrollContainerRef}
                      onScroll={handleScroll}
                      className="flex gap-3 overflow-x-auto pb-3 pt-1 px-1 snap-x snap-mandatory scroll-smooth touch-pan-x mobile-scrollbar [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#E6D4BA]/30 dark:[&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#C29F67] [&::-webkit-scrollbar-thumb]:rounded-full"
                    >
                    {filteredServices.map((service) => (
                      <div
                        key={service.id}
                        className="w-[240px] sm:w-[270px] shrink-0 snap-start bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/70 dark:border-white/10 rounded-xl p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
                      >
                        <div>
                          {/* Card Image */}
                          <div className="relative aspect-[16/10] h-32 sm:h-36 rounded-lg overflow-hidden mb-2.5 bg-gray-100 dark:bg-gray-800">
                            <img
                              src={getCleanImageUrl(service.imageUrl)}
                              alt={service.name}
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = fallbackImage;
                              }}
                              className="w-full h-full object-cover object-center"
                              loading="lazy"
                            />
                            {service.isFeatured && (
                              <span className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-[#1C1B1A]/90 dark:bg-[#C29F67] text-[#E6D4BA] dark:text-[#1C1B1A] text-[9px] font-bold tracking-wider uppercase rounded-xs">
                                Featured
                              </span>
                            )}
                          </div>

                          {/* Title & Price Header */}
                          <div className="mb-2">
                            <h3 className="font-serif text-sm font-bold text-[#1C1B1A] dark:text-white line-clamp-2 leading-snug break-words">
                              {service.name}
                            </h3>
                            <div className="flex items-center justify-between gap-2 mt-1.5">
                              <span className="inline-block font-bold text-xs text-[#9C753D] dark:text-[#C29F67] bg-[#FAF7F2] dark:bg-white/10 px-2 py-0.5 rounded-md border border-[#E6D4BA]/50 dark:border-white/10 tabular-nums">
                                {formatServicePrice(service)}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-[#79746D] dark:text-gray-400 font-medium">
                                <Clock className="w-3 h-3 text-[#9C753D] dark:text-[#C29F67]" />
                                {service.durationMinutes}m
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] text-[#79746D] dark:text-gray-400 leading-snug line-clamp-2 mb-2.5">
                            {service.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => onSelectServiceToBook(service.id)}
                            className="w-full py-1.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] text-white dark:text-[#1C1B1A] text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98"
                          >
                            <span>Book Now</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Dedicated Visible Right-to-Left Scroll Bar & Progress Track */}
                  <div className="mt-2.5 px-1">
                    <div className="w-full bg-[#E6D4BA]/40 dark:bg-white/10 h-2 rounded-full overflow-hidden relative shadow-inner">
                      <div
                        className="bg-[#C29F67] dark:bg-[#C29F67] h-full rounded-full transition-all duration-75 shadow-xs"
                        style={{
                          width: `${Math.max(20, 100 / Math.max(1, filteredServices.length))}%`,
                          marginLeft: `${(scrollProgress * (100 - Math.max(20, 100 / Math.max(1, filteredServices.length)))) / 100}%`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#9C753D] dark:text-[#C29F67] font-semibold mt-1 px-0.5">
                      <span className="flex items-center gap-1">
                        <ArrowLeftRight className="w-3 h-3" />
                        <span>Scroll Right to Left to explore treatments</span>
                      </span>
                      <span>{filteredServices.length} Treatments</span>
                    </div>
                  </div>
                </div>
              ) : (
                /* Responsive Grid on Mobile */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredServices.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/60 dark:border-white/10 rounded-xl p-3 flex flex-col justify-between shadow-2xs"
                    >
                      <div>
                        <div className="relative aspect-[16/9] h-32 rounded-lg overflow-hidden mb-2.5 bg-gray-100 dark:bg-gray-800">
                          <img
                            src={getCleanImageUrl(service.imageUrl)}
                            alt={service.name}
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = fallbackImage;
                            }}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="font-serif text-sm font-bold text-[#1C1B1A] dark:text-white line-clamp-1 leading-snug">
                            {service.name}
                          </h4>
                          <span className="font-bold text-xs text-[#9C753D] dark:text-[#C29F67] tabular-nums shrink-0 bg-[#FAF7F2] dark:bg-white/10 px-2 py-0.5 rounded-md border border-[#E6D4BA]/50 dark:border-white/10">
                            {formatServicePrice(service)}
                          </span>
                        </div>
                        <p className="text-xs text-[#79746D] dark:text-gray-400 line-clamp-2 leading-relaxed mb-3">
                          {service.description}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-[#79746D] dark:text-gray-400 font-medium">
                          <Clock className="w-3 h-3 text-[#9C753D] dark:text-[#C29F67]" />
                          {service.durationMinutes} mins
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectServiceToBook(service.id)}
                          className="px-3.5 py-1.5 bg-[#1C1B1A] dark:bg-[#C29F67] text-white dark:text-[#1C1B1A] text-xs font-bold rounded-lg cursor-pointer"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DESKTOP VIEW: LUXURY 3-COLUMN EDITORIAL GRID */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/50 dark:border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:shadow-lg transition-all group"
                >
                  <div>
                    {/* Image banner */}
                    <div className="relative aspect-[16/9] rounded-xl overflow-hidden mb-4 bg-gray-100 dark:bg-gray-800">
                      <img
                        src={getCleanImageUrl(service.imageUrl)}
                        alt={service.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fallbackImage;
                        }}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                      {service.isFeatured && (
                        <span className="absolute top-2.5 left-2.5 px-2 py-0.5 bg-[#1C1B1A]/85 dark:bg-[#C29F67] backdrop-blur-xs text-[#E6D4BA] dark:text-[#1C1B1A] text-[10px] font-bold tracking-wider uppercase rounded-sm">
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Title & Price */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-serif text-lg font-bold text-[#1C1B1A] dark:text-white group-hover:text-[#9C753D] dark:group-hover:text-[#C29F67] transition-colors">
                        {service.name}
                      </h3>
                      <span className="font-bold text-base text-[#1C1B1A] dark:text-white tabular-nums whitespace-nowrap">
                        {formatServicePrice(service)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[#79746D] dark:text-gray-300 leading-relaxed mb-4 line-clamp-2 font-medium">
                      {service.description}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-gray-100 dark:border-white/10 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-[#79746D] dark:text-gray-400 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                      {service.durationMinutes} mins
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectServiceToBook(service.id)}
                      className="px-4 py-2 bg-[#FAF7F2] dark:bg-white/5 group-hover:bg-[#1C1B1A] dark:group-hover:bg-[#C29F67] text-[#1C1B1A] dark:text-white group-hover:text-white dark:group-hover:text-[#1C1B1A] border border-[#E6D4BA]/80 dark:border-white/10 group-hover:border-[#1C1B1A] text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>Reserve Slot</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
};
