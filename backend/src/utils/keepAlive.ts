/**
 * Render Keep-Alive / Self-Healthcheck Service
 * 
 * Render's free tier spins down web services after 15 minutes of inactivity.
 * This background service issues recurring HTTP pings to the application's
 * public URL (/api/health) every ~10 minutes, generating inbound HTTP traffic
 * to reset Render's 15-minute idle countdown and keep the instance warm.
 */

interface KeepAliveOptions {
  targetUrl?: string;
  intervalMinutes?: number;
}

export function startKeepAliveService(options?: KeepAliveOptions) {
  // Determine external URL: Render automatically exposes RENDER_EXTERNAL_URL
  const externalUrl =
    options?.targetUrl ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.API_URL ||
    'https://campusbites-4dch.onrender.com';

  const intervalMinutes = options?.intervalMinutes || parseInt(process.env.KEEP_ALIVE_INTERVAL_MINUTES || '4', 10);
  const intervalMs = Math.max(intervalMinutes, 1) * 60 * 1000;
  const endpoint = `${externalUrl.replace(/\/$/, '')}/api/health`;

  console.log(`[KeepAlive] 🛰️ Service started. Target: ${endpoint} (Interval: every ${intervalMinutes} min)`);

  const performHealthPing = async (attempt = 1) => {
    const startTime = Date.now();
    try {
      const response = await fetch(endpoint, {
        headers: {
          'User-Agent': 'CampusBites-KeepAlive-Worker/1.0',
          'X-Keep-Alive-Ping': 'true',
        },
      });

      const latency = Date.now() - startTime;
      if (response.ok) {
        console.log(`[KeepAlive] 🟢 Health check ping OK (status: ${response.status}, latency: ${latency}ms) at ${new Date().toLocaleTimeString()}`);
      } else {
        console.warn(`[KeepAlive] ⚠️ Health check returned non-200 status (${response.status}) in ${latency}ms`);
      }
    } catch (error: any) {
      console.error(`[KeepAlive] ❌ Health check ping failed (attempt ${attempt}): ${error.message}`);
      // Retry once after 15 seconds on transient network failure
      if (attempt === 1) {
        setTimeout(() => {
          performHealthPing(2);
        }, 15000);
      }
    }
  };

  // Initial warm-up ping 30 seconds after server launch
  setTimeout(() => {
    performHealthPing();
  }, 30000);

  // Scheduled recurring interval
  const timer = setInterval(() => {
    performHealthPing();
  }, intervalMs);

  // Return teardown function if needed during graceful shutdown
  return () => clearInterval(timer);
}
