import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  Building2,
  Store, 
  ChefHat, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  Mail, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ChevronDown,
  KeyRound,
  X
} from 'lucide-react';
import { API_BASE_URL } from '../config.js';

interface Canteen {
  id: string;
  name: string;
  slug: string;
  group_name?: string;
  group_slug?: string;
  description?: string;
  image?: string;
}

interface CampusGroup {
  name: string;
  slug: string;
  canteens: Canteen[];
}

export function StaffLogin() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const queryCanteen = searchParams.get('canteen') || searchParams.get('campus') || slug;

  const [activeTab, setActiveTab] = useState<'cook' | 'manager'>('cook');
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  
  // Hierarchical Campus -> Canteen Selection
  const [selectedCampus, setSelectedCampus] = useState<CampusGroup | null>(null);
  const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null);
  const [isCampusDropdownOpen, setIsCampusDropdownOpen] = useState(false);
  const [isCanteenDropdownOpen, setIsCanteenDropdownOpen] = useState(false);

  // Cook Mode Alphanumeric Passcode state
  const [pin, setPin] = useState('');
  const [showCookPin, setShowCookPin] = useState(false);

  // Store Manager Mode Credentials
  const [managerEmail, setManagerEmail] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Group canteens by Campus / Group
  const campusGroups = useMemo(() => {
    const map = new Map<string, CampusGroup>();
    canteens.forEach(c => {
      const campusName = c.group_name || c.name || 'Individual Campus / Diner';
      const campusSlug = c.group_slug || c.slug || 'campus';
      if (!map.has(campusSlug)) {
        map.set(campusSlug, {
          name: campusName,
          slug: campusSlug,
          canteens: []
        });
      }
      map.get(campusSlug)!.canteens.push(c);
    });
    return Array.from(map.values());
  }, [canteens]);

  // 1. Fetch available outlets and initialize selection
  useEffect(() => {
    async function loadCanteens() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/canteens`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCanteens(data);

          // Build initial groups
          const map = new Map<string, CampusGroup>();
          data.forEach(c => {
            const campusName = c.group_name || c.name || 'Individual Campus / Diner';
            const campusSlug = c.group_slug || c.slug || 'campus';
            if (!map.has(campusSlug)) {
              map.set(campusSlug, {
                name: campusName,
                slug: campusSlug,
                canteens: []
              });
            }
            map.get(campusSlug)!.canteens.push(c);
          });
          const groups = Array.from(map.values());

          if (queryCanteen) {
            const matchedCanteen = data.find(
              c => c.slug === queryCanteen || c.id === queryCanteen || c.group_slug === queryCanteen
            );
            if (matchedCanteen) {
              const matchedGroup = groups.find(g => g.canteens.some(ct => ct.id === matchedCanteen.id)) || groups[0];
              setSelectedCampus(matchedGroup);
              setSelectedCanteen(matchedCanteen);
              return;
            }
          }
          if (groups.length > 0) {
            setSelectedCampus(groups[0]);
            setSelectedCanteen(groups[0].canteens[0] || null);
          }
        }
      } catch (err) {
        console.error('Failed to load canteens', err);
      }
    }
    loadCanteens();
  }, [queryCanteen]);

  // Handle Login submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let payload: any = {};

    if (activeTab === 'cook') {
      if (!selectedCanteen) {
        setError('Please select your campus and canteen outlet');
        return;
      }
      if (!pin || pin.trim().length < 3) {
        setError('Please enter your alphanumeric kitchen passcode');
        return;
      }
      payload = {
        canteen_id: selectedCanteen.id,
        canteen_slug: selectedCanteen.slug,
        pin: pin.trim(),
        role: 'cook'
      };
    } else {
      if (!managerEmail || !managerPassword) {
        setError('Please enter your Store Manager email & password');
        return;
      }
      payload = {
        email: managerEmail.trim(),
        password: managerPassword
      };
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Please check your passcode/credentials.');
      }

      if (data.token) {
        localStorage.setItem('staffToken', data.token);
        navigate('/staff');
      } else {
        throw new Error('No authentication token returned from server.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-6 px-4">
      {/* Outer Shell: Double-Bezel Hardware Enclosure */}
      <div className="w-full max-w-md bg-slate-100/90 dark:bg-slate-900/90 p-2 sm:p-2.5 rounded-[2.5rem] shadow-2xl ring-1 ring-slate-200/80 backdrop-blur-2xl transition-all duration-500">
        
        {/* Inner Core: Concentric Content Container */}
        <div className="bg-white rounded-[calc(2.5rem-0.625rem)] p-6 sm:p-8 shadow-[inset_0_1px_1px_rgba(255,255,255,0.8)] border border-slate-100">
          
          {/* Header Title & Eyebrow */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100/80 text-[10px] font-bold text-indigo-700 uppercase tracking-[0.18em] mb-2.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-indigo-600 animate-pulse" />
              <span>CampusBites Staff Terminal</span>
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Shop Portal Login</h2>
            <p className="text-xs text-slate-500 mt-1 font-medium">
              Kitchen Display, Delivery & Store Manager Gateway
            </p>
          </div>

          {/* Segmented Dual-Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 p-1.5 bg-slate-100/90 rounded-2xl mb-6 border border-slate-200/60">
            <button
              type="button"
              onClick={() => { setActiveTab('cook'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-300 ${
                activeTab === 'cook'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ChefHat className="w-4 h-4" />
              <span>Cook / Delivery</span>
            </button>

            <button
              type="button"
              onClick={() => { setActiveTab('manager'); setError(''); }}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-black transition-all duration-300 ${
                activeTab === 'manager'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Store Manager</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-start gap-2.5 text-rose-700 text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="leading-tight">{error}</div>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* HIERARCHICAL CAMPUS -> CANTEEN SELECTOR (For Kitchen Cooks) */}
            {activeTab === 'cook' && (
              <div className="space-y-3.5">
                
                {/* 1. SELECT COLLEGE / CAMPUS */}
                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    1. Select College / Campus
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCampusDropdownOpen(prev => !prev);
                      setIsCanteenDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-black text-slate-900 truncate">
                          {selectedCampus?.name || 'Choose College / Campus'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {selectedCampus?.canteens.length 
                            ? `${selectedCampus.canteens.length} Outlet${selectedCampus.canteens.length > 1 ? 's' : ''} available` 
                            : 'Select campus'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCampusDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Campus Dropdown Menu */}
                  {isCampusDropdownOpen && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-40 max-h-48 overflow-y-auto p-1.5 space-y-1">
                      {campusGroups.map(campus => (
                        <button
                          key={campus.slug}
                          type="button"
                          onClick={() => {
                            setSelectedCampus(campus);
                            setSelectedCanteen(campus.canteens[0] || null);
                            setIsCampusDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                            selectedCampus?.slug === campus.slug 
                              ? 'bg-indigo-50 text-indigo-700' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="truncate">
                            <span className="block truncate">{campus.name}</span>
                            <span className="text-[10px] font-normal text-slate-400">
                              {campus.canteens.length} outlet{campus.canteens.length > 1 ? 's' : ''}
                            </span>
                          </div>
                          {selectedCampus?.slug === campus.slug && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. SELECT CANTEEN / OUTLET (Under Selected Campus) */}
                <div className="space-y-1.5 relative">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    2. Select Canteen / Kitchen Outlet
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCanteenDropdownOpen(prev => !prev);
                      setIsCampusDropdownOpen(false);
                    }}
                    className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3 truncate">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-black text-slate-900 truncate">
                          {selectedCanteen?.name || 'Choose Canteen'}
                        </p>
                        <p className="text-[10px] text-slate-500 font-medium truncate">
                          {selectedCampus?.name || 'Assigned Diner'}
                        </p>
                      </div>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCanteenDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Canteen Dropdown Menu (Filtered to Selected Campus) */}
                  {isCanteenDropdownOpen && selectedCampus && (
                    <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-48 overflow-y-auto p-1.5 space-y-1">
                      {selectedCampus.canteens.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setSelectedCanteen(c);
                            setIsCanteenDropdownOpen(false);
                          }}
                          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs font-bold transition-all ${
                            selectedCanteen?.id === c.id 
                              ? 'bg-indigo-50 text-indigo-700' 
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <span className="truncate">{c.name}</span>
                          {selectedCanteen?.id === c.id && <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB 1: COOK & DELIVERY ALPHANUMERIC PASSCODE */}
            {activeTab === 'cook' && (
              <div className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                      Kitchen / Delivery Passcode
                    </label>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      Alphanumeric (e.g. CHEF50, DELIV1)
                    </span>
                  </div>
                  
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showCookPin ? 'text' : 'password'}
                      required
                      autoComplete="off"
                      placeholder="Enter Passcode (e.g. CHEF50 or DELIV1)"
                      value={pin}
                      onChange={e => setPin(e.target.value)}
                      className="w-full pl-10 pr-20 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono font-black text-slate-900 tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all placeholder:text-xs placeholder:font-sans placeholder:font-normal placeholder:tracking-normal"
                    />
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {pin && (
                        <button
                          type="button"
                          onClick={() => setPin('')}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-all"
                          title="Clear passcode"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setShowCookPin(p => !p)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-all"
                      >
                        {showCookPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium pt-0.5">
                    Supports passcodes for kitchen cooks and delivery staff.
                  </p>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading || pin.trim().length < 3}
                  className="w-full mt-2 py-3.5 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                >
                  <span>{isLoading ? 'Verifying Passcode...' : 'Enter Orders & Kitchen Terminal'}</span>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
            )}

            {/* TAB 2: STORE MANAGER EMAIL & PASSWORD */}
            {activeTab === 'manager' && (
              <div className="space-y-4">
                {/* Email Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Manager Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="manager@heritage50.com"
                      value={managerEmail}
                      onChange={e => setManagerEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                  </div>
                </div>

                {/* Password Input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••••••"
                      value={managerPassword}
                      onChange={e => setManagerPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(p => !p)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Action Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3.5 px-6 rounded-full bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-slate-900/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
                >
                  <span>{isLoading ? 'Verifying Credentials...' : 'Sign In as Store Manager'}</span>
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              </div>
            )}

          </form>

          {/* Footer Link to Super Admin Portal */}
          <div className="mt-8 pt-5 border-t border-slate-100 text-center">
            <Link
              to="/admin/login"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <span>Platform Owner? Open Super Admin Command Center</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
