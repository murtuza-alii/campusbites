import { useState, useEffect } from 'react';
import { Search, ShoppingBag, Plus, Minus, X, RefreshCw, Clock, Coffee, ShieldAlert, Trash2 } from 'lucide-react';

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
  const categories = ['All', 'Meals', 'Snacks', 'Beverages', 'Desserts'];
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

  // Fetch Menu from Server
  const fetchMenu = async () => {
    try {
      setServerError('');
      const response = await fetch('http://localhost:5000/api/menu');
      if (response.ok) {
        const data = await response.json();
        setMenu(data);
      } else {
        setServerError('Failed to load canteen menu.');
      }
    } catch (err) {
      setServerError('Canteen server is offline. Retrying...');
    } finally {
      setIsLoadingMenu(false);
    }
  };

  useEffect(() => {
    fetchMenu();
    // Refresh menu every 30 seconds
    const interval = setInterval(fetchMenu, 30000);
    return () => clearInterval(interval);
  }, []);

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

  // Poll active orders status
  useEffect(() => {
    const activeOrders = myOrders.filter(o => o.status !== 'COMPLETED');
    if (activeOrders.length === 0) return;

    const pollInterval = setInterval(async () => {
      let hasUpdated = false;
      const updatedOrders = await Promise.all(
        myOrders.map(async (order) => {
          if (order.status === 'COMPLETED') return order;
          try {
            const res = await fetch(`http://localhost:5000/api/orders/${order.id}`);
            if (res.ok) {
              const updated = await res.json();
              if (updated.status !== order.status) {
                hasUpdated = true;
                // Play sound if status changes to READY
                if (updated.status === 'READY') {
                  try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-500.wav');
                    audio.volume = 0.5;
                    audio.play();
                  } catch (e) {}
                }
              }
              return updated;
            }
          } catch (e) {
            console.error('Failed to poll order status for', order.id);
          }
          return order;
        })
      );

      if (hasUpdated) {
        setMyOrders(updatedOrders);
        localStorage.setItem('myOrdersList', JSON.stringify(updatedOrders));
      }
    }, 5000);

    return () => clearInterval(pollInterval);
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
    if (!studentName.trim() || !studentRoll.trim() || cart.length === 0) return;

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:5000/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: studentName,
          rollNumber: studentRoll,
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
      {/* Student View Header Switcher */}
      <div className="flex bg-neutral-bg2 p-1 rounded-xl border border-border-subtle max-w-xs select-none self-start">
        <button
          onClick={() => setActiveSubTab('menu')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
            activeSubTab === 'menu'
              ? 'bg-brand text-white shadow-glow'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Browse Menu
        </button>
        <button
          onClick={() => setActiveSubTab('orders')}
          className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
            activeSubTab === 'orders'
              ? 'bg-brand text-white shadow-glow'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          My Orders
          {myOrders.filter(o => o.status !== 'COMPLETED').length > 0 && (
            <span className="bg-status-success text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
              {myOrders.filter(o => o.status !== 'COMPLETED').length}
            </span>
          )}
        </button>
      </div>

      {activeSubTab === 'menu' ? (
        <div className="flex-1 flex flex-col md:flex-row gap-6">
          {/* Left side: Categories and Food Menu List */}
          <div className="flex-1 flex flex-col gap-6">
            
            {/* Title, Search Bar & offline error */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight text-text-primary">Today's Fresh Menu</h2>
                  <p className="text-sm text-text-secondary">Select items to place your instant pickup order</p>
                </div>
                {serverError && (
                  <div className="flex items-center gap-2 px-3.5 py-2 bg-status-error/10 border border-status-error/25 text-status-error rounded-xl text-xs font-semibold animate-pulse self-start">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{serverError}</span>
                  </div>
                )}
              </div>
              
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
                  <Search className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  placeholder="Search delicious snacks, drinks, meals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass-input block w-full pl-11 pr-4 py-3 rounded-xl text-sm text-text-primary placeholder:text-text-muted w-full"
                />
              </div>
            </div>

            {/* Category Carousel */}
            <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-thin">
              {categories.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-4.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 shrink-0 select-none ${
                    selectedCategory === category
                      ? 'bg-brand text-white shadow-glow border border-transparent'
                      : 'glass text-text-secondary hover:text-text-primary hover:bg-white/5 border border-white/[0.04]'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            {/* Menu Items Grid */}
            {isLoadingMenu ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-text-muted gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-brand" />
                <span>Loading fresh menu...</span>
              </div>
            ) : filteredMenu.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-text-muted text-center glass-card p-6">
                <Coffee className="w-12 h-12 text-text-muted/40 mb-3" />
                <span className="text-base font-semibold">No food items found</span>
                <span className="text-xs text-text-muted mt-1">Try resetting search or checking another category</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredMenu.map((item) => {
                  const qty = getItemQuantity(item.id);
                  return (
                    <div key={item.id} className="glass-card overflow-hidden flex flex-col group hover:border-brand/40 transition-all duration-300">
                      <div className="h-40 overflow-hidden relative bg-neutral-bg3">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-500"
                        />
                        <div className="absolute top-2 right-2 bg-neutral-bg1/80 backdrop-blur-md px-2.5 py-1 rounded-md text-[10px] font-bold text-brand uppercase tracking-wider border border-white/5">
                          {item.category}
                        </div>
                      </div>
                      <div className="p-4.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="font-semibold text-base text-text-primary leading-snug">{item.name}</h3>
                          <span className="text-lg font-black text-text-primary mt-1 block">₹{item.price}</span>
                        </div>

                        <div className="mt-4">
                          {qty > 0 ? (
                            <div className="flex items-center justify-between bg-neutral-bg3 rounded-lg border border-border-default p-1 select-none">
                              <button
                                onClick={() => removeFromCart(item.id)}
                                className="w-8 h-8 rounded-md bg-neutral-bg4 hover:bg-neutral-bg5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="font-bold text-sm text-text-primary w-8 text-center">{qty}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="w-8 h-8 rounded-md bg-neutral-bg4 hover:bg-neutral-bg5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => addToCart(item)}
                              className="w-full py-2 bg-brand/10 hover:bg-brand text-brand hover:text-white border border-brand/20 hover:border-transparent rounded-lg text-sm font-semibold transition-all duration-300 flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Plus className="w-4 h-4" />
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
          <div className="hidden lg:block w-80 shrink-0 self-start">
            <div className="glass-card p-5 sticky top-24 border border-border-strong/10 flex flex-col max-h-[calc(100vh-140px)] shadow-glow">
              <div className="flex items-center justify-between border-b border-border-subtle pb-3">
                <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-brand" />
                  Your Cart
                </h3>
                <span className="bg-brand/15 text-brand border border-brand/35 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {getCartCount()} Items
                </span>
              </div>

              {cart.length === 0 ? (
                <div className="flex-1 py-12 flex flex-col items-center justify-center text-text-muted gap-2 text-center">
                  <ShoppingBag className="w-10 h-10 text-text-muted/30" />
                  <span className="text-sm font-medium">Cart is empty</span>
                  <span className="text-xs text-text-muted max-w-[200px]">Add yummy food from the menu to get started</span>
                </div>
              ) : (
                <div className="flex-1 flex flex-col min-h-0">
                  {/* Cart List */}
                  <div className="flex-1 overflow-y-auto py-3 space-y-3 max-h-72 pr-1 scrollbar-thin">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-start gap-2 bg-neutral-bg3 border border-border-subtle p-2.5 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-xs font-bold text-text-primary leading-tight truncate">{item.name}</h4>
                          <span className="text-xs text-text-muted block mt-0.5">₹{item.price} each</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-neutral-bg4 rounded border border-border-subtle p-0.5 scale-90">
                            <button onClick={() => removeFromCart(item.id)} className="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text-primary"><Minus className="w-3 h-3" /></button>
                            <span className="text-xs font-bold text-text-primary w-5 text-center">{item.quantity}</span>
                            <button onClick={() => addToCart(item as any)} className="w-6 h-6 flex items-center justify-center text-text-secondary hover:text-text-primary"><Plus className="w-3 h-3" /></button>
                          </div>
                          <span className="text-xs font-bold text-text-primary w-12 text-right">₹{item.price * item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Checkout Form */}
                  <form onSubmit={handleCheckout} className="border-t border-border-subtle pt-4 mt-auto space-y-3.5">
                    <div className="flex justify-between font-bold text-text-primary text-sm">
                      <span>Grand Total</span>
                      <span>₹{getCartTotal()}</span>
                    </div>
                    
                    <div className="space-y-2">
                      <input
                        type="text"
                        required
                        placeholder="Your Full Name"
                        value={studentName}
                        onChange={(e) => setStudentName(e.target.value)}
                        className="glass-input block w-full px-3 py-2 rounded-lg text-xs text-text-primary placeholder:text-text-muted"
                      />
                      <input
                        type="text"
                        required
                        placeholder="Roll Number or Phone"
                        value={studentRoll}
                        onChange={(e) => setStudentRoll(e.target.value)}
                        className="glass-input block w-full px-3 py-2 rounded-lg text-xs text-text-primary placeholder:text-text-muted"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg shadow-glow active:scale-98 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Ordering...
                        </>
                      ) : (
                        'Place Order (Pay on Pickup)'
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Dedicated My Orders Page view */
        <div className="max-w-2xl w-full mx-auto flex flex-col gap-6 animate-in">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-text-primary">My Placed Orders</h2>
            <p className="text-sm text-text-secondary">Track the progress of your items and pay at the counter</p>
          </div>

          {myOrders.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-text-muted text-center glass-card p-8">
              <Coffee className="w-12 h-12 text-text-muted/40 mb-3" />
              <span className="text-base font-semibold">No orders placed yet</span>
              <span className="text-xs text-text-muted mt-1 max-w-xs">Once you select foods from the menu and checkout, they will appear here.</span>
            </div>
          ) : (
            <div className="space-y-6">
              {myOrders.map((order) => (
                <div key={order.id} className="bg-neutral-bg2 rounded-2xl border border-border-default overflow-hidden flex flex-col shadow-lg">
                  {/* Order Ticket Header */}
                  <div className="p-4.5 bg-white/[0.02] border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-base text-text-primary">{order.order_number}</span>
                      <span className="text-xs text-text-muted">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                        order.status === 'PENDING' ? 'bg-status-warning/10 text-status-warning border border-status-warning/25' :
                        order.status === 'PREPARING' ? 'bg-brand/10 text-brand border border-brand/25 animate-pulse' :
                        order.status === 'READY' ? 'bg-status-success/15 text-status-success border border-status-success/35 animate-bounce' :
                        'bg-neutral-bg5 text-text-muted border border-border-subtle'
                      }`}>
                        {order.status === 'PREPARING' && <Clock className="w-3.5 h-3.5 animate-spin" />}
                        {order.status}
                      </span>
                      
                      {/* Clear Button */}
                      {order.status === 'COMPLETED' && (
                        <button
                          onClick={() => removeOrderFromHistory(order.id)}
                          className="flex items-center justify-center p-1.5 bg-neutral-bg4 hover:bg-status-error/15 text-text-secondary hover:text-status-error border border-border-subtle rounded-lg transition-colors"
                          title="Remove from history"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Order Ticket Body */}
                  <div className="p-5 flex flex-col md:flex-row gap-6 items-center justify-between">
                    <div className="flex-1 space-y-4 w-full">
                      <div>
                        <h4 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">Ordered Dishes</h4>
                        <div className="space-y-1.5">
                          {order.items.map((item) => (
                            <div key={item.id} className="text-sm text-text-secondary flex justify-between">
                              <span>{item.name} <span className="text-text-muted font-bold ml-1">x{item.quantity}</span></span>
                              <span className="font-semibold text-text-primary">₹{item.price * item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="border-t border-dashed border-border-subtle pt-3.5 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-text-muted uppercase block font-semibold">Ordered By</span>
                          <span className="text-sm font-semibold text-text-secondary">{order.student_name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-text-muted uppercase block font-semibold">Total Paid</span>
                          <span className="text-base font-black text-text-primary">₹{order.total_price}</span>
                        </div>
                      </div>
                    </div>

                    {/* Code Section */}
                    {order.status !== 'COMPLETED' ? (
                      <div className="flex flex-row items-center gap-4 bg-neutral-bg3 border border-border-subtle p-4 rounded-xl shrink-0 w-full md:w-auto justify-between md:justify-start">
                        <div>
                          <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">Pickup OTP</span>
                          <span className="text-3xl font-mono font-black text-brand tracking-widest block mt-0.5">{order.pickup_code}</span>
                          <span className="text-[9px] text-text-muted block mt-1.5 max-w-[130px] leading-tight">Pay offline and show code to canteen staff</span>
                        </div>
                        <div className="w-22 h-22 bg-white p-1 rounded-lg flex items-center justify-center border border-neutral-300 shadow-sm">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(order.pickup_code)}&color=0f172a`} 
                            alt="QR Pass" 
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="bg-status-success/5 border border-status-success/15 p-4 rounded-xl shrink-0 w-full md:w-auto text-center flex flex-col items-center justify-center min-h-[110px]">
                        <span className="text-status-success text-sm font-bold">Order Picked Up!</span>
                        <span className="text-xs text-text-muted mt-1 max-w-[180px]">Thank you! If you order again, clear this pass or browse the menu.</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating Cart Button for Mobile (Shows only in Browse Menu) */}
      {cart.length > 0 && activeSubTab === 'menu' && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="lg:hidden fixed bottom-6 right-6 z-30 bg-brand text-white p-4.5 rounded-full shadow-glow flex items-center justify-center gap-2 group scale-100 hover:scale-105 active:scale-95 transition-all duration-200"
        >
          <div className="relative">
            <ShoppingBag className="w-6 h-6" />
            <span className="absolute -top-2.5 -right-2.5 bg-status-success text-white border border-neutral-bg1 text-[9px] font-black w-5.5 h-5.5 rounded-full flex items-center justify-center">
              {getCartCount()}
            </span>
          </div>
          <span className="text-sm font-bold pr-1">₹{getCartTotal()}</span>
        </button>
      )}

      {/* Mobile Cart Slider Bottom Sheet Drawer */}
      {isCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs">
          <div className="absolute inset-0" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="relative max-h-[85vh] bg-neutral-bg2 border-t border-border-strong rounded-t-2xl p-5 flex flex-col animate-slide-up shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <h3 className="font-bold text-base text-text-primary flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand" />
                Cart Items ({getCartCount()})
              </h3>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1 scrollbar-thin">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-start gap-2 bg-neutral-bg3 border border-border-subtle p-3 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-text-primary leading-tight truncate">{item.name}</h4>
                    <span className="text-xs text-text-muted block mt-0.5">₹{item.price} each</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center bg-neutral-bg4 rounded border border-border-subtle p-0.5">
                      <button onClick={() => removeFromCart(item.id)} className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="text-sm font-bold text-text-primary w-6 text-center">{item.quantity}</span>
                      <button onClick={() => addToCart(item as any)} className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                    <span className="text-sm font-bold text-text-primary w-14 text-right">₹{item.price * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Checkout */}
            <form onSubmit={handleCheckout} className="border-t border-border-subtle pt-4 space-y-4">
              <div className="flex justify-between font-bold text-text-primary text-base">
                <span>Grand Total</span>
                <span>₹{getCartTotal()}</span>
              </div>
              
              <div className="space-y-2">
                <input
                  type="text"
                  required
                  placeholder="Your Full Name"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="glass-input block w-full px-3.5 py-2.5 rounded-lg text-sm text-text-primary placeholder:text-text-muted"
                />
                <input
                  type="text"
                  required
                  placeholder="Roll Number or Phone"
                  value={studentRoll}
                  onChange={(e) => setStudentRoll(e.target.value)}
                  className="glass-input block w-full px-3.5 py-2.5 rounded-lg text-sm text-text-primary placeholder:text-text-muted"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-brand hover:bg-brand-hover text-white text-sm font-semibold rounded-lg shadow-glow active:scale-98 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Ordering...
                  </>
                ) : (
                  'Place Order (Pay on Pickup)'
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
