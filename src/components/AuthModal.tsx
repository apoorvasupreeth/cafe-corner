import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, Loader2, AlertCircle, Database, CheckCircle2, ArrowRight, Zap, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { configureSupabase, supabaseUrl, supabaseAnonKey } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'signin' | 'signup' | 'connect';
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  defaultMode = 'signin',
}) => {
  const { signIn, signUp, signInWithDirectSession, signInWithDemo, resetPassword, isConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot' | 'connect'>(
    !isConfigured ? 'connect' : defaultMode
  );

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  // Supabase Connect fields
  const [inputUrl, setInputUrl] = useState(supabaseUrl || '');
  const [inputKey, setInputKey] = useState(supabaseAnonKey || '');

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showSignUpSuggestion, setShowSignUpSuggestion] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);

  if (!isOpen) return null;

  const handleConnectSupabase = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsRateLimited(false);

    if (!inputUrl.trim() || !inputKey.trim()) {
      setErrorMsg('Please enter both your Supabase Project URL and Anon Public Key.');
      return;
    }

    const success = configureSupabase(inputUrl, inputKey);
    if (success) {
      setSuccessMsg('Supabase connected successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
        setMode('signin');
      }, 1000);
    } else {
      setErrorMsg('Could not initialize Supabase. Please verify the URL format (e.g. https://your-project.supabase.co).');
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setShowSignUpSuggestion(false);
    setIsRateLimited(false);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter both your email and password.');
      return;
    }

    if (!isConfigured) {
      setMode('connect');
      setErrorMsg('Please connect your Supabase database credentials first.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await signIn(cleanEmail, password);
      if (res.error) {
        if (res.isRateLimited) {
          setIsRateLimited(true);
          setErrorMsg('Supabase email rate limit exceeded (maximum 3 emails/hour on default mailer).');
        } else if (res.isConfirmed === false || res.error.message?.toLowerCase().includes('email not confirmed')) {
          setErrorMsg('Email confirmation required. Please check your inbox or confirm your email in Supabase Auth.');
        } else if (res.error.message?.toLowerCase().includes('invalid login credentials')) {
          setErrorMsg('Invalid email or password.');
          setShowSignUpSuggestion(true);
        } else {
          setErrorMsg(res.error.message || 'Could not sign in with these credentials.');
        }
      } else {
        setSuccessMsg('Signed in successfully!');
        setTimeout(() => {
          onClose();
        }, 600);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setIsRateLimited(true);
        setErrorMsg('Supabase email rate limit exceeded.');
      } else {
        setErrorMsg(msg || 'An unexpected error occurred during sign in.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsRateLimited(false);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setErrorMsg('Please enter an email and password.');
      return;
    }

    if (!name.trim() || !phone.trim()) {
      setErrorMsg('Please provide your name and phone number for delivery contact.');
      return;
    }

    if (!isConfigured) {
      setMode('connect');
      setErrorMsg('Please connect your Supabase database credentials first.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await signUp(cleanEmail, password, name.trim(), phone.trim());
      if (res.error) {
        if (res.isRateLimited) {
          setIsRateLimited(true);
          setErrorMsg('Supabase email rate limit exceeded on confirmation emails.');
        } else {
          setErrorMsg(res.error.message || 'Could not create account.');
        }
      } else if (res.requiresEmailConfirmation) {
        setSuccessMsg('Account created! Please check your email to confirm, or sign in if confirmation is not required.');
        setTimeout(() => {
          setMode('signin');
        }, 3000);
      } else {
        setSuccessMsg('Welcome to Cafe Corner! Your account is created.');
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.toLowerCase().includes('rate limit')) {
        setIsRateLimited(true);
        setErrorMsg('Supabase email rate limit exceeded.');
      } else {
        setErrorMsg(msg || 'An unexpected error occurred during signup.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsRateLimited(false);

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email address to receive a password reset link.');
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await resetPassword(cleanEmail);
      if (error) {
        if (error.message?.toLowerCase().includes('rate limit')) {
          setIsRateLimited(true);
          setErrorMsg('Supabase email rate limit exceeded for password reset emails.');
        } else {
          setErrorMsg(error.message || 'Could not send reset email.');
        }
      } else {
        setSuccessMsg('Password reset email sent! Please check your inbox.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to request password reset.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBypassWithDirectSession = async () => {
    const cleanEmail = (email || 'customer@cafecorner.in').trim();
    await signInWithDirectSession(cleanEmail, name || cleanEmail.split('@')[0], phone || '');
    setSuccessMsg(`Signed in directly as ${cleanEmail}!`);
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleDemoSignIn = () => {
    signInWithDemo();
    setSuccessMsg('Signed in as Demo Customer (Aarav Sharma)!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md bg-[#FDFBF7] rounded-xl shadow-2xl border border-stone-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-200">
          <div>
            <h3 className="font-serif text-2xl font-bold text-stone-900">
              {mode === 'signin' && 'Sign In'}
              {mode === 'signup' && 'Create Account'}
              {mode === 'forgot' && 'Reset Password'}
              {mode === 'connect' && 'Connect Supabase'}
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {mode === 'signin' && 'Sign in to access your orders and saved delivery details.'}
              {mode === 'signup' && 'Join Cafe Corner to place orders and track delivery live.'}
              {mode === 'forgot' && 'Enter your email to receive a password reset email.'}
              {mode === 'connect' && 'Link your existing Cafe Corner Supabase project database.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-700 rounded-md transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-stone-200 bg-stone-50/60 text-xs sm:text-sm font-medium">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setErrorMsg(null);
              setShowSignUpSuggestion(false);
              setIsRateLimited(false);
            }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              mode === 'signin'
                ? 'border-b-2 border-amber-800 text-stone-900 font-semibold bg-[#FDFBF7]'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setErrorMsg(null);
              setShowSignUpSuggestion(false);
              setIsRateLimited(false);
            }}
            className={`flex-1 py-3 text-center transition-colors cursor-pointer ${
              mode === 'signup'
                ? 'border-b-2 border-amber-800 text-stone-900 font-semibold bg-[#FDFBF7]'
                : 'text-stone-500 hover:text-stone-800'
            }`}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('connect');
              setErrorMsg(null);
              setShowSignUpSuggestion(false);
              setIsRateLimited(false);
            }}
            className={`px-3 py-3 text-center transition-colors cursor-pointer flex items-center justify-center gap-1 ${
              mode === 'connect'
                ? 'border-b-2 border-amber-800 text-amber-900 font-semibold bg-[#FDFBF7]'
                : 'text-stone-400 hover:text-stone-700'
            }`}
            title="Database Connection"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Database</span>
          </button>
        </div>

        {/* Alerts & Rate Limit Bypass Box */}
        <div className="p-6 pb-0 space-y-3">
          {isRateLimited && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 space-y-3">
              <div className="flex items-start gap-2.5">
                <Zap className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    Email Rate Limit Exceeded
                  </h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Supabase's default free SMTP mailer limits outgoing emails to ~3/hour. You don't have to wait!
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-amber-200 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handleBypassWithDirectSession}
                  className="w-full py-2 px-3 bg-amber-800 hover:bg-amber-900 text-white rounded-md text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>
                    Sign in as {email.trim() ? email.trim() : 'Customer'} (Skip Mail Limit)
                  </span>
                </button>

                <p className="text-[11px] text-amber-700/80 leading-normal">
                  Tip: In your Supabase Dashboard → Authentication → Providers → Email, uncheck <strong>Confirm email</strong> to enable instant sign-ins without email rate limits.
                </p>
              </div>
            </div>
          )}

          {errorMsg && !isRateLimited && (
            <div className="flex items-start gap-2.5 p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span>{errorMsg}</span>
                {showSignUpSuggestion && (
                  <div className="mt-2 pt-2 border-t border-rose-200/60">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMsg(null);
                        setShowSignUpSuggestion(false);
                      }}
                      className="text-xs font-semibold text-rose-900 underline underline-offset-2 hover:text-rose-950 flex items-center gap-1"
                    >
                      <span>Don't have an account yet? Click here to Sign Up</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* 1. Sign In Form */}
        {mode === 'signin' && (
          <form onSubmit={handleSignIn} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot');
                    setErrorMsg(null);
                    setIsRateLimited(false);
                  }}
                  className="text-xs text-amber-800 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Sign In to Cafe Corner</span>
            </button>
          </form>
        )}

        {/* 2. Sign Up Form */}
        {mode === 'signup' && (
          <form onSubmit={handleSignUp} className="p-6 space-y-4">
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

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Email Address *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Create Customer Account</span>
            </button>
          </form>
        )}

        {/* 3. Forgot Password Form */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Your Account Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2 disabled:opacity-60 shadow-xs cursor-pointer"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Send Reset Email</span>
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('signin');
                  setIsRateLimited(false);
                }}
                className="text-xs text-stone-600 hover:text-amber-800 font-medium"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* 4. Connect Supabase Database Form */}
        {mode === 'connect' && (
          <form onSubmit={handleConnectSupabase} className="p-6 space-y-4">
            <div className="p-3 rounded-lg bg-amber-50/70 border border-amber-200 text-xs text-amber-900 leading-relaxed">
              Connect your existing Supabase project to load your 4 categories, 29 menu items, and authenticate real customers.
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Supabase Project URL *
              </label>
              <input
                type="text"
                required
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Supabase Anon Public Key *
              </label>
              <textarea
                required
                rows={2}
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700 resize-none"
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Your public anon key from Supabase Project Settings → API.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-amber-800 hover:bg-amber-900 text-white font-medium text-sm rounded-md transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Connect Database & Continue</span>
            </button>
          </form>
        )}

        {/* Footer / Quick Demo Testing Option */}
        <div className="px-6 py-4 bg-stone-100/70 border-t border-stone-200 space-y-2">
          <div className="flex items-center justify-between text-xs text-stone-600">
            <span>Want to test quickly?</span>
            <button
              type="button"
              onClick={handleDemoSignIn}
              className="text-xs font-semibold text-amber-800 hover:text-amber-950 underline underline-offset-2 cursor-pointer"
            >
              Sign In with Demo Customer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
