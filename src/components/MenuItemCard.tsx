import React, { useState } from 'react';
import { Plus, Check, SlidersHorizontal } from 'lucide-react';
import type { MenuItem } from '../types/database';
import { useCart } from '../context/CartContext';
import { getFallbackImage } from '../assets/images';

interface MenuItemCardProps {
  item: MenuItem;
}

export const MenuItemCard: React.FC<MenuItemCardProps> = ({ item }) => {
  const { addToCart, setCustomizingItem } = useCart();
  const [imgError, setImgError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const isAvailable = item.is_available ?? item.available ?? true;
  const displayImage = !imgError && item.image_url ? item.image_url : getFallbackImage(item.id || item.name);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAvailable) return;

    addToCart(item, 1, []);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };

  const handleCustomize = () => {
    setCustomizingItem(item);
  };

  return (
    <div
      onClick={handleCustomize}
      className={`group bg-white rounded-xl border border-stone-200/90 overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col cursor-pointer ${
        !isAvailable ? 'opacity-70 grayscale-[30%]' : ''
      }`}
    >
      {/* Product Image Frame */}
      <div className="relative aspect-4/3 w-full bg-stone-100 overflow-hidden">
        <img
          src={displayImage}
          alt={item.name}
          onError={() => setImgError(true)}
          referrerPolicy="no-referrer"
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300 ease-out"
        />

        {/* Availability Marker */}
        {!isAvailable && (
          <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-2">
            <span className="text-white text-xs font-semibold tracking-wide uppercase px-3 py-1 bg-stone-950/80 rounded">
              Sold Out Today
            </span>
          </div>
        )}

        {/* Category tag */}
        {item.categories?.name && (
          <div className="absolute top-2.5 left-2.5">
            <span className="text-[11px] font-medium text-stone-700 bg-[#FDFBF7]/90 backdrop-blur-xs px-2 py-0.5 rounded shadow-2xs">
              {item.categories.name}
            </span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-serif text-lg font-bold text-stone-900 group-hover:text-amber-800 transition-colors line-clamp-1">
              {item.name}
            </h3>
            <span className="font-mono text-base font-bold text-stone-900 tabular-nums shrink-0">
              ₹{item.price}
            </span>
          </div>

          {item.description ? (
            <p className="text-xs text-stone-500 mt-1.5 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          ) : (
            <p className="text-xs text-stone-400 mt-1.5 italic">
              Crafted freshly to order at Cafe Corner
            </p>
          )}
        </div>

        {/* Action Bar */}
        <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCustomize();
            }}
            className="text-xs text-stone-600 hover:text-amber-850 font-medium flex items-center gap-1 py-1 hover:underline underline-offset-2 transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Customize</span>
          </button>

          <button
            type="button"
            disabled={!isAvailable}
            onClick={handleQuickAdd}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              justAdded
                ? 'bg-emerald-700 text-white'
                : isAvailable
                ? 'bg-amber-800 hover:bg-amber-900 text-white'
                : 'bg-stone-200 text-stone-400 cursor-not-allowed'
            }`}
          >
            {justAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Added</span>
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
