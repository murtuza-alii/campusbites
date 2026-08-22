import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { socket } from '../utils/socket.js';
import { Clock, Coffee, RotateCw, CheckCircle, ShieldAlert, FileText, CheckCheck, Camera, Keyboard, QrCode, KeyRound, Check } from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';
import { HeroChip } from './ui/HeroUIComponents';
import { decodeToken, type DecodedToken } from '../utils/jwt.js';
import { API_BASE_URL } from '../config.js';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  order_number: string;
  student_name: string;
  student_roll: string;
  items: CartItem[];
  total_price: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
  pickup_code: string;
  created_at: string;
}

export function StaffOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'COMPLETED'>('ACTIVE');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const navigate = useNavigate();
  
  // User metadata and canteen state
  const [userProfile, setUserProfile] = useState<DecodedToken | null>(null);
  const [canteens, setCanteens] = useState<any[]>([]);
  const [selectedAdminCanteenId, setSelectedAdminCanteenId] = useState<string>('');
  const [canteenName, setCanteenName] = useState<string>('');

  // Per-Order inline PIN verification state
  const [pinInputs, setPinInputs] = useState<Record<string, string>>({});
  const [verifyingOrders, setVerifyingOrders] = useState<Record<string, boolean>>({});
  const [orderErrors, setOrderErrors] = useState<Record<string, string>>({});
  const [orderSuccess, setOrderSuccess] = useState<Record<string, string>>({});

  // QR Pickup Verification State & Camera Scanner
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [targetOrder, setTargetOrder] = useState<Order | null>(null);
  const [verifyMode, setVerifyMode] = useState<'camera' | 'manual'>('camera');
  const [verifyInput, setVerifyInput] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [scannerDetected, setScannerDetected] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const isScanningPaused = useRef<boolean>(false);

  // Audio tone feedback on successful verification / QR scan
  const playSuccessTone = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.log('Audio tone not supported or blocked', e);
    }
  }, []);

  // Keep track of previous orders length to play sound on new orders
  const prevPendingCount = useRef<number>(0);

  const fetchCanteens = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/canteens`);
      if (response.ok) {
        const data = await response.json();
        setCanteens(data);
      }
    } catch (e) {
      console.error('Failed to load canteens list for admin dashboard', e);
    }
  };

  const fetchOrders = async (adminCanteenId?: string) => {
    const token = localStorage.getItem('staffToken');
    if (!token) {
      navigate('/staff/login');
      return;
    }

    try {
      const targetCanteenId = adminCanteenId || selectedAdminCanteenId;
      let url = `${API_BASE_URL}/api/admin/orders`;
      if (targetCanteenId) {
        url += `?canteenId=${targetCanteenId}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOrders(data);
        setError('');

        // Play chime sound if new PENDING order arrives
        const currentPendingCount = data.filter((o: Order) => o.status === 'PENDING').length;
        if (currentPendingCount > prevPendingCount.current) {
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1018/1018-500.wav');
            audio.volume = 0.5;
            audio.play();
          } catch (e) {
            console.log('Audio alert blocked by browser');
          }
        }
        prevPendingCount.current = currentPendingCount;

      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('staffToken');
        navigate('/staff/login');
      } else {
        setError('Failed to fetch orders from server.');
      }
    } catch (err) {
      setError('Connection to backend lost. Reconnecting...');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('staffToken');
    if (!token) {
      navigate('/staff/login');
      return;
    }

    const decoded = decodeToken(token);
    setUserProfile(decoded);

    if (decoded) {
      fetchCanteens();
      if (decoded.canteenId) {
        if (!selectedAdminCanteenId) {
          setSelectedAdminCanteenId(decoded.canteenId);
        }
        // Fetch specific canteen name
        fetch(`${API_BASE_URL}/api/canteens`)
          .then(res => res.json())
          .then(data => {
            const match = data.find((c: any) => c.id === decoded.canteenId);
            if (match) setCanteenName(match.name);
          })
          .catch(e => console.error(e));
      }
    }

    fetchOrders();

    // Join admin WebSocket room
    socket.emit('joinAdmin');

    const handleOrderCreated = (newOrder: Order) => {
      console.log('Real-time order created:', newOrder);
      fetchOrders();
    };

    const handleOrderStatusChanged = (updatedOrder: Order) => {
      console.log('Real-time order status changed:', updatedOrder);
      fetchOrders();
    };

    socket.on('orderCreated', handleOrderCreated);
    socket.on('orderStatusChanged', handleOrderStatusChanged);

    return () => {
      socket.off('orderCreated', handleOrderCreated);
      socket.off('orderStatusChanged', handleOrderStatusChanged);
    };
  }, [selectedAdminCanteenId]);

  const updateOrderStatus = async (orderId: string, newStatus: 'PREPARING' | 'READY' | 'COMPLETED') => {
    const token = localStorage.getItem('staffToken');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Optimistic UI update
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
      } else {
        alert('Failed to update status.');
      }
    } catch (e) {
      alert('Network error.');
    }
  };

  // Per-Order PIN verification handler from Card
  const handleVerifyOrderPin = async (order: Order, pinOverride?: string) => {
    const pin = (pinOverride !== undefined ? pinOverride : pinInputs[order.id] || '').trim();
    if (!pin) {
      setOrderErrors(prev => ({ ...prev, [order.id]: 'Enter 4-digit PIN' }));
      return;
    }

    try {
      setVerifyingOrders(prev => ({ ...prev, [order.id]: true }));
      setOrderErrors(prev => ({ ...prev, [order.id]: '' }));
      setOrderSuccess(prev => ({ ...prev, [order.id]: '' }));

      const res = await fetch(`${API_BASE_URL}/api/orders/verify-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: order.id,
          pickup_code: pin,
          canteen_id: selectedAdminCanteenId
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playSuccessTone();
        setOrderSuccess(prev => ({ ...prev, [order.id]: `✓ Verified! Order ${order.order_number} completed.` }));
        // Optimistically mark completed
        setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: 'COMPLETED' } : o));
        setPinInputs(prev => ({ ...prev, [order.id]: '' }));
        setTimeout(() => {
          fetchOrders(selectedAdminCanteenId);
        }, 600);
      } else {
        setOrderErrors(prev => ({ ...prev, [order.id]: data.error || 'Incorrect PIN' }));
      }
    } catch (err: any) {
      setOrderErrors(prev => ({ ...prev, [order.id]: err.message || 'Connection failed' }));
    } finally {
      setVerifyingOrders(prev => ({ ...prev, [order.id]: false }));
    }
  };

  // Universal / Modal verification handler
  const handleVerifyPickup = async (inputVal?: string) => {
    const val = inputVal !== undefined ? inputVal : verifyInput;
    if (!val || !val.trim()) return;
    
    try {
      setIsVerifying(true);
      setVerifyResult(null);

      let bodyData: any = {};
      const trimmed = val.trim();

      if (trimmed.startsWith('{')) {
        bodyData = { qr_data: trimmed, canteen_id: selectedAdminCanteenId };
      } else {
        if (targetOrder) {
          bodyData = { order_id: targetOrder.id, pickup_code: trimmed, canteen_id: selectedAdminCanteenId };
        } else {
          bodyData = { qr_data: trimmed, canteen_id: selectedAdminCanteenId };
        }
      }

      const res = await fetch(`${API_BASE_URL}/api/orders/verify-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        playSuccessTone();
        setVerifyResult({ success: true, message: data.message || 'Pickup verified & completed!' });
        fetchOrders(selectedAdminCanteenId);

        // Auto-close modal after successful verification
        setTimeout(() => {
          setIsVerifyModalOpen(false);
          setTargetOrder(null);
          setVerifyResult(null);
          setScannerDetected(false);
        }, 1600);
      } else {
        setVerifyResult({ success: false, message: data.error || 'Verification failed.' });
      }
    } catch (err: any) {
      setVerifyResult({ success: false, message: err?.message || 'Connection error' });
    } finally {
      setIsVerifying(false);
    }
  };

  // Camera Scanner Lifecycle with BarcodeDetector + jsQR fallback
  useEffect(() => {
    if (!isVerifyModalOpen || verifyMode !== 'camera') {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      isScanningPaused.current = false;
      return;
    }

    let active = true;
    isScanningPaused.current = false;

    // Check for native BarcodeDetector API support
    const hasBarcodeDetector = typeof window !== 'undefined' && 'BarcodeDetector' in window;
    let barcodeDetector: any = null;
    if (hasBarcodeDetector) {
      try {
        barcodeDetector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) {
        console.warn('BarcodeDetector fallback to jsQR', e);
      }
    }

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });

        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.muted = true;
          await videoRef.current.play();
        }

        const scanFrame = async () => {
          if (!active) return;

          const video = videoRef.current;
          const canvas = canvasRef.current;

          if (video && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA && !isScanningPaused.current) {
            let detectedData: string | null = null;

            // 1. Native BarcodeDetector (High performance, instant auto-detection)
            if (barcodeDetector) {
              try {
                const barcodes = await barcodeDetector.detect(video);
                if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                  detectedData = barcodes[0].rawValue;
                }
              } catch (err) {
                // Fallback to canvas jsQR
              }
            }

            // 2. Canvas jsQR Fallback with dual contrast
            if (!detectedData && canvas && video.videoWidth > 0 && video.videoHeight > 0) {
              const ctx = canvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'attemptBoth'
                });
                if (code && code.data) {
                  detectedData = code.data;
                }
              }
            }

            // If QR code is detected automatically:
            if (detectedData) {
              isScanningPaused.current = true;
              setScannerDetected(true);
              setVerifyInput(detectedData);
              handleVerifyPickup(detectedData);

              setTimeout(() => {
                if (active) {
                  setScannerDetected(false);
                  isScanningPaused.current = false;
                  animFrameRef.current = requestAnimationFrame(scanFrame);
                }
              }, 3000);
              return;
            }
          }

          animFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (err: any) {
        console.error('Camera access error:', err);
        setVerifyResult({ success: false, message: 'Camera access denied or unavailable. Please enter PIN manually.' });
      }
    };

    startCamera();

    return () => {
      active = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isVerifyModalOpen, verifyMode, targetOrder]);

  const getFilteredOrders = (status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED') => {
    return orders.filter(o => o.status === status);
  };

  // Helper to format date relative or short
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Determine campus scope and valid canteens to prevent cross-contamination
  const userCanteen = canteens.find(c => c.id === userProfile?.canteenId);
  const userGroupName = userProfile?.groupName || userCanteen?.group_name;
  
  let scopedCanteens = canteens;
  if (userProfile && userProfile.role !== 'admin') {
    if (userGroupName) {
      scopedCanteens = canteens.filter(c => c.group_name === userGroupName);
    } else if (userProfile.canteenId) {
      scopedCanteens = canteens.filter(c => c.id === userProfile.canteenId);
    }
  }

  const currentCanteenObj = canteens.find(c => c.id === selectedAdminCanteenId) || userCanteen;

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-stack-lg mb-stack-lg border-b border-outline-variant/20 pb-6">
        <div className="space-y-2">
          {/* Prominent Campus & Venue Badge */}
          <div className="flex flex-wrap items-center gap-2">
            {userProfile?.role === 'admin' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-xs font-bold shadow-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                👑 Global Multi-Campus Network Admin
              </span>
            ) : userGroupName ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full text-xs font-bold shadow-sm">
                <span className="material-symbols-outlined text-[14px]">school</span>
                {userGroupName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-xs font-bold shadow-sm">
                <span className="material-symbols-outlined text-[14px]">restaurant</span>
                Standalone Gourmet Eatery
              </span>
            )}

            {userProfile?.role && (
              <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                userProfile.role === 'cook'
                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                  : userProfile.role === 'manager'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {userProfile.role === 'cook' ? '🧑‍🍳 Cook Terminal' : userProfile.role === 'manager' ? '👔 Outlet Manager' : 'Admin'}
              </span>
            )}
          </div>

          <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight font-black">
            {userProfile?.role === 'admin' 
              ? 'Campus Administrator Portal' 
              : `${currentCanteenObj?.name || canteenName || 'Canteen'} Dashboard`}
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary text-sm">
            {userProfile?.role === 'admin' 
              ? 'Global multi-campus visibility across all university dining halls & standalone diners' 
              : userGroupName
              ? `Processing orders exclusively for ${userGroupName} › ${currentCanteenObj?.name || 'All Outlets'}`
              : `Processing orders exclusively for ${currentCanteenObj?.name || 'Downtown Diner'}`}
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3.5 py-2 bg-status-error/10 border border-status-error/25 text-status-error rounded-xl text-xs font-semibold animate-pulse self-start">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Canteen Switcher & Direct Link */}
        {userProfile && (
          <div className="flex flex-wrap items-center gap-3">
            {userProfile.role === 'admin' ? (
              <div className="flex items-center gap-2 bg-white/60 border border-slate-200/90 p-2 rounded-2xl backdrop-blur-md shadow-sm self-start md:self-auto">
                <span className="material-symbols-outlined text-slate-400 text-[20px] ml-1">storefront</span>
                <select
                  value={selectedAdminCanteenId}
                  onChange={(e) => setSelectedAdminCanteenId(e.target.value)}
                  className="bg-transparent border-none rounded-xl px-2 py-1 font-label-md text-slate-900 font-semibold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="">🌐 All Outlets (Global View)</option>
                  <optgroup label="🏫 Mithibai Main Campus">
                    {canteens.filter(c => c.group_name === 'Mithibai Main Campus').map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                  {Array.from(new Set(canteens.map(c => c.group_name).filter(g => g && g !== 'Mithibai Main Campus'))).map(group => (
                    <optgroup key={group} label={`🏫 ${group}`}>
                      {canteens.filter(c => c.group_name === group).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="🍽️ Standalone Diners & Food Courts">
                    {canteens.filter(c => !c.group_name).map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
            ) : scopedCanteens.length > 1 ? (
              <div className="flex items-center gap-2 bg-white/60 border border-slate-200/90 p-2 rounded-2xl backdrop-blur-md shadow-sm self-start md:self-auto">
                <span className="material-symbols-outlined text-slate-400 text-[20px] ml-1">storefront</span>
                <select
                  value={selectedAdminCanteenId}
                  onChange={(e) => setSelectedAdminCanteenId(e.target.value)}
                  className="bg-transparent border-none rounded-xl px-2 py-1 font-label-md text-slate-900 font-semibold focus:outline-none cursor-pointer text-xs"
                >
                  <option value="">All {userGroupName || 'Campus'} Outlets</option>
                  {scopedCanteens.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-indigo-50 border border-indigo-200 rounded-2xl text-xs font-bold text-indigo-900 shadow-sm">
                <span className="material-symbols-outlined text-indigo-600 text-[18px]">storefront</span>
                <span>{scopedCanteens[0]?.name || currentCanteenObj?.name || 'Assigned Outlet'}</span>
              </div>
            )}

            <button
              onClick={() => {
                const current = canteens.find(c => c.id === (selectedAdminCanteenId || userProfile?.canteenId));
                let url = window.location.origin;
                if (current?.group_slug) {
                  url += `/c/${current.group_slug}?canteen=${current.slug || current.id}`;
                } else if (current?.slug) {
                  url += `/c/${current.slug}`;
                } else {
                  url += `/c/mithibai-main-campus`;
                }
                navigator.clipboard.writeText(url);
                alert(`Direct Student Link copied to clipboard:\n${url}`);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl font-label-md text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 transition-all shadow-sm active:scale-95"
              title="Copy Direct Link for Students"
            >
              <span className="material-symbols-outlined text-[16px]">link</span>
              <span>Copy Link</span>
            </button>

            <button
              onClick={() => {
                setTargetOrder(null);
                setVerifyInput('');
                setVerifyResult(null);
                setVerifyMode('camera');
                setIsVerifyModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-2xl font-label-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md active:scale-95"
              title="Universal QR code or PIN scanner"
            >
              <QrCode className="w-4 h-4" />
              <span>Universal QR Scanner</span>
            </button>
          </div>
        )}

        {/* Tab Toggle */}
        <div className="glass-card p-1.5 rounded-2xl flex items-center gap-1 self-start md:self-auto select-none">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-6 py-2.5 rounded-xl font-label-md text-label-md transition-all duration-300 ${
              activeTab === 'ACTIVE'
                ? 'bg-primary text-on-primary shadow-lg font-bold'
                : 'text-text-secondary hover:text-primary'
            }`}
          >
            Active Orders ({orders.filter(o => o.status !== 'COMPLETED').length})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-6 py-2.5 rounded-xl font-label-md text-label-md transition-all duration-300 ${
              activeTab === 'COMPLETED'
                ? 'bg-primary text-on-primary shadow-lg font-bold'
                : 'text-text-secondary hover:text-primary'
            }`}
          >
            Completed History
          </button>
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-text-muted gap-3">
          <RotateCw className="w-8 h-8 animate-spin text-primary" />
          <span>Syncing orders dashboard...</span>
        </div>
      ) : activeTab === 'ACTIVE' ? (
        /* CONDITIONAL LAYOUT: Cook touch-friendly KDS vs Manager Kanban Board */
        userProfile?.role === 'cook' ? (
          /* Cook Touch KDS Layout */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-gutter items-start">
            
            {/* COLUMN 1: Active Preparation Queue */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-warning animate-pulse"></span>
                  <h3 className="font-headline-sm text-headline-sm">Kitchen Queue (To Cook)</h3>
                </div>
                <span className="bg-warning/10 text-warning px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length}
                </span>
              </div>

              <div className="max-h-[716px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length === 0 ? (
                  <div className="glass-card p-stack-md rounded-xl flex flex-col items-center justify-center text-text-muted text-center py-12">
                    <Coffee className="w-8 h-8 opacity-25 mb-2 text-primary" />
                    <span className="text-xs">No orders to cook! Take a break.</span>
                  </div>
                ) : (
                  orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').map(order => (
                    <div key={order.id} className={`glass-card p-5 rounded-3xl flex flex-col gap-3 group transition-all duration-300 border-l-4 ${order.status === 'PREPARING' ? 'border-l-primary bg-indigo-50/10' : 'border-l-warning bg-amber-50/5'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary font-label-md text-base">{order.order_number}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${order.status === 'PREPARING' ? 'bg-primary/10 text-primary' : 'bg-warning/10 text-warning'}`}>
                            {order.status}
                          </span>
                        </div>
                        <span className="text-xs text-text-muted font-semibold">{formatTime(order.created_at)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-text-primary text-lg">{order.student_name}</p>
                        <p className="text-xs text-text-muted font-mono">{order.student_roll}</p>
                      </div>
                      <div className="border-t border-dashed border-outline-variant/30 pt-3">
                        <ul className="space-y-2 text-body-lg text-text-secondary font-medium">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span className="text-base text-slate-800">{item.name} <span className="text-primary font-extrabold text-lg">x{item.quantity}</span></span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      {order.status === 'PENDING' ? (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                          className="glossy-amber text-white w-full py-4 rounded-2xl font-bold text-headline-sm mt-2 shadow-lg shadow-warning/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined">restaurant</span>
                          <span>Start Cooking</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'READY')}
                          className="glossy-primary text-white w-full py-4 rounded-2xl font-bold text-headline-sm mt-2 shadow-lg shadow-indigo-500/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined">check_circle</span>
                          <span>Mark Ready / Pickup</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: Servicing Queue (Ready for Pickup with per-order PIN & QR verification) */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success animate-pulse"></span>
                  <h3 className="font-headline-sm text-headline-sm">Ready for Collection</h3>
                </div>
                <span className="bg-success/10 text-success px-2.5 py-0.5 rounded-full text-xs font-bold">
                  {getFilteredOrders('READY').length}
                </span>
              </div>

              <div className="max-h-[716px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {getFilteredOrders('READY').length === 0 ? (
                  <div className="glass-card p-stack-md rounded-xl flex flex-col items-center justify-center text-text-muted text-center py-12">
                    <CheckCircle className="w-8 h-8 opacity-25 mb-2 text-success" />
                    <span className="text-xs">No orders waiting for pickup</span>
                  </div>
                ) : (
                  getFilteredOrders('READY').map(order => (
                    <div key={order.id} className="glass-card p-5 rounded-3xl flex flex-col gap-3 group transition-all duration-300 border-l-4 border-l-success">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-primary font-label-md text-base">{order.order_number}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            READY
                          </span>
                        </div>
                        <span className="text-xs text-text-muted font-semibold">{formatTime(order.created_at)}</span>
                      </div>
                      
                      <div>
                        <p className="font-bold text-text-primary text-lg">{order.student_name}</p>
                        <p className="text-xs text-text-muted font-mono">{order.student_roll}</p>
                      </div>

                      <div className="border-t border-dashed border-outline-variant/30 pt-2">
                        <ul className="space-y-1 text-sm text-text-secondary font-medium">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{item.name} <span className="text-primary font-bold">x{item.quantity}</span></span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Per-Order Verification Box */}
                      <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl flex flex-col gap-3 my-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-emerald-800">
                            <KeyRound className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Pickup PIN:</span>
                          </div>
                          <span className="text-2xl font-black tracking-widest text-emerald-700 font-mono bg-white px-3 py-0.5 rounded-lg border border-emerald-200 shadow-xs">
                            {order.pickup_code}
                          </span>
                        </div>

                        {/* Inline PIN Input + Verification Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2">
                          <div className="relative flex-1">
                            <input
                              type="text"
                              maxLength={4}
                              placeholder="Enter PIN"
                              value={pinInputs[order.id] || ''}
                              onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '');
                                setPinInputs(prev => ({ ...prev, [order.id]: val }));
                                if (val.length === 4) {
                                  handleVerifyOrderPin(order, val);
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleVerifyOrderPin(order);
                                }
                              }}
                              className="w-full px-3 py-2.5 text-center font-mono font-black text-base tracking-widest bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-inner text-emerald-950 placeholder:tracking-normal placeholder:font-sans placeholder:text-xs placeholder:text-slate-400"
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() => handleVerifyOrderPin(order)}
                            disabled={verifyingOrders[order.id]}
                            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                          >
                            {verifyingOrders[order.id] ? (
                              <RotateCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            <span>Verify PIN</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setTargetOrder(order);
                              setVerifyInput('');
                              setVerifyResult(null);
                              setVerifyMode('camera');
                              setIsVerifyModalOpen(true);
                            }}
                            className="px-3.5 py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0"
                            title={`Scan QR code for ${order.order_number}`}
                          >
                            <Camera className="w-4 h-4" />
                            <span>Scan QR</span>
                          </button>
                        </div>

                        {orderErrors[order.id] && (
                          <div className="flex items-center gap-1.5 text-rose-600 text-xs font-bold animate-shake bg-rose-50 p-2 rounded-xl border border-rose-200">
                            <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                            <span>{orderErrors[order.id]}</span>
                          </div>
                        )}

                        {orderSuccess[order.id] && (
                          <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-bold bg-emerald-100/70 p-2 rounded-xl border border-emerald-300">
                            <Check className="w-3.5 h-3.5 shrink-0" />
                            <span>{orderSuccess[order.id]}</span>
                          </div>
                        )}
                      </div>

                      {/* Optional Direct Complete Override */}
                      <button
                        onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                        className="text-slate-500 hover:text-slate-800 text-xs font-bold py-2 rounded-xl transition-all flex items-center justify-center gap-1 hover:bg-slate-100/60"
                        title="Manual complete without PIN verification"
                      >
                        <span>Direct Handover (Skip PIN)</span>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        ) : (
          /* Kanban Board Style for Active Orders (Admin / Manager) */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter items-start">
            
            {/* COLUMN 1: New / Pending */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">New / Pending</h3>
                </div>
                <HeroChip variant="warning" size="sm">
                  {getFilteredOrders('PENDING').length}
                </HeroChip>
              </div>
              
              <div className="max-h-[716px] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {getFilteredOrders('PENDING').length === 0 ? (
                  <div className="bg-white border border-slate-200/80 p-6 rounded-3xl flex flex-col items-center justify-center text-slate-400 text-center py-12">
                    <Coffee className="w-8 h-8 opacity-30 mb-2 text-indigo-600" />
                    <span className="text-xs font-semibold">No pending orders</span>
                  </div>
                ) : (
                  getFilteredOrders('PENDING').map(order => (
                    <SpotlightCard key={order.id} className="p-5 flex flex-col gap-3.5 border-l-4 border-l-amber-500 shadow-md">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-base text-indigo-600 font-mono">{order.order_number}</span>
                        <span className="text-[11px] font-mono text-slate-400">{formatTime(order.created_at)}</span>
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-900">{order.student_name}</p>
                        <p className="text-xs font-mono text-slate-500">{order.student_roll}</p>
                      </div>
                      <div className="border-t border-dashed border-slate-200 pt-2.5">
                        <ul className="space-y-1 text-xs text-slate-700 font-medium">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{item.name} <span className="text-indigo-600 font-black">×{item.quantity}</span></span>
                              <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex justify-between items-center mt-1 border-t border-slate-100 pt-2.5">
                        <span className="text-xs font-bold text-slate-500">Total</span>
                        <span className="font-black text-base text-indigo-600">₹{order.total_price}</span>
                      </div>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">restaurant</span>
                        <span>Accept & Cook</span>
                      </button>
                    </SpotlightCard>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: In Kitchen / Preparing */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse"></span>
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">In Kitchen</h3>
                </div>
                <HeroChip variant="primary" size="sm">
                  {getFilteredOrders('PREPARING').length}
                </HeroChip>
              </div>

              <div className="max-h-[716px] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {getFilteredOrders('PREPARING').length === 0 ? (
                  <div className="bg-white border border-slate-200/80 p-6 rounded-3xl flex flex-col items-center justify-center text-slate-400 text-center py-12">
                    <Clock className="w-8 h-8 opacity-30 mb-2 text-indigo-600" />
                    <span className="text-xs font-semibold">No active orders in kitchen</span>
                  </div>
                ) : (
                  getFilteredOrders('PREPARING').map(order => (
                    <SpotlightCard key={order.id} className="p-5 flex flex-col gap-3.5 border-l-4 border-l-indigo-600 shadow-md">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-base text-indigo-600 font-mono">{order.order_number}</span>
                        <span className="text-[11px] font-mono text-indigo-600 font-bold">{formatTime(order.created_at)}</span>
                      </div>
                      <div>
                        <p className="font-black text-sm text-slate-900">{order.student_name}</p>
                        <p className="text-xs font-mono text-slate-500">{order.student_roll}</p>
                      </div>
                      <div className="border-t border-dashed border-slate-200 pt-2.5">
                        <ul className="space-y-1 text-xs text-slate-700 font-medium">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{item.name} <span className="text-indigo-600 font-black">×{item.quantity}</span></span>
                              <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex justify-between items-center mt-1 border-t border-slate-100 pt-2.5">
                        <span className="text-xs font-bold text-slate-500">Total</span>
                        <span className="font-black text-base text-indigo-600">₹{order.total_price}</span>
                      </div>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        className="w-full py-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Mark Ready for Pickup</span>
                      </button>
                    </SpotlightCard>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 3: Ready for Collection (Per-Order Verification on each card) */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="font-black text-sm text-slate-900 uppercase tracking-wider">Ready for Collection</h3>
                </div>
                <HeroChip variant="success" size="sm">
                  {getFilteredOrders('READY').length}
                </HeroChip>
              </div>

              <div className="max-h-[716px] overflow-y-auto space-y-4 pr-1 custom-scrollbar">
                {getFilteredOrders('READY').length === 0 ? (
                  <div className="bg-white border border-slate-200/80 p-6 rounded-3xl flex flex-col items-center justify-center text-slate-400 text-center py-12">
                    <CheckCircle className="w-8 h-8 opacity-30 mb-2 text-emerald-600" />
                    <span className="text-xs font-semibold">No orders waiting for pickup</span>
                  </div>
                ) : (
                  getFilteredOrders('READY').map(order => (
                    <SpotlightCard key={order.id} className="p-5 flex flex-col gap-3.5 border-l-4 border-l-emerald-500 shadow-md">
                      <div className="flex justify-between items-start">
                        <span className="font-black text-base text-indigo-600 font-mono">{order.order_number}</span>
                        <span className="text-[11px] font-mono text-slate-400">{formatTime(order.created_at)}</span>
                      </div>
                      
                      <div>
                        <p className="font-black text-sm text-slate-900">{order.student_name}</p>
                        <p className="text-xs font-mono text-slate-500">{order.student_roll}</p>
                      </div>
                      
                      <div className="border-t border-dashed border-slate-200 pt-2.5">
                        <ul className="space-y-1 text-xs text-slate-700 font-medium">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{item.name} <span className="text-indigo-600 font-black">×{item.quantity}</span></span>
                              <span className="font-bold text-slate-900">₹{item.price * item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Per-Order Verification Widget */}
                      <div className="bg-emerald-50/80 border border-emerald-200 py-3 px-3.5 rounded-2xl flex flex-col gap-2.5 shadow-inner">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-emerald-800 font-extrabold tracking-wider uppercase">Pickup PIN:</span>
                          <span className="text-lg font-black tracking-widest text-emerald-700 font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-300">
                            {order.pickup_code}
                          </span>
                        </div>

                        {/* PIN input + verify + QR buttons */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            maxLength={4}
                            placeholder="PIN"
                            value={pinInputs[order.id] || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, '');
                              setPinInputs(prev => ({ ...prev, [order.id]: val }));
                              if (val.length === 4) {
                                handleVerifyOrderPin(order, val);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleVerifyOrderPin(order);
                              }
                            }}
                            className="w-16 px-2 py-2 text-center font-mono font-black text-sm tracking-wider bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-emerald-950 placeholder:font-sans placeholder:text-xs placeholder:text-slate-400"
                          />
                          <button
                            type="button"
                            onClick={() => handleVerifyOrderPin(order)}
                            disabled={verifyingOrders[order.id]}
                            className="flex-1 py-2 px-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            {verifyingOrders[order.id] ? (
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                            <span>Verify</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setTargetOrder(order);
                              setVerifyInput('');
                              setVerifyResult(null);
                              setVerifyMode('camera');
                              setIsVerifyModalOpen(true);
                            }}
                            className="py-2 px-2.5 rounded-xl font-bold text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1 shrink-0"
                            title={`Scan QR code for ${order.order_number}`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Scan</span>
                          </button>
                        </div>

                        {orderErrors[order.id] && (
                          <p className="text-[11px] font-bold text-rose-600 animate-pulse">{orderErrors[order.id]}</p>
                        )}
                        {orderSuccess[order.id] && (
                          <p className="text-[11px] font-bold text-emerald-700">{orderSuccess[order.id]}</p>
                        )}
                      </div>

                      <button
                        onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                        className="text-slate-400 hover:text-slate-700 text-[11px] font-bold py-1.5 rounded-xl transition-all flex items-center justify-center gap-1 hover:bg-slate-100/60"
                        title="Manual complete without verification"
                      >
                        <span>Direct Handover (Skip PIN)</span>
                      </button>
                    </SpotlightCard>
                  ))
                )}
              </div>
            </div>

          </div>
        )
      ) : (
        /* Completed History Section */
        <section className="glass-card rounded-3xl overflow-hidden">
          <div className="overflow-x-auto">
            {getFilteredOrders('COMPLETED').length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-text-muted text-center">
                <FileText className="w-12 h-12 opacity-25 mb-3 text-primary" />
                <span className="text-sm font-semibold">No completed orders yet</span>
                <span className="text-xs text-text-muted mt-1">Orders marked as Paid & Collected will show up here</span>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-outline-variant/20">
                    <th className="px-gutter py-stack-lg font-label-md text-label-md text-text-muted uppercase tracking-wider">Order Num</th>
                    <th className="px-gutter py-stack-lg font-label-md text-label-md text-text-muted uppercase tracking-wider">Student Detail</th>
                    <th className="px-gutter py-stack-lg font-label-md text-label-md text-text-muted uppercase tracking-wider">Food Items</th>
                    <th className="px-gutter py-stack-lg font-label-md text-label-md text-text-muted uppercase tracking-wider text-right">Price</th>
                    <th className="px-gutter py-stack-lg font-label-md text-label-md text-text-muted uppercase tracking-wider text-center">Pickup Time</th>
                    <th className="px-gutter py-stack-lg font-label-md text-label-md text-text-muted uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {getFilteredOrders('COMPLETED').map((order) => (
                    <tr key={order.id} className="hover:bg-white/20 swoosh-transition group">
                      <td className="px-gutter py-stack-lg">
                        <span className="font-headline-sm text-headline-sm text-text-primary font-bold">{order.order_number}</span>
                      </td>
                      <td className="px-gutter py-stack-lg">
                        <div className="flex flex-col">
                          <span className="font-label-md text-label-md text-text-primary font-bold">{order.student_name}</span>
                          <span className="font-body-sm text-body-sm text-text-muted">{order.student_roll}</span>
                        </div>
                      </td>
                      <td className="px-gutter py-stack-lg">
                        <span className="font-body-md text-body-md text-text-secondary">
                          {order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                        </span>
                      </td>
                      <td className="px-gutter py-stack-lg text-right">
                        <span className="font-headline-sm text-headline-sm text-text-primary font-bold">₹{order.total_price}</span>
                      </td>
                      <td className="px-gutter py-stack-lg text-center font-body-sm text-text-muted">
                        {formatTime(order.created_at)}
                      </td>
                      <td className="px-gutter py-stack-lg text-center">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-success/20 bg-success/10 text-success">
                          <CheckCheck className="w-3.5 h-3.5" /> Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      )}

      {/* QR Pickup Verification Modal with Live Camera Scanner & Auto-Detection */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in">
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-primary leading-none">
                    {targetOrder ? `Verify Order ${targetOrder.order_number}` : 'Order QR Scanner & Verification'}
                  </h3>
                  <p className="text-xs text-text-muted mt-1">
                    {targetOrder 
                      ? `Student: ${targetOrder.student_name} (${targetOrder.student_roll})`
                      : 'Scan student QR code or enter 4-digit PIN'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  setTargetOrder(null);
                }}
                className="p-2 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Mode Selector Tabs */}
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-2xl">
              <button
                type="button"
                onClick={() => setVerifyMode('camera')}
                className={`py-2.5 rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  verifyMode === 'camera'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Live Camera Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => setVerifyMode('manual')}
                className={`py-2.5 rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  verifyMode === 'manual'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Keyboard className="w-4 h-4" />
                <span>Manual PIN / Code</span>
              </button>
            </div>

            {/* Mode 1: Live Camera Scan View with Continuous Auto-Detection */}
            {verifyMode === 'camera' ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover" 
                    playsInline 
                    muted 
                    autoPlay
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scanning Viewfinder Frame */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className={`w-52 h-52 border-2 rounded-2xl relative transition-all duration-300 ${
                      scannerDetected 
                        ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_30px_rgba(52,211,153,0.8)] scale-105' 
                        : 'border-emerald-400/80 shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-pulse'
                    }`}>
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>
                      
                      {/* Laser scanning line */}
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-bounce"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-2 inset-x-0 text-center">
                    <span className="px-3.5 py-1 bg-black/70 backdrop-blur-md rounded-full text-[11px] text-emerald-300 font-bold border border-emerald-500/30">
                      {scannerDetected ? '✓ QR Code Detected! Verifying...' : 'Point camera at student QR code'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Manual PIN / Code Input */
              <div className="space-y-3">
                <label className="font-label-md text-xs font-bold text-slate-700 block">
                  {targetOrder ? `Enter 4-Digit PIN for Order ${targetOrder.order_number}` : 'Enter 4-Digit Pickup PIN, Order Number, or Scanned Payload'}
                </label>
                <input
                  type="text"
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder={targetOrder ? `e.g. ${targetOrder.pickup_code}` : 'e.g. 4821 or #1005 or {"order_id": "..."}'}
                  className="w-full px-4 py-3.5 bg-white border border-slate-300 rounded-2xl text-base font-mono focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none shadow-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleVerifyPickup();
                    }
                  }}
                />
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Press Enter or click Verify below</span>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setVerifyInput(text);
                        handleVerifyPickup(text);
                      } catch (e) {
                        alert('Could not access clipboard');
                      }
                    }}
                    className="text-primary hover:underline font-bold flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_paste</span>
                    <span>Paste Clipboard</span>
                  </button>
                </div>
              </div>
            )}

            {/* Verification Result Feedback Overlay */}
            {verifyResult && (
              <div className={`p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 animate-in ${
                verifyResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-800'
              }`}>
                <span className="material-symbols-outlined text-[24px] shrink-0">
                  {verifyResult.success ? 'check_circle' : 'error'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm leading-tight">{verifyResult.success ? 'Verified Successfully!' : 'Verification Failed'}</p>
                  <p className="text-xs mt-0.5 opacity-90">{verifyResult.message}</p>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsVerifyModalOpen(false);
                  setTargetOrder(null);
                }}
                className="px-5 py-2.5 rounded-2xl font-label-md text-xs text-text-secondary bg-slate-100 hover:bg-slate-200 transition-all font-bold"
              >
                Close
              </button>
              {verifyMode === 'manual' && (
                <button
                  type="button"
                  onClick={() => handleVerifyPickup()}
                  disabled={isVerifying || !verifyInput.trim()}
                  className="px-6 py-2.5 rounded-2xl font-label-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-md transition-all flex items-center gap-2"
                >
                  {isVerifying ? (
                    <>
                      <RotateCw className="w-4 h-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[16px]">verified</span>
                      Verify Pickup
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
