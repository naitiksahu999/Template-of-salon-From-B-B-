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

  const salonTitle = settings?.salonName || 'Tassel Unisex Salon';
  const salonAddress = settings?.address || 'Kolar Road, Good Shapard Kalan, Mandakini Colony';
  const salonLandmarks = settings?.landmarks || 'Mandakini Colony, Kolar Road';
  const salonCityState = `${settings?.city || 'Bhopal'}, ${settings?.state || 'Madhya Pradesh'} - ${settings?.pincode || '462042'}, India`;
  const salonPhone = settings?.phone || '+91 78800 86990';
  const cleanPhone = salonPhone.replace(/[^0-9+]/g, '');
  const googleMapsUrl = settings?.googleMapsUrl || 'https://www.google.co.in/maps/place/Tassel+Unisex+Salon,+Kolar+Rd,+Good+Shapard+Kalan,+Mandakini+Colony,+Kolar+Rd,+Bhopal,+Madhya+Pradesh+462042/@23.1823711,77.4175763,17z/';

  const mapEmbedSource = settings?.mapEmbedUrl || 'https://maps.google.com/maps?q=23.1823711,77.4175763&t=&z=16&ie=UTF8&iwloc=&output=embed';

  return (
    <section id="location" className="py-20 bg-[#FAF6F0] dark:bg-[#141211] border-t border-[#E8DDD3] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12">
          {/* Left Column: Address, Hours & Contact */}
          <div className="lg:col-span-6 space-y-6">
            <div className="space-y-2">
              <span className="text-xs uppercase tracking-widest text-[#B86546] dark:text-[#D98263] font-bold">
                Visit Our Sanctuary
              </span>
              <h2 className="text-3xl sm:text-4xl font-serif font-bold text-[#2B2523] dark:text-white">
                Location & <span className="italic font-normal text-[#B86546] dark:text-[#D98263]">Operating Hours</span>
              </h2>
              <p className="text-sm font-medium text-[#665B55] dark:text-gray-300">
                Conveniently situated at Good Shapard Kalan, Mandakini Colony on Kolar Road, Bhopal. Ample parking and easy access available.
              </p>
            </div>

            {/* Address Box */}
            <div className="p-6 bg-[#FDFBF7] dark:bg-[#1A1716] border border-[#E8DDD3] dark:border-white/10 rounded-3xl space-y-3.5 shadow-2xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-[#F4EAE1] dark:bg-white/5 border border-[#E8DDD3] dark:border-white/10 flex items-center justify-center text-[#B86546] shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="text-xs space-y-1">
                  <h4 className="text-sm font-bold text-[#2B2523] dark:text-white font-serif">{salonTitle}</h4>
                  <p className="font-semibold text-[#2B2523] dark:text-gray-200">{salonAddress}</p>
                  <p className="font-medium text-[#665B55] dark:text-gray-400">
                    <strong className="text-[#2B2523] dark:text-white font-bold">Landmark:</strong> {salonLandmarks}
                  </p>
                  <p className="font-bold text-[#B86546] dark:text-[#D98263]">{salonCityState}</p>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#E8DDD3] dark:border-white/10">
                <a
                  href={`tel:${cleanPhone}`}
                  className="px-4 py-2.5 bg-[#B86546] hover:bg-[#A25336] text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call: {salonPhone}</span>
                </a>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2.5 bg-[#F4EDE4] dark:bg-white/10 border border-[#E8DDD3] dark:border-white/20 text-[#2B2523] dark:text-white text-xs font-bold rounded-lg hover:bg-[#E8DDD3] dark:hover:bg-white/15 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#B86546]" />
                  <span>Get Driving Directions</span>
                </a>
              </div>
            </div>

            {/* Hours Table */}
            <div className="bg-[#FDFBF7] dark:bg-[#1A1716] border border-[#E8DDD3] dark:border-white/10 rounded-3xl p-6 shadow-2xs">
              <div className="flex items-center justify-between mb-4 border-b border-[#E8DDD3] dark:border-white/10 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#2B2523] dark:text-white">
                  <Clock className="w-4 h-4 text-[#B86546]" />
                  <span>Weekly Operating Hours</span>
                </div>
                {todayBlock ? (
                  <span className="text-[11px] text-amber-800 dark:text-amber-300 font-bold bg-amber-100/70 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-md">
                    {todayBlock.allDay ? `Holiday Today (${todayBlock.reason})` : `Special Schedule (${todayBlock.reason})`}
                  </span>
                ) : todaySchedule ? (
                  <span className="text-[11px] text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-100/70 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-md">
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
                      className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg transition-colors ${
                        isToday ? 'bg-[#F4EAE1] dark:bg-white/10 font-bold text-[#2B2523] dark:text-white' : 'font-medium text-[#665B55] dark:text-gray-400'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        {isToday && <span className="w-2 h-2 rounded-full bg-[#B86546]" />}
                        <span className={isToday ? 'font-bold text-[#B86546] dark:text-[#D98263]' : ''}>{item.dayName}</span>
                      </span>
                      <span className={isToday ? 'font-bold text-[#2B2523] dark:text-white' : ''}>
                        {item.isOpen ? formatTimeRange12(item.openTime, item.closeTime) : 'Closed'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Live Blocked Dates / Holidays Notice in Customer View */}
              {upcomingBlocks.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[#E8DDD3] dark:border-white/10 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 dark:text-amber-300">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>Special Holiday & Closure Notices:</span>
                  </div>
                  <div className="space-y-1.5">
                    {upcomingBlocks.map((blk) => (
                      <div
                        key={blk.id}
                        className="p-2.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl text-[11px] flex items-center justify-between"
                      >
                        <span className="font-bold text-amber-950 dark:text-amber-200">
                          📅 {formatDateIST(blk.date)}: <span className="font-normal">{blk.reason}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wider">
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
                className="w-full py-3.5 bg-[#B86546] hover:bg-[#A25336] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Calendar className="w-4 h-4" />
                <span>Book Your Visit in Advance</span>
              </button>
            </div>
          </div>

          {/* Right Column: Google Maps Embed */}
          <div className="lg:col-span-6">
            <div className="h-full min-h-[420px] rounded-3xl overflow-hidden border border-[#E8DDD3] dark:border-white/10 shadow-md relative bg-[#F4EDE4] dark:bg-stone-800 flex flex-col">
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
              <div className="p-3.5 bg-[#FDFBF7]/95 dark:bg-[#1A1716]/95 backdrop-blur-xs border-t border-[#E8DDD3] dark:border-white/10 text-xs text-[#665B55] dark:text-gray-300 flex items-center justify-between">
                <span className="font-semibold truncate pr-2 text-[#2B2523] dark:text-white">
                  📍 {salonAddress}
                </span>
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#B86546] dark:text-[#D98263] font-bold hover:underline shrink-0"
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
