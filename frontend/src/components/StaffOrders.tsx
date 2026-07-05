import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket.js';
import { Clock, Coffee, RotateCw, CheckCircle, ShieldAlert, FileText, CheckCheck } from 'lucide-react';
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

        {/* Canteen Switcher for all roles */}
        {userProfile && (
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
    </div>
  );
}
