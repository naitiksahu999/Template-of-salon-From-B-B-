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
    <section id="services" className="py-12 sm:py-20 bg-[#FAF6F0] dark:bg-[#141211] border-y border-[#E8DDD3] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="space-y-1.5 sm:space-y-2">
            <span className="text-[11px] sm:text-xs uppercase tracking-widest text-[#B86546] dark:text-[#D98263] font-bold">
              Our Services
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-[#2B2523] dark:text-white leading-tight">
              Luxury Care <span className="italic font-normal text-[#B86546] dark:text-[#D98263]">For Every You</span>
            </h2>
            <p className="text-xs sm:text-sm font-medium text-[#665B55] dark:text-gray-300 max-w-xl">
              From precision styling to restorative skincare rituals, we bring out the best in you with transparent pricing.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {/* Search bar */}
            <div className="relative flex-1 md:w-72">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#847771] dark:text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search treatments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:pl-9 pr-3 py-2 text-xs bg-white dark:bg-white/5 border border-[#E8DDD3] dark:border-white/10 rounded-lg text-[#2B2523] dark:text-white placeholder:text-gray-400 focus:outline-hidden focus:border-[#B86546]"
              />
            </div>

            {/* Mobile View Toggle */}
            <div className="flex md:hidden items-center border border-[#E8DDD3] dark:border-white/10 rounded-lg bg-white dark:bg-white/5 p-0.5">
              <button
                type="button"
                onClick={() => setMobileLayout('horizontal')}
                className={`p-1.5 rounded text-xs transition-colors ${
                  mobileLayout === 'horizontal'
                    ? 'bg-[#B86546] text-white'
                    : 'text-[#665B55] dark:text-gray-400 hover:text-[#B86546]'
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
                    ? 'bg-[#B86546] text-white'
                    : 'text-[#665B55] dark:text-gray-400 hover:text-[#B86546]'
                }`}
                title="Grid view"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Filters (Segmented Control) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 sm:mb-8 border-b border-[#E8DDD3] dark:border-white/10 no-scrollbar">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#B86546] text-white shadow-xs'
                : 'text-[#665B55] dark:text-gray-400 hover:text-[#2B2523] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
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
                className={`px-3.5 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.id
                    ? 'bg-[#B86546] text-white shadow-xs'
                    : 'text-[#665B55] dark:text-gray-400 hover:text-[#2B2523] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Services View */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-[#FDFBF7] dark:bg-[#1A1716] border border-[#E8DDD3] dark:border-white/10 rounded-2xl">
            <p className="text-sm font-bold text-[#2B2523] dark:text-white">No services found</p>
            <p className="text-xs text-[#665B55] dark:text-gray-400 mt-1">Try clearing your search query or switching categories.</p>
          </div>
        ) : (
          <>
            {/* MOBILE VIEW: HORIZONTAL RIGHT-TO-LEFT SWIPEABLE CAROUSEL */}
            <div className="block md:hidden">
              {mobileLayout === 'horizontal' ? (
                <div>
                  <div className="flex items-center justify-between text-[11px] text-[#B86546] dark:text-[#D98263] mb-2 px-1 font-bold">
                    <span className="flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5 text-[#B86546]" />
                      <span>Scroll Right to Left to explore treatments</span>
                    </span>
                    <span className="text-[10px] bg-[#B86546]/10 text-[#B86546] dark:text-[#D98263] px-2 py-0.5 rounded-full font-bold">{filteredServices.length} items</span>
                  </div>

                  <div
                    ref={scrollContainerRef}
                    onScroll={handleScroll}
                    className="flex gap-3.5 overflow-x-auto pb-3 pt-1 px-1 snap-x snap-mandatory scroll-smooth touch-pan-x mobile-scrollbar [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-[#E8DDD3]/40 dark:[&::-webkit-scrollbar-track]:bg-white/10 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#B86546] [&::-webkit-scrollbar-thumb]:rounded-full"
                  >
                    {filteredServices.map((service) => (
                      <div
                        key={service.id}
                        className="w-[240px] sm:w-[270px] shrink-0 snap-start bg-[#FDFBF7] dark:bg-[#1C1817] border border-[#E8DDD3] dark:border-white/10 rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all"
                      >
                        <div>
                          {/* Arched Card Image inspired by reference photo */}
                          <div className="relative aspect-[4/3] rounded-t-[50px] rounded-b-md overflow-hidden mb-3 bg-[#F4EDE4] dark:bg-stone-800 border border-[#E8DDD3] dark:border-white/10">
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
                              <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#B86546] text-white text-[9px] font-bold tracking-wider uppercase rounded-xs shadow-xs">
                                Featured
                              </span>
                            )}
                          </div>

                          {/* Title & Price Header */}
                          <div className="mb-2">
                            <h3 className="font-serif text-sm font-bold text-[#2B2523] dark:text-white line-clamp-2 leading-snug break-words">
                              {service.name}
                            </h3>
                            <div className="flex items-center justify-between gap-2 mt-1.5">
                              <span className="inline-block font-bold text-xs text-[#B86546] dark:text-[#D98263] bg-[#F4EAE1] dark:bg-white/10 px-2 py-0.5 rounded-md border border-[#E8DDD3] dark:border-white/10 tabular-nums">
                                {formatServicePrice(service)}
                              </span>
                              <span className="flex items-center gap-1 text-[11px] text-[#665B55] dark:text-gray-400 font-medium">
                                <Clock className="w-3 h-3 text-[#B86546]" />
                                {service.durationMinutes}m
                              </span>
                            </div>
                          </div>

                          <p className="text-[11px] text-[#665B55] dark:text-gray-400 leading-snug line-clamp-2 mb-2.5">
                            {service.description}
                          </p>
                        </div>

                        <div className="pt-2 border-t border-[#E8DDD3] dark:border-white/10 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => onSelectServiceToBook(service.id)}
                            className="w-full py-2 bg-[#B86546] hover:bg-[#A25336] text-white text-[11px] font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer active:scale-98 shadow-xs"
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
                    <div className="w-full bg-[#E8DDD3]/60 dark:bg-white/10 h-2 rounded-full overflow-hidden relative shadow-inner">
                      <div
                        className="bg-[#B86546] h-full rounded-full transition-all duration-75 shadow-xs"
                        style={{
                          width: `${Math.max(20, 100 / Math.max(1, filteredServices.length))}%`,
                          marginLeft: `${(scrollProgress * (100 - Math.max(20, 100 / Math.max(1, filteredServices.length)))) / 100}%`
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[#B86546] dark:text-[#D98263] font-semibold mt-1 px-0.5">
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {filteredServices.map((service) => (
                    <div
                      key={service.id}
                      className="bg-[#FDFBF7] dark:bg-[#1C1817] border border-[#E8DDD3] dark:border-white/10 rounded-2xl p-3.5 flex flex-col justify-between shadow-2xs"
                    >
                      <div>
                        <div className="relative aspect-[4/3] h-36 rounded-t-[50px] rounded-b-md overflow-hidden mb-3 bg-[#F4EDE4] dark:bg-stone-800 border border-[#E8DDD3] dark:border-white/10">
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
                            <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#B86546] text-white text-[9px] font-bold tracking-wider uppercase rounded-xs shadow-xs">
                              Featured
                            </span>
                          )}
                        </div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h4 className="font-serif text-sm font-bold text-[#2B2523] dark:text-white line-clamp-1 leading-snug">
                            {service.name}
                          </h4>
                          <span className="font-bold text-xs text-[#B86546] dark:text-[#D98263] tabular-nums shrink-0 bg-[#F4EAE1] dark:bg-white/10 px-2 py-0.5 rounded-md border border-[#E8DDD3] dark:border-white/10">
                            {formatServicePrice(service)}
                          </span>
                        </div>
                        <p className="text-xs text-[#665B55] dark:text-gray-400 line-clamp-2 leading-relaxed mb-3">
                          {service.description}
                        </p>
                      </div>

                      <div className="pt-2.5 border-t border-[#E8DDD3] dark:border-white/10 flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-[#665B55] dark:text-gray-400 font-medium">
                          <Clock className="w-3 h-3 text-[#B86546]" />
                          {service.durationMinutes} mins
                        </span>
                        <button
                          type="button"
                          onClick={() => onSelectServiceToBook(service.id)}
                          className="px-3.5 py-1.5 bg-[#B86546] hover:bg-[#A25336] text-white text-xs font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
                        >
                          Book Now
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DESKTOP VIEW: LUXURY 3-COLUMN EDITORIAL GRID WITH SIGNATURE ARCH FRAMES */}
            <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  className="bg-[#FDFBF7] dark:bg-[#1C1817] border border-[#E8DDD3] dark:border-white/10 rounded-3xl p-5 flex flex-col justify-between hover:shadow-xl hover:border-[#B86546]/40 transition-all duration-300 group"
                >
                  <div>
                    {/* Signature Architectural Arched Image container from reference photo */}
                    <div className="relative aspect-[4/3] rounded-t-[70px] sm:rounded-t-[80px] rounded-b-xl overflow-hidden mb-4 bg-[#F4EDE4] dark:bg-stone-800 border border-[#E8DDD3] dark:border-white/10">
                      <img
                        src={getCleanImageUrl(service.imageUrl)}
                        alt={service.name}
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fallbackImage;
                        }}
                        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700"
                        loading="lazy"
                      />
                      {service.isFeatured && (
                        <span className="absolute top-3 left-3 px-2.5 py-1 bg-[#B86546] text-white text-[10px] font-bold tracking-wider uppercase rounded-xs shadow-md">
                          Featured
                        </span>
                      )}
                    </div>

                    {/* Title & Price */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h3 className="font-serif text-lg font-bold text-[#2B2523] dark:text-white group-hover:text-[#B86546] transition-colors leading-snug">
                        {service.name}
                      </h3>
                      <span className="font-bold text-sm text-[#B86546] dark:text-[#D98263] bg-[#F4EAE1] dark:bg-white/10 px-2.5 py-0.5 rounded-md border border-[#E8DDD3] dark:border-white/10 tabular-nums whitespace-nowrap">
                        {formatServicePrice(service)}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-[#665B55] dark:text-gray-300 leading-relaxed mb-4 line-clamp-2 font-medium">
                      {service.description}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-4 border-t border-[#E8DDD3] dark:border-white/10 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-xs text-[#665B55] dark:text-gray-400 font-medium">
                      <Clock className="w-3.5 h-3.5 text-[#B86546]" />
                      {service.durationMinutes} mins
                    </span>

                    <button
                      type="button"
                      onClick={() => onSelectServiceToBook(service.id)}
                      className="px-4 py-2 bg-[#B86546] hover:bg-[#A25336] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-98"
                    >
                      <span>Book Treatment</span>
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
