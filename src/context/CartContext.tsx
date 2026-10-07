import React, { createContext, useContext, useEffect, useState } from 'react';
import type { CartItem, MenuItem, Topping } from '../types/database';

interface CartContextType {
  items: CartItem[];
  addToCart: (menuItem: MenuItem, quantity?: number, selectedToppings?: Topping[], notes?: string) => void;
  updateQuantity: (cartItemId: string, delta: number) => void;
  removeItem: (cartItemId: string) => void;
  clearCart: () => void;
  totalItemCount: number;
  subtotal: number;
  deliveryFee: number;
  totalAmount: number;
  isCartDrawerOpen: boolean;
  setIsCartDrawerOpen: (isOpen: boolean) => void;
  customizingItem: MenuItem | null;
  setCustomizingItem: (item: MenuItem | null) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'cafe_corner_cart_v1';
const FREE_DELIVERY_THRESHOLD = 500;
const STANDARD_DELIVERY_FEE = 40;

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(CART_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.warn('Error reading cart from localStorage:', e);
      return [];
    }
  });

  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.warn('Error writing cart to localStorage:', e);
    }
  }, [items]);

  const addToCart = (
    menuItem: MenuItem,
    quantity = 1,
    selectedToppings: Topping[] = [],
    notes = ''
  ) => {
    const toppingsTotal = selectedToppings.reduce((sum, t) => sum + (t.price || 0), 0);
    const unitPrice = (menuItem.price || 0) + toppingsTotal;

    // Generate unique key based on item id and sorted toppings
    const toppingKey = selectedToppings
      .map((t) => t.id)
      .sort()
      .join(',');
    const cartItemId = `${menuItem.id}_${toppingKey}_${notes ? encodeURIComponent(notes) : ''}`;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((it) => it.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const current = updated[existingIndex];
        const newQty = current.quantity + quantity;
        updated[existingIndex] = {
          ...current,
          quantity: newQty,
          totalPrice: newQty * current.unitPrice,
        };
        return updated;
      } else {
        return [
          ...prevItems,
          {
            cartItemId,
            menuItem,
            quantity,
            selectedToppings,
            unitPrice,
            totalPrice: unitPrice * quantity,
            notes,
          },
        ];
      }
    });

    // Provide affirmative feedback by opening the cart drawer on mobile or desktop
    setIsCartDrawerOpen(true);
  };

  const updateQuantity = (cartItemId: string, delta: number) => {
    setItems((prevItems) => {
      return prevItems
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return {
              ...item,
              quantity: newQty,
              totalPrice: newQty * item.unitPrice,
            };
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  const removeItem = (cartItemId: string) => {
    setItems((prevItems) => prevItems.filter((it) => it.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
  const deliveryFee = subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : STANDARD_DELIVERY_FEE;
  const totalAmount = subtotal + deliveryFee;

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        totalItemCount,
        subtotal,
        deliveryFee,
        totalAmount,
        isCartDrawerOpen,
        setIsCartDrawerOpen,
        customizingItem,
        setCustomizingItem,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
