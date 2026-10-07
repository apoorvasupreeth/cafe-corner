import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShoppingBag, User as UserIcon, Menu as MenuIcon, X, Coffee } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface NavbarProps {
  onOpenAuth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenAuth }) => {
  const { user, profile } = useAuth();
  const { totalItemCount, setIsCartDrawerOpen } = useCart();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Menu', path: '/menu' },
    { name: 'My Orders', path: '/orders' },
    { name: 'Contact', path: '/contact' },
  ];

  const displayName = profile?.name || profile?.full_name || user?.email?.split('@')[0] || 'Account';

  return (
    <header className="sticky top-0 z-40 bg-[#FDFBF7]/95 backdrop-blur-md border-b border-stone-200/80 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Zone 1: Brand Wordmark (Single text element in serif display) */}
        <Link
          to="/"
          className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-stone-900 hover:text-amber-800 transition-colors flex items-center gap-2.5"
        >
          <span className="w-8 h-8 rounded-full bg-stone-900 text-amber-100 flex items-center justify-center shadow-xs">
            <Coffee className="w-4.5 h-4.5" />
          </span>
          Cafe Corner
        </Link>

        {/* Zone 2: 4-6 Clean Text Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-stone-600">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`transition-colors py-1 relative ${
                  isActive
                    ? 'text-stone-900 font-semibold after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-amber-700'
                    : 'hover:text-stone-900'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions (Cart & Customer Profile) */}
        <div className="flex items-center gap-3">
          {/* Customer Profile / Sign In */}
          {user ? (
            <Link
              to="/profile"
              className="flex items-center gap-2 px-3 py-1.5 text-xs sm:text-sm font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-md transition-colors"
              title="View Profile"
            >
              <UserIcon className="w-4 h-4 text-stone-600" />
              <span className="hidden sm:inline max-w-[110px] truncate">{displayName}</span>
            </Link>
          ) : (
            <button
              onClick={onOpenAuth}
              className="px-3.5 py-1.5 text-xs sm:text-sm font-medium text-stone-800 hover:text-amber-800 hover:bg-stone-100 rounded-md transition-colors whitespace-nowrap"
            >
              Sign In
            </button>
          )}

          {/* Cart Action Button */}
          <button
            onClick={() => setIsCartDrawerOpen(true)}
            className="relative flex items-center justify-center p-2 text-stone-800 hover:text-amber-800 hover:bg-stone-100 rounded-md transition-colors"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItemCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-700 text-white font-mono text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-xs">
                {totalItemCount}
              </span>
            )}
          </button>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 text-stone-700 hover:text-stone-900 focus:outline-none"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-200 bg-[#FDFBF7] px-4 pt-3 pb-6 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                location.pathname === link.path
                  ? 'bg-amber-100/60 text-amber-950 font-semibold'
                  : 'text-stone-700 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              {link.name}
            </Link>
          ))}
          {user ? (
            <Link
              to="/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-base font-medium text-stone-700 hover:bg-stone-100 rounded-md"
            >
              Customer Profile ({displayName})
            </Link>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth();
              }}
              className="w-full text-left px-3 py-2 text-base font-medium text-amber-900 hover:bg-amber-50 rounded-md"
            >
              Sign In / Create Account
            </button>
          )}
        </div>
      )}
    </header>
  );
};
