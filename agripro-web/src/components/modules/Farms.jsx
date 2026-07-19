import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconBuildingCommunity, IconMapPin, IconMaximize, IconUser, IconTrash, IconEdit, IconMap, IconLayersIntersect } from '@tabler/icons-react';
import { formatPKR } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';

const Farms = ({ farms, currentOrg, farmPlots = [] }) => {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingFarm, setEditingFarm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    location: '',
    area: '',
    area_acres: '',
    ownership: 'Owned',
    land_value: '',
    status: 'Active'
  });

  const stats = useMemo(() => {
    const totalArea = farms.length;
    const totalAcres = farms.reduce((sum, f) => sum + (parseFloat(f.area_acres) || 0), 0);
    const totalValue = farms.reduce((sum, f) => sum + (parseFloat(f.land_value) || 0), 0);
    const activeFarms = farms.filter(f => f.status === 'Active').length;
    
    return {
      totalArea,
      totalAcres,
      totalValue,
      activeFarms
    };
  }, [farms]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (farm) => {
    setEditingFarm(farm);
    setFormData({
      name: farm.name,
      location: farm.location,
      area: farm.area,
      area_acres: farm.area_acres || '',
      ownership: farm.ownership,
      land_value: farm.land_value,
      status: farm.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingFarm) {
        const { error } = await supabase
          .from('farms')
          .update({
            ...formData,
            area_acres: parseFloat(formData.area_acres) || null,
            land_value: parseFloat(formData.land_value) || 0
          })
          .eq('id', editingFarm.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('farms').insert([{
          ...formData,
          org_id: currentOrg?.id,
          area_acres: parseFloat(formData.area_acres) || null,
          land_value: parseFloat(formData.land_value) || 0
        }]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setEditingFarm(null);
      setFormData({
        name: '',
        location: '',
        area: '',
        area_acres: '',
        ownership: 'Owned',
        land_value: '',
        status: 'Active'
      });
    } catch (error) {
      console.error('Error saving farm:', error);
      alert('Error saving farm: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this farm? This may affect records linked to it.')) return;
    
    try {
      const { error } = await supabase.from('farms').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting farm:', error);
      alert('Error deleting farm: ' + error.message);
    }
  };

  const openAddModal = () => {
    // SaaS Limit: Free tier can only manage 1 farm
    if (currentOrg?.subscription_tier !== 'pro' && farms.length >= 1) {
      alert('Your organization is on the Free Tier which is limited to 1 farm. Please upgrade to the Pro Plan to manage unlimited farms!');
      window.location.hash = '/billing'; // Or use navigate if available, but hash works with some routers
      return;
    }

    setEditingFarm(null);
    setFormData({
      name: '',
      location: '',
      area: '',
      area_acres: '',
      ownership: 'Owned',
      land_value: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Farm Management</h2>
          <p className="text-sm text-text-muted">Manage your land assets and farm locations.</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <IconPlus size={18} />
          Add Farm
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="agri-card p-5 border-l-4 border-primary">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Farms</span>
            <IconBuildingCommunity size={20} className="text-primary" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.totalArea} Units</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-green">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Acres</span>
            <IconLayersIntersect size={20} className="text-accent-green" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.totalAcres.toFixed(2)} Acres</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-revenue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Land Value</span>
            <IconMaximize size={20} className="text-revenue" />
          </div>
          <span className="text-lg font-bold text-revenue">{formatPKR(stats.totalValue)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-blue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Active Status</span>
            <IconMapPin size={20} className="text-accent-blue" />
          </div>
          <span className="text-lg font-bold text-accent-blue">{stats.activeFarms} Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {farms.length > 0 ? (
          farms.map((farm) => (
            <div key={farm.id} className="agri-card overflow-hidden flex flex-col">
              <div className="p-5 flex-1">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Badge variant={farm.status === 'Active' ? 'success' : 'warning'}>{farm.status}</Badge>
                    <h3 className="text-lg font-bold text-text-primary mt-1">{farm.name}</h3>
                    <p className="text-xs text-text-muted font-medium flex items-center gap-1">
                      <IconMapPin size={12} /> {farm.location}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => navigate(`/farm-map/${farm.id}`)}
                      className="text-text-muted hover:text-accent-blue transition-colors"
                      title="View Farm Map"
                    >
                      <IconMap size={18} />
                    </button>
                    <button 
                      onClick={() => handleEdit(farm)}
                      className="text-text-muted hover:text-primary transition-colors"
                    >
                      <IconEdit size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(farm.id)}
                      className="text-text-muted hover:text-expense transition-colors"
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <IconMaximize size={16} className="text-text-muted" />
                    <span className="text-text-secondary">Area: <span className="text-text-primary font-medium">{farm.area_acres ? `${farm.area_acres} Acres` : farm.area}</span></span>
                  </div>
                  {farmPlots.filter(p => p.farm_id === farm.id).length > 0 && (
                    <div className="flex items-center gap-3 text-sm">
                      <IconLayersIntersect size={16} className="text-text-muted" />
                      <span className="text-text-secondary">Plots: <span className="text-text-primary font-medium">{farmPlots.filter(p => p.farm_id === farm.id).length}</span></span>
                    </div>
                  )}
                  <div className="flex items-center gap-3 text-sm">
                    <IconUser size={16} className="text-text-muted" />
                    <span className="text-text-secondary">Ownership: <span className="text-text-primary font-medium">{farm.ownership}</span></span>
                  </div>
                  <div className="mt-4 pt-4 border-t border-border-light">
                    <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">Estimated Value</span>
                    <span className="text-lg font-bold text-primary font-pkr">{formatPKR(farm.land_value)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 agri-card flex flex-col items-center justify-center opacity-40">
            <IconBuildingCommunity size={64} className="mb-4" />
            <p className="text-lg font-bold">No farms found</p>
            <p className="text-sm">Click "+ Add Farm" to register your first farm.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingFarm ? "Edit Farm" : "Add New Farm"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="agri-label">Farm Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="e.g. Model Farm A"
              className="agri-input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="agri-label">Location</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleInputChange}
              required
              placeholder="e.g. Sargodha, Punjab"
              className="agri-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Area (Acres)</label>
              <input
                type="number"
                step="0.01"
                name="area_acres"
                value={formData.area_acres}
                onChange={handleInputChange}
                required
                placeholder="e.g. 12"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Ownership</label>
              <select
                name="ownership"
                value={formData.ownership}
                onChange={handleInputChange}
                required
                className="agri-input"
              >
                <option value="Owned">Owned</option>
                <option value="Leased">Leased</option>
                <option value="Contract">Contract</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Land Value (PKR)</label>
              <input
                type="number"
                name="land_value"
                value={formData.land_value}
                onChange={handleInputChange}
                placeholder="0.00"
                className="agri-input"
              />
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
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Sold">Sold</option>
              </select>
            </div>
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
              {isSubmitting ? 'Saving...' : 'Save Farm'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Farms;
