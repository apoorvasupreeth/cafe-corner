import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Coffee, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { getMenuItems, isSupabaseConfigured } from '../lib/supabase';
import type { MenuItem } from '../types/database';
import { MenuItemRow } from '../components/MenuItemRow';
import { localImages } from '../assets/images';

export const HomePage: React.FC = () => {
  const [featuredItems, setFeaturedItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadFeatured = () => {
    if (isSupabaseConfigured) {
      setIsLoading(true);
      getMenuItems()
        .then((items) => {
          setFeaturedItems(items.slice(0, 8));
        })
        .catch((err) => {
          console.warn('Could not fetch featured items from Supabase:', err);
          setFeaturedItems([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFeatured();

    const handleConfigUpdated = () => {
      loadFeatured();
    };

    window.addEventListener('supabase-config-updated', handleConfigUpdated);
    return () => {
      window.removeEventListener('supabase-config-updated', handleConfigUpdated);
    };
  }, []);

  return (
    <div className="space-y-16 sm:space-y-24 pb-20">
      {/* 1. Hero Section - Crisp Static Photo Background (Reverted from GIF/Video) */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background photo with warm measured contrast scrim */}
        <div className="absolute inset-0">
          <img
            src={localImages.hero}
            alt="Cafe Corner Interior"
            className="w-full h-full object-cover object-center"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/60 to-stone-950/40" />
        </div>

        {/* Hero Content with Smooth Entrance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center text-white space-y-6 pt-12"
        >
          {/* Kicker Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-stone-900/75 border border-stone-700/80 text-amber-300 text-xs tracking-wider uppercase backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-medium">Your Corner for Coffee & Cravings</span>
          </div>

          {/* Main Headline */}
          <h1 className="font-serif text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-amber-50 drop-shadow-md leading-[1.1] text-balance">
            Good Coffee. Great Snacks. Better Moments
          </h1>

          {/* Subtitle */}
          <p className="text-sm sm:text-base text-stone-200 max-w-2xl mx-auto font-light leading-relaxed">
            From hot masala Maggi and wok-fired noodles to artisan grilled sandwiches and cooling ice creams. Made fresh to order in our cozy neighborhood kitchen.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              to="/menu"
              className="w-full sm:w-auto px-8 py-3.5 bg-amber-700 hover:bg-amber-600 text-white font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-amber-950/40 cursor-pointer"
            >
              <span>Order Online Now</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/contact"
              className="w-full sm:w-auto px-8 py-3.5 bg-stone-900/80 hover:bg-stone-900 text-stone-100 border border-stone-700/90 font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2 backdrop-blur-xs cursor-pointer"
            >
              <span>Visit Our Cafe</span>
            </Link>
          </div>
        </motion.div>
      </section>

      {/* 2. Featured Menu Showcase (Clean Rows Without Redundant Images or GIFs) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-stone-200/80 pb-4">
          <div>
            <span className="text-xs font-semibold text-amber-800 tracking-wider uppercase">
              Chef’s Selection
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900 mt-1">
              Popular Cafe Favorites
            </h2>
          </div>

          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-sm font-semibold text-amber-800 hover:text-amber-900 transition-colors group self-start sm:self-auto"
          >
            <span>View All 4 Categories</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Clean Items Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div key={idx} className="h-20 bg-stone-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : featuredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {featuredItems.map((item) => (
              <MenuItemRow key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <div className="p-12 text-center bg-white rounded-xl border border-stone-200 space-y-3">
            <Coffee className="w-10 h-10 text-amber-700 mx-auto" />
            <h3 className="font-serif text-xl font-bold text-stone-800">
              Menu Items Loading from Supabase
            </h3>
            <p className="text-xs text-stone-500 max-w-md mx-auto">
              Our menu items and categories are retrieved dynamically from the Supabase database. Connect your project credentials to explore the live menu.
            </p>
            <Link
              to="/menu"
              className="inline-block mt-2 px-5 py-2.5 bg-amber-800 text-white text-xs font-medium rounded-md hover:bg-amber-900 transition-colors"
            >
              Go to Menu Page
            </Link>
          </div>
        )}
      </section>
    </div>
  );
};
