import React, { useMemo, useState } from 'react';
import { IconPlus, IconBuildingBank, IconTrendingUp, IconTrendingDown, IconAlertCircle, IconTrash } from '@tabler/icons-react';
import { formatPKR, formatDate } from '../../utils/format';
import { supabase } from '../../lib/supabase';
import Button from '../shared/Button';
import Badge from '../shared/Badge';
import Modal from '../shared/Modal';

const LoanCard = ({ loan, farm, onRecordRepayment, refetch }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const paid = loan.payments?.reduce((sum, p) => sum + p.amount, 0) || loan.paid || 0;
  const remaining = loan.principal - paid;
  const progress = loan.principal > 0 ? (paid / loan.principal) * 100 : 0;
  const isOverdue = loan.due_date && new Date(loan.due_date) < new Date() && remaining > 0;

  const handleDelete = async () => {
    if (!await confirmDialog(`Are you sure you want to delete loan entry for ${loan.party}?`)) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('loans')
        .delete()
        .eq('id', loan.id);
      
      if (error) throw error;
      await refetch();
    } catch (error) {
      console.error('Error deleting loan entry:', error.message);
      toast.error('Error deleting entry: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="agri-card overflow-hidden flex flex-col">
      <div className="p-4 border-b border-border flex justify-between items-start">
        <div>
          <h4 className="font-bold text-text-primary">{loan.party}</h4>
          <p className="text-[11px] text-text-muted uppercase font-bold">{farm?.name || 'Unknown Farm'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={loan.type === 'Borrowed' ? 'danger' : 'success'}>
            {loan.type === 'Borrowed' ? 'YOU BORROWED' : 'YOU LENT'}
          </Badge>
          <button 
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-error hover:bg-error/10 p-2 rounded-full transition-all disabled:opacity-50"
            title="Delete Loan Entry"
          >
            <IconTrash size={16} />
          </button>
        </div>
      </div>
      
      <div className="p-4 flex-1 space-y-4">
        <div className="flex justify-between items-end">
          <div className="flex flex-col">
            <span className="text-[10px] text-text-muted font-bold uppercase">Purpose</span>
            <span className="text-sm font-bold text-text-secondary">{loan.purpose}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-text-muted font-bold uppercase">Principal</span>
            <span className="text-sm font-bold text-text-primary">{formatPKR(loan.principal)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 text-[11px]">
          <div>
            <span className="text-text-muted block uppercase font-bold">Interest Rate</span>
            <span className="font-bold text-text-primary">{loan.interest_rate}%</span>
          </div>
          <div className="text-right">
            <span className="text-text-muted block uppercase font-bold">Monthly Install.</span>
            <span className="font-bold text-text-primary">{formatPKR(loan.monthly_install)}</span>
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-[11px] font-bold">
            <span className="text-text-muted">Paid: {formatPKR(paid)}</span>
            <span className={remaining > 0 ? (loan.type === 'Borrowed' ? 'text-expense' : 'text-accent-blue') : 'text-revenue'}>
              {remaining > 0 ? `Outstanding: ${formatPKR(remaining)}` : 'Fully Repaid'}
            </span>
          </div>
          <div className="h-2 bg-bg rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${remaining === 0 ? 'bg-revenue' : loan.type === 'Borrowed' ? 'bg-expense' : 'bg-accent-blue'}`} 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        <div className="flex justify-between items-center text-[11px]">
          <span className="text-text-muted font-bold">DUE: {formatDate(loan.due_date)}</span>
          {isOverdue && (
            <Badge variant="danger" className="animate-pulse">OVERDUE</Badge>
          )}
          {remaining === 0 && (
            <Badge variant="success">CLEARED</Badge>
          )}
        </div>
      </div>

      <div className="px-4 py-3 bg-bg">
        {remaining > 0 ? (
          <Button 
            size="small" 
            variant="outline" 
            className="w-full"
            onClick={() => onRecordRepayment(loan)}
          >
            {loan.type === 'Borrowed' ? 'Record Repayment' : 'Record Recovery'}
          </Button>
        ) : (
          <div className="text-center text-xs font-bold text-revenue py-1">Loan Settled</div>
        )}
      </div>
    </div>
  );
};

import { useLoans, useFarms } from '../../hooks/queries';
import { useFilteredData } from '../../hooks/useFilteredData';
import { toast } from '../../utils/toast';
import { confirmDialog } from '../../utils/confirmDialog';

const Loans = () => {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const { data: farms = [] } = useFarms(currentOrgId);
  const farmIds = farms.map(f => f.id);
  
  const { data: rawLoans = [], isLoading, refetch } = useLoans(farmIds);
  const loans = useFilteredData(rawLoans);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRepaymentModalOpen, setIsRepaymentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  
  const [formData, setFormData] = useState({
    farm_id: farms.length > 0 ? farms[0].id : '',
    date: new Date().toISOString().split('T')[0],
    type: 'Borrowed',
    party: '',
    purpose: '',
    principal: '',
    interest_rate: '0',
    tenure_months: '0',
    monthly_install: '0',
    due_date: '',
    note: ''
  });

  const [repaymentData, setRepaymentData] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    note: ''
  });

  const stats = useMemo(() => {
    const totalBorrowed = loans.filter(l => l.type === 'Borrowed').reduce((s, l) => {
      const paid = l.payments?.reduce((sum, p) => sum + p.amount, 0) || l.paid || 0;
      return s + (l.principal - paid);
    }, 0);
    const totalLent = loans.filter(l => l.type === 'Lent').reduce((s, l) => {
      const paid = l.payments?.reduce((sum, p) => sum + p.amount, 0) || l.paid || 0;
      return s + (l.principal - paid);
    }, 0);
    const repaid = loans.filter(l => l.type === 'Borrowed').reduce((s, l) => {
      const paid = l.payments?.reduce((sum, p) => sum + p.amount, 0) || l.paid || 0;
      return s + paid;
    }, 0);
    
    return { totalBorrowed, totalLent, repaid };
  }, [loans]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('loans')
        .insert([{
          ...formData,
          farm_id: parseInt(formData.farm_id),
          principal: parseFloat(formData.principal) || 0,
          interest_rate: parseFloat(formData.interest_rate) || 0,
          tenure_months: parseInt(formData.tenure_months) || 0,
          monthly_install: parseFloat(formData.monthly_install) || 0,
          paid: 0
        }]);

      if (error) throw error;
      
      await refetch();
      setIsModalOpen(false);
      setFormData({
        farm_id: farms.length > 0 ? farms[0].id : '',
        date: new Date().toISOString().split('T')[0],
        type: 'Borrowed',
        party: '',
        purpose: '',
        principal: '',
        interest_rate: '0',
        tenure_months: '0',
        monthly_install: '0',
        due_date: '',
        note: ''
      });
    } catch (error) {
      console.error('Error adding loan:', error.message);
      toast.error('Error adding loan: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordRepayment = (loan) => {
    setSelectedLoan(loan);
    setRepaymentData({
      date: new Date().toISOString().split('T')[0],
      amount: '',
      note: ''
    });
    setIsRepaymentModalOpen(true);
  };

  const handleRepaymentSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const amount = parseFloat(repaymentData.amount) || 0;
      
      // 1. Insert into loan_payments
      const { error: paymentError } = await supabase
        .from('loan_payments')
        .insert([{
          loan_id: selectedLoan.id,
          date: repaymentData.date,
          amount: amount,
          note: repaymentData.note
        }]);

      if (paymentError) throw paymentError;

      // 2. Update paid amount on loan table (legacy support)
      const newPaidAmount = (selectedLoan.paid || 0) + amount;
      const { error: updateError } = await supabase
        .from('loans')
        .update({ paid: newPaidAmount })
        .eq('id', selectedLoan.id);

      if (updateError) throw updateError;
      
      await refetch();
      setIsRepaymentModalOpen(false);
      setSelectedLoan(null);
    } catch (error) {
      console.error('Error recording repayment:', error.message);
      toast.error('Error recording repayment: ' + error.message);
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
          <h2 className="text-xl font-bold text-text-primary">Loans & Borrowed</h2>
          <p className="text-sm text-text-muted">Track your liabilities and receivables.</p>
        </div>
        <Button variant="primary" onClick={() => setIsModalOpen(true)}>
          <IconPlus size={18} />
          Record New Loan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="agri-card p-5 border-l-4 border-expense">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Borrowed (Debt)</span>
            <IconTrendingDown size={20} className="text-expense" />
          </div>
          <span className="text-lg font-bold text-expense">{formatPKR(stats.totalBorrowed)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-revenue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Total Repaid</span>
            <IconTrendingUp size={20} className="text-revenue" />
          </div>
          <span className="text-lg font-bold text-revenue">{formatPKR(stats.repaid)}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-blue">
          <div className="flex justify-between items-start mb-2">
            <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider">Money Lent (Receivable)</span>
            <IconBuildingBank size={20} className="text-accent-blue" />
          </div>
          <span className="text-lg font-bold text-accent-blue">{formatPKR(stats.totalLent)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loans.length > 0 ? (
          loans.map(loan => (
            <LoanCard 
              key={loan.id} 
              loan={loan} 
              farm={farms.find(f => f.id === loan.farm_id)} 
              onRecordRepayment={handleRecordRepayment}
              refetch={refetch}
            />
          ))
        ) : (
          <div className="col-span-full py-10 agri-card text-center opacity-40">
            <p className="text-sm font-bold">No loans recorded yet.</p>
          </div>
        )}
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Record New Loan"
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
              <label className="agri-label">Loan Type</label>
              <select 
                className="agri-input"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
              >
                <option value="Borrowed">Borrowed</option>
                <option value="Lent">Lent</option>
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
                placeholder="e.g. Bank, Person Name"
                value={formData.party}
                onChange={e => setFormData({...formData, party: e.target.value})}
                required
              />
            </div>
            <div className="col-span-2">
              <label className="agri-label">Purpose</label>
              <input 
                type="text" 
                className="agri-input" 
                placeholder="e.g. Tractor Purchase"
                value={formData.purpose}
                onChange={e => setFormData({...formData, purpose: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="agri-label">Principal Amount (PKR)</label>
              <input 
                type="number" 
                className="agri-input"
                value={formData.principal}
                onChange={e => setFormData({...formData, principal: e.target.value})}
                required
              />
            </div>
            <div>
              <label className="agri-label">Interest Rate (%)</label>
              <input 
                type="number"
                step="0.1" 
                className="agri-input"
                value={formData.interest_rate}
                onChange={e => setFormData({...formData, interest_rate: e.target.value})}
              />
            </div>
            <div>
              <label className="agri-label">Tenure (Months)</label>
              <input 
                type="number" 
                className="agri-input"
                value={formData.tenure_months}
                onChange={e => setFormData({...formData, tenure_months: e.target.value})}
              />
            </div>
            <div>
              <label className="agri-label">Monthly Installment</label>
              <input 
                type="number" 
                className="agri-input"
                value={formData.monthly_install}
                onChange={e => setFormData({...formData, monthly_install: e.target.value})}
              />
            </div>
            <div className="col-span-2">
              <label className="agri-label">Due Date</label>
              <input 
                type="date" 
                className="agri-input"
                value={formData.due_date}
                onChange={e => setFormData({...formData, due_date: e.target.value})}
                required
              />
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
              {isSubmitting ? 'Saving...' : 'Save Loan'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRepaymentModalOpen}
        onClose={() => setIsRepaymentModalOpen(false)}
        title={`Record ${selectedLoan?.type === 'Borrowed' ? 'Repayment' : 'Recovery'} for ${selectedLoan?.party}`}
      >
        <form onSubmit={handleRepaymentSubmit} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="agri-label">Date</label>
            <input 
              type="date" 
              className="agri-input"
              value={repaymentData.date}
              onChange={e => setRepaymentData({...repaymentData, date: e.target.value})}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="agri-label">Amount (PKR)</label>
            <input 
              type="number" 
              className="agri-input"
              placeholder="0.00"
              value={repaymentData.amount}
              onChange={e => setRepaymentData({...repaymentData, amount: e.target.value})}
              required
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="agri-label">Note</label>
            <textarea 
              className="agri-input" 
              placeholder="Reference, bank deposit details..."
              rows="3"
              value={repaymentData.note}
              onChange={e => setRepaymentData({...repaymentData, note: e.target.value})}
            ></textarea>
          </div>
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              className="flex-1" 
              onClick={() => setIsRepaymentModalOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              variant="primary" 
              className="flex-1"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Loans;
