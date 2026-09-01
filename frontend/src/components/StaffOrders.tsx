import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket.js';
import { 
  Coffee, 
  RotateCw, 
  CheckCircle, 
  ShieldAlert, 
  FileText, 
  CheckCheck, 
  Search, 
  X, 
  ChefHat, 
  PackageCheck, 
  Store, 
  Link as LinkIcon
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
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED';
  pickup_code: string;
  created_at: string;
}

export function StaffOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'ALL_ACTIVE' | 'TO_COOK' | 'READY' | 'COMPLETED'>('ALL_ACTIVE');
  const [searchQuery, setSearchQuery] = useState<string>('');
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
    } catch (e) {
      console.log('Audio tone error', e);
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
    } catch (e) {
      console.error('Failed to load canteens list', e);
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
          } catch (e) {
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
        playSuccessTone();
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
        setOrderSuccess(prev => ({ ...prev, [order.id]: `Verified! Order ${order.order_number} completed.` }));
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

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

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

  // Counts for tabs
  const activeOrdersCount = orders.filter(o => o.status !== 'COMPLETED').length;
  const toCookCount = orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING').length;
  const readyCount = orders.filter(o => o.status === 'READY').length;
  const completedCount = orders.filter(o => o.status === 'COMPLETED').length;

  // Filtering by search query & tab
  const getDisplayOrders = () => {
    let filtered = orders;

    if (activeTab === 'TO_COOK') {
      filtered = filtered.filter(o => o.status === 'PENDING' || o.status === 'PREPARING');
    } else if (activeTab === 'READY') {
      filtered = filtered.filter(o => o.status === 'READY');
    } else if (activeTab === 'ALL_ACTIVE') {
      filtered = filtered.filter(o => o.status !== 'COMPLETED');
    } else if (activeTab === 'COMPLETED') {
      filtered = filtered.filter(o => o.status === 'COMPLETED');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(o => 
        o.order_number.toLowerCase().includes(q) ||
        o.pickup_code.toLowerCase().includes(q) ||
        o.student_name.toLowerCase().includes(q) ||
        o.student_roll.toLowerCase().includes(q) ||
        o.items.some(i => i.name.toLowerCase().includes(q))
      );
    }

    return filtered;
  };

  const displayedOrders = getDisplayOrders();

  return (
    <div className="flex-1 flex flex-col gap-4 sm:gap-6 animate-in pb-12">
      
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-3.5 pb-2 border-b border-slate-200/80">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {userProfile?.role === 'admin' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full text-[11px] font-black uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Network Administrator
              </span>
            ) : userGroupName ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-indigo-50 border border-indigo-200 text-indigo-800 rounded-full text-[11px] font-black uppercase tracking-wider">
                {userGroupName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-full text-[11px] font-black uppercase tracking-wider">
                Standalone Diner
              </span>
            )}

            {userProfile?.role && (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                userProfile.role === 'cook'
                  ? 'bg-orange-100 text-orange-800 border border-orange-200'
                  : userProfile.role === 'manager'
                  ? 'bg-purple-100 text-purple-800 border border-purple-200'
                  : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
              }`}>
                {userProfile.role === 'cook' ? 'Cook Terminal' : userProfile.role === 'manager' ? 'Outlet Manager' : 'Admin'}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {userProfile?.role === 'admin' 
              ? 'Campus Kitchen Dashboard' 
              : `${currentCanteenObj?.name || canteenName || 'Canteen'} Portal`}
          </h1>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold animate-pulse">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Outlet Switcher & Direct Copy Link */}
        {userProfile && (
          <div className="flex flex-wrap items-center gap-2">
            {userProfile.role === 'admin' ? (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-xs">
                <Store className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedAdminCanteenId}
                  onChange={(e) => setSelectedAdminCanteenId(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="">All Outlets (Global)</option>
                  {canteens.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : scopedCanteens.length > 1 ? (
              <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-xl shadow-xs">
                <Store className="w-4 h-4 text-slate-400" />
                <select
                  value={selectedAdminCanteenId}
                  onChange={(e) => setSelectedAdminCanteenId(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="">All {userGroupName || 'Campus'} Outlets</option>
                  {scopedCanteens.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs font-bold text-indigo-900 shadow-xs">
                <Store className="w-3.5 h-3.5 text-indigo-600" />
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
                alert(`Student menu URL copied to clipboard:\n${url}`);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-all active:scale-95 shadow-xs"
              title="Copy student direct menu link"
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Copy Link</span>
            </button>
          </div>
        )}
      </header>

      {/* 🔍 INSTANT BULK SEARCH & STATUS FILTER TABS */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Instant Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search Order #1010, PIN 9799, Student Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 shadow-xs focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Segmented Control Tabs */}
        <div className="flex items-center gap-1 bg-slate-200/80 p-1 rounded-2xl overflow-x-auto no-scrollbar shadow-inner shrink-0">
          <button
            onClick={() => setActiveTab('ALL_ACTIVE')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'ALL_ACTIVE'
                ? 'bg-white text-indigo-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All Active</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-indigo-50 text-indigo-700">
              {activeOrdersCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('TO_COOK')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'TO_COOK'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChefHat className="w-3.5 h-3.5 text-amber-600" />
            <span>To Cook</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
              {toCookCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('READY')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'READY'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ready</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
              {readyCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'COMPLETED'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>History</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
              {completedCount}
            </span>
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
          <RotateCw className="w-7 h-7 animate-spin text-indigo-600" />
          <span className="text-xs font-bold">Synchronizing kitchen queue...</span>
        </div>
      ) : activeTab === 'COMPLETED' ? (
        /* Completed History Section (Responsive Cards on Mobile + Table on Desktop) */
        <section className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
          {displayedOrders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-center">
              <FileText className="w-10 h-10 opacity-30 mb-2 text-indigo-600" />
              <span className="text-sm font-bold text-slate-700">No completed orders found</span>
              <span className="text-xs text-slate-400 mt-0.5">Fulfilled orders will appear here</span>
            </div>
          ) : (
            <div>
              {/* Mobile View: Clean Card List */}
              <div className="md:hidden divide-y divide-slate-100">
                {displayedOrders.map((order) => (
                  <div key={order.id} className="p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-sm text-slate-900">{order.order_number}</span>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full text-[10px] font-bold uppercase">
                          Completed
                        </span>
                      </div>
                      <span className="text-xs font-black text-slate-900">₹{order.total_price}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">{order.student_name} <span className="text-slate-400 font-normal">({order.student_roll})</span></p>
                      <p className="text-[11px] text-slate-600 mt-0.5">
                        {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                      </p>
                    </div>
                    <p className="text-[10px] font-mono text-slate-400">{formatTime(order.created_at)}</p>
                  </div>
                ))}
              </div>

              {/* Desktop View: Clean Table */}
              <table className="hidden md:table w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70">
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Order</th>
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Student</th>
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider">Dishes</th>
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-right">Price</th>
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Time</th>
                    <th className="px-5 py-3.5 text-[11px] font-black text-slate-500 uppercase tracking-wider text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {displayedOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5 font-mono font-black text-slate-900">{order.order_number}</td>
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-slate-800">{order.student_name}</div>
                        <div className="text-slate-400 font-mono text-[11px]">{order.student_roll}</div>
                      </td>
                      <td className="px-5 py-3.5 text-slate-700 font-medium">
                        {order.items.map((i) => `${i.name} (×${i.quantity})`).join(', ')}
                      </td>
                      <td className="px-5 py-3.5 text-right font-black text-slate-900">₹{order.total_price}</td>
                      <td className="px-5 py-3.5 text-center text-slate-500 font-mono">{formatTime(order.created_at)}</td>
                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-700">
                          <CheckCheck className="w-3 h-3" /> Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        /* ACTIVE ORDERS FEED (High Density Grid, Glanceable, 1-Tap Handover) */
        <div className="space-y-4">
          {displayedOrders.length === 0 ? (
            <div className="bg-white border border-slate-200/90 rounded-3xl p-12 text-center flex flex-col items-center justify-center text-slate-400 shadow-sm">
              <Coffee className="w-10 h-10 text-slate-300 mb-2" />
              <span className="text-base font-bold text-slate-800">No active orders in this view</span>
              <span className="text-xs text-slate-400 mt-1">
                {searchQuery ? `No orders matched query "${searchQuery}"` : 'All caught up! New orders will notify automatically.'}
              </span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
              {displayedOrders.map((order) => {
                const isPending = order.status === 'PENDING';
                const isPreparing = order.status === 'PREPARING';
                const isReady = order.status === 'READY';
                return (
                  <SpotlightCard 
                    key={order.id} 
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col justify-between gap-3 bg-white border border-slate-200/90 shadow-sm transition-all ${
                      isReady 
                        ? 'border-l-4 border-l-emerald-500 ring-1 ring-emerald-500/20' 
                        : isPreparing
                        ? 'border-l-4 border-l-indigo-600'
                        : 'border-l-4 border-l-amber-500'
                    }`}
                  >
                    {/* Card Top: Order Number + Status + Timestamp */}
                    <div>
                      <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-base text-slate-900">{order.order_number}</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            isReady 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : isPreparing
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            {order.status}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">{formatTime(order.created_at)}</span>
                      </div>

                      {/* Student Info */}
                      <div className="pt-2">
                        <p className="font-black text-sm text-slate-900 leading-tight">{order.student_name}</p>
                        <p className="text-[11px] font-mono text-slate-500 mt-0.5">{order.student_roll}</p>
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
                      </div>
                    </div>

                    {/* Card Bottom: Quick Actions */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1 text-slate-500 font-bold">
                          <span>OTP PIN:</span>
                          <span className="font-mono font-black text-indigo-600 text-sm bg-indigo-50 px-1.5 py-0.5 rounded-md border border-indigo-100">
                            {order.pickup_code}
                          </span>
                        </div>
                        <div className="font-black text-slate-900 text-sm">
                          ₹{order.total_price}
                        </div>
                      </div>

                      {/* 1-Tap Progression Buttons */}
                      {isPending && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                          className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                        >
                          <ChefHat className="w-4 h-4" />
                          <span>Start Cooking</span>
                        </button>
                      )}

                      {isPreparing && (
                        <button
                          onClick={() => updateOrderStatus(order.id, 'READY')}
                          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-4 h-4" />
                          <span>Mark Ready for Pickup</span>
                        </button>
                      )}

                      {isReady && (
                        <div className="space-y-2">
                          <button
                            onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md shadow-emerald-600/25 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
                          >
                            <PackageCheck className="w-4 h-4" />
                            <span>1-Tap Handover / Complete</span>
                          </button>

                          {/* Quick Inline PIN input verification for extra security */}
                          <div className="flex items-center gap-1.5 pt-1">
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
                              className="w-20 px-2 py-1.5 text-center font-mono font-black text-xs tracking-wider bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            />
                            <button
                              onClick={() => handleVerifyOrderPin(order)}
                              disabled={verifyingOrders[order.id]}
                              className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] rounded-lg transition-all active:scale-95 disabled:opacity-50"
                            >
                              {verifyingOrders[order.id] ? 'Verifying...' : 'Verify PIN'}
                            </button>
                          </div>

                          {orderErrors[order.id] && (
                            <p className="text-[10px] font-bold text-rose-600">{orderErrors[order.id]}</p>
                          )}
                          {orderSuccess[order.id] && (
                            <p className="text-[10px] font-bold text-emerald-700">{orderSuccess[order.id]}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </SpotlightCard>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
