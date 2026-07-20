import React, { useMemo, useState } from 'react';
import { IconPlus, IconCreditCard, IconClock, IconChecks, IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';

const CreditCard = ({ entry, farm, onRecordPayment, onViewHistory, refetch }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const paid = entry.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
  const remaining = entry.total_amount - (entry.advance || 0) - paid;
  const progress = entry.total_amount > 0 ? (( (entry.advance || 0) + paid) / entry.total_amount) * 100 : 0;
  
  const isOverdue = new Date(entry.due_date) < new Date() && remaining > 0;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete credit entry for ${entry.party}?`)) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('credit_entries')
        .delete()
        .eq('id', entry.id);
      
      if (error) throw error;
      await refetch();
    } catch (error) {
      console.error('Error deleting credit entry:', error.message);
      toast.error('Error deleting entry: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="agri-card overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border flex justify-between items-start">
        <div>
          <h4 className="font-bold text-text-primary">{entry.party}</h4>
          <p className="text-[11px] text-text-muted uppercase font-bold">{farm?.name || 'Unknown Farm'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={entry.type === 'Credit Sale' ? 'success' : 'warning'}>
            {entry.type.toUpperCase()}
          </Badge>
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-error hover:bg-error/10 p-1 rounded transition-colors disabled:opacity-50"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>
      
      <div className="p-4 flex-1 space-y-4">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted font-bold uppercase">Item / Description</span>
            <span className="text-sm font-bold text-text-secondary">{entry.item}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-text-muted font-bold uppercase">Total Amount</span>
            <span className="text-sm font-bold text-text-primary">{formatPKR(entry.total_amount)}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-text-muted">Paid: {formatPKR((entry.advance || 0) + paid)}</span>
            <span className={remaining > 0 ? 'text-expense' : 'text-revenue'}>
              {remaining > 0 ? `Remaining: ${formatPKR(remaining)}` : 'Fully Settled'}
            </span>
          </div>
          <div className="h-2 bg-bg rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${remaining === 0 ? 'bg-revenue' : isOverdue ? 'bg-expense' : 'bg-accent-amber'}`} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px]">
          <div className="flex items-center gap-1 text-text-muted">
            <IconClock size={14} />
            <span>Due: {formatDate(entry.due_date)}</span>
          </div>
          {isOverdue && (
            <div className="flex items-center gap-1 text-expense font-bold animate-pulse">
              <IconAlertCircle size={14} />
              <span>OVERDUE</span>
            </div>
          )}
          {remaining === 0 && (
            <div className="flex items-center gap-1 text-revenue font-bold">
              <IconChecks size={14} />
              <span>PAID</span>
            </div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 bg-bg flex gap-2">
        <Button 
          size="small" 
          variant="outline" 
          className="flex-1"
          onClick={() => onViewHistory(entry)}
        >
          History
        </Button>
        {remaining > 0 && (
          <Button 
            size="small" 
            variant="primary" 
            className="flex-1"
            onClick={() => onRecordPayment(entry)}
          >
            Record Payment
          </Button>
        )}
      </div>
    </div>
  );
};

import { useCreditEntries, useFarms } from '../../hooks/queries';
import { useFilteredData } from '../../hooks/useFilteredData';
import { toast } from '../../utils/toast';

