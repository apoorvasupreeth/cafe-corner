import React, { useState, useEffect, useMemo } from 'react';
import { Search, AlertCircle, Coffee, RotateCw, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { getCategories, getMenuItems, isSupabaseConfigured } from '../lib/supabase';
import type { Category, MenuItem } from '../types/database';
import { MenuItemRow } from '../components/MenuItemRow';
import { getCategoryImage } from '../assets/images';
import { getCategoryGif } from '../assets/gifs';

export const MenuPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchMenuData = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      setErrorMessage(
        'Supabase credentials are not configured yet. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment or connect your database to load the live 4 categories and 29 menu items.'
      );
      return;
    }

    try {
      const [cats, items] = await Promise.all([
        getCategories(),
        getMenuItems(),
      ]);
      setCategories(cats);
      setMenuItems(items);
    } catch (err: any) {
      console.error('Failed to load menu from Supabase:', err);
      setErrorMessage(
        err?.message || 'Failed to load menu data from Supabase. Please ensure your Supabase database is reachable.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenuData();

    const handleConfigUpdated = () => {
      fetchMenuData();
    };

    window.addEventListener('supabase-config-updated', handleConfigUpdated);
    return () => {
      window.removeEventListener('supabase-config-updated', handleConfigUpdated);
    };
  }, []);

  // Filter items based on selected category and search input
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        selectedCategoryId === 'all' || item.category_id === selectedCategoryId;
      const matchesSearch =
        searchQuery.trim() === '' ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesCategory && matchesSearch;
    });
  }, [menuItems, selectedCategoryId, searchQuery]);

  // Group items by category
  const categoriesWithItems = useMemo(() => {
    const list: Category[] = categories.length > 0
      ? categories
      : Array.from(new Set(menuItems.map((m) => m.category_id))).map((id, idx) => ({
          id,
          name: menuItems.find((m) => m.category_id === id)?.categories?.name || `Category ${idx + 1}`,
          description: null,
          image_url: null,
        }));

    return list
      .filter((cat) => selectedCategoryId === 'all' || cat.id === selectedCategoryId)
      .map((cat, idx) => {
        const items = filteredItems.filter((i) => i.category_id === cat.id);
        return {
          category: cat,
          categoryIndex: idx,
          items,
        };
      })
      .filter((group) => group.items.length > 0);
  }, [categories, menuItems, filteredItems, selectedCategoryId]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10 pb-24">
      {/* Page Header */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-amber-800 tracking-wider uppercase">
          Kitchen & Espresso Bar
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-stone-900">
          The Cafe Corner Menu
        </h1>
        <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
          Crafted grill sandwiches, cooling ice creams, hot masala Maggi bowls, and wok noodles. Browse our selections below.
        </p>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-xl bg-white border border-stone-200/90 shadow-2xs">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sandwiches, ice cream, maggi, noodles..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 placeholder:text-stone-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-xs text-stone-400 hover:text-stone-700"
            >
              Clear
            </button>
          )}
        </div>

        {/* Count indicator */}
        <div className="text-xs text-stone-500 font-mono tabular-nums">
          Showing <span className="font-semibold text-stone-900">{filteredItems.length}</span> of {menuItems.length} items
        </div>
      </div>

      {/* Category Filter Tabs with mini GIFs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryId('all')}
          className={`px-4 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer ${
            selectedCategoryId === 'all'
              ? 'bg-amber-800 text-white shadow-xs font-semibold'
              : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-300 hover:text-stone-900'
          }`}
        >
          All Items ({menuItems.length})
        </button>

        {categories.map((cat, idx) => {
          const count = menuItems.filter((i) => i.category_id === cat.id).length;
          const isActive = selectedCategoryId === cat.id;
          const catGif = getCategoryGif(cat.name, idx);

          return (
            <button
              key={cat.id || idx}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg whitespace-nowrap transition-colors cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-amber-800 text-white shadow-xs font-semibold'
                  : 'bg-white border border-stone-200 text-stone-700 hover:border-stone-300 hover:text-stone-900'
              }`}
            >
              <img src={catGif} alt="" className="w-4 h-4 object-contain" />
              <span>{cat.name}</span>
              {count > 0 && <span className="opacity-75">({count})</span>}
            </button>
          );
        })}
      </div>

      {/* Error / Configuration Message */}
      {errorMessage && (
        <div className="p-6 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-3">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="text-sm font-bold">Supabase Database Notice</h3>
              <p className="text-xs text-amber-900 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
          <button
            onClick={fetchMenuData}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-800 text-white text-xs font-medium rounded-md hover:bg-amber-900 transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Retry Connection</span>
          </button>
        </div>
      )}

      {/* Loading Skeletons */}
      {isLoading ? (
        <div className="space-y-8">
          {[1, 2, 3, 4].map((catIdx) => (
            <div key={catIdx} className="bg-white rounded-2xl border border-stone-200 p-6 space-y-6 animate-pulse">
              <div className="flex gap-6 items-center">
                <div className="w-32 h-24 bg-stone-100 rounded-xl shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-6 bg-stone-100 rounded w-1/4" />
                  <div className="h-4 bg-stone-100 rounded w-1/2" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-stone-100 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : categoriesWithItems.length > 0 ? (
        /* Category-wise Layout with 1 Image & Category Animated GIF */
        <div className="space-y-12">
          {categoriesWithItems.map(({ category, categoryIndex, items }) => {
            const categoryImage = getCategoryImage(category.name, categoryIndex, category.image_url);
            const categoryGif = getCategoryGif(category.name, categoryIndex);

            return (
              <motion.section
                key={category.id || categoryIndex}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: categoryIndex * 0.08 }}
                className="group bg-white rounded-2xl border border-stone-200/90 shadow-xs overflow-hidden"
              >
                {/* 1 Image Header Banner with prominent animated GIF badge for this Category */}
                <div className="relative h-44 sm:h-52 w-full overflow-hidden">
                  <img
                    src={categoryImage}
                    alt={category.name}
                    className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-stone-950/50 to-stone-950/20" />

                  <div className="absolute bottom-4 left-6 right-6 text-white flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                    <div className="flex items-center gap-3.5">
                      {/* Small GIF badge for this Category */}
                      <div className="w-13 h-13 sm:w-16 sm:h-16 rounded-xl bg-white/95 p-1.5 shadow-lg flex items-center justify-center shrink-0 border border-white/50 backdrop-blur-xs transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3">
                        <img
                          src={categoryGif}
                          alt={`${category.name} animated gif`}
                          className="w-full h-full object-contain"
                        />
                      </div>

                      <div>
                        <div className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-semibold tracking-wider uppercase mb-0.5">
                          <Sparkles className="w-3.5 h-3.5" />
                          <span>Category {categoryIndex + 1} of 4</span>
                        </div>
                        <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight text-white drop-shadow-xs">
                          {category.name}
                        </h2>
                        {category.description && (
                          <p className="text-xs text-stone-200 mt-0.5 max-w-xl font-light line-clamp-1">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-mono bg-stone-900/80 backdrop-blur-xs text-amber-200 px-3 py-1 rounded-full border border-stone-700 self-start sm:self-auto shrink-0">
                      {items.length} {items.length === 1 ? 'Item' : 'Items'}
                    </span>
                  </div>
                </div>

                {/* Clean Menu Items List (Without individual images) */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {items.map((item) => (
                      <MenuItemRow key={item.id} item={item} />
                    ))}
                  </div>
                </div>
              </motion.section>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="text-center py-16 px-4 bg-white rounded-xl border border-stone-200 space-y-4">
          <Coffee className="w-12 h-12 text-stone-300 mx-auto" />
          <h3 className="font-serif text-xl font-bold text-stone-800">
            No menu items found
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchQuery
              ? `No items matched "${searchQuery}". Try a different keyword or reset filters.`
              : 'There are no menu items in this selection.'}
          </p>
          {(searchQuery || selectedCategoryId !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategoryId('all');
              }}
              className="px-4 py-2 bg-stone-900 text-white text-xs font-medium rounded-md hover:bg-stone-800 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
};
