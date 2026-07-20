import React, { useState, useMemo } from 'react';
import { IconPlus, IconTrendingUp, IconTrendingDown, IconBuildingStore, IconCalendar, IconTrash } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';

import { useMandiPrices } from '../../hooks/queries';
import { toast } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirmDialog';

const MandiPrices = () => {
  const { data: rawMandiPrices = [], isLoading, refetch } = useMandiPrices();
  const mandiPrices = rawMandiPrices;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    commodity: '',
    price: '',
    unit: 'Maund (40kg)',
    market: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('mandi_prices').insert([{
        ...formData,
        price: parseFloat(formData.price) || 0
      }]);
      
      if (error) throw error;
      
      await refetch();
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        commodity: '',
        price: '',
        unit: 'Maund (40kg)',
        market: ''
      });
    } catch (error) {
      console.error('Error adding mandi price:', error);
      toast.error('Error adding mandi price: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await confirmDialog('Are you sure you want to delete this price record?')) return;
    try {
      const { error } = await supabase.from('mandi_prices').delete().eq('id', id);
      if (error) throw error;
      await refetch();
    } catch (error) {
      console.error('Error deleting mandi price:', error);
      toast.error('Error deleting mandi price: ' + error.message);
    }
  };

  const latestPrices = useMemo(() => {
    const latest = {};
    [...mandiPrices].sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(p => {
      if (!latest[p.commodity]) {
        latest[p.commodity] = p;
      }
    });
    return Object.values(latest);
  }, [mandiPrices]);

  if (isLoading) {
    return (
      <div className="flex w-full h-96 items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Mandi Prices</h2>
          <p className="text-sm text-text-muted">Track market rates for various commodities.</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <IconPlus size={18} />
          Add Market Price
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {latestPrices.length > 0 ? (
          latestPrices.map((p) => (
            <div key={p.id} className="agri-card p-5 border-l-4 border-accent-green">
              <div className="flex justify-between items-start mb-2">
                <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">{p.commodity}</span>
                <IconTrendingUp size={18} className="text-accent-green" />
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-text-primary">{formatPKR(p.price)}</span>
                <span className="text-[10px] text-text-muted">per {p.unit}</span>
              </div>
              <div className="mt-2 text-[10px] font-bold text-accent-blue uppercase">{p.market}</div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-10 agri-card text-center opacity-40">
            <p className="text-sm font-bold">No price data available.</p>
          </div>
        )}
      </div>

      <div className="agri-card overflow-hidden">
        <div className="p-5 border-b border-border-light">
          <h3 className="font-bold text-text-primary">Price History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="agri-table-header">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Commodity</th>
                <th className="px-6 py-3 text-right">Price</th>
                <th className="px-6 py-3">Unit</th>
                <th className="px-6 py-3">Market</th>
                <th className="px-6 py-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {mandiPrices.length > 0 ? (
                mandiPrices.map((p) => (
                  <tr key={p.id} className="agri-table-row">
                    <td className="px-6 py-4 whitespace-nowrap">{formatDate(p.date)}</td>
                    <td className="px-6 py-4 font-bold text-text-primary">{p.commodity}</td>
                    <td className="px-6 py-4 text-right font-pkr text-accent-green">{formatPKR(p.price)}</td>
                    <td className="px-6 py-4 text-text-secondary text-sm">{p.unit}</td>
                    <td className="px-6 py-4">{p.market}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDelete(p.id)}
                        className="text-text-muted hover:text-expense hover:bg-expense/10 p-2 rounded-full transition-all"
                        title="Delete Price"
                      >
                        <IconTrash size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-text-muted italic">
                    No historical data found.
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
        title="Record Market Price"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
            <div className="flex flex-col gap-1">
              <label className="agri-label">Commodity</label>
              <input
                type="text"
                name="commodity"
                value={formData.commodity}
                onChange={handleInputChange}
                required
                placeholder="e.g. Wheat, Basmati"
                className="agri-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Price (PKR)</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleInputChange}
                required
                placeholder="0.00"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Unit</label>
              <select
                name="unit"
                value={formData.unit}
                onChange={handleInputChange}
                required
                className="agri-input"
              >
                <option value="Maund (40kg)">Maund (40kg)</option>
                <option value="KG">KG</option>
                <option value="Bale">Bale</option>
                <option value="Ton">Ton</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="agri-label">Market/Mandi Name</label>
            <input
              type="text"
              name="market"
              value={formData.market}
              onChange={handleInputChange}
              required
              placeholder="e.g. Sargodha Mandi"
              className="agri-input"
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
              {isSubmitting ? 'Saving...' : 'Save Price'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MandiPrices;
