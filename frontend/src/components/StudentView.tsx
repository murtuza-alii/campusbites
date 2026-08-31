import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { X, RefreshCw, Coffee, ShieldAlert, Store, Building2, ArrowLeft, Search, ChevronDown } from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';
import { ShinyText } from './ui/ShinyText';
import { HeroChip } from './ui/HeroUIComponents';
import { socket } from '../utils/socket.js';
import { API_BASE_URL } from '../config.js';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_available: number;
  image: string;
}

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

export function StudentView() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const categories = ['All', ...Array.from(new Set(menu.map(item => item.category)))];
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [studentName, setStudentName] = useState<string>('');
  const [studentRoll, setStudentRoll] = useState<string>('');
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'orders'>('menu');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(true);
  const [serverError, setServerError] = useState<string>('');

  const [currentCanteen, setCurrentCanteen] = useState<any>(null);
  const [sisterCanteens, setSisterCanteens] = useState<any[]>([]);
  const [selectedCanteenId, setSelectedCanteenId] = useState<string>('');
  const [isLoadingCanteens, setIsLoadingCanteens] = useState<boolean>(true);

  // Fetch Canteens from Server (Direct Slug or List)
  const fetchCanteens = async () => {
    try {
      setServerError('');
      setIsLoadingCanteens(true);
      if (slug) {
        const response = await fetch(`${API_BASE_URL}/api/canteens/by-slug/${slug}`);
        if (response.ok) {
          const data = await response.json();
          setCurrentCanteen(data.canteen);
          setSisterCanteens(data.sisterCanteens || [data.canteen]);
          setSelectedCanteenId(data.canteen.id);
        } else {
          setServerError('Requested diner or canteen was not found.');
        }
      } else {
        const response = await fetch(`${API_BASE_URL}/api/canteens`);
        if (response.ok) {
          const data = await response.json();
          if (data.length > 0) {
            const first = data[0];
            setCurrentCanteen(first);
            setSelectedCanteenId(first.id);
            if (first.group_name) {
              setSisterCanteens(data.filter((c: any) => c.group_name === first.group_name));
            } else {
              setSisterCanteens([first]);
            }
          }
        } else {
          setServerError('Failed to load canteens.');
        }
      }
    } catch (err: any) {
      setServerError(`Connection Error: ${err?.message || String(err)}`);
    } finally {
      setIsLoadingCanteens(false);
    }
  };

  // Fetch Menu from Server
  const fetchMenu = async (canteenId?: string) => {
    const id = canteenId || selectedCanteenId;
    if (!id) return;
    try {
      setServerError('');
      setIsLoadingMenu(true);
      const response = await fetch(`${API_BASE_URL}/api/menu?canteenId=${id}`);
      if (response.ok) {
        const data = await response.json();
        setMenu(data);
      } else {
        setServerError('Failed to load canteen menu.');
      }
    } catch (err: any) {
      setServerError(`Connection Error: ${err?.message || String(err)}`);
    } finally {
      setIsLoadingMenu(false);
    }
  };

  const handleCanteenChange = (canteen: any) => {
    if (cart.length > 0) {
      const confirmChange = window.confirm("Switching canteens will clear your current cart. Do you want to proceed?");
      if (!confirmChange) return;
    }
    setCurrentCanteen(canteen);
    setSelectedCanteenId(canteen.id);
    setCart([]);
    if (canteen.slug) {
      navigate(`/c/${canteen.slug}`, { replace: true });
    }
  };

  useEffect(() => {
    fetchCanteens();
  }, [slug]);

  useEffect(() => {
    if (selectedCanteenId) {
      fetchMenu(selectedCanteenId);
      setSelectedCategory('All');
    }
  }, [selectedCanteenId]);

  useEffect(() => {
    const handleMenuUpdated = () => {
      if (selectedCanteenId) {
        fetchMenu(selectedCanteenId);
      }
    };
    socket.on('menuUpdated', handleMenuUpdated);
    
    return () => {
      socket.off('menuUpdated', handleMenuUpdated);
    };
  }, [selectedCanteenId]);

  // Restore active orders from localStorage on mount and sync their latest statuses from the server
  useEffect(() => {
    const savedOrders = localStorage.getItem('myOrdersList');
    if (savedOrders) {
      try {
        const parsedOrders: Order[] = JSON.parse(savedOrders);
        setMyOrders(parsedOrders);

        // Fetch latest statuses for non-completed orders to keep them in sync
        const activeOrders = parsedOrders.filter(o => o.status !== 'COMPLETED');
        if (activeOrders.length > 0) {
          Promise.all(
            activeOrders.map(async (order) => {
              try {
                const res = await fetch(`${API_BASE_URL}/api/orders/${order.id}`);
                if (res.ok) {
                  const data = await res.json();
                  return data;
                }
              } catch (e) {
                console.error(`Failed to sync order ${order.id}`, e);
              }
              return null;
            })
          ).then((syncedOrders) => {
            const validSynced = syncedOrders.filter((o): o is Order => o !== null && o !== undefined);
            if (validSynced.length > 0) {
              setMyOrders(prevOrders => {
                const nextOrders = prevOrders.map(prev => {
                  const match = validSynced.find(s => s.id === prev.id);
                  return match ? match : prev;
                });
                localStorage.setItem('myOrdersList', JSON.stringify(nextOrders));
                return nextOrders;
              });
            }
          });
        }
      } catch (e) {
        localStorage.removeItem('myOrdersList');
      }
    }
  }, []);

  // Listen for real-time order status updates via WebSockets
  useEffect(() => {
    const activeOrders = myOrders.filter(o => o.status !== 'COMPLETED');
    if (activeOrders.length === 0) return;

    // Join rooms for all active orders
    socket.emit('joinOrderRooms', activeOrders.map(o => o.id));

    const handleOrderStatusChanged = (updatedOrder: Order) => {
      setMyOrders(prevOrders => {
        const index = prevOrders.findIndex(o => o.id === updatedOrder.id);
        if (index === -1) return prevOrders;

        const oldOrder = prevOrders[index];
        // If status changed to READY, play the notification audio
        if (updatedOrder.status === 'READY' && oldOrder.status !== 'READY') {
          try {
            const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav');
            audio.volume = 0.5;
            audio.play();
          } catch (e) {
            console.error('Failed to play audio alert', e);
          }
        }

        const nextOrders = [...prevOrders];
        nextOrders[index] = updatedOrder;
        localStorage.setItem('myOrdersList', JSON.stringify(nextOrders));
        return nextOrders;
      });
    };

    socket.on('orderStatusChanged', handleOrderStatusChanged);

    return () => {
      socket.off('orderStatusChanged', handleOrderStatusChanged);
    };
  }, [myOrders]);

  const addToCart = (item: MenuItem) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === item.id);
      if (existing) {
        return prevCart.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prevCart, { id: item.id, name: item.name, price: item.price, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prevCart) => {
      const existing = prevCart.find((i) => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prevCart.map((i) => (i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i));
      }
      return prevCart.filter((i) => i.id !== itemId);
    });
  };

  const getCartCount = () => cart.reduce((total, item) => total + item.quantity, 0);
  const getCartTotal = () => cart.reduce((total, item) => total + item.price * item.quantity, 0);

  const getItemQuantity = (itemId: string) => {
    const item = cart.find((i) => i.id === itemId);
    return item ? item.quantity : 0;
  };

  const verifyAndCompleteOrder = async (orderId: string) => {
    try {
      const verifyRes = await fetch(`${API_BASE_URL}/api/payments/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId }),
      });
      const verifyData = await verifyRes.json();

      if (verifyRes.ok && verifyData.order) {
        const orderData = verifyData.order;
        setMyOrders((prev) => {
          const exists = prev.some((o) => o.id === orderData.id);
          const next = exists ? prev.map((o) => (o.id === orderData.id ? orderData : o)) : [orderData, ...prev];
          localStorage.setItem('myOrdersList', JSON.stringify(next));
          return next;
        });
        setCart([]);
        setIsCartOpen(false);
        setActiveSubTab('orders');
      } else {
        // Fallback fetch if order was already written
        const fallbackRes = await fetch(`${API_BASE_URL}/api/orders/${orderId}`);
        if (fallbackRes.ok) {
          const orderData = await fallbackRes.json();
          setMyOrders((prev) => {
            const next = [orderData, ...prev.filter((o) => o.id !== orderData.id)];
            localStorage.setItem('myOrdersList', JSON.stringify(next));
            return next;
          });
          setCart([]);
          setIsCartOpen(false);
          setActiveSubTab('orders');
        }
      }
    } catch (err) {
      console.error('Error verifying order payment:', err);
    }
  };

  // Check URL return query for redirect payments
  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const returnOrderId = query.get('order_id');
    if (returnOrderId) {
      verifyAndCompleteOrder(returnOrderId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentRoll.trim() || cart.length === 0 || !selectedCanteenId) return;

    setIsSubmitting(true);
    try {
      // 1. Create Cashfree payment order session on backend
      const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: studentName,
          rollNumber: studentRoll,
          canteenId: selectedCanteenId,
          items: cart,
          totalPrice: getCartTotal(),
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        alert(errData.error || 'Failed to initiate Cashfree payment session.');
        setIsSubmitting(false);
        return;
      }

      const sessionData = await response.json();
      const { paymentSessionId, orderId } = sessionData;

      // 2. Trigger Cashfree Web Checkout SDK
      const win = window as any;
      if (paymentSessionId && (win.Cashfree || win.loadCashfree)) {
        let cashfreeInstance: any;
        if (typeof win.Cashfree === 'function') {
          cashfreeInstance = win.Cashfree({ mode: 'sandbox' });
        } else if (typeof win.loadCashfree === 'function') {
          cashfreeInstance = await win.loadCashfree({ mode: 'sandbox' });
        }

        if (cashfreeInstance) {
          cashfreeInstance.checkout({
            paymentSessionId: paymentSessionId,
            redirectTarget: '_modal', // Opens sleek modal popup inside page
          }).then(async (result: any) => {
            if (result.error) {
              console.warn('[Cashfree] Payment cancelled / failed:', result.error);
              setIsSubmitting(false);
              return;
            }
            // Once modal closes after payment, verify status
            await verifyAndCompleteOrder(orderId);
          }).catch(async (err: any) => {
            console.error('[Cashfree] Checkout error:', err);
            await verifyAndCompleteOrder(orderId);
          }).finally(() => {
            setIsSubmitting(false);
          });
          return;
        }
      }

      // Fallback if SDK not loaded
      await verifyAndCompleteOrder(orderId);
    } catch (e: any) {
      console.error('Checkout error:', e);
      alert('Network error during payment checkout. Please verify server status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeOrderFromHistory = (orderId: string) => {
    const updated = myOrders.filter(o => o.id !== orderId);
    setMyOrders(updated);
    localStorage.setItem('myOrdersList', JSON.stringify(updated));
  };

  // Filters
  const filteredMenu = menu.filter((item) => {

    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      
      {/* Title, Switcher & Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-headline-lg text-headline-lg text-text-primary">Today's Fresh Menu</h2>
          <p className="font-body-md text-body-md text-text-secondary">Select items to place your instant pickup order</p>
        </div>
        
        <div className="inline-flex p-1 bg-surface-container rounded-2xl glass-card select-none self-start">
          <button
            onClick={() => setActiveSubTab('menu')}
            className={`px-6 py-2 rounded-xl font-label-md text-label-md transition-all duration-300 ${
              activeSubTab === 'menu'
                ? 'bg-white shadow-sm text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Browse Menu
          </button>
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-6 py-2 rounded-xl font-label-md text-label-md transition-all duration-300 flex items-center gap-1.5 ${
              activeSubTab === 'orders'
                ? 'bg-white shadow-sm text-primary font-bold'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            My Orders
            {myOrders.filter(o => o.status !== 'COMPLETED').length > 0 && (
              <span className="bg-primary text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center">
                {myOrders.filter(o => o.status !== 'COMPLETED').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {serverError && (
        <div className="flex items-center gap-2 px-3.5 py-2 bg-status-error/10 border border-status-error/25 text-status-error rounded-xl text-xs font-semibold animate-pulse self-start">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {activeSubTab === 'menu' ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-gutter">
          {/* Left side: Search, Categories and Food Menu List */}
          <div className="flex-1 min-w-0 flex flex-col gap-6">
            
            {/* Header Banner / Canteen Selector */}
            {isLoadingCanteens ? (
              <div className="flex items-center gap-2 text-text-muted py-4">
                <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                <span>Loading diner...</span>
              </div>
            ) : sisterCanteens.length > 1 ? (
              <div className="space-y-4">
                {currentCanteen?.group_name && (
                  <div className="flex items-center justify-between p-4 sm:p-5 bg-white/70 backdrop-blur-md rounded-3xl border border-white/80 shadow-sm">
                    <div className="flex items-center gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-indigo-600/10 text-indigo-600 flex items-center justify-center font-bold">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="font-headline-md text-base sm:text-lg font-black text-slate-900 leading-tight">
                            {currentCanteen.group_name}
                          </h2>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                            Campus Open
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">Showing menu for {currentCanteen.name} · Switch canteen below</p>
                      </div>
                    </div>
                    <Link
                      to="/"
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>All Campuses</span>
                    </Link>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="font-label-md text-xs font-bold text-text-secondary uppercase tracking-wider block">Select Campus Canteen</label>
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {sisterCanteens.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleCanteenChange(c)}
                        className={`flex items-center gap-2.5 px-5 py-2.5 rounded-full font-label-md text-sm font-semibold transition-all duration-300 shrink-0 ${
                          selectedCanteenId === c.id
                            ? 'bg-primary text-white shadow-lg shadow-indigo-500/20 scale-[1.02]'
                            : 'bg-white/50 border border-white/60 text-text-secondary hover:bg-white/80 hover:text-primary'
                        }`}
                      >
                        {c.image && <img src={c.image} alt={c.name} className="w-6 h-6 rounded-full object-cover" />}
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-5 bg-white/60 backdrop-blur-md rounded-3xl border border-white/60 shadow-sm">
                <div className="flex items-center gap-4">
                  {currentCanteen?.image ? (
                    <img src={currentCanteen.image} alt={currentCanteen?.name} className="w-14 h-14 rounded-2xl object-cover shadow-md" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Store className="w-7 h-7" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-headline-md text-xl font-extrabold text-primary">{currentCanteen?.name || 'Diner'}</h2>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">Open Now</span>
                    </div>
                    <p className="font-label-sm text-xs text-text-muted mt-0.5">{currentCanteen?.description || 'Fresh meals & beverages served daily'}</p>
                  </div>
                </div>
                <Link
                  to="/"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All Campuses</span>
                </Link>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600 group-focus-within:text-orange-600 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search delicious snacks, drinks, meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 sm:pl-12 pr-10 py-3.5 sm:py-4 bg-white border border-slate-200/90 rounded-2xl font-bold text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Filter by Category</label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none bg-white border border-slate-200/90 rounded-2xl px-5 py-3.5 sm:py-4 font-bold text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all pr-10 outline-none cursor-pointer"
                >
                  {categories.map((category) => (
                    <option key={category} value={category} className="text-slate-900 bg-white font-semibold">{category}</option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
              </div>
            </div>

            {/* Menu Items Grid */}
            {isLoadingMenu ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-text-muted gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-primary" />
                <span>Loading fresh menu...</span>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-text-muted text-center glass-card p-6">
                <Coffee className="w-12 h-12 text-text-muted/40 mb-3" />
                <span className="text-base font-semibold">No food items found</span>
                <span className="text-xs text-text-muted mt-1">Try resetting search or checking another category</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredMenu.map((item) => {
                  const qty = getItemQuantity(item.id);
                  const isAvailable = item.is_available !== 0;
                  return (
                    <SpotlightCard 
                      key={item.id} 
                      className={`rounded-3xl overflow-hidden flex flex-col group transition-all duration-300 ${
                        isAvailable 
                          ? 'hover:scale-[1.01] hover:border-indigo-500/40 hover:shadow-xl' 
                          : 'opacity-60'
                      }`}
                    >
                      {item.image && (
                        <div className="h-48 overflow-hidden relative bg-slate-100">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className={`w-full h-full object-cover transition-transform duration-500 ${
                              isAvailable ? 'group-hover:scale-105 ease-out' : 'grayscale-[40%]'
                            }`}
                          />
                          <div className="absolute top-3 right-3">
                            <HeroChip variant="primary" size="sm">
                              {item.category}
                            </HeroChip>
                          </div>
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-black text-base text-slate-900 leading-snug">{item.name}</h3>
                            {!item.image && (
                              <HeroChip variant="primary" size="sm">
                                {item.category}
                              </HeroChip>
                            )}
                          </div>
                          <p className="text-xl font-black text-indigo-600 mt-1">₹{item.price}</p>
                        </div>

                        <div>
                          {!isAvailable ? (
                            <div className="w-full py-3 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-500 text-center select-none uppercase tracking-wider">
                              Out of Stock
                            </div>
                          ) : qty > 0 ? (
                            <div className="flex items-center justify-between bg-slate-50 border border-slate-200/90 p-1.5 select-none rounded-2xl shadow-inner">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="w-9 h-9 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all"
                              >
                                <span className="material-symbols-outlined text-[18px]">remove</span>
                              </button>
                              <span className="font-black text-sm text-slate-900 w-8 text-center">{qty}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-9 h-9 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center font-bold active:scale-95 transition-all shadow-sm"
                              >
                                <span className="material-symbols-outlined text-[18px]">add</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all"
                            >
                              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                              Add to Order
                            </button>
                          )}
                        </div>
                      </div>
                    </SpotlightCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right side: Desktop Cart Summary (Hidden on Mobile) */}
          <aside className="hidden lg:block w-[360px] shrink-0 self-start">
            <div className="glass-card rounded-[32px] p-6 sticky top-24 space-y-stack-lg max-h-[calc(100vh-140px)] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_basket</span>
                  <h2 className="font-headline-sm text-headline-sm text-text-primary">Your Cart</h2>
                </div>
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-label-sm text-label-sm">
                  {getCartCount()} Items
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-hazy-lavender flex items-center justify-center text-primary/40">
                    <span className="material-symbols-outlined text-[40px]">shopping_cart_off</span>
                  </div>
                  <div>
                    <p className="font-headline-sm text-headline-sm text-on-surface-variant">Cart is empty</p>
                    <p className="font-body-sm text-body-sm text-text-muted mt-1">Add yummy food from the menu to get started</p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col space-y-stack-lg">
                  {/* Cart List */}
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1 no-scrollbar">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-start gap-2 bg-white/30 border border-white/40 p-2.5 rounded-2xl">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-text-primary leading-tight truncate">{item.name}</h4>
                          <span className="text-xs text-text-muted block mt-0.5">₹{item.price} each</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-white/40 rounded-xl border border-white/40 p-0.5 scale-90">
                            <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center text-primary hover:scale-105">
                              <span className="material-symbols-outlined text-[16px]">remove</span>
                            </button>
                            <span className="text-xs font-bold text-text-primary w-5 text-center">{item.quantity}</span>
                            <button onClick={() => addToCart(item as any)} className="w-6 h-6 flex items-center justify-center text-primary hover:scale-105">
                              <span className="material-symbols-outlined text-[16px]">add</span>
                            </button>
                          </div>
                          <span className="text-xs font-bold text-text-primary w-12 text-right">₹{item.price * item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <hr className="border-white/40" />

                  {/* Checkout Form */}
                  <form onSubmit={handleCheckout} className="space-y-stack-md">
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-text-secondary ml-1">Your Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl font-body-md text-body-md focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="font-label-md text-label-md text-text-secondary ml-1">Roll Number / Phone</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. CS2201 or 9876..."
                        value={studentRoll}
                        onChange={(e) => setStudentRoll(e.target.value)}
                        className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl font-body-md text-body-md focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-muted"
                      />
                    </div>

                    <div className="pt-2 space-y-3">
                      <div className="flex justify-between items-center text-text-secondary">
                        <span className="font-body-md text-body-md">Subtotal</span>
                        <span className="font-body-md text-body-md">₹{getCartTotal()}</span>
                      </div>
                      <div className="flex justify-between items-center text-text-secondary">
                        <span className="font-body-md text-body-md">Tax</span>
                        <span className="font-body-md text-body-md">₹0</span>
                      </div>
                      <div className="flex justify-between items-center text-text-primary border-t border-white/40 pt-3">
                        <span className="font-headline-sm text-headline-sm">Total</span>
                        <span className="font-headline-sm text-headline-sm">₹{getCartTotal()}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-4 rounded-2xl glossy-primary text-white font-label-md flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Processing Payment...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px]">lock</span>
                          Pay ₹{getCartTotal()} with Cashfree
                        </>
                      )}
                    </button>
                    <div className="flex items-center justify-center gap-1.5 text-center font-label-sm text-label-sm text-text-muted">
                      <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span>100% Secure Sandbox Checkout • Cashfree PG</span>
                    </div>
                  </form>

                </div>
              )}
            </div>
          </aside>
        </div>
      ) : (
        /* Dedicated My Orders Page view */
        <div className="max-w-4xl w-full mx-auto flex flex-col gap-6 animate-in">
          <div className="mb-10 text-center md:text-left">
            <h1 className="font-headline-lg text-headline-lg text-text-primary mb-2">My Placed Orders</h1>
            <p className="font-body-md text-body-md text-text-muted">Track the progress of your items and pay at the counter</p>
          </div>
          {myOrders.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-text-muted text-center glass-card p-8">
              <Coffee className="w-12 h-12 text-text-muted/40 mb-3" />
              <span className="text-base font-semibold">No orders placed yet</span>
              <span className="text-xs text-text-muted mt-1 max-w-xs font-body-sm">Once you select foods from the menu and checkout, they will appear here.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {myOrders.map((order) => {
                const isCompleted = order.status === 'COMPLETED';
                return (
                  <SpotlightCard 
                    key={order.id} 
                    className={`p-7 flex flex-col md:flex-row gap-8 relative overflow-hidden group border border-slate-200/90 shadow-lg shadow-slate-200/30 ${isCompleted ? 'opacity-70' : ''}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                          <span className="font-black text-xl text-slate-900 tracking-tight">{order.order_number}</span>
                          <span className="text-xs font-mono text-slate-400">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          {order.status === 'PENDING' && (
                            <HeroChip variant="warning" size="sm" dot>
                              Pending
                            </HeroChip>
                          )}
                          {order.status === 'PREPARING' && (
                            <HeroChip variant="primary" size="sm" dot>
                              Preparing
                            </HeroChip>
                          )}
                          {order.status === 'READY' && (
                            <HeroChip variant="success" size="sm" dot>
                              Ready for Pickup
                            </HeroChip>
                          )}
                          {order.status === 'COMPLETED' && (
                            <HeroChip variant="default" size="sm">
                              Completed
                            </HeroChip>
                          )}
                          
                          {/* Delete from history button */}
                          {isCompleted && (
                            <button
                              onClick={() => removeOrderFromHistory(order.id)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Clear history"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 mb-6">
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Ordered Dishes</span>
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center py-0.5">
                              <span className="text-sm font-semibold text-slate-800">
                                {item.name} <span className="text-indigo-600 font-bold">× {item.quantity}</span>
                              </span>
                              <span className="text-sm font-bold text-slate-900">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <hr className="border-slate-100" />

                        <div className="flex justify-between items-end">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Student Details</span>
                            <span className="text-xs font-bold text-slate-700">{order.student_name} ({order.student_roll})</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">Total</span>
                            <span className="text-2xl font-black text-indigo-600">₹{order.total_price}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* OTP & Signed Verification QR Code Section */}
                    {!isCompleted ? (
                      <div className="md:w-1/3 bg-slate-50 border border-slate-200/90 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 relative">
                        <div className="text-center w-full">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block mb-1">Visual Queue Token</span>
                          <div className="text-3xl font-black text-indigo-600 tracking-tight leading-tight">
                            <ShinyText>{order.order_number}</ShinyText>
                          </div>
                          <div className="font-mono text-xs font-bold text-slate-600 mt-1">
                            Counter OTP: <span className="text-orange-600">{order.pickup_code}</span>
                          </div>
                        </div>

                        {/* Scannable HMAC-Signed Verification QR */}
                        <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-200 group-hover:scale-105 transition-transform duration-300 flex flex-col items-center">
                          <img 
                            className="w-32 h-32 object-contain rounded-lg shadow-xs" 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=2&ecc=M&data=${encodeURIComponent(
                              JSON.stringify((order as any).qr_payload || {
                                order_id: order.id,
                                order_number: order.order_number,
                                canteen_id: (order as any).canteen_id,
                                pickup_code: order.pickup_code
                              })
                            )}&color=0f172a&bgcolor=ffffff`} 
                            alt={`Order ${order.order_number} Verification QR`}
                            loading="lazy"
                          />
                        </div>
                        <p className="text-[11px] text-center leading-tight text-slate-500 px-2">
                          {order.status === 'READY' ? (
                            <span className="text-emerald-700 font-extrabold animate-pulse flex items-center justify-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">check_circle</span>
                              Ready for pickup! Show QR at counter
                            </span>
                          ) : (
                            <span>Show this QR code or 4-digit PIN to staff at counter</span>
                          )}
                        </p>
                      </div>
                    ) : (
                      <div className="md:w-1/3 bg-emerald-50/60 border border-emerald-200 p-6 rounded-2xl text-center flex flex-col items-center justify-center min-h-[160px] self-stretch justify-self-stretch">
                        <span className="material-symbols-outlined text-emerald-600 text-[40px] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="text-emerald-800 text-sm font-bold">Order Completed!</span>
                        <span className="text-xs text-slate-500 mt-1 max-w-[180px]">Verified & collected. Thank you!</span>
                      </div>
                    )}
                  </SpotlightCard>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Floating Cart Button for Mobile (Shows only in Browse Menu) */}
      {cart.length > 0 && activeSubTab === 'menu' && (
        <div className="md:hidden fixed bottom-6 right-6 z-50">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-16 h-16 rounded-full glossy-primary text-white shadow-2xl flex items-center justify-center group relative"
          >
            <span className="material-symbols-outlined text-[28px]">shopping_cart</span>
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-error rounded-full text-[10px] flex items-center justify-center font-bold border-2 border-white">
              {getCartCount()}
            </span>
          </button>
        </div>
      )}

      {/* Mobile Cart Slider Bottom Sheet Drawer */}
      {isCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="relative max-h-[85vh] bg-white/70 backdrop-blur-xl border-t border-white/50 rounded-t-3xl p-6 flex flex-col animate-slide-up shadow-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>shopping_basket</span>
                Your Cart ({getCartCount()})
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-1 space-y-3 pr-1 no-scrollbar">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-2 bg-white/30 border border-white/45 p-3 rounded-2xl">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-text-primary leading-tight truncate">{item.name}</h4>
                    <span className="text-xs text-text-muted block mt-0.5">₹{item.price} each</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white/40 rounded-xl border border-white/40 p-0.5 scale-90">
                      <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center text-primary hover:scale-105">
                        <span className="material-symbols-outlined text-[16px]">remove</span>
                      </button>
                      <span className="text-xs font-bold text-text-primary w-5 text-center">{item.quantity}</span>
                      <button onClick={() => addToCart(item as any)} className="w-6 h-6 flex items-center justify-center text-primary hover:scale-105">
                        <span className="material-symbols-outlined text-[16px]">add</span>
                      </button>
                    </div>
                    <span className="text-sm font-bold text-text-primary w-14 text-right">₹{item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            <hr className="border-white/40" />

            {/* Checkout */}
            <form onSubmit={handleCheckout} className="space-y-4">
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-text-secondary ml-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl font-body-md text-body-md focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-muted"
                />
              </div>
              <div className="space-y-2">
                <label className="font-label-md text-label-md text-text-secondary ml-1">Roll Number / Phone</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CS2201 or 9876..."
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  className="w-full px-4 py-3 bg-white/50 border border-white/60 rounded-xl font-body-md text-body-md focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder:text-text-muted"
                />
              </div>

              <div className="pt-2 space-y-3">
                <div className="flex justify-between items-center text-text-secondary">
                  <span className="font-body-md text-body-md">Subtotal</span>
                  <span className="font-body-md text-body-md">₹{getCartTotal()}</span>
                </div>
                <div className="flex justify-between items-center text-text-primary border-t border-white/40 pt-3">
                  <span className="font-headline-sm text-headline-sm">Total</span>
                  <span className="font-headline-sm text-headline-sm">₹{getCartTotal()}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 rounded-2xl glossy-primary text-white font-label-md flex items-center justify-center gap-2 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">lock</span>
                    Pay ₹{getCartTotal()} with Cashfree
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-1.5 text-center font-label-sm text-label-sm text-text-muted pb-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>100% Secure Sandbox Checkout • Cashfree PG</span>
              </div>
            </form>

          </div>
        </div>
      )}
    </div>
  );
}
