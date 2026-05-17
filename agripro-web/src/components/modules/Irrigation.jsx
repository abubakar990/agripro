import React, { useState, useMemo } from 'react';
import { IconPlus, IconDroplet, IconClock, IconReceipt, IconTrash } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';

const Irrigation = ({ irrigationLog = [], farms = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    farm_id: farms.length > 0 ? farms[0].id : '',
    date: new Date().toISOString().split('T')[0],
    field: '',
    source: 'Tube-well',
    hours: '',
    cost: '',
    crop: '',
    note: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('irrigation_log').insert([{
        ...formData,
        farm_id: parseInt(formData.farm_id),
        hours: parseFloat(formData.hours) || 0,
        cost: parseFloat(formData.cost) || 0
      }]);
      
      if (error) throw error;
      
      setIsModalOpen(false);
      setFormData({
        farm_id: farms.length > 0 ? farms[0].id : '',
        date: new Date().toISOString().split('T')[0],
        field: '',
        source: 'Tube-well',
        hours: '',
        cost: '',
        crop: '',
        note: ''
      });
    } catch (error) {
      console.error('Error adding irrigation log:', error);
      alert('Error adding irrigation log: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this log?')) return;
    try {
      const { error } = await supabase.from('irrigation_log').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting irrigation log:', error);
      alert('Error deleting irrigation log: ' + error.message);
    }
  };

  const stats = useMemo(() => {
    const totalHours = irrigationLog.reduce((sum, l) => sum + (Number(l.hours) || 0), 0);
    const totalCost = irrigationLog.reduce((sum, l) => sum + (Number(l.cost) || 0), 0);
    return { totalHours, totalCost };
  }, [irrigationLog]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Irrigation Log</h2>
          <p className="text-sm text-text-muted">Track water usage, sources, and costs.</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <IconPlus size={18} />
          Log Irrigation
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="agri-card p-5 border-l-4 border-accent-blue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Hours</span>
            <IconClock size={20} className="text-accent-blue" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.totalHours.toFixed(1)} Hours</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-expense">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Water Cost</span>
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
                <th className="px-6 py-3">Farm</th>
                <th className="px-6 py-3">Field/Crop</th>
                <th className="px-6 py-3">Source</th>
                <th className="px-6 py-3 text-right">Hours</th>
                <th className="px-6 py-3 text-right">Cost</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {irrigationLog.length > 0 ? (
                irrigationLog.map((log) => {
                  const farm = farms.find(f => f.id === log.farm_id);
                  return (
                    <tr key={log.id} className="agri-table-row">
                      <td className="px-6 py-4 whitespace-nowrap">{formatDate(log.date)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="primary">{farm?.name || 'Unknown'}</Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-text-primary">{log.field || 'General'}</div>
                        <div className="text-xs text-text-muted">{log.crop}</div>
                      </td>
                      <td className="px-6 py-4">{log.source}</td>
                      <td className="px-6 py-4 text-right font-medium">{log.hours}h</td>
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
                      <IconDroplet size={48} className="mb-2" />
                      <p className="text-sm font-bold">No irrigation records found.</p>
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
        title="Log Irrigation Session"
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
              <label className="agri-label">Field Name / No.</label>
              <input
                type="text"
                name="field"
                value={formData.field}
                onChange={handleInputChange}
                placeholder="e.g. Field A1"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Crop</label>
              <input
                type="text"
                name="crop"
                value={formData.crop}
                onChange={handleInputChange}
                placeholder="e.g. Wheat"
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Source</label>
              <select
                name="source"
                value={formData.source}
                onChange={handleInputChange}
                required
                className="agri-input"
              >
                <option value="Tube-well">Tube-well</option>
                <option value="Canal">Canal</option>
                <option value="Rain">Rain</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Duration (Hours)</label>
              <input
                type="number"
                step="0.5"
                name="hours"
                value={formData.hours}
                onChange={handleInputChange}
                required
                placeholder="0.0"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Cost (PKR)</label>
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

          <div className="flex flex-col gap-1">
            <label className="agri-label">Notes</label>
            <textarea
              name="note"
              value={formData.note}
              onChange={handleInputChange}
              placeholder="Fuel usage, operator details, etc."
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
              {isSubmitting ? 'Saving...' : 'Save Log'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Irrigation;
