import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Shield, Loader2 } from 'lucide-react';

export function StaffLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Please enter password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (response.ok && data.token) {
        localStorage.setItem('staffToken', data.token);
        navigate('/staff');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Failed to connect to canteen server. Is backend running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 glass-card p-8 sm:p-10 animate-in">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center text-brand mb-4 shadow-glow">
            <Shield className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">
            Canteen Portal
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Enter password to access the staff dashboard
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-status-error/15 border border-status-error/30 text-status-error text-sm rounded-lg p-3 text-center">
              {error}
            </div>
          )}

          <div className="rounded-md space-y-2">
            <label className="text-xs font-medium text-text-secondary block" htmlFor="password">
              Security Pin / Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                <Lock className="h-5 w-5" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="glass-input block w-full pl-11 pr-4 py-2.5 rounded-lg text-sm text-text-primary placeholder:text-text-muted w-full"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-semibold rounded-lg text-white bg-brand hover:bg-brand-hover active:scale-98 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5 mr-2" />
                  Verifying...
                </>
              ) : (
                'Access Dashboard'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
