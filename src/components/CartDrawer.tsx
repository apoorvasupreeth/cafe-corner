import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Trash2, Plus, Minus, ArrowRight, ShoppingBag } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { getFallbackImage } from '../assets/images';

export const CartDrawer: React.FC = () => {
  const {
    items,
    isCartDrawerOpen,
    setIsCartDrawerOpen,
    updateQuantity,
    removeItem,
    subtotal,
    deliveryFee,
    totalAmount,
    totalItemCount,
  } = useCart();

  const navigate = useNavigate();

  if (!isCartDrawerOpen) return null;

  const handleCheckout = () => {
    setIsCartDrawerOpen(false);
    navigate('/checkout');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={() => setIsCartDrawerOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#FDFBF7] shadow-2xl flex flex-col border-l border-stone-200">
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-stone-200 flex items-center justify-between bg-stone-50/70">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-800" />
              <h2 className="font-serif text-xl font-bold text-stone-900">
                Your Order Bag
              </h2>
              <span className="text-xs font-mono bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full font-semibold">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              onClick={() => setIsCartDrawerOpen(false)}
              className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Item List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 divide-y divide-stone-200/70 space-y-4">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-stone-800">
                    Your bag is empty
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 max-w-[240px]">
                    Treat yourself to our specialty pour-overs, artisan toasts, or freshly baked croissants.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsCartDrawerOpen(false);
                    navigate('/menu');
                  }}
                  className="px-5 py-2.5 bg-amber-800 hover:bg-amber-900 text-white text-xs font-medium rounded-md transition-colors"
                >
                  Browse Menu
                </button>
              </div>
            ) : (
              items.map((item) => {
                const img = item.menuItem.image_url || getFallbackImage(item.menuItem.id || item.menuItem.name);
                return (
                  <div key={item.cartItemId} className="pt-4 first:pt-0 flex gap-3">
                    <img
                      src={img}
                      alt={item.menuItem.name}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded-lg object-cover bg-stone-100 shrink-0 border border-stone-200"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-semibold text-stone-900 truncate">
                          {item.menuItem.name}
                        </h4>
                        <button
                          onClick={() => removeItem(item.cartItemId)}
                          className="text-stone-400 hover:text-rose-600 transition-colors p-0.5"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Toppings list */}
                      {item.selectedToppings && item.selectedToppings.length > 0 && (
                        <div className="mt-1 text-[11px] text-amber-800 space-x-1">
                          <span className="font-medium">+ Extra:</span>
                          <span>{item.selectedToppings.map((t) => t.name).join(', ')}</span>
                        </div>
                      )}

                      {/* Notes */}
                      {item.notes && (
                        <p className="text-[11px] text-stone-500 italic mt-0.5 truncate">
                          "{item.notes}"
                        </p>
                      )}

                      {/* Price & Quantity Controls */}
                      <div className="mt-2.5 flex items-center justify-between">
                        <span className="font-mono text-sm font-bold text-stone-900 tabular-nums">
                          ₹{item.totalPrice}
                        </span>

                        <div className="flex items-center border border-stone-300 bg-white rounded-md overflow-hidden shadow-2xs">
                          <button
                            onClick={() => updateQuantity(item.cartItemId, -1)}
                            className="p-1 px-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                            aria-label="Decrease"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono text-xs font-semibold text-stone-800 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.cartItemId, 1)}
                            className="p-1 px-1.5 text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
                            aria-label="Increase"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer calculation & checkout */}
          {items.length > 0 && (
            <div className="p-4 sm:p-6 bg-stone-50 border-t border-stone-200 space-y-3">
              <div className="space-y-1.5 text-xs text-stone-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium tabular-nums text-stone-800">
                    ₹{subtotal}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Delivery Fee</span>
                  <span className="font-mono font-medium tabular-nums text-stone-800">
                    {deliveryFee === 0 ? (
                      <span className="text-emerald-700 font-semibold">FREE</span>
                    ) : (
                      `₹${deliveryFee}`
                    )}
                  </span>
                </div>
                {deliveryFee > 0 && (
                  <p className="text-[11px] text-stone-500 italic">
                    Add ₹{500 - subtotal} more for free delivery!
                  </p>
                )}
                <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold text-stone-900">
                  <span>Total Due</span>
                  <span className="font-mono text-base tabular-nums text-amber-900">
                    ₹{totalAmount}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-3 px-4 bg-amber-800 hover:bg-amber-900 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
