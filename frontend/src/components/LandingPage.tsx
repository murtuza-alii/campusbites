import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';
import { 
  Store, 
  Sparkles, 
  Clock, 
  ShieldCheck, 
  ArrowRight, 
  Building2, 
  CheckCircle2, 
  ChefHat, 
  Send, 
  RotateCw, 
  UtensilsCrossed, 
  Copy, 
  Check, 
  Smartphone, 
  Flame, 
  CheckCheck,
  PackageCheck,
  Mail,
  Phone,
  Shield
} from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';
import { ShinyBadge, ShinyText } from './ui/ShinyText';
import { HeroChip } from './ui/HeroUIComponents';
import { API_BASE_URL } from '../config.js';

// Register GSAP plugins
gsap.registerPlugin(useGSAP);

export function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  
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
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  // Copy helper
  const handleCopyLink = (slug: string) => {
    const fullUrl = `${window.location.origin}/c/${slug}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  };

  // GSAP Animations with useGSAP hook (rock-solid, non-blocking)
  useGSAP(() => {
    // 1. Hero Entrance Timeline (plays cleanly on mount)
    const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    tl.fromTo('.gsap-hero-pill', 
      { y: -15, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.6 }
    )
    .fromTo('.gsap-hero-h1', 
      { y: 25, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.8 }, 
      '-=0.3'
    )
    .fromTo('.gsap-hero-sub', 
      { y: 15, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.6 }, 
      '-=0.4'
    )
    .fromTo('.gsap-hero-cta', 
      { y: 15, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.6, stagger: 0.1 }, 
      '-=0.3'
    )
    .fromTo('.gsap-floating-token', 
      { scale: 0.95, opacity: 0 }, 
      { scale: 1, opacity: 1, duration: 0.6 }, 
      '-=0.2'
    );

    // 2. Subtle token card float physics
    gsap.to('.gsap-floating-token', {
      y: -6,
      duration: 2.2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });

  }, { scope: containerRef });

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
    <div ref={containerRef} className="flex-1 flex flex-col gap-20 sm:gap-28 pb-20 overflow-x-hidden w-full max-w-full">
      
      {/* 1. HERO SECTION (Attention) */}
      <section className="relative pt-6 sm:pt-12 text-center max-w-5xl mx-auto flex flex-col items-center">
        
        {/* ReactBits / MagicUI Eyebrow badge */}
        <div className="gsap-hero-pill mb-6">
          <ShinyBadge>
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>CAMPUS FOOD TECH PLATFORM</span>
          </ShinyBadge>
        </div>

        {/* 2-Line Iron Rule Headline */}
        <h1 className="gsap-hero-h1 font-black text-4xl sm:text-5xl md:text-6xl lg:text-7xl text-slate-950 tracking-tight leading-[1.08] mb-6 max-w-4xl">
          Empower Your Campus Food Outlet.{' '}
          <ShinyText className="font-black">
            Zero Queue Rush.
          </ShinyText>
        </h1>

        {/* Subtext */}
        <p className="gsap-hero-sub text-slate-600 text-base sm:text-lg md:text-xl max-w-2xl leading-relaxed mb-8 sm:mb-10">
          The unified digital ordering ecosystem designed for university food courts, canteens, and campus eateries. Faster kitchen dispatch, live queue tokens, and instant cashless checkout.
        </p>

        {/* Dual High-Contrast CTAs */}
        <div className="gsap-hero-cta flex flex-wrap items-center justify-center gap-4 mb-10 sm:mb-12">
          <a
            href="#register-section"
            className="px-8 py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-lg shadow-indigo-600/25 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <span>Register Your Canteen / Diner</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <Link
            to="/c/mithibai-main-campus"
            className="px-8 py-4 rounded-2xl bg-white border border-slate-300/90 text-slate-800 font-bold text-sm shadow-sm hover:bg-slate-50 hover:border-slate-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <UtensilsCrossed className="w-4 h-4 text-orange-600" />
            <span>View Mithibai Campus Menu</span>
          </Link>
        </div>

        {/* Floating Live Verification Token Teaser Card with Spotlight Physics */}
        <SpotlightCard className="gsap-floating-token w-full max-w-md p-5 shadow-xl shadow-slate-200/50 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-mono font-black text-lg border border-emerald-200">
              #042
            </div>
            <div className="text-left">
              <div className="flex items-center gap-1.5 mb-0.5">
                <HeroChip variant="success" size="sm" dot>
                  Ready For Pickup
                </HeroChip>
              </div>
              <p className="font-bold text-sm text-slate-900 leading-tight">Paneer Tikka Roll × 2</p>
              <p className="text-[11px] text-slate-500">Mithibai South Wing · Token Verified</p>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <Sparkles className="w-5 h-5" />
          </div>
        </SpotlightCard>
      </section>

      {/* 2. FEATURED CAMPUS DINING HUBS (Desire / Live Showcase) */}
      <section className="space-y-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200/90 pb-4">
          <div>
            <span className="text-xs font-mono font-bold text-orange-600 uppercase tracking-wider">Live Deployments</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight mt-1">Active Campus Outlets & Diners</h2>
          </div>
          <p className="text-xs text-slate-500">Click any outlet card to test live direct campus URLs</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Card 1: Mithibai Main Campus Hub */}
          <SpotlightCard className="p-7 shadow-lg shadow-slate-200/40 flex flex-col justify-between group hover:border-indigo-600/40 hover:shadow-xl transition-all duration-300">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold border border-indigo-100">
                    <Building2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900 leading-tight">Mithibai Main Campus</h3>
                    <p className="text-xs text-slate-500">Vile Parle West, Mumbai · 4 Canteens</p>
                  </div>
                </div>
                <HeroChip variant="success" size="sm">
                  Campus Hub
                </HeroChip>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Multi-canteen cluster featuring Canteen A (South Wing), Canteen B (Central Cafe), Canteen C (Terrace), and Canteen D (Pavilion).
              </p>

              {/* Sub-canteens pills */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['Canteen A', 'Canteen B', 'Canteen C', 'Canteen D'].map((name) => (
                  <span key={name} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                    {name}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 mt-6">
              <button
                type="button"
                onClick={() => handleCopyLink('mithibai-main-campus')}
                className="text-xs font-mono font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
                title="Copy student link"
              >
                {copiedSlug === 'mithibai-main-campus' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>/c/mithibai-main-campus</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <Link
                  to="/c/mithibai-main-campus/staff/login"
                  className="px-3.5 py-2.5 rounded-full border border-indigo-200 text-indigo-700 bg-indigo-50/50 hover:bg-indigo-100 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                  title="Staff & Kitchen Terminal for Mithibai Campus"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Staff Login</span>
                </Link>
                <Link
                  to="/c/mithibai-main-campus"
                  className="px-4 py-2.5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-indigo-700 transition-all active:scale-95"
                >
                  <span>Student Menu</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </SpotlightCard>

          {/* Card 2: Standalone Gourmet Diner */}
          <SpotlightCard className="p-7 shadow-lg shadow-slate-200/40 flex flex-col justify-between group hover:border-orange-500/40 hover:shadow-xl transition-all duration-300">
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-100">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black text-lg text-slate-900 leading-tight">Downtown Gourmet Diner</h3>
                    <p className="text-xs text-slate-500">Standalone Restaurant · Custom Kitchen</p>
                  </div>
                </div>
                <HeroChip variant="primary" size="sm">
                  Single Diner
                </HeroChip>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Standalone diner model with uncluttered UI: the top canteen selector is automatically hidden, routing students straight to fresh gourmet orders.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">
                  ✓ Selector Hidden Automatically
                </span>
                <span className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-700">
                  QR Counter Pickup
                </span>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 mt-6">
              <button
                type="button"
                onClick={() => handleCopyLink('downtown-diner')}
                className="text-xs font-mono font-medium text-slate-500 hover:text-orange-600 flex items-center gap-1.5 transition-colors"
                title="Copy student link"
              >
                {copiedSlug === 'downtown-diner' ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-600 font-bold">Copied Link!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>/c/downtown-diner</span>
                  </>
                )}
              </button>

              <div className="flex items-center gap-2">
                <Link
                  to="/c/downtown-diner/staff/login"
                  className="px-3.5 py-2.5 rounded-full border border-amber-200 text-amber-800 bg-amber-50/50 hover:bg-amber-100 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95"
                  title="Staff & Kitchen Terminal for Downtown Diner"
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Staff Login</span>
                </Link>
                <Link
                  to="/c/downtown-diner"
                  className="px-4 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center gap-1.5 shadow-md hover:bg-black transition-all active:scale-95"
                >
                  <span>Student Menu</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </SpotlightCard>
        </div>
      </section>

      {/* 3. PLATFORM FEATURES GAPLESS BENTO GRID (Interest) */}
      <section className="space-y-8 max-w-5xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-mono font-bold text-orange-600 uppercase tracking-wider">Campus Engineering</span>
          <h2 className="text-3xl font-black text-slate-950 tracking-tight">Engineered For 15-Minute College Breaks</h2>
          <p className="text-sm text-slate-600">Zero phone app downloads. Zero hardware overhead. Maximum counter throughput.</p>
        </div>

        {/* Gapless Interlocking Dense Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 grid-flow-dense">
          
          {/* Bento Cell 1: 3-Digit Token Engine (col-span-2) */}
          <SpotlightCard className="md:col-span-2 bg-gradient-to-br from-white to-orange-50/30 p-8 shadow-lg shadow-slate-200/40 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-md shadow-orange-600/20">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">3-Digit Visual Queue Tokens</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-lg">
                Students receive short, bold tokens like <code>#042</code>. Staff can call tokens on TV screens or counter boards without relying on congested cellular SMS gateways during peak lunchtime breaks.
              </p>
            </div>

            <div className="pt-6 flex flex-wrap gap-2">
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-orange-800 shadow-sm border border-orange-200/80">
                ⚡ 3.2s Average Pickup Time
              </span>
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-emerald-800 shadow-sm border border-emerald-200/80">
                ✓ No SMS Gateway Delays
              </span>
            </div>
          </SpotlightCard>

          {/* Bento Cell 2: 1-Tap Counter Handover & PIN Verification (col-span-1) */}
          <SpotlightCard className="md:col-span-1 p-8 shadow-lg shadow-slate-200/40 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold border border-emerald-100">
                <PackageCheck className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">1-Tap Counter Handover</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Fulfill orders instantly with one tap or 4-digit counter PIN verification. Zero handheld hardware or scanning bottlenecks.
              </p>
            </div>

            <div className="pt-4">
              <HeroChip variant="success" size="sm">
                <Smartphone className="w-3 h-3 text-emerald-600" />
                <span>Any Phone / Tablet</span>
              </HeroChip>
            </div>
          </SpotlightCard>

          {/* Bento Cell 3: HMAC Security (col-span-1) */}
          <SpotlightCard className="md:col-span-1 p-8 shadow-lg shadow-slate-200/40 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold border border-indigo-100">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">HMAC SHA-256 Signed</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Cryptographic digital signatures prevent screenshot fraud, forged order IDs, and duplicate meal redemptions.
              </p>
            </div>

            <div className="pt-4">
              <HeroChip variant="primary" size="sm">
                <CheckCheck className="w-3 h-3 text-indigo-600" />
                <span>100% Tamper Proof</span>
              </HeroChip>
            </div>
          </SpotlightCard>

          {/* Bento Cell 4: Custom Clean Slug URLs (col-span-2) */}
          <SpotlightCard className="md:col-span-2 bg-gradient-to-br from-white to-indigo-50/30 p-8 shadow-lg shadow-slate-200/40 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20">
                <Flame className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-900">Custom Table QR Posters & Clean URLs</h3>
              <p className="text-xs text-slate-600 leading-relaxed max-w-lg">
                Generate simple print-ready QR codes for dining tables: <code>campusbites.com/c/mithibai-main-campus</code>. Students scan to view the live kitchen menu immediately without needing to install an app.
              </p>
            </div>

            <div className="pt-4 flex items-center gap-2">
              <span className="px-3 py-1 rounded-xl text-xs font-mono font-bold bg-white text-slate-800 shadow-sm border border-slate-200">
                Zero App Downloads Required
              </span>
            </div>
          </SpotlightCard>

        </div>
      </section>

      {/* 4. RESTAURANT ONBOARDING FORM SECTION (Action) */}
      <section id="register-section" className="scroll-mt-24 max-w-3xl mx-auto w-full">
        <div className="bg-white border border-slate-200/90 rounded-[2.5rem] p-8 sm:p-12 shadow-xl shadow-slate-200/50 space-y-8">
          <div className="space-y-2 text-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white mx-auto flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <ChefHat className="w-7 h-7" />
            </div>
            <h2 className="text-3xl font-black text-slate-950 tracking-tight">Partner With CampusBites</h2>
            <p className="text-sm text-slate-600">Register your college canteen, diner, or university food outlet for digital ordering.</p>
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
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
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
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
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
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
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
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
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
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">City</label>
                <input
                  type="text"
                  placeholder="e.g. Mumbai"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 rounded-2xl bg-indigo-600 text-white font-bold text-sm shadow-xl shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-4"
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
              Our campus onboarding team will provision your kitchen portal and custom QR link within 24 hours.
            </p>
          </form>
        </div>
      </section>

      {/* 5. LEGAL ENTITY & COMPLIANCE SECTION (Direct Verification for Payment Aggregators) */}
      <section className="max-w-4xl mx-auto w-full">
        <SpotlightCard className="p-6 sm:p-8 bg-white border border-slate-200/90 rounded-3xl shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-indigo-600 uppercase tracking-wider mb-1">
                <Shield className="w-3.5 h-3.5" />
                <span>Legal Entity & Operator Details</span>
              </div>
              <h3 className="text-lg font-black text-slate-900">CampusBites Platform Operator Information</h3>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Verified Merchant
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Legal Entity / Proprietor</span>
              <p className="font-bold text-slate-900 text-sm">MURTUZA ALI</p>
              <p className="text-[11px] text-slate-500">Sole Proprietor · CampusBites</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Official Contact Email</span>
              <p className="font-bold text-indigo-600 text-sm">
                <a href="mailto:murtuzaali17th@gmail.com" className="hover:underline flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  murtuzaali17th@gmail.com
                </a>
              </p>
              <p className="text-[11px] text-slate-500">Support & Grievances</p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Official Phone / WhatsApp</span>
              <p className="font-bold text-slate-900 text-sm">
                <a href="tel:+918432123450" className="hover:underline flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  +91 8432123450
                </a>
              </p>
              <p className="text-[11px] text-slate-500">Mon - Sat · 8:30 AM to 7:30 PM</p>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
            <p>For detailed terms, privacy, refunds, and delivery guidelines:</p>
            <div className="flex items-center gap-3 font-semibold text-indigo-600">
              <Link to="/terms" className="hover:underline">Terms of Service</Link>
              <span>·</span>
              <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
              <span>·</span>
              <Link to="/refund-policy" className="hover:underline">Refund Policy</Link>
              <span>·</span>
              <Link to="/shipping-policy" className="hover:underline">Shipping & Delivery</Link>
              <span>·</span>
              <Link to="/contact" className="hover:underline">Contact Us</Link>
            </div>
          </div>
        </SpotlightCard>
      </section>
    </div>
  );
}
