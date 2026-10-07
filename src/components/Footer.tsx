import React from 'react';
import { Link } from 'react-router-dom';
import { Coffee, MapPin, Phone, Mail, Clock } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-stone-900 text-stone-300 pt-16 pb-12 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-12 border-b border-stone-800">
          {/* Brand */}
          <div className="md:col-span-1 space-y-4">
            <Link to="/" className="font-serif text-2xl font-bold tracking-tight text-amber-100 flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-amber-700 text-stone-950 flex items-center justify-center">
                <Coffee className="w-4 h-4" />
              </span>
              Cafe Corner
            </Link>
          </div>

          {/* Quick Navigation */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider text-amber-100 uppercase">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm text-stone-400">
              <li>
                <Link to="/menu" className="hover:text-amber-200 transition-colors">
                  Explore Menu
                </Link>
              </li>
              <li>
                <Link to="/orders" className="hover:text-amber-200 transition-colors">
                  My Orders & Tracking
                </Link>
              </li>
              <li>
                <Link to="/profile" className="hover:text-amber-200 transition-colors">
                  Customer Profile
                </Link>
              </li>
              <li>
                <Link to="/contact" className="hover:text-amber-200 transition-colors">
                  Location & Map
                </Link>
              </li>
            </ul>
          </div>

          {/* Working Hours */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider text-amber-100 uppercase flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              Hours
            </h4>
            <div className="text-sm text-stone-400 space-y-1.5">
              <p><span className="text-stone-300 font-medium">Mon - Fri:</span> 7:30 AM – 10:00 PM</p>
              <p><span className="text-stone-300 font-medium">Saturday:</span> 8:00 AM – 11:00 PM</p>
              <p><span className="text-stone-300 font-medium">Sunday:</span> 8:00 AM – 10:00 PM</p>
              <p className="text-xs text-stone-500 pt-2">Kitchen orders close 30 minutes before shut-down.</p>
            </div>
          </div>

          {/* Contact Details (Visit Us) */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold tracking-wider text-amber-100 uppercase">
              Visit Us
            </h4>
            <div className="text-sm text-stone-400 space-y-2.5">
              <p className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <a
                  href="https://maps.app.goo.gl/1avdeS748Y89CRVk8?g_st=ic"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-200 transition-colors"
                >
                  Cafe corner, hiriyur 577598
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-amber-600 shrink-0" />
                <a href="tel:8970428695" className="hover:text-amber-200 transition-colors font-mono">
                  8970428695
                </a>
              </p>
              <p className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-amber-600 shrink-0" />
                <a href="mailto:apoorvasupreeth24@gmail.com" className="hover:text-amber-200 transition-colors">
                  apoorvasupreeth24@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} Cafe Corner. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span>Powered by Supabase & Razorpay Architecture</span>
            <span>·</span>
            <span>Handcrafted with Care</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
