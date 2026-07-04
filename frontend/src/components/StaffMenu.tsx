import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, RotateCw, HelpCircle } from 'lucide-react';
import { decodeToken, type DecodedToken } from '../utils/jwt.js';

interface MenuItem {
  id: string;
  name: string;
  price: number;
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
  const navigate = useNavigate();

  // User profile and canteen info
  const [userProfile, setUserProfile] = useState<DecodedToken | null>(null);
  const [canteens, setCanteens] = useState<any[]>([]);
  const [selectedAdminCanteenId, setSelectedAdminCanteenId] = useState<string>('');
  const [selectedFormCanteenId, setSelectedFormCanteenId] = useState<string>('');
  const [canteenName, setCanteenName] = useState<string>('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [category, setCategory] = useState<string>('Pav Bhaji');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const fetchCanteens = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/canteens');
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
      let url = 'http://localhost:5000/api/admin/menu';
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
        fetch('http://localhost:5000/api/canteens')
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

    const isAvailableBoolean = item.is_available !== 1;

    try {
      const response = await fetch(`http://localhost:5000/api/admin/menu/${item.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: item.name,
          price: item.price,
          category: item.category,
          is_available: isAvailableBoolean,
          image: item.image,
          canteen_id: item.canteen_id
        })
      });

      if (response.ok) {
        setMenuItems(prevItems => 
          prevItems.map(i => i.id === item.id ? { ...i, is_available: isAvailableBoolean ? 1 : 0 } : i)
        );
      }
    } catch (e) {
      alert('Network error modifying availability');
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setName('');
    setPrice('');
    setCategory('Snacks');
    setImageUrl('');
    setIsAvailable(true);
    setSelectedFormCanteenId(selectedAdminCanteenId || (canteens[0]?.id || ''));
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
      const response = await fetch(`http://localhost:5000/api/admin/menu/${itemId}`, {
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
      payload.canteen_id = userProfile?.canteenId;
    }

    try {
      let response;
      if (editingId) {
        // Edit Item
        response = await fetch(`http://localhost:5000/api/admin/menu/${editingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        // Add Item
        response = await fetch('http://localhost:5000/api/admin/menu', {
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
        alert('Failed to save menu item.');
      }
    } catch (e) {
      alert('Network error saving menu item.');
    }
  };

  if (userProfile?.role === 'cook') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center glass-card p-6">
        <HelpCircle className="w-12 h-12 text-error mb-3" />
        <h2 className="text-lg font-bold text-slate-800">Access Denied</h2>
        <p className="text-xs text-text-muted mt-1">Cooks are not authorized to view or edit menu items. Please use the Orders Board.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-stack-lg mb-stack-lg border-b border-outline-variant/20 pb-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-text-primary">
            {userProfile?.role === 'admin' 
              ? 'Campus Menu Management' 
              : `${canteens.find(c => c.id === selectedAdminCanteenId)?.name || canteenName || 'Canteen'} Menu Editor`}
          </h1>
          <p className="text-text-secondary mt-2">
            {userProfile?.role === 'admin' 
              ? 'Configure available dishes and pricing across all campus food outlets' 
              : `Logged in as ${userProfile?.role?.toUpperCase()} | Manage canteen offerings`}
          </p>
        </div>

        <div className="flex items-center gap-4 self-stretch md:self-auto justify-between">
          {/* Canteen Switcher for all roles */}
          {userProfile && (
            <div className="flex items-center gap-3 bg-white/40 border border-white/60 p-2 rounded-2xl backdrop-blur-md shadow-sm">
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

          <button
            onClick={handleOpenAddModal}
            className="glossy-primary px-6 py-3 rounded-xl text-white font-label-md flex items-center gap-2 shadow-lg active:scale-95 transition-all"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-status-error/15 border border-status-error/30 text-status-error text-sm rounded-lg p-3 text-center">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-text-muted gap-3">
          <RotateCw className="w-8 h-8 animate-spin text-primary" />
          <span>Syncing menu data...</span>
        </div>
      ) : menuItems.length === 0 ? (
        <div className="py-20 flex flex-col items-center justify-center text-text-muted text-center glass-card p-6">
          <HelpCircle className="w-12 h-12 opacity-25 mb-3" />
          <span className="text-sm font-semibold">No menu items found</span>
          <span className="text-xs text-text-muted mt-1">Click the "Add Item" button to create your first food item</span>
        </div>
      ) : (
        /* Menu Table Grid */
        <div className="glass-card rounded-2xl overflow-hidden mb-12">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-white/10 border-b border-white/20">
                <tr>
                  <th className="px-6 py-4 font-label-md text-text-muted uppercase tracking-wider">Image</th>
                  <th className="px-6 py-4 font-label-md text-text-muted uppercase tracking-wider">Dish Name</th>
                  <th className="px-6 py-4 font-label-md text-text-muted uppercase tracking-wider">Category</th>
                  <th className="px-6 py-4 font-label-md text-text-muted uppercase tracking-wider">Price</th>
                  <th className="px-6 py-4 font-label-md text-text-muted uppercase tracking-wider text-center">Stock Status</th>
                  <th className="px-6 py-4 font-label-md text-text-muted uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {menuItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-white/10 transition-colors ${item.is_available === 0 ? 'opacity-65' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-cover bg-center border border-white/20">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="px-6 py-4 font-label-md text-text-primary">{item.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-hazy-mint text-success px-3 py-1 rounded-full text-label-sm">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-body-md">₹{item.price}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={item.is_available === 1}
                            onChange={() => handleToggleAvailability(item)}
                            className="sr-only"
                          />
                          <div className={`w-12 h-6 rounded-full transition-colors duration-300 ease-in-out relative ${item.is_available === 1 ? 'bg-primary' : 'bg-slate-300'}`}>
                            <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${item.is_available === 1 ? 'translate-x-7' : 'translate-x-1'}`}></div>
                          </div>
                        </label>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                          title="Edit Item"
                        >
                          <span className="material-symbols-outlined">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                          title="Delete Item"
                        >
                          <span className="material-symbols-outlined">delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Drawer: Add / Edit Item */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-gutter bg-inverse-surface/40 backdrop-blur-sm animate-fade-in">
          {/* Modal Card */}
          <div className="glass-card bg-white/90 w-full max-w-lg rounded-2xl overflow-hidden flex flex-col animate-slide-up shadow-2xl">
            
            {/* Header */}
            <div className="px-stack-lg py-stack-md flex justify-between items-center border-b border-white/20">
              <h2 className="font-headline-md text-headline-md text-text-primary">
                {editingId ? 'Edit Menu Item' : 'Add New Food Item'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full hover:bg-white/20 text-text-secondary transition-all"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {/* Form Body */}
              <div className="p-stack-lg space-y-6">
                
                {/* Target Canteen Selection */}
                {userProfile && (
                  <div className="space-y-2">
                    <label className="font-label-md text-text-secondary block">Target Canteen</label>
                    <div className="relative">
                      <select
                        value={selectedFormCanteenId}
                        onChange={(e) => setSelectedFormCanteenId(e.target.value)}
                        className="w-full appearance-none bg-white/40 border border-white/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all pr-10"
                      >
                        {canteens.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">expand_more</span>
                    </div>
                  </div>
                )}

                {/* Dish Name */}
                <div className="space-y-2">
                  <label className="font-label-md text-text-secondary block">Dish Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Paneer Tikka Sandwich"
                    className="w-full bg-white/40 border border-white/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-text-muted"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Price */}
                  <div className="space-y-2">
                    <label className="font-label-md text-text-secondary block">Price (₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted font-body-md">₹</span>
                      <input
                        type="number"
                        step="0.5"
                        required
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="e.g. 60"
                        className="w-full bg-white/40 border border-white/50 rounded-xl pl-9 pr-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="space-y-2">
                    <label className="font-label-md text-text-secondary block">Category</label>
                    <div className="relative">
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full appearance-none bg-white/40 border border-white/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all pr-10"
                      >
                        <option value="Pav Bhaji">Pav Bhaji</option>
                        <option value="South Indian & Dosas">South Indian & Dosas</option>
                        <option value="Sandwiches & Frankies">Sandwiches & Frankies</option>
                        <option value="Chinese (Starters & Mains)">Chinese (Starters & Mains)</option>
                        <option value="Pizza, Burgers & Pasta">Pizza, Burgers & Pasta</option>
                        <option value="Chaat & Potato Specialists">Chaat & Potato Specialists</option>
                        <option value="Indian Meals & Thalis">Indian Meals & Thalis</option>
                        <option value="Fresh Juices & Hot Beverages">Fresh Juices & Hot Beverages</option>
                        <option value="Lassis, Milk Shakes & Desserts">Lassis, Milk Shakes & Desserts</option>
                      </select>
                      <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted">expand_more</span>
                    </div>
                  </div>
                </div>

                {/* Image URL */}
                <div className="space-y-2">
                  <label className="font-label-md text-text-secondary block">Image URL (Optional)</label>
                  <input
                    type="text"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="Unsplash food image URL or leave empty"
                    className="w-full bg-white/40 border border-white/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all placeholder:text-text-muted"
                  />
                </div>

                {/* Stock Toggle */}
                <div className="flex items-center justify-between py-2">
                  <span className="font-label-md text-text-primary">Set Item Available In-Stock</span>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAvailable}
                      onChange={(e) => setIsAvailable(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-12 h-6 rounded-full transition-colors duration-300 ease-in-out relative ${isAvailable ? 'bg-primary' : 'bg-slate-300'}`}>
                      <div className={`absolute top-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ease-in-out ${isAvailable ? 'translate-x-7' : 'translate-x-1'}`}></div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="px-stack-lg py-stack-md bg-white/10 flex justify-end gap-4 border-t border-white/20">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-3 rounded-xl font-label-md text-text-primary hover:bg-white/20 border border-white/40 backdrop-blur-md transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="glossy-primary px-8 py-3 rounded-xl font-label-md text-white flex items-center gap-2 active:scale-95 shadow-lg"
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>save</span>
                  {editingId ? 'Save Changes' : 'Create Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
