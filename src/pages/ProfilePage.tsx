import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Phone, MapPin, Mail, Save, LogOut, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const ProfilePage: React.FC<{ onOpenAuth: () => void }> = ({ onOpenAuth }) => {
  const { user, profile, updateCustomerProfile, signOut, isLoading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      setName(profile.name || profile.full_name || '');
      setPhone(profile.phone || '');
      setDeliveryAddress(profile.delivery_address || profile.address || '');
    }
  }, [profile]);

  if (isLoading) {
    return (
      <div className="py-24 text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-amber-800 mx-auto" />
        <p className="text-sm text-stone-600">Loading your profile from Supabase...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center mx-auto">
          <User className="w-8 h-8" />
        </div>
        <h2 className="font-serif text-2xl font-bold text-stone-900">
          Sign In to Access Profile
        </h2>
        <p className="text-xs text-stone-500 max-w-sm mx-auto">
          Manage your saved delivery address and phone number for effortless ordering.
        </p>
        <button
          onClick={onOpenAuth}
          className="px-6 py-2.5 bg-amber-800 text-white font-medium text-xs rounded-md hover:bg-amber-900 transition-colors cursor-pointer"
        >
          Sign In
        </button>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await updateCustomerProfile({
        name,
        full_name: name,
        phone,
        delivery_address: deliveryAddress,
        address: deliveryAddress,
      });
      setSuccessMsg('Profile updated successfully in Supabase profiles table.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error('Error saving profile:', err);
      setErrorMsg(err?.message || 'Could not update profile in Supabase.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-stone-200 pb-6">
        <div>
          <span className="text-xs font-semibold text-amber-800 tracking-wider uppercase">
            Account Center
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold tracking-tight text-stone-900 mt-1">
            Customer Profile
          </h1>
          <p className="text-xs text-stone-500 mt-1">
            Manage your personal contact info and default delivery address
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className="inline-flex items-center gap-1.5 px-4 py-2 border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-medium rounded-md transition-colors self-start sm:self-auto cursor-pointer"
        >
          <LogOut className="w-4 h-4 text-stone-500" />
          <span>Sign Out</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-6 shadow-xs">
        <div className="space-y-4">
          {/* Email (Read-only Auth) */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Account Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="email"
                disabled
                value={user.email || ''}
                className="w-full pl-9 pr-3 py-2 text-sm bg-stone-100/70 border border-stone-200 rounded-md text-stone-600 cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-1">Managed via Supabase Authentication.</p>
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aarav Sharma"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
              />
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Phone Number *
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
              />
            </div>
          </div>

          {/* Delivery Address */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
              Default Delivery Address
            </label>
            <div className="relative">
              <textarea
                rows={3}
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="House/Apt No., Building, Street Name, Landmark, City, PIN"
                className="w-full p-3 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
              />
            </div>
            <p className="text-[11px] text-stone-500 mt-1">
              Auto-fills your address during checkout for speed and ease.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-medium text-xs sm:text-sm rounded-md transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-60 shadow-xs"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Profile to Supabase</span>
          </button>
        </div>
      </form>
    </div>
  );
};
