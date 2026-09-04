import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { socket } from '../utils/socket.js';
import { 
  RotateCw, 
  CheckCircle2,
  ShieldAlert, 
  Search, 
  X, 
  ChefHat, 
  PackageCheck, 
  Store, 
  Link as LinkIcon, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  CheckCheck,
  User,
  Phone,
  Ban,
  Building2,
  Utensils,
  Check,
  TrendingUp
} from 'lucide-react';
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
  additional_charges?: number;
  status: 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  pickup_code: string;
  created_at: string;
  canteen_id: string;
  building?: string;
  break_timing?: string;
  slot_number?: number;
  cancellation_reason?: string;
}

const KNOWN_BUILDINGS: Record<string, string[]> = {
  Mithibai: ['9:00 - 9:30', '1:00 - 1:30', '1:30 - 1:50'],
};

const PRESET_CANCELLATION_REASONS = [
  'Item(s) Out of Stock',
  'Kitchen Over-Capacity / Long Delay',
  'Break Slot Ended / Kitchen Closed',
  'Customer Requested Cancellation',
  'Payment / Order Discrepancy',
];

export function StaffOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  // Dual-tab operational view: 'KITCHEN' (Cook view) or 'COUNTER' (Pickup & PIN handover view)
  const [activeTab, setActiveTab] = useState<'KITCHEN' | 'COUNTER'>('KITCHEN');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  
  // Building & Break Timing Slot Filter for Cooking Schedule
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>('ALL');
  const [selectedBreakTimingFilter, setSelectedBreakTimingFilter] = useState<string>('ALL');

  // 25-Order Batch Slot Filter (Slot 1: Orders 1-25, Slot 2: Orders 26-50...)
  const [selectedBatchSlotFilter, setSelectedBatchSlotFilter] = useState<'ALL' | number>('ALL');

  // Collapsible Kitchen Sections
  const [isToPrepareOpen, setIsToPrepareOpen] = useState<boolean>(true);
  const [isCookingOpen, setIsCookingOpen] = useState<boolean>(true);

  // Collapsible Counter History
  const [isHistoryExpanded, setIsHistoryExpanded] = useState<boolean>(false);

  // Hovering Confirmation Modal for Verified PIN Handover
  const [verifiedOrderModal, setVerifiedOrderModal] = useState<Order | null>(null);

  // Cancellation Reason Modal State
  const [cancellingOrderModal, setCancellingOrderModal] = useState<Order | null>(null);
  const [cancellationReasonText, setCancellationReasonText] = useState<string>('');
  const [isSubmittingCancellation, setIsSubmittingCancellation] = useState<boolean>(false);

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

  const updateOrderStatus = async (
    orderId: string, 
    newStatus: 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED',
    cancellationReason?: string
  ) => {
    const token = localStorage.getItem('staffToken');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          cancellation_reason: cancellationReason 
        })
      });

      if (response.ok) {
        playSuccessTone();
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order.id === orderId 
              ? { 
                  ...order, 
                  status: newStatus, 
                  cancellation_reason: cancellationReason || order.cancellation_reason 
                } 
              : order
          )
        );
      } else {
        alert('Failed to update status.');
      }
    } catch {
      alert('Network error.');
    }
  };

  // Open structured Cancellation Reason Modal instead of raw window.confirm
  const handleCancelOrder = (order: Order) => {
    setCancellingOrderModal(order);
    setCancellationReasonText('');
  };

  const handleConfirmCancellation = async () => {
    if (!cancellingOrderModal) return;
    const reason = cancellationReasonText.trim();
    if (!reason) {
      alert('Please select or type a cancellation reason for the customer.');
      return;
    }

    try {
      setIsSubmittingCancellation(true);
      await updateOrderStatus(cancellingOrderModal.id, 'CANCELLED', reason);
      setCancellingOrderModal(null);
      setCancellationReasonText('');
    } finally {
      setIsSubmittingCancellation(false);
    }
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

  // Extract unique buildings from orders + known buildings
  const availableBuildings = useMemo(() => {
    const bSet = new Set<string>(['ALL', 'Mithibai']);
    orders.forEach(o => {
      if (o.building?.trim()) bSet.add(o.building.trim());
    });
    return Array.from(bSet);
  }, [orders]);

  // Extract break timings based on selected building
  const availableBreakTimings = useMemo(() => {
    const tSet = new Set<string>();
    if (selectedBuildingFilter === 'ALL' || selectedBuildingFilter === 'Mithibai') {
      KNOWN_BUILDINGS.Mithibai.forEach(t => tSet.add(t));
    } else if (KNOWN_BUILDINGS[selectedBuildingFilter]) {
      KNOWN_BUILDINGS[selectedBuildingFilter].forEach(t => tSet.add(t));
    }

    // Also collect any actual break timings present in loaded orders
    orders.forEach(o => {
      if (selectedBuildingFilter === 'ALL' || o.building?.toLowerCase() === selectedBuildingFilter.toLowerCase()) {
        if (o.break_timing?.trim()) tSet.add(o.break_timing.trim());
      }
    });

    return ['ALL', ...Array.from(tSet)];
  }, [orders, selectedBuildingFilter]);

  // Live count of active tickets in each break timing slot
  const timingCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: 0 };
    const targetOrders = activeTab === 'KITCHEN' 
      ? orders.filter(o => o.status === 'PENDING' || o.status === 'PREPARING')
      : orders.filter(o => o.status === 'READY');

    targetOrders.forEach(o => {
      if (selectedBuildingFilter !== 'ALL' && o.building?.toLowerCase() !== selectedBuildingFilter.toLowerCase()) {
        return;
      }
      counts.ALL = (counts.ALL || 0) + 1;
      if (o.break_timing) {
        counts[o.break_timing] = (counts[o.break_timing] || 0) + 1;
      }
    });
    return counts;
  }, [orders, activeTab, selectedBuildingFilter]);

  // Extract active 25-order batch slots (e.g. Slot 1, Slot 2, Slot 3...)
  const activeBatchSlots = useMemo(() => {
    const sSet = new Set<number>();
    orders.forEach(o => {
      if (o.slot_number) {
        sSet.add(o.slot_number);
      } else if (o.order_number && o.order_number.includes('-')) {
        const parsed = parseInt(o.order_number.split('-')[0], 10);
        if (!isNaN(parsed) && parsed > 0) sSet.add(parsed);
      }
    });
    return Array.from(sSet).sort((a, b) => a - b);
  }, [orders]);

  // Filter orders by Building, Break Timing slot, and 25-Order Batch Slot
  const slotFilteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (selectedBuildingFilter !== 'ALL') {
        if (!o.building || o.building.toLowerCase() !== selectedBuildingFilter.toLowerCase()) {
          return false;
        }
      }
      if (selectedBreakTimingFilter !== 'ALL') {
        if (o.break_timing !== selectedBreakTimingFilter) {
          return false;
        }
      }
      if (selectedBatchSlotFilter !== 'ALL') {
        const slot = o.slot_number || (o.order_number.includes('-') ? parseInt(o.order_number.split('-')[0], 10) : undefined);
        if (slot !== selectedBatchSlotFilter) {
          return false;
        }
      }
      return true;
    });
  }, [orders, selectedBuildingFilter, selectedBreakTimingFilter, selectedBatchSlotFilter]);

  // Split filtered kitchen orders into PENDING, PREPARING, READY, HISTORY
  const pendingOrders = useMemo(() => {
    return slotFilteredOrders.filter(o => o.status === 'PENDING');
  }, [slotFilteredOrders]);

  const preparingOrders = useMemo(() => {
    return slotFilteredOrders.filter(o => o.status === 'PREPARING');
  }, [slotFilteredOrders]);

  const readyOrders = useMemo(() => {
    return slotFilteredOrders.filter(o => o.status === 'READY');
  }, [slotFilteredOrders]);

  // Combined completed and cancelled orders for history
  const historyOrders = useMemo(() => {
    return slotFilteredOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED');
  }, [slotFilteredOrders]);

  // 🍳 LIVE AGGREGATED BATCH PREP SUMMARY (Aggregated across filtered pending & preparing)
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
    <div className="flex-1 flex flex-col gap-2.5 animate-in pb-10">
      
      {/* 1. Terminal Top Bar: Status, Terminal Role & Actions */}
      <div className="bg-white border border-slate-200/90 rounded-lg px-3 py-2 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight">
              {currentCanteenObj?.name || canteenName || 'Canteen'}
            </h1>
          </div>
          <span className="text-slate-300 text-xs">·</span>
          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
            {userProfile?.role === 'cook' ? 'Kitchen Terminal' : userProfile?.role === 'delivery' ? 'Delivery Terminal' : userProfile?.role === 'admin' ? 'Master Admin' : 'Staff Terminal'}
          </span>
          {selectedBuildingFilter !== 'ALL' && (
            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200/80 rounded text-[10px] font-medium">
              {selectedBuildingFilter}
            </span>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-rose-50 border border-rose-200 text-rose-700 rounded text-[11px] font-medium animate-pulse">
            <ShieldAlert className="w-3 h-3 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Actions & Switchers */}
        <div className="flex items-center gap-1.5 shrink-0">
          {userProfile?.role === 'admin' && canteens.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
              <Store className="w-3 h-3 text-slate-400" />
              <select
                value={selectedAdminCanteenId}
                onChange={(e) => {
                  setSelectedAdminCanteenId(e.target.value);
                  fetchOrders(e.target.value);
                }}
                className="bg-transparent border-none text-[11px] font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">All Outlets</option>
                {canteens.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          {userProfile?.role !== 'cook' && userProfile?.role !== 'delivery' && (
            <>
              <Link
                to="/staff/menu"
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-colors shadow-2xs"
                title="Manage dishes and live stock availability"
              >
                <Utensils className="w-3 h-3 text-indigo-600 shrink-0" />
                <span className="hidden xs:inline">Stock & Menu</span>
              </Link>
              <Link
                to="/staff/sales"
                className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors shadow-2xs"
                title="View monthly sales & revenue ledger"
              >
                <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
                <span className="hidden xs:inline">Monthly Sales</span>
              </Link>
            </>
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
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-colors shadow-2xs"
            title="Copy student direct menu link"
          >
            <LinkIcon className="w-2.5 h-2.5 text-indigo-600" />
            <span className="hidden sm:inline">Student Link</span>
          </button>
        </div>
      </div>

      {/* 2. Primary Operational Toolbar: Mode Switcher & Live Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5">
        <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg select-none">
          <button
            onClick={() => setActiveTab('KITCHEN')}
            className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'KITCHEN'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ChefHat className={`w-3 h-3 ${activeTab === 'KITCHEN' ? 'text-amber-600' : 'text-slate-400'}`} />
            <span>Kitchen Queue</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
              activeTab === 'KITCHEN' ? 'bg-amber-100 text-amber-900' : 'bg-slate-300 text-slate-700'
            }`}>
              {pendingOrders.length + preparingOrders.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('COUNTER')}
            className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'COUNTER'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PackageCheck className={`w-3 h-3 ${activeTab === 'COUNTER' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Counter Pickup</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
              activeTab === 'COUNTER' ? 'bg-emerald-100 text-emerald-900' : 'bg-slate-300 text-slate-700'
            }`}>
              {readyOrders.length}
            </span>
          </button>
        </div>

        {/* Quick Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'KITCHEN' ? "Search ticket # or dish..." : "Search ticket #, phone, name..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-6 py-1 bg-white border border-slate-200 rounded-md text-[11px] font-medium text-slate-900 shadow-2xs focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 h-7"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Streamlined Filter Strip (Building, Break Slot & 25-Order Batches) */}
      <div className="bg-white border border-slate-200/90 rounded-lg p-1.5 sm:px-2.5 sm:py-1.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5">
        {/* Building Filter */}
        <div className="flex items-center gap-1 shrink-0">
          <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
          <select
            value={selectedBuildingFilter}
            onChange={(e) => {
              setSelectedBuildingFilter(e.target.value);
              setSelectedBreakTimingFilter('ALL');
            }}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-medium rounded px-1.5 py-0.5 focus:outline-none cursor-pointer h-6"
          >
            <option value="ALL">All Buildings</option>
            {availableBuildings.filter(b => b !== 'ALL').map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        <div className="hidden sm:block w-px h-4 bg-slate-200 shrink-0" />

        {/* Break Timings Chips */}
        <div className="flex-1 flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-0.5 mr-0.5">
            <Clock className="w-2.5 h-2.5 text-slate-400" />
            <span>Break:</span>
          </span>

          {availableBreakTimings.map((timing) => {
            const isSelected = selectedBreakTimingFilter === timing;
            const count = timingCounts[timing] || 0;
            const label = timing === 'ALL' ? 'All Slots' : timing;

            return (
              <button
                key={timing}
                onClick={() => setSelectedBreakTimingFilter(timing)}
                className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                  isSelected
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                }`}
              >
                <span>{label}</span>
                {count > 0 && (
                  <span className={`px-1 py-0.2 rounded-full text-[9px] font-bold ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-900'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 25-Order Batch Slot Chips */}
        {activeBatchSlots.length > 0 && (
          <>
            <div className="hidden sm:block w-px h-4 bg-slate-200 shrink-0" />
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                onClick={() => setSelectedBatchSlotFilter('ALL')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-all shrink-0 ${
                  selectedBatchSlotFilter === 'ALL'
                    ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                }`}
              >
                All Batches
              </button>
              {activeBatchSlots.map((slotNum) => {
                const isSelected = selectedBatchSlotFilter === slotNum;
                const startOrder = (slotNum - 1) * 25 + 1;
                const endOrder = slotNum * 25;
                const countInSlot = orders.filter(o => {
                  const s = o.slot_number || (o.order_number.includes('-') ? parseInt(o.order_number.split('-')[0], 10) : undefined);
                  return s === slotNum && (activeTab === 'KITCHEN' ? (o.status === 'PENDING' || o.status === 'PREPARING') : o.status === 'READY');
                }).length;

                return (
                  <button
                    key={slotNum}
                    onClick={() => setSelectedBatchSlotFilter(slotNum)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 shrink-0 ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                    }`}
                  >
                    <span>Slot {slotNum}</span>
                    <span className="text-[9px] font-mono opacity-70 font-normal">({startOrder}–{endOrder})</span>
                    {countInSlot > 0 && (
                      <span className={`px-1 py-0.2 rounded-full text-[9px] font-bold ${
                        isSelected ? 'bg-white/25 text-white' : 'bg-indigo-100 text-indigo-800'
                      }`}>
                        {countInSlot}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <RotateCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span className="text-[11px] font-medium">Syncing kitchen queue...</span>
        </div>
      ) : activeTab === 'KITCHEN' ? (
        /* ================= TAB 1: KITCHEN QUEUE ================= */
        <div className="space-y-2.5">
          
          {/* LIVE AGGREGATED BATCH PREP SUMMARY TICKER */}
          {batchPrepSummary.totalItemCount > 0 && (
            <div className="bg-slate-900 text-white rounded-lg px-2.5 py-1.5 shadow-2xs flex items-center justify-between gap-2.5 border border-slate-800">
              <div className="flex items-center gap-1.5 shrink-0 text-[11px]">
                <Utensils className="w-3 h-3 text-amber-400 shrink-0" />
                <span className="font-semibold text-slate-300">
                  To Cook
                </span>
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400/20 text-amber-300 font-mono font-bold text-[10px]">
                  {batchPrepSummary.totalItemCount}
                </span>
              </div>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5 text-[11px]">
                {Object.entries(batchPrepSummary.summary).map(([dishName, qty]) => (
                  <span 
                    key={dishName} 
                    className="bg-slate-800 text-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap text-[11px] font-medium border border-slate-700/60 flex items-center gap-1"
                  >
                    <span>{dishName}</span>
                    <span className="font-mono font-bold text-amber-400 text-[10px]">×{qty}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 1: TO PREPARE / NEW ORDERS */}
          <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden shadow-2xs">
            <button
              onClick={() => setIsToPrepareOpen(!isToPrepareOpen)}
              className="w-full px-3 py-1.5 bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200/80 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  To Prepare
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-amber-100 text-amber-900">
                  {filteredPendingOrders.length}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <span>{isToPrepareOpen ? 'Collapse' : 'Expand'}</span>
                {isToPrepareOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            </button>

            {isToPrepareOpen && (
              <div className="p-2 sm:p-2.5">
                {filteredPendingOrders.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3 font-normal">No pending orders in queue.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {filteredPendingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between gap-2"
                      >
                        <div className="space-y-1.5">
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-mono font-bold text-[13px] text-slate-900 tracking-tight">
                                {order.order_number}
                              </span>
                              <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                                Slot {order.slot_number || (order.order_number.includes('-') ? order.order_number.split('-')[0] : 1)}
                              </span>
                              {(order.building || order.break_timing) && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center gap-0.5">
                                  <Building2 className="w-2 h-2 text-amber-600" />
                                  <span>{order.building ? order.building : ''}{order.building && order.break_timing ? ' · ' : ''}{order.break_timing ? order.break_timing : ''}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5 shrink-0">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              {formatElapsed(order.created_at)}
                            </span>
                          </div>

                          {/* Dishes List */}
                          <div className="space-y-0.5 pt-0.5">
                            {order.items.map((item, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded bg-slate-50 border border-slate-100/80"
                              >
                                <span className="font-medium text-slate-800">{item.name}</span>
                                <span className="font-mono font-bold text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded text-[10px]">
                                  ×{item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="h-7 px-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-[10px] font-medium flex items-center gap-0.5"
                            title="Cancel order"
                          >
                            <Ban className="w-3 h-3" />
                            <span className="hidden sm:inline">Cancel</span>
                          </button>

                          <button
                            onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                            className="flex-1 h-7 px-2.5 rounded-md bg-amber-500 hover:bg-amber-600 text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                          >
                            <ChefHat className="w-3 h-3" />
                            <span>Start Cooking</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* SECTION 2: PREPARING / COOKING IN PROGRESS */}
          <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden shadow-2xs">
            <button
              onClick={() => setIsCookingOpen(!isCookingOpen)}
              className="w-full px-3 py-1.5 bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200/80 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  Cooking in Progress
                </h3>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-indigo-100 text-indigo-900">
                  {filteredPreparingOrders.length}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <span>{isCookingOpen ? 'Collapse' : 'Expand'}</span>
                {isCookingOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            </button>

            {isCookingOpen && (
              <div className="p-2 sm:p-2.5">
                {filteredPreparingOrders.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3 font-normal">No orders currently cooking.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                    {filteredPreparingOrders.map((order) => (
                      <div
                        key={order.id}
                        className="bg-white border border-indigo-200/80 rounded-lg p-2.5 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between gap-2"
                      >
                        <div className="space-y-1.5">
                          {/* Card Header */}
                          <div className="flex items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="font-mono font-bold text-[13px] text-slate-900 tracking-tight">
                                {order.order_number}
                              </span>
                              <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                                Slot {order.slot_number || (order.order_number.includes('-') ? order.order_number.split('-')[0] : 1)}
                              </span>
                              {(order.building || order.break_timing) && (
                                <span className="px-1 py-0.2 rounded text-[9px] font-medium bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center gap-0.5">
                                  <Building2 className="w-2 h-2 text-amber-600" />
                                  <span>{order.building ? order.building : ''}{order.building && order.break_timing ? ' · ' : ''}{order.break_timing ? order.break_timing : ''}</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-400 flex items-center gap-0.5 shrink-0">
                              <Clock className="w-2.5 h-2.5 text-slate-400" />
                              {formatElapsed(order.created_at)}
                            </span>
                          </div>

                          {/* Dishes List */}
                          <div className="space-y-0.5 pt-0.5">
                            {order.items.map((item, idx) => (
                              <div 
                                key={idx}
                                className="flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded bg-indigo-50/40 border border-indigo-100/60"
                              >
                                <span className="font-medium text-slate-800">{item.name}</span>
                                <span className="font-mono font-bold text-indigo-700 bg-indigo-100 px-1 py-0.2 rounded text-[10px]">
                                  ×{item.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1 pt-1 border-t border-slate-100">
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="h-7 px-1.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors text-[10px] font-medium flex items-center gap-0.5"
                            title="Cancel order"
                          >
                            <Ban className="w-3 h-3" />
                            <span className="hidden sm:inline">Cancel</span>
                          </button>

                          <button
                            onClick={() => updateOrderStatus(order.id, 'READY')}
                            className="flex-1 h-7 px-2.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Mark Ready</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* ================= TAB 2: COUNTER PICKUP & PIN HANDOVER ================= */
        <div className="space-y-2.5">
          
          {/* READY FOR PICKUP GRID */}
          <div>
            <div className="flex items-center justify-between pb-1.5">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <h2 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  Ready for Pickup ({filteredReadyOrders.length})
                </h2>
              </div>
              <span className="text-[10px] text-slate-400 font-normal">Enter 4-character pickup code to complete</span>
            </div>

            {filteredReadyOrders.length === 0 ? (
              <div className="bg-white border border-slate-200/90 rounded-lg p-6 text-center flex flex-col items-center justify-center text-slate-400 shadow-2xs">
                <PackageCheck className="w-7 h-7 text-slate-300 mb-1" />
                <span className="text-[11px] font-bold text-slate-700">No Orders Awaiting Pickup</span>
                <span className="text-[10px] text-slate-400 mt-0.5 font-normal">Orders marked ready in the kitchen will appear here.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                {filteredReadyOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-emerald-300/80 rounded-lg p-2.5 shadow-2xs flex flex-col justify-between gap-2"
                  >
                    <div className="space-y-1.5">
                      {/* Top Row: Ticket & Time */}
                      <div className="flex justify-between items-center pb-1 border-b border-slate-100">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-mono font-bold text-[13px] text-slate-900">{order.order_number}</span>
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
                            Slot {order.slot_number || (order.order_number.includes('-') ? order.order_number.split('-')[0] : 1)}
                          </span>
                          <span className="px-1 py-0.2 bg-emerald-50 text-emerald-700 border border-emerald-200/80 rounded text-[9px] font-semibold">
                            Ready
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-400">{formatElapsed(order.created_at)}</span>
                          <button
                            onClick={() => handleCancelOrder(order)}
                            className="p-0.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                            title="Cancel order"
                          >
                            <Ban className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Customer Info */}
                      <div className="flex items-center justify-between gap-1.5 text-[11px]">
                        <div className="flex items-center gap-1 min-w-0">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-semibold text-slate-900 truncate">{order.student_name}</span>
                          {order.student_roll && (
                            <span className="font-mono text-slate-400 text-[10px] flex items-center gap-0.5">
                              <Phone className="w-2 h-2 text-slate-400" />
                              <span>{order.student_roll}</span>
                            </span>
                          )}
                        </div>
                        {(order.building || order.break_timing) && (
                          <span className="text-[9px] text-amber-800 bg-amber-50 px-1 py-0.2 rounded border border-amber-200/60 font-medium shrink-0">
                            {order.break_timing || order.building}
                          </span>
                        )}
                      </div>

                      {/* Dishes List */}
                      <div className="bg-slate-50 border border-slate-100 rounded p-1.5 space-y-0.5 text-[11px]">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center">
                            <span className="font-medium text-slate-700">
                              {item.name} <span className="font-mono font-bold text-slate-900 text-[10px]">×{item.quantity}</span>
                            </span>
                            <span className="font-mono text-slate-500 text-[10px]">₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                        <div className="border-t border-slate-200/60 pt-0.5 flex justify-between items-center font-bold text-slate-900 text-[11px]">
                          <span>Total</span>
                          <span className="font-mono">₹{order.total_price}</span>
                        </div>
                      </div>
                    </div>

                    {/* PIN Verification Form */}
                    <div className="space-y-1 pt-1 border-t border-slate-100">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          maxLength={8}
                          placeholder="Code"
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
                          className="w-20 h-7 px-1.5 text-center font-mono font-bold text-[11px] tracking-wider bg-slate-50 border border-slate-300 rounded focus:bg-white focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal uppercase"
                        />
                        <button
                          onClick={() => handleVerifyOrderPin(order)}
                          disabled={verifyingOrders[order.id] || (pinInputs[order.id] || '').length < 3}
                          className="flex-1 h-7 px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded shadow-2xs active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-1"
                        >
                          {verifyingOrders[order.id] ? (
                            <>
                              <RotateCw className="w-2.5 h-2.5 animate-spin" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Handover</span>
                            </>
                          )}
                        </button>
                      </div>

                      {orderErrors[order.id] && (
                        <p className="text-[10px] font-semibold text-rose-600">{orderErrors[order.id]}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* PAST COMPLETED & CANCELLED ORDERS ACCORDION */}
          <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden shadow-2xs mt-3">
            <button
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
              className="w-full px-3 py-1.5 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-1.5">
                <CheckCheck className="w-3 h-3 text-slate-500" />
                <h3 className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                  History ({historyOrders.length})
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <span>{isHistoryExpanded ? 'Collapse' : 'Expand'}</span>
                {isHistoryExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </div>
            </button>

            {isHistoryExpanded && (
              <div className="p-2.5 divide-y divide-slate-100">
                {historyOrders.length === 0 ? (
                  <p className="text-[11px] text-slate-400 text-center py-3 font-normal">No past orders in history.</p>
                ) : (
                  historyOrders.map((order) => {
                    const isCancelled = order.status === 'CANCELLED';
                    return (
                      <div key={order.id} className="py-2 flex items-center justify-between gap-2 text-[11px]">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-mono font-bold text-slate-900 text-xs">{order.order_number}</span>
                            <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-slate-100 text-slate-700">
                              Slot {order.slot_number || (order.order_number.includes('-') ? order.order_number.split('-')[0] : 1)}
                            </span>
                            <span className="font-medium text-slate-700">{order.student_name}</span>
                            <span className={`px-1 py-0.2 rounded text-[9px] font-semibold uppercase ${
                              isCancelled 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200/80' 
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                            }`}>
                              {isCancelled ? 'Cancelled' : 'Completed'}
                            </span>
                            <span className="font-mono font-bold text-slate-900">₹{order.total_price}</span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">
                            {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                          </p>
                          {isCancelled && order.cancellation_reason && (
                            <p className="text-[10px] text-rose-700 mt-0.5 font-medium">
                              Reason: {order.cancellation_reason}
                            </p>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {formatElapsed(order.created_at)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* MODAL: CANCELLATION REASON */}
      {cancellingOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl p-4 max-w-xs w-full shadow-xl border border-slate-200 flex flex-col space-y-2.5 text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                  <Ban className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-xs font-bold text-slate-900">
                    Cancel {cancellingOrderModal.order_number}
                  </h2>
                  <p className="text-[10px] text-slate-500 font-medium truncate">
                    {cancellingOrderModal.student_name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCancellingOrderModal(null)}
                className="text-slate-400 hover:text-slate-700 p-0.5 rounded hover:bg-slate-100 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Reason Chips */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">
                Select Reason:
              </label>
              <div className="flex flex-wrap gap-1">
                {PRESET_CANCELLATION_REASONS.map((preset) => {
                  const isSelected = cancellationReasonText === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setCancellationReasonText(preset)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-all ${
                        isSelected
                          ? 'bg-rose-600 text-white font-semibold shadow-2xs'
                          : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                      }`}
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Textarea */}
            <textarea
              rows={2}
              placeholder="Or type custom reason..."
              value={cancellationReasonText}
              onChange={(e) => setCancellationReasonText(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 outline-none transition-all placeholder:text-slate-400 resize-none"
            />

            {/* Actions */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                type="button"
                onClick={() => setCancellingOrderModal(null)}
                className="flex-1 h-7.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px] transition-colors"
              >
                Keep
              </button>

              <button
                type="button"
                disabled={!cancellationReasonText.trim() || isSubmittingCancellation}
                onClick={handleConfirmCancellation}
                className="flex-1 h-7.5 rounded-md bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1"
              >
                {isSubmittingCancellation ? (
                  <>
                    <RotateCw className="w-3 h-3 animate-spin" />
                    <span>Cancelling...</span>
                  </>
                ) : (
                  <span>Confirm Cancel</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VERIFIED PIN HANDOVER */}
      {verifiedOrderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl p-4 max-w-xs w-full shadow-xl border border-slate-200 flex flex-col items-center text-center space-y-2.5">
            <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>

            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                PIN Verified
              </span>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Order {verifiedOrderModal.order_number}
              </h2>
              <p className="text-[11px] text-slate-600 font-medium">
                Customer: <span className="text-slate-900 font-semibold">{verifiedOrderModal.student_name}</span>
              </p>
            </div>

            {/* Items Summary */}
            <div className="w-full bg-slate-50 border border-slate-200/80 rounded-md p-2 space-y-0.5 text-left text-[11px]">
              {verifiedOrderModal.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center text-slate-700">
                  <span className="font-medium">{item.name}</span>
                  <span className="font-mono font-bold text-slate-900 text-[10px]">×{item.quantity}</span>
                </div>
              ))}
              <div className="border-t border-slate-200 pt-0.5 flex justify-between items-center font-bold text-slate-900 text-[11px]">
                <span>Total</span>
                <span className="font-mono text-emerald-700">₹{verifiedOrderModal.total_price}</span>
              </div>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={handleCloseVerifiedModal}
              className="w-full h-7.5 rounded-md bg-slate-900 hover:bg-black text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98] transition-all flex items-center justify-center gap-1"
            >
              <Check className="w-3 h-3" />
              <span>Complete & Dismiss</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
