import React, { useState, useMemo } from 'react';
import { IconPlus, IconFlask, IconSearch, IconReceipt, IconTrash } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';

const SprayLog = ({ sprayLog = [], farms = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    farm_id: farms.length > 0 ? farms[0].id : '',
    date: new Date().toISOString().split('T')[0],
    field: '',
    chemical: '',
    qty: '',
    crop: '',
    purpose: 'Pesticide',
    cost: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('spray_log').insert([{
        ...formData,
        farm_id: parseInt(formData.farm_id),
        cost: parseFloat(formData.cost) || 0
      }]);
      
      if (error) throw error;
      
      setIsModalOpen(false);
      setFormData({
        farm_id: farms.length > 0 ? farms[0].id : '',
        date: new Date().toISOString().split('T')[0],
        field: '',
        chemical: '',
        qty: '',
        crop: '',
        purpose: 'Pesticide',
        cost: ''
      });
    } catch (error) {
      console.error('Error adding spray log:', error);
      alert('Error adding spray log: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    try {
      const { error } = await supabase.from('spray_log').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting spray log:', error);
      alert('Error deleting spray log: ' + error.message);
    }
  };

  const stats = useMemo(() => {
    const totalCost = sprayLog.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
    const sprayCount = sprayLog.length;
    return { totalCost, sprayCount };
  }, [sprayLog]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Spray Log</h2>
          <p className="text-sm text-text-muted">Monitor chemical applications and pest control.</p>
        </div>
        <Button variant="danger" onClick={() => setIsModalOpen(true)}>
          <IconPlus size={18} />
          New Spray Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <Badge variant="outline">{farm?.name || 'Unknown'}</Badge>
                        <div className="text-xs text-text-muted mt-1">{log.field}</div>
                      </td>
                      <td className="px-6 py-4 font-bold text-text-primary">{log.crop}</td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-text-primary">{log.chemical}</div>
                        <div className="text-[10px] uppercase font-bold text-accent-blue">{log.purpose}</div>
                      </td>
                      <td className="px-6 py-4">{log.qty}</td>
                      <td className="px-6 py-4 text-right font-pkr text-expense">{formatPKR(log.cost)}</td>
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
                  <td colSpan="7" className="px-6 py-12 text-center">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Field/Location</label>
              <input
                type="text"
                name="field"
                value={formData.field}
                onChange={handleInputChange}
                placeholder="e.g. South Sector"
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
                placeholder="e.g. Cotton"
                className="agri-input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="agri-label">Chemical Used</label>
            <input
              type="text"
              name="chemical"
              value={formData.chemical}
              onChange={handleInputChange}
              required
              placeholder="e.g. Glyphosate 480SL"
              className="agri-input"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Purpose</label>
              <select
                name="purpose"
                value={formData.purpose}
                onChange={handleInputChange}
                required
                className="agri-input"
              >
                <option value="Pesticide">Pesticide</option>
                <option value="Herbicide">Herbicide</option>
                <option value="Fungicide">Fungicide</option>
                <option value="Fertilizer">Foliar Fert</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Quantity</label>
              <input
                type="text"
                name="qty"
                value={formData.qty}
                onChange={handleInputChange}
                placeholder="e.g. 500ml/acre"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Total Cost (PKR)</label>
              <input
                type="number"
                name="cost"
                value={formData.cost}
                onChange={handleInputChange}
                placeholder="0.00"
                className="agri-input"
              />
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
              variant="danger" 
              className="flex-1"
              disabled={isSubmitting}
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
