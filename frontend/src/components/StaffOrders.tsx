import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import jsQR from 'jsqr';
import { socket } from '../utils/socket.js';
import { Clock, Coffee, RotateCw, CheckCircle, ShieldAlert, FileText, CheckCheck, Camera, Keyboard } from 'lucide-react';
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

  // QR Pickup Verification State & Camera Scanner
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState<boolean>(false);
  const [verifyMode, setVerifyMode] = useState<'camera' | 'manual'>('camera');
  const [verifyInput, setVerifyInput] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

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

  const handleVerifyPickup = async (inputVal?: string) => {
    const val = inputVal !== undefined ? inputVal : verifyInput;
    if (!val.trim()) return;
    try {
      setIsVerifying(true);
      setVerifyResult(null);

      let bodyData: any = {};
      const trimmed = val.trim();
      if (trimmed.startsWith('{')) {
        bodyData = { qr_data: trimmed };
      } else {
        bodyData = { order_id: trimmed, pickup_code: trimmed };
      }

      const res = await fetch(`${API_BASE_URL}/api/orders/verify-pickup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setVerifyResult({ success: true, message: data.message || 'Pickup verified & completed!' });
        fetchOrders(selectedAdminCanteenId);
      } else {
        setVerifyResult({ success: false, message: data.error || 'Verification failed.' });
      }
    } catch (err: any) {
      setVerifyResult({ success: false, message: err?.message || 'Connection error' });
    } finally {
      setIsVerifying(false);
    }
  };

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
      return;
    }

    let active = true;

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
        });
        if (!active) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }
        mediaStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute('playsinline', 'true');
          await videoRef.current.play();
        }

        const scanFrame = () => {
          if (!active) return;
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'dontInvert'
              });

              if (code && code.data) {
                setVerifyInput(code.data);
                handleVerifyPickup(code.data);
                setTimeout(() => {
                  if (active) {
                    animFrameRef.current = requestAnimationFrame(scanFrame);
                  }
                }, 2500);
                return;
              }
            }
          }
          animFrameRef.current = requestAnimationFrame(scanFrame);
        };

        animFrameRef.current = requestAnimationFrame(scanFrame);
      } catch (err: any) {
        console.error('Camera access error:', err);
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
  }, [isVerifyModalOpen, verifyMode]);

  const getFilteredOrders = (status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED') => {
    return orders.filter(o => o.status === status);
  };

  // Helper to format date relative or short
  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-stack-lg mb-stack-lg border-b border-outline-variant/20 pb-6">
        <div className="space-y-stack-sm">
          <h1 className="font-headline-xl text-headline-xl text-text-primary tracking-tight">
            {userProfile?.role === 'admin' 
              ? 'Campus Administrator Portal' 
              : `${canteens.find(c => c.id === selectedAdminCanteenId)?.name || canteenName || 'Canteen'} Dashboard`}
          </h1>
          <p className="font-body-lg text-body-lg text-text-secondary">
            {userProfile?.role === 'admin' 
              ? 'Manage orders and menus across all campus food outlets' 
              : `Logged in as ${userProfile?.role?.toUpperCase()} | View and process order queues`}
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
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-white/40 border border-white/60 p-2 rounded-2xl backdrop-blur-md shadow-sm self-start md:self-auto">
              <span className="material-symbols-outlined text-slate-400 text-[20px] ml-1">storefront</span>
              <select
                value={selectedAdminCanteenId}
                onChange={(e) => setSelectedAdminCanteenId(e.target.value)}
                className="bg-transparent border-none rounded-xl px-2 py-1 font-label-md text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="">All Canteens</option>
                {canteens.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <button
              onClick={() => {
                const current = canteens.find(c => c.id === selectedAdminCanteenId);
                const slug = current?.slug || selectedAdminCanteenId || 'canteen-a';
                const url = `${window.location.origin}/c/${slug}`;
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
                setIsVerifyModalOpen(true);
                setVerifyInput('');
                setVerifyResult(null);
              }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-2xl font-label-md text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all shadow-md active:scale-95"
              title="Scan or enter QR verification code"
            >
              <span className="material-symbols-outlined text-[16px]">qr_code_scanner</span>
              <span>Verify Pickup QR</span>
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

            {/* COLUMN 2: Servicing Queue (Ready for Pickup) */}
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
                        <span className="font-bold text-primary font-label-md text-base">{order.order_number}</span>
                        <span className="text-xs text-text-muted font-semibold">{formatTime(order.created_at)}</span>
                      </div>
                      
                      {/* Bold verification code */}
                      <div className="bg-success/5 border border-success/20 py-2.5 px-4 rounded-2xl text-center flex flex-col items-center shadow-inner my-1">
                        <span className="text-[10px] text-success font-bold tracking-wider uppercase">Pickup Code</span>
                        <span className="text-2xl font-black tracking-widest text-success mt-0.5 font-mono">{order.pickup_code}</span>
                      </div>

                      <div>
                        <p className="font-bold text-text-primary text-lg">{order.student_name}</p>
                      </div>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                        className="glossy-emerald text-white w-full py-4 rounded-2xl font-bold text-headline-sm mt-2 shadow-lg shadow-success/10 hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                      >
                        <span className="material-symbols-outlined">done_all</span>
                        <span>Deliver & Complete</span>
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
                  <span className="w-3 h-3 rounded-full bg-warning"></span>
                  <h3 className="font-headline-sm text-headline-sm">New / Pending</h3>
                </div>
                <span className="bg-surface-container text-text-muted px-2 py-0.5 rounded-lg text-label-sm">
                  {getFilteredOrders('PENDING').length}
                </span>
              </div>
              
              <div className="max-h-[716px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {getFilteredOrders('PENDING').length === 0 ? (
                  <div className="glass-card p-stack-md rounded-xl flex flex-col items-center justify-center text-text-muted text-center py-12">
                    <Coffee className="w-8 h-8 opacity-20 mb-2 text-primary" />
                    <span className="text-xs">No pending orders</span>
                  </div>
                ) : (
                  getFilteredOrders('PENDING').map(order => (
                    <div key={order.id} className="glass-card p-stack-md rounded-xl flex flex-col gap-3 group hover:shadow-2xl transition-shadow duration-300">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-primary font-label-md">{order.order_number}</span>
                        <span className="text-label-sm text-text-muted">{formatTime(order.created_at)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-text-primary">{order.student_name}</p>
                        <p className="text-label-sm text-text-muted font-mono">{order.student_roll}</p>
                      </div>
                      <div className="border-t border-dashed border-outline-variant/30 pt-3">
                        <ul className="space-y-1 text-body-sm text-text-secondary">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{item.name} <span className="text-primary font-bold">x{item.quantity}</span></span>
                              <span>₹{item.price * item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex justify-between items-center mt-1 border-t border-dashed border-outline-variant/30 pt-3">
                        <span className="font-label-md">Total</span>
                        <span className="font-bold text-lg text-primary">₹{order.total_price}</span>
                      </div>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                        className="glossy-amber text-white w-full py-3 rounded-xl font-label-md mt-2 shadow-lg shadow-warning/20 hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                        Accept & Cook
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 2: In Kitchen / Preparing */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-primary animate-pulse"></span>
                  <h3 className="font-headline-sm text-headline-sm">In Kitchen</h3>
                </div>
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg text-label-sm">
                  {getFilteredOrders('PREPARING').length}
                </span>
              </div>

              <div className="max-h-[716px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {getFilteredOrders('PREPARING').length === 0 ? (
                  <div className="glass-card p-stack-md rounded-xl flex flex-col items-center justify-center text-text-muted text-center py-12">
                    <Clock className="w-8 h-8 opacity-20 mb-2 text-primary" />
                    <span className="text-xs">No active orders in kitchen</span>
                  </div>
                ) : (
                  getFilteredOrders('PREPARING').map(order => (
                    <div key={order.id} className="glass-card p-stack-md rounded-xl flex flex-col gap-3 border-l-4 border-l-primary group hover:shadow-2xl transition-shadow duration-300">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-primary font-label-md">{order.order_number}</span>
                        <span className="text-label-sm text-primary font-bold">{formatTime(order.created_at)}</span>
                      </div>
                      <div>
                        <p className="font-bold text-text-primary">{order.student_name}</p>
                        <p className="text-label-sm text-text-muted font-mono">{order.student_roll}</p>
                      </div>
                      <div className="border-t border-dashed border-outline-variant/30 pt-3">
                        <ul className="space-y-1 text-body-sm text-text-secondary">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{item.name} <span className="text-primary font-bold">x{item.quantity}</span></span>
                              <span>₹{item.price * item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex justify-between items-center mt-1 border-t border-dashed border-outline-variant/30 pt-3">
                        <span className="font-label-md">Total</span>
                        <span className="font-bold text-lg text-primary">₹{order.total_price}</span>
                      </div>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'READY')}
                        className="glossy-primary text-white w-full py-3 rounded-xl font-label-md mt-2 shadow-lg shadow-indigo-500/20 hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                        Mark Ready for Pickup
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* COLUMN 3: Ready for Collection */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between px-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-success"></span>
                  <h3 className="font-headline-sm text-headline-sm">Ready for Collection</h3>
                </div>
                <span className="bg-success/10 text-success px-2 py-0.5 rounded-lg text-label-sm">
                  {getFilteredOrders('READY').length}
                </span>
              </div>

              <div className="max-h-[716px] overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                {getFilteredOrders('READY').length === 0 ? (
                  <div className="glass-card p-stack-md rounded-xl flex flex-col items-center justify-center text-text-muted text-center py-12">
                    <CheckCircle className="w-8 h-8 opacity-20 mb-2 text-success" />
                    <span className="text-xs">No orders waiting for pickup</span>
                  </div>
                ) : (
                  getFilteredOrders('READY').map(order => (
                    <div key={order.id} className="glass-card p-stack-md rounded-xl flex flex-col gap-3 group hover:shadow-2xl transition-shadow duration-300">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-primary font-label-md">{order.order_number}</span>
                        <span className="text-label-sm text-text-muted">{formatTime(order.created_at)}</span>
                      </div>
                      
                      {/* Bold verification code */}
                      <div className="bg-white/45 border border-outline-variant/30 py-2 px-3 rounded-lg text-center flex flex-col items-center shadow-inner">
                        <span className="text-[10px] text-text-secondary font-semibold tracking-wide uppercase">Pickup Code</span>
                        <span className="text-xl font-bold tracking-widest text-primary mt-0.5 font-mono">{order.pickup_code}</span>
                      </div>

                      <div>
                        <p className="font-bold text-text-primary">{order.student_name}</p>
                        <p className="text-label-sm text-text-muted font-mono">{order.student_roll}</p>
                      </div>
                      <div className="border-t border-dashed border-outline-variant/30 pt-3">
                        <ul className="space-y-1 text-body-sm text-text-secondary">
                          {order.items.map((item, idx) => (
                            <li key={idx} className="flex justify-between">
                              <span>{item.name} <span className="text-primary font-bold">x{item.quantity}</span></span>
                              <span>₹{item.price * item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex justify-between items-center mt-1 border-t border-dashed border-outline-variant/30 pt-3">
                        <span className="font-label-md">Total</span>
                        <span className="font-bold text-lg text-primary">₹{order.total_price}</span>
                      </div>
                      <button
                        onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                        className="glossy-emerald text-white w-full py-3 rounded-xl font-label-md mt-2 shadow-lg shadow-success/20 hover:brightness-110 active:scale-[0.98] transition-all"
                      >
                        Paid & Collected
                      </button>
                    </div>
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

      {/* QR Pickup Verification Modal with Live Camera Scanner */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white/95 backdrop-blur-2xl border border-white rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in">
            <div className="flex justify-between items-center border-b border-outline-variant/20 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold shadow-sm">
                  <span className="material-symbols-outlined text-[22px]">qr_code_scanner</span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-primary leading-none">Order QR Scanner & Verification</h3>
                  <p className="text-xs text-text-muted mt-1">Scan student device QR code or enter OTP</p>
                </div>
              </div>
              <button 
                onClick={() => setIsVerifyModalOpen(false)}
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
                className={`py-2 rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  verifyMode === 'camera'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>Camera Scanner</span>
              </button>
              <button
                type="button"
                onClick={() => setVerifyMode('manual')}
                className={`py-2 rounded-xl font-label-md text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  verifyMode === 'manual'
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Keyboard className="w-4 h-4" />
                <span>Manual OTP / Code</span>
              </button>
            </div>

            {/* Mode 1: Live Camera Scan View */}
            {verifyMode === 'camera' ? (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video flex items-center justify-center border border-slate-800 shadow-inner">
                  <video 
                    ref={videoRef} 
                    className="w-full h-full object-cover" 
                    playsInline 
                    muted 
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scanning Viewfinder Frame */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-emerald-400 rounded-2xl relative shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-pulse">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl"></div>
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl"></div>
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl"></div>
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-emerald-500 rounded-br-xl"></div>
                      <div className="absolute inset-0 bg-emerald-500/5 rounded-2xl"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-2 inset-x-0 text-center">
                    <span className="px-3 py-1 bg-black/60 backdrop-blur-md rounded-full text-[10px] text-emerald-300 font-semibold border border-emerald-500/20">
                      Align student QR inside frame
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              /* Mode 2: Manual Code Input */
              <div className="space-y-3">
                <label className="font-label-md text-xs text-text-secondary block">
                  Paste Scanned QR JSON Payload or Enter Pickup OTP / Order ID
                </label>
                <textarea
                  rows={4}
                  value={verifyInput}
                  onChange={(e) => setVerifyInput(e.target.value)}
                  placeholder='e.g. {"order_id": "ord_...", "pickup_code": "1234", "signature": "..."} or 1234'
                  className="w-full px-4 py-3 bg-white border border-outline-variant/40 rounded-2xl text-xs font-mono focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 outline-none resize-none shadow-sm"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText();
                        setVerifyInput(text);
                        handleVerifyPickup(text);
                      } catch (e) {
                        alert('Could not read clipboard');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-all flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">content_paste</span>
                    <span>Paste Clipboard & Verify</span>
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
                onClick={() => setIsVerifyModalOpen(false)}
                className="px-5 py-2.5 rounded-2xl font-label-md text-xs text-text-secondary bg-slate-100 hover:bg-slate-200 transition-all"
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
