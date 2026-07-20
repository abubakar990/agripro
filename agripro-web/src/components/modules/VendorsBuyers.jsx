import React, { useState, useMemo } from 'react';
import { IconPlus, IconUser, IconPhone, IconMapPin, IconReceipt2, IconTrash } from '@tabler/icons-react';
import { formatPKR } from '../../utils/format';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { supabase } from '../../lib/supabase';

import { useVendorsBuyers } from '../../hooks/queries';
import { toast } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirmDialog';

const VendorsBuyers = () => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const { data: rawVendorsBuyers = [], isLoading, refetch } = useVendorsBuyers(currentOrgId);
  const vendorsBuyers = rawVendorsBuyers;
  const [activeTab, setActiveTab] = useState('Vendor');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    type: 'Vendor',
    name: '',
    contact: '',
    address: '',
    total_business: '',
    total_settled: '',
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
      const { error } = await supabase.from('vendors_buyers').insert([{
        ...formData,
        total_business: parseFloat(formData.total_business) || 0,
        total_settled: parseFloat(formData.total_settled) || 0
      }]);
      
      if (error) throw error;
      
      await refetch();
      setIsModalOpen(false);
      setFormData({
        type: activeTab,
        name: '',
        contact: '',
        address: '',
        total_business: '',
        total_settled: '',
        note: ''
      });
    } catch (error) {
      console.error('Error adding vendor/buyer:', error);
      toast.error('Error adding vendor/buyer: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!await confirmDialog('Are you sure you want to delete this contact?')) return;
    try {
      const { error } = await supabase.from('vendors_buyers').delete().eq('id', id);
      if (error) throw error;
      await refetch();
    } catch (error) {
      console.error('Error deleting contact:', error);
      toast.error('Error deleting contact: ' + error.message);
    }
  };

  const filteredList = useMemo(() => {
    return vendorsBuyers.filter(item => item.type === activeTab);
  }, [vendorsBuyers, activeTab]);

  const stats = useMemo(() => {
    const totalOutstanding = filteredList.reduce((sum, item) => 
      sum + (Number(item.total_business) - Number(item.total_settled)), 0);
    return { totalOutstanding };
  }, [filteredList]);

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
          <h2 className="text-xl font-bold text-text-primary">Vendors & Buyers</h2>
          <p className="text-sm text-text-muted">Manage business contacts and outstanding balances.</p>
        </div>
        <Button variant="primary" onClick={() => {
          setFormData(prev => ({ ...prev, type: activeTab }));
          setIsModalOpen(true);
        }}>
          <IconPlus size={18} />
          Add {activeTab}
        </Button>
      </div>

      <div className="flex gap-2 p-1 bg-bg-secondary rounded-lg w-fit">
        {['Vendor', 'Buyer'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2 rounded-md text-sm font-bold transition-all ${
              activeTab === tab 
                ? 'bg-white text-accent-green shadow-sm' 
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            {tab}s
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="agri-card p-5 border-l-4 border-accent-blue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total {activeTab}s</span>
            <IconUser size={20} className="text-accent-blue" />
          </div>
          <span className="text-lg font-bold text-text-primary">{filteredList.length} Contacts</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-expense">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Outstanding</span>
            <IconReceipt2 size={20} className="text-expense" />
          </div>
          <span className="text-lg font-bold text-text-primary">{formatPKR(stats.totalOutstanding)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredList.length > 0 ? (
          filteredList.map((person) => {
            const outstanding = Number(person.total_business) - Number(person.total_settled);
            return (
              <div key={person.id} className="agri-card overflow-hidden flex flex-col">
                <div className="p-5 flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-bg-secondary flex items-center justify-center text-accent-green font-bold text-lg">
                        {person.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-bold text-text-primary leading-tight">{person.name}</h3>
                        <p className="text-[10px] font-bold text-text-muted uppercase tracking-tighter">ID: #{person.id}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(person.id)}
                      className="text-text-muted hover:text-expense transition-colors"
                    >
                      <IconTrash size={18} />
                    </button>
                  </div>

                  <div className="space-y-3 mt-4">
                    <div className="flex items-center gap-3 text-sm">
                      <IconPhone size={16} className="text-text-muted" />
                      <span className="text-text-primary">{person.contact || 'No contact'}</span>
                    </div>
                    <div className="flex items-start gap-3 text-sm">
                      <IconMapPin size={16} className="text-text-muted mt-1" />
                      <span className="text-text-secondary leading-snug">{person.address || 'No address provided'}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-border-light grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Outstanding</span>
                      <span className={`text-sm font-bold ${outstanding > 0 ? 'text-expense' : 'text-accent-green'}`}>
                        {formatPKR(outstanding)}
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] font-bold text-text-muted uppercase">Total Business</span>
                      <span className="text-sm font-bold text-text-primary">
                        {formatPKR(person.total_business)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-20 agri-card flex flex-col items-center justify-center opacity-40">
            <IconUser size={64} className="mb-4" />
            <p className="text-lg font-bold">No {activeTab}s found</p>
            <p className="text-sm">Click "+ Add {activeTab}" to add to your directory.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Add New ${formData.type}`}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="agri-label">Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
              placeholder="Full Name / Company Name"
              className="agri-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Contact Number</label>
              <input
                type="text"
                name="contact"
                value={formData.contact}
                onChange={handleInputChange}
                placeholder="03xx-xxxxxxx"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Type</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                required
                className="agri-input"
              >
                <option value="Vendor">Vendor</option>
                <option value="Buyer">Buyer</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="agri-label">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Business address..."
              className="agri-input min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Total Business (PKR)</label>
              <input
                type="number"
                name="total_business"
                value={formData.total_business}
                onChange={handleInputChange}
                placeholder="0.00"
                className="agri-input"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Total Settled (PKR)</label>
              <input
                type="number"
                name="total_settled"
                value={formData.total_settled}
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
              placeholder="Additional details..."
              className="agri-input min-h-[60px]"
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
              {isSubmitting ? 'Saving...' : 'Save Contact'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VendorsBuyers;
