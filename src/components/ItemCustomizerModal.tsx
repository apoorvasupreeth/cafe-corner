import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Check, Coffee } from 'lucide-react';
import type { MenuItem, Topping } from '../types/database';
import { getToppings, isSupabaseConfigured } from '../lib/supabase';
import { useCart } from '../context/CartContext';
import { getFallbackImage } from '../assets/images';

interface ItemCustomizerModalProps {
  item: MenuItem | null;
  onClose: () => void;
}

export const ItemCustomizerModal: React.FC<ItemCustomizerModalProps> = ({ item, onClose }) => {
  const { addToCart } = useCart();
  const [availableToppings, setAvailableToppings] = useState<Topping[]>([]);
  const [selectedToppings, setSelectedToppings] = useState<Topping[]>([]);
  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  const [isLoadingToppings, setIsLoadingToppings] = useState<boolean>(true);
  const [imgError, setImgError] = useState<boolean>(false);

  useEffect(() => {
    if (!item) return;

    setSelectedToppings([]);
    setQuantity(1);
    setNotes('');
    setImgError(false);

    if (isSupabaseConfigured) {
      setIsLoadingToppings(true);
      getToppings()
        .then((data) => {
          setAvailableToppings(data);
        })
        .catch((err) => {
          console.warn('Could not fetch toppings from Supabase:', err);
          setAvailableToppings([]);
        })
        .finally(() => {
          setIsLoadingToppings(false);
        });
    } else {
      setIsLoadingToppings(false);
      setAvailableToppings([]);
    }
  }, [item]);

  if (!item) return null;

  const isAvailable = item.is_available ?? item.available ?? true;

  const toggleTopping = (topping: Topping) => {
    setSelectedToppings((prev) => {
      const exists = prev.some((t) => t.id === topping.id);
      if (exists) {
        return prev.filter((t) => t.id !== topping.id);
      } else {
        return [...prev, topping];
      }
    });
  };

  const toppingsPrice = selectedToppings.reduce((sum, t) => sum + (t.price || 0), 0);
  const itemUnitPrice = (item.price || 0) + toppingsPrice;
  const totalPrice = itemUnitPrice * quantity;

  const handleAddToCart = () => {
    if (!isAvailable) return;
    addToCart(item, quantity, selectedToppings, notes);
    onClose();
  };

  const displayImage = !imgError && item.image_url ? item.image_url : getFallbackImage(item.id || item.name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="relative w-full max-w-lg bg-[#FDFBF7] rounded-xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with image */}
        <div className="relative h-48 sm:h-56 w-full bg-stone-100 overflow-hidden shrink-0">
          <img
            src={displayImage}
            alt={item.name}
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/20 to-transparent" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-stone-900/60 text-white flex items-center justify-center hover:bg-stone-900 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Title overlay */}
          <div className="absolute bottom-3 left-4 right-4 text-white">
            <span className="text-xs uppercase tracking-wider text-amber-300 font-medium">
              {item.categories?.name || 'Cafe Corner Specialties'}
            </span>
            <h3 className="font-serif text-2xl font-bold tracking-tight text-white drop-shadow-xs">
              {item.name}
            </h3>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Description & Base Price */}
          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-xl font-bold text-stone-900 tabular-nums">
                ₹{item.price}
              </span>
              {!isAvailable && (
                <span className="text-xs font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Currently Sold Out
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-stone-600 mt-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          {/* Dynamic Toppings from Supabase */}
          <div className="space-y-3 pt-2 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-stone-800 uppercase tracking-wider">
                Add Extra Toppings & Customizations
              </h4>
              <span className="text-xs text-stone-500">Optional</span>
            </div>

            {isLoadingToppings ? (
              <p className="text-xs text-stone-400 italic">Loading toppings from Supabase...</p>
            ) : availableToppings.length > 0 ? (
              <div className="space-y-2">
                {availableToppings.map((topping) => {
                  const isSelected = selectedToppings.some((t) => t.id === topping.id);
                  return (
                    <label
                      key={topping.id}
                      onClick={() => toggleTopping(topping)}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-amber-700 bg-amber-50/70 text-stone-900 shadow-xs'
                          : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                            isSelected ? 'bg-amber-700 border-amber-700 text-white' : 'border-stone-300 bg-white'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <span className="text-sm font-medium">{topping.name}</span>
                      </div>
                      <span className="font-mono text-xs font-semibold text-stone-900 tabular-nums">
                        +₹{topping.price}
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-stone-500 bg-stone-100/70 p-3 rounded-md">
                No extra toppings configured for this selection in the database.
              </p>
            )}
          </div>

          {/* Special Instructions Note */}
          <div className="space-y-2 pt-2 border-t border-stone-200">
            <label className="block text-xs font-semibold text-stone-800 uppercase tracking-wider">
              Special Instructions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g. Extra hot, oat milk preferred, less sweetness..."
              rows={2}
              className="w-full p-2.5 text-xs bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
            />
          </div>
        </div>

        {/* Sticky bottom CTA and quantity counter */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center gap-4 shrink-0">
          {/* Quantity Stepper */}
          <div className="flex items-center border border-stone-300 bg-white rounded-md overflow-hidden shadow-xs">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || !isAvailable}
              className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-40 transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-mono text-sm font-bold text-stone-800 tabular-nums min-w-[28px] text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              disabled={!isAvailable}
              className="p-2 text-stone-600 hover:text-stone-900 hover:bg-stone-100 disabled:opacity-40 transition-colors"
              aria-label="Increase quantity"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to Cart button */}
          <button
            onClick={handleAddToCart}
            disabled={!isAvailable}
            className="flex-1 py-3 px-4 bg-amber-800 hover:bg-amber-900 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-between disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <span>{isAvailable ? 'Add to Cart' : 'Item Unavailable'}</span>
            <span className="font-mono tabular-nums font-semibold">₹{totalPrice}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
