import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  RotateCw, 
  Search, 
  Store, 
  Users, 
  CheckCircle2, 
  KeyRound, 
  TrendingUp, 
  ShoppingBag, 
  Plus, 
  X, 
  AlertCircle, 
  ChefHat, 
  Bike,
  ExternalLink,
  Layers,
  LogOut,
  Flame
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
  role: 'admin' | 'manager' | 'cook' | 'delivery';
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
  const [addStaffRole, setAddStaffRole] = useState<'manager' | 'cook' | 'delivery'>('cook');
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

  // Handle Staff Credential Update
  const handleUpdateCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    const token = getAuthToken();
    setIsSavingCredentials(true);
    setError('');
    setSuccessMessage('');

    try {
      const payload: any = {};
      if (editingStaff.role === 'cook' || editingStaff.role === 'delivery') {
        if (!newPin || newPin.trim().length < 3) {
          throw new Error('Cook / Delivery alphanumeric passcode must be at least 3 characters');
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
          throw new Error('An alphanumeric passcode of at least 3 characters is required for Cook and Delivery accounts');
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
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
        <RotateCw className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="text-[11px] font-medium">Syncing master control center...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-2.5 animate-in pb-10">
      
      {/* 1. Terminal Top Bar */}
      <div className="bg-white border border-slate-200/90 rounded-lg px-3 py-2 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h1 className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight">
              Executive Command Center
            </h1>
          </div>
          <span className="text-slate-300 text-xs">·</span>
          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded text-[10px] font-medium">
            Super Admin
          </span>
          <span className="text-slate-300 text-xs">·</span>
          <span className="text-[10px] text-slate-500 font-medium">
            {adminProfile?.displayName || 'Administrator'}
          </span>
        </div>

        {/* Top Bar Actions */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          <Link
            to="/staff/sales"
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors shadow-2xs active:scale-[0.98]"
            title="View Monthly Sales Analytics Ledger"
          >
            <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
            <span>Monthly Sales</span>
          </Link>

          <button
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs active:scale-[0.98]"
          >
            <RotateCw className={`w-2.5 h-2.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1 px-2 py-0.5 border border-rose-200/80 rounded-md text-[11px] font-medium text-rose-700 bg-rose-50/60 hover:bg-rose-100 transition-colors shadow-2xs active:scale-[0.98]"
          >
            <LogOut className="w-2.5 h-2.5 text-rose-600 shrink-0" />
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-center justify-between gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3 h-3 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')}><X className="w-3 h-3" /></button>
        </div>
      )}

      {successMessage && (
        <div className="flex items-center justify-between gap-1 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-md text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* 2. Executive Metrics Bento Grid (High Density) */}
      {metrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          
          {/* Card 1: Total Sales */}
          <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Total Sales</span>
              <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center font-bold text-[10px]">
                ₹
              </div>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold font-mono text-slate-900">₹{metrics.totalRevenue.toLocaleString()}</p>
              <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5 mt-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                <span>All-time platform revenue</span>
              </p>
            </div>
          </div>

          {/* Card 2: Active in Kitchen */}
          <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Active in Kitchen</span>
              <div className="w-5 h-5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
                <Flame className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold font-mono text-amber-700">
                {metrics.placedOrders + metrics.preparingOrders + metrics.readyOrders}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {metrics.placedOrders} placed · {metrics.preparingOrders} cooking · {metrics.readyOrders} ready
              </p>
            </div>
          </div>

          {/* Card 3: Completed Orders */}
          <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Completed Orders</span>
              <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center">
                <CheckCircle2 className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold font-mono text-indigo-700">{metrics.completedOrders}</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Total Placed: {metrics.totalOrders}
              </p>
            </div>
          </div>

          {/* Card 4: Shops & Staff */}
          <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Shops & Staff</span>
              <div className="w-5 h-5 rounded bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
                <Store className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold text-slate-900">{metrics.canteenBreakdown.length} Outlets</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {staffList.length} staff users registered
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 3. Navigation Tabs (High-Density Segmented) */}
      <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg select-none">
        <button
          onClick={() => setActiveTab('stream')}
          className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
            activeTab === 'stream'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className={`w-3 h-3 ${activeTab === 'stream' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Live Multi-Shop Feed</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
            activeTab === 'stream' ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-300 text-slate-700'
          }`}>
            {orders.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('staff')}
          className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
            activeTab === 'staff'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className={`w-3 h-3 ${activeTab === 'staff' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Staff & Kitchen PINs</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
            activeTab === 'staff' ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-300 text-slate-700'
          }`}>
            {staffList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('outlets')}
          className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
            activeTab === 'outlets'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Store className={`w-3 h-3 ${activeTab === 'outlets' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Outlets Overview</span>
        </button>
      </div>

      {/* TAB 1: GLOBAL LIVE ORDERS STREAM */}
      {activeTab === 'stream' && (
        <div className="space-y-2">
          {/* Stream Filters */}
          <div className="bg-white border border-slate-200/90 rounded-lg p-1.5 sm:px-2.5 sm:py-1.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ticket #, customer, roll, PIN..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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

            {/* Outlet & Status Filter */}
            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={canteenFilter}
                onChange={e => setCanteenFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-medium rounded px-2 py-0.5 focus:outline-none cursor-pointer h-7"
              >
                <option value="ALL">All Outlets</option>
                {canteens.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-medium rounded px-2 py-0.5 focus:outline-none cursor-pointer h-7"
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
            <div className="py-12 text-center text-slate-400 space-y-1 bg-white border border-slate-200/90 rounded-lg p-6 shadow-2xs">
              <ShoppingBag className="w-6 h-6 mx-auto text-slate-300" />
              <p className="text-[11px] font-medium text-slate-500">No orders matching the active filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
              {orders.map((order) => {
                const isCancelled = order.status === 'CANCELLED';
                const isReady = order.status === 'READY';
                const isPreparing = order.status === 'PREPARING';
                const isCompleted = order.status === 'COMPLETED';

                let parsedItems: any[] = [];
                try {
                  parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                  if (!Array.isArray(parsedItems)) parsedItems = [];
                } catch {
                  parsedItems = [];
                }

                return (
                  <div 
                    key={order.id} 
                    className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between gap-1.5"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-mono font-bold text-[12px] text-slate-900">
                            {order.order_number}
                          </span>
                          <span className="px-1 py-0.2 rounded text-[9px] font-mono font-medium bg-indigo-50 text-indigo-700 border border-indigo-200/80">
                            Slot {order.slot_number || (order.order_number && order.order_number.includes('-') ? order.order_number.split('-')[0] : 1)}
                          </span>
                        </div>

                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border ${
                          isCancelled ? 'bg-rose-50 text-rose-700 border-rose-200/80' :
                          isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                          isReady ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80' :
                          isPreparing ? 'bg-amber-50 text-amber-700 border-amber-200/80' :
                          'bg-slate-100 text-slate-700 border-slate-200/80'
                        }`}>
                          {order.status}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span className="font-medium text-slate-800 truncate">{order.student_name} {order.student_roll ? `(${order.student_roll})` : ''}</span>
                        <span className="truncate text-slate-400">{order.canteen_name || 'Assigned Shop'}</span>
                      </div>

                      {/* Items */}
                      <div className="space-y-0.5 pt-0.5">
                        {parsedItems.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between text-[11px] py-0.5 px-1.5 rounded bg-slate-50 border border-slate-100/80">
                            <span className="font-medium text-slate-800 truncate">{item.name}</span>
                            <span className="font-mono font-bold text-amber-800 bg-amber-100/90 px-1 py-0.2 rounded text-[10px] shrink-0">
                              ×{item.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Metadata & Price */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[10px]">
                      <span className="font-mono text-slate-400">
                        PIN: <strong className="text-slate-800 font-bold">{order.pickup_code}</strong>
                      </span>
                      <span className="font-mono font-bold text-slate-900 text-[11px]">
                        ₹{order.total_price}
                      </span>
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
        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
            <div>
              <h3 className="text-xs font-bold text-slate-900">Staff Credentials & Kitchen PINs</h3>
              <p className="text-[10px] text-slate-500">Manage 4-digit cook passcodes and store manager passwords without SQL.</p>
            </div>
            <button
              onClick={() => setIsAddStaffOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-[11px] font-semibold rounded-md transition-all shadow-2xs"
            >
              <Plus className="w-3 h-3" />
              <span>Add Staff</span>
            </button>
          </div>

          {/* Staff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {staffList.map((staff) => {
              const isCook = staff.role === 'cook';
              const isDelivery = staff.role === 'delivery';
              const isAdmin = staff.role === 'admin';

              return (
                <div 
                  key={staff.id} 
                  className="p-2 rounded-md bg-slate-50 border border-slate-100/80 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                      isAdmin ? 'bg-amber-100 text-amber-800' :
                      isCook ? 'bg-orange-100 text-orange-800' :
                      isDelivery ? 'bg-emerald-100 text-emerald-800' :
                      'bg-indigo-100 text-indigo-800'
                    }`}>
                      {isAdmin ? <ShieldCheck className="w-3.5 h-3.5" /> : isCook ? <ChefHat className="w-3.5 h-3.5" /> : isDelivery ? <Bike className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-[11px] font-semibold text-slate-900 truncate">{staff.displayName}</h4>
                        <span className={`text-[8px] font-bold uppercase tracking-wider px-1 py-0.2 rounded ${
                          isAdmin ? 'bg-amber-50 text-amber-700 border border-amber-200/60' :
                          isCook ? 'bg-orange-50 text-orange-700 border border-orange-200/60' :
                          isDelivery ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60' :
                          'bg-indigo-50 text-indigo-700 border border-indigo-200/60'
                        }`}>
                          {staff.role}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-slate-500 truncate">
                        {staff.canteenName ? `Outlet: ${staff.canteenName}` : 'Global Scope'}
                      </p>
                    </div>
                  </div>

                  {!isAdmin && (
                    <button
                      onClick={() => {
                        setEditingStaff(staff);
                        setNewPin('');
                        setNewPassword('');
                      }}
                      className="px-2 py-0.5 bg-white hover:bg-slate-100 active:scale-[0.98] border border-slate-200 rounded text-[10px] font-medium text-slate-700 transition-all flex items-center gap-1 shrink-0"
                    >
                      <KeyRound className="w-2.5 h-2.5 text-indigo-600" />
                      <span>{isCook || isDelivery ? 'Reset PIN' : 'Change Pass'}</span>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {metrics.canteenBreakdown.map((canteen) => (
            <div key={canteen.canteenId} className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs space-y-2">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-6 h-6 rounded bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                    <Store className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-[11px] font-bold text-slate-900 truncate">{canteen.canteenName}</h4>
                    <span className="text-[9px] font-mono text-slate-400">/{canteen.slug}</span>
                  </div>
                </div>

                <Link
                  to={`/c/${canteen.slug}`}
                  target="_blank"
                  className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                >
                  <span>Student View</span>
                  <ExternalLink className="w-2.5 h-2.5" />
                </Link>
              </div>

              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="bg-slate-50 p-1.5 rounded-md border border-slate-100/80">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase">Orders</p>
                  <p className="text-xs font-bold font-mono text-slate-900">{canteen.totalOrders}</p>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-md border border-slate-100/80">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase">Sales</p>
                  <p className="text-xs font-bold font-mono text-emerald-700">₹{canteen.totalRevenue.toLocaleString()}</p>
                </div>
                <div className="bg-slate-50 p-1.5 rounded-md border border-slate-100/80">
                  <p className="text-[9px] font-semibold text-slate-400 uppercase">Active</p>
                  <p className="text-xs font-bold font-mono text-amber-700">{canteen.activeOrders}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. MODAL: EDIT / RESET CREDENTIALS (Ultra-Sleek High-Density) */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl p-4 max-w-xs w-full shadow-xl border border-slate-200 flex flex-col space-y-2.5 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  {editingStaff.role === 'cook' ? 'Reset Cook PIN' : editingStaff.role === 'delivery' ? 'Reset Delivery PIN' : 'Update Password'}
                </h3>
              </div>
              <button onClick={() => setEditingStaff(null)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
            </div>

            <p className="text-[10px] text-slate-600">
              Editing credentials for <strong>{editingStaff.displayName}</strong> ({editingStaff.canteenName || 'Global'})
            </p>

            <form onSubmit={handleUpdateCredentials} className="space-y-2.5">
              {editingStaff.role === 'cook' || editingStaff.role === 'delivery' ? (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    New Alphanumeric Passcode / PIN
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={editingStaff.role === 'cook' ? 'e.g. CHEF50' : 'e.g. DELIV1'}
                    value={newPin}
                    onChange={e => setNewPin(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-center text-sm font-mono font-bold text-slate-900 tracking-wider focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase h-8"
                  />
                  <p className="text-[9px] text-slate-400 font-medium">Supports letters & numbers (e.g. CHEF50, DELIV1, 4812).</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
                    New Manager Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-8"
                  />
                </div>
              )}

              <div className="flex items-center gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 h-7.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCredentials}
                  className="flex-1 h-7.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98]"
                >
                  {isSavingCredentials ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: ADD NEW STAFF MEMBER */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl p-4 max-w-xs sm:max-w-sm w-full shadow-xl border border-slate-200 flex flex-col space-y-2.5 text-left">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-900">Add New Staff Member</h3>
              </div>
              <button onClick={() => setIsAddStaffOpen(false)}><X className="w-3.5 h-3.5 text-slate-400" /></button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-2">
              
              {/* 3-Way Role Picker */}
              <div className="grid grid-cols-3 gap-1 p-0.5 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => setAddStaffRole('cook')}
                  className={`py-1 px-1 rounded-md text-[10px] font-semibold transition-all ${
                    addStaffRole === 'cook' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Cook
                </button>
                <button
                  type="button"
                  onClick={() => setAddStaffRole('delivery')}
                  className={`py-1 px-1 rounded-md text-[10px] font-semibold transition-all ${
                    addStaffRole === 'delivery' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setAddStaffRole('manager')}
                  className={`py-1 px-1 rounded-md text-[10px] font-semibold transition-all ${
                    addStaffRole === 'manager' ? 'bg-white text-indigo-600 shadow-2xs font-bold' : 'text-slate-600'
                  }`}
                >
                  Manager
                </button>
              </div>

              {/* Display Name */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Staff Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chef Ramesh or Delivery Raju"
                  value={addStaffName}
                  onChange={e => setAddStaffName(e.target.value)}
                  className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium h-7"
                />
              </div>

              {/* Assigned Outlet */}
              <div className="space-y-0.5">
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Assigned Outlet</label>
                <select
                  value={addStaffCanteenId}
                  onChange={e => setAddStaffCanteenId(e.target.value)}
                  className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium h-7 cursor-pointer"
                >
                  {canteens.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {addStaffRole === 'cook' || addStaffRole === 'delivery' ? (
                <div className="space-y-0.5">
                  <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Alphanumeric Passcode / PIN</label>
                  <input
                    type="text"
                    required
                    placeholder={addStaffRole === 'cook' ? 'e.g. CHEF50' : 'e.g. DELIV1'}
                    value={addStaffPin}
                    onChange={e => setAddStaffPin(e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-mono font-bold text-center uppercase h-7 placeholder:normal-case placeholder:font-sans"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Manager Email</label>
                    <input
                      type="email"
                      required
                      placeholder="manager@heritage50.com"
                      value={addStaffEmail}
                      onChange={e => setAddStaffEmail(e.target.value)}
                      className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium h-7"
                    />
                  </div>
                  <div className="space-y-0.5">
                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Password</label>
                    <input
                      type="password"
                      required
                      placeholder="••••••••"
                      value={addStaffPassword}
                      onChange={e => setAddStaffPassword(e.target.value)}
                      className="w-full px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md text-[11px] font-medium h-7"
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-1.5 pt-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="flex-1 h-7.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingStaff}
                  className="flex-1 h-7.5 rounded-md bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-semibold text-[11px] shadow-2xs active:scale-[0.98]"
                >
                  {isCreatingStaff ? 'Creating...' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
