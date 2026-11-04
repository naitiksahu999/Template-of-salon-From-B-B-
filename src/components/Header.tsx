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

  const salonTitle = settings?.salonName || 'Tassel Unisex Salon';

  const navLinks = [
    { label: 'Home', href: '#' },
    { label: 'Services', href: '#services' },
    { label: 'About', href: '#experience' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Reviews', href: '#reviews' },
    { label: 'Location', href: '#location' }
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#FAF6F0]/95 dark:bg-[#181514]/95 backdrop-blur-md border-b border-[#E8DDD3] dark:border-white/10 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-3">
        {/* Zone 1: Luxury Brand Wordmark inspired by photo */}
        <div className="flex items-center gap-3 min-w-0">
          <a
            href="/"
            className="flex flex-col group min-w-0"
            title={salonTitle}
          >
            <span className="font-serif font-bold text-xl sm:text-2xl lg:text-3xl text-[#2B2523] dark:text-white uppercase tracking-wider group-hover:text-[#B86546] transition-colors leading-none">
              TASSEL
            </span>
            <span className="text-[9px] sm:text-[10px] tracking-[0.25em] uppercase font-semibold text-[#847771] dark:text-[#D6AFA0] mt-1">
              UNISEX SALON · BHOPAL
            </span>
          </a>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-xs uppercase tracking-widest font-semibold text-[#665B55] dark:text-gray-300">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="hover:text-[#B86546] dark:hover:text-white transition-colors hover:underline underline-offset-8 decoration-[#B86546]"
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
              className="px-2.5 sm:px-3 py-2 sm:py-2.5 bg-white dark:bg-white/10 border border-[#B86546]/40 text-[#B86546] dark:text-[#D6AFA0] hover:bg-[#F4EAE1] text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              title="Switch to Admin Dashboard"
            >
              <Sliders className="w-3.5 h-3.5 text-[#B86546]" />
              <span className="hidden sm:inline">Admin Dashboard</span>
              <span className="sm:hidden text-xs">Admin</span>
            </button>
          )}

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              className="p-2 sm:p-2.5 bg-white dark:bg-white/10 border border-[#E8DDD3] dark:border-white/15 text-[#2B2523] dark:text-white hover:bg-[#F4EAE1] dark:hover:bg-white/15 text-xs font-bold rounded-md transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
              title={currentTheme === 'dark' ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              aria-label="Toggle theme"
            >
              {currentTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-[#D6AFA0]" />
              ) : (
                <Moon className="w-4 h-4 text-[#B86546]" />
              )}
            </button>
          )}

          {onOpenCustomerSettings && (
            <button
              type="button"
              onClick={onOpenCustomerSettings}
              className="px-3 sm:px-3.5 py-2 sm:py-2.5 bg-white dark:bg-white/10 border border-[#E8DDD3] dark:border-white/15 text-[#2B2523] dark:text-white hover:bg-[#F4EAE1] dark:hover:bg-white/15 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              title={customerUser ? `Logged in as ${customerUser.name} (${customerUser.email})` : 'Sign in to view your bookings'}
            >
              <User className="w-3.5 h-3.5 text-[#B86546] dark:text-[#D6AFA0]" />
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
            className="hidden sm:inline-flex items-center gap-2 px-5 py-2.5 bg-[#B86546] hover:bg-[#A25336] text-white text-xs uppercase tracking-wider font-bold rounded-md shadow-xs hover:shadow-md transition-all whitespace-nowrap cursor-pointer"
          >
            <Calendar className="w-3.5 h-3.5 text-white" />
            <span>Book Appointment</span>
          </button>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-[#2B2523] dark:text-white rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors focus-visible:outline-hidden"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#E8DDD3] dark:border-white/10 bg-[#FAF6F0] dark:bg-[#181514] px-5 py-4 space-y-3 animate-in slide-in-from-top-2 duration-150">
          <div className="flex flex-col space-y-3 text-sm font-bold text-[#2B2523] dark:text-white">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#B86546] dark:hover:text-[#D6AFA0] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="pt-2 border-t border-[#E8DDD3] dark:border-white/10 space-y-2">
            {isAdminLoggedIn && onOpenAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdmin();
                }}
                className="w-full py-2.5 bg-white dark:bg-white/10 border border-[#B86546] text-[#B86546] dark:text-[#D6AFA0] text-xs font-bold rounded-md flex items-center justify-center gap-2 hover:bg-[#F4EAE1] transition-colors cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-[#B86546]" />
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
