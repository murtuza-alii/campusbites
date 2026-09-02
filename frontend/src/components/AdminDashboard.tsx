import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Crown, 
  RotateCw, 
  Search, 
  Store, 
  Users, 
  CheckCircle2, 
  Flame, 
  KeyRound, 
  TrendingUp, 
  ShoppingBag, 
  Plus, 
  X, 
  AlertCircle, 
  ShieldCheck, 
  ChefHat, 
  ExternalLink,
  Layers,
  User,
  LogOut
} from 'lucide-react';
import { API_BASE_URL } from '../config.js';
import { decodeToken, type DecodedToken } from '../utils/jwt.js';

interface OverviewMetrics {
  totalRevenue: number;
  totalOrders: number;
  placedOrders: number;
  preparingOrders: number;
  readyOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  canteenBreakdown: Array<{
    canteenId: string;
    canteenName: string;
    slug: string;
    totalOrders: number;
    totalRevenue: number;
    activeOrders: number;
  }>;
  recentOrders: any[];
}

interface StaffUser {
  id: string;
  username: string;
  email: string | null;
  role: 'admin' | 'manager' | 'cook';
  displayName: string;
  canteenId: string | null;
  canteenName: string | null;
  canteenSlug: string | null;
  createdAt: string;
}

interface Canteen {
  id: string;
  name: string;
  slug: string;
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState<DecodedToken | null>(null);

  const [activeTab, setActiveTab] = useState<'stream' | 'staff' | 'outlets'>('stream');
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<StaffUser[]>([]);
  const [canteens, setCanteens] = useState<Canteen[]>([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [canteenFilter, setCanteenFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Modals
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [newPin, setNewPin] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [isSavingCredentials, setIsSavingCredentials] = useState<boolean>(false);

  const [isAddStaffOpen, setIsAddStaffOpen] = useState<boolean>(false);
  const [addStaffRole, setAddStaffRole] = useState<'manager' | 'cook'>('cook');
  const [addStaffName, setAddStaffName] = useState<string>('');
  const [addStaffCanteenId, setAddStaffCanteenId] = useState<string>('');
  const [addStaffEmail, setAddStaffEmail] = useState<string>('');
  const [addStaffPassword, setAddStaffPassword] = useState<string>('');
  const [addStaffPin, setAddStaffPin] = useState<string>('');
  const [isCreatingStaff, setIsCreatingStaff] = useState<boolean>(false);

  const getAuthToken = () => {
    return localStorage.getItem('adminToken') || localStorage.getItem('staffToken') || '';
  };

  // 1. Initial Authentication Guard
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/admin/login');
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded || decoded.role !== 'admin') {
      navigate('/admin/login');
      return;
    }

    setAdminProfile(decoded);
  }, [navigate]);

