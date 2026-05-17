import React, { useMemo, useState } from 'react';
import { IconPlus, IconTractor, IconEngine, IconGasStation, IconHistory, IconTrash, IconCoins, IconEdit } from '@tabler/icons-react';
import { formatPKR, formatNumber } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';

const MachineCard = ({ machine, farm, usage, onLogUsage, onEdit, onDelete }) => {
  const machineStats = useMemo(() => {
    const machineUsage = usage.filter(u => u.machine_id === machine.id);
    const totalHours = machineUsage.reduce((sum, u) => sum + (parseFloat(u.hours) || 0), 0);
    const totalFuel = machineUsage.reduce((sum, u) => sum + (parseFloat(u.fuel_litres) || 0), 0);
    return { totalHours, totalFuel };
  }, [machine.id, usage]);

  return (
    <div className="agri-card overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border flex justify-between items-start">
        <div>
          <h4 className="font-bold text-text-primary">{machine.name}</h4>
          <p className="text-[11px] text-text-muted uppercase font-bold">{farm?.name || 'Unknown Farm'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={machine.status === 'Active' ? 'success' : 'warning'}>
            {machine.status.toUpperCase()}
          </Badge>
          <button 
            onClick={() => onEdit(machine)}
            className="text-text-muted hover:text-primary hover:bg-primary/10 p-2 rounded-full transition-all"
            title="Edit Machine"
          >
            <IconEdit size={16} />
          </button>
        </div>
      </div>
      
      <div className="p-4 flex-1 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted font-bold uppercase">Type</span>
            <span className="text-[13px] font-bold text-text-secondary">{machine.type}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-[10px] text-text-muted font-bold uppercase">Reg #</span>
            <span className="text-[13px] font-bold text-text-secondary">{machine.reg_no}</span>
          </div>
        </div>

        <div className="flex justify-between items-end border-t border-bg pt-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted font-bold uppercase">Current Value</span>
            <span className="text-sm font-bold text-primary">{formatPKR(machine.current_value)}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-text-muted font-bold uppercase">Year</span>
            <span className="text-sm font-bold text-text-primary">{machine.year}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <div className="bg-bg rounded p-2 flex items-center gap-2">
            <IconEngine size={16} className="text-primary" />
            <div className="flex flex-col">
              <span className="text-[9px] text-text-muted font-bold uppercase">Total Hours</span>
              <span className="text-[12px] font-bold">{formatNumber(machineStats.totalHours)} h</span>
            </div>
          </div>
          <div className="bg-bg rounded p-2 flex items-center gap-2">
            <IconGasStation size={16} className="text-primary" />
            <div className="flex flex-col">
              <span className="text-[9px] text-text-muted font-bold uppercase">Total Fuel</span>
              <span className="text-[12px] font-bold">{formatNumber(machineStats.totalFuel)} L</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 py-3 bg-bg flex items-center gap-2">
        <Button 
          size="small" 
          variant="outline" 
          className="flex-1 px-3 py-1"
          onClick={() => onLogUsage(machine)}
        >
          Log Usage
        </Button>
        <button 
          className="text-expense hover:bg-expense/10 p-2 rounded-full transition-all"
          onClick={() => onDelete(machine.id)}
          title="Delete Machine"
        >
          <IconTrash size={18} />
        </button>
      </div>
    </div>
  );
};

const Machinery = ({ machinery, farms, machineUsage = [], categories = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUsageModalOpen, setIsUsageModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [customCategory, setCustomCategory] = useState('');

  const [formData, setFormData] = useState({
    farm_id: farms.length > 0 ? farms[0].id : '',
    name: '',
    type: categories.length > 0 ? categories[0].name : 'Tractor',
    year: new Date().getFullYear(),
    reg_no: '',
    purchase_price: '',
    current_value: '',
    status: 'Active'
  });

  const [usageData, setUsageData] = useState({
    date: new Date().toISOString().split('T')[0],
    hours: '',
    fuel_litres: '',
    operator: '',
    activity: '',
    notes: ''
  });

  const recentLogs = useMemo(() => {
    return [...machineUsage].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
  }, [machineUsage]);

  const stats = useMemo(() => {
    const count = machinery.length;
    const totalValue = machinery.reduce((sum, m) => sum + (parseFloat(m.current_value) || 0), 0);
    const usageCount = machineUsage.length;
    
    return { count, totalValue, usageCount };
  }, [machinery, machineUsage]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUsageChange = (e) => {
    const { name, value } = e.target;
    setUsageData(prev => ({ ...prev, [name]: value }));
  };

  const handleEdit = (machine) => {
    setEditingId(machine.id);
    const isKnownCategory = categories.some(c => c.name === machine.type);
    
    setFormData({
      farm_id: machine.farm_id,
      name: machine.name,
      type: isKnownCategory ? machine.type : 'ADD_NEW',
      year: machine.year,
      reg_no: machine.reg_no,
      purchase_price: machine.purchase_price,
      current_value: machine.current_value,
      status: machine.status
    });

    if (!isKnownCategory) {
      setCustomCategory(machine.type);
    } else {
      setCustomCategory('');
    }
    
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalType = formData.type;
    
    try {
      if (formData.type === 'ADD_NEW') {
        const { error: catError } = await supabase
          .from('categories')
          .insert([{ name: customCategory, module: 'machinery' }]);
        
        if (catError && catError.code !== '23505') throw catError;
        finalType = customCategory;
      }

      const submissionData = {
        ...formData,
        type: finalType,
        farm_id: parseInt(formData.farm_id),
        year: parseInt(formData.year),
        purchase_price: parseFloat(formData.purchase_price) || 0,
        current_value: parseFloat(formData.current_value) || 0
      };

      if (editingId) {
        const { error } = await supabase
          .from('machinery')
          .update(submissionData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('machinery').insert([submissionData]);
        if (error) throw error;
      }
      
      setIsModalOpen(false);
      setEditingId(null);
      setCustomCategory('');
      setFormData({
        farm_id: farms.length > 0 ? farms[0].id : '',
        name: '',
        type: categories.length > 0 ? categories[0].name : 'Tractor',
        year: new Date().getFullYear(),
        reg_no: '',
        purchase_price: '',
        current_value: '',
        status: 'Active'
      });
    } catch (error) {
      console.error('Error saving machinery:', error);
      alert('Error saving machinery: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUsageSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('machine_usage').insert([{
        ...usageData,
        machine_id: selectedMachine.id,
        farm_id: selectedMachine.farm_id,
        hours: parseFloat(usageData.hours) || 0,
        fuel_litres: parseFloat(usageData.fuel_litres) || 0
      }]);
      
      if (error) throw error;
      
      setIsUsageModalOpen(false);
      setUsageData({
        date: new Date().toISOString().split('T')[0],
        hours: '',
        fuel_litres: '',
        operator: '',
        activity: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error logging usage:', error);
      alert('Error logging usage: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openUsageModal = (machine) => {
    setSelectedMachine(machine);
    setIsUsageModalOpen(true);
  };

  const openAddModal = () => {
    setEditingId(null);
    setCustomCategory('');
    setFormData({
      farm_id: farms.length > 0 ? farms[0].id : '',
      name: '',
      type: categories.length > 0 ? categories[0].name : 'Tractor',
      year: new Date().getFullYear(),
      reg_no: '',
      purchase_price: '',
      current_value: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this machine? All its usage logs will also be affected.')) return;
    
    try {
      const { error } = await supabase.from('machinery').delete().eq('id', id);
      if (error) throw error;
    } catch (error) {
      console.error('Error deleting machinery:', error);
      alert('Error deleting machinery: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Machinery & Equipment</h2>
          <p className="text-sm text-text-muted">Track your fleet usage, fuel, and maintenance.</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <IconPlus size={18} />
          Add Machine
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="agri-card p-5 border-l-4 border-primary">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Machine Count</span>
            <IconTractor size={20} className="text-primary" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.count} Units</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-revenue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Asset Value</span>
            <IconCoins size={20} className="text-revenue" />
          </div>
          <span className="text-lg font-bold text-revenue">{formatPKR(stats.totalValue)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-blue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Usage Records</span>
            <IconHistory size={20} className="text-accent-blue" />
          </div>
          <span className="text-lg font-bold text-accent-blue">{stats.usageCount} Logs</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {machinery.map(m => (
          <MachineCard 
            key={m.id} 
            machine={m} 
            farm={farms.find(f => f.id === m.farm_id)} 
            usage={machineUsage}
            onLogUsage={openUsageModal}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}
        {machinery.length === 0 && (
          <div className="col-span-full py-12 text-center agri-card opacity-50">
            <IconTractor size={48} className="mx-auto mb-2" />
            <p className="font-bold">No machinery found.</p>
            <p className="text-sm text-text-muted">Click "+ Add Machine" to start your fleet.</p>
          </div>
        )}
      </div>

      <div className="agri-card overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-sm font-bold text-text-primary">Recent Usage Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="agri-table-header">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Machine</th>
                <th className="px-6 py-3">Activity</th>
                <th className="px-6 py-3">Hours</th>
                <th className="px-6 py-3">Fuel (L)</th>
                <th className="px-6 py-3">Operator</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map(log => {
                const machine = machinery.find(m => m.id === log.machine_id);
                return (
                  <tr key={log.id} className="agri-table-row">
                    <td className="px-6 py-4 whitespace-nowrap text-xs">{log.date}</td>
                    <td className="px-6 py-4 font-bold text-text-primary">{machine?.name || 'Unknown'}</td>
                    <td className="px-6 py-4 text-[13px] text-text-secondary">{log.activity}</td>
                    <td className="px-6 py-4 font-bold text-primary">{log.hours} h</td>
                    <td className="px-6 py-4 font-bold text-accent-amber">{log.fuel_litres} L</td>
                    <td className="px-6 py-4 text-xs font-bold">{log.operator}</td>
                  </tr>
                );
              })}
              {recentLogs.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-text-muted">No usage logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Usage Modal */}
      <Modal
        isOpen={isUsageModalOpen}
        onClose={() => setIsUsageModalOpen(false)}
        title={`Log Usage: ${selectedMachine?.name}`}
      >
        <form onSubmit={handleUsageSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Date</label>
              <input
                type="date"
                name="date"
                value={usageData.date}
                onChange={handleUsageChange}
                required
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Operator</label>
              <input
                type="text"
                name="operator"
                value={usageData.operator}
                onChange={handleUsageChange}
                required
                placeholder="Name"
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Hours Used</label>
              <input
                type="number"
                step="0.1"
                name="hours"
                value={usageData.hours}
                onChange={handleUsageChange}
                required
                placeholder="0.0"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Fuel Litres</label>
              <input
                type="number"
                step="0.1"
                name="fuel_litres"
                value={usageData.fuel_litres}
                onChange={handleUsageChange}
                placeholder="0.0"
                className="agri-input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-muted uppercase">Activity</label>
            <input
              type="text"
              name="activity"
              value={usageData.activity}
              onChange={handleUsageChange}
              required
              placeholder="e.g. Ploughing, Irrigation"
              className="agri-input"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-muted uppercase">Notes</label>
            <textarea
              name="notes"
              value={usageData.notes}
              onChange={handleUsageChange}
              placeholder="Optional details..."
              className="agri-input h-20"
            ></textarea>
          </div>

          <div className="pt-2 flex gap-3">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1"
              onClick={() => setIsUsageModalOpen(false)}
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

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? "Edit Machine" : "Add New Machine"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 col-span-2">
              <label className="text-xs font-bold text-text-muted uppercase">Machine Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g. John Deere Tractor"
                className="agri-input"
              />
            </div>
          </div>

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
              <label className="text-xs font-bold text-text-muted uppercase">Type</label>
              <select
                name="type"
                value={formData.type}
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
          </div>

          {formData.type === 'ADD_NEW' && (
            <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-top-1">
              <label className="text-xs font-bold text-text-muted uppercase">New Type Name</label>
              <input
                type="text"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                required
                placeholder="e.g. Digger, Trailer"
                className="agri-input"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Registration #</label>
              <input
                type="text"
                name="reg_no"
                value={formData.reg_no}
                onChange={handleInputChange}
                placeholder="ABC-1234"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Model Year</label>
              <input
                type="number"
                name="year"
                value={formData.year}
                onChange={handleInputChange}
                required
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Purchase Price</label>
              <input
                type="number"
                name="purchase_price"
                value={formData.purchase_price}
                onChange={handleInputChange}
                placeholder="0.00"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-text-muted uppercase">Current Value</label>
              <input
                type="number"
                name="current_value"
                value={formData.current_value}
                onChange={handleInputChange}
                placeholder="0.00"
                className="agri-input"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-text-muted uppercase">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              className="agri-input"
            >
              <option value="Active">Active</option>
              <option value="Under Maintenance">Under Maintenance</option>
              <option value="Out of Order">Out of Order</option>
              <option value="Sold">Sold</option>
            </select>
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
              {isSubmitting ? 'Saving...' : 'Save Machine'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Machinery;

