/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider, useCart } from './context/CartContext';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CartDrawer } from './components/CartDrawer';
import { AuthModal } from './components/AuthModal';
import { ItemCustomizerModal } from './components/ItemCustomizerModal';
import { SupabaseNoticeBanner } from './components/SupabaseNoticeBanner';

import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { OrderConfirmationPage } from './pages/OrderConfirmationPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { ProfilePage } from './pages/ProfilePage';
import { ContactPage } from './pages/ContactPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';

const AppContent: React.FC = () => {
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup' | 'connect'>('signin');
  const { customizingItem, setCustomizingItem } = useCart();

  const handleOpenAuth = (mode: 'signin' | 'signup' | 'connect' = 'signin') => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFBF7] text-stone-800">
      {/* Top Banner Notice with 1-click connect */}
      <SupabaseNoticeBanner onOpenConnect={() => handleOpenAuth('connect')} />

      {/* Top Navigation Bar adhering to the Top Bar Contract */}
      <Navbar onOpenAuth={() => handleOpenAuth('signin')} />

      {/* Main Content Viewport */}
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/checkout" element={<CheckoutPage onOpenAuth={() => handleOpenAuth('signin')} />} />
          <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
          <Route path="/orders" element={<MyOrdersPage onOpenAuth={() => handleOpenAuth('signin')} />} />
          <Route path="/my-orders" element={<MyOrdersPage onOpenAuth={() => handleOpenAuth('signin')} />} />
          <Route path="/profile" element={<ProfilePage onOpenAuth={() => handleOpenAuth('signin')} />} />
          <Route path="/contact" element={<ContactPage />} />
          {/* Admin Order Management Routes */}
          <Route path="/admin/orders" element={<AdminOrdersPage onOpenAuth={() => handleOpenAuth('signin')} />} />
          <Route path="/admin" element={<AdminOrdersPage onOpenAuth={() => handleOpenAuth('signin')} />} />
        </Routes>
      </main>

      {/* Slide-over Cart Drawer */}
      <CartDrawer />

      {/* Dynamic Item Customizer & Toppings Modal */}
      <ItemCustomizerModal
        item={customizingItem}
        onClose={() => setCustomizingItem(null)}
      />

      {/* Authentication Modal */}
      <AuthModal
        key={authModalMode}
        isOpen={isAuthModalOpen}
        defaultMode={authModalMode}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Editorial Footer */}
      <Footer />
    </div>
  );
};

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <AppContent />
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}
