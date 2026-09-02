import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  TrendingUp, 
  RotateCw, 
  Search, 
  Store, 
  Calendar, 
  Download, 
  Printer, 
  ShoppingBag, 
  Utensils, 
  ChevronRight, 
  AlertCircle, 
  ArrowLeft,
  ChefHat,
  Sparkles,
  FileSpreadsheet,
  X
} from 'lucide-react';
import { API_BASE_URL } from '../config.js';
import { decodeToken, type DecodedToken } from '../utils/jwt.js';

interface TopItem {
  name: string;
  quantity: number;
  revenue: number;
}

interface DailyStat {
  date: string;
  dayLabel: string;
  revenue: number;
  orders: number;
}

interface MonthlySummary {
  monthKey: string;
  monthLabel: string;
  year: number;
  month: number;
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  avgOrderValue: number;
  totalItemsSold: number;
  topItems: TopItem[];
  dailyStats: DailyStat[];
}

interface AllTimeSummary {
  totalRevenue: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  activeOrders: number;
  avgOrderValue: number;
  totalItemsSold: number;
}

interface OrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
}

interface SalesOrder {
  id: string;
  order_number: string;
  student_name: string;
  student_roll: string;
  items: string | OrderItem[];
  total_price: number;
  status: 'PLACED' | 'PENDING' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
  pickup_code: string;
  created_at: string;
  canteen_id: string;
  canteen_name?: string;
  canteen_slug?: string;
  building?: string;
  break_timing?: string;
  slot_number?: number;
  cancellation_reason?: string;
}

interface SalesApiResponse {
  canteen: {
    id: string;
    name: string;
    slug: string;
  } | null;
  allTimeSummary: AllTimeSummary;
  months: MonthlySummary[];
  selectedMonth: MonthlySummary | null;
  orders: SalesOrder[];
  totalOrdersCount: number;
}

