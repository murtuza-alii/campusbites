import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle
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
      const isEmail = email.includes('@');
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: isEmail ? email.trim() : undefined,
          username: !isEmail ? email.trim() : undefined,
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
    <div className="min-h-[75vh] flex items-center justify-center py-6 px-4">
      {/* High-Density Double-Bezel Card */}
      <div className="w-full max-w-sm bg-white border border-slate-200/90 rounded-lg p-4 shadow-2xs space-y-3">
        
        {/* Header Title */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 border border-indigo-100 text-[10px] font-semibold text-indigo-700 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            <span>Executive Command Center</span>
          </div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">Super Admin Portal</h2>
          <p className="text-[11px] text-slate-500">
            Global Control Center & Multi-Outlet Stream
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-2 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleLogin} className="space-y-2.5">
          {/* Email / Username Input */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Admin Email / Username
            </label>
            <div className="relative">
              <Mail className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                placeholder="admin@campusbites.com or admin"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-7 pr-3 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-8"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-0.5">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Master Password
            </label>
            <div className="relative">
              <Lock className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
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
            className="w-full h-8 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
          >
            <span>{isLoading ? 'Verifying...' : 'Open Command Center'}</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </form>

        {/* Quick Staff Portal Navigation */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <Link
            to="/staff/login"
            className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            <span>Looking for Kitchen Cook or Store Manager Login?</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
