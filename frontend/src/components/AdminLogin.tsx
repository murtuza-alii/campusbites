import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle,
  Crown
} from 'lucide-react';
import { API_BASE_URL } from '../config.js';
import { decodeToken } from '../utils/jwt.js';

export function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please provide your administrator email and password.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed. Invalid admin credentials.');
      }

      if (data.token) {
        const decoded = decodeToken(data.token);
        if (decoded?.role !== 'admin') {
          throw new Error('Access denied. This account does not possess Super Admin privileges.');
        }

        localStorage.setItem('adminToken', data.token);
        localStorage.setItem('staffToken', data.token);
        navigate('/admin');
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
      {/* Outer Shell: Double-Bezel Architecture */}
      <div className="w-full max-w-md bg-slate-900/95 p-2 sm:p-2.5 rounded-[2.5rem] shadow-2xl ring-1 ring-slate-800 backdrop-blur-2xl transition-all duration-500">
        
        {/* Inner Core: Concentric Content Container */}
        <div className="bg-slate-950 rounded-[calc(2.5rem-0.625rem)] p-6 sm:p-8 border border-slate-800/80 text-white relative overflow-hidden">
          
          {/* Subtle Ambient Orb Glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Title & Eyebrow */}
          <div className="text-center mb-7 relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-indigo-950/80 border border-indigo-500/30 text-[10px] font-black text-indigo-300 uppercase tracking-[0.2em] mb-3 shadow-inner">
              <Crown className="w-3 h-3 text-amber-400" />
              <span>Platform Owner Access</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tight">Super Admin Portal</h2>
            <p className="text-xs text-slate-400 mt-1 font-medium">
              Global Control Center & Multi-Outlet Executive Stream
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 p-3.5 rounded-2xl bg-rose-950/50 border border-rose-500/40 flex items-start gap-2.5 text-rose-300 text-xs font-semibold animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-tight">{error}</div>
            </div>
          )}

          {/* Form Content */}
          <form onSubmit={handleLogin} className="space-y-4 relative z-10">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Master Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="admin@campusbites.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder:text-slate-600 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                Master Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-3 bg-slate-900/90 border border-slate-800 rounded-2xl text-xs font-bold text-white placeholder:text-slate-600 focus:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3.5 px-6 rounded-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
            >
              <span>{isLoading ? 'Verifying Credentials...' : 'Open Command Center'}</span>
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </button>
          </form>

          {/* Quick Staff Portal Navigation */}
          <div className="mt-8 pt-5 border-t border-slate-900 text-center relative z-10">
            <Link
              to="/staff/login"
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400 hover:text-slate-200 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>Looking for Kitchen Cook or Store Manager Login?</span>
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
