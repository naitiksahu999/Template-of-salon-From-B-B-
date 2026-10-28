import React, { useState } from 'react';
import { X, ZoomIn, Eye, Sparkles } from 'lucide-react';
import { GalleryItem, SiteSettings } from '../types/index.ts';

interface GallerySectionProps {
  gallery: GalleryItem[];
  settings?: SiteSettings | null;
}

export const GallerySection: React.FC<GallerySectionProps> = ({ gallery, settings }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  const textSize = settings?.photoTextSize || 'large';
  const textArrangement = settings?.photoTextArrangement || 'card-below';

  const categories = ['all', 'Ambience', 'Hair', 'Beauty & Skin', 'Makeup'];

  const filteredItems = gallery.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category.toLowerCase() === selectedCategory.toLowerCase();
  });

  const getTitleClass = () => {
    switch (textSize) {
      case 'small':
        return 'text-xs sm:text-sm font-bold';
      case 'medium':
        return 'text-sm sm:text-base font-bold';
      case 'large':
        return 'text-base sm:text-lg font-black';
      case 'extralarge':
        return 'text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight';
      default:
        return 'text-base sm:text-lg font-black';
    }
  };

  const getDescClass = () => {
    switch (textSize) {
      case 'small':
        return 'text-[11px] font-normal';
      case 'medium':
        return 'text-xs font-medium';
      case 'large':
        return 'text-xs sm:text-sm font-medium';
      case 'extralarge':
        return 'text-sm font-semibold';
      default:
        return 'text-xs sm:text-sm font-medium';
    }
  };

  return (
    <section id="gallery" className="py-20 bg-[#FAF7F2] dark:bg-[#141312] border-b border-[#E6D4BA]/30 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto space-y-2 mb-10">
          <span className="text-xs uppercase tracking-widest text-[#9C753D] dark:text-[#C29F67] font-bold">
            Visual Portfolio & Salon Ambience
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black text-[#1C1B1A] dark:text-white uppercase tracking-tight">
            The Salon Gallery
          </h2>
          <p className="text-sm font-medium text-[#79746D] dark:text-gray-300">
            Explore our styling workstations, comfortable client suites, and artistry across hair, skin, and makeup.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 text-xs font-bold rounded-lg capitalize transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[#1C1B1A] dark:bg-[#C29F67] text-white shadow-xs'
                  : 'text-[#79746D] dark:text-gray-300 hover:text-[#1C1B1A] dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10'
              }`}
            >
              {cat === 'all' ? 'All Visuals' : cat}
            </button>
          ))}
        </div>

        {/* Gallery Grid with Admin-Arranged Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setActiveItem(item)}
              className="group relative rounded-2xl overflow-hidden cursor-pointer bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/60 dark:border-white/10 shadow-xs hover:shadow-xl transition-all flex flex-col"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100 dark:bg-gray-800">
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/assets/images/hero_salon_interior_1790779465939.jpg';
                  }}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  loading="lazy"
                />

                {/* OVERLAY-CENTER ARRANGEMENT */}
                {textArrangement === 'overlay-center' && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex flex-col items-center justify-center p-6 text-center text-white">
                    <span className="text-[10px] uppercase font-bold tracking-widest text-[#E6D4BA] bg-white/10 px-2.5 py-0.5 rounded-full mb-1.5 border border-[#C29F67]/40">
                      {item.category}
                    </span>
                    <h4 className={`${getTitleClass()} text-white font-serif`}>
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className={`${getDescClass()} text-white/90 max-w-xs mt-1.5 line-clamp-2`}>
                        {item.description}
                      </p>
                    )}
                    <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-[#E6D4BA] font-bold">
                      <ZoomIn className="w-3.5 h-3.5" /> Tap to expand
                    </span>
                  </div>
                )}

                {/* OVERLAY-BOTTOM ARRANGEMENT */}
                {textArrangement === 'overlay-bottom' && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent flex flex-col justify-end p-5 text-white">
                    <span className="text-[10px] uppercase font-bold text-[#E6D4BA] tracking-wider">
                      {item.category}
                    </span>
                    <h4 className={`${getTitleClass()} text-white font-serif mt-0.5`}>
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className={`${getDescClass()} text-white/85 line-clamp-2 mt-1`}>
                        {item.description}
                      </p>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-[#E6D4BA] font-bold mt-2.5">
                      <ZoomIn className="w-3.5 h-3.5" />
                      <span>Click to view photo</span>
                    </div>
                  </div>
                )}

                {/* BADGE-MINIMAL ARRANGEMENT */}
                {textArrangement === 'badge-minimal' && (
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
                    <span className="text-[10px] uppercase font-bold bg-[#1C1B1A]/80 backdrop-blur-xs text-white px-2.5 py-1 rounded-md border border-white/20">
                      {item.category}
                    </span>
                    <span className="w-7 h-7 rounded-full bg-black/60 backdrop-blur-xs text-white flex items-center justify-center shadow-xs">
                      <ZoomIn className="w-3.5 h-3.5" />
                    </span>
                  </div>
                )}
              </div>

              {/* CARD-BELOW ARRANGEMENT (Always visible clean card underneath photo) */}
              {(textArrangement === 'card-below' || textArrangement === 'badge-minimal') && (
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between border-t border-[#E6D4BA]/40 dark:border-white/10">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-[#9C753D] dark:text-[#C29F67] bg-[#FAF7F2] dark:bg-white/5 px-2 py-0.5 rounded-sm border border-[#E6D4BA]/60 dark:border-white/10">
                        {item.category}
                      </span>
                      <span className="text-[11px] text-[#79746D] dark:text-gray-400 font-semibold flex items-center gap-1">
                        <Eye className="w-3 h-3" /> View
                      </span>
                    </div>
                    <h4 className={`${getTitleClass()} text-[#1C1B1A] dark:text-white font-serif`}>
                      {item.title}
                    </h4>
                    {item.description && (
                      <p className={`${getDescClass()} text-[#79746D] dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed`}>
                        {item.description}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 pt-2.5 border-t border-gray-100 dark:border-white/10 flex items-center justify-between text-xs text-[#9C753D] dark:text-[#C29F67] font-bold">
                    <span>Enlarge photo</span>
                    <ZoomIn className="w-3.5 h-3.5" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Lightbox Modal */}
      {activeItem && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setActiveItem(null)}
        >
          <div
            className="relative max-w-4xl w-full bg-[#1C1B1A] text-white rounded-2xl overflow-hidden shadow-2xl border border-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveItem(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 text-white hover:bg-black/80 transition-colors"
              aria-label="Close image lightbox"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="max-h-[75vh] flex items-center justify-center bg-black/40">
              <img
                src={activeItem.imageUrl}
                alt={activeItem.title}
                referrerPolicy="no-referrer"
                className="max-h-[75vh] w-auto max-w-full object-contain"
              />
            </div>

            <div className="p-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-xs uppercase font-semibold text-[#C29F67] tracking-wider">
                  {activeItem.category}
                </span>
                <h3 className="text-lg font-serif font-bold text-white mt-0.5">
                  {activeItem.title}
                </h3>
                {activeItem.description && (
                  <p className="text-xs text-gray-300 mt-1">{activeItem.description}</p>
                )}
              </div>
              <span className="text-xs text-gray-400">B&B Family Salon · Bhopal</span>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
