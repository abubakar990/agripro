import { useMemo, useState, useEffect } from 'react';
import { IconPlus, IconCreditCard, IconClock, IconChecks, IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import { paidAmount, creditOutstanding, toNumber as num } from '../../utils/finance';
import { supabase } from '../../lib/supabase';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';
import { useCreditEntries, useFarms } from '../../hooks/queries';
import { useFarmFilteredData } from '../../hooks/useFilteredData';
import { useGlobalStore } from '../../store/globalStore';
import { toast } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirmDialog';

const CreditCard = ({ entry, farm, onRecordPayment, onViewHistory, refetch }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const paid = paidAmount(entry);
  const remaining = creditOutstanding(entry);
  const total = num(entry.total_amount);
  const progress = total > 0 ? Math.min(100, (paid / total) * 100) : 0;
  
  const isOverdue = entry.due_date && new Date(entry.due_date) < new Date() && remaining > 0;

  const handleDelete = async () => {
    if (!await confirmDialog(`Are you sure you want to delete credit entry for ${entry.party}?`)) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('credit_entries')
        .delete()
        .eq('id', entry.id);
      
      if (error) throw error;
      toast.success('Credit entry deleted');
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
            title="Delete Entry"
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
            <span className="text-text-muted">Paid: {formatPKR(paid)}</span>
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
            <span>Due: {entry.due_date ? formatDate(entry.due_date) : 'No Due Date'}</span>
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

const CreditLedger = () => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const farmFilter = useGlobalStore(state => state.farmFilter);
  const { data: farms = [] } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);
  
  const { data: rawCreditEntries = [], isLoading, refetch } = useCreditEntries(farmIds);
  // Outstanding balances are point-in-time: filtering by origination date would hide
  // older unpaid entries and understate what is still receivable/payable.
  const creditEntries = useFarmFilteredData(rawCreditEntries);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);

  const getInitialFarmId = () => {
    if (farmFilter !== 'all' && farms.some(f => String(f.id) === String(farmFilter))) {
      return Number(farmFilter);
    }
    return farms[0]?.id || '';
  };
  
  const [formData, setFormData] = useState({
    farm_id: getInitialFarmId(),
    date: new Date().toISOString().split('T')[0],
    type: 'Credit Sale',
    party: '',
    item: '',
    total_amount: '',
    advance: '0',
    due_date: '',
    note: ''
  });

  // Sync default farm_id when farms finish loading
  useEffect(() => {
    if (farms.length > 0 && !formData.farm_id) {
      setFormData(prev => ({
        ...prev,
        farm_id: getInitialFarmId()
      }));
    }
  }, [farms, farmFilter]);

  const [paymentData, setPaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    note: ''
  });

  const stats = useMemo(() => {
    const receivable = creditEntries
      .filter(e => e.type === 'Credit Sale')
      .reduce((sum, e) => sum + creditOutstanding(e), 0);

    const payable = creditEntries
      .filter(e => e.type === 'Credit Purchase')
      .reduce((sum, e) => sum + creditOutstanding(e), 0);

    const overdueCount = creditEntries.filter(e => (
      e.due_date && new Date(e.due_date) < new Date() && creditOutstanding(e) > 0
    )).length;

    return { receivable, payable, overdueCount };
  }, [creditEntries]);

  const openAddModal = () => {
    setFormData({
      farm_id: getInitialFarmId(),
      date: new Date().toISOString().split('T')[0],
      type: 'Credit Sale',
      party: '',
      item: '',
      total_amount: '',
      advance: '0',
      due_date: '',
      note: ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const targetFarmId = formData.farm_id 
        ? parseInt(formData.farm_id) 
        : (farms.length > 0 ? farms[0].id : null);

      if (!targetFarmId || isNaN(targetFarmId)) {
        toast.error('Please select a valid farm. Create a farm first if none exist.');
        setIsSubmitting(false);
        return;
      }

      const totalAmount = parseFloat(formData.total_amount);
      if (isNaN(totalAmount) || totalAmount <= 0) {
        toast.error('Please enter a valid total amount.');
        setIsSubmitting(false);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      const payload = {
        farm_id: targetFarmId,
        date: formData.date || new Date().toISOString().split('T')[0],
        type: formData.type || 'Credit Sale',
        party: formData.party?.trim() || '',
        item: formData.item?.trim() || '',
        total_amount: totalAmount,
        advance: parseFloat(formData.advance) || 0,
        due_date: formData.due_date ? formData.due_date : null,
        note: formData.note ? formData.note.trim() : null
      };

      if (currentUserId) {
        payload.user_id = currentUserId;
      }

      const { error } = await supabase
        .from('credit_entries')
        .insert([payload]);

      if (error) throw error;
      
      toast.success('Credit entry added successfully');
      await refetch();
      setIsModalOpen(false);
      openAddModal();
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
      const amount = parseFloat(paymentData.amount) || 0;
      if (amount <= 0) {
        toast.error('Please enter a valid payment amount.');
        setIsSubmitting(false);
        return;
      }

      const { data: authData } = await supabase.auth.getUser();
      const currentUserId = authData?.user?.id || null;

      const paymentPayload = {
        credit_entry_id: selectedEntry.id,
        date: paymentData.date,
        amount: amount,
        note: paymentData.note ? paymentData.note.trim() : null
      };

      if (currentUserId) {
        paymentPayload.user_id = currentUserId;
      }

      const { error } = await supabase
        .from('credit_payments')
        .insert([paymentPayload]);

      if (error) throw error;
      
      toast.success('Payment recorded successfully');
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
        <Button variant="primary" onClick={openAddModal}>
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
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Overdue Invoices</span>
            <IconClock size={20} className="text-accent-amber" />
          </div>
          <span className="text-lg font-bold text-accent-amber">{stats.overdueCount}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {creditEntries.length > 0 ? (
          creditEntries.map(entry => (
            <CreditCard 
              key={entry.id} 
              entry={entry} 
              farm={farms.find(f => f.id === entry.farm_id)}
              onRecordPayment={handleRecordPayment}
              onViewHistory={handleViewHistory}
              refetch={refetch}
            />
          ))
        ) : (
          <div className="col-span-full py-10 agri-card text-center opacity-40">
            <p className="text-sm font-bold">No credit entries recorded yet.</p>
          </div>
        )}
      </div>

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
                value={formData.farm_id || (farms[0]?.id ?? '')}
                onChange={e => setFormData({...formData, farm_id: e.target.value})}
                required
              >
                {farms.length === 0 ? (
                  <option value="">No farms available</option>
                ) : (
                  farms.map(f => <option key={f.id} value={f.id}>{f.name}</option>)
                )}
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
            <div className="col-span-2">
              <label className="agri-label">Due Date (Optional)</label>
              <input 
                type="date" 
                className="agri-input"
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <label className="agri-label">Note (Optional)</label>
              <textarea 
                className="agri-input" 
                rows="2"
                placeholder="Additional details, terms..."
                value={formData.note}
                onChange={e => setFormData({...formData, note: e.target.value})}
              ></textarea>
            </div>
          </div>
          {farms.length === 0 && (
            <p className="text-xs text-error font-medium">
              Please add at least one farm before recording a credit entry.
            </p>
          )}
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
              disabled={isSubmitting || farms.length === 0}
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

      {/* Payment History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={() => { setIsHistoryModalOpen(false); setSelectedEntry(null); }}
        title={`Payment History - ${selectedEntry?.party}`}
      >
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-bg p-3 rounded-lg text-sm">
            <div>
              <span className="text-text-muted text-xs block">Total Amount</span>
              <span className="font-bold">{selectedEntry ? formatPKR(selectedEntry.total_amount) : 0}</span>
            </div>
            <div>
              <span className="text-text-muted text-xs block">Advance Paid</span>
              <span className="font-bold">{selectedEntry ? formatPKR(selectedEntry.advance) : 0}</span>
            </div>
            <div>
              <span className="text-text-muted text-xs block">Remaining</span>
              <span className="font-bold text-expense">{selectedEntry ? formatPKR(creditOutstanding(selectedEntry)) : 0}</span>
            </div>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedEntry?.payments && selectedEntry.payments.length > 0 ? (
              selectedEntry.payments.map((p, idx) => (
                <div key={p.id || idx} className="flex justify-between items-center p-2 border-b border-border text-sm">
                  <div>
                    <span className="font-medium text-text-primary">{formatDate(p.date)}</span>
                    {p.note && <span className="text-xs text-text-muted block">{p.note}</span>}
                  </div>
                  <span className="font-bold text-revenue">+{formatPKR(p.amount)}</span>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-text-muted py-4">No payments recorded yet.</p>
            )}
          </div>

          <div className="pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full" 
              onClick={() => { setIsHistoryModalOpen(false); setSelectedEntry(null); }}
            >
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CreditLedger;
