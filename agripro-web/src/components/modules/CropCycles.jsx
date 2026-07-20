import React, { useState, useMemo } from 'react';
import { IconPlus, IconPlant, IconCalendar, IconChartBar, IconTrendingUp, IconTrash, IconReceipt, IconEdit } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';

import { useCropCycles, useFarms, useFarmPlots } from '../../hooks/queries';
import { useFilteredData } from '../../hooks/useFilteredData';
import { toast } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirmDialog';

const CropCycles = () => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const { data: farms = [] } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);

  const { data: rawCropCycles = [], isLoading, refetch } = useCropCycles(farmIds);
  const cropCycles = useFilteredData(rawCropCycles);

  const { data: farmPlots = [] } = useFarmPlots(farmIds);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    farm_id: farms.length > 0 ? farms[0].id : '',
    crop: '',
    variety: '',
    area: '',
    sowing_date: new Date().toISOString().split('T')[0],
    harvest_date: '',
    status: 'Sown',
    exp_yield: '',
    act_yield: '',
    revenue: '',
    note: '',
    area_acres: '',
    plot_ids: [],
    exp_yield_qty: '',
    act_yield_qty: '',
    yield_unit: 'Maund'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (cycle) => {
    setEditingId(cycle.id);
    setFormData({
      farm_id: cycle.farm_id,
      crop: cycle.crop || '',
      variety: cycle.variety || '',
      area: cycle.area || '',
      sowing_date: cycle.sowing_date || '',
      harvest_date: cycle.harvest_date || '',
      status: cycle.status || 'Sown',
      exp_yield: cycle.exp_yield || '',
      act_yield: cycle.act_yield || '',
      revenue: cycle.revenue?.toString() || '',
      note: cycle.note || '',
      area_acres: cycle.area_acres?.toString() || '',
      plot_ids: cycle.plot_ids || (cycle.plot_id ? [cycle.plot_id] : []),
      exp_yield_qty: cycle.exp_yield_qty?.toString() || '',
      act_yield_qty: cycle.act_yield_qty?.toString() || '',
      yield_unit: cycle.yield_unit || 'Maund'
    });
    setIsModalOpen(true);
  };

  const handleHarvest = (cycle) => {
    setEditingId(cycle.id);
    setFormData({
      ...cycle,
      status: 'Harvested',
      harvest_date: new Date().toISOString().split('T')[0],
      revenue: cycle.revenue?.toString() || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('crop_cycles')
          .update({
            ...formData,
            farm_id: parseInt(formData.farm_id),
            sowing_date: formData.sowing_date || null,
            harvest_date: formData.harvest_date || null,
            revenue: formData.revenue ? parseFloat(formData.revenue) : 0,
            area_acres: formData.area_acres ? parseFloat(formData.area_acres) : null,
            plot_ids: formData.plot_ids.length > 0 ? formData.plot_ids : null,
            exp_yield_qty: formData.exp_yield_qty ? parseFloat(formData.exp_yield_qty) : null,
            act_yield_qty: formData.act_yield_qty ? parseFloat(formData.act_yield_qty) : null,
            yield_unit: formData.yield_unit || null
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crop_cycles').insert([{
          ...formData,
          farm_id: parseInt(formData.farm_id),
          sowing_date: formData.sowing_date || null,
          harvest_date: formData.harvest_date || null,
          revenue: formData.revenue ? parseFloat(formData.revenue) : 0,
          area_acres: formData.area_acres ? parseFloat(formData.area_acres) : null,
          plot_ids: formData.plot_ids.length > 0 ? formData.plot_ids : null,
          exp_yield_qty: formData.exp_yield_qty ? parseFloat(formData.exp_yield_qty) : null,
          act_yield_qty: formData.act_yield_qty ? parseFloat(formData.act_yield_qty) : null,
          yield_unit: formData.yield_unit || null
        }]);
        if (error) throw error;
      }
      
      await refetch();
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        farm_id: farms.length > 0 ? farms[0].id : '',
        crop: '',
        variety: '',
        area: '',
        sowing_date: new Date().toISOString().split('T')[0],
        harvest_date: '',
        status: 'Sown',
        exp_yield: '',
        act_yield: '',
        revenue: '',
        note: '',
        area_acres: '',
        plot_ids: [],
        exp_yield_qty: '',
        act_yield_qty: '',
        yield_unit: 'Maund'
      });
    } catch (error) {
      console.error('Error saving crop cycle:', error);
      toast.error('Error saving crop cycle: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      farm_id: farms.length > 0 ? farms[0].id : '',
      crop: '',
      variety: '',
      area: '',
      sowing_date: new Date().toISOString().split('T')[0],
      harvest_date: '',
      status: 'Sown',
      exp_yield: '',
      act_yield: '',
      revenue: '',
      note: '',
      area_acres: '',
      plot_ids: [],
      exp_yield_qty: '',
      act_yield_qty: '',
      yield_unit: 'Maund'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!await confirmDialog('Are you sure you want to delete this crop cycle?')) return;
    try {
      const { error } = await supabase.from('crop_cycles').delete().eq('id', id);
      if (error) throw error;
      await refetch();
    } catch (error) {
      console.error('Error deleting crop cycle:', error);
      toast.error('Error deleting crop cycle: ' + error.message);
    }
  };

  const stats = useMemo(() => {
    const active = cropCycles.filter(c => c.status !== 'Harvested' && c.status !== 'Failed').length;
    const totalRevenue = cropCycles.reduce((sum, c) => sum + (Number(c.revenue) || 0), 0);
    return { active, totalRevenue };
  }, [cropCycles]);

  const avgYieldPerAcre = (() => {
    const harvested = cropCycles.filter(c => c.status === 'Harvested' && c.act_yield_qty && c.area_acres);
    if (harvested.length === 0) return null;
    const total = harvested.reduce((sum, c) => sum + (c.area_acres && parseFloat(c.area_acres) > 0 ? c.act_yield_qty / parseFloat(c.area_acres) : 0), 0);
    return (total / harvested.length).toFixed(1);
  })();

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
          <h2 className="text-xl font-bold text-text-primary">Crop Cycles</h2>
          <p className="text-sm text-text-muted">Manage sowing, harvesting, and crop performance.</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <IconPlus size={18} />
          New Cycle
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="agri-card p-5 border-l-4 border-accent-green">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Active Crops</span>
            <IconPlant size={20} className="text-accent-green" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.active} Cycles</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-blue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Harvest Revenue</span>
            <IconTrendingUp size={20} className="text-accent-blue" />
          </div>
          <span className="text-lg font-bold text-text-primary">{formatPKR(stats.totalRevenue)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-amber">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Avg Yield/Acre</span>
            <IconChartBar size={20} className="text-accent-amber" />
          </div>
          <span className="text-lg font-bold text-text-primary">
            {avgYieldPerAcre !== null ? `${avgYieldPerAcre} / Acre` : 'Varies by Crop'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cropCycles.length > 0 ? (
          cropCycles.map((cycle) => {
            const farm = farms.find(f => f.id === cycle.farm_id);
            const isHarvested = cycle.status === 'Harvested';
            
            return (
              <div key={cycle.id} className="agri-card overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Badge variant={isHarvested ? 'success' : 'primary'}>{cycle.status}</Badge>
                      <h3 className="text-lg font-bold text-text-primary mt-1">{cycle.crop}</h3>
                      <p className="text-xs text-text-muted font-medium">{cycle.variety}</p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleEdit(cycle)}
                        className="text-text-muted hover:text-primary hover:bg-bg-secondary p-2 rounded-full transition-all"
                        title="Edit Cycle"
                      >
                        <IconEdit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDelete(cycle.id)}
                        className="text-text-muted hover:text-expense hover:bg-expense/10 p-2 rounded-full transition-all"
                        title="Delete Cycle"
                      >
                        <IconTrash size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <IconCalendar size={16} className="text-text-muted" />
                      <span className="text-text-secondary">Sown: <span className="text-text-primary font-medium">{formatDate(cycle.sowing_date)}</span></span>
                    </div>
                    {cycle.harvest_date && (
                      <div className="flex items-center gap-3 text-sm">
                        <IconCalendar size={16} className="text-text-muted" />
                        <span className="text-text-secondary">Harvest: <span className="text-text-primary font-medium">{formatDate(cycle.harvest_date)}</span></span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <IconChartBar size={16} className="text-text-muted" />
                      <span className="text-text-secondary">Area: <span className="text-text-primary font-medium">{cycle.area_acres ? `${cycle.area_acres} Acres` : cycle.area}</span></span>
                    </div>
                    {cycle.plot_ids && cycle.plot_ids.length > 0 && (
                      <div className="flex items-start gap-3 text-sm">
                        <IconPlant size={16} className="text-text-muted mt-0.5" />
                        <span className="text-text-secondary">Plots: <span className="text-text-primary font-medium">
                          {cycle.plot_ids.map(id => farmPlots.find(p => p.id === id)?.name || 'Unknown').join(', ')}
                        </span></span>
                      </div>
                    )}
                    {cycle.act_yield_qty && cycle.area_acres && parseFloat(cycle.area_acres) > 0 && (
                      <div className="flex items-center gap-3 text-sm">
                        <IconChartBar size={16} className="text-text-muted" />
                        <span className="text-text-secondary">Yield/Acre: <span className="text-text-primary font-medium">{(cycle.act_yield_qty / parseFloat(cycle.area_acres)).toFixed(1)} {cycle.yield_unit}/Acre</span></span>
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-sm">
                      <IconReceipt size={16} className="text-text-muted" />
                      <span className="text-text-secondary">Revenue: <span className="text-accent-green font-bold">{formatPKR(cycle.revenue)}</span> {cycle.revenue && cycle.area_acres && parseFloat(cycle.area_acres) > 0 ? `(${formatPKR(cycle.revenue / parseFloat(cycle.area_acres))}/ac)` : ''}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-bg-secondary px-5 py-3 border-t border-border-light flex justify-between items-center">
                  <span className="text-xs font-bold text-text-muted uppercase">{farm?.name || 'Unknown Farm'}</span>
                  {!isHarvested ? (
                    <button 
                      onClick={() => handleHarvest(cycle)}
                      className="text-[11px] font-bold text-primary px-3 py-1 hover:bg-primary/10 rounded transition-colors"
                    >
                      RECORD HARVEST
                    </button>
                  ) : (
                    cycle.act_yield && (
                      <span className="text-xs font-bold text-accent-blue">{cycle.act_yield}</span>
                    )
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 agri-card flex flex-col items-center justify-center opacity-40">
            <IconPlant size={64} className="mb-4" />
            <p className="text-lg font-bold">No crop cycles found</p>
            <p className="text-sm">Click "+ New Cycle" to start tracking a crop.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? (formData.status === 'Harvested' ? "Record Harvest" : "Edit Crop Cycle") : "Create New Crop Cycle"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Farm</label>
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
              <label className="agri-label">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="agri-input"
              >
                <option value="Sown">Sown</option>
                <option value="Growing">Growing</option>
                <option value="Maturity">Maturity</option>
                <option value="Harvested">Harvested</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Crop Name</label>
              <input
                type="text"
                name="crop"
                value={formData.crop}
                onChange={handleInputChange}
                required
                placeholder="e.g. Wheat, Cotton"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Variety</label>
              <input
                type="text"
                name="variety"
                value={formData.variety}
                onChange={handleInputChange}
                placeholder="e.g. Faisalabad-08"
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label flex justify-between">
                <span>Select Plots</span>
                {formData.plot_ids.length > 0 && <span className="text-xs text-primary font-bold">{formData.plot_ids.length} selected</span>}
              </label>
              <div className="border border-border rounded-lg p-2 h-[100px] overflow-y-auto bg-white/50 flex flex-col gap-1 shadow-inner">
                {farmPlots.filter(p => p.farm_id === parseInt(formData.farm_id)).length === 0 ? (
                  <span className="text-xs text-text-muted italic p-2 flex items-center justify-center h-full">No plots available for this farm</span>
                ) : (
                  farmPlots.filter(p => p.farm_id === parseInt(formData.farm_id)).map(p => {
                    const isSelected = formData.plot_ids.includes(p.id);
                    return (
                      <label key={p.id} className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors border ${isSelected ? 'bg-primary/5 border-primary/20' : 'hover:bg-bg-secondary border-transparent'}`}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                          checked={isSelected}
                          onChange={(e) => {
                            const newSelected = e.target.checked 
                              ? [...formData.plot_ids, p.id]
                              : formData.plot_ids.filter(id => id !== p.id);
                            
                            const selectedPlots = farmPlots.filter(plot => newSelected.includes(plot.id));
                            const totalAcres = selectedPlots.reduce((sum, plot) => sum + (parseFloat(plot.area_acres) || 0), 0);
                            
                            setFormData(prev => ({
                              ...prev,
                              plot_ids: newSelected,
                              area_acres: totalAcres > 0 ? (Math.round(totalAcres * 100) / 100).toString() : prev.area_acres
                            }));
                          }}
                        />
                        <span className={`text-sm select-none flex-1 flex justify-between items-center ${isSelected ? 'text-primary font-bold' : 'text-text-secondary font-medium'}`}>
                          {p.name}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-primary/10 text-primary' : 'bg-border-light text-text-muted'}`}>
                            {p.area_acres} ac
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Sowing Date</label>
              <input
                type="date"
                name="sowing_date"
                value={formData.sowing_date}
                onChange={handleInputChange}
                required
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Area (Text)</label>
              <input
                type="text"
                name="area"
                value={formData.area}
                onChange={handleInputChange}
                placeholder="e.g. 5 Acres"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Area (Acres)</label>
              <input
                type="number"
                name="area_acres"
                value={formData.area_acres}
                onChange={handleInputChange}
                step="0.01"
                placeholder="Auto"
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Expected Yield (Text)</label>
              <input
                type="text"
                name="exp_yield"
                value={formData.exp_yield}
                onChange={handleInputChange}
                placeholder="e.g. 40 Maunds"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Actual Yield (Text)</label>
              <input
                type="text"
                name="act_yield"
                value={formData.act_yield}
                onChange={handleInputChange}
                placeholder="e.g. 42 Maunds"
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Expected Yield Qty</label>
              <div className="flex gap-2">
                <input type="number" name="exp_yield_qty" value={formData.exp_yield_qty} onChange={handleInputChange} step="0.01" className="agri-input flex-1" />
                <select name="yield_unit" value={formData.yield_unit} onChange={handleInputChange} className="agri-input w-28">
                  <option value="Maund">Maund</option>
                  <option value="Kg">Kg</option>
                  <option value="Ton">Ton</option>
                  <option value="Mann">Mann</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Actual Yield Qty</label>
              <div className="flex gap-2">
                <input type="number" name="act_yield_qty" value={formData.act_yield_qty} onChange={handleInputChange} step="0.01" className="agri-input flex-1" />
                <select name="yield_unit" value={formData.yield_unit} onChange={handleInputChange} className="agri-input w-28">
                  <option value="Maund">Maund</option>
                  <option value="Kg">Kg</option>
                  <option value="Ton">Ton</option>
                  <option value="Mann">Mann</option>
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Harvest Date (Est/Act)</label>
              <input
                type="date"
                name="harvest_date"
                value={formData.harvest_date}
                onChange={handleInputChange}
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Total Revenue (PKR)</label>
              <input
                type="number"
                name="revenue"
                value={formData.revenue}
                onChange={handleInputChange}
                placeholder="0.00"
                className="agri-input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="agri-label">Notes</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              placeholder="Any additional details..."
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
              variant="primary" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Cycle'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CropCycles;

