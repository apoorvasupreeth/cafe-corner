import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, LogIn, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  onOpenAuth?: () => void;
}

export const AdminGuard: React.FC<AdminGuardProps> = ({ children, onOpenAuth }) => {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-10 h-10 text-amber-700 animate-spin mb-4" />
        <p className="text-stone-600 font-medium">Verifying administrator authorization...</p>
      </div>
    );
  }

  // If user is not authenticated
  if (!user) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-stone-200/90 p-8 text-center">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-amber-800 border border-amber-200">
            <Lock className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Admin Sign In Required</h2>
          <p className="text-stone-600 text-sm leading-relaxed mb-6">
            The Order Management section is restricted to authorized Cafe Corner administrators. Please sign in with an authorized account.
          </p>
          <div className="space-y-3">
            {onOpenAuth ? (
              <button
                onClick={onOpenAuth}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white font-medium rounded-xl transition-colors shadow-xs"
              >
                <LogIn className="w-4 h-4" />
                Sign In as Admin
              </button>
            ) : null}
            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-100 hover:bg-stone-200/80 text-stone-700 text-sm font-medium rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Storefront
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // If authenticated user is NOT an admin (checks profiles.role === 'admin')
  const isAdmin = profile?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-stone-200/90 p-8 text-center">
          <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-5 text-rose-600 border border-rose-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">Access Restricted</h2>
          <p className="text-stone-600 text-sm leading-relaxed mb-4">
            You are currently signed in as <strong className="text-stone-800">{user.email}</strong>.
          </p>
          <div className="bg-stone-50 border border-stone-200 rounded-xl p-3.5 mb-6 text-xs text-stone-600 text-left">
            <p className="font-semibold text-stone-800 mb-1">Authorization Check:</p>
            <p>Required role: <code className="bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded text-[11px] font-mono">admin</code></p>
            <p className="mt-1">Current profile role: <code className="bg-stone-200 text-stone-800 px-1.5 py-0.5 rounded text-[11px] font-mono">{profile?.role || 'customer'}</code></p>
          </div>
          <div className="space-y-3">
            <Link
              to="/"
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-800 hover:bg-amber-700 text-white font-medium rounded-xl transition-colors shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Customer Store
            </Link>
            <Link
              to="/profile"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-700 text-sm font-medium rounded-xl transition-colors"
            >
              Go to My Customer Profile
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