export function StaffSales() {
  const navigate = useNavigate();
  const [userProfile, setUserProfile] = useState<DecodedToken | null>(null);

  // Core Data
  const [salesData, setSalesData] = useState<SalesApiResponse | null>(null);
  const [canteens, setCanteens] = useState<any[]>([]);
  const [selectedAdminCanteenId, setSelectedAdminCanteenId] = useState<string>('');

  // Selected Filters
  const [selectedMonthKey, setSelectedMonthKey] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'dishes' | 'all-months'>('overview');

  // Loading and error states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Helper to obtain staff or admin token
  const getAuthToken = () => {
    return localStorage.getItem('staffToken') || localStorage.getItem('adminToken') || '';
  };

  // 1. Initial Authentication & Profile Setup
  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      navigate('/staff/login');
      return;
    }

    const decoded = decodeToken(token);
    if (!decoded || (decoded.role !== 'manager' && decoded.role !== 'admin')) {
      if (decoded && (decoded.role === 'cook' || decoded.role === 'delivery')) {
        navigate('/staff');
        return;
      }
      navigate('/staff/login');
      return;
    }

    setUserProfile(decoded);
    if (decoded.canteenId) {
      setSelectedAdminCanteenId(decoded.canteenId);
    }

    // Fetch list of canteens (for admins)
    fetch(`${API_BASE_URL}/api/canteens`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCanteens(data);
      })
      .catch(() => {});
  }, [navigate]);

  // 2. Fetch Sales Analytics from Backend
  const fetchSalesData = useCallback(async (isSilentRefresh = false) => {
    const token = getAuthToken();
    if (!token) return;

    if (isSilentRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      const params = new URLSearchParams();
      if (selectedAdminCanteenId) {
        params.append('canteenId', selectedAdminCanteenId);
      }
      if (selectedMonthKey) {
        params.append('month', selectedMonthKey);
      }
      if (selectedStatusFilter !== 'ALL') {
        params.append('status', selectedStatusFilter);
      }
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim());
      }

      const res = await fetch(`${API_BASE_URL}/api/admin/sales?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('staffToken');
        localStorage.removeItem('adminToken');
        navigate('/staff/login');
        return;
      }

      const data: SalesApiResponse = await res.json();
      setSalesData(data);

      // Default to latest month if none selected yet
      if (!selectedMonthKey && data.months && data.months.length > 0) {
        setSelectedMonthKey(data.months[0].monthKey);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to sales analytics service.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [selectedAdminCanteenId, selectedMonthKey, selectedStatusFilter, searchQuery, navigate]);

  useEffect(() => {
    if (userProfile) {
      fetchSalesData();
    }
  }, [userProfile, selectedAdminCanteenId, selectedMonthKey, selectedStatusFilter, searchQuery]);

  // Determine current active month summary object
  const currentMonthSummary = useMemo(() => {
    if (!salesData) return null;
    if (selectedMonthKey === 'ALL') {
      return {
        monthKey: 'ALL',
        monthLabel: 'All-Time Total',
        year: new Date().getFullYear(),
        month: 0,
        totalRevenue: salesData.allTimeSummary.totalRevenue,
        totalOrders: salesData.allTimeSummary.totalOrders,
        completedOrders: salesData.allTimeSummary.completedOrders,
        cancelledOrders: salesData.allTimeSummary.cancelledOrders,
        activeOrders: salesData.allTimeSummary.activeOrders,
        avgOrderValue: salesData.allTimeSummary.avgOrderValue,
        totalItemsSold: salesData.allTimeSummary.totalItemsSold,
        topItems: salesData.months.flatMap(m => m.topItems).reduce((acc: TopItem[], item) => {
          const existing = acc.find(x => x.name === item.name);
          if (existing) {
            existing.quantity += item.quantity;
            existing.revenue += item.revenue;
          } else {
            acc.push({ ...item });
          }
          return acc;
        }, []).sort((a, b) => b.quantity - a.quantity).slice(0, 10),
        dailyStats: []
      } as MonthlySummary;
    }
    return salesData.months.find(m => m.monthKey === selectedMonthKey) || salesData.months[0] || null;
  }, [salesData, selectedMonthKey]);

  // Export Monthly Orders to CSV
  const handleExportCSV = () => {
    if (!salesData || !salesData.orders || salesData.orders.length === 0) {
      alert('No orders available to export for the selected period.');
      return;
    }

    const headers = [
      'Order #',
      'Date',
      'Time',
      'Customer Name',
      'Roll Number',
      'Items Breakdown',
      'Total Amount (INR)',
      'Status',
      'Pickup PIN',
      'Batch Slot',
      'Building',
      'Break Timing',
      'Cancellation Reason'
    ];

    const rows = salesData.orders.map(order => {
      const dateObj = new Date(order.created_at);
      const dateStr = dateObj.toLocaleDateString('en-IN');
      const timeStr = dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

      let itemDetails = '';
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        itemDetails = items.map((i: any) => `${i.name} (x${i.quantity})`).join('; ');
      } catch {
        itemDetails = 'Item list unavailable';
      }

      return [
        `"${order.order_number}"`,
        `"${dateStr}"`,
        `"${timeStr}"`,
        `"${order.student_name.replace(/"/g, '""')}"`,
        `"${order.student_roll || ''}"`,
        `"${itemDetails.replace(/"/g, '""')}"`,
        order.total_price,
        `"${order.status}"`,
        `"${order.pickup_code}"`,
        order.slot_number || '',
        `"${order.building || ''}"`,
        `"${order.break_timing || ''}"`,
        `"${(order.cancellation_reason || '').replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const outletName = (salesData.canteen?.name || userProfile?.canteenName || 'Outlet').replace(/[^a-zA-Z0-9]/g, '_');
    link.setAttribute('href', url);
    link.setAttribute('download', `${outletName}_Sales_${selectedMonthKey || 'Report'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  const outletDisplayName = salesData?.canteen?.name || userProfile?.canteenName || 'Anand Stall (Fast Food & Juice Centre)';

  if (isLoading && !salesData) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
        <RotateCw className="w-5 h-5 animate-spin text-indigo-600" />
        <span className="text-[11px] font-medium">Syncing monthly sales ledger...</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-2.5 animate-in pb-10">
      
      {/* 1. Terminal Top Bar: Outlet Identity & Actions */}
      <div className="bg-white border border-slate-200/90 rounded-lg px-3 py-2 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <Link 
            to="/staff"
            className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 transition-colors mr-1 shrink-0"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>Orders</span>
          </Link>
          <span className="text-slate-300 text-xs">·</span>
          <div className="flex items-center gap-1.5 truncate">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <h1 className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight truncate">
              {outletDisplayName}
            </h1>
          </div>
          <span className="text-slate-300 text-xs">·</span>
          <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/80 rounded text-[10px] font-medium shrink-0">
            Monthly Sales
          </span>
        </div>

        {/* Actions & Outlet Switcher */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-between sm:justify-end">
          {userProfile?.role === 'admin' && canteens.length > 1 && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-md">
              <Store className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={selectedAdminCanteenId}
                onChange={(e) => setSelectedAdminCanteenId(e.target.value)}
                className="bg-transparent border-none text-[11px] font-medium text-slate-800 focus:outline-none cursor-pointer"
              >
                <option value="">All Outlets</option>
                {canteens.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => fetchSalesData(true)}
            disabled={isRefreshing}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs active:scale-[0.98]"
            title="Refresh sales data"
          >
            <RotateCw className={`w-2.5 h-2.5 text-indigo-600 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors shadow-2xs active:scale-[0.98]"
            title="Print statement"
          >
            <Printer className="w-2.5 h-2.5 text-slate-600" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 border border-indigo-700 transition-all shadow-2xs active:scale-[0.98]"
            title="Download CSV spreadsheet"
          >
            <Download className="w-2.5 h-2.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-1 px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-md text-[11px] font-medium">
          <AlertCircle className="w-3 h-3 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Month Selector Horizontal Strip */}
      <div className="bg-white border border-slate-200/90 rounded-lg p-1.5 shadow-2xs flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider px-1 shrink-0">
          <Calendar className="w-2.5 h-2.5 text-slate-400" />
          <span>Month:</span>
        </div>

        {salesData?.months && salesData.months.length > 0 ? (
          <>
            {salesData.months.map(m => {
              const isSelected = selectedMonthKey === m.monthKey;
              return (
                <button
                  key={m.monthKey}
                  onClick={() => setSelectedMonthKey(m.monthKey)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 shrink-0 active:scale-[0.98] ${
                    isSelected
                      ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                      : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'
                  }`}
                >
                  <span>{m.monthLabel}</span>
                  <span className={`px-1 py-0.2 rounded font-mono font-bold text-[9px] ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-900'
                  }`}>
                    ₹{m.totalRevenue.toLocaleString()}
                  </span>
                </button>
              );
            })}

            <button
              onClick={() => setSelectedMonthKey('ALL')}
              className={`px-2 py-0.5 rounded text-[11px] font-medium whitespace-nowrap transition-all flex items-center gap-1 shrink-0 active:scale-[0.98] ${
                selectedMonthKey === 'ALL'
                  ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200/70'
              }`}
            >
              <span>All-Time</span>
              <span className={`px-1 py-0.2 rounded font-mono font-bold text-[9px] ${
                selectedMonthKey === 'ALL' ? 'bg-white/25 text-white' : 'bg-white text-indigo-900 border border-indigo-200'
              }`}>
                ₹{salesData?.allTimeSummary.totalRevenue.toLocaleString()}
              </span>
            </button>
          </>
        ) : (
          <span className="text-[11px] text-slate-400 font-medium px-1">No monthly history recorded yet.</span>
        )}
      </div>

      {/* 3. Executive KPI Cards (High-Density Double-Bezel) */}
      {currentMonthSummary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          
          {/* Card 1: Revenue */}
          <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {selectedMonthKey === 'ALL' ? 'All-Time Sales' : `${currentMonthSummary.monthLabel} Sales`}
              </span>
              <div className="w-5 h-5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center justify-center font-bold text-[10px]">
                ₹
              </div>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold font-mono text-slate-900">
                ₹{currentMonthSummary.totalRevenue.toLocaleString()}
              </p>
              <p className="text-[10px] text-emerald-700 font-medium flex items-center gap-0.5 mt-0.5">
                <TrendingUp className="w-2.5 h-2.5" />
                <span>
                  {currentMonthSummary.totalOrders > 0 
                    ? `${Math.round((currentMonthSummary.completedOrders / currentMonthSummary.totalOrders) * 100)}% Fulfilled` 
                    : 'No orders'}
                </span>
              </p>
            </div>
          </div>

          {/* Card 2: Orders Volume */}
          <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Orders Volume</span>
              <div className="w-5 h-5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60 flex items-center justify-center">
                <ShoppingBag className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold font-mono text-slate-900">
                {currentMonthSummary.totalOrders}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                <span className="text-emerald-700 font-medium">{currentMonthSummary.completedOrders} done</span> · <span className="text-rose-600">{currentMonthSummary.cancelledOrders} void</span>
              </p>
            </div>
          </div>

          {/* Card 3: Avg Order Value (AOV) */}
          <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Avg Ticket Size</span>
              <div className="w-5 h-5 rounded bg-amber-50 text-amber-700 border border-amber-200/60 flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold font-mono text-slate-900">
                ₹{currentMonthSummary.avgOrderValue}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                Per completed order
              </p>
            </div>
          </div>

          {/* Card 4: Dishes Served */}
          <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex flex-col justify-between gap-1">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Dishes Served</span>
              <div className="w-5 h-5 rounded bg-orange-50 text-orange-700 border border-orange-200/60 flex items-center justify-center">
                <ChefHat className="w-2.5 h-2.5" />
              </div>
            </div>
            <div>
              <p className="text-sm sm:text-base font-bold font-mono text-slate-900">
                {currentMonthSummary.totalItemsSold} <span className="text-[10px] font-normal text-slate-400 font-sans">portions</span>
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                {currentMonthSummary.topItems.length > 0 ? `Top: ${currentMonthSummary.topItems[0].name}` : 'Fresh output'}
              </p>
            </div>
          </div>

        </div>
      )}

      {/* 4. Sub-Navigation Switcher (High-Density Segmented) */}
      <div className="inline-flex p-0.5 bg-slate-200/70 rounded-lg select-none">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
            activeTab === 'overview'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <TrendingUp className={`w-3 h-3 ${activeTab === 'overview' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Monthly Overview</span>
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
            activeTab === 'ledger'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileSpreadsheet className={`w-3 h-3 ${activeTab === 'ledger' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Orders Ledger</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
            activeTab === 'ledger' ? 'bg-indigo-100 text-indigo-900' : 'bg-slate-300 text-slate-700'
          }`}>
            {salesData?.totalOrdersCount || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('dishes')}
          className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
            activeTab === 'dishes'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Utensils className={`w-3 h-3 ${activeTab === 'dishes' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Bestselling Dishes</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
            activeTab === 'dishes' ? 'bg-amber-100 text-amber-900' : 'bg-slate-300 text-slate-700'
          }`}>
            {currentMonthSummary?.topItems.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all-months')}
          className={`flex-1 sm:flex-none px-3 py-1 rounded-md text-[11px] font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-[0.98] ${
            activeTab === 'all-months'
              ? 'bg-white text-slate-900 shadow-2xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className={`w-3 h-3 ${activeTab === 'all-months' ? 'text-indigo-600' : 'text-slate-400'}`} />
          <span>Monthly Comparison</span>
        </button>
      </div>

      {/* ================= TAB 1: MONTHLY OVERVIEW ================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          
          {/* Left 2 Cols: Daily Timeline / Trend for the month */}
          <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Daily Revenue Timeline</h3>
                <p className="text-[10px] text-slate-500">Day-by-day sales performance for {currentMonthSummary?.monthLabel || 'selected period'}</p>
              </div>
              <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">
                {currentMonthSummary?.dailyStats.length || 0} trading days
              </span>
            </div>

            {currentMonthSummary?.dailyStats && currentMonthSummary.dailyStats.length > 0 ? (
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1 no-scrollbar">
                {currentMonthSummary.dailyStats.map(day => {
                  const maxRevenue = Math.max(...currentMonthSummary.dailyStats.map(d => d.revenue), 1);
                  const barWidthPercent = Math.min(100, Math.round((day.revenue / maxRevenue) * 100));

                  return (
                    <div key={day.date} className="p-1.5 rounded-md bg-slate-50 border border-slate-100/80 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-800">{day.dayLabel}</span>
                          <span className="text-[9px] font-mono text-slate-400">({day.date})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500">{day.orders} orders</span>
                          <span className="font-bold text-slate-900 font-mono">₹{day.revenue.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {/* Visual Micro Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300" 
                          style={{ width: `${barWidthPercent}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-[11px]">
                No day-by-day sales data recorded for this month.
              </div>
            )}
          </div>

          {/* Right 1 Col: Top Dishes Snapshot */}
          <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Bestsellers</h3>
                <p className="text-[10px] text-slate-500">Top dishes in {currentMonthSummary?.monthLabel}</p>
              </div>
              <button
                onClick={() => setActiveTab('dishes')}
                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
              >
                <span>All</span>
                <ChevronRight className="w-2.5 h-2.5" />
              </button>
            </div>

            {currentMonthSummary?.topItems && currentMonthSummary.topItems.length > 0 ? (
              <div className="space-y-1">
                {currentMonthSummary.topItems.slice(0, 5).map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between p-1.5 rounded-md bg-slate-50 border border-slate-100/80">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-4 h-4 rounded bg-indigo-100 text-indigo-800 font-mono font-bold text-[9px] flex items-center justify-center shrink-0">
                        #{index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[11px] font-medium text-slate-900 truncate">{item.name}</p>
                        <p className="text-[9px] text-slate-500 font-mono">{item.quantity} portions served</p>
                      </div>
                    </div>
                    <span className="text-[11px] font-bold text-emerald-700 font-mono shrink-0">
                      ₹{item.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-slate-400 text-[11px]">
                No dish orders recorded for this month.
              </div>
            )}
          </div>

        </div>
      )}

      {/* ================= TAB 2: ITEMIZED ORDERS LEDGER ================= */}
      {activeTab === 'ledger' && (
        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs space-y-2">
          
          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row gap-1.5 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ticket #, student, dish, roll..."
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

            <div className="flex items-center gap-1.5 shrink-0">
              <select
                value={selectedStatusFilter}
                onChange={e => setSelectedStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-medium rounded px-2 py-0.5 focus:outline-none cursor-pointer h-7"
              >
                <option value="ALL">All Statuses</option>
                <option value="COMPLETED">Completed</option>
                <option value="READY">Ready for Pickup</option>
                <option value="PREPARING">Preparing</option>
                <option value="PLACED">Placed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Orders Table */}
          {!salesData?.orders || salesData.orders.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-1">
              <ShoppingBag className="w-6 h-6 mx-auto text-slate-300" />
              <p className="text-[11px] font-medium text-slate-500">No orders found matching the filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-2 px-2.5">Ticket #</th>
                    <th className="py-2 px-2.5">Date & Time</th>
                    <th className="py-2 px-2.5">Customer</th>
                    <th className="py-2 px-2.5">Items Ordered</th>
                    <th className="py-2 px-2.5">Amount</th>
                    <th className="py-2 px-2.5">Status</th>
                    <th className="py-2 px-2.5 text-right">PIN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {salesData.orders.map(order => {
                    const isCancelled = order.status === 'CANCELLED';
                    const isCompleted = order.status === 'COMPLETED';
                    const isReady = order.status === 'READY';
                    const isPreparing = order.status === 'PREPARING';

                    let parsedItems: any[] = [];
                    try {
                      parsedItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
                      if (!Array.isArray(parsedItems)) parsedItems = [];
                    } catch {
                      parsedItems = [];
                    }

                    const dateObj = new Date(order.created_at);

                    return (
                      <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                        {/* Order Number */}
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          {order.order_number}
                          {order.slot_number && (
                            <span className="ml-1 px-1 py-0.2 rounded bg-slate-100 text-slate-700 text-[9px] font-mono">
                              S{order.slot_number}
                            </span>
                          )}
                        </td>

                        {/* Date & Time */}
                        <td className="py-2 px-2.5 whitespace-nowrap text-slate-600">
                          <p className="font-medium text-slate-800">{dateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</p>
                          <p className="text-[9px] text-slate-400 font-mono">{dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>

                        {/* Customer */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <p className="font-semibold text-slate-900">{order.student_name}</p>
                          {order.student_roll && (
                            <p className="text-[9px] text-slate-400 font-mono">{order.student_roll}</p>
                          )}
                        </td>

                        {/* Items */}
                        <td className="py-2 px-2.5">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {parsedItems.map((item: any, idx: number) => (
                              <span 
                                key={idx} 
                                className="px-1 py-0.2 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200/60 flex items-center gap-0.5"
                              >
                                <span>{item.name}</span>
                                <span className="font-mono font-bold text-amber-800 bg-amber-100/90 px-1 rounded text-[9px]">×{item.quantity}</span>
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="py-2 px-2.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                          ₹{order.total_price}
                        </td>

                        {/* Status */}
                        <td className="py-2 px-2.5 whitespace-nowrap">
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase tracking-wider border ${
                            isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80' :
                            isCancelled ? 'bg-rose-50 text-rose-700 border-rose-200/80' :
                            isReady ? 'bg-indigo-50 text-indigo-700 border-indigo-200/80' :
                            isPreparing ? 'bg-amber-50 text-amber-700 border-amber-200/80' :
                            'bg-slate-100 text-slate-700 border-slate-200/80'
                          }`}>
                            {order.status}
                          </span>
                        </td>

                        {/* Pickup PIN */}
                        <td className="py-2 px-2.5 font-mono font-bold text-right text-slate-700 whitespace-nowrap">
                          {order.pickup_code}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: TOP SELLING DISHES ================= */}
      {activeTab === 'dishes' && (
        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs space-y-2">
          <div className="pb-1.5 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900">Bestselling Dishes & Revenue Share</h3>
            <p className="text-[10px] text-slate-500">Ranking of menu items sold during {currentMonthSummary?.monthLabel}</p>
          </div>

          {currentMonthSummary?.topItems && currentMonthSummary.topItems.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
              {currentMonthSummary.topItems.map((dish, idx) => {
                const totalMonthRevenue = currentMonthSummary.totalRevenue || 1;
                const sharePercent = Math.round((dish.revenue / totalMonthRevenue) * 100);

                return (
                  <div key={dish.name} className="p-2 rounded-md bg-slate-50 border border-slate-100/80 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-5 h-5 rounded bg-indigo-600 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{idx + 1}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-semibold text-slate-900 truncate">{dish.name}</h4>
                        <p className="text-[9px] text-slate-500 font-mono">{dish.quantity} portions served ({sharePercent}% of revenue)</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 font-mono">
                      <p className="text-[11px] font-bold text-emerald-700">₹{dish.revenue.toLocaleString()}</p>
                      <p className="text-[9px] text-slate-400">Total Sales</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-[11px]">
              No dishes recorded for the selected period.
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 4: ALL MONTHS COMPARISON ================= */}
      {activeTab === 'all-months' && (
        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs space-y-2 overflow-hidden">
          <div className="pb-1.5 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900">Monthly Sales Comparison</h3>
            <p className="text-[10px] text-slate-500">Historical performance ledger of monthly revenue, orders, and averages</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-2 px-2.5">Month</th>
                  <th className="py-2 px-2.5">Revenue (₹)</th>
                  <th className="py-2 px-2.5">Total Orders</th>
                  <th className="py-2 px-2.5">Completed</th>
                  <th className="py-2 px-2.5">Cancelled</th>
                  <th className="py-2 px-2.5">Avg Ticket</th>
                  <th className="py-2 px-2.5">Dishes Sold</th>
                  <th className="py-2 px-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px]">
                {salesData?.months.map(m => (
                  <tr key={m.monthKey} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2.5 font-semibold text-slate-900 whitespace-nowrap">
                      {m.monthLabel}
                    </td>
                    <td className="py-2 px-2.5 font-mono font-bold text-emerald-700 whitespace-nowrap">
                      ₹{m.totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-2 px-2.5 font-medium text-slate-800">
                      {m.totalOrders}
                    </td>
                    <td className="py-2 px-2.5 text-emerald-700 font-medium">
                      {m.completedOrders}
                    </td>
                    <td className="py-2 px-2.5 text-rose-600 font-medium">
                      {m.cancelledOrders}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-800">
                      ₹{m.avgOrderValue}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-800">
                      {m.totalItemsSold}
                    </td>
                    <td className="py-2 px-2.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedMonthKey(m.monthKey);
                          setActiveTab('overview');
                        }}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[10px] rounded transition-colors inline-flex items-center gap-0.5 active:scale-[0.98]"
                      >
                        <span>View</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
