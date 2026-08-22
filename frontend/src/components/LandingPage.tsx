import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Store, 
  Sparkles, 
  QrCode, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Building2, 
  CheckCircle2, 
  ChefHat, 
  Send, 
  RotateCw,
  UtensilsCrossed
} from 'lucide-react';
import { API_BASE_URL } from '../config.js';

export function LandingPage() {
  const [formData, setFormData] = useState({
    restaurant_name: '',
    owner_name: '',
    email: '',
    phone: '',
    campus_name: '',
    city: '',
    daily_orders_capacity: 200
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitSuccess(null);
    setSubmitError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/partner/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSubmitSuccess(data.message || 'Registration submitted successfully!');
        setFormData({
          restaurant_name: '',
          owner_name: '',
          email: '',
          phone: '',
          campus_name: '',
          city: '',
          daily_orders_capacity: 200
        });
      } else {
        setSubmitError(data.error || 'Failed to submit registration. Please try again.');
      }
    } catch (err: any) {
      setSubmitError(err?.message || 'Connection to server failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-20 pb-16 animate-in">
      {/* Hero Section */}
      <section className="relative pt-6 md:pt-12 text-center max-w-4xl mx-auto flex flex-col items-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CampusBites for Restaurants & College Canteens</span>
        </div>

        <h1 className="font-headline-xl text-4xl sm:text-5xl md:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
          Empower Your Campus Food Outlet. <br className="hidden sm:block" />
          <span className="bg-gradient-to-r from-primary via-indigo-600 to-pink-600 bg-clip-text text-transparent">
            Zero Queue Rush.
          </span>
        </h1>

        <p className="font-body-lg text-slate-600 text-base sm:text-lg max-w-2xl leading-relaxed mb-8">
          Join the unified digital ordering network built exclusively for university dining halls, college canteens, and campus eateries. Faster counter dispatch, live kitchen queues, and instant QR verification.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="#register-section"
            className="px-8 py-4 rounded-full bg-primary text-white font-label-md text-sm font-bold shadow-xl shadow-indigo-500/25 hover:bg-primary-container hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <span>Register Your Canteen / Diner</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <Link
            to="/c/mithibai-main-campus"
            className="px-8 py-4 rounded-full bg-white/70 backdrop-blur-md border border-slate-200 text-slate-800 font-label-md text-sm font-bold shadow-sm hover:bg-white hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <UtensilsCrossed className="w-4 h-4 text-primary" />
            <span>View Mithibai Campus Menu</span>
          </Link>
        </div>
      </section>

      {/* Featured Campus Dining Hubs (Direct Links Testing Section) */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200/60 pb-4">
          <div>
            <span className="text-xs font-bold text-primary uppercase tracking-widest">Active Campus Outlets</span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Explore Live Campus Links</h2>
          </div>
          <p className="text-xs text-slate-500">Click any card below to test direct campus & diner URLs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Mithibai Main Campus Hub Card */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-xl shadow-indigo-500/5 flex flex-col justify-between group hover:border-primary/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 leading-tight">Mithibai Main Campus</h3>
                    <p className="text-xs text-slate-500">Vile Parle West, Mumbai · 4 Canteen Outlets</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  Campus Cluster
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Multi-outlet campus cluster with Canteen A (South Wing), Canteen B (Central Cafe), Canteen C (Terrace), and Canteen D (Pavilion).
              </p>

              {/* Sub-canteens pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {['Canteen A', 'Canteen B', 'Canteen C', 'Canteen D'].map((name) => (
                  <span key={name} className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-slate-400">/c/mithibai-main-campus</span>
              <Link
                to="/c/mithibai-main-campus"
                className="px-5 py-2.5 rounded-full bg-primary text-white text-xs font-bold flex items-center gap-1.5 shadow-md group-hover:bg-indigo-700 transition-all"
              >
                <span>Open Campus Hub</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Standalone Gourmet Diner Card */}
          <div className="bg-white/70 backdrop-blur-xl border border-white/80 rounded-3xl p-6 shadow-xl shadow-indigo-500/5 flex flex-col justify-between group hover:border-primary/40 transition-all">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 leading-tight">Downtown Gourmet Diner</h3>
                    <p className="text-xs text-slate-500">Standalone Restaurant · Custom Kitchen</p>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
                  Single Diner
                </span>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Standalone diner model with uncluttered UI: canteen selector dropdown is completely hidden, loading directly into the diner's signature offerings.
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                <span className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                  ✓ Selector Hidden Automatically
                </span>
                <span className="px-3 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                  QR Counter Pickup
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs font-mono font-medium text-slate-400">/c/downtown-diner</span>
              <Link
                to="/c/downtown-diner"
                className="px-5 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-black transition-all"
              >
                <span>Open Diner Menu</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Bento Grid */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold text-primary uppercase tracking-widest">Built For Campus Speed</span>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Why Campus Food Outlets Choose CampusBites</h2>
          <p className="text-sm text-slate-600">Solve the 20-minute break rush with purpose-built university dining tools.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/60 backdrop-blur-md border border-white/80 p-6 rounded-3xl shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">3-Digit Visual Queue Token</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kitchen staff call simple tokens like <code>#042</code> on TV boards. No SMS delays or poor cell connectivity friction.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/80 p-6 rounded-3xl shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">In-Browser Camera QR Scanner</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Staff scan student phones using their existing phone camera or laptop webcam to instantly verify and complete pickups.
            </p>
          </div>

          <div className="bg-white/60 backdrop-blur-md border border-white/80 p-6 rounded-3xl shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-base text-slate-900">HMAC Cryptographic Security</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Tamper-proof HMAC SHA-256 signatures prevent students from sharing old screenshots or claiming unauthorized meals.
            </p>
          </div>
        </div>
      </section>

      {/* Restaurant / Canteen Onboarding Form Section */}
      <section id="register-section" className="scroll-mt-24 max-w-3xl mx-auto w-full">
        <div className="bg-white/90 backdrop-blur-2xl border border-white rounded-[2.5rem] p-8 sm:p-12 shadow-2xl shadow-indigo-500/10 space-y-8">
          <div className="space-y-2 text-center">
            <div className="w-12 h-12 rounded-2xl bg-primary text-white mx-auto flex items-center justify-center shadow-lg">
              <ChefHat className="w-6 h-6" />
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Partner With CampusBites</h2>
            <p className="text-sm text-slate-600">Register your college canteen, campus diner, or food court for digital ordering.</p>
          </div>

          {submitSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-semibold flex items-center gap-3 animate-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{submitSuccess}</span>
            </div>
          )}

          {submitError && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-sm font-semibold flex items-center gap-3 animate-in">
              <span className="material-symbols-outlined text-rose-600 shrink-0">error</span>
              <span>{submitError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Restaurant / Canteen Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mithibai South Wing Cafe"
                  value={formData.restaurant_name}
                  onChange={(e) => setFormData({ ...formData, restaurant_name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Owner / Manager Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rajesh Mehta"
                  value={formData.owner_name}
                  onChange={(e) => setFormData({ ...formData, owner_name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Work Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. canteen@mithibai.edu"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Phone / WhatsApp Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. +91 98201 12345"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              <div className="sm:col-span-2 space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">College / Campus Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Mithibai College of Arts & Commerce"
                  value={formData.campus_name}
                  onChange={(e) => setFormData({ ...formData, campus_name: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">City</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-primary text-white font-label-md text-sm font-bold shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isSubmitting ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Submitting Onboarding Application...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit Partner Registration Application</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-slate-400">
              Our campus integration specialists will set up your menu & staff portal within 24 hours.
            </p>
          </form>
        </div>
      </section>
    </div>
  );
}
