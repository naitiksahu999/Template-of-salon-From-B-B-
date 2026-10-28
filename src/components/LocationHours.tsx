import React from 'react';
import { MapPin, Phone, Clock, Navigation, Calendar, AlertCircle } from 'lucide-react';
import { BusinessHoursDay, SiteSettings, BlockedDate } from '../types/index.ts';
import { formatTime12, formatTimeRange12, formatDateIST } from '../utils/timeFormat.ts';

interface LocationHoursProps {
  businessHours: BusinessHoursDay[];
  onOpenBooking: () => void;
  settings?: SiteSettings | null;
  blockedDates?: BlockedDate[];
}

export const LocationHours: React.FC<LocationHoursProps> = ({
  businessHours,
  onOpenBooking,
  settings,
  blockedDates = []
}) => {
  const currentDayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday...
  const todaySchedule = businessHours.find((b) => b.dayOfWeek === currentDayOfWeek);

  const todayStr = (() => {
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  })();

  const todayBlock = blockedDates.find((b) => b.date === todayStr);
  const upcomingBlocks = blockedDates
    .filter((b) => b.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const salonTitle = settings?.salonName || 'B & B Family Salon (B&B Unisex Salon)';
  const salonAddress = settings?.address || '2nd Floor, Ultimate Arcade, F11-12, Kolar Road';
  const salonLandmarks = settings?.landmarks || 'Near Sagar Gaire & Vishal Mega Mart';
  const salonCityState = `${settings?.city || 'Bhopal'}, ${settings?.state || 'Madhya Pradesh'} - ${settings?.pincode || '462042'}, India`;
  const salonPhone = settings?.phone || '+91 91316 29031';
  const cleanPhone = salonPhone.replace(/[^0-9+]/g, '');
  const googleMapsUrl = settings?.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${salonTitle} ${salonAddress} ${salonLandmarks} ${settings?.city || 'Bhopal'}`
  )}`;

  const mapEmbedSource = settings?.mapEmbedUrl || `https://maps.google.com/maps?q=${encodeURIComponent(
    `${salonAddress}, ${salonLandmarks}, ${settings?.city || 'Bhopal'}`
  )}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  return (
    <section id="location" className="py-20 bg-[#FAF7F2] dark:bg-[#141312] border-t border-[#E6D4BA]/40 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Left Column: Address, Hours & Contact */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-[#9C753D] dark:text-[#C29F67] font-bold">
                Visit Our Sanctuary
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-black text-[#1C1B1A] dark:text-white">
                Location & Operating Hours
              </h2>
              <p className="text-sm font-medium text-[#79746D] dark:text-gray-300">
                Conveniently situated on the 2nd Floor of Ultimate Arcade on Kolar Road, Bhopal. Easy elevator access and parking available.
              </p>
            </div>

            {/* Address Box */}
            <div className="p-5 bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/70 dark:border-white/10 rounded-2xl space-y-3 shadow-xs">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-[#9C753D] dark:text-[#C29F67] shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <h4 className="text-sm font-bold text-[#1C1B1A] dark:text-white">{salonTitle}</h4>
                  <p className="font-semibold text-[#1C1B1A] dark:text-gray-200">{salonAddress}</p>
                  <p className="font-medium text-[#79746D] dark:text-gray-400"><strong className="text-[#1C1B1A] dark:text-white font-bold">Landmark:</strong> {salonLandmarks}</p>
                  <p className="font-bold text-[#9C753D] dark:text-[#E6D4BA]">{salonCityState}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 dark:border-white/10">
                <a
                  href={`tel:${cleanPhone}`}
                  className="px-4 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] text-white text-xs font-bold rounded-lg hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Phone className="w-3.5 h-3.5 text-[#C29F67] dark:text-[#1C1B1A]" />
                  <span>Call: {salonPhone}</span>
                </a>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-[#E6D4BA]/80 dark:border-white/20 text-[#1C1B1A] dark:text-white text-xs font-bold rounded-lg hover:bg-[#F3EBDD] dark:hover:bg-white/15 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                  <span>Get Driving Directions</span>
                </a>
              </div>
            </div>

            {/* Hours Table */}
            <div className="bg-white dark:bg-[#1C1B1A] border border-[#E6D4BA]/70 dark:border-white/10 rounded-2xl p-5 shadow-xs">
              <div className="flex items-center justify-between mb-3 border-b border-gray-100 dark:border-white/10 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-[#1C1B1A] dark:text-white">
                  <Clock className="w-4 h-4 text-[#9C753D] dark:text-[#C29F67]" />
                  <span>Weekly Operating Hours</span>
                </div>
                {todayBlock ? (
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-sm">
                    {todayBlock.allDay ? `Holiday Today (${todayBlock.reason})` : `Special Schedule Today (${todayBlock.reason})`}
                  </span>
                ) : todaySchedule ? (
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-sm">
                    {todaySchedule.isOpen ? `Open Today (${formatTimeRange12(todaySchedule.openTime, todaySchedule.closeTime)})` : 'Closed Today'}
                  </span>
                ) : null}
              </div>

              <div className="space-y-1.5 text-xs">
                {businessHours.map((item) => {
                  const isToday = item.dayOfWeek === currentDayOfWeek;
                  return (
                    <div
                      key={item.dayOfWeek}
                      className={`flex items-center justify-between py-1 px-2 rounded-md ${
                        isToday ? 'bg-[#FAF7F2] dark:bg-white/10 font-bold text-[#1C1B1A] dark:text-white' : 'font-medium text-[#79746D] dark:text-gray-400'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isToday && <span className="w-1.5 h-1.5 rounded-full bg-[#C29F67]" />}
                        <span className={isToday ? 'font-bold' : ''}>{item.dayName}</span>
                      </span>
                      <span className={isToday ? 'font-bold' : ''}>
                        {item.isOpen ? formatTimeRange12(item.openTime, item.closeTime) : 'Closed'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Live Blocked Dates / Holidays Notice in Customer View */}
              {upcomingBlocks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-gray-100 dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Special Holiday & Closure Notices:</span>
                  </div>
                  <div className="space-y-1">
                    {upcomingBlocks.map((blk) => (
                      <div
                        key={blk.id}
                        className="p-2 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 rounded-lg text-[11px] flex items-center justify-between"
                      >
                        <span className="font-bold text-amber-900 dark:text-amber-200">
                          📅 {formatDateIST(blk.date)}: <span className="font-normal">{blk.reason}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                          {blk.allDay ? 'Closed All Day' : formatTimeRange12(blk.startTime, blk.endTime)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <button
                type="button"
                onClick={onOpenBooking}
                className="w-full py-3.5 bg-[#C29F67] hover:bg-[#B38C4F] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-xs hover:shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Your Visit in Advance</span>
              </button>
            </div>
          </div>

          {/* Right Column: Google Maps Embed */}
          <div className="lg:col-span-6">
            <div className="h-full min-h-[420px] rounded-2xl overflow-hidden border border-[#E6D4BA]/70 dark:border-white/10 shadow-md relative bg-gray-100 dark:bg-gray-800 flex flex-col">
              <iframe
                title="Salon Location Map View"
                src={mapEmbedSource}
                width="100%"
                height="100%"
                className="w-full h-full min-h-[420px] border-0"
                allowFullScreen={true}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <div className="p-3 bg-white/95 dark:bg-[#1C1B1A]/95 backdrop-blur-xs border-t border-[#E6D4BA]/40 dark:border-white/10 text-xs text-[#79746D] dark:text-gray-300 flex items-center justify-between">
                <span className="font-semibold truncate pr-2">
                  📍 {salonAddress}
                </span>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#9C753D] dark:text-[#C29F67] font-bold hover:underline shrink-0"
                >
                  Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
