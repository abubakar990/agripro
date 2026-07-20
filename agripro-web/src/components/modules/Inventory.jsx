import React, { useMemo, useState } from 'react';
import { IconPlus, IconBox, IconAlertTriangle, IconPackageImport, IconCoins, IconTrash, IconEdit } from '@tabler/icons-react';
import { formatPKR, formatNumber } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';

import { useInventory, useCategories, useFarms } from '../../hooks/queries';
import { useFilteredData } from '../../hooks/useFilteredData';
import { toast } from '../../utils/toast';

const Inventory = ({ user }) => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const { data: farms = [] } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);

  const { data: rawInventory = [], isLoading, refetch } = useInventory(farmIds);
  const inventory = useFilteredData(rawInventory);

  const { data: allCategories = [] } = useCategories(currentOrgId);
  const categories = allCategories.filter(c => c.module === 'inventory');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [formData, setFormData] = useState({
    farm_id: farms[0]?.id || '',
    item: '',
    category: categories.length > 0 ? categories[0].name : 'ADD_NEW',
    qty: '',
    unit: 'Bags',
    reorder_level: '',
    value: ''
  });

  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const totalValue = inventory.reduce((sum, i) => sum + i.value, 0);
    const lowStockCount = inventory.filter(i => i.qty <= i.reorder_level).length;
    
    return { totalItems, totalValue, lowStockCount };
  }, [inventory]);

  const handleEdit = (item) => {
    setEditingId(item.id);
    const isKnownCategory = categories.some(c => c.name === item.category);
    
    setFormData({
      farm_id: item.farm_id,
      item: item.item,
      category: isKnownCategory ? item.category : 'ADD_NEW',
      qty: item.qty.toString(),
      unit: item.unit,
      reorder_level: item.reorder_level.toString(),
      value: item.value.toString()
    });
    
    if (!isKnownCategory) {
      setCustomCategory(item.category);
    } else {
      setCustomCategory('');
    }
    
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalCategory = formData.category;

    try {
      if (formData.category === 'ADD_NEW') {
        const { error: catError } = await supabase
          .from('categories')
          .insert([{ 
            name: customCategory, 
            module: 'inventory',
            user_id: user?.id 
          }]);
        
        if (catError && catError.code !== '23505') throw catError;
        finalCategory = customCategory;
      }

      if (editingId) {
        const { error } = await supabase
          .from('inventory')
          .update({
            ...formData,
            category: finalCategory,
            farm_id: parseInt(formData.farm_id),
            qty: parseFloat(formData.qty) || 0,
            reorder_level: parseFloat(formData.reorder_level) || 0,
            value: parseFloat(formData.value) || 0
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('inventory')
          .insert([{
            ...formData,
            category: finalCategory,
            farm_id: parseInt(formData.farm_id),
            qty: parseFloat(formData.qty) || 0,
            reorder_level: parseFloat(formData.reorder_level) || 0,
            value: parseFloat(formData.value) || 0
          }]);
        if (error) throw error;
      }

      await refetch();
      setIsModalOpen(false);
      setEditingId(null);
      setCustomCategory('');
      setFormData({
        farm_id: farms[0]?.id || '',
        item: '',
        category: categories.length > 0 ? categories[0].name : 'ADD_NEW',
        qty: '',
        unit: 'Bags',
        reorder_level: '',
        value: ''
      });
    } catch (error) {
      console.error('Error saving inventory item:', error.message);
      toast.error('Error saving item: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setCustomCategory('');
    setFormData({
      farm_id: farms[0]?.id || '',
      item: '',
      category: categories.length > 0 ? categories[0].name : 'ADD_NEW',
      qty: '',
      unit: 'Bags',
      reorder_level: '',
      value: ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete ${item.item}?`)) return;
    
    setIsDeleting(item.id);
    try {
      const { error } = await supabase.from('inventory').delete().eq('id', item.id);
      if (error) throw error;
      await refetch();
    } catch (error) {
      console.error('Error deleting inventory item:', error.message);
      toast.error('Error deleting item: ' + error.message);
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex w-full h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Inventory Management</h2>
          <p className="text-sm text-text-muted">Monitor your stock levels and asset values.</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <IconPlus size={18} />
          Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="agri-card p-5 border-l-4 border-primary">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Items</span>
            <IconBox size={20} className="text-primary" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.totalItems} Categories</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-revenue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Stock Value (PKR)</span>
            <IconCoins size={20} className="text-revenue" />
          </div>
          <span className="text-lg font-bold text-revenue">{formatPKR(stats.totalValue)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-amber">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Low Stock Items</span>
            <IconAlertTriangle size={20} className="text-accent-amber" />
          </div>
          <span className="text-lg font-bold text-accent-amber">{stats.lowStockCount} Alerts</span>
        </div>
      </div>

      {stats.lowStockCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <IconAlertTriangle size={24} className="text-accent-amber" />
            <div>
              <h4 className="text-sm font-bold text-accent-amber">{stats.lowStockCount} items are running low on stock</h4>
              <p className="text-xs text-amber-700">Check reorder levels and restock soon to avoid operations delay.</p>
            </div>
          </div>
          <Button size="small" variant="outline" className="border-accent-amber text-accent-amber hover:bg-amber-100">Restock All</Button>
        </div>
      )}

      <div className="agri-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="agri-table-header">
                <th className="px-6 py-3">Farm</th>
                <th className="px-6 py-3">Item Name</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Unit</th>
                <th className="px-6 py-3">Value</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {inventory.map(item => {
                const farm = farms.find(f => f.id === item.farm_id);
                const isOut = item.qty === 0;
                const isLow = item.qty <= item.reorder_level && !isOut;
                
                return (
                  <tr key={item.id} className={`agri-table-row ${isOut ? 'bg-red-50' : isLow ? 'bg-amber-50' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="primary">{farm?.name || '—'}</Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-text-primary">{item.item}</td>
                    <td className="px-6 py-4 text-[13px] text-text-secondary uppercase font-bold">{item.category}</td>
                    <td className={`px-6 py-4 font-bold ${isOut ? 'text-expense' : isLow ? 'text-accent-amber' : 'text-primary'}`}>
                      {formatNumber(item.qty)}
                    </td>
                    <td className="px-6 py-4 text-xs text-text-muted">{item.unit}</td>
                    <td className="px-6 py-4 font-bold text-text-primary">{formatPKR(item.value)}</td>
                    <td className="px-6 py-4 text-center">
                      {isOut ? (
                        <Badge variant="danger">OUT OF STOCK</Badge>
                      ) : isLow ? (
                        <Badge variant="warning">LOW STOCK</Badge>
                      ) : (
                        <Badge variant="success">OK</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(item)}
                          className="text-primary hover:bg-primary/10 p-2 rounded-full transition-all"
                        >
                          <IconEdit size={18} />
                        </button>
                        <button 
                          onClick={() => handleDelete(item)}
                          disabled={isDeleting === item.id}
                          className="text-error hover:bg-error/10 p-2 rounded-full transition-all disabled:opacity-50"
                        >
                          <IconTrash size={18} />
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

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Edit Inventory Item" : "Add New Inventory Item"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="agri-label">Select Farm</label>
              <select 
                className="agri-input"
                value={formData.farm_id}
                onChange={e => setFormData({...formData, farm_id: e.target.value})}
                required
              >
                {farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="agri-label">Item Name</label>
              <input 
                type="text" 
                className="agri-input" 
                placeholder="e.g. Urea Fertilizer"
                value={formData.item}
                onChange={e => setFormData({...formData, item: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="agri-label">Category</label>
              <select 
                className="agri-input"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                <option value="ADD_NEW">Add New...</option>
              </select>
            </div>
            {formData.category === 'ADD_NEW' && (
              <div className="col-span-2 animate-in fade-in slide-in-from-top-1">
                <label className="agri-label">New Category Name</label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  required
                  placeholder="e.g. Fertilizer, Seed, Pesticide"
                  className="agri-input"
                />
              </div>
            )}
            <div>
              <label className="agri-label">Unit</label>
              <select 
                className="agri-input"
                value={formData.unit}
                onChange={e => setFormData({...formData, unit: e.target.value})}
              >
                <option value="Bags">Bags</option>
                <option value="kg">kg</option>
                <option value="Litre">Litre</option>
                <option value="Units">Units</option>
              </select>
            </div>
            <div>
              <label className="agri-label">Quantity</label>
              <input 
                type="number" 
                step="0.01"
                className="agri-input"
                value={formData.qty}
                onChange={e => setFormData({...formData, qty: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="agri-label">Reorder Level</label>
              <input 
                type="number" 
                step="0.01"
                className="agri-input"
                value={formData.reorder_level}
                onChange={e => setFormData({...formData, reorder_level: e.target.value})}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="agri-label">Total Value (PKR)</label>
              <input 
                type="number" 
                className="agri-input"
                value={formData.value}
                onChange={e => setFormData({...formData, value: e.target.value})}
                required
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Item'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Inventory;
