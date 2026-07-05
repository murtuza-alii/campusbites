import React, { useState, useEffect } from 'react';
import { X, RefreshCw, Coffee, ShieldAlert } from 'lucide-react';
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

  const [canteens, setCanteens] = useState<any[]>([]);
  const [selectedCanteenId, setSelectedCanteenId] = useState<string>('');
  const [isLoadingCanteens, setIsLoadingCanteens] = useState<boolean>(true);

  // Fetch Canteens from Server
  const fetchCanteens = async () => {
    try {
      setServerError('');
      const response = await fetch(`${API_BASE_URL}/api/canteens`);
      if (response.ok) {
        const data = await response.json();
        setCanteens(data);
        if (data.length > 0) {
          setSelectedCanteenId(data[0].id);
        }
      } else {
        setServerError('Failed to load canteens.');
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

  const handleCanteenChange = (canteenId: string) => {
    if (cart.length > 0) {
      const confirmChange = window.confirm("Switching canteens will clear your current cart. Do you want to proceed?");
      if (!confirmChange) return;
    }
    setSelectedCanteenId(canteenId);
    setCart([]);
  };

  useEffect(() => {
    fetchCanteens();
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

  // Restore active orders from localStorage on mount
  useEffect(() => {
    const savedOrders = localStorage.getItem('myOrdersList');
    if (savedOrders) {
      try {
        setMyOrders(JSON.parse(savedOrders));
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

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim() || !studentRoll.trim() || cart.length === 0 || !selectedCanteenId) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/orders`, {
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

      if (response.ok) {
        const orderData = await response.json();
        const updatedOrders = [orderData, ...myOrders];
        setMyOrders(updatedOrders);
        localStorage.setItem('myOrdersList', JSON.stringify(updatedOrders));
        setCart([]);
        setIsCartOpen(false);
        setActiveSubTab('orders'); // Switch to orders tab
      } else {
        alert('Failed to place order. Please try again.');
      }
    } catch (e) {
      alert('Network error. Is the server running?');
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
            
            {/* Canteen Selector */}
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-text-secondary block">Select Canteen / Outlet</label>
              {isLoadingCanteens ? (
                <div className="flex items-center gap-2 text-text-muted py-4">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading canteens...</span>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {canteens.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => handleCanteenChange(c.id)}
                      className={`flex flex-col items-center p-4 rounded-3xl border transition-all duration-300 ${
                        selectedCanteenId === c.id
                          ? 'bg-primary-container/10 border-primary text-primary shadow-lg shadow-indigo-500/5'
                          : 'bg-white/40 border-white/60 hover:bg-white/60 text-text-primary'
                      }`}
                    >
                      {c.image && (
                        <img src={c.image} alt={c.name} className="w-12 h-12 rounded-2xl object-cover mb-2 shadow-sm" />
                      )}
                      <span className="font-bold text-sm text-center leading-tight">{c.name}</span>
                      <span className="text-[10px] text-text-muted mt-1 text-center line-clamp-1">{c.description}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search Bar */}
            <div className="relative group">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-outline">search</span>
              <input
                type="text"
                placeholder="Search delicious snacks, drinks, meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl font-body-md text-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all placeholder:text-text-muted outline-none"
              />
            </div>

            {/* Category Filter Dropdown */}
            <div className="space-y-2">
              <label className="font-label-md text-label-md text-text-secondary block">Filter by Category</label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full appearance-none bg-white/40 backdrop-blur-xl border border-white/60 rounded-2xl px-5 py-4 font-body-md focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all pr-10 outline-none text-text-primary"
                >
                  {categories.map((category) => (
                    <option key={category} value={category} className="text-text-primary bg-white">{category}</option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">expand_more</span>
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
                    <div 
                      key={item.id} 
                      className={`glass-card rounded-3xl overflow-hidden flex flex-col group transition-all duration-300 ${
                        isAvailable 
                          ? 'hover:scale-[1.01]' 
                          : 'opacity-60'
                      }`}
                    >
                      {item.image && (
                        <div className="h-48 overflow-hidden relative bg-neutral-bg5">
                          <img 
                            src={item.image} 
                            alt={item.name} 
                            className={`w-full h-full object-cover transition-transform duration-500 ${
                              isAvailable ? 'group-hover:scale-110 ease-out' : 'grayscale-[40%]'
                            }`}
                          />
                          <span className="absolute top-3 right-3 px-3 py-1 bg-white/80 backdrop-blur-md rounded-full text-[10px] font-bold uppercase tracking-wider text-primary">
                            {item.category}
                          </span>
                        </div>
                      )}
                      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-headline-sm text-headline-sm text-text-primary">{item.name}</h3>
                            {!item.image && (
                              <span className="px-2.5 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-[9px] font-bold uppercase tracking-wider whitespace-nowrap">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <p className="text-[20px] font-bold text-primary mt-1">₹{item.price}</p>
                        </div>

                        <div>
                          {!isAvailable ? (
                            <div className="w-full py-3 bg-white/10 border border-white/20 rounded-2xl text-sm font-semibold text-text-muted text-center select-none">
                              Out of Stock
                            </div>
                          ) : qty > 0 ? (
                            <div className="flex items-center justify-between bg-white/35 backdrop-blur-md border border-white/45 p-1 select-none rounded-2xl">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="w-10 h-10 rounded-xl bg-white/40 hover:bg-white/60 flex items-center justify-center text-primary transition-all"
                              >
                                <span className="material-symbols-outlined text-[20px]">remove</span>
                              </button>
                              <span className="font-bold text-sm text-text-primary w-8 text-center">{qty}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-10 h-10 rounded-xl bg-white/40 hover:bg-white/60 flex items-center justify-center text-primary transition-all"
                              >
                                <span className="material-symbols-outlined text-[20px]">add</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="w-full glossy-primary text-white py-3 rounded-2xl font-label-md flex items-center justify-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">add_shopping_cart</span>
                              Add to Cart
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
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
                      className="w-full py-4 rounded-2xl glossy-primary text-white font-label-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Ordering...
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[20px]">local_mall</span>
                          Place Order
                        </>
                      )}
                    </button>
                    <p className="text-center font-label-sm text-label-sm text-text-muted">
                      Pick up your order in 15-20 mins
                    </p>
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
            <div className="space-y-gutter">
              {myOrders.map((order) => {
                const isCompleted = order.status === 'COMPLETED';
                return (
                  <div 
                    key={order.id} 
                    className={`glass-card rounded-2xl p-stack-lg flex flex-col md:flex-row gap-gutter relative overflow-hidden group border border-white/40 ${isCompleted ? 'opacity-70' : ''}`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                          <span className="font-headline-sm text-headline-sm text-text-primary">{order.order_number}</span>
                          <span className="font-body-sm text-body-sm text-text-muted">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span 
                            className={`px-4 py-1.5 rounded-full font-label-sm border flex items-center gap-1.5 ${
                              order.status === 'PENDING' ? 'bg-warning/10 text-warning border-warning/20' :
                              order.status === 'PREPARING' ? 'bg-primary/10 text-primary border-primary/20' :
                              'bg-success/10 text-success border-success/20'
                            }`}
                          >
                            <span className={`w-2 h-2 rounded-full ${
                              order.status === 'PENDING' ? 'bg-warning animate-pulse' :
                              order.status === 'PREPARING' ? 'bg-primary animate-pulse' :
                              'bg-success'
                            }`}></span>
                            {order.status}
                          </span>
                          
                          {/* Delete from history button */}
                          {isCompleted && (
                            <button
                              onClick={() => removeOrderFromHistory(order.id)}
                              className="primary-gloss p-2 rounded-xl text-white flex items-center justify-center shadow-lg hover:shadow-primary/20 bg-primary-container"
                              title="Clear history"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-4 mb-8">
                        <div className="flex flex-col gap-1">
                          <span className="font-label-sm text-text-muted uppercase tracking-wider">ORDERED DISHES</span>
                          {order.items.map((item) => (
                            <div key={item.id} className="flex justify-between items-center">
                              <span className="font-body-md text-text-primary">{item.name} <span className="text-primary font-bold">x{item.quantity}</span></span>
                              <span className="font-headline-sm text-headline-sm text-text-primary">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>

                        <hr className="border-outline-variant/30" />

                        <div className="flex justify-between items-end">
                          <div className="flex flex-col gap-1">
                            <span className="font-label-sm text-text-muted uppercase tracking-wider">ORDERED BY</span>
                            <span className="font-body-md text-text-primary font-semibold">{order.student_name} ({order.student_roll})</span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-label-sm text-text-muted uppercase tracking-wider">TOTAL PAID</span>
                            <span className="font-headline-md text-headline-md text-primary">₹{order.total_price}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* OTP & QR Code Section */}
                    {!isCompleted ? (
                      <div className="md:w-1/3 bg-surface-container/50 rounded-2xl p-6 flex flex-col items-center justify-center border border-white/20 gap-4 relative">
                        <div className="text-center w-full">
                          <span className="font-label-sm text-text-muted uppercase tracking-wider block mb-2">PICKUP OTP</span>
                          <div className="font-mono text-[40px] font-bold text-primary tracking-[8px] leading-tight mb-1">
                            {order.pickup_code}
                          </div>
                          <p className="text-[10px] leading-tight text-text-muted px-4">Pay offline and show code to canteen staff</p>
                        </div>
                        <div className="p-3 bg-white rounded-xl shadow-inner border border-outline-variant/20 group-hover:scale-105 transition-transform duration-500">
                          <img 
                            className="w-24 h-24 object-contain" 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(order.pickup_code)}&color=0f172a`} 
                            alt="Order QR"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="md:w-1/3 bg-success/5 border border-success/15 p-6 rounded-2xl text-center flex flex-col items-center justify-center min-h-[160px] self-stretch justify-self-stretch">
                        <span className="material-symbols-outlined text-success text-[40px] mb-2" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                        <span className="text-success text-sm font-bold">Order Completed!</span>
                        <span className="text-xs text-text-muted mt-1 max-w-[180px]">Dishes collected and paid. Thank you!</span>
                      </div>
                    )}
                  </div>
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
                className="w-full py-4 rounded-2xl glossy-primary text-white font-label-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Ordering...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[20px]">local_mall</span>
                    Place Order
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