  // 2. Fetch Metrics & Data
  const fetchData = useCallback(async (showRefreshing = false) => {
    const token = getAuthToken();
    if (!token) return;

    if (showRefreshing) setIsRefreshing(true);
    setError('');

    try {
      // Fetch overview metrics
      const overviewRes = await fetch(`${API_BASE_URL}/api/admin/overview`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (overviewRes.status === 401 || overviewRes.status === 403) {
        localStorage.removeItem('adminToken');
        navigate('/admin/login');
        return;
      }
      const overviewData = await overviewRes.json();
      setMetrics(overviewData);

      // Fetch global orders stream
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (canteenFilter !== 'ALL') params.append('canteenId', canteenFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const ordersRes = await fetch(`${API_BASE_URL}/api/admin/orders-global?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const ordersData = await ordersRes.json();
      if (ordersData.orders) {
        setOrders(ordersData.orders);
      }

      // Fetch staff list
      const staffRes = await fetch(`${API_BASE_URL}/api/admin/staff`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const staffData = await staffRes.json();
      if (Array.isArray(staffData)) {
        setStaffList(staffData);
      }

      // Fetch canteens
      const canteensRes = await fetch(`${API_BASE_URL}/api/canteens`);
      const canteensData = await canteensRes.json();
      if (Array.isArray(canteensData)) {
        setCanteens(canteensData);
        if (canteensData.length > 0 && !addStaffCanteenId) {
          setAddStaffCanteenId(canteensData[0].id);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load executive data.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [statusFilter, canteenFilter, searchQuery, navigate, addStaffCanteenId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Periodic live poll every 10 seconds for real-time monitoring
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData(false);
    }, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle Staff Credential Update (Cook PIN or Manager Password)
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;

    const token = getAuthToken();
    setIsSavingCredentials(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload: any = {};
      if (editingStaff.role === 'cook') {
        if (!newPin || newPin.trim().length < 3) {
          throw new Error('Cook alphanumeric passcode must be at least 3 characters');
        }
        payload.pin = newPin.trim();
      } else {
        if (!newPassword || newPassword.length < 4) {
          throw new Error('Password must be at least 4 characters');
        }
        payload.password = newPassword;
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/staff/${editingStaff.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update credentials');

      setSuccessMessage(data.message || 'Credentials updated successfully!');
      setEditingStaff(null);
      setNewPin('');
      setNewPassword('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Update failed');
    } finally {
      setIsSavingCredentials(false);
    }
  };

  // Handle New Staff Member Creation
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getAuthToken();
    setIsCreatingStaff(true);
    setError('');
    setSuccessMessage('');

    try {
      if (!addStaffName.trim() || !addStaffCanteenId) {
        throw new Error('Please provide staff name and assigned outlet');
      }

      const payload: any = {
        role: addStaffRole,
        displayName: addStaffName.trim(),
        canteenId: addStaffCanteenId
      };

      if (addStaffRole === 'manager') {
        if (!addStaffEmail || !addStaffPassword) {
          throw new Error('Email and password are required for Store Managers');
        }
        payload.email = addStaffEmail.trim();
        payload.password = addStaffPassword;
      } else {
        if (!addStaffPin || addStaffPin.trim().length < 3) {
          throw new Error('An alphanumeric passcode of at least 3 characters is required for Kitchen Cooks');
        }
        payload.pin = addStaffPin.trim();
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/staff`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create staff account');

      setSuccessMessage(`New ${addStaffRole} account for ${addStaffName} created successfully!`);
      setIsAddStaffOpen(false);
      setAddStaffName('');
      setAddStaffEmail('');
      setAddStaffPassword('');
      setAddStaffPin('');
      fetchData();
    } catch (err: any) {
      setError(err.message || 'Creation failed');
    } finally {
      setIsCreatingStaff(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('staffToken');
    navigate('/admin/login');
  };

  if (isLoading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-3">
        <RotateCw className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
          Loading Super Admin Center...
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      
      {/* 1. Master Header Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative overflow-hidden">
        <div className="space-y-1 relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-950 border border-indigo-500/30 text-[10px] font-black text-indigo-300 uppercase tracking-widest shadow-inner">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Super Admin Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Executive Command Center</h1>
          <p className="text-xs text-slate-400 font-medium">
            Logged in as <strong className="text-indigo-300 font-bold">{adminProfile?.displayName || 'Super Admin'}</strong> • Real-Time Multi-Outlet Operations & Permanent Ledger
          </p>
        </div>

        <div className="flex items-center gap-2.5 relative z-10 w-full sm:w-auto justify-between sm:justify-end">
          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-bold text-slate-200 rounded-full border border-slate-700 transition-all shadow-sm"
          >
            <RotateCw className={`w-3.5 h-3.5 text-indigo-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Live'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 px-4 py-2 bg-rose-950/60 hover:bg-rose-900 border border-rose-800 text-rose-300 active:scale-95 text-xs font-bold rounded-full transition-all shadow-sm"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" />
            <span>Exit Admin</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold flex items-center justify-between animate-shake">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')}><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* 2. Executive Metrics Bento Grid */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          
          {/* Bento 1: Total Revenue */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider">Total Sales</span>
              <div className="w-8 h-8 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                ₹
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">₹{metrics.totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" />
                <span>Permanent Supabase Audit Total</span>
              </p>
            </div>
          </div>

          {/* Bento 2: Active Orders */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider">Active in Kitchen</span>
              <div className="w-8 h-8 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-amber-600">
                {metrics.placedOrders + metrics.preparingOrders + metrics.readyOrders}
              </p>
              <p className="text-[10px] text-slate-500 font-bold mt-1">
                {metrics.placedOrders} Placed • {metrics.preparingOrders} Cooking • {metrics.readyOrders} Ready
              </p>
            </div>
          </div>

          {/* Bento 3: Completed Orders */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider">Completed Orders</span>
              <div className="w-8 h-8 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-indigo-600">{metrics.completedOrders}</p>
              <p className="text-[10px] text-slate-500 font-bold mt-1">
                Total Placed: {metrics.totalOrders}
              </p>
            </div>
          </div>

          {/* Bento 4: Total Outlets & Staff */}
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-500 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider">Shops & Staff</span>
              <div className="w-8 h-8 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
                <Store className="w-4 h-4" />
              </div>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-slate-900">{metrics.canteenBreakdown.length} Shops</p>
              <p className="text-[10px] text-slate-500 font-bold mt-1">
                {staffList.length} Registered Staff Users
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 3. Navigation Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-slate-100/90 rounded-2xl border border-slate-200/80">
        <button
          onClick={() => setActiveTab('stream')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === 'stream'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Live Multi-Shop Feed ({orders.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === 'staff'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff & Kitchen PINs ({staffList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('outlets')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === 'outlets'
              ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/60'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className="w-4 h-4" />
          <span>Outlets Overview</span>
        </button>
      </div>

      {/* TAB 1: GLOBAL LIVE ORDERS STREAM */}
      {activeTab === 'stream' && (
        <div className="space-y-4">
          {/* Stream Filters */}
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search order #, customer, roll, or PIN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Outlet Filter */}
            <div className="flex items-center gap-2">
              <select
                value={canteenFilter}
                onChange={e => setCanteenFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Shops & Canteens</option>
                {canteens.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PLACED">Placed</option>
                <option value="PREPARING">Preparing</option>
                <option value="READY">Ready</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Orders Stream Cards */}
          {orders.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-2">
              <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs font-bold text-slate-500">No orders matching the active filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((order) => {
                const isCancelled = order.status === 'CANCELLED';
                const isReady = order.status === 'READY';
                const isPreparing = order.status === 'PREPARING';
                const isCompleted = order.status === 'COMPLETED';

                let parsedItems: any[] = [];
                try {
                  parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                } catch {
                  parsedItems = [];
                }

                return (
                  <div 
                    key={order.id} 
                    className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-lg">
                          {order.order_number}
                        </span>
                        
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{order.student_name}</span>
                          {order.student_roll && (
                            <span className="text-slate-400 font-normal">({order.student_roll})</span>
                          )}
                        </span>

                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Store className="w-3 h-3" />
                          <span>{order.canteen_name || 'Assigned Shop'}</span>
                        </span>

                        <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${
                          isCancelled ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          isReady ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                          isPreparing ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      {/* Items */}
                      <p className="text-xs text-slate-600 font-medium">
                        {parsedItems.map((i: any, idx: number) => (
                          <span key={idx} className="mr-2">
                            {i.name} <span className="text-indigo-600 font-bold">×{i.quantity}</span>
                          </span>
                        ))}
                      </p>
                    </div>

                    {/* Right Info & Pickup Code */}
                    <div className="flex items-center gap-3 shrink-0 self-end md:self-center">
                      <div className="text-right">
                        <p className="text-base font-black text-slate-900">₹{order.total_price}</p>
                        <p className="text-[10px] font-mono text-slate-400">PIN: <strong className="text-slate-800 font-bold">{order.pickup_code}</strong></p>
                      </div>

                      <div className="text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                        {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: STAFF & COOK PIN MANAGEMENT */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">Staff Credentials & Kitchen PINs</h3>
              <p className="text-xs text-slate-500">Manage 4-digit cook passcodes and store manager passwords without SQL.</p>
            </div>
            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-xs font-bold rounded-full transition-all shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>Add Staff Member</span>
            </button>
          </div>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {staffList.map((staff) => {
              const isCook = staff.role === 'cook';
              const isAdmin = staff.role === 'admin';

              return (
                <div 
                  key={staff.id} 
                  className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                      isAdmin ? 'bg-amber-100 text-amber-800' :
                      isCook ? 'bg-orange-100 text-orange-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {isAdmin ? <Crown className="w-5 h-5" /> : isCook ? <ChefHat className="w-5 h-5" /> : <ShieldCheck className="w-5 h-5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-slate-900 truncate">{staff.displayName}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          isAdmin ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                          isCook ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                          'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}>
                          {staff.role}
                        </span>
                      </div>
                      
                      <p className="text-xs text-slate-500 truncate mt-0.5">
                        {staff.canteenName ? `Shop: ${staff.canteenName}` : 'Global Platform Scope'}
                      </p>
                      
                      {staff.email && (
                        <p className="text-[11px] font-mono text-slate-400 truncate">{staff.email}</p>
                      )}
                    </div>
                  </div>

                  {!isAdmin && (
                    <button
                      onClick={() => {
                        setEditingStaff(staff);
                        setNewPin('');
                        setNewPassword('');
                      }}
                      className="px-3 py-2 bg-slate-50 hover:bg-slate-100 active:scale-95 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 transition-all flex items-center gap-1.5 shrink-0"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                      <span>{isCook ? 'Reset PIN' : 'Change Pass'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: OUTLETS PERFORMANCE OVERVIEW */}
      {activeTab === 'outlets' && metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {metrics.canteenBreakdown.map((canteen) => (
            <div key={canteen.canteenId} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">{canteen.canteenName}</h4>
                    <span className="text-[10px] font-mono text-slate-400">/{canteen.slug}</span>
                  </div>
                </div>

                <Link
                  to={`/c/${canteen.slug}`}
                  target="_blank"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                >
                  <span>Student View</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                <div className="bg-slate-50 p-2.5 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Total Orders</p>
                  <p className="text-base font-black text-slate-900">{canteen.totalOrders}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">Revenue</p>
                  <p className="text-base font-black text-emerald-600">₹{canteen.totalRevenue}</p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-2xl">
                  <p className="text-[10px] font-black text-slate-400 uppercase">In Kitchen</p>
                  <p className="text-base font-black text-amber-600">{canteen.activeOrders}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. MODAL: EDIT / RESET CREDENTIALS */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  {editingStaff.role === 'cook' ? 'Reset Kitchen Cook PIN' : 'Update Manager Password'}
                </h3>
              </div>
              <button onClick={() => setEditingStaff(null)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              Updating credentials for <strong>{editingStaff.displayName}</strong> ({editingStaff.canteenName || 'Global'})
            </p>

            <form onSubmit={handleUpdateCredentials} className="space-y-4">
              {editingStaff.role === 'cook' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    New Alphanumeric Passcode / PIN
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHEF50"
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-center text-lg font-mono font-black text-slate-900 tracking-widest focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase placeholder:normal-case placeholder:font-normal placeholder:text-sm placeholder:tracking-normal"
                  />
                  <p className="text-[10px] text-slate-400 font-medium">Supports letters & numbers (e.g. CHEF50, KITCHEN1, 4812).</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                    New Manager Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingCredentials}
                className="w-full py-3 px-6 rounded-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all"
              >
                {isSavingCredentials ? 'Saving...' : 'Save New Credentials'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: ADD NEW STAFF MEMBER */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">Add New Staff Member</h3>
              </div>
              <button onClick={() => setIsAddStaffOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5">
              
              {/* Role Picker */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setAddStaffRole('cook')}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    addStaffRole === 'cook' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Kitchen Cook (Passcode)
                </button>
                <button
                  type="button"
                  onClick={() => setAddStaffRole('manager')}
                  className={`py-2 rounded-xl text-xs font-black transition-all ${
                    addStaffRole === 'manager' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
                  }`}
                >
                  Store Manager
                </button>
              </div>

              {/* Display Name */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Staff Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chef Ramesh or Manager Rahul"
                  value={addStaffName}
                  onChange={e => setAddStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                />
              </div>

              {/* Assigned Outlet */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assigned Outlet</label>
                <select
                  value={addStaffCanteenId}
                  onChange={e => setAddStaffCanteenId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                >
                  {canteens.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {addStaffRole === 'cook' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Alphanumeric Passcode / PIN</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CHEF50"
                    value={addStaffPin}
                    onChange={e => setAddStaffPin(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-center uppercase placeholder:normal-case placeholder:font-sans"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Manager Email</label>
                    <input
                      type="email"
                      required
                      placeholder="manager@heritage50.com"
                      value={addStaffEmail}
                      onChange={e => setAddStaffEmail(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={addStaffPassword}
                      onChange={e => setAddStaffPassword(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isCreatingStaff}
                className="w-full mt-2 py-3 px-6 rounded-full bg-slate-900 hover:bg-black disabled:bg-slate-300 text-white font-black text-xs uppercase tracking-wider shadow-md transition-all"
              >
                {isCreatingStaff ? 'Creating Account...' : 'Create Staff Member'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
