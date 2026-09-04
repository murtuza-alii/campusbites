import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, RotateCw, HelpCircle, Search, Filter, Store, Link as LinkIcon, Edit3, Trash2, X, Save, TrendingUp } from 'lucide-react';
import { decodeToken, type DecodedToken } from '../utils/jwt.js';
import { API_BASE_URL } from '../config.js';
import { calculateHike } from '../utils/pricing.js';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  price_hike?: number;
  category: string;
  is_available: number;
  image: string;
  canteen_id: string;
}

export function StaffMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'OUT_OF_STOCK'>('ALL');
  const [updatingStockId, setUpdatingStockId] = useState<string | null>(null);
  const navigate = useNavigate();

  // User profile and canteen info
  const [userProfile, setUserProfile] = useState<DecodedToken | null>(null);
  const [canteens, setCanteens] = useState<any[]>([]);
  const [selectedAdminCanteenId, setSelectedAdminCanteenId] = useState<string>('');
  const [selectedFormCanteenId, setSelectedFormCanteenId] = useState<string>('');
  const [canteenName, setCanteenName] = useState<string>('');

  // Determine campus scope and valid canteens to prevent cross-contamination
  const userCanteen = canteens.find((c: any) => c.id === userProfile?.canteenId);
  const userGroupName = userProfile?.groupName || userCanteen?.group_name;
  
  let scopedCanteens = canteens;
  if (userProfile && userProfile.role !== 'admin') {
    if (userGroupName) {
      scopedCanteens = canteens.filter((c: any) => c.group_name === userGroupName);
    } else if (userProfile.canteenId) {
      scopedCanteens = canteens.filter((c: any) => c.id === userProfile.canteenId);
    }
  }

  const currentCanteenObj = canteens.find((c: any) => c.id === selectedAdminCanteenId) || userCanteen;

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [category, setCategory] = useState<string>('Pav Bhaji');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const inStockCount = useMemo(() => menuItems.filter(i => i.is_available === 1).length, [menuItems]);
  const outOfStockCount = useMemo(() => menuItems.filter(i => i.is_available === 0).length, [menuItems]);

  const fetchCanteens = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/canteens`);
      if (response.ok) {
        const data = await response.json();
        setCanteens(data);
      }
    } catch (e) {
      console.error('Failed to load canteens', e);
    }
  };

  const fetchAdminMenu = async (adminCanteenId?: string) => {
    const token = localStorage.getItem('staffToken');
    if (!token) {
      navigate('/staff/login');
      return;
    }

    try {
      const targetCanteenId = adminCanteenId || selectedAdminCanteenId;
      let url = `${API_BASE_URL}/api/admin/menu`;
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
        setMenuItems(data);
        setError('');
      } else if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('staffToken');
        navigate('/staff/login');
      } else {
        setError('Failed to fetch admin menu.');
      }
    } catch (err) {
      setError('Connection to canteen server offline.');
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
        fetch(`${API_BASE_URL}/api/canteens`)
          .then(res => res.json())
          .then(data => {
            const match = data.find((c: any) => c.id === decoded.canteenId);
            if (match) setCanteenName(match.name);
          })
          .catch(e => console.error(e));
      }
    }

    fetchAdminMenu();
  }, [selectedAdminCanteenId]);

  const handleToggleAvailability = async (item: MenuItem) => {
    const token = localStorage.getItem('staffToken');
    if (!token) return;

    const newAvailability = item.is_available === 1 ? 0 : 1;
    setUpdatingStockId(item.id);

    // Instant optimistic UI update
    setMenuItems(prevItems => 
      prevItems.map(i => i.id === item.id ? { ...i, is_available: newAvailability } : i)
    );

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/menu/${item.id}/availability`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ is_available: newAvailability === 1 })
      });

      if (!response.ok) {
        // Revert on error
        setMenuItems(prevItems => 
          prevItems.map(i => i.id === item.id ? { ...i, is_available: item.is_available } : i)
        );
        alert('Failed to update availability. Outlet Manager permissions required.');
      }
    } catch (e) {
      setMenuItems(prevItems => 
        prevItems.map(i => i.id === item.id ? { ...i, is_available: item.is_available } : i)
      );
      alert('Network error modifying availability');
    } finally {
      setUpdatingStockId(null);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setCategory('Snacks');
    setImageUrl('');
    setIsAvailable(true);
    setSelectedFormCanteenId(selectedAdminCanteenId || (scopedCanteens[0]?.id || ''));
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingId(item.id);
    setName(item.name);
    setPrice(item.price.toString());
    setCategory(item.category);
    setImageUrl(item.image);
    setIsAvailable(item.is_available === 1);
    setSelectedFormCanteenId(item.canteen_id);
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;

    const token = localStorage.getItem('staffToken');
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/menu/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setMenuItems(prev => prev.filter(i => i.id !== itemId));
      } else {
        alert('Failed to delete item.');
      }
    } catch (e) {
      alert('Network error deleting item.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !price || !category) return;

    const token = localStorage.getItem('staffToken');
    if (!token) return;

    const parsedPrice = parseFloat(price);
    if (isNaN(parsedPrice)) {
      alert('Please enter a valid price');
      return;
    }

    const payload: any = {
      name,
      price: parsedPrice,
      category,
      is_available: isAvailable,
      image: imageUrl.trim() || undefined
    };

    if (userProfile?.role === 'admin') {
      payload.canteen_id = selectedFormCanteenId || selectedAdminCanteenId || (canteens[0]?.id || '');
    } else {
      payload.canteen_id = selectedFormCanteenId || userProfile?.canteenId || (scopedCanteens[0]?.id || '');
    }

    try {
      let response;
      if (editingId) {
        // Edit Item
        response = await fetch(`${API_BASE_URL}/api/admin/menu/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Add Item
        response = await fetch(`${API_BASE_URL}/api/admin/menu`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        fetchAdminMenu(); // Reload full menu
        setIsModalOpen(false);
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error || 'Failed to save menu item'}`);
      }
    } catch (e) {
      alert('Network error while saving menu item');
    }
  };

  // Filter menu items based on search query, category, and live stock availability
  const filteredMenuItems = useMemo(() => {
    return menuItems
      .filter(item => {
        const matchesSearch = !searchQuery.trim() || item.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
        const matchesCategory = selectedCategory === '' || item.category === selectedCategory;
        const matchesStock = 
          stockFilter === 'ALL' || 
          (stockFilter === 'IN_STOCK' && item.is_available === 1) || 
          (stockFilter === 'OUT_OF_STOCK' && item.is_available === 0);
        return matchesSearch && matchesCategory && matchesStock;
      })
      .sort((a, b) => a.price - b.price);
  }, [menuItems, searchQuery, selectedCategory, stockFilter]);

  if (userProfile?.role === 'cook' || userProfile?.role === 'delivery') {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-center glass-card p-6">
        <HelpCircle className="w-12 h-12 text-error mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Access Denied</h2>
        <p className="text-xs text-text-muted mt-1">Cooks and delivery staff are not authorized to view or edit menu items. Please use the Orders Board.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-3 animate-in pb-10">
      
      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 rounded-lg p-3 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-xs sm:text-[13px] font-bold text-slate-900 tracking-tight">
              {userProfile?.role === 'admin' 
                ? 'Campus Menu Management' 
                : `${currentCanteenObj?.name || canteenName || 'Canteen'} Menu Editor`}
            </h1>
            <span className="text-slate-300 text-xs">·</span>
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
              {userProfile?.role === 'admin' ? 'Global Admin' : userProfile?.role === 'manager' ? 'Menu Manager' : 'Staff'}
            </span>
            {userGroupName && (
              <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200/80 rounded text-[10px] font-medium">
                {userGroupName}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 font-normal">
            {userProfile?.role === 'admin' 
              ? 'Configure available dishes and pricing across all campus food outlets' 
              : `Configuring dishes for ${currentCanteenObj?.name || 'Selected Outlet'}`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
          {/* Canteen Switcher */}
          {userProfile && (
            <div className="flex items-center gap-1.5">
              {userProfile.role === 'admin' ? (
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
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
              ) : scopedCanteens.length > 1 ? (
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md">
                  <Store className="w-3 h-3 text-slate-400 shrink-0" />
                  <select
                    value={selectedAdminCanteenId}
                    onChange={(e) => setSelectedAdminCanteenId(e.target.value)}
                    className="bg-transparent border-none text-[11px] font-medium text-slate-800 focus:outline-none cursor-pointer"
                  >
                    <option value="">All Outlets</option>
                    {scopedCanteens.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              ) : null}

              <button
                onClick={() => {
                  const current = canteens.find(c => c.id === (selectedAdminCanteenId || userProfile?.canteenId));
                  let url = window.location.origin;
                  if (current?.group_slug) {
                    url += `/c/${current.group_slug}?canteen=${current.slug || current.id}`;
                  } else if (current?.slug) {
                    url += `/c/${current.slug}`;
                  } else if (userProfile?.canteenSlug) {
                    url += `/c/${userProfile.canteenSlug}`;
                  } else {
                    url += `/c/anand-stall`;
                  }
                  navigator.clipboard.writeText(url);
                  alert(`Direct Student Link copied to clipboard:\n${url}`);
                }}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/80 transition-colors shadow-2xs"
                title="Copy Direct Link for Students"
              >
                <LinkIcon className="w-2.5 h-2.5 text-indigo-600" />
                <span className="hidden sm:inline">Student Link</span>
              </button>
            </div>
          )}

          <Link
            to="/staff/sales"
            className="flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 transition-colors shadow-2xs"
            title="View monthly sales & revenue ledger"
          >
            <TrendingUp className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="hidden xs:inline">Monthly Sales</span>
          </Link>

          <button
            onClick={handleOpenAddModal}
            className="px-3 py-1 bg-slate-900 hover:bg-black text-white font-semibold text-[11px] rounded-md shadow-2xs active:scale-[0.98] transition-all flex items-center gap-1.5"
          >
            <Plus className="w-3 h-3" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-[11px] rounded-md p-2 text-center font-medium">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
          <RotateCw className="w-5 h-5 animate-spin text-indigo-600" />
          <span className="text-[11px] font-medium">Syncing menu data...</span>
        </div>
      ) : menuItems.length === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 text-center bg-white border border-slate-200/90 rounded-lg p-6 shadow-2xs">
          <HelpCircle className="w-8 h-8 opacity-40 mb-2" />
          <span className="text-xs font-semibold text-slate-700">No menu items found</span>
          <span className="text-[11px] text-slate-400 mt-0.5">Click "Add Item" above to add your first dish</span>
        </div>
      ) : (
        <div className="space-y-2.5">
          {/* Live Stock Health Summary & Quick Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-white border border-slate-200/90 p-2.5 rounded-lg shadow-2xs">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mr-1">Stock Status:</span>
              
              <button
                type="button"
                onClick={() => setStockFilter('ALL')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  stockFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                All ({menuItems.length})
              </button>

              <button
                type="button"
                onClick={() => setStockFilter('IN_STOCK')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  stockFilter === 'IN_STOCK'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>In Stock ({inStockCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setStockFilter('OUT_OF_STOCK')}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all flex items-center gap-1.5 ${
                  stockFilter === 'OUT_OF_STOCK'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span>
                <span>Sold Out ({outOfStockCount})</span>
              </button>
            </div>

            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              1-Tap to flip stock status • Live updates to student phones
            </span>
          </div>

          {/* Search & Category Filter Bar */}
          <div className="flex flex-col sm:flex-row gap-2 bg-white border border-slate-200/90 p-2 rounded-lg shadow-2xs">
            {/* Search Input */}
            <div className="flex-1 flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all h-7">
              <Search className="w-3 h-3 text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Search dish name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-[11px] font-medium text-slate-900 placeholder:text-slate-400"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500 transition-all h-7">
              <Filter className="w-3 h-3 text-slate-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-transparent border-none outline-none text-[11px] font-medium text-slate-900 cursor-pointer w-full text-ellipsis overflow-hidden"
              >
                <option value="">All Categories</option>
                {Array.from(new Set(menuItems.map(item => item.category))).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          {filteredMenuItems.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-center bg-white border border-slate-200/90 rounded-lg p-4 shadow-2xs">
              <HelpCircle className="w-6 h-6 opacity-40 mb-1" />
              <span className="text-xs font-semibold text-slate-700">No matching dishes found</span>
              <span className="text-[11px] text-slate-400 mt-0.5">Try resetting the stock filter or search keywords</span>
            </div>
          ) : (
            /* Menu Table Grid */
            <div className="bg-white border border-slate-200/90 rounded-lg overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200/80">
                    <tr>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dish Name</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Category</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Price</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Live Availability</th>
                      <th className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMenuItems.map((item: MenuItem) => {
                      const isItemInStock = item.is_available === 1;
                      const isUpdatingThis = updatingStockId === item.id;
                      return (
                        <tr key={item.id} className={`hover:bg-slate-50/80 transition-colors ${!isItemInStock ? 'opacity-70 bg-rose-50/20' : ''}`}>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isItemInStock ? 'bg-emerald-500' : 'bg-rose-400'}`} />
                              <span className={`text-[11px] font-semibold ${isItemInStock ? 'text-slate-900' : 'text-slate-500 line-through'}`}>
                                {item.name}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <span className="bg-slate-100 text-slate-700 font-medium px-1.5 py-0.5 rounded text-[10px]">
                              {item.category}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono font-bold text-[11px] text-slate-900">
                            <div className="flex items-center gap-1.5">
                              <span>₹{item.price}</span>
                              <span className="text-[10px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded font-sans font-medium">
                                +₹{item.price_hike !== undefined && item.price_hike !== null ? item.price_hike : calculateHike(item.price)}
                              </span>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center">
                            <button
                              type="button"
                              disabled={isUpdatingThis}
                              onClick={() => handleToggleAvailability(item)}
                              className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all inline-flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer border ${
                                isItemInStock
                                  ? 'bg-emerald-50 hover:bg-rose-50 text-emerald-800 hover:text-rose-700 border-emerald-200/90'
                                  : 'bg-rose-50 hover:bg-emerald-50 text-rose-800 hover:text-emerald-700 border-rose-200/90 font-black'
                              }`}
                              title={isItemInStock ? 'Click to mark OUT OF STOCK' : 'Click to mark IN STOCK'}
                            >
                              {isUpdatingThis ? (
                                <RotateCw className="w-2.5 h-2.5 animate-spin" />
                              ) : (
                                <span className={`w-1.5 h-1.5 rounded-full ${isItemInStock ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                              )}
                              <span>{isItemInStock ? 'In Stock' : 'Sold Out'}</span>
                            </button>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => handleOpenEditModal(item)}
                                className="p-1 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                                title="Edit Item"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Drawer: Add / Edit Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          {/* Modal Card */}
          <div className="bg-white w-full max-w-sm rounded-xl overflow-hidden flex flex-col shadow-xl border border-slate-200 text-left">
            
            {/* Header */}
            <div className="px-3.5 py-2.5 flex justify-between items-center border-b border-slate-200/80 bg-slate-50">
              <h2 className="text-xs font-bold text-slate-900">
                {editingId ? 'Edit Dish' : 'Add New Dish'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-slate-700 transition-all"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Form Body */}
              <div className="p-3.5 space-y-2.5">
                
                {/* Target Canteen Selection */}
                {userProfile && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Target Outlet</label>
                    <div className="relative">
                      {userProfile.role === 'admin' ? (
                        <select
                          value={selectedFormCanteenId}
                          onChange={(e) => setSelectedFormCanteenId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-7"
                        >
                          <option value="">Select Outlet</option>
                          {canteens.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      ) : scopedCanteens.length > 1 ? (
                        <select
                          value={selectedFormCanteenId}
                          onChange={(e) => setSelectedFormCanteenId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-7"
                        >
                          {scopedCanteens.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full bg-slate-100 border border-slate-200 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-800 h-7 flex items-center">
                          {scopedCanteens[0]?.name || currentCanteenObj?.name || 'Assigned Outlet'}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Dish Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Dish Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Cheese Pav Bhaji"
                    className="w-full bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1 text-[11px] font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 h-7"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {/* Price */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Price (₹)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[11px] font-mono">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="60"
                        className="w-full bg-slate-50 border border-slate-200 rounded-md pl-6 pr-2 py-1 text-[11px] font-mono font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-7"
                      />
                    </div>
                    {price && !isNaN(parseFloat(price)) && (
                      <span className="text-[10px] text-indigo-600 font-medium block">
                        Tiered checkout markup: +₹{calculateHike(parseFloat(price))}
                      </span>
                    )}
                  </div>

                  {/* Category */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-md px-2 py-1 text-[11px] font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-7"
                    >
                      <option value="Pav Bhaji">Pav Bhaji</option>
                      <option value="South Indian & Dosas">South Indian & Dosas</option>
                      <option value="Sandwiches & Frankies">Sandwiches & Frankies</option>
                      <option value="Chinese (Starters & Mains)">Chinese</option>
                      <option value="Pizza, Burgers & Pasta">Fast Food</option>
                      <option value="Chaat & Potato Specialists">Chaat</option>
                      <option value="Indian Meals & Thalis">Thalis</option>
                      <option value="Fresh Juices & Hot Beverages">Beverages</option>
                      <option value="Lassis, Milk Shakes & Desserts">Desserts</option>
                    </select>
                  </div>
                </div>

                {/* Stock Toggle */}
                <div className="flex items-center justify-between py-1 border-t border-slate-100">
                  <span className="text-[11px] font-medium text-slate-700">In-Stock</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-8 h-4 rounded-full transition-colors duration-200 ease-in-out relative ${isAvailable ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                      <div className={`absolute top-0.5 bg-white w-3 h-3 rounded-full transition-transform duration-200 ease-in-out ${isAvailable ? 'translate-x-4' : 'translate-x-0.5'}`}></div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-3.5 py-2.5 bg-slate-50 flex justify-end gap-2 border-t border-slate-200/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1 rounded-md text-[11px] font-medium text-slate-700 hover:bg-slate-200/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded-md text-[11px] font-semibold bg-slate-900 hover:bg-black text-white flex items-center gap-1 shadow-2xs active:scale-[0.98] transition-all"
                >
                  <Save className="w-3 h-3" />
                  <span>{editingId ? 'Save Changes' : 'Create Dish'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
