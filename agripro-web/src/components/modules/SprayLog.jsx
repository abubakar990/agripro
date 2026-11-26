import { useState, useMemo, useEffect } from 'react';
import { IconPlus, IconFlask, IconReceipt, IconTrash } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';
import { useSprayLog, useFarms, useFarmPlots, useCropCycles } from '../../hooks/queries';
import { useFilteredData } from '../../hooks/useFilteredData';
import { useGlobalStore } from '../../store/globalStore';
import { resolveArea, totalArea as calcTotalArea, formatPerAcre } from '../../utils/perAcreCalc';
import { toast } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirmDialog';

const SprayLog = () => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const farmFilter = useGlobalStore(state => state.farmFilter);
  const { data: farms = [] } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);

  const { data: rawSprayLog = [], isLoading, refetch } = useSprayLog(farmIds);
  const sprayLog = useFilteredData(rawSprayLog);

  const { data: farmPlots = [] } = useFarmPlots(farmIds);
  const { data: cropCycles = [] } = useCropCycles(farmIds);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const getInitialFarmId = () => {
    if (farmFilter !== 'all' && farms.some(f => String(f.id) === String(farmFilter))) {
      return Number(farmFilter);
    }
    return farms[0]?.id || '';
  };

  const [formData, setFormData] = useState({
    farm_id: getInitialFarmId(),
    date: new Date().toISOString().split('T')[0],
    field: '',
    chemical: '',
    qty: '',
    qty_value: '',
    qty_unit: 'Litres',
    crop: '',
    purpose: 'Pesticide',
    cost: '',
    plot_id: '',
    crop_cycle_id: '',
    area_acres: ''
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

  const openAddModal = () => {
    setFormData({
      farm_id: getInitialFarmId(),
      date: new Date().toISOString().split('T')[0],
      field: '',
      chemical: '',
      qty: '',
      qty_value: '',
      qty_unit: 'Litres',
      crop: '',
      purpose: 'Pesticide',
      cost: '',
      plot_id: '',
      crop_cycle_id: '',
      area_acres: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const targetFarmId = formData.farm_id 
        ? parseInt(formData.farm_id) 
        : (farms.length > 0 ? farms[0].id : null);

      if (!targetFarmId || isNaN(targetFarmId)) {
        toast.error('Please select a valid farm. Create a farm first if none exist.');
        setIsSubmitting(false);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      const payload = {
        ...formData,
        farm_id: targetFarmId,
        cost: parseFloat(formData.cost) || 0,
        plot_id: formData.plot_id ? parseInt(formData.plot_id) : null,
        crop_cycle_id: formData.crop_cycle_id ? parseInt(formData.crop_cycle_id) : null,
        area_acres: formData.area_acres ? parseFloat(formData.area_acres) : null,
        qty_value: formData.qty_value ? parseFloat(formData.qty_value) : null,
        qty_unit: formData.qty_unit || null
      };

      if (currentUserId) {
        payload.user_id = currentUserId;
      }

      const { error } = await supabase.from('spray_log').insert([payload]);
      
      if (error) throw error;
      
      toast.success('Spray log entry added successfully');
      await refetch();
      setIsModalOpen(false);
      openAddModal();
    } catch (error) {
      console.error('Error adding spray log:', error);
      toast.error('Error adding spray log: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await confirmDialog('Are you sure you want to delete this log?')) return;
    try {
      const { error } = await supabase.from('spray_log').delete().eq('id', id);
      if (error) throw error;
      toast.success('Spray log entry deleted');
      await refetch();
    } catch (error) {
      console.error('Error deleting spray log:', error);
      toast.error('Error deleting spray log: ' + error.message);
    }
  };

  const stats = useMemo(() => {
    const context = { farmPlots, cropCycles, farms };
    const totalCost = sprayLog.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
    const sprayCount = sprayLog.length;
    const totalArea = calcTotalArea(sprayLog, context) || 0;
    const costPerAcre = totalArea > 0 ? totalCost / totalArea : null;
    return { totalCost, sprayCount, costPerAcre };
  }, [sprayLog, farmPlots, cropCycles, farms]);

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
          <h2 className="text-xl font-bold text-text-primary">Spray Log</h2>
          <p className="text-sm text-text-muted">Monitor chemical applications and pest control.</p>
        </div>
        <Button variant="danger" onClick={openAddModal}>
          <IconPlus size={18} />
          New Spray Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="agri-card p-5 border-l-4 border-accent-amber">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Applications</span>
            <IconFlask size={20} className="text-accent-amber" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.sprayCount} Times</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-expense">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Spray Cost</span>
            <IconReceipt size={20} className="text-expense" />
          </div>
          <span className="text-lg font-bold text-text-primary">{formatPKR(stats.totalCost)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-blue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Cost/Acre</span>
            <IconReceipt size={20} className="text-accent-blue" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.costPerAcre ? formatPKR(stats.costPerAcre) : '—'}</span>
        </div>
      </div>

      <div className="agri-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="agri-table-header">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Farm/Field</th>
                <th className="px-6 py-3">Crop</th>
                <th className="px-6 py-3">Chemical/Purpose</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3 text-right">Cost</th>
                <th className="px-6 py-3 text-right">₨/Acre</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {sprayLog.length > 0 ? (
                sprayLog.map((log) => {
                  const farm = farms.find(f => f.id === log.farm_id);
                  return (
                    <tr key={log.id} className="agri-table-row">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(log.date)}</td>
                      <td className="px-6 py-4">
                        <Badge variant="primary">{farm?.name || 'Unknown'}</Badge>
                        <div className="text-xs text-text-muted mt-1">{log.field}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-text-primary">{log.crop}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-text-primary">{log.chemical}</div>
                        <div className="text-[10px] uppercase font-bold text-accent-blue">{log.purpose}</div>
                      </td>
                      <td className="px-6 py-4">
                        {log.qty_value ? `${log.qty_value} ${log.qty_unit || ''}` : log.qty}
                      </td>
                      <td className="px-6 py-4 text-right font-pkr text-expense">{formatPKR(log.cost)}</td>
                      <td className="px-6 py-4 text-right font-pkr text-text-secondary">
                        {formatPerAcre(log.cost, resolveArea(log, { farmPlots, cropCycles, farms }))}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => handleDelete(log.id)}
                          className="text-text-muted hover:text-expense hover:bg-expense/10 p-2 rounded-full transition-all"
                          title="Delete Log"
                        >
                          <IconTrash size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex flex-col items-center opacity-40">
                      <IconFlask size={48} className="mb-2" />
                      <p className="text-sm font-bold">No spray records found.</p>
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
        title="Add Spray Log Entry"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Farm</label>
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
              <label className="agri-label">Date</label>
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
              <label className="agri-label">Plot</label>
              <select name="plot_id" value={formData.plot_id} onChange={handlePlotChange} className="agri-input">
                <option value="">— None —</option>
                {farmPlots.filter(p => p.farm_id === parseInt(formData.farm_id)).map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.area_acres} ac)</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Crop Cycle</label>
              <select name="crop_cycle_id" value={formData.crop_cycle_id} onChange={handleCropCycleChange} className="agri-input">
                <option value="">— None —</option>
                {cropCycles.filter(c => c.farm_id === parseInt(formData.farm_id) && (!formData.plot_id || (c.plot_ids && c.plot_ids.includes(parseInt(formData.plot_id))))).map(c => (
                  <option key={c.id} value={c.id}>{c.crop} ({c.area_acres || '?'} ac)</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Area (Acres)</label>
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Field / Location Description</label>
              <input
                type="text"
                name="field"
                value={formData.field}
                onChange={handleInputChange}
                required
                placeholder="e.g. North Plot #3"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Crop Name</label>
              <input
                type="text"
                name="crop"
                value={formData.crop}
                onChange={handleInputChange}
                required
                placeholder="e.g. Cotton, Wheat"
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Chemical Name / Brand</label>
              <input
                type="text"
                name="chemical"
                value={formData.chemical}
                onChange={handleInputChange}
                required
                placeholder="e.g. Tracer, Belt, Urea"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Purpose / Target</label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                className="agri-input"
              >
                <option value="Pesticide">Pesticide</option>
                <option value="Fertilizer">Fertilizer (Foliar)</option>
                <option value="Herbicide">Herbicide</option>
                <option value="Fungicide">Fungicide</option>
                <option value="Nutrient Spray">Nutrient Spray</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Quantity Applied</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  name="qty_value"
                  value={formData.qty_value}
                  onChange={handleInputChange}
                  placeholder="e.g. 2.5"
                  className="agri-input"
                />
                <select
                  name="qty_unit"
                  value={formData.qty_unit}
                  onChange={handleInputChange}
                  className="agri-input"
                >
                  <option value="Litres">Litres</option>
                  <option value="ml">ml</option>
                  <option value="KG">KG</option>
                  <option value="grams">grams</option>
                </select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Total Cost (PKR)</label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                min="0"
                placeholder="0.00"
                className="agri-input"
              />
            </div>
          </div>

          {farms.length === 0 && (
            <p className="text-xs text-error font-medium">
              Please add at least one farm before recording a spray log entry.
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
              {isSubmitting ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default SprayLog;
