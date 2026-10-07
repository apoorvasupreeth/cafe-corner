import React, { useState } from 'react';
import { Plus, Check, SlidersHorizontal } from 'lucide-react';
import type { MenuItem } from '../types/database';
import { useCart } from '../context/CartContext';

interface MenuItemRowProps {
  item: MenuItem;
}

export const MenuItemRow: React.FC<MenuItemRowProps> = ({ item }) => {
  const { addToCart, setCustomizingItem } = useCart();
  const [justAdded, setJustAdded] = useState(false);

  const isAvailable = item.is_available ?? item.available ?? true;

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
      className={`group bg-white rounded-xl border border-stone-200/90 p-4 hover:border-amber-700/40 hover:shadow-sm transition-all duration-150 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer ${
        !isAvailable ? 'opacity-65 bg-stone-50/60' : ''
      }`}
    >
      {/* Title & Description */}
      <div className="flex-1 min-w-0 pr-2">
        <div className="flex items-baseline gap-2 flex-wrap">
          <h4 className="font-serif text-base font-bold text-stone-900 group-hover:text-amber-850 transition-colors">
            {item.name}
          </h4>
          {!isAvailable && (
            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 uppercase tracking-wide">
              Sold Out
            </span>
          )}
        </div>

        {item.description ? (
          <p className="text-xs text-stone-500 mt-1 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        ) : (
          <p className="text-xs text-stone-400 mt-0.5 italic">
            Prepared fresh to order
          </p>
        )}
      </div>

      {/* Pricing & Actions */}
      <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
        <span className="font-mono text-base font-bold text-stone-900 tabular-nums">
          ₹{item.price}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleCustomize();
            }}
            className="text-xs text-stone-600 hover:text-amber-850 font-medium px-2 py-1.5 rounded hover:bg-stone-100 flex items-center gap-1 transition-colors"
            title="Customize with toppings"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Customize</span>
          </button>

          <button
            type="button"
            disabled={!isAvailable}
            onClick={handleQuickAdd}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-150 flex items-center gap-1 cursor-pointer shadow-2xs ${
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
