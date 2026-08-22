import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { 
  Store, 
  ChefHat, 
  ShieldCheck, 
  Lock, 
  Building2, 
  Search, 
  ArrowRight, 
  RotateCw, 
  Check, 
  KeyRound, 
  User, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';
import { HeroChip } from './ui/HeroUIComponents';
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

export function StaffLogin() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchParams] = useSearchParams();
  const queryCanteen = searchParams.get('canteen') || searchParams.get('campus') || slug;

  const [isAdminMode, setIsAdminMode] = useState(false);
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [selectedCanteen, setSelectedCanteen] = useState<Canteen | null>(null);
  const [isSelectingOutlet, setIsSelectingOutlet] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Staff Selection States
  const [selectedRole, setSelectedRole] = useState<'cook' | 'manager'>('cook');
  const [pin, setPin] = useState('');

  // Admin Credentials
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingCanteens, setIsFetchingCanteens] = useState(true);
  const navigate = useNavigate();

  // 1. Fetch available canteens / campuses
  useEffect(() => {
    async function loadCanteens() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/canteens`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setCanteens(data);

          // Check if slug / query matches any canteen
          if (queryCanteen) {
            const matched = data.find(
              c => c.slug === queryCanteen || c.id === queryCanteen || c.group_slug === queryCanteen
            );
            if (matched) {
              setSelectedCanteen(matched);
              setIsSelectingOutlet(false);
              return;
            }
          }

          // Default selection to first canteen if not selecting
          setSelectedCanteen(data[0]);
        }
      } catch (err) {
        console.error('Failed to load canteens', err);
      } finally {
        setIsFetchingCanteens(false);
      }
    }
    loadCanteens();
  }, [queryCanteen]);

  // Handle Login submission
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    let payload: any = {};

    if (isAdminMode) {
      if (!adminUsername || !adminPassword) {
        setError('Please enter administrator credentials');
        return;
      }
      payload = { username: adminUsername, password: adminPassword };
    } else {
      if (!selectedCanteen) {
        setError('Please select a campus or diner outlet');
        return;
      }
      if (!pin) {
        setError('Please enter your 4-digit access PIN');
        return;
      }
      payload = {
        canteen_id: selectedCanteen.id,
        canteen_slug: selectedCanteen.slug,
        role: selectedRole,
        pin: pin
      };
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('staffToken', data.token);
        navigate('/staff');
      } else {
        setError(data.error || 'Invalid credentials or incorrect access PIN');
      }
    } catch (err) {
      setError('Failed to connect to authentication server. Is backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  // Filter canteens based on search
  const filteredCanteens = canteens.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.group_name && c.group_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.description && c.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Group by campus/standalone
  const campusGroups = Array.from(new Set(canteens.map(c => c.group_name).filter(Boolean)));
  const standaloneCanteens = canteens.filter(c => !c.group_name);

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-8 sm:py-12 px-margin-mobile">
      
      {/* Outer Container */}
      <div className="w-full max-w-xl space-y-6">

        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-bold shadow-xs">
            <Sparkles className="w-3.5 h-3.5" />
            <span>CampusBites Staff & Management Terminal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
            {isAdminMode ? 'Campus Administrator Portal' : 'Outlet Staff Terminal'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
            {isAdminMode 
              ? 'Global administrative access to oversee all university dining outlets' 
              : 'Select your dining location, choose your station, and enter your PIN'}
          </p>
        </div>

        {/* Portal Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-slate-200/70 p-1.5 rounded-2xl shadow-inner max-w-md mx-auto">
          <button
            type="button"
            onClick={() => {
              setIsAdminMode(false);
              setError('');
            }}
            className={`py-2.5 rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              !isAdminMode
                ? 'bg-white text-indigo-700 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChefHat className="w-4 h-4" />
            <span>Outlet Staff (PIN)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setIsAdminMode(true);
              setError('');
            }}
            className={`py-2.5 rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              isAdminMode
                ? 'bg-white text-indigo-700 shadow-md scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Master Admin (Pass)</span>
          </button>
        </div>

        {/* Main Login Card */}
        <SpotlightCard className="p-6 sm:p-8 rounded-3xl shadow-xl border border-slate-200/80 bg-white/90 backdrop-blur-xl">
          
          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-5 animate-shake">
              <span className="material-symbols-outlined text-[18px] shrink-0">error</span>
              <p className="mt-0.5">{error}</p>
            </div>
          )}

          {/* MODE 1: Outlet Staff Login */}
          {!isAdminMode ? (
            <form onSubmit={handleLogin} className="space-y-5">
              
              {/* Outlet Selection Banner / Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                    Assigned Campus / Outlet
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsSelectingOutlet(!isSelectingOutlet)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                  >
                    <span>{isSelectingOutlet ? 'Close Directory' : 'Switch Outlet'}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Selected Outlet Display Card */}
                {selectedCanteen && !isSelectingOutlet && (
                  <div className="p-3.5 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 flex items-center justify-between gap-3 shadow-inner">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-black text-sm text-slate-900 truncate">{selectedCanteen.name}</h4>
                          {selectedCanteen.group_name && (
                            <HeroChip variant="primary" size="sm">
                              {selectedCanteen.group_name}
                            </HeroChip>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">
                          {selectedCanteen.description || `/c/${selectedCanteen.slug}`}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsSelectingOutlet(true)}
                      className="px-3 py-1.5 rounded-xl bg-white border border-indigo-200 text-indigo-700 text-xs font-bold shadow-xs hover:bg-indigo-50 transition-all shrink-0"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Dynamic Campus & Outlet Directory Popup / Expanded List */}
                {(isSelectingOutlet || !selectedCanteen) && (
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200 animate-in">
                    
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search campus, dining hub, or diner..."
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                      />
                    </div>

                    {isFetchingCanteens ? (
                      <div className="py-6 flex items-center justify-center gap-2 text-xs text-slate-500">
                        <RotateCw className="w-4 h-4 animate-spin text-indigo-600" />
                        <span>Loading campus directory...</span>
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                        
                        {/* Grouped Campus Outlets */}
                        {campusGroups.map(group => {
                          const items = filteredCanteens.filter(c => c.group_name === group);
                          if (items.length === 0) return null;
                          return (
                            <div key={group} className="space-y-1.5">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">
                                {group}
                              </span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                {items.map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCanteen(c);
                                      setIsSelectingOutlet(false);
                                      setError('');
                                    }}
                                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                                      selectedCanteen?.id === c.id
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <p className="font-bold text-xs truncate">{c.name}</p>
                                      <p className={`text-[10px] truncate ${selectedCanteen?.id === c.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        {c.slug}
                                      </p>
                                    </div>
                                    {selectedCanteen?.id === c.id && (
                                      <Check className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                  </button>
                                ))}
                              </div>
                            </div>
                          );
                        })}

                        {/* Standalone Diners */}
                        {standaloneCanteens.length > 0 && (
                          <div className="space-y-1.5 pt-1">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 ml-1">
                              Standalone Diners & Restaurants
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                              {standaloneCanteens
                                .filter(c => filteredCanteens.some(fc => fc.id === c.id))
                                .map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCanteen(c);
                                      setIsSelectingOutlet(false);
                                      setError('');
                                    }}
                                    className={`p-2.5 rounded-xl text-left border transition-all flex items-center justify-between ${
                                      selectedCanteen?.id === c.id
                                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                        : 'bg-white text-slate-800 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/50'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <p className="font-bold text-xs truncate">{c.name}</p>
                                      <p className={`text-[10px] truncate ${selectedCanteen?.id === c.id ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        {c.slug}
                                      </p>
                                    </div>
                                    {selectedCanteen?.id === c.id && (
                                      <Check className="w-3.5 h-3.5 shrink-0" />
                                    )}
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Station / Role Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Select Staff Role / Station
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedRole('cook')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                      selectedRole === 'cook'
                        ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                        <ChefHat className="w-4 h-4" />
                      </div>
                      {selectedRole === 'cook' && (
                        <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      )}
                    </div>
                    <div>
                      <h5 className="font-black text-xs text-slate-900">Kitchen Cook</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Touch KDS, food prep & cooking queue</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole('manager')}
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                      selectedRole === 'manager'
                        ? 'border-indigo-600 bg-indigo-50/70 shadow-sm'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                        <Store className="w-4 h-4" />
                      </div>
                      {selectedRole === 'manager' && (
                        <div className="w-2 h-2 rounded-full bg-indigo-600"></div>
                      )}
                    </div>
                    <div>
                      <h5 className="font-black text-xs text-slate-900">Outlet Manager</h5>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Kanban board, menu editor & pricing</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Access PIN Input */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="pin">
                    Station Access PIN
                  </label>
                  <button
                    type="button"
                    onClick={() => setPin('1234')}
                    className="text-[11px] font-mono font-bold text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100"
                  >
                    Auto-Fill Demo PIN: 1234
                  </button>
                </div>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="••••"
                    className="w-full h-13 pl-12 pr-4 bg-slate-50 border border-slate-300 rounded-2xl font-mono text-center font-black text-xl tracking-widest text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all shadow-inner"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl font-bold text-sm bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-lg shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <span>Unlock {selectedCanteen?.name || 'Outlet'} Terminal</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            /* MODE 2: Global Administrator Login */
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="adminUsername">
                  Admin Username
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="adminUsername"
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="adminPassword">
                    Admin Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAdminUsername('admin');
                      setAdminPassword('adminpassword');
                    }}
                    className="text-[11px] font-mono font-bold text-indigo-600 hover:underline bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100"
                  >
                    Auto-Fill Demo Admin
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    id="adminPassword"
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 pl-11 pr-4 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 rounded-2xl font-bold text-sm bg-slate-900 hover:bg-black active:scale-[0.98] text-white shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Admin Access...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Sign In to Admin Terminal</span>
                  </>
                )}
              </button>
            </form>
          )}

        </SpotlightCard>

        {/* Footer info link */}
        <div className="text-center">
          <Link
            to="/"
            className="text-xs text-slate-500 hover:text-indigo-600 font-semibold transition-colors"
          >
            ← Return to CampusBites Main Portal
          </Link>
        </div>

      </div>
    </div>
  );
}

