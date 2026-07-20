import React, { useMemo, useState } from 'react';
import { IconPlus, IconReceipt2, IconTrendingDown, IconFilter, IconTrash, IconEdit } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';
import { useExpenses, useFarms, useCategories, useFarmPlots, useCropCycles } from '../../hooks/queries';
import { useFilteredData } from '../../hooks/useFilteredData';
import { resolveArea, totalArea as calcTotalArea, formatPerAcre } from '../../utils/perAcreCalc';

const Expenses = ({ user }) => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const { data: farms = [] } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);
  
  const { data: rawExpenses = [], isLoading, refetch } = useExpenses(farmIds);
  const expenses = useFilteredData(rawExpenses);
  
  const { data: allCategories = [] } = useCategories(currentOrgId);
  const categories = allCategories.filter(c => c.module === 'expense');
  
  const { data: farmPlots = [] } = useFarmPlots(farmIds);
  const { data: cropCycles = [] } = useCropCycles(farmIds);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [formData, setFormData] = useState({
    farm_id: farms.length > 0 ? farms[0].id : '',
    date: new Date().toISOString().split('T')[0],
    category: categories.length > 0 ? categories[0].name : 'ADD_NEW',
    description: '',
    party: '',
    amount: '',
    plot_id: '',
    crop_cycle_id: '',
    area_acres: ''
  });

  const stats = useMemo(() => {
    const context = { farmPlots, cropCycles, farms };
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const count = expenses.length;
    const totalArea = calcTotalArea(expenses, context) || 0;
    const costPerAcre = totalArea > 0 ? total / totalArea : null;
    const catSum = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
    const topCategory = Object.entries(catSum).sort((a, b) => b[1] - a[1])[0];
    
    return {
      total,
      count,
      costPerAcre,
      topCategory: topCategory ? topCategory[0] : '—',
      topCategoryAmount: topCategory ? topCategory[1] : 0
    };
  }, [expenses]);

  const categoryTotals = useMemo(() => {
    const totals = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + e.amount;
      return acc;
    }, {});
    return Object.entries(totals).sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlotChange = (e) => {
    const plotId = e.target.value;
    const plot = farmPlots.find(p => p.id === parseInt(plotId));
    setFormData(prev => ({ ...prev, plot_id: plotId, area_acres: plot?.area_acres?.toString() || '' }));
  };

  const handleCropCycleChange = (e) => {
    const cycleId = e.target.value;
    const cycle = cropCycles.find(c => c.id === parseInt(cycleId));
    setFormData(prev => ({ 
      ...prev, 
      crop_cycle_id: cycleId, 
      area_acres: cycle?.area_acres?.toString() || prev.area_acres 
    }));
  };

  const handleEdit = (e) => {
    setEditingId(e.id);
    const isKnownCategory = categories.some(c => c.name === e.category);
    
    setFormData({
      farm_id: e.farm_id,
      date: e.date,
      category: isKnownCategory ? e.category : 'ADD_NEW',
      description: e.description || '',
      party: e.party || '',
      amount: e.amount.toString(),
      plot_id: e.plot_id?.toString() || '',
      crop_cycle_id: e.crop_cycle_id?.toString() || '',
      area_acres: e.area_acres?.toString() || ''
    });
    
    if (!isKnownCategory) {
      setCustomCategory(e.category);
    } else {
      setCustomCategory('');
    }
    
    setIsModalOpen(true);
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setIsSubmitting(true);
    
    let finalCategory = formData.category;
    
    try {
      if (formData.category === 'ADD_NEW') {
        const { error: catError } = await supabase
          .from('categories')
          .insert([{ 
            name: customCategory, 
            module: 'expense',
            user_id: user?.id 
          }]);
        
        if (catError && catError.code !== '23505') throw catError; // Ignore unique constraint violation
        finalCategory = customCategory;
      }
      
      if (editingId) {
        const { error } = await supabase
          .from('expenses')
          .update({
            ...formData,
            category: finalCategory,
            amount: parseFloat(formData.amount),
            farm_id: parseInt(formData.farm_id),
            plot_id: formData.plot_id ? parseInt(formData.plot_id) : null,
            crop_cycle_id: formData.crop_cycle_id ? parseInt(formData.crop_cycle_id) : null,
            area_acres: formData.area_acres ? parseFloat(formData.area_acres) : null
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('expenses').insert([{
          ...formData,
          category: finalCategory,
          amount: parseFloat(formData.amount),
          farm_id: parseInt(formData.farm_id),
          plot_id: formData.plot_id ? parseInt(formData.plot_id) : null,
          crop_cycle_id: formData.crop_cycle_id ? parseInt(formData.crop_cycle_id) : null,
          area_acres: formData.area_acres ? parseFloat(formData.area_acres) : null
        }]);
        if (error) throw error;
      }
      
      await refetch();
      setIsModalOpen(false);
      setEditingId(null);
      setCustomCategory('');
      setFormData({
        farm_id: farms.length > 0 ? farms[0].id : '',
        date: new Date().toISOString().split('T')[0],
        category: categories.length > 0 ? categories[0].name : 'ADD_NEW',
        description: '',
        party: '',
        amount: '',
        plot_id: '',
        crop_cycle_id: '',
        area_acres: ''
      });
    } catch (error) {
      console.error('Error saving expense:', error);
      alert('Error saving expense: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this record?')) return;
    
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      await refetch();
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Error deleting expense: ' + error.message);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setCustomCategory('');
    setFormData({
      farm_id: farms.length > 0 ? farms[0].id : '',
      date: new Date().toISOString().split('T')[0],
      category: categories.length > 0 ? categories[0].name : 'ADD_NEW',
      description: '',
      party: '',
      amount: '',
      plot_id: '',
      crop_cycle_id: '',
      area_acres: ''
    });
    setIsModalOpen(true);
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
          <h2 className="text-xl font-bold text-text-primary">Expense Ledger</h2>
          <p className="text-sm text-text-muted">Track all business costs and farm inputs.</p>
        </div>
        <Button variant="danger" onClick={openAddModal}>
          <IconPlus size={18} />
          Add Expense
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="agri-card p-5 border-l-4 border-expense">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Expenses</span>
            <IconReceipt2 size={20} className="text-expense" />
          </div>
          <span className="text-lg font-bold text-text-primary">{formatPKR(stats.total)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-blue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Entry Count</span>
            <IconFilter size={20} className="text-accent-blue" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.count} Records</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-amber">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Cost/Acre</span>
            <IconReceipt2 size={20} className="text-accent-amber" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.costPerAcre ? formatPKR(stats.costPerAcre) : '—'}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-amber">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Top Category</span>
            <IconTrendingDown size={20} className="text-accent-amber" />
          </div>
          <span className="text-lg font-bold text-accent-amber">{stats.topCategory}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-expense">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Top Category Amount</span>
            <IconReceipt2 size={20} className="text-expense" />
          </div>
          <span className="text-lg font-bold text-text-primary">{formatPKR(stats.topCategoryAmount)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {categoryTotals.map(([cat, amount], idx) => (
          <div key={idx} className="agri-card p-3 flex flex-col items-center text-center">
            <span className="text-[10px] font-bold text-text-muted uppercase mb-1">{cat}</span>
            <span className="text-[13px] font-bold text-expense">{formatPKR(amount)}</span>
          </div>
        ))}
      </div>

      <div className="agri-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="agri-table-header">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Farm</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Party</th>
                <th className="px-6 py-3 text-right">Amount</th>
                <th className="px-6 py-3 text-right">₨/Acre</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {expenses.length > 0 ? (
                expenses.map((e) => {
                  const farm = farms.find(f => f.id === e.farm_id);
                  return (
                    <tr key={e.id} className="agri-table-row">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="primary">{farm ? farm.name : 'Unknown'}</Badge>
                      </td>
                      <td className="px-6 py-4 font-bold text-text-primary">{e.category}</td>
                      <td className="px-6 py-4 text-text-secondary text-[13px]">{e.description}</td>
                      <td className="px-6 py-4 font-bold">{e.party}</td>
                      <td className="px-6 py-4 text-right font-pkr text-expense">{formatPKR(e.amount)}</td>
                      <td className="px-6 py-4 text-right font-pkr text-text-secondary">
                        {formatPerAcre(e.amount, resolveArea(e, { farmPlots, cropCycles, farms }))}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-1">
                          <button 
                            onClick={() => handleEdit(e)}
                            className="text-primary hover:bg-primary/10 p-2 rounded-full transition-all"
                            title="Edit Expense"
                          >
                            <IconEdit size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(e.id)}
                            className="text-expense hover:bg-expense/10 p-2 rounded-full transition-all"
                            title="Delete Expense"
                          >
                            <IconTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <IconReceipt2 size={48} className="mb-2" />
                      <p className="text-sm font-bold">No expense records found yet.</p>
                      <p className="text-xs">Click "+ Add Expense" to get started.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Expense Entry" : "Add Expense Entry"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Farm</label>
              <select
                name="farm_id"
                value={formData.farm_id}
                onChange={handleInputChange}
                required
                className="agri-input"
              >
                {farms.map(farm => (
                  <option key={farm.id} value={farm.id}>{farm.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleInputChange}
                required
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Plot</label>
              <select name="plot_id" value={formData.plot_id} onChange={handlePlotChange} className="agri-input">
                <option value="">— None —</option>
                {farmPlots.filter(p => p.farm_id === parseInt(formData.farm_id)).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.area_acres} ac)</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Crop Cycle</label>
              <select name="crop_cycle_id" value={formData.crop_cycle_id} onChange={handleCropCycleChange} className="agri-input">
                <option value="">— None —</option>
                {cropCycles.filter(c => c.farm_id === parseInt(formData.farm_id) && (!formData.plot_id || (c.plot_ids && c.plot_ids.includes(parseInt(formData.plot_id))))).map(c => (
                  <option key={c.id} value={c.id}>{c.crop} ({c.area_acres || '?'} ac)</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Area (Acres)</label>
              <input type="number" name="area_acres" value={formData.area_acres} onChange={handleInputChange} step="0.01" placeholder="Auto" className="agri-input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                required
                className="agri-input"
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                <option value="ADD_NEW">Add New...</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Amount (PKR)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
                placeholder="0.00"
                className="agri-input"
              />
            </div>
          </div>

          {formData.category === 'ADD_NEW' && (
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-top-1">
              <label className="text-xs font-bold text-text-muted uppercase">New Category Name</label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
                placeholder="e.g. Water Bill, Repairs"
                className="agri-input"
              />
            </div>
          )}

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-muted uppercase">Paid To (Party)</label>
            <input
              type="text"
              name="party"
              value={formData.party}
              onChange={handleInputChange}
              required
              placeholder="Vendor or Person name"
              className="agri-input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-muted uppercase">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              placeholder="Optional details..."
              className="agri-input min-h-[80px]"
            />
          </div>

          <div className="pt-2 flex gap-3">
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
              variant="danger" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Expense'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Expenses;
