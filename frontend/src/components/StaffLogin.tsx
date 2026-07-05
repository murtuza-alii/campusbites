import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../config.js';

export function StaffLogin() {
  const [isAdminMode, setIsAdminMode] = useState(false);
  
  // Staff Selection States
  const [selectedCanteen, setSelectedCanteen] = useState('c1');
  const [selectedRole, setSelectedRole] = useState('cook');
  const [pin, setPin] = useState('');

  // Admin Credentials
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    let usernameToSubmit = '';
    let passwordToSubmit = '';

    if (isAdminMode) {
      if (!adminUsername || !adminPassword) {
        setError('Please enter admin credentials');
        return;
      }
      usernameToSubmit = adminUsername;
      passwordToSubmit = adminPassword;
    } else {
      if (!pin) {
        setError('Please enter your access PIN');
        return;
      }
      const mapping: { [key: string]: string } = {
        c1: 'a',
        c2: 'b',
        c3: 'c',
        c4: 'd'
      };
      const letter = mapping[selectedCanteen] || 'a';
      const roleCode = selectedRole === 'manager' ? 'mgr' : 'cook';
      usernameToSubmit = `canteen_${letter}_${roleCode}`;
      passwordToSubmit = pin;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: usernameToSubmit, password: passwordToSubmit }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('staffToken', data.token);
        navigate('/staff');
      } else {
        setError(data.error || 'Invalid credentials or incorrect PIN');
      }
    } catch (err) {
      setError('Failed to connect to canteen server. Is backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center py-12 px-margin-mobile overflow-hidden">
      {/* Staff Login Card */}
      <div className="glass-card w-full max-w-[448px] p-stack-lg md:p-12 rounded-[2.5rem] z-10 animate-fade-in-up">
        {/* Branding Header */}
        <div className="flex flex-col items-center text-center mb-stack-lg">
          <div className="w-16 h-16 rounded-2xl bg-primary-container/10 flex items-center justify-center mb-stack-md shield-glow">
            <span className="material-symbols-outlined text-4xl text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isAdminMode ? 'admin_panel_settings' : 'storefront'}
            </span>
          </div>
          <h1 className="font-headline-lg text-headline-lg text-slate-900 mb-stack-sm">
            {isAdminMode ? 'Admin Portal' : 'Canteen Staff'}
          </h1>
          <p className="font-body-md text-body-md text-slate-500">
            {isAdminMode ? 'Enter administrator credentials' : 'Select your outlet and enter access PIN'}
          </p>
        </div>

        {/* Login Form */}
        <form className="space-y-stack-lg" onSubmit={handleLogin}>
          {/* Error Alert */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-body-sm mb-4">
              <span className="material-symbols-outlined text-[18px]">error</span>
              <p>{error}</p>
            </div>
          )}

          {!isAdminMode ? (
            <>
              {/* Canteen Selector Dropdown */}
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-slate-500 block ml-1">Select Canteen</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">store</span>
                  <select
                    value={selectedCanteen}
                    onChange={(e) => setSelectedCanteen(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-white/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 appearance-none transition-all outline-none backdrop-blur-sm cursor-pointer"
                  >
                    <option value="c1">Canteen A (Meals & Snacks)</option>
                    <option value="c2">Canteen B (Beverages & Cafe)</option>
                    <option value="c3">Canteen C (Juices & Fruits)</option>
                    <option value="c4">Canteen D (Fast Food Kiosk)</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
                </div>
              </div>

              {/* Role Selector Dropdown */}
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-slate-500 block ml-1">Select Role / Job</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">badge</span>
                  <select
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-white/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 appearance-none transition-all outline-none backdrop-blur-sm cursor-pointer"
                  >
                    <option value="cook">Cook / Kitchen Server</option>
                    <option value="manager">Outlet Manager</option>
                  </select>
                  <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">expand_more</span>
                </div>
              </div>

              {/* Shared Access PIN Input */}
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-slate-500 block ml-1" htmlFor="pin">Access PIN</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">dialpad</span>
                  <input
                    id="pin"
                    name="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    required
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Enter 4-digit PIN"
                    className="w-full h-14 pl-12 pr-4 bg-white/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder:text-slate-400 transition-all outline-none backdrop-blur-sm tracking-widest text-center text-lg font-bold"
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Admin Username Input */}
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-slate-500 block ml-1" htmlFor="adminUsername">Admin Username</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">person</span>
                  <input
                    id="adminUsername"
                    name="adminUsername"
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full h-14 pl-12 pr-4 bg-white/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder:text-slate-400 transition-all outline-none backdrop-blur-sm"
                  />
                </div>
              </div>

              {/* Admin Password Input */}
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-slate-500 block ml-1" htmlFor="adminPassword">Password</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors">lock</span>
                  <input
                    id="adminPassword"
                    name="adminPassword"
                    type="password"
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-14 pl-12 pr-4 bg-white/60 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary text-slate-900 placeholder:text-slate-400 transition-all outline-none backdrop-blur-sm"
                  />
                </div>
              </div>
            </>
          )}

          {/* Action Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="primary-gloss-btn w-full h-14 rounded-xl font-bold text-headline-sm flex items-center justify-center gap-3 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <span>Verifying...</span>
                <div className="loader"></div>
              </>
            ) : (
              <span>Access Dashboard</span>
            )}
          </button>
        </form>

        <div className="mt-8 pt-8 border-t border-slate-200/60 text-center flex flex-col items-center gap-2">
          <button
            onClick={() => {
              setIsAdminMode(!isAdminMode);
              setError('');
            }}
            className="text-primary font-medium hover:underline text-body-sm transition-all"
          >
            {isAdminMode ? 'Log in as Canteen Staff' : 'Log in as Administrator'}
          </button>
        </div>
      </div>
    </div>
  );
}
