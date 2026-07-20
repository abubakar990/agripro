import React, { useState, useMemo } from 'react';
import { IconPlus, IconUsers, IconCalendar, IconCheck, IconX, IconFileDownload, IconTrash, IconEdit } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';

import { useWorkers, useAttendance, useFarms } from '../../hooks/queries';
import { useFilteredData } from '../../hooks/useFilteredData';
import { toast } from '../../utils/toast';

const Labor = () => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const { data: farms = [] } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);

  const { data: rawWorkers = [], isLoading: loadingWorkers, refetch: refetchWorkers } = useWorkers(farmIds);
  const workers = useFilteredData(rawWorkers);

  const { data: rawAttendance = [], isLoading: loadingAttendance, refetch: refetchAttendance } = useAttendance(farmIds);
  const attendanceData = useFilteredData(rawAttendance);

  const isLoading = loadingWorkers || loadingAttendance;

  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    farm_id: farms[0]?.id || '',
    name: '',
    role: 'General Labor',
    daily_rate: '',
    phone: '',
    status: 'Active'
  });

  const handleToggleAttendance = async (workerId, status) => {
    try {
      const worker = workers.find(w => w.id === workerId);
      const { error } = await supabase
        .from('attendance')
        .upsert({
          worker_id: workerId,
          farm_id: worker.farm_id,
          date: selectedDate,
          present: status
        }, { onConflict: 'worker_id,date' });

      if (error) throw error;
      await refetchAttendance();
    } catch (error) {
      console.error('Error saving attendance:', error.message);
      toast.error('Error saving attendance: ' + error.message);
    }
  };

  const attendanceMap = useMemo(() => {
    const map = {};
    attendanceData.filter(a => a.date === selectedDate).forEach(a => {
      map[a.worker_id] = a.present;
    });
    return map;
  }, [attendanceData, selectedDate]);

  const stats = useMemo(() => {
    const activeCount = workers.filter(w => w.status === 'Active').length;
    const presentCount = workers.filter(w => attendanceMap[w.id] === true).length;

    const currentMonth = selectedDate.substring(0, 7);
    const monthWages = attendanceData
      .filter(a => a.date.startsWith(currentMonth) && a.present)
      .reduce((sum, a) => {
        const worker = workers.find(w => w.id === a.worker_id);
        return sum + (worker ? Number(worker.daily_rate) : 0);
      }, 0);

    const dailyTotal = workers
      .filter(w => attendanceMap[w.id] === true)
      .reduce((sum, w) => sum + Number(w.daily_rate), 0);

    return { activeCount, presentCount, monthWages, dailyTotal };
  }, [workers, attendanceMap, attendanceData, selectedDate]);

  const handleEdit = (worker) => {
    setEditingId(worker.id);
    setFormData({
      farm_id: worker.farm_id,
      name: worker.name,
      role: worker.role,
      daily_rate: worker.daily_rate.toString(),
      phone: worker.phone || '',
      status: worker.status
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('workers')
          .update({
            ...formData,
            farm_id: parseInt(formData.farm_id),
            daily_rate: parseFloat(formData.daily_rate) || 0
          })
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('workers')
          .insert([{
            ...formData,
            farm_id: parseInt(formData.farm_id),
            daily_rate: parseFloat(formData.daily_rate) || 0,
            status: 'Active'
          }]);
        if (error) throw error;
      }

      await refetchWorkers();
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({
        farm_id: farms[0]?.id || '',
        name: '',
        role: 'General Labor',
        daily_rate: '',
        phone: '',
        status: 'Active'
      });
    } catch (error) {
      console.error('Error saving worker:', error.message);
      toast.error('Error saving worker: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setFormData({
      farm_id: farms[0]?.id || '',
      name: '',
      role: 'General Labor',
      daily_rate: '',
      phone: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (worker) => {
    if (!window.confirm(`Are you sure you want to delete ${worker.name}?`)) return;

    setIsDeleting(worker.id);
    try {
      const { error } = await supabase.from('workers').delete().eq('id', worker.id);
      if (error) throw error;
      await refetchWorkers();
    } catch (error) {
      console.error('Error deleting worker:', error.message);
      toast.error('Error deleting worker: ' + error.message);
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
          <h2 className="text-xl font-bold text-text-primary">Labor & Payroll</h2>
          <p className="text-sm text-text-muted">Manage daily attendance and wage calculations.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <IconFileDownload size={18} />
            Payroll Summary
          </Button>
          <Button variant="primary" onClick={openAddModal}>
            <IconPlus size={18} />
            Add Worker
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="agri-card p-5 border-l-4 border-primary">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Active Workers</span>
            <IconUsers size={20} className="text-primary" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.activeCount} Workers</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-green">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Present Today</span>
            <IconCheck size={20} className="text-accent-green" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.presentCount} / {stats.activeCount}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-blue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Daily Payroll</span>
            <IconCalendar size={20} className="text-accent-blue" />
          </div>
          <span className="text-lg font-bold text-text-primary">{formatPKR(stats.dailyTotal)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-amber">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Month Wages (Total)</span>
            <IconCalendar size={20} className="text-accent-amber" />
          </div>
          <span className="text-lg font-bold text-text-primary">{formatPKR(stats.monthWages)}</span>
        </div>
      </div>

      <div className="agri-card">
        <div className="px-6 py-4 border-b border-border flex justify-between items-center">
          <h3 className="text-sm font-bold text-text-primary">Daily Attendance — {formatDate(selectedDate)}</h3>
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs border border-border rounded p-1" 
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="agri-table-header">
                <th className="px-6 py-3">Worker Name</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Farm</th>
                <th className="px-6 py-3">Daily Rate</th>
                <th className="px-6 py-3 text-center">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workers.map(worker => {
                const farm = farms.find(f => f.id === worker.farm_id);
                const isPresent = attendanceMap[worker.id];

                return (
                  <tr key={worker.id} className="agri-table-row">
                    <td className="px-6 py-4 font-bold text-text-primary">{worker.name}</td>
                    <td className="px-6 py-4 text-xs font-bold text-text-secondary uppercase">{worker.role}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant="primary">{farm?.name || '—'}</Badge>
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">{formatPKR(worker.daily_rate)}</td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleToggleAttendance(worker.id, true)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isPresent === true ? 'bg-accent-green text-white scale-110' : 'bg-bg text-text-muted hover:bg-green-100 hover:text-accent-green'
                          }`}
                        >
                          <IconCheck size={18} />
                        </button>
                        <button 
                          onClick={() => handleToggleAttendance(worker.id, false)}
                          className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                            isPresent === false ? 'bg-expense text-white scale-110' : 'bg-bg text-text-muted hover:bg-red-100 hover:text-expense'
                          }`}
                        >
                          <IconX size={18} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleEdit(worker)}
                          className="text-primary hover:bg-primary/10 p-2 rounded transition-colors"
                        >
                          <IconEdit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(worker)}
                          disabled={isDeleting === worker.id}
                          className="text-error hover:bg-error/10 p-2 rounded transition-colors disabled:opacity-50"
                        >
                          <IconTrash size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-bg flex justify-between items-center text-sm font-bold">
          <span className="text-text-secondary">Selected Day Payroll:</span>
          <span className="text-primary text-lg">{formatPKR(stats.dailyTotal)}</span>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Edit Worker" : "Add New Worker"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div>
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
            <div>
              <label className="agri-label">Worker Name</label>
              <input 
                type="text" 
                className="agri-input" 
                placeholder="e.g. Ali Ahmed"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="agri-label">Role</label>
              <select 
                className="agri-input"
                value={formData.role}
                onChange={e => setFormData({...formData, role: e.target.value})}
              >
                <option value="General Labor">General Labor</option>
                <option value="Tractor Driver">Tractor Driver</option>
                <option value="Harvester Operator">Harvester Operator</option>
                <option value="Farm Manager">Farm Manager</option>
                <option value="Livestock Hand">Livestock Hand</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="agri-label">Daily Rate (PKR)</label>
                <input 
                  type="number" 
                  className="agri-input"
                  value={formData.daily_rate}
                  onChange={e => setFormData({...formData, daily_rate: e.target.value})}
                  required
                />
              </div>
              <div>
                <label className="agri-label">Phone Number</label>
                <input 
                  type="text" 
                  className="agri-input" 
                  placeholder="03xx-xxxxxxx"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                />
              </div>
            </div>
            {editingId && (
              <div>
                <label className="agri-label">Status</label>
                <select 
                  className="agri-input"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Terminated">Terminated</option>
                </select>
              </div>
            )}
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
              {isSubmitting ? 'Saving...' : 'Save Worker'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Labor;
