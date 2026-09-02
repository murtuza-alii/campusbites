import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  X, 
  RefreshCw, 
  Coffee, 
  Store, 
  Building2, 
  ArrowLeft, 
  Search, 
  ShoppingBag, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  ChefHat, 
  Trash2, 
  Plus, 
  Minus, 
  Lock,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import { SpotlightCard } from './ui/SpotlightCard';
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

export interface BuildingOption {
  id: string;
  name: string;
  breakTimings: string[];
}

export const ANAND_BUILDINGS: BuildingOption[] = [
  {
    id: 'mithibai',
    name: 'Mithibai',
    breakTimings: [
      '9:00 - 9:30',
      '1:00 - 1:30',
      '1:30 - 1:50',
    ],
  },
];

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
  building?: string;
  break_timing?: string;
  slot_number?: number;
  cancellation_reason?: string;
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
  const [studentPhone, setStudentPhone] = useState<string>('');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('Mithibai');
  const [selectedBreakTiming, setSelectedBreakTiming] = useState<string>('');
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'menu' | 'orders'>('menu');
  const [isStudentHistoryExpanded, setIsStudentHistoryExpanded] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isLoadingMenu, setIsLoadingMenu] = useState<boolean>(true);
  const [serverError, setServerError] = useState<string>('');

  const [currentCanteen, setCurrentCanteen] = useState<any>(null);
  const [sisterCanteens, setSisterCanteens] = useState<any[]>([]);
  const [selectedCanteenId, setSelectedCanteenId] = useState<string>('');
  const [isLoadingCanteens, setIsLoadingCanteens] = useState<boolean>(true);

  // Helper for auto-retry on server cold start / wake-up
  const fetchWithRetry = async (url: string, retries = 8, delayMs = 2000): Promise<any> => {
    let lastError: any = null;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          return await res.json();
        }
        if (res.status === 404) {
          throw new Error('Resource not found');
        }
      } catch (err: any) {
        lastError = err;
        if (err.message === 'Resource not found') throw err;
      }
      if (attempt < retries) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
    throw lastError || new Error('Server connection timed out');
  };

  // Fetch Canteens from Server with auto-recovery
  const fetchCanteens = async () => {
    try {
      setServerError('');
      setIsLoadingCanteens(true);
      if (slug) {
        localStorage.setItem('cb_last_diner_slug', slug);
        const data = await fetchWithRetry(`${API_BASE_URL}/api/canteens/by-slug/${slug}`);
        if (data?.canteen) {
          setCurrentCanteen(data.canteen);
          setSisterCanteens(data.sisterCanteens || [data.canteen]);
          setSelectedCanteenId(data.canteen.id);
        } else {
          setServerError('Requested diner or canteen was not found.');
        }
      } else {
        const data = await fetchWithRetry(`${API_BASE_URL}/api/canteens`);
        if (Array.isArray(data) && data.length > 0) {
          const first = data[0];
          setCurrentCanteen(first);
          setSelectedCanteenId(first.id);
          if (first.group_name) {
            setSisterCanteens(data.filter((c: any) => c.group_name === first.group_name));
          } else {
            setSisterCanteens([first]);
          }
        } else {
          setServerError('No canteens available.');
        }
      }
    } catch (err: any) {
      setServerError(`Connection issue: Cloud server is warming up.`);
    } finally {
      setIsLoadingCanteens(false);
    }
  };

  // Fetch Menu from Server with auto-recovery
  const fetchMenu = async (canteenId?: string) => {
    const id = canteenId || selectedCanteenId;
    if (!id) return;
    try {
      setServerError('');
      setIsLoadingMenu(true);
      const data = await fetchWithRetry(`${API_BASE_URL}/api/menu?canteenId=${id}`);
      setMenu(data);
    } catch (err: any) {
      setServerError(`Connection issue: Could not load items.`);
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
    const handleServerReady = () => {
      fetchCanteens();
    };
    window.addEventListener('serverReady', handleServerReady);
    return () => window.removeEventListener('serverReady', handleServerReady);
  }, []);

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

  // Restore active orders from localStorage on mount and sync status
  useEffect(() => {
    const savedOrders = localStorage.getItem('myOrdersList');
    if (savedOrders) {
      try {
        const parsedOrders: Order[] = JSON.parse(savedOrders);
        setMyOrders(parsedOrders);

        const activeOrders = parsedOrders.filter(o => o.status !== 'COMPLETED');
        if (activeOrders.length > 0) {
          Promise.all(
            activeOrders.map(async (order) => {
              try {
                const res = await fetch(`${API_BASE_URL}/api/orders/${order.id}`);
                if (res.ok) {
                  return await res.json();
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

    socket.emit('joinOrderRooms', activeOrders.map(o => o.id));

    const handleOrderStatusChanged = (updatedOrder: Order) => {
      setMyOrders(prevOrders => {
        const index = prevOrders.findIndex(o => o.id === updatedOrder.id);
        if (index === -1) return prevOrders;

        const oldOrder = prevOrders[index];
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
    if (item.is_available === 0) {
      alert(`"${item.name}" is currently sold out and unavailable to order.`);
      return;
    }
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

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const returnOrderId = query.get('order_id');
    if (returnOrderId) {
      verifyAndCompleteOrder(returnOrderId);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const isAnand = Boolean(
    currentCanteen?.slug === 'anand-stall' ||
    currentCanteen?.id === 'c6' ||
    currentCanteen?.name?.toLowerCase().includes('anand') ||
    slug === 'anand-stall'
  );

  const availableBreakTimings = React.useMemo(() => {
    const buildingObj = ANAND_BUILDINGS.find(
      (b) => b.name.toLowerCase() === selectedBuilding.toLowerCase() || b.id === selectedBuilding.toLowerCase()
    );
    return buildingObj ? buildingObj.breakTimings : [];
  }, [selectedBuilding]);

  const handleBuildingChange = (bName: string) => {
    setSelectedBuilding(bName);
    setSelectedBreakTiming('');
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentPhone.trim() || cart.length === 0 || !selectedCanteenId) return;

    // Guard against any item that went out of stock
    const soldOutItem = cart.find(cartItem => {
      const match = menu.find(m => m.id === cartItem.id);
      return match && match.is_available === 0;
    });

    if (soldOutItem) {
      alert(`"${soldOutItem.name}" is currently sold out and unavailable. Please remove it from your cart before proceeding with payment.`);
      return;
    }

    if (isAnand) {
      if (!selectedBuilding) {
        alert('Please select your building before proceeding with payment.');
        return;
      }
      if (!selectedBreakTiming) {
        alert('Please select your break timing before proceeding with payment.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: studentName,
          rollNumber: studentPhone,
          phone: studentPhone,
          canteenId: selectedCanteenId,
          items: cart,
          totalPrice: getCartTotal(),
          building: isAnand ? selectedBuilding : undefined,
          breakTiming: isAnand ? selectedBreakTiming : undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        alert(errData.error || 'Failed to initiate Cashfree payment session.');
        setIsSubmitting(false);
        return;
      }

      const sessionData = await response.json();
      const { paymentSessionId, orderId, environment } = sessionData;
      const checkoutMode = environment === 'production' ? 'production' : 'sandbox';

      const win = window as any;
      if (paymentSessionId && (win.Cashfree || win.loadCashfree)) {
        let cashfreeInstance: any;
        if (typeof win.Cashfree === 'function') {
          cashfreeInstance = win.Cashfree({ mode: checkoutMode });
        } else if (typeof win.loadCashfree === 'function') {
          cashfreeInstance = await win.loadCashfree({ mode: checkoutMode });
        }

        if (cashfreeInstance) {
          cashfreeInstance.checkout({
            paymentSessionId: paymentSessionId,
            redirectTarget: '_modal',
          }).then(async (result: any) => {
            if (result.error) {
              console.warn('[Cashfree] Payment cancelled / failed:', result.error);
              setIsSubmitting(false);
              return;
            }
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

  const clearAllPastOrders = () => {
    const updated = myOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED');
    setMyOrders(updated);
    localStorage.setItem('myOrdersList', JSON.stringify(updated));
  };

  const filteredMenu = menu.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex-1 flex flex-col gap-5 md:gap-6 animate-in">
      
      {/* Header & Sub-tab Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-1">
        <div>
          <h2 className="font-black text-xl sm:text-2xl text-slate-900 tracking-tight">Today's Fresh Menu</h2>
          <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">Order instant snacks, meals & beverages with cashless checkout</p>
        </div>
        
        <div className="inline-flex p-1 bg-slate-200/80 rounded-2xl select-none self-start sm:self-auto shrink-0 shadow-inner">
          <button
            onClick={() => setActiveSubTab('menu')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
              activeSubTab === 'menu'
                ? 'bg-white shadow-sm text-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Browse Menu
          </button>
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 ${
              activeSubTab === 'orders'
                ? 'bg-white shadow-sm text-indigo-600'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>My Orders</span>
            {myOrders.filter(o => o.status !== 'COMPLETED').length > 0 && (
              <span className="bg-indigo-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-5 text-center">
                {myOrders.filter(o => o.status !== 'COMPLETED').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {serverError && (
        <div className="flex items-center justify-between gap-3 p-3.5 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-bold shadow-xs">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
            <span>Connecting to cloud server... items will appear automatically.</span>
          </div>
          <button
            onClick={() => {
              fetchCanteens();
              if (selectedCanteenId) fetchMenu(selectedCanteenId);
            }}
            className="px-3 py-1 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-all shrink-0 shadow-xs"
          >
            Retry Now
          </button>
        </div>
      )}

      {activeSubTab === 'menu' ? (
        <div className="flex-1 flex flex-col lg:flex-row gap-6">
          {/* Main Menu Feed */}
          <div className="flex-1 min-w-0 flex flex-col gap-4 sm:gap-5 pb-28 sm:pb-32 lg:pb-8">
            
            {/* Canteen Header / Sister Outlets Switcher */}
            {isLoadingCanteens ? (
              <div className="h-18 bg-white rounded-2xl border border-slate-200/80 p-3.5 sm:p-4 flex items-center justify-between animate-pulse shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200"></div>
                  <div className="space-y-2">
                    <div className="h-3.5 bg-slate-200 rounded-md w-28 sm:w-40"></div>
                    <div className="h-2.5 bg-slate-200 rounded-md w-36 sm:w-56"></div>
                  </div>
                </div>
                <div className="h-7 w-20 bg-slate-100 rounded-full hidden sm:block"></div>
              </div>
            ) : sisterCanteens.length > 1 ? (
              <div className="space-y-3">
                {currentCanteen?.group_name && (
                  <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h2 className="text-sm sm:text-base font-black text-slate-900 truncate">
                            {currentCanteen.group_name}
                          </h2>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            Open
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate mt-0.5">Showing menu for <span className="font-bold text-slate-700">{currentCanteen.name}</span></p>
                      </div>
                    </div>
                    <Link
                      to="/"
                      className="hidden sm:flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition-all shrink-0"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Campuses</span>
                    </Link>
                  </div>
                )}
                
                {/* Horizontal Scrollable Canteen Pills */}
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Select Outlets</span>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {sisterCanteens.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => handleCanteenChange(c)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 active:scale-95 ${
                          selectedCanteenId === c.id
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                            : 'bg-white border border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {c.image && <img src={c.image} alt={c.name} className="w-4 h-4 rounded-full object-cover shrink-0" />}
                        <span>{c.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 sm:p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
                <div className="flex items-center gap-3">
                  {currentCanteen?.image ? (
                    <img src={currentCanteen.image} alt={currentCanteen?.name} className="w-11 h-11 rounded-xl object-cover shadow-sm" />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Store className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-black text-slate-900">{currentCanteen?.name || 'Diner'}</h2>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">Open Now</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{currentCanteen?.description || 'Fresh meals & beverages served daily'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Search Bar */}
            <div className="relative group">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none">
                <Search className="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Search delicious snacks, drinks, meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-9 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-xs sm:text-sm text-slate-900 shadow-xs focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 placeholder:text-slate-400 placeholder:font-normal outline-none transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar -mx-1 px-1">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 active:scale-95 ${
                    selectedCategory === category
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Food Menu Items Grid */}
            {isLoadingMenu ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-200/80 bg-white shadow-xs space-y-4 animate-pulse">
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-slate-200 rounded-full w-20"></div>
                      <div className="h-5 bg-slate-200 rounded-md w-12"></div>
                    </div>
                    <div className="space-y-2 py-1">
                      <div className="h-4 bg-slate-200 rounded-md w-3/4"></div>
                      <div className="h-3 bg-slate-100 rounded-md w-1/2"></div>
                    </div>
                    <div className="pt-3 border-t border-slate-100">
                      <div className="h-10 bg-slate-100 rounded-xl w-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 text-center bg-white border border-slate-200/80 rounded-3xl p-6">
                <Coffee className="w-10 h-10 text-slate-300 mb-2" />
                <span className="text-sm font-bold text-slate-700">No items match your search</span>
                <span className="text-xs text-slate-400 mt-1">Try resetting the category filter or search keywords</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-5">
                {filteredMenu.map((item) => {
                  const qty = getItemQuantity(item.id);
                  const isAvailable = item.is_available !== 0;
                  return (
                    <SpotlightCard 
                      key={item.id} 
                      className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl flex flex-col justify-between group transition-all border shadow-xs bg-white ${
                        isAvailable 
                          ? 'border-slate-200/90 hover:border-indigo-500/50 hover:shadow-md' 
                          : 'border-rose-200/60 bg-slate-50/80'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-3 h-3 rounded-xs border border-emerald-600 flex items-center justify-center shrink-0" title="Pure Veg">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-100 truncate">
                              {item.category}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            {!isAvailable && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200/80 animate-pulse">
                                Sold Out
                              </span>
                            )}
                            <span className={`text-base sm:text-lg font-black tracking-tight ${isAvailable ? 'text-indigo-600' : 'text-slate-400'}`}>
                              ₹{item.price}
                            </span>
                          </div>
                        </div>

                        <div>
                          <h3 className={`font-black text-sm sm:text-base leading-snug transition-colors ${
                            isAvailable 
                              ? 'text-slate-900 group-hover:text-indigo-600' 
                              : 'text-slate-500 line-through decoration-slate-300'
                          }`}>
                            {item.name}
                          </h3>
                        </div>
                      </div>

                      <div className="pt-3.5 mt-2 border-t border-slate-100/90">
                        {!isAvailable ? (
                          <div className="w-full py-2.5 bg-rose-50/70 border border-rose-200/80 rounded-xl text-[11px] font-bold text-rose-700 text-center select-none flex items-center justify-center gap-1.5 shadow-2xs">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                            <span>Currently Sold Out</span>
                          </div>
                        ) : qty > 0 ? (
                          <div className="flex items-center justify-between bg-slate-100 border border-slate-200 p-1 select-none rounded-xl">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="w-8 h-8 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-700 font-bold active:scale-95 transition-all shadow-xs"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-black text-sm text-slate-900 w-8 text-center">{qty}</span>
                            <button
                              onClick={() => addToCart(item)}
                              className="w-8 h-8 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center font-bold active:scale-95 transition-all shadow-xs"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-600/20 active:scale-[0.98] transition-all"
                          >
                            <ShoppingBag className="w-3.5 h-3.5" />
                            <span>Add to Order</span>
                          </button>
                        )}
                      </div>
                    </SpotlightCard>
                  );
                })}
              </div>
            )}
          </div>

          {/* Desktop Sticky Cart Sidebar */}
          <aside className="hidden lg:block w-[360px] shrink-0 self-start">
            <div className="bg-white rounded-3xl p-6 sticky top-24 border border-slate-200/90 shadow-lg space-y-5 max-h-[calc(100vh-120px)] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <h2 className="font-black text-base text-slate-900">Your Cart</h2>
                </div>
                <span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full font-bold text-xs">
                  {getCartCount()} Items
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center space-y-2 text-slate-400">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-300">
                    <ShoppingBag className="w-7 h-7" />
                  </div>
                  <p className="font-bold text-sm text-slate-700">Cart is empty</p>
                  <p className="text-xs text-slate-400 max-w-[200px]">Add items from the menu to initiate instant checkout</p>
                </div>
              ) : (
                <div className="flex flex-col space-y-4">
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1 no-scrollbar">
                    {cart.map((item) => {
                      const isItemUnavailable = menu.find(m => m.id === item.id)?.is_available === 0;
                      return (
                        <div key={item.id} className={`flex justify-between items-center p-2.5 rounded-xl border ${
                          isItemUnavailable ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-100'
                        }`}>
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className={`text-xs font-black truncate ${isItemUnavailable ? 'text-rose-900 line-through' : 'text-slate-900'}`}>
                                {item.name}
                              </h4>
                              {isItemUnavailable && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-200 text-rose-800">
                                  Sold Out
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500 font-semibold">₹{item.price} each</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="flex items-center bg-white rounded-lg border border-slate-200 p-0.5">
                              <button onClick={() => removeFromCart(item.id)} className="w-5 h-5 flex items-center justify-center text-slate-600 hover:text-slate-900">
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="text-xs font-black text-slate-900 w-5 text-center">{item.quantity}</span>
                              <button 
                                onClick={() => addToCart(item as any)} 
                                disabled={isItemUnavailable}
                                className={`w-5 h-5 flex items-center justify-center ${isItemUnavailable ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:text-slate-900'}`}
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                            <span className="text-xs font-black text-slate-900 w-10 text-right">₹{item.price * item.quantity}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <hr className="border-slate-100" />

                  <form onSubmit={handleCheckout} className="space-y-3.5">
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Your Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Rahul Sharma"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Phone Number</label>
                      <input
                        type="tel"
                        required
                        placeholder="e.g. 9876543210"
                        value={studentPhone}
                        onChange={(e) => setStudentPhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                      />
                    </div>

                    {/* 📍 ANAND STALL SPECIFIC: Building & Break Timings Dropdowns */}
                    {isAnand && (
                      <div className="space-y-3 p-3.5 bg-orange-50/70 border border-orange-200/90 rounded-2xl animate-in fade-in duration-200">
                        <div className="flex items-center gap-1.5 text-orange-950 font-black text-xs">
                          <Building2 className="w-4 h-4 text-orange-600 shrink-0" />
                          <span>Delivery / Break Slot Selection</span>
                        </div>

                        {/* Dropdown 1: Select Building */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                            <span>Select Building</span>
                            <span className="text-orange-600 font-bold text-[9px] bg-orange-100 px-1.5 py-0.5 rounded">Required</span>
                          </label>
                          <div className="relative">
                            <select
                              required
                              value={selectedBuilding}
                              onChange={(e) => handleBuildingChange(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer appearance-none shadow-xs"
                            >
                              <option value="" disabled>-- Select Building --</option>
                              {ANAND_BUILDINGS.map((b) => (
                                <option key={b.id} value={b.name}>{b.name}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>

                        {/* Dropdown 2: Select Break Timing */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                            <span>Select Break Timing</span>
                            <span className="text-orange-600 font-bold text-[9px] bg-orange-100 px-1.5 py-0.5 rounded">Required</span>
                          </label>
                          <div className="relative">
                            <select
                              required
                              disabled={!selectedBuilding || availableBreakTimings.length === 0}
                              value={selectedBreakTiming}
                              onChange={(e) => setSelectedBreakTiming(e.target.value)}
                              className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer appearance-none shadow-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                            >
                              <option value="" disabled>
                                {selectedBuilding ? '-- Select Break Timing --' : '-- Choose building first --'}
                              </option>
                              {availableBreakTimings.map((timing) => (
                                <option key={timing} value={timing}>{timing}</option>
                              ))}
                            </select>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 space-y-1.5 text-xs">
                      <div className="flex justify-between items-center text-slate-500 font-semibold">
                        <span>Subtotal</span>
                        <span>₹{getCartTotal()}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-900 font-black text-sm border-t border-slate-100 pt-2">
                        <span>Total to Pay</span>
                        <span className="text-indigo-600 text-base">₹{getCartTotal()}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Initiating Gateway...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Pay ₹{getCartTotal()} with Cashfree</span>
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center font-bold text-slate-400 flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      <span>100% Secure Checkout • Cashfree PG</span>
                    </p>
                  </form>
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : (
        /* Dedicated My Orders Page view */
        <div className="max-w-3xl w-full mx-auto flex flex-col gap-5 animate-in pb-16">
          <div className="text-center sm:text-left">
            <h1 className="font-black text-xl sm:text-2xl text-slate-900">My Placed Orders</h1>
            <p className="text-xs sm:text-sm font-medium text-slate-500 mt-0.5">Track live cooking progress and show your token number at the counter for pickup</p>
          </div>

          {myOrders.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-center bg-white border border-slate-200/90 rounded-3xl p-8 shadow-sm">
              <Coffee className="w-12 h-12 text-slate-300 mb-3" />
              <span className="text-base font-black text-slate-800">No active orders placed</span>
              <span className="text-xs text-slate-400 mt-1 max-w-xs">Select delicious food from the menu and pay with Cashfree to generate your pickup token.</span>
              <button
                onClick={() => setActiveSubTab('menu')}
                className="mt-4 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-full shadow-md active:scale-95 transition-all"
              >
                Browse Menu Now
              </button>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5">
              {/* Active Orders List */}
              {myOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').length === 0 && myOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED').length > 0 && (
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 text-center shadow-xs">
                  <CheckCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                  <h3 className="text-sm font-black text-slate-800">No active cooking orders</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Check your order history below or order fresh food from the menu.</p>
                </div>
              )}

              {myOrders.filter(o => o.status !== 'COMPLETED' && o.status !== 'CANCELLED').map((order) => {
                const isReady = order.status === 'READY';
                const isPreparing = order.status === 'PREPARING';
                return (
                  <SpotlightCard 
                    key={order.id} 
                    className={`p-5 sm:p-6 flex flex-col md:flex-row gap-5 relative overflow-hidden bg-white border border-slate-200/90 rounded-3xl shadow-md ${
                      isReady ? 'ring-2 ring-emerald-500/80' : ''
                    }`}
                  >
                    <div className="flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="font-black text-lg sm:text-xl text-slate-900 tracking-tight font-mono">{order.order_number}</span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Slot {order.slot_number || (order.order_number.includes('-') ? order.order_number.split('-')[0] : 1)}
                            </span>
                            <span className="text-xs font-mono text-slate-400">
                              {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {order.status === 'PENDING' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-full text-xs font-black uppercase tracking-wider">
                                <Clock className="w-3 h-3 animate-spin" /> Pending
                              </span>
                            )}
                            {order.status === 'PREPARING' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-full text-xs font-black uppercase tracking-wider">
                                <ChefHat className="w-3 h-3 animate-pulse" /> Kitchen Cooking
                              </span>
                            )}
                            {order.status === 'READY' && (
                              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-full text-xs font-black uppercase tracking-wider animate-bounce">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Ready for Pickup!
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1.5 mb-4">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">Ordered Items</span>
                          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 space-y-1.5">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex justify-between items-center text-xs">
                                <span className="font-bold text-slate-800">
                                  {item.name} <span className="text-indigo-600 font-black">×{item.quantity}</span>
                                </span>
                                <span className="font-black text-slate-900">₹{item.price * item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-end border-t border-slate-100 pt-3 flex-wrap gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Customer</span>
                          <span className="text-xs font-bold text-slate-700">{order.student_name} {order.student_roll ? `• ${order.student_roll}` : ''}</span>
                          {(order.building || order.break_timing) && (
                            <div className="flex items-center gap-1.5 mt-1 text-[11px] font-bold text-orange-900 bg-orange-50 border border-orange-200/80 px-2.5 py-1 rounded-lg">
                              {order.building && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3 text-orange-600 shrink-0" />
                                  <span>{order.building}</span>
                                </span>
                              )}
                              {order.building && order.break_timing && <span>•</span>}
                              {order.break_timing && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-orange-600 shrink-0" />
                                  <span>Break: {order.break_timing}</span>
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider block">Total Paid</span>
                          <span className="text-xl font-black text-indigo-600">₹{order.total_price}</span>
                        </div>
                      </div>
                    </div>

                    <div className={`md:w-64 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-2 border ${
                      isReady 
                        ? 'bg-emerald-50/90 border-emerald-300 shadow-sm' 
                        : isPreparing
                        ? 'bg-indigo-50/60 border-indigo-200'
                        : 'bg-amber-50/50 border-amber-200'
                    }`}>
                      <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">
                        Pickup Token
                      </span>
                      <div className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 font-mono">
                        {order.order_number}
                      </div>

                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Slot {order.slot_number || (order.order_number.includes('-') ? order.order_number.split('-')[0] : 1)} (Batch of 25)
                      </span>
                      
                      <div className="bg-white px-3.5 py-1.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2 my-1">
                        <span className="text-[11px] font-bold text-slate-500 uppercase">Counter PIN:</span>
                        <span className="text-lg font-black font-mono text-indigo-600 tracking-widest">{order.pickup_code}</span>
                      </div>

                      <p className="text-[11px] font-semibold text-slate-600 leading-tight">
                        {isReady ? (
                          <span className="text-emerald-800 font-bold">Your food is ready! Show token {order.order_number} & PIN at the counter.</span>
                        ) : (
                          <span>Cooks are preparing your order. Keep token handy.</span>
                        )}
                      </p>
                    </div>
                  </SpotlightCard>
                );
              })}

              {/* 📜 COLLAPSIBLE COMPLETED & CANCELLED ORDERS ACCORDION */}
              {myOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED').length > 0 && (
                <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm mt-6">
                  <button
                    onClick={() => setIsStudentHistoryExpanded(!isStudentHistoryExpanded)}
                    className="w-full p-4 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCheck className="w-4 h-4 text-slate-500" />
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                        Past Completed & Cancelled Orders ({myOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED').length})
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
                      <span>{isStudentHistoryExpanded ? 'Collapse' : 'Expand'}</span>
                      {isStudentHistoryExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {isStudentHistoryExpanded && (
                    <div className="p-3 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                        <p className="text-[11px] text-slate-500 font-medium">
                          Clear recent orders from this phone's screen.
                        </p>
                        <button
                          type="button"
                          onClick={clearAllPastOrders}
                          className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 text-slate-600 text-[11px] font-bold active:scale-95 transition-all"
                        >
                          Clear All from Phone
                        </button>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {myOrders.filter(o => o.status === 'COMPLETED' || o.status === 'CANCELLED').map((order) => {
                        const isCancelled = order.status === 'CANCELLED';
                        return (
                          <div key={order.id} className="py-3 flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-black text-sm text-slate-900">{order.order_number}</span>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Slot {order.slot_number || (order.order_number.includes('-') ? order.order_number.split('-')[0] : 1)}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                  isCancelled 
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}>
                                  {isCancelled ? 'Cancelled by Canteen' : 'Completed'}
                                </span>
                                <span className="text-xs font-bold text-slate-700">₹{order.total_price}</span>
                                <span className="text-[11px] font-mono text-slate-400">
                                  {new Date(order.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                </span>
                                {(order.building || order.break_timing) && (
                                  <span className="text-[10px] font-bold text-orange-800 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-md">
                                    {order.building ? order.building : ''}
                                    {order.building && order.break_timing ? ' • ' : ''}
                                    {order.break_timing ? `Break: ${order.break_timing}` : ''}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 truncate mt-0.5">
                                {order.items.map(i => `${i.name} ×${i.quantity}`).join(', ')}
                              </p>
                              {isCancelled && (
                                <div className="mt-1.5 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-0.5">
                                  <div className="font-bold flex items-center gap-1.5 text-rose-700">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>Cancellation Reason:</span>
                                    <span className="font-black text-rose-950">{order.cancellation_reason || 'Cancelled by canteen kitchen'}</span>
                                  </div>
                                  <p className="text-[10px] text-rose-600 font-medium">
                                    If paid online, refund will be processed to your original payment method in 2-3 business days.
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* 🗑️ BIG PROMINENT RED DELETE BUTTON (44px x 44px) */}
                            <button
                              onClick={() => removeOrderFromHistory(order.id)}
                              className="w-11 h-11 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 hover:text-rose-700 flex items-center justify-center transition-all active:scale-90 shrink-0 shadow-xs"
                              title="Delete order from history"
                              aria-label="Delete order"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </div>
                        );
                      })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🚀 HIGH-CONVERSION MOBILE STICKY BOTTOM CHECKOUT BAR (Swiggy / Zomato / DoorDash style) */}
      {cart.length > 0 && activeSubTab === 'menu' && (
        <div className="lg:hidden fixed bottom-4 inset-x-3 z-40 animate-in slide-in-from-bottom-5 duration-300">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full bg-slate-900 hover:bg-black text-white p-3.5 sm:p-4 rounded-2xl shadow-2xl shadow-slate-900/40 border border-slate-800 flex items-center justify-between active:scale-[0.98] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-white shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-wide bg-white/20 px-2 py-0.5 rounded-md">
                    {getCartCount()} {getCartCount() === 1 ? 'ITEM' : 'ITEMS'}
                  </span>
                  <span className="text-base font-black text-white">₹{getCartTotal()}</span>
                </div>
                <p className="text-[10px] text-slate-300 font-semibold mt-0.5">Cashless Cashfree PG checkout</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 font-black text-xs bg-white text-slate-900 px-4 py-2.5 rounded-xl shadow-xs">
              <span>View Cart & Pay</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>
      )}

      {/* Mobile Cart Slider Bottom Sheet Drawer */}
      {isCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="relative max-h-[88vh] bg-white rounded-t-3xl p-5 sm:p-6 flex flex-col animate-slide-up shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <h3 className="font-black text-base text-slate-900">
                  Your Cart ({getCartCount()} Items)
                </h3>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-1 space-y-2.5 max-h-56 pr-1 no-scrollbar">
              {cart.map((item) => {
                const isItemUnavailable = menu.find(m => m.id === item.id)?.is_available === 0;
                return (
                  <div key={item.id} className={`flex justify-between items-center p-2.5 rounded-2xl border ${
                    isItemUnavailable ? 'bg-rose-50/70 border-rose-200' : 'bg-slate-50 border-slate-200/80'
                  }`}>
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className={`text-xs font-black truncate ${isItemUnavailable ? 'text-rose-900 line-through' : 'text-slate-900'}`}>
                          {item.name}
                        </h4>
                        {isItemUnavailable && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-rose-200 text-rose-800">
                            Sold Out
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500 font-semibold">₹{item.price} each</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center bg-white rounded-xl border border-slate-200 p-0.5">
                        <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center text-slate-700">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black text-slate-900 w-5 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => addToCart(item as any)} 
                          disabled={isItemUnavailable}
                          className={`w-6 h-6 flex items-center justify-center ${isItemUnavailable ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700'}`}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <span className="text-xs font-black text-slate-900 w-12 text-right">₹{item.price * item.quantity}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            <hr className="border-slate-100" />

            <form onSubmit={handleCheckout} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="e.g. 9876543210"
                  value={studentPhone}
                  onChange={(e) => setStudentPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 placeholder:font-normal"
                />
              </div>

              {/* 📍 ANAND STALL SPECIFIC: Building & Break Timings Dropdowns (Mobile Drawer) */}
              {isAnand && (
                <div className="space-y-2.5 p-3 bg-orange-50/80 border border-orange-200 rounded-2xl animate-in fade-in duration-200">
                  <div className="flex items-center gap-1.5 text-orange-950 font-black text-xs">
                    <Building2 className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                    <span>Delivery / Break Slot</span>
                  </div>

                  {/* Dropdown 1: Select Building */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Select Building</span>
                      <span className="text-orange-600 font-bold text-[9px] bg-orange-100 px-1.5 py-0.5 rounded">Required</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        value={selectedBuilding}
                        onChange={(e) => handleBuildingChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer appearance-none shadow-xs"
                      >
                        <option value="" disabled>-- Select Building --</option>
                        {ANAND_BUILDINGS.map((b) => (
                          <option key={b.id} value={b.name}>{b.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Dropdown 2: Select Break Timing */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                      <span>Select Break Timing</span>
                      <span className="text-orange-600 font-bold text-[9px] bg-orange-100 px-1.5 py-0.5 rounded">Required</span>
                    </label>
                    <div className="relative">
                      <select
                        required
                        disabled={!selectedBuilding || availableBreakTimings.length === 0}
                        value={selectedBreakTiming}
                        onChange={(e) => setSelectedBreakTiming(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-orange-200 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition-all cursor-pointer appearance-none shadow-xs disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                      >
                        <option value="" disabled>
                          {selectedBuilding ? '-- Select Break Timing --' : '-- Choose building first --'}
                        </option>
                        {availableBreakTimings.map((timing) => (
                          <option key={timing} value={timing}>{timing}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-1 space-y-1 text-xs">
                <div className="flex justify-between items-center text-slate-500 font-semibold">
                  <span>Subtotal</span>
                  <span>₹{getCartTotal()}</span>
                </div>
                <div className="flex justify-between items-center text-slate-900 font-black text-sm border-t border-slate-100 pt-1.5">
                  <span>Total Amount</span>
                  <span className="text-indigo-600 text-base">₹{getCartTotal()}</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Gateway...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pay ₹{getCartTotal()} with Cashfree</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-center font-bold text-slate-400 flex items-center justify-center gap-1 pb-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <span>100% Secure Sandbox Checkout • Cashfree PG</span>
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
