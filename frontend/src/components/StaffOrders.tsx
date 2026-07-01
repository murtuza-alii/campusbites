import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, Check, Coffee, RotateCw, CheckCircle, ShieldAlert, Sparkles, User, FileText, CheckCheck } from 'lucide-react';

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
  
  // Keep track of previous orders length to play sound on new orders
  const prevPendingCount = useRef<number>(0);

  const fetchOrders = async () => {
    const token = localStorage.getItem('staffToken');
    if (!token) {
      navigate('/staff/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/admin/orders', {
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
    fetchOrders();
    // Poll orders every 5 seconds
    const interval = setInterval(fetchOrders, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: 'PREPARING' | 'READY' | 'COMPLETED') => {
    const token = localStorage.getItem('staffToken');
    if (!token) return;

    try {
      const response = await fetch(`http://localhost:5000/api/admin/orders/${orderId}/status`, {
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
      
      {/* Dashboard title and tabs */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Orders Board</h2>
          <p className="text-sm text-text-secondary">Process student orders in real time</p>
        </div>

        {error && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-status-error/15 border border-status-error/30 text-status-error rounded-lg text-xs font-semibold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex bg-neutral-bg2 p-1 rounded-lg border border-border-subtle">
          <button
            onClick={() => setActiveTab('ACTIVE')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
              activeTab === 'ACTIVE'
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Active Orders ({orders.filter(o => o.status !== 'COMPLETED').length})
          </button>
          <button
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 ${
              activeTab === 'COMPLETED'
                ? 'bg-brand text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Completed History
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-text-muted gap-3">
          <RotateCw className="w-8 h-8 animate-spin text-brand" />
          <span>Syncing orders dashboard...</span>
        </div>
      ) : activeTab === 'ACTIVE' ? (
        /* Kanban Board Style for Active Orders */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          
          {/* COLUMN 1: Pending Orders */}
          <div className="flex flex-col bg-neutral-bg2 rounded-xl border border-border-subtle p-4.5 max-h-[70vh] min-h-[400px]">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-warning"></span>
                New / Pending
              </h3>
              <span className="bg-neutral-bg3 px-2 py-0.5 rounded text-[11px] text-text-secondary font-bold border border-border-subtle">
                {getFilteredOrders('PENDING').length}
              </span>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {getFilteredOrders('PENDING').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted text-center py-10">
                  <Coffee className="w-8 h-8 opacity-20 mb-2" />
                  <span className="text-xs">No pending orders</span>
                </div>
              ) : (
                getFilteredOrders('PENDING').map(order => (
                  <div key={order.id} className="glass-card p-4 border border-border-subtle flex flex-col gap-3.5 hover:border-status-warning/40 transition-colors duration-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-text-primary">{order.order_number}</span>
                          <span className="text-[10px] text-text-muted">{formatTime(order.created_at)}</span>
                        </div>
                        <span className="text-xs text-text-secondary mt-1 flex items-center gap-1"><User className="w-3.5 h-3.5 text-text-muted" />{order.student_name} ({order.student_roll})</span>
                      </div>
                      <span className="bg-status-warning/10 text-status-warning border border-status-warning/25 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        Pending
                      </span>
                    </div>

                    <div className="border-t border-border-subtle pt-2">
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-text-secondary">
                            <span>{item.name} <span className="text-text-muted">x{item.quantity}</span></span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs font-bold text-text-primary mt-2 border-t border-dashed border-border-subtle pt-2">
                        <span>Total:</span>
                        <span>₹{order.total_price}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => updateOrderStatus(order.id, 'PREPARING')}
                      className="w-full py-2 bg-status-warning hover:bg-status-warning/90 text-neutral-bg1 rounded-lg text-xs font-bold transition-colors duration-150 flex items-center justify-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      Accept & Cook
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 2: Preparing Orders */}
          <div className="flex flex-col bg-neutral-bg2 rounded-xl border border-border-subtle p-4.5 max-h-[70vh] min-h-[400px]">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-brand animate-pulse"></span>
                In Kitchen / Preparing
              </h3>
              <span className="bg-neutral-bg3 px-2 py-0.5 rounded text-[11px] text-text-secondary font-bold border border-border-subtle">
                {getFilteredOrders('PREPARING').length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {getFilteredOrders('PREPARING').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted text-center py-10">
                  <Clock className="w-8 h-8 opacity-20 mb-2" />
                  <span className="text-xs">No active orders in kitchen</span>
                </div>
              ) : (
                getFilteredOrders('PREPARING').map(order => (
                  <div key={order.id} className="glass-card p-4 border border-border-subtle flex flex-col gap-3.5 hover:border-brand/40 transition-colors duration-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-text-primary">{order.order_number}</span>
                          <span className="text-[10px] text-text-muted">{formatTime(order.created_at)}</span>
                        </div>
                        <span className="text-xs text-text-secondary mt-1 flex items-center gap-1"><User className="w-3.5 h-3.5 text-text-muted" />{order.student_name} ({order.student_roll})</span>
                      </div>
                      <span className="bg-brand/10 text-brand border border-brand/25 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-spin" /> Preparing
                      </span>
                    </div>

                    <div className="border-t border-border-subtle pt-2">
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-text-secondary">
                            <span>{item.name} <span className="text-text-muted">x{item.quantity}</span></span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs font-bold text-text-primary mt-2 border-t border-dashed border-border-subtle pt-2">
                        <span>Total:</span>
                        <span>₹{order.total_price}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => updateOrderStatus(order.id, 'READY')}
                      className="w-full py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-bold transition-colors duration-150 shadow-glow flex items-center justify-center gap-1"
                    >
                      <Sparkles className="w-4 h-4" />
                      Mark Ready for Pickup
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLUMN 3: Ready for Pickup */}
          <div className="flex flex-col bg-neutral-bg2 rounded-xl border border-border-subtle p-4.5 max-h-[70vh] min-h-[400px]">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3 mb-4">
              <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-success animate-ping"></span>
                Ready for Collection
              </h3>
              <span className="bg-neutral-bg3 px-2 py-0.5 rounded text-[11px] text-text-secondary font-bold border border-border-subtle">
                {getFilteredOrders('READY').length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
              {getFilteredOrders('READY').length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-muted text-center py-10">
                  <CheckCircle className="w-8 h-8 opacity-20 mb-2" />
                  <span className="text-xs">No orders waiting for pickup</span>
                </div>
              ) : (
                getFilteredOrders('READY').map(order => (
                  <div key={order.id} className="glass-card p-4 border border-border-subtle flex flex-col gap-3.5 hover:border-status-success/40 transition-colors duration-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-text-primary">{order.order_number}</span>
                          <span className="text-[10px] text-text-muted">{formatTime(order.created_at)}</span>
                        </div>
                        <span className="text-xs text-text-secondary mt-1 flex items-center gap-1"><User className="w-3.5 h-3.5 text-text-muted" />{order.student_name} ({order.student_roll})</span>
                      </div>
                      <span className="bg-status-success/15 text-status-success border border-status-success/30 text-[10px] font-bold px-2 py-0.5 rounded uppercase">
                        Ready
                      </span>
                    </div>

                    {/* Bold verification code */}
                    <div className="bg-neutral-bg3 border border-border-subtle py-2 px-3 rounded-lg text-center flex flex-col items-center">
                      <span className="text-[10px] text-text-secondary font-medium tracking-wide uppercase">Pickup Code</span>
                      <span className="text-xl font-bold tracking-widest text-brand mt-0.5">{order.pickup_code}</span>
                    </div>

                    <div className="border-t border-border-subtle pt-2">
                      <div className="space-y-1">
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-xs text-text-secondary">
                            <span>{item.name} <span className="text-text-muted">x{item.quantity}</span></span>
                            <span>₹{item.price * item.quantity}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between text-xs font-bold text-text-primary mt-2 border-t border-dashed border-border-subtle pt-2">
                        <span>Total:</span>
                        <span>₹{order.total_price}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                      className="w-full py-2 bg-status-success hover:bg-status-success-hover text-white rounded-lg text-xs font-bold transition-colors duration-150 shadow-glow-success flex items-center justify-center gap-1"
                    >
                      <CheckCheck className="w-4 h-4" />
                      Paid & Collected
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      ) : (
        /* Completed History List View */
        <div className="glass-card p-6 border border-border-subtle overflow-x-auto">
          {getFilteredOrders('COMPLETED').length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-text-muted text-center">
              <FileText className="w-12 h-12 opacity-25 mb-3" />
              <span className="text-sm font-semibold">No completed orders yet</span>
              <span className="text-xs text-text-muted mt-1">Orders marked as Paid & Collected will show up here</span>
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-default text-text-muted text-xs uppercase tracking-wider">
                  <th className="pb-3.5 font-bold">Order Num</th>
                  <th className="pb-3.5 font-bold">Student Detail</th>
                  <th className="pb-3.5 font-bold">Food Items</th>
                  <th className="pb-3.5 font-bold text-right">Price</th>
                  <th className="pb-3.5 font-bold text-center">Pickup Time</th>
                  <th className="pb-3.5 font-bold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {getFilteredOrders('COMPLETED').map((order) => (
                  <tr key={order.id} className="text-text-secondary hover:bg-white/[0.02] transition-colors">
                    <td className="py-4 font-bold text-text-primary">{order.order_number}</td>
                    <td className="py-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary">{order.student_name}</span>
                        <span className="text-xs text-text-muted">{order.student_roll}</span>
                      </div>
                    </td>
                    <td className="py-4 max-w-xs">
                      <div className="truncate">
                        {order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                      </div>
                    </td>
                    <td className="py-4 text-right font-semibold text-text-primary">₹{order.total_price}</td>
                    <td className="py-4 text-center text-xs text-text-muted">{formatTime(order.created_at)}</td>
                    <td className="py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success border border-status-success/20">
                        <CheckCheck className="w-3.5 h-3.5" /> Completed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
