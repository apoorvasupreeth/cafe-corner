import React, { useState } from 'react';
import { Database, X, ArrowRight } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

interface SupabaseNoticeBannerProps {
  onOpenConnect?: () => void;
}

export const SupabaseNoticeBanner: React.FC<SupabaseNoticeBannerProps> = ({ onOpenConnect }) => {
  const [dismissed, setDismissed] = useState(false);

  if (isSupabaseConfigured || dismissed) {
    return null;
  }

  return (
    <div className="bg-amber-950 text-amber-100 border-b border-amber-800/60 px-4 py-2.5 transition-all text-xs sm:text-sm">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <Database className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            <strong className="font-semibold text-amber-200">Supabase Connection:</strong>{' '}
            Set <code className="bg-amber-900/80 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">VITE_SUPABASE_URL</code> &{' '}
            <code className="bg-amber-900/80 px-1.5 py-0.5 rounded text-amber-300 font-mono text-xs">VITE_SUPABASE_ANON_KEY</code> or connect directly.
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {onOpenConnect && (
            <button
              onClick={onOpenConnect}
              className="px-2.5 py-1 bg-amber-800 hover:bg-amber-700 text-white rounded text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer"
            >
              <span>Connect Project</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-300 hover:text-white p-1 shrink-0 rounded transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
