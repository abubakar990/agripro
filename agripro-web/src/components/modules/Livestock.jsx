import React, { useMemo, useState } from 'react';
import { IconPlus, IconMilk, IconStethoscope, IconGenderFemale, IconGenderMale, IconCalendar, IconCoins, IconTrash, IconEdit } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';

const AnimalCard = ({ animal, farm, healthEvents = [], onRecordHealth, onEdit, refetch }) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${animal.name || animal.tag}?`)) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('livestock')
        .delete()
        .eq('id', animal.id);
      
      if (error) throw error;
      await refetch();
    } catch (error) {
      console.error('Error deleting animal:', error.message);
      toast.error('Error deleting animal: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  const recentHealth = useMemo(() => {
    return healthEvents
      .filter(h => h.livestock_id === animal.id)
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 2);
  }, [healthEvents, animal.id]);

  return (
    <div className="agri-card overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border flex justify-between items-start">
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${animal.gender === 'Female' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}`}>
            {animal.gender === 'Female' ? <IconGenderFemale size={20} /> : <IconGenderMale size={20} />}
          </div>
          <div>
            <h4 className="font-bold text-text-primary">{animal.type} {animal.tag}</h4>
            <p className="text-[11px] text-text-muted uppercase font-bold">{farm?.name || '—'}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={animal.status === 'Active' ? 'success' : 'warning'}>
            {animal.status.toUpperCase()}
          </Badge>
          <div className="flex gap-1">
            <button 
              onClick={() => onEdit(animal)}
              className="text-text-muted hover:text-primary hover:bg-primary/10 p-2 rounded-full transition-all"
              title="Edit Animal"
            >
              <IconEdit size={18} />
            </button>
            <button 
              onClick={handleDelete}
              disabled={isDeleting}
              className="text-error hover:bg-error/10 p-2 rounded-full transition-all disabled:opacity-50"
              title="Delete Animal"
            >
              <IconTrash size={18} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="p-4 flex-1 space-y-4">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted font-bold uppercase">Name / ID</span>
            <span className="text-sm font-bold text-text-secondary">{animal.name || animal.tag}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-text-muted font-bold uppercase">Current Value</span>
            <span className="text-sm font-bold text-primary">{formatPKR(animal.current_value)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-bg rounded p-2 flex items-center gap-2">
            <IconCalendar size={16} className="text-text-muted" />
            <div className="flex flex-col">
              <span className="text-[9px] text-text-muted font-bold uppercase">DOB</span>
              <span className="text-[12px] font-bold">{formatDate(animal.dob)}</span>
            </div>
          </div>
          {animal.milk_avg_litres > 0 && (
            <div className="bg-green-50 rounded p-2 flex items-center gap-2">
              <IconMilk size={16} className="text-revenue" />
              <div className="flex flex-col">
                <span className="text-[9px] text-revenue font-bold uppercase">Daily Milk</span>
                <span className="text-[12px] font-bold text-revenue">{animal.milk_avg_litres} L</span>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <span className="text-[10px] text-text-muted font-bold uppercase block">Recent Health Events</span>
          {recentHealth.length > 0 ? (
            <div className="space-y-1">
              {recentHealth.map(h => (
                <div key={h.id} className="text-[11px] flex items-center justify-between">
                  <span className="text-text-secondary">{formatDate(h.date)} — {h.event}</span>
                  <span className="font-bold">{formatPKR(h.cost)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-[10px] text-text-muted italic">No records yet.</div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 bg-bg flex gap-2">
        <Button 
          size="small" 
          variant="outline" 
          className="flex-1"
          onClick={() => onRecordHealth(animal)}
        >
          <IconStethoscope size={14} />
          Health Log
        </Button>
      </div>
    </div>
  );
};

import { useLivestock, useAnimalHealth, useCategories, useFarms } from '../../hooks/queries';
import { useFilteredData } from '../../hooks/useFilteredData';
import { toast } from '../../utils/toast';

const Livestock = ({ user }) => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const { data: farms = [] } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);

  const { data: rawLivestock = [], isLoading: loadingLivestock, refetch: refetchLivestock } = useLivestock(farmIds);
  const livestock = useFilteredData(rawLivestock);

  const { data: rawHealth = [], isLoading: loadingHealth, refetch: refetchHealth } = useAnimalHealth(farmIds);
  const animalHealth = useFilteredData(rawHealth);

  const { data: allCategories = [] } = useCategories(currentOrgId);
  const categories = allCategories.filter(c => c.module === 'livestock');

  const isLoading = loadingLivestock || loadingHealth;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isHealthModalOpen, setIsHealthModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedAnimal, setSelectedAnimal] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [customCategory, setCustomCategory] = useState('');

  const [formData, setFormData] = useState({
    farm_id: farms[0]?.id || '',
    type: categories.length > 0 ? categories[0].name : 'ADD_NEW',
    tag: '',
    name: '',
    gender: 'Female',
    dob: '',
    purchase_price: '',
    current_value: '',
    milk_avg_litres: '0',
    status: 'Active'
  });

  const [healthData, setHealthData] = useState({
    date: new Date().toISOString().split('T')[0],
    event: 'Vaccination',
    treatment: '',
    vet: '',
    cost: '',
    note: ''
  });

  const stats = useMemo(() => {
    const totalAnimals = livestock.length;
    const totalValue = livestock.reduce((sum, a) => sum + Number(a.current_value || 0), 0);
    const milkingAnimals = livestock.filter(a => a.milk_avg_litres > 0).length;
    const dailyMilk = livestock.reduce((sum, a) => sum + Number(a.milk_avg_litres || 0), 0);
    
    return { totalAnimals, totalValue, milkingAnimals, dailyMilk };
  }, [livestock]);

  const handleEdit = (animal) => {
    setEditingId(animal.id);
    const isKnownCategory = categories.some(c => c.name === animal.type);
    
    setFormData({
      farm_id: animal.farm_id,
      type: isKnownCategory ? animal.type : 'ADD_NEW',
      tag: animal.tag,
      name: animal.name || '',
      gender: animal.gender,
      dob: animal.dob || '',
      purchase_price: animal.purchase_price,
      current_value: animal.current_value,
      milk_avg_litres: animal.milk_avg_litres.toString(),
      status: animal.status
    });

    if (!isKnownCategory) {
      setCustomCategory(animal.type);
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
          .insert([{ 
            name: customCategory, 
            module: 'livestock',
            user_id: user?.id 
          }]);
        
        if (catError && catError.code !== '23505') throw catError;
        finalType = customCategory;
      }

      const submissionData = {
        ...formData,
        dob: formData.dob || null,
        type: finalType,
        farm_id: parseInt(formData.farm_id),
        purchase_price: parseFloat(formData.purchase_price) || 0,
        current_value: parseFloat(formData.current_value) || 0,
        milk_avg_litres: parseFloat(formData.milk_avg_litres) || 0
      };

      if (editingId) {
        const { error } = await supabase
          .from('livestock')
          .update(submissionData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('livestock')
          .insert([submissionData]);
        if (error) throw error;
      }
      
      await refetchLivestock();
      setIsModalOpen(false);
      setEditingId(null);
      setCustomCategory('');
      setFormData({
        farm_id: farms[0]?.id || '',
        type: categories.length > 0 ? categories[0].name : 'ADD_NEW',
        tag: '',
        name: '',
        gender: 'Female',
        dob: '',
        purchase_price: '',
        current_value: '',
        milk_avg_litres: '0',
        status: 'Active'
      });
    } catch (error) {
      console.error('Error saving animal:', error.message);
      toast.error('Error saving animal: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setEditingId(null);
    setCustomCategory('');
    setFormData({
      farm_id: farms[0]?.id || '',
      type: categories.length > 0 ? categories[0].name : 'ADD_NEW',
      tag: '',
      name: '',
      gender: 'Female',
      dob: '',
      purchase_price: '',
      current_value: '',
      milk_avg_litres: '0',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleRecordHealth = (animal) => {
    setSelectedAnimal(animal);
    setHealthData({
      date: new Date().toISOString().split('T')[0],
      event: 'Vaccination',
      treatment: '',
      vet: '',
      cost: '',
      note: ''
    });
    setIsHealthModalOpen(true);
  };

  const handleHealthSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('animal_health')
        .insert([{
          livestock_id: selectedAnimal.id,
          date: healthData.date,
          event: healthData.event,
          treatment: healthData.treatment,
          vet: healthData.vet,
          cost: parseFloat(healthData.cost) || 0,
          note: healthData.note
        }]);

      if (error) throw error;
      
      await refetchHealth();
      setIsHealthModalOpen(false);
      setSelectedAnimal(null);
    } catch (error) {
      console.error('Error recording health event:', error.message);
      toast.error('Error recording health event: ' + error.message);
    } finally {
      setIsSubmitting(false);
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
          <h2 className="text-xl font-bold text-text-primary">Livestock Management</h2>
          <p className="text-sm text-text-muted">Track animal health, growth, and dairy production.</p>
        </div>
        <Button variant="primary" onClick={openAddModal}>
          <IconPlus size={18} />
          Add Animal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="agri-card p-5 border-l-4 border-primary">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Animals</span>
            <IconPlus size={20} className="text-primary" />
          </div>
          <span className="text-lg font-bold text-text-primary">{stats.totalAnimals} Head</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-revenue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Estimated Value</span>
            <IconCoins size={20} className="text-revenue" />
          </div>
          <span className="text-lg font-bold text-revenue">{formatPKR(stats.totalValue)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-blue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Milking Animals</span>
            <IconMilk size={20} className="text-accent-blue" />
          </div>
          <span className="text-lg font-bold text-accent-blue">{stats.milkingAnimals} Units</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-green">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Daily Milk Output</span>
            <IconMilk size={20} className="text-accent-green" />
          </div>
          <span className="text-lg font-bold text-accent-green">{stats.dailyMilk} Litres</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {livestock.length > 0 ? (
          livestock.map(animal => (
            <AnimalCard 
              key={animal.id} 
              animal={animal} 
              farm={farms.find(f => f.id === animal.farm_id)}
              healthEvents={animalHealth.filter(h => h.livestock_id === animal.id)}
              onRecordHealth={handleRecordHealth}
              onEdit={handleEdit}
              refetch={refetchLivestock}
            />
          ))
        ) : (
          <div className="col-span-full py-10 agri-card text-center opacity-40">
            <p className="text-sm font-bold">No animals registered yet.</p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={editingId ? "Edit Animal" : "Add New Animal"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
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
              <label className="agri-label">Type</label>
              <select 
                className="agri-input"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
                <option value="ADD_NEW">Add New...</option>
              </select>
            </div>
            <div>
              <label className="agri-label">Gender</label>
              <select 
                className="agri-input"
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value})}
              >
                <option value="Female">Female</option>
                <option value="Male">Male</option>
              </select>
            </div>
            {formData.type === 'ADD_NEW' && (
              <div className="col-span-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1">
                <label className="agri-label">New Type Name</label>
                <input
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  required
                  placeholder="e.g. Camel, Poultry"
                  className="agri-input"
                />
              </div>
            )}
            <div>
              <label className="agri-label">Tag ID</label>
              <input 
                type="text" 
                className="agri-input" 
                placeholder="e.g. C-101"
                value={formData.tag}
                onChange={e => setFormData({...formData, tag: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="agri-label">Name (Optional)</label>
              <input 
                type="text" 
                className="agri-input" 
                placeholder="e.g. Rani"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
              />
            </div>
            <div>
              <label className="agri-label">Date of Birth</label>
              <input 
                type="date" 
                className="agri-input"
                value={formData.dob}
                onChange={e => setFormData({...formData, dob: e.target.value})}
              />
            </div>
            <div>
              <label className="agri-label">Avg Daily Milk (L)</label>
              <input 
                type="number" 
                step="0.1"
                className="agri-input"
                value={formData.milk_avg_litres}
                onChange={e => setFormData({...formData, milk_avg_litres: e.target.value})}
              />
            </div>
            <div>
              <label className="agri-label">Purchase Price</label>
              <input 
                type="number" 
                className="agri-input"
                value={formData.purchase_price}
                onChange={e => setFormData({...formData, purchase_price: e.target.value})}
              />
            </div>
            <div>
              <label className="agri-label">Current Value</label>
              <input 
                type="number" 
                className="agri-input"
                value={formData.current_value}
                onChange={e => setFormData({...formData, current_value: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <label className="agri-label">Status</label>
              <select 
                className="agri-input"
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value})}
              >
                <option value="Active">Active</option>
                <option value="Sick">Sick</option>
                <option value="Dry">Dry</option>
                <option value="Sold">Sold</option>
                <option value="Deceased">Deceased</option>
              </select>
            </div>
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
              {isSubmitting ? 'Saving...' : 'Save Animal'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isHealthModalOpen}
        onClose={() => setIsHealthModalOpen(false)}
        title={`Record Health Event for ${selectedAnimal?.name || selectedAnimal?.tag}`}
      >
        <form onSubmit={handleHealthSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="agri-label">Date</label>
              <input 
                type="date" 
                className="agri-input"
                value={healthData.date}
                onChange={e => setHealthData({...healthData, date: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="agri-label">Event Type</label>
              <select 
                className="agri-input"
                value={healthData.event}
                onChange={e => setHealthData({...healthData, event: e.target.value})}
              >
                <option value="Vaccination">Vaccination</option>
                <option value="Deworming">Deworming</option>
                <option value="Checkup">Checkup</option>
                <option value="Treatment">Treatment</option>
                <option value="Maternity">Maternity</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="agri-label">Treatment/Medicine</label>
            <input 
              type="text" 
              className="agri-input" 
              placeholder="e.g. FMD Vaccine"
              value={healthData.treatment}
              onChange={e => setHealthData({...healthData, treatment: e.target.value})}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="agri-label">Veterinary Doctor</label>
              <input 
                type="text" 
                className="agri-input" 
                placeholder="Dr. Name"
                value={healthData.vet}
                onChange={e => setHealthData({...healthData, vet: e.target.value})}
              />
            </div>
            <div>
              <label className="agri-label">Cost (PKR)</label>
              <input 
                type="number" 
                className="agri-input" 
                placeholder="0.00"
                value={healthData.cost}
                onChange={e => setHealthData({...healthData, cost: e.target.value})}
              />
            </div>
          </div>
          <div>
            <label className="agri-label">Note</label>
            <textarea 
              className="agri-input" 
              placeholder="Observation, next visit, etc."
              rows="3"
              value={healthData.note}
              onChange={e => setHealthData({...healthData, note: e.target.value})}
            ></textarea>
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={() => setIsHealthModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Health Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Livestock;
