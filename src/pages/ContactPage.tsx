import React, { useState } from 'react';
import { MapPin, Phone, Mail, Clock, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const ContactPage: React.FC = () => {
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryEmail, setInquiryEmail] = useState('');
  const [inquiryMessage, setInquiryMessage] = useState('');
  const [isSent, setIsSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSent(true);
    setTimeout(() => {
      setInquiryName('');
      setInquiryEmail('');
      setInquiryMessage('');
      setIsSent(false);
    }, 4000);
  };

  const mapLink = "https://maps.app.goo.gl/1avdeS748Y89CRVk8?g_st=ic";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-12 pb-24">
      {/* Header */}
      <div className="space-y-3">
        <span className="text-xs font-semibold text-amber-800 tracking-wider uppercase">
          Find Us & Reach Out
        </span>
        <h1 className="font-serif text-3xl sm:text-5xl font-bold tracking-tight text-stone-900">
          Visit Cafe Corner
        </h1>
        <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
          Whether you're stopping by for your morning brew, meeting friends, or placing an order, we're delighted to welcome you.
        </p>
      </div>

      {/* Grid: Contact Info & WhatsApp + Contact Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Info Column (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Contact Details Card */}
          <div className="bg-white rounded-xl border border-stone-200/90 p-6 space-y-6 shadow-xs">
            <h3 className="font-serif text-xl font-bold text-stone-900 border-b border-stone-100 pb-3">
              Cafe Information
            </h3>

            <div className="space-y-4 text-sm text-stone-600">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-stone-900 text-xs uppercase tracking-wider">
                    Our Location
                  </h4>
                  <p className="mt-0.5">
                    <a
                      href={mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-amber-800 transition-colors underline-offset-2 hover:underline"
                    >
                      Cafe corner, hiriyur 577598
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-stone-900 text-xs uppercase tracking-wider">
                    Telephone
                  </h4>
                  <p className="mt-0.5">
                    <a href="tel:8970428695" className="hover:text-amber-800 font-mono transition-colors">
                      8970428695
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-stone-900 text-xs uppercase tracking-wider">
                    Email Inquiries
                  </h4>
                  <p className="mt-0.5">
                    <a href="mailto:apoorvasupreeth24@gmail.com" className="hover:text-amber-800 transition-colors">
                      apoorvasupreeth24@gmail.com
                    </a>
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-stone-900 text-xs uppercase tracking-wider">
                    Operating Hours
                  </h4>
                  <p className="mt-0.5">Monday – Friday: 7:30 AM – 10:00 PM</p>
                  <p>Saturday – Sunday: 8:00 AM – 11:00 PM</p>
                </div>
              </div>
            </div>

            {/* Direct WhatsApp Chat Action */}
            <div className="pt-4 border-t border-stone-100">
              <a
                href="https://wa.me/918970428695?text=Hello%20Cafe%20Corner,%20I%20would%20like%20to%20inquire%20about%20my%20order"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-xs sm:text-sm rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Chat with us on WhatsApp</span>
              </a>
              <p className="text-[11px] text-stone-400 text-center mt-1.5">
                Instant support for custom orders & questions.
              </p>
            </div>
          </div>
        </div>

        {/* Message Form (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-stone-200/90 p-6 sm:p-8 space-y-6 shadow-xs">
          <div>
            <h3 className="font-serif text-2xl font-bold text-stone-900">
              Send Us a Message
            </h3>
            <p className="text-xs text-stone-500 mt-1">
              Have feedback on your order or questions? Reach out below.
            </p>
          </div>

          {isSent && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Thank you! Your message has been sent to Cafe Corner.</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Your Name *
                </label>
                <input
                  type="text"
                  required
                  value={inquiryName}
                  onChange={(e) => setInquiryName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inquiryEmail}
                  onChange={(e) => setInquiryEmail(e.target.value)}
                  placeholder="yourname@gmail.com"
                  className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider mb-1">
                Message *
              </label>
              <textarea
                required
                rows={4}
                value={inquiryMessage}
                onChange={(e) => setInquiryMessage(e.target.value)}
                placeholder="How can we help you today?"
                className="w-full p-3 text-sm bg-stone-50 border border-stone-300 rounded-md focus:outline-none focus:border-amber-700 focus:ring-1 focus:ring-amber-700"
              />
            </div>

            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-800 hover:bg-amber-900 text-white font-medium text-xs sm:text-sm rounded-md transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Send className="w-4 h-4" />
              <span>Send Message</span>
            </button>
          </form>
        </div>
      </div>

      {/* Google Maps Integration Embed */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="font-serif text-2xl font-bold text-stone-900">
              Interactive Location Map
            </h3>
            <p className="text-xs text-stone-500">
              Cafe corner, hiriyur 577598
            </p>
          </div>
          <a
            href={mapLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-amber-800 hover:text-amber-900 hover:underline underline-offset-2 inline-flex items-center gap-1"
          >
            <span>Open in Google Maps App</span>
            <span>→</span>
          </a>
        </div>

        <div className="w-full h-80 sm:h-96 rounded-2xl overflow-hidden border border-stone-200/90 shadow-md">
          <iframe
            title="Cafe Corner Hiriyur Location Map"
            src="https://maps.google.com/maps?q=Cafe+corner+hiriyur+577598&t=&z=15&ie=UTF8&iwloc=&output=embed"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={false}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </div>
    </div>
  );
};
