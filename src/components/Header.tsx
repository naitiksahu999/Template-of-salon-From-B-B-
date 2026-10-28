import React, { useState } from 'react';
import { Menu, X, Calendar, Phone, User, Sun, Moon, Sliders, Shield } from 'lucide-react';
import { SiteSettings } from '../types/index.ts';

interface HeaderProps {
  onOpenBooking: () => void;
  onOpenCustomerSettings?: () => void;
  activeSection?: string;
  settings?: SiteSettings | null;
  currentTheme?: 'light' | 'dark' | 'system';
  onToggleTheme?: () => void;
  customerUser?: { name: string; email: string } | null;
  isAdminLoggedIn?: boolean;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenBooking,
  onOpenCustomerSettings,
  settings,
  currentTheme,
  onToggleTheme,
  customerUser,
  isAdminLoggedIn = false,
  onOpenAdmin
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const salonTitle = settings?.salonName || 'B & B Family Salon';

  const navLinks = [
    { label: 'Services', href: '#services' },
    { label: 'Experience', href: '#experience' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Reviews', href: '#reviews' },
    { label: 'Location', href: '#location' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FBFBFA]/95 dark:bg-[#141312]/95 backdrop-blur-md border-b border-[#E6D4BA]/40 dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
        {/* Zone 1: Luxury Brand Wordmark */}
        <div className="flex items-center gap-2.5 min-w-0">
          <a
            href="/"
            className="flex items-center gap-2 group min-w-0"
            title={salonTitle}
          >
            {/* Elegant Monogram Seal */}
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-[#1C1B1A] to-[#2A2826] dark:from-[#2A2826] dark:to-[#141312] border border-[#C29F67]/40 flex items-center justify-center shrink-0 shadow-xs">
              <span className="font-serif font-black text-[#C29F67] text-sm sm:text-base tracking-wider">
                B&B
              </span>
            </div>

            {/* Brand Title */}
            <div className="min-w-0">
              <span className="block font-serif font-bold text-base sm:text-xl lg:text-2xl text-[#1C1B1A] dark:text-white uppercase tracking-tight group-hover:text-[#9C753D] dark:group-hover:text-[#C29F67] transition-colors truncate">
                <span className="hidden sm:inline">{salonTitle}</span>
                <span className="sm:hidden">B & B Salon</span>
              </span>
              <span className="hidden sm:block text-[10px] tracking-widest uppercase font-semibold text-[#9C753D] dark:text-[#C29F67]">
                Unisex & Family Sanctuary · Bhopal
              </span>
            </div>
          </a>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs uppercase tracking-wider font-bold text-[#79746D] dark:text-gray-300">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-[#1C1B1A] dark:text-gray-300 dark:hover:text-white transition-colors hover:underline underline-offset-8 decoration-[#C29F67]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Actions - Theme Toggle + Account + Booking */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Admin Mode Switcher Button (When logged in) */}
          {isAdminLoggedIn && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              className="px-2.5 sm:px-3 py-2 sm:py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-[#C29F67] text-[#9C753D] dark:text-[#C29F67] hover:bg-[#F3EBDD] text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              title="Switch to Admin Dashboard"
            >
              <Sliders className="w-3.5 h-3.5 text-[#C29F67]" />
              <span className="hidden sm:inline">Admin Dashboard</span>
              <span className="sm:hidden text-xs">Admin</span>
            </button>
          )}

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 sm:p-2.5 bg-white dark:bg-white/10 border border-[#E6D4BA]/90 dark:border-white/20 text-[#1C1B1A] dark:text-white hover:bg-[#FAF7F2] dark:hover:bg-white/15 text-xs font-bold rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
              title={currentTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme"
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#C29F67]" />
              ) : (
                <Moon className="w-4 h-4 text-[#9C753D]" />
              )}
            </button>
          )}

          {onOpenCustomerSettings && (
            <button
              type="button"
              onClick={onOpenCustomerSettings}
              className="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-white dark:bg-white/10 border border-[#E6D4BA]/90 dark:border-white/20 text-[#1C1B1A] dark:text-white hover:bg-[#FAF7F2] dark:hover:bg-white/15 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              title={customerUser ? `Logged in as ${customerUser.name} (${customerUser.email})` : 'Sign in to view your bookings'}
            >
              <User className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
              <span className="hidden sm:inline">
                {customerUser ? `Hi, ${customerUser.name.split(' ')[0]}` : 'Sign In'}
              </span>
              <span className="sm:hidden text-xs">
                {customerUser ? customerUser.name.split(' ')[0] : 'Sign In'}
              </span>
            </button>
          )}

          <button
            onClick={onOpenBooking}
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-[#1C1B1A] dark:bg-[#C29F67] hover:bg-[#2A2826] dark:hover:bg-[#B38C4F] text-white text-xs uppercase tracking-wider font-bold rounded-xl shadow-xs hover:shadow-md transition-all whitespace-nowrap cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-[#C29F67] dark:text-[#1C1B1A]" />
            <span>Book Appointment</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#1C1B1A] dark:text-white rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:outline-hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E6D4BA]/40 dark:border-white/10 bg-[#FAF7F2] dark:bg-[#1A1918] px-5 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-3 text-sm font-bold text-[#1C1B1A] dark:text-white">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#9C753D] dark:hover:text-[#C29F67] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-2 border-t border-[#E6D4BA]/40 dark:border-white/10 space-y-2">
            {isAdminLoggedIn && onOpenAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdmin();
                }}
                className="w-full py-2.5 bg-[#FAF7F2] dark:bg-white/10 border border-[#C29F67] text-[#9C753D] dark:text-[#C29F67] text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#F3EBDD] transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-[#C29F67]" />
                <span>Switch to Admin Dashboard</span>
              </button>
            )}

            {onOpenCustomerSettings && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenCustomerSettings();
                }}
                className="w-full py-2.5 bg-white dark:bg-white/10 border border-[#E6D4BA]/90 dark:border-white/20 text-[#1C1B1A] dark:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#FAF7F2] transition-colors cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                <span>
                  {customerUser ? `Hi, ${customerUser.name} · My Bookings & Settings` : 'Sign In / Register with Gmail · My Bookings'}
                </span>
              </button>
            )}

            {settings?.phone && (
              <a
                href={`tel:${settings.phone.replace(/[^0-9+]/g, '')}`}
                className="w-full py-2.5 bg-white dark:bg-white/10 border border-[#E6D4BA]/90 dark:border-white/20 text-[#1C1B1A] dark:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-[#FAF7F2] transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-[#9C753D] dark:text-[#C29F67]" />
                <span>Call: {settings.phone}</span>
              </a>
            )}

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenBooking();
              }}
              className="w-full py-3 bg-[#1C1B1A] dark:bg-[#C29F67] text-white text-xs uppercase tracking-wider font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs"
            >
              <Calendar className="w-4 h-4 text-[#C29F67] dark:text-[#1C1B1A]" />
              <span>Book Appointment</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