const CreditLedger = () => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const { data: farms = [] } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);
  
  const { data: rawCreditEntries = [], isLoading, refetch } = useCreditEntries(farmIds);
  const creditEntries = useFilteredData(rawCreditEntries);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  
  const [formData, setFormData] = useState({
    farm_id: farms[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    type: 'Credit Sale',
    party: '',
    item: '',
    total_amount: '',
    advance: '0',
    due_date: '',
    note: ''
  });

  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    note: ''
  });

  const stats = useMemo(() => {
    const receivable = creditEntries
      .filter(e => e.type === 'Credit Sale')
      .reduce((sum, e) => sum + (e.total_amount - (e.advance || 0) - (e.payments?.reduce((s, p) => s + p.amount, 0) || 0)), 0);
    
    const payable = creditEntries
      .filter(e => e.type === 'Credit Purchase')
      .reduce((sum, e) => sum + (e.total_amount - (e.advance || 0) - (e.payments?.reduce((s, p) => s + p.amount, 0) || 0)), 0);

    const overdueCount = creditEntries.filter(e => {
      const remaining = e.total_amount - (e.advance || 0) - (e.payments?.reduce((s, p) => s + p.amount, 0) || 0);
      return new Date(e.due_date) < new Date() && remaining > 0;
    }).length;

    return { receivable, payable, overdueCount };
  }, [creditEntries]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('credit_entries')
        .insert([{
          ...formData,
          farm_id: parseInt(formData.farm_id),
          total_amount: parseFloat(formData.total_amount) || 0,
          advance: parseFloat(formData.advance) || 0
        }]);

      if (error) throw error;
      
      await refetch();
      setIsModalOpen(false);
      setFormData({
        farm_id: farms[0]?.id || '',
        date: new Date().toISOString().split('T')[0],
        type: 'Credit Sale',
        party: '',
        item: '',
        total_amount: '',
        advance: '0',
        due_date: '',
        note: ''
      });
    } catch (error) {
      console.error('Error adding credit entry:', error.message);
      toast.error('Error adding entry: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = (entry) => {
    setSelectedEntry(entry);
    setPaymentData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      note: ''
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('credit_payments')
        .insert([{
          credit_entry_id: selectedEntry.id,
          date: paymentData.date,
          amount: parseFloat(paymentData.amount) || 0,
          note: paymentData.note
        }]);

      if (error) throw error;
      
      await refetch();
      setIsPaymentModalOpen(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Error recording payment:', error.message);
      toast.error('Error recording payment: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewHistory = (entry) => {
    setSelectedEntry(entry);
    setIsHistoryModalOpen(true);
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
          <h2 className="text-xl font-bold text-text-primary">Credit Ledger</h2>
          <p className="text-sm text-text-muted">Manage buying and selling on credit.</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <IconPlus size={18} />
          New Credit Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="agri-card p-5 border-l-4 border-revenue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Receivable (From Others)</span>
            <IconCreditCard size={20} className="text-revenue" />
          </div>
          <span className="text-lg font-bold text-revenue">{formatPKR(stats.receivable)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-expense">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Payable (You Owe)</span>
            <IconCreditCard size={20} className="text-expense" />
          </div>
          <span className="text-lg font-bold text-expense">{formatPKR(stats.payable)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-amber">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Overdue Entries</span>
            <IconAlertCircle size={20} className="text-accent-amber" />
          </div>
          <span className="text-lg font-bold text-accent-amber">{stats.overdueCount} Alerts</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creditEntries.map(entry => (
          <CreditCard 
            key={entry.id} 
            entry={entry} 
            farm={farms.find(f => f.id === entry.farm_id)} 
            onRecordPayment={handleRecordPayment}
            onViewHistory={handleViewHistory}
            refetch={refetch}
          />
        ))}
      </div>

      {/* History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        title={`Payment History: ${selectedEntry?.party}`}
      >
        <div className="space-y-4">
          <div className="bg-bg p-4 rounded-lg">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-muted">Total Amount:</span>
              <span className="font-bold">{formatPKR(selectedEntry?.total_amount)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-text-muted">Advance:</span>
              <span className="font-bold text-revenue">{formatPKR(selectedEntry?.advance)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Installments / Payments</h4>
            {selectedEntry?.payments && selectedEntry.payments.length > 0 ? (
              <div className="divide-y divide-border border rounded-lg overflow-hidden bg-white">
                {selectedEntry.payments.map((p, idx) => (
                  <div key={idx} className="p-3 flex justify-between items-center">
                    <div>
                      <p className="text-[13px] font-bold text-text-primary">{formatPKR(p.amount)}</p>
                      <p className="text-[10px] text-text-muted">{formatDate(p.date)}</p>
                    </div>
                    {p.note && <p className="text-[10px] italic text-text-secondary max-w-[150px] truncate">{p.note}</p>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center bg-white rounded-lg border border-dashed border-border">
                <p className="text-xs text-text-muted italic">No payment records found.</p>
              </div>
            )}
          </div>

          <Button 
            variant="outline" 
            className="w-full" 
            onClick={() => setIsHistoryModalOpen(false)}
          >
            Close
          </Button>
        </div>
      </Modal>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Add New Credit Entry"
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
              <label className="agri-label">Entry Type</label>
              <select 
                className="agri-input"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="Credit Sale">Credit Sale (Receivable)</option>
                <option value="Credit Purchase">Credit Purchase (Payable)</option>
              </select>
            </div>
            <div>
              <label className="agri-label">Date</label>
              <input 
                type="date" 
                className="agri-input"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="agri-label">Party Name</label>
              <input 
                type="text" 
                className="agri-input" 
                placeholder="e.g. Chaudhry Rice Mill"
                value={formData.party}
                onChange={e => setFormData({...formData, party: e.target.value})}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="agri-label">Item / Description</label>
              <input 
                type="text" 
                className="agri-input" 
                placeholder="e.g. Basmati Rice 200 maan"
                value={formData.item}
                onChange={e => setFormData({...formData, item: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="agri-label">Total Amount (PKR)</label>
              <input 
                type="number" 
                className="agri-input"
                value={formData.total_amount}
                onChange={e => setFormData({...formData, total_amount: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="agri-label">Advance Paid (PKR)</label>
              <input 
                type="number" 
                className="agri-input"
                value={formData.advance}
                onChange={e => setFormData({...formData, advance: e.target.value})}
              />
            </div>
            <div>
              <label className="agri-label">Due Date</label>
              <input 
                type="date" 
                className="agri-input"
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="agri-label">Note (Optional)</label>
              <textarea 
                className="agri-input" 
                rows="2"
                value={formData.note}
                onChange={e => setFormData({...formData, note: e.target.value})}
              ></textarea>
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
              {isSubmitting ? 'Adding...' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title={`Record Payment for ${selectedEntry?.party}`}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="agri-label">Payment Date</label>
            <input 
              type="date" 
              className="agri-input"
              value={paymentData.date}
              onChange={e => setPaymentData({...paymentData, date: e.target.value})}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="agri-label">Amount (PKR)</label>
            <input 
              type="number" 
              className="agri-input"
              placeholder="0.00"
              value={paymentData.amount}
              onChange={e => setPaymentData({...paymentData, amount: e.target.value})}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="agri-label">Note</label>
            <textarea 
              className="agri-input" 
              placeholder="Payment method, reference, etc."
              rows="3"
              value={paymentData.note}
              onChange={e => setPaymentData({...paymentData, note: e.target.value})}
            ></textarea>
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={() => setIsPaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Payment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CreditLedger;
