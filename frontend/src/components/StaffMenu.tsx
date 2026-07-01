import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, X, RotateCw, HelpCircle, Save } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  is_available: number;
  image: string;
}

export function StaffMenu() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const navigate = useNavigate();

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState<string>('');
  const [price, setPrice] = useState<string>('');
  const [category, setCategory] = useState<string>('Snacks');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [isAvailable, setIsAvailable] = useState<boolean>(true);

  const fetchAdminMenu = async () => {
    const token = localStorage.getItem('staffToken');
    if (!token) {
      navigate('/staff/login');
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/admin/menu', {
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
    fetchAdminMenu();
  }, []);

  const handleToggleAvailability = async (item: MenuItem) => {
    const token = localStorage.getItem('staffToken');
    if (!token) return;

    const updatedStatus = item.is_available === 1 ? 0 : 1;

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
          is_available: updatedStatus,
          image: item.image
        })
      });

      if (response.ok) {
        setMenuItems(prevItems => 
          prevItems.map(i => i.id === item.id ? { ...i, is_available: updatedStatus } : i)
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
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingId(item.id);
    setName(item.name);
    setPrice(item.price.toString());
    setCategory(item.category);
    setImageUrl(item.image);
    setIsAvailable(item.is_available === 1);
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

    const payload = {
      name,
      price: parsedPrice,
      category,
      is_available: isAvailable,
      image: imageUrl.trim() || undefined
    };

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
          body: JSON.stringify({ ...payload, is_available: isAvailable ? 1 : 0 })
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

  return (
    <div className="flex-1 flex flex-col gap-6 animate-in">
      
      {/* Page Header */}
      <div className="flex justify-between items-center gap-4 border-b border-border-subtle pb-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">Menu Management</h2>
          <p className="text-sm text-text-secondary">Configure available dishes, pricing, and stock status</p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-sm font-semibold transition-colors duration-150 shadow-glow"
        >
          <Plus className="w-4 h-4" />
          Add Item
        </button>
      </div>

      {error && (
        <div className="bg-status-error/15 border border-status-error/30 text-status-error text-sm rounded-lg p-3 text-center">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 text-text-muted gap-3">
          <RotateCw className="w-8 h-8 animate-spin text-brand" />
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
        <div className="glass-card overflow-hidden border border-border-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-border-default bg-white/[0.01] text-text-muted text-xs uppercase tracking-wider">
                  <th className="py-3 px-5 font-bold">Image</th>
                  <th className="py-3 px-5 font-bold">Dish Name</th>
                  <th className="py-3 px-5 font-bold">Category</th>
                  <th className="py-3 px-5 font-bold">Price</th>
                  <th className="py-3 px-5 font-bold text-center">Stock Status</th>
                  <th className="py-3 px-5 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {menuItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-white/[0.01] transition-colors ${item.is_available === 0 ? 'opacity-65' : ''}`}>
                    <td className="py-3.5 px-5">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-bg3 border border-border-subtle">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="py-3.5 px-5 font-bold text-text-primary">
                      {item.name}
                      {item.is_available === 0 && (
                        <span className="ml-2 text-[10px] bg-neutral-bg5 border border-border-subtle px-1.5 py-0.5 rounded font-bold text-text-muted uppercase">
                          Out of Stock
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-text-secondary">{item.category}</td>
                    <td className="py-3.5 px-5 font-bold text-text-primary">₹{item.price}</td>
                    <td className="py-3.5 px-5">
                      {/* Custom Switch Toggle */}
                      <div className="flex items-center justify-center">
                        <label className="relative inline-flex items-center cursor-pointer select-none">
                          <input 
                            type="checkbox" 
                            checked={item.is_available === 1}
                            onChange={() => handleToggleAvailability(item)}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-neutral-bg4 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-status-success"></div>
                        </label>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg bg-neutral-bg4 hover:bg-neutral-bg5 text-text-secondary hover:text-text-primary transition-colors"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 rounded-lg bg-neutral-bg4 hover:bg-status-error/15 text-text-secondary hover:text-status-error transition-colors"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-md bg-neutral-bg2 border border-border-strong rounded-2xl shadow-2xl p-6 overflow-hidden flex flex-col gap-5 animate-slide-up">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-border-subtle pb-3">
              <h3 className="text-lg font-bold text-text-primary">
                {editingId ? 'Edit Menu Item' : 'Add New Food Item'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">Dish Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Paneer Tikka Sandwich"
                  className="glass-input block w-full px-3.5 py-2.5 rounded-lg text-sm text-text-primary placeholder:text-text-muted"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary block">Price (₹)</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 60"
                    className="glass-input block w-full px-3.5 py-2.5 rounded-lg text-sm text-text-primary placeholder:text-text-muted"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-text-secondary block">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="glass-input block w-full px-3.5 py-2.5 rounded-lg text-sm text-text-primary focus:bg-neutral-bg3 select-none"
                  >
                    <option value="Meals">Meals</option>
                    <option value="Snacks">Snacks</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Desserts">Desserts</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">Image URL (Optional)</label>
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Unsplash food image URL or leave empty"
                  className="glass-input block w-full px-3.5 py-2.5 rounded-lg text-sm text-text-primary placeholder:text-text-muted"
                />
              </div>

              <div className="flex items-center gap-2.5 py-2">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-bg4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-text-secondary peer-checked:after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-status-success"></div>
                </label>
                <span className="text-xs font-semibold text-text-primary">Set Item Available In-Stock</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-border-subtle pt-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-neutral-bg4 hover:bg-neutral-bg5 text-xs text-text-secondary hover:text-text-primary font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4.5 py-2 bg-brand hover:bg-brand-hover text-white rounded-lg text-xs font-bold transition-colors shadow-glow"
                >
                  <Save className="w-4 h-4" />
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
