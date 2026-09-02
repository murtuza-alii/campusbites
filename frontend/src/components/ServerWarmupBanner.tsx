import { useEffect, useState } from 'react';
import { API_BASE_URL } from '../config';
import { Cloud, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';

export function ServerWarmupBanner() {
  const [status, setStatus] = useState<'idle' | 'warming' | 'ready' | 'error'>('idle');
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    let warmupTimer: ReturnType<typeof setTimeout>;

    const checkServerHealth = async () => {
      // If it takes more than 1.8 seconds, show "warming up" banner
      warmupTimer = setTimeout(() => {
        if (isMounted && status === 'idle') {
          setStatus('warming');
        }
      }, 1800);

      const startTime = Date.now();
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`);
        const elapsed = Date.now() - startTime;
        clearTimeout(warmupTimer);

        if (!isMounted) return;

        if (res.ok) {
          setLatency(elapsed);
          window.dispatchEvent(new CustomEvent('serverReady'));
          if (elapsed > 1800) {
            // Was warming up, show success then fade
            setStatus('ready');
            setTimeout(() => {
              if (isMounted) setStatus('idle');
            }, 3500);
          } else {
            setStatus('idle');
          }
        } else {
          setStatus('error');
        }
      } catch (err) {
        clearTimeout(warmupTimer);
        if (isMounted) {
          setStatus('warming'); // Probably still starting up on Render
          // Retry in 5 seconds
          setTimeout(checkServerHealth, 5000);
        }
      }
    };

    checkServerHealth();

    // Periodic keep-alive ping every 4 minutes while browser tab is active
    const keepAliveInterval = setInterval(() => {
      fetch(`${API_BASE_URL}/api/health`).catch(() => {});
    }, 4 * 60 * 1000);

    return () => {
      isMounted = false;
      clearTimeout(warmupTimer);
      clearInterval(keepAliveInterval);
    };
  }, []);

  if (status === 'idle') return null;

  return (
    <aside
      aria-label="Server Connection Status"
      className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-3 duration-300 pointer-events-auto"
    >
      {status === 'warming' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-xl border border-slate-700/60 max-w-sm">
          <div className="relative flex items-center justify-center w-7 h-7 shrink-0">
            <RefreshCw className="w-5 h-5 text-amber-400 animate-spin" />
            <Cloud className="w-2.5 h-2.5 text-white absolute" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
              <span>Waking up cloud server</span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 leading-tight">
              Render standby warmup in progress. Ready in a few seconds...
            </p>
          </div>
        </div>
      )}

      {status === 'ready' && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-950/90 text-emerald-100 backdrop-blur-md rounded-2xl shadow-xl border border-emerald-600/40">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-200">Server Connected & Ready</p>
            {latency && (
              <p className="text-[10px] text-emerald-400">Response time: {latency}ms</p>
            )}
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-rose-950/90 text-rose-100 backdrop-blur-md rounded-2xl shadow-xl border border-rose-600/40">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div>
            <p className="text-xs font-bold text-rose-200">Server connection issue</p>
            <p className="text-[10px] text-rose-300">Re-trying automatically...</p>
          </div>
        </div>
      )}
    </aside>
  );
}
