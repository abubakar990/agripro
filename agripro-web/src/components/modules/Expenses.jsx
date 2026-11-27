import { useMemo, useState, useEffect } from 'react';
import { IconPlus, IconReceipt2, IconTrendingDown, IconFilter, IconTrash, IconEdit } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';
import { useExpenses, useFarms, useCategories, useFarmPlots, useCropCycles } from '../../hooks/queries';
import { useFilteredData } from '../../hooks/useFilteredData';
import { useGlobalStore } from '../../store/globalStore';
import { resolveArea, totalArea as calcTotalArea, formatPerAcre } from '../../utils/perAcreCalc';
import { toast } from '../../utils/toast';
import QuantityRateFields from '../shared/QuantityRateFields';
import FolioInput from '../shared/FolioInput';
import { parseFolio } from '../../utils/roznamcha';
import { summarizeByItem, itemSuggestions, formatQty } from '../../utils/quantity';
import { confirmDialog } from '../../utils/confirmDialog';

const Expenses = ({ user }) => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const farmFilter = useGlobalStore(state => state.farmFilter);
  const { data: farms = [] } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);
  
  const { data: rawExpenses = [], isLoading, refetch } = useExpenses(farmIds);
  const expenses = useFilteredData(rawExpenses);
  
  const { data: allCategories = [] } = useCategories(currentOrgId);
  const expenseCategories = allCategories.filter(c => c.module === 'expense');
  // Top-level khatas only; sub-khatas (parent_id set) are picked in a second dropdown.
  const categories = expenseCategories.filter(c => !c.parent_id);
  const subCategoriesOf = (categoryName) => {
    const parent = categories.find(c => c.name === categoryName);
    return parent ? expenseCategories.filter(c => c.parent_id === parent.id) : [];
  };
  
  const { data: farmPlots = [] } = useFarmPlots(farmIds);
  const { data: cropCycles = [] } = useCropCycles(farmIds);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [customCategory, setCustomCategory] = useState('');
  const [customSubCategory, setCustomSubCategory] = useState('');

  const getInitialFarmId = () => {
    if (farmFilter !== 'all' && farms.some(f => String(f.id) === String(farmFilter))) {
      return Number(farmFilter);
    }
    return farms[0]?.id || '';
  };

  const [formData, setFormData] = useState({
    farm_id: getInitialFarmId(),
    date: new Date().toISOString().split('T')[0],
    category: categories.length > 0 ? categories[0].name : 'ADD_NEW',
    description: '',
    party: '',
    amount: '',
    plot_id: '',
    crop_cycle_id: '',
    area_acres: '',
    item_name: '',
    quantity: '',
    unit: '',
    unit_price: '',
    note: '',
    folio: '',
    sub_category: '',
    is_capital: false
  });

  // Sync default farm_id when farms finish loading
  useEffect(() => {
    if (farms.length > 0 && !formData.farm_id) {
      setFormData(prev => ({
        ...prev,
        farm_id: getInitialFarmId()
      }));
    }
  }, [farms, farmFilter]);

  // Capital purchases (fixed assets) are listed but kept out of expense totals, per accrual accounting.
  const operatingExpenses = useMemo(() => expenses.filter(e => !e.is_capital), [expenses]);
  const capitalTotal = useMemo(
    () => expenses.filter(e => e.is_capital).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0),
    [expenses]
  );

  const stats = useMemo(() => {
    const context = { farmPlots, cropCycles, farms };
    const total = operatingExpenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
    const count = operatingExpenses.length;
    const totalArea = calcTotalArea(operatingExpenses, context) || 0;
    const costPerAcre = totalArea > 0 ? total / totalArea : null;
    const catSum = operatingExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + (parseFloat(e.amount) || 0);
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
  }, [operatingExpenses, farmPlots, cropCycles, farms]);

  const categoryTotals = useMemo(() => {
    const totals = {};
    for (const e of operatingExpenses) {
      const amt = parseFloat(e.amount) || 0;
      const t = (totals[e.category] ||= { amount: 0, subs: {} });
      t.amount += amt;
      if (e.sub_category) t.subs[e.sub_category] = (t.subs[e.sub_category] || 0) + amt;
    }
    return Object.entries(totals)
      .map(([cat, t]) => [cat, t.amount, Object.entries(t.subs).sort((a, b) => b[1] - a[1])])
      .sort((a, b) => b[1] - a[1]);
  }, [operatingExpenses]);

  // Quantity totals per item + unit, e.g. "Urea: 25 bag" for the current filters.
  const itemSummary = useMemo(() => summarizeByItem(expenses), [expenses]);
  const knownItems = useMemo(() => itemSuggestions(rawExpenses), [rawExpenses]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // A sub-khata belongs to one khata, so changing the khata clears it.
      ...(name === 'category' ? { sub_category: '' } : {})
    }));
    if (name === 'category') setCustomSubCategory('');
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
      area_acres: e.area_acres?.toString() || '',
      item_name: e.item_name || '',
      quantity: e.quantity != null ? String(Number(e.quantity)) : '',
      unit: e.unit || '',
      unit_price: e.unit_price != null ? String(Number(e.unit_price)) : '',
      note: e.note || '',
      folio: e.folio ? String(e.folio) : '',
      sub_category: !e.sub_category ? ''
        : subCategoriesOf(e.category).some(c => c.name === e.sub_category) ? e.sub_category : 'ADD_NEW_SUB',
      is_capital: !!e.is_capital
    });
    setCustomSubCategory(
      e.sub_category && !subCategoriesOf(e.category).some(c => c.name === e.sub_category) ? e.sub_category : ''
    );
    
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
      const targetFarmId = formData.farm_id 
        ? parseInt(formData.farm_id) 
        : (farms.length > 0 ? farms[0].id : null);

      if (!targetFarmId || isNaN(targetFarmId)) {
        toast.error('Please select a valid farm. Create a farm first if none exist.');
        setIsSubmitting(false);
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('Please enter a valid amount.');
        setIsSubmitting(false);
        return;
      }

      if (formData.category === 'ADD_NEW') {
        const { error: catError } = await supabase
          .from('categories')
          .insert([{
            name: customCategory,
            module: 'expense',
            user_id: user?.id,
            org_id: currentOrgId
          }]);
        
        if (catError && catError.code !== '23505') throw catError; // Ignore unique constraint violation
        finalCategory = customCategory;
      }

      let finalSubCategory = formData.sub_category || null;
      if (formData.sub_category === 'ADD_NEW_SUB') {
        const parent = categories.find(c => c.name === finalCategory);
        finalSubCategory = customSubCategory.trim();
        if (!parent || !finalSubCategory) {
          toast.error('Please enter a sub-khata name.');
          setIsSubmitting(false);
          return;
        }
        const { error: subError } = await supabase
          .from('categories')
          .insert([{
            name: finalSubCategory,
            module: 'expense',
            parent_id: parent.id,
            user_id: user?.id,
            org_id: currentOrgId
          }]);
        if (subError && subError.code !== '23505') throw subError; // already exists: just use it
      }

      const payload = {
        ...formData,
        category: finalCategory,
        sub_category: formData.category === 'ADD_NEW' ? null : finalSubCategory,
        is_capital: !!formData.is_capital,
        amount: amount,
        farm_id: targetFarmId,
        plot_id: formData.plot_id ? parseInt(formData.plot_id) : null,
        crop_cycle_id: formData.crop_cycle_id ? parseInt(formData.crop_cycle_id) : null,
        area_acres: formData.area_acres ? parseFloat(formData.area_acres) : null,
        item_name: formData.item_name?.trim() || null,
        quantity: formData.quantity !== '' && !isNaN(parseFloat(formData.quantity)) ? parseFloat(formData.quantity) : null,
        unit: formData.unit?.trim() || null,
        unit_price: formData.unit_price !== '' && !isNaN(parseFloat(formData.unit_price)) ? parseFloat(formData.unit_price) : null,
        note: formData.note?.trim() || null,
        folio: parseFolio(formData.folio)
      };

      if (user?.id) {
        payload.user_id = user.id;
      }
      
      if (editingId) {
        const { error } = await supabase
          .from('expenses')
          .update(payload)
          .eq('id', editingId);
        if (error) throw error;
        toast.success('Expense updated successfully');
      } else {
        const { error } = await supabase.from('expenses').insert([payload]);
        if (error) throw error;
        toast.success('Expense recorded successfully');
      }
      
      await refetch();
      setIsModalOpen(false);
      setEditingId(null);
      setCustomCategory('');
      openAddModal();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Error saving expense: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await confirmDialog('Are you sure you want to delete this record?')) return;
    
    try {
      const { error } = await supabase.from('expenses').delete().eq('id', id);
      if (error) throw error;
      toast.success('Expense deleted');
      await refetch();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Error deleting expense: ' + error.message);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setCustomCategory('');
    setFormData({
      farm_id: getInitialFarmId(),
      date: new Date().toISOString().split('T')[0],
      category: categories.length > 0 ? categories[0].name : 'ADD_NEW',
      description: '',
      party: '',
      amount: '',
      plot_id: '',
      crop_cycle_id: '',
      area_acres: '',
      item_name: '',
      quantity: '',
      unit: '',
      unit_price: '',
      note: '',
      folio: '',
      sub_category: '',
      is_capital: false
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
          {capitalTotal > 0 && (
            <span className="block text-[10px] text-text-muted mt-1">+ {formatPKR(capitalTotal)} capital purchases (assets, not in total)</span>
          )}
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
        {categoryTotals.map(([cat, amount, subs]) => (
          <div key={cat} className="agri-card p-3 flex flex-col items-center text-center">
            <span className="text-[10px] font-bold text-text-muted uppercase mb-1">{cat}</span>
            <span className="text-[13px] font-bold text-expense">{formatPKR(amount)}</span>
            {subs.length > 0 && (
              <div className="mt-2 w-full space-y-0.5 border-t border-border pt-2">
                {subs.map(([sub, subAmount]) => (
                  <div key={sub} className="flex justify-between gap-2 text-[10px]">
                    <span className="text-text-muted truncate">{sub}</span>
                    <span className="font-bold text-text-secondary whitespace-nowrap">{formatPKR(subAmount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {itemSummary.length > 0 && (
        <div className="agri-card overflow-hidden">
          <div className="px-6 py-3 border-b border-border">
            <h3 className="text-sm font-bold text-text-primary">Quantity Purchased by Item</h3>
            <p className="text-[11px] text-text-muted">Only entries with an item name and quantity are counted. Follows the current farm and date filters.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="agri-table-header">
                  <th className="px-6 py-2">Item</th>
                  <th className="px-6 py-2 text-right">Total Quantity</th>
                  <th className="px-6 py-2 text-right">Avg Rate</th>
                  <th className="px-6 py-2 text-right">Total Amount</th>
                  <th className="px-6 py-2 text-right">Entries</th>
                </tr>
              </thead>
              <tbody>
                {itemSummary.map(g => (
                  <tr key={g.key} className="agri-table-row">
                    <td className="px-6 py-2 font-bold text-text-primary">{g.item}</td>
                    <td className="px-6 py-2 text-right font-bold">{formatQty(g.quantity)} {g.unit}</td>
                    <td className="px-6 py-2 text-right font-pkr text-text-secondary">{formatPKR(g.avgRate)}{g.unit ? ` / ${g.unit}` : ''}</td>
                    <td className="px-6 py-2 text-right font-pkr text-expense">{formatPKR(g.amount)}</td>
                    <td className="px-6 py-2 text-right text-text-muted">{g.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="agri-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="agri-table-header">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Farm</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Item / Qty</th>
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
                      <td className="px-6 py-4 font-bold text-text-primary">
                        {e.category}
                        {e.sub_category && <div className="text-[11px] font-medium text-text-muted">› {e.sub_category}</div>}
                        {e.is_capital && <div className="mt-1"><Badge variant="primary">CAPITAL / ASSET</Badge></div>}
                      </td>
                      <td className="px-6 py-4 text-text-secondary text-[13px]">{e.description}</td>
                      <td className="px-6 py-4 text-[13px] whitespace-nowrap">
                        {e.item_name && <div className="font-bold text-text-primary">{e.item_name}</div>}
                        {e.quantity != null && (
                          <div className="text-text-muted">
                            {formatQty(e.quantity)} {e.unit || ''}
                            {e.unit_price != null && <> @ {formatPKR(e.unit_price)}</>}
                          </div>
                        )}
                        {!e.item_name && e.quantity == null && <span className="text-text-muted">—</span>}
                      </td>
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
                  <td colSpan="9" className="px-6 py-12 text-center">
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
                value={formData.farm_id || (farms[0]?.id ?? '')}
                onChange={handleInputChange}
                required
                className="agri-input"
              >
                {farms.length === 0 ? (
                  <option value="">No farms available</option>
                ) : (
                  farms.map(farm => (
                    <option key={farm.id} value={farm.id}>{farm.name}</option>
                  ))
                )}
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
              <input
                type="number"
                step="0.01"
                name="area_acres"
                value={formData.area_acres}
                onChange={handleInputChange}
                placeholder="Auto or override"
                className="agri-input"
              />
            </div>
          </div>

          <FolioInput value={formData.folio} onChange={(v) => setFormData(prev => ({ ...prev, folio: v }))} />

          <QuantityRateFields
            formData={formData}
            setFormData={setFormData}
            suggestions={knownItems}
            itemPlaceholder="e.g. Urea, DAP, Diesel"
          />

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
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
                <option value="ADD_NEW">+ Add New Category</option>
              </select>
            </div>
            {formData.category === 'ADD_NEW' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text-muted uppercase">New Category Name</label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="e.g. Bio-fertilizer"
                  required
                  className="agri-input"
                />
              </div>
            )}
            {formData.category !== 'ADD_NEW' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text-muted uppercase">Sub-Khata</label>
                <select
                  name="sub_category"
                  value={formData.sub_category}
                  onChange={handleInputChange}
                  className="agri-input"
                >
                  <option value="">— None —</option>
                  {subCategoriesOf(formData.category).map(c => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="ADD_NEW_SUB">+ Add New Sub-Khata</option>
                </select>
              </div>
            )}
            {formData.sub_category === 'ADD_NEW_SUB' && (
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-text-muted uppercase">New Sub-Khata Name</label>
                <input
                  type="text"
                  value={customSubCategory}
                  onChange={(e) => setCustomSubCategory(e.target.value)}
                  placeholder="e.g. Bijli, Gas"
                  required
                  className="agri-input"
                />
              </div>
            )}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Amount (PKR)</label>
              <input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                required
                min="0"
                placeholder="0.00"
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Party / Vendor</label>
              <input
                type="text"
                name="party"
                value={formData.party}
                onChange={handleInputChange}
                placeholder="e.g. Local Mandi, Vendor Name"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Description</label>
              <input
                type="text"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Brief note about the expense"
                className="agri-input"
              />
            </div>
          </div>

          <label className="flex items-start gap-2 rounded-lg border border-border p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={!!formData.is_capital}
              onChange={(ev) => setFormData(prev => ({ ...prev, is_capital: ev.target.checked }))}
              className="mt-0.5"
            />
            <span className="text-xs">
              <span className="font-bold text-text-primary">Capital purchase (fixed asset)</span>
              <span className="block text-text-muted">For things that last years, like solar, a tube well or a tractor. Reduces cash but is not counted in expenses or profit. Also add the asset under Machinery so it shows in Assets.</span>
            </span>
          </label>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-muted uppercase">Notes</label>
            <textarea
              name="note"
              value={formData.note || ''}
              onChange={handleInputChange}
              placeholder="Optional details..."
              className="agri-input min-h-[80px]"
            />
          </div>

          {farms.length === 0 && (
            <p className="text-xs text-error font-medium">
              Please add at least one farm before recording an expense.
            </p>
          )}

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
              disabled={isSubmitting || farms.length === 0}
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
