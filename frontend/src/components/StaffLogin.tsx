import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  Building2,
  Store, 
  ChefHat, 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  User,
  Eye, 
  EyeOff, 
  CheckCircle2, 
  AlertCircle, 
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

  // Store Manager Mode Credentials (Username + Password)
  const [managerUsername, setManagerUsername] = useState('');
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
      if (!managerUsername || !managerPassword) {
        setError('Please enter your Outlet Manager username & password');
        return;
      }
      payload = {
        username: managerUsername.trim(),
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
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4">
      {/* High-Density Double-Bezel Card */}
      <div className="w-full max-w-sm bg-white border border-slate-200/90 rounded-lg p-4 shadow-2xs space-y-3">
        
        {/* Header Title */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>Staff Terminal</span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Outlet Portal Login</h2>
          <p className="text-[11px] text-slate-500">
            Kitchen Display, Delivery & Store Manager Gateway
          </p>
        </div>

        {/* Segmented Dual-Tab Switcher */}
        <div className="inline-flex w-full p-0.5 bg-slate-200/70 rounded-lg select-none">
          <button
            type="button"
            onClick={() => { setActiveTab('cook'); setError(''); }}
            className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 active:scale-[0.98] ${
              activeTab === 'cook'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChefHat className={`w-3 h-3 ${activeTab === 'cook' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Cook / Delivery</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('manager'); setError(''); }}
            className={`flex-1 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1 active:scale-[0.98] ${
              activeTab === 'manager'
                ? 'bg-white text-slate-900 shadow-2xs font-bold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className={`w-3 h-3 ${activeTab === 'manager' ? 'text-indigo-600' : 'text-slate-400'}`} />
            <span>Store Manager</span>
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="space-y-2.5">
          
          {/* HIERARCHICAL CAMPUS -> CANTEEN SELECTOR (For Kitchen Cooks) */}
          {activeTab === 'cook' && (
            <div className="space-y-2">
              
              {/* 1. SELECT COLLEGE / CAMPUS */}
              <div className="space-y-0.5 relative">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  1. College / Campus
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCampusDropdownOpen(prev => !prev);
                    setIsCanteenDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-left transition-all active:scale-[0.99] h-8"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span className="text-[11px] font-medium text-slate-900 truncate">
                      {selectedCampus?.name || 'Choose College / Campus'}
                    </span>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isCampusDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Campus Dropdown Menu */}
                {isCampusDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-40 max-h-40 overflow-y-auto p-1 space-y-0.5">
                    {campusGroups.map(campus => (
                      <button
                        key={campus.slug}
                        type="button"
                        onClick={() => {
                          setSelectedCampus(campus);
                          setSelectedCanteen(campus.canteens[0] || null);
                          setIsCampusDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] font-medium transition-colors ${
                          selectedCampus?.slug === campus.slug 
                            ? 'bg-indigo-50 text-indigo-700 font-bold' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{campus.name}</span>
                        {selectedCampus?.slug === campus.slug && <CheckCircle2 className="w-3 h-3 text-indigo-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. SELECT CANTEEN / OUTLET */}
              <div className="space-y-0.5 relative">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  2. Canteen / Outlet
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCanteenDropdownOpen(prev => !prev);
                    setIsCampusDropdownOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md text-left transition-all active:scale-[0.99] h-8"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span className="text-[11px] font-medium text-slate-900 truncate">
                      {selectedCanteen?.name || 'Choose Canteen'}
                    </span>
                  </div>
                  <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${isCanteenDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Canteen Dropdown Menu */}
                {isCanteenDropdownOpen && selectedCampus && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-30 max-h-40 overflow-y-auto p-1 space-y-0.5">
                    {selectedCampus.canteens.map(c => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setSelectedCanteen(c);
                          setIsCanteenDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1 rounded text-left text-[11px] font-medium transition-colors ${
                          selectedCanteen?.id === c.id 
                            ? 'bg-indigo-50 text-indigo-700 font-bold' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <span className="truncate">{c.name}</span>
                        {selectedCanteen?.id === c.id && <CheckCircle2 className="w-3 h-3 text-indigo-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          )}

          {/* TAB 1: COOK & DELIVERY ALPHANUMERIC PASSCODE */}
          {activeTab === 'cook' && (
            <div className="space-y-2 pt-0.5">
              <div className="space-y-0.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Kitchen Passcode / PIN
                </label>
                
                <div className="relative">
                  <KeyRound className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showCookPin ? 'text' : 'password'}
                    required
                    autoComplete="off"
                    placeholder="e.g. CHEF50 or DELIV1"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    className="w-full pl-7 pr-14 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-mono font-bold text-slate-900 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-8 placeholder:normal-case placeholder:font-sans placeholder:font-normal placeholder:text-[11px]"
                  />
                  <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                    {pin && (
                      <button
                        type="button"
                        onClick={() => setPin('')}
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                        title="Clear passcode"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowCookPin(p => !p)}
                      className="p-0.5 text-slate-400 hover:text-slate-600"
                    >
                      {showCookPin ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={isLoading || pin.trim().length < 3}
                className="w-full h-8 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <span>{isLoading ? 'Verifying...' : 'Enter Kitchen Terminal'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* TAB 2: STORE MANAGER USERNAME & PASSWORD */}
          {activeTab === 'manager' && (
            <div className="space-y-2">
              <div className="space-y-0.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Manager Username
                </label>
                <div className="relative">
                  <User className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. anand_stall_mgr"
                    value={managerUsername}
                    onChange={e => setManagerUsername(e.target.value)}
                    className="w-full pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-8"
                  />
                </div>
              </div>

              <div className="space-y-0.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={managerPassword}
                    onChange={e => setManagerPassword(e.target.value)}
                    className="w-full pl-7 pr-8 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-8"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(p => !p)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {/* Submit Action Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full h-8 rounded-md bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <span>{isLoading ? 'Verifying...' : 'Sign In as Manager'}</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          )}

        </form>

        {/* Footer Link to Super Admin Portal */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <span>Platform Owner? Super Admin Command Center</span>
            <ArrowRight className="w-2.5 h-2.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}
