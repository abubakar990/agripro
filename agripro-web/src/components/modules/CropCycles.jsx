import React, { useState, useMemo } from 'react';
import { IconPlus, IconPlant, IconCalendar, IconChartBar, IconTrendingUp, IconTrash, IconReceipt, IconEdit } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';

const CropCycles = ({ cropCycles = [], farms = [] }) => {
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
    note: ''
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
      note: cycle.note || ''
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
            revenue: formData.revenue ? parseFloat(formData.revenue) : 0
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('crop_cycles').insert([{
          ...formData,
          farm_id: parseInt(formData.farm_id),
          revenue: formData.revenue ? parseFloat(formData.revenue) : 0
        }]);
        if (error) throw error;
      }
      
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
        note: ''
      });
    } catch (error) {
      console.error('Error saving crop cycle:', error);
      alert('Error saving crop cycle: ' + error.message);
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
      note: ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this crop cycle?')) return;
    try {
      const { error } = await supabase.from('crop_cycles').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting crop cycle:', error);
      alert('Error deleting crop cycle: ' + error.message);
    }
  };

  const stats = useMemo(() => {
    const active = cropCycles.filter(c => c.status !== 'Harvested' && c.status !== 'Failed').length;
    const totalRevenue = cropCycles.reduce((sum, c) => sum + (Number(c.revenue) || 0), 0);
    return { active, totalRevenue };
  }, [cropCycles]);

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
          <span className="text-lg font-bold text-text-primary">Varies by Crop</span>
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
                      <span className="text-text-secondary">Area: <span className="text-text-primary font-medium">{cycle.area}</span></span>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <IconReceipt size={16} className="text-text-muted" />
                      <span className="text-text-secondary">Revenue: <span className="text-accent-green font-bold">{formatPKR(cycle.revenue)}</span></span>
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
              <label className="agri-label">Area (Acres/Kanals)</label>
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
              <label className="agri-label">Expected Yield</label>
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
              <label className="agri-label">Harvest Date (Est/Act)</label>
              <input
                type="date"
                name="harvest_date"
                value={formData.harvest_date}
                onChange={handleInputChange}
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Actual Yield</label>
              <input
                type="text"
                name="act_yield"
                value={formData.act_yield}
                onChange={handleInputChange}
                placeholder="e.g. 42 Maunds"
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

