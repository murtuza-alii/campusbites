import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket.js';
import { 
  RotateCw, 
  CheckCircle, 
  ShieldAlert, 
  Search, 
  X, 
  ChefHat, 
  PackageCheck, 
  Store, 
  Link as LinkIcon, 
  ChevronDown, 
  ChevronUp, 
  Flame, 
  Clock, 
  CheckCheck,
  User,
  Phone,
  Sparkles,
  Ban
} from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';
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
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  pickup_code: string;
  created_at: string;
}

export function StaffOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  // Dual-tab operational view: 'KITCHEN' (Cook view) or 'COUNTER' (Pickup & PIN handover view)
  const [activeTab, setActiveTab] = useState<'KITCHEN' | 'COUNTER'>('KITCHEN');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Collapsible Kitchen Sections
  const [isToPrepareOpen, setIsToPrepareOpen] = useState<boolean>(true);
  const [isCookingOpen, setIsCookingOpen] = useState<boolean>(true);

  // Collapsible Counter History
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  // Hovering Confirmation Modal for Verified PIN Handover
  const [verifiedOrderModal, setVerifiedOrderModal] = useState<Order | null>(null);

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

  // Audio tone feedback on successful action
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
    } catch {
      console.log('Audio tone error');
    }
  }, []);

  const prevPendingCount = useRef<number>(0);

  const fetchCanteens = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/canteens`);
      if (response.ok) {
        const data = await response.json();
        setCanteens(data);
      }
    } catch {
      console.error('Failed to load canteens list');
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

        const currentPendingCount = data.filter((o: Order) => o.status === 'PENDING').length;
        if (currentPendingCount > prevPendingCount.current) {
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/1018/1018-500.wav');
            audio.volume = 0.5;
            audio.play();
          } catch {
            console.log('Audio alert blocked');
          }
        }
        prevPendingCount.current = currentPendingCount;

      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('staffToken');
        navigate('/staff/login');
      } else {
        setError('Failed to fetch orders from server.');
      }
    } catch {
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
        setSelectedAdminCanteenId(decoded.canteenId);
        fetch(`${API_BASE_URL}/api/canteens`)
          .then(res => res.json())
          .then(data => {
            const match = data.find((c: any) => c.id === decoded.canteenId);
            if (match) setCanteenName(match.name);
          })
          .catch(() => {});
      }
    }

    fetchOrders(decoded?.canteenId || undefined);

    socket.emit('joinAdmin');

    const handleOrderCreated = () => {
      fetchOrders();
    };

    const handleOrderStatusChanged = () => {
      fetchOrders();
    };

    socket.on('orderCreated', handleOrderCreated);
    socket.on('orderStatusChanged', handleOrderStatusChanged);

    return () => {
      socket.off('orderCreated', handleOrderCreated);
      socket.off('orderStatusChanged', handleOrderStatusChanged);
    };
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED') => {
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
        playSuccessTone();
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId ? { ...order, status: newStatus } : order
          )
        );
      } else {
        alert('Failed to update status.');
      }
    } catch {
      alert('Network error.');
    }
  };

  // Cancel order (e.g. customer taking too long or abandoned order)
  const handleCancelOrder = async (order: Order) => {
    const confirmCancel = window.confirm(
      `Cancel Order ${order.order_number} (${order.student_name})?\n\nThe student will immediately be notified that the order has been cancelled.`
    );
    if (!confirmCancel) return;
    await updateOrderStatus(order.id, 'CANCELLED');
  };

  // Strictly authenticate handover using alphanumeric pickup code with Modal confirmation cue
  const handleVerifyOrderPin = async (order: Order, pinOverride?: string) => {
    const pin = (pinOverride !== undefined ? pinOverride : pinInputs[order.id] || '').trim().toUpperCase();
    if (!pin || pin.length < 3) {
      setOrderErrors(prev => ({ ...prev, [order.id]: 'Enter pickup code (e.g. 7K9P)' }));
      return;
    }

    try {
      setVerifyingOrders(prev => ({ ...prev, [order.id]: true }));
      setOrderErrors(prev => ({ ...prev, [order.id]: '' }));

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
        // Open the clear hovering confirmation window
        setVerifiedOrderModal(order);
        setPinInputs(prev => ({ ...prev, [order.id]: '' }));
      } else {
        setOrderErrors(prev => ({ ...prev, [order.id]: data.error || 'Incorrect PIN' }));
      }
    } catch (err: any) {
      setOrderErrors(prev => ({ ...prev, [order.id]: err.message || 'Connection failed' }));
    } finally {
      setVerifyingOrders(prev => ({ ...prev, [order.id]: false }));
    }
  };

  // Closes the verified order modal and marks order completed in state
  const handleCloseVerifiedModal = () => {
    if (!verifiedOrderModal) return;
    const completedOrderId = verifiedOrderModal.id;
    setOrders(prev => prev.map(o => o.id === completedOrderId ? { ...o, status: 'COMPLETED' } : o));
    setVerifiedOrderModal(null);
    setTimeout(() => {
      fetchOrders(selectedAdminCanteenId);
    }, 400);
  };

  // Permanent Immutability: Deletion is strictly prohibited for staff accounts.

  const formatElapsed = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    return `${diffHrs}h ago`;
  };

  const userCanteen = canteens.find(c => c.id === userProfile?.canteenId);
  const currentCanteenObj = canteens.find(c => c.id === selectedAdminCanteenId) || userCanteen;

  // Split kitchen orders into PENDING (To Prepare) and PREPARING (Cooking in Progress)
  const pendingOrders = useMemo(() => {
    return orders.filter(o => o.status === 'PENDING');
  }, [orders]);

  const preparingOrders = useMemo(() => {
    return orders.filter(o => o.status === 'PREPARING');
  }, [orders]);

  const readyOrders = useMemo(() => {
    return orders.filter(o => o.status === 'READY');
  }, [orders]);

  // Combined completed and cancelled orders for history
  const historyOrders = useMemo(() => {
    return orders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED');
  }, [orders]);

  // 🍳 LIVE AGGREGATED BATCH PREP SUMMARY (Aggregated across both pending & preparing)
  const batchPrepSummary = useMemo(() => {
    const summary: Record<string, number> = {};
    let totalItemCount = 0;
    [...pendingOrders, ...preparingOrders].forEach(order => {
      order.items.forEach(item => {
        summary[item.name] = (summary[item.name] || 0) + item.quantity;
        totalItemCount += item.quantity;
      });
    });
    return { summary, totalItemCount };
  }, [pendingOrders, preparingOrders]);

  // Filter pending orders by search
  const filteredPendingOrders = useMemo(() => {
    if (!searchQuery.trim()) return pendingOrders;
    const q = searchQuery.toLowerCase().trim();
    return pendingOrders.filter(o => 
      o.order_number.toLowerCase().includes(q) ||
      o.items.some(i => i.name.toLowerCase().includes(q))
    );
  }, [pendingOrders, searchQuery]);

  // Filter preparing orders by search
  const filteredPreparingOrders = useMemo(() => {
    if (!searchQuery.trim()) return preparingOrders;
    const q = searchQuery.toLowerCase().trim();
    return preparingOrders.filter(o => 
      o.order_number.toLowerCase().includes(q) ||
      o.items.some(i => i.name.toLowerCase().includes(q))
    );
  }, [preparingOrders, searchQuery]);

  // Filter ready orders by search
  const filteredReadyOrders = useMemo(() => {
    if (!searchQuery.trim()) return readyOrders;
    const q = searchQuery.toLowerCase().trim();
    return readyOrders.filter(o => 
      o.order_number.toLowerCase().includes(q) ||
      o.student_name.toLowerCase().includes(q) ||
      o.student_roll.toLowerCase().includes(q) ||
      o.pickup_code.toLowerCase().includes(q)
    );
  }, [readyOrders, searchQuery]);

  return (
    <div className="flex-1 flex flex-col gap-4 animate-in pb-16">
      
      {/* 1. Header & Canteen Info (Strictly locked to assigned canteen for cooks/managers) */}
      <header className="bg-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              {currentCanteenObj?.name || canteenName || 'Canteen'} Portal
            </h1>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full text-[10px] font-black uppercase tracking-wider">
              {userProfile?.role === 'cook' ? 'Cook Terminal' : userProfile?.role === 'admin' ? 'Master Admin' : 'Staff Terminal'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Live Kitchen Queue & Counter PIN Verification</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold animate-pulse">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Canteen Switcher: ONLY VISIBLE TO MASTER ADMIN (Cooks are locked to their own outlet) */}
        <div className="flex items-center gap-2 shrink-0">
          {userProfile?.role === 'admin' && canteens.length > 1 && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
              <Store className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedAdminCanteenId}
                onChange={(e) => {
                  setSelectedAdminCanteenId(e.target.value);
                  fetchOrders(e.target.value);
                }}
                className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">All Outlets</option>
                {canteens.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => {
              const current = canteens.find(c => c.id === (selectedAdminCanteenId || userProfile?.canteenId));
              let url = window.location.origin;
              if (current?.slug) url += `/c/${current.slug}`;
              else url += `/c/mithibai-main-campus`;
              navigator.clipboard.writeText(url);
              alert(`Student menu URL copied:\n${url}`);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all active:scale-95 shadow-xs"
            title="Copy student direct menu link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Menu Link</span>
          </button>
        </div>
      </header>

      {/* 2. DUAL-TAB OPERATIONAL SWITCHER (KITCHEN QUEUE vs COUNTER PICKUP) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
        <div className="inline-flex p-1 bg-slate-200/90 rounded-2xl shadow-inner select-none">
          <button
            onClick={() => setActiveTab('KITCHEN')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === 'KITCHEN'
                ? 'bg-white text-amber-700 shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChefHat className="w-4 h-4 text-amber-600" />
            <span>🍳 Kitchen Queue</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
              {pendingOrders.length + preparingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('COUNTER')}
            className={`flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
              activeTab === 'COUNTER'
                ? 'bg-white text-emerald-700 shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackageCheck className="w-4 h-4 text-emerald-600" />
            <span>📦 Counter Pickup</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
              {readyOrders.length}
            </span>
          </button>
        </div>

        {/* Instant Search Bar */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'KITCHEN' ? "Search Ticket # or Dish name..." : "Search Ticket #, Phone, or Name..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-900 shadow-xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <RotateCw className="w-7 h-7 animate-spin text-indigo-600" />
          <span className="text-xs font-bold">Synchronizing kitchen queue...</span>
        </div>
      ) : activeTab === 'KITCHEN' ? (
        /* ================= 🍳 TAB 1: KITCHEN QUEUE WITH 2 COLLAPSIBLE SECTIONS ================= */
        <div className="space-y-4">
          
          {/* 🍳 LIVE AGGREGATED BATCH PREP SUMMARY BAR */}
          {batchPrepSummary.totalItemCount > 0 && (
            <div className="bg-amber-500 text-white rounded-2xl p-3 sm:p-3.5 shadow-md flex items-center justify-between gap-3 overflow-hidden">
              <div className="flex items-center gap-2 shrink-0">
                <Flame className="w-4 h-4 text-amber-200 fill-amber-200 animate-pulse" />
                <span className="font-black text-xs uppercase tracking-wider">
                  Total Items To Cook ({batchPrepSummary.totalItemCount}):
                </span>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs font-black">
                {Object.entries(batchPrepSummary.summary).map(([dishName, qty]) => (
                  <span 
                    key={dishName} 
                    className="bg-black/20 px-2.5 py-1 rounded-xl whitespace-nowrap text-[11px] border border-white/10"
                  >
                    {dishName} <span className="text-amber-200 font-black">×{qty}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 1: 🔥 TO PREPARE / NEW ORDERS (COLLAPSIBLE DROPDOWN) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <button
              onClick={() => setIsToPrepareOpen(!isToPrepareOpen)}
              className="w-full p-3.5 sm:p-4 bg-amber-50/70 hover:bg-amber-50 border-b border-amber-100 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-600" />
                <h3 className="text-xs font-black text-amber-900 uppercase tracking-wider">
                  To Prepare / New Orders
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200/80 text-amber-900">
                  {filteredPendingOrders.length}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-800">
                <span>{isToPrepareOpen ? 'Hide' : 'Show'}</span>
                {isToPrepareOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isToPrepareOpen && (
              <div className="p-3 sm:p-4 space-y-2.5">
                {filteredPendingOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No pending orders to prepare right now.</p>
                ) : (
                  filteredPendingOrders.map((order) => (
                    <SpotlightCard
                      key={order.id}
                      className="bg-white border border-l-4 border-l-amber-500 border-slate-200/90 p-3 sm:p-3.5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base text-slate-900">{order.order_number}</span>
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatElapsed(order.created_at)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
                            New Order
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {order.items.map((item, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg text-xs font-bold text-slate-800"
                            >
                              <span>{item.name}</span>
                              <span className="text-amber-700 font-black">×{item.quantity}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCancelOrder(order)}
                          className="px-2.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs transition-colors flex items-center gap-1"
                          title="Cancel this order"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Cancel</span>
                        </button>

                        <button
                          onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                          className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <ChefHat className="w-4 h-4" />
                          <span>Start Cooking</span>
                        </button>
                      </div>
                    </SpotlightCard>
                  ))
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: 👨‍🍳 PREPARING / CURRENTLY COOKING (COLLAPSIBLE DROPDOWN) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
            <button
              onClick={() => setIsCookingOpen(!isCookingOpen)}
              className="w-full p-3.5 sm:p-4 bg-indigo-50/70 hover:bg-indigo-50 border-b border-indigo-100 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-black text-indigo-900 uppercase tracking-wider">
                  Preparing / Cooking In Progress
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-200/80 text-indigo-900">
                  {filteredPreparingOrders.length}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs font-bold text-indigo-800">
                <span>{isCookingOpen ? 'Hide' : 'Show'}</span>
                {isCookingOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isCookingOpen && (
              <div className="p-3 sm:p-4 space-y-2.5">
                {filteredPreparingOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No orders currently on the stove/grill.</p>
                ) : (
                  filteredPreparingOrders.map((order) => (
                    <SpotlightCard
                      key={order.id}
                      className="bg-white border border-l-4 border-l-indigo-600 border-slate-200/90 p-3 sm:p-3.5 rounded-xl shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base text-slate-900">{order.order_number}</span>
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatElapsed(order.created_at)}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Cooking
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                          {order.items.map((item, idx) => (
                            <span 
                              key={idx}
                              className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-lg text-xs font-bold text-slate-800"
                            >
                              <span>{item.name}</span>
                              <span className="text-indigo-600 font-black">×{item.quantity}</span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleCancelOrder(order)}
                          className="px-2.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold text-xs transition-colors flex items-center gap-1"
                          title="Cancel this order"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Cancel</span>
                        </button>

                        <button
                          onClick={() => updateOrderStatus(order.id, 'READY')}
                          className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark Ready</span>
                        </button>
                      </div>
                    </SpotlightCard>
                  ))
                )}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ================= 📦 TAB 2: COUNTER PICKUP & PIN HANDOVER ================= */
        <div className="space-y-4">
          
          {/* READY FOR PICKUP SECTION */}
          <div>
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Ready for Counter Pickup ({filteredReadyOrders.length})</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-semibold">Verify 4-digit PIN to handover</span>
            </div>

            {filteredReadyOrders.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-10 text-center flex flex-col items-center justify-center text-slate-400 shadow-sm">
                <PackageCheck className="w-10 h-10 text-slate-300 mb-2" />
                <span className="text-sm font-black text-slate-800">No Orders Awaiting Pickup</span>
                <span className="text-xs text-slate-400 mt-0.5">Dishes marked 'Ready' in the kitchen will appear here.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredReadyOrders.map((order) => (
                  <SpotlightCard
                    key={order.id}
                    className="bg-white border-2 border-emerald-500/80 p-4 sm:p-5 rounded-2xl shadow-sm flex flex-col justify-between gap-3.5"
                  >
                    <div>
                      {/* Top: Ticket #, Time and Cancel Action */}
                      <div className="flex justify-between items-start pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-lg text-slate-900">{order.order_number}</span>
                          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-black uppercase tracking-wider">
                            Ready
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-slate-400">{formatElapsed(order.created_at)}</span>
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-[10px] font-bold transition-colors"
                            title="Cancel unclaimed order"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>

                      {/* Customer Name & Phone */}
                      <div className="pt-2 flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900">{order.student_name}</p>
                          {order.student_roll && (
                            <p className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{order.student_roll}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dishes List */}
                      <div className="bg-slate-50 border border-slate-100 rounded-xl p-2.5 mt-2.5 space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className="font-bold text-slate-800">
                              {item.name} <span className="text-indigo-600 font-black">×{item.quantity}</span>
                            </span>
                            <span className="font-semibold text-slate-500">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-200/60 pt-1 flex justify-between items-center text-xs font-black text-slate-900">
                          <span>Total Paid</span>
                          <span>₹{order.total_price}</span>
                        </div>
                      </div>
                    </div>

                    {/* ALPHANUMERIC PICKUP CODE VERIFICATION FORM */}
                    <div className="space-y-2 pt-1">
                      <label className="text-[11px] font-black text-slate-600 uppercase tracking-wider block">
                        Enter Student Pickup Code / PIN:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={8}
                          placeholder="e.g. 7K9P"
                          value={pinInputs[order.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setPinInputs(prev => ({ ...prev, [order.id]: val }));
                            if (val.length === 4) {
                              handleVerifyOrderPin(order, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleVerifyOrderPin(order);
                          }}
                          className="w-32 px-3 py-2.5 text-center font-mono font-black text-sm tracking-widest bg-slate-50 border-2 border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal uppercase"
                        />
                        <button
                          onClick={() => handleVerifyOrderPin(order)}
                          disabled={verifyingOrders[order.id] || (pinInputs[order.id] || '').length < 3}
                          className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1.5"
                        >
                          {verifyingOrders[order.id] ? (
                            <>
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <CheckCheck className="w-4 h-4" />
                              <span>Verify & Handover</span>
                            </>
                          )}
                        </button>
                      </div>

                      {orderErrors[order.id] && (
                        <p className="text-[11px] font-bold text-rose-600 animate-shake">{orderErrors[order.id]}</p>
                      )}
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            )}
          </div>

          {/* 📜 COLLAPSIBLE COMPLETED & CANCELLED ORDERS ACCORDION WITH PROMINENT LARGE DELETE BUTTON */}
          <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm mt-6">
            <button
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-2">
                <CheckCheck className="w-4 h-4 text-slate-500" />
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Past Completed & Cancelled Orders ({historyOrders.length})
                </h3>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                <span>{isHistoryExpanded ? 'Collapse' : 'Expand'}</span>
                {isHistoryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {isHistoryExpanded && (
              <div className="p-3 sm:p-4 divide-y divide-slate-100">
                {historyOrders.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No completed or cancelled orders in history.</p>
                ) : (
                  historyOrders.map((order) => {
                    const isCancelled = order.status === 'CANCELLED';
                    return (
                      <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black text-sm text-slate-900">{order.order_number}</span>
                            <span className="text-xs font-bold text-slate-700">{order.student_name}</span>
                            {order.student_roll && (
                              <span className="text-[11px] font-mono text-slate-400">({order.student_roll})</span>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                              isCancelled 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}>
                              {isCancelled ? 'Cancelled' : 'Completed'}
                            </span>
                            <span className="text-xs font-black text-slate-900">₹{order.total_price}</span>
                          </div>
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                          </p>
                        </div>

                        {/* 🔒 IMMUTABLE PERMANENT RECORD BADGE */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200/80 text-[10px] font-bold text-slate-500 shrink-0">
                          <span>{formatElapsed(order.created_at)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* 🚀 HOVERING MODAL CONFIRMATION DIALOG FOR VERIFIED PIN HANDOVER */}
      {verifiedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl border border-slate-200 flex flex-col items-center text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border-2 border-emerald-200 text-emerald-600 flex items-center justify-center shadow-inner">
              <CheckCircle className="w-9 h-9" />
            </div>

            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>PIN Verified Successfully</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight pt-1">
                Order {verifiedOrderModal.order_number}
              </h2>
              <p className="text-xs font-bold text-slate-600">
                Customer: <span className="text-slate-900">{verifiedOrderModal.student_name}</span>
                {verifiedOrderModal.student_roll && ` (${verifiedOrderModal.student_roll})`}
              </p>
            </div>

            {/* Meal Items Summary */}
            <div className="w-full bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 space-y-1.5 text-left text-xs">
              <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider block">
                Items to Hand Over:
              </span>
              {verifiedOrderModal.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center font-bold text-slate-800">
                  <span>{item.name}</span>
                  <span className="text-indigo-600 font-black">×{item.quantity}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-1.5 flex justify-between items-center font-black text-slate-900">
                <span>Total Amount</span>
                <span className="text-emerald-700">₹{verifiedOrderModal.total_price}</span>
              </div>
            </div>

            <p className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200 w-full">
              ✓ PIN authenticated! Hand over the prepared food to the customer.
            </p>

            {/* Big Close & Complete Button */}
            <button
              onClick={handleCloseVerifiedModal}
              className="w-full py-3.5 rounded-2xl bg-slate-900 hover:bg-black text-white font-black text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <CheckCheck className="w-4 h-4" />
              <span>Done (Move to History)</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
