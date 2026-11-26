import { useState, useRef, useEffect, useMemo } from 'react';
import { IconSearch, IconChevronDown, IconPlus, IconPhone, IconUser, IconReceipt2, IconCheck, IconX } from '@tabler/icons-react';
import { formatPKR } from '../../utils/format';
import { useParties } from '../../hooks/useParties';
import { supabase } from '../../lib/supabase';
import { toast } from '../../utils/toast';
import Modal from './Modal';
import Button from './Button';

export default function PartySelect({
  value = '',
  onChange,
  onSelectParty,
  onViewLedger,
  label = 'Party Name',
  placeholder = 'Search by name or phone, or add new party...',
  required = false,
  disabled = false,
  className = ''
}) {
  const currentOrgId = localStorage.getItem('agripro_current_org_id');
  const { parties, partiesMap, getParty, refetch } = useParties(currentOrgId);

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value || '');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [isSubmittingQuickAdd, setIsSubmittingQuickAdd] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Sync internal searchTerm with external value
  useEffect(() => {
    setSearchTerm(value || '');
  }, [value]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter parties by name or phone/contact
  const filteredParties = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return parties;
    return parties.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(query);
      const phoneMatch = p.contact && p.contact.replace(/\D/g, '').includes(query.replace(/\D/g, ''));
      return nameMatch || phoneMatch;
    });
  }, [parties, searchTerm]);

  // Selected party object if value matches
  const selectedParty = useMemo(() => {
    if (!value) return null;
    return getParty(value);
  }, [value, partiesMap]);

  const handleSelect = (party) => {
    onChange?.(party.name);
    onSelectParty?.(party);
    setSearchTerm(party.name);
    setIsOpen(false);
  };

  const handleInputChange = (e) => {
    const text = e.target.value;
    setSearchTerm(text);
    onChange?.(text);
    if (!isOpen) setIsOpen(true);
  };

  // Quick Add State
  const [newPartyData, setNewPartyData] = useState({
    name: '',
    type: 'Vendor',
    contact: '',
    address: '',
    note: ''
  });

  const openQuickAdd = (prefillName = '') => {
    setNewPartyData({
      name: prefillName || searchTerm || '',
      type: 'Vendor',
      contact: '',
      address: '',
      note: ''
    });
    setIsOpen(false);
    setIsQuickAddOpen(true);
  };

  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!newPartyData.name.trim()) {
      toast.error('Please enter a party name');
      return;
    }

    setIsSubmittingQuickAdd(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const payload = {
        name: newPartyData.name.trim(),
        type: newPartyData.type,
        contact: newPartyData.contact ? newPartyData.contact.trim() : '',
        address: newPartyData.address ? newPartyData.address.trim() : '',
        note: newPartyData.note ? newPartyData.note.trim() : '',
        org_id: currentOrgId,
        user_id: user?.id || null
      };

      const { data, error } = await supabase.from('vendors_buyers').insert([payload]).select();
      if (error) throw error;

      toast.success(`Party "${payload.name}" added successfully`);
      await refetch();

      const createdParty = {
        name: payload.name,
        contact: payload.contact,
        type: payload.type,
        address: payload.address,
        vendorBuyerId: data?.[0]?.id || null,
        weOwe: 0,
        theyOwe: 0,
        netBalance: 0
      };

      handleSelect(createdParty);
      setIsQuickAddOpen(false);
    } catch (err) {
      console.error('Error adding party:', err);
      toast.error('Error adding party: ' + err.message);
    } finally {
      setIsSubmittingQuickAdd(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <div className="flex justify-between items-center mb-1">
          <label className="agri-label mb-0">{label} {required && <span className="text-error">*</span>}</label>
          {selectedParty && onViewLedger && (
            <button
              type="button"
              onClick={() => onViewLedger(selectedParty)}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <IconReceipt2 size={14} />
              View Ledger
            </button>
          )}
        </div>
      )}

      {/* Input Field with Dropdown Toggle */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          className="agri-input pr-16"
          placeholder={placeholder}
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          required={required}
          disabled={disabled}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-text-muted">
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                onChange?.('');
                inputRef.current?.focus();
              }}
              className="hover:text-text-primary p-1"
              title="Clear"
            >
              <IconX size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsOpen(prev => !prev)}
            className="hover:text-text-primary p-1"
            title="Toggle parties list"
          >
            <IconChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[1050] bg-white rounded-xl shadow-2xl border border-border max-h-72 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header Action: Add New Party */}
          <div className="p-2 border-b border-border bg-bg/50 flex justify-between items-center text-xs">
            <span className="font-bold text-text-muted uppercase">Existing Parties ({parties.length})</span>
            <button
              type="button"
              onClick={() => openQuickAdd(searchTerm)}
              className="font-bold text-primary hover:text-primary-dark flex items-center gap-1 bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md transition-colors"
            >
              <IconPlus size={14} />
              Add New Party
            </button>
          </div>

          {/* List of matching parties */}
          {filteredParties.length > 0 ? (
            <div className="divide-y divide-border/50">
              {filteredParties.map((party) => {
                const isSelected = party.name.toLowerCase() === value.toLowerCase();
                return (
                  <div
                    key={party.normalizedName}
                    onClick={() => handleSelect(party)}
                    className={`p-3 cursor-pointer flex items-center justify-between gap-3 hover:bg-bg transition-colors ${
                      isSelected ? 'bg-primary/5 font-semibold' : ''
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-text-primary truncate">{party.name}</span>
                        {party.type && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-bg text-text-muted shrink-0">
                            {party.type}
                          </span>
                        )}
                        {isSelected && <IconCheck size={16} className="text-primary shrink-0" />}
                      </div>

                      {party.contact && (
                        <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                          <IconPhone size={12} className="shrink-0" />
                          <span>{party.contact}</span>
                        </div>
                      )}
                    </div>

                    {/* Financial Metric Badge */}
                    <div className="text-right shrink-0">
                      {party.weOwe > party.theyOwe ? (
                        <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                          You Owe: {formatPKR(party.weOwe - party.theyOwe)}
                        </span>
                      ) : party.theyOwe > party.weOwe ? (
                        <span className="inline-block text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Owes You: {formatPKR(party.theyOwe - party.weOwe)}
                        </span>
                      ) : (
                        <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
                          Cleared
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-4 text-center">
              <p className="text-sm text-text-muted mb-2">No matching party found for "{searchTerm}"</p>
              <button
                type="button"
                onClick={() => openQuickAdd(searchTerm)}
                className="text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <IconPlus size={14} />
                Create "{searchTerm}" as a new party
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected Party Summary Bar */}
      {selectedParty && (
        <div className="mt-1.5 p-2 bg-bg rounded-lg border border-border/80 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-bold text-text-primary truncate">{selectedParty.name}</span>
            {selectedParty.contact && (
              <span className="text-text-muted flex items-center gap-0.5 shrink-0">
                <IconPhone size={11} />
                {selectedParty.contact}
              </span>
            )}
            {selectedParty.weOwe > selectedParty.theyOwe ? (
              <span className="text-[10px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded shrink-0">
                You Owe: {formatPKR(selectedParty.weOwe - selectedParty.theyOwe)}
              </span>
            ) : selectedParty.theyOwe > selectedParty.weOwe ? (
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded shrink-0">
                Owes You: {formatPKR(selectedParty.theyOwe - selectedParty.weOwe)}
              </span>
            ) : null}
          </div>

          {onViewLedger && (
            <button
              type="button"
              onClick={() => onViewLedger(selectedParty)}
              className="text-primary hover:text-primary-dark font-bold underline flex items-center gap-1 shrink-0"
              title="View full statement and history"
            >
              <IconReceipt2 size={13} />
              Statement
            </button>
          )}
        </div>
      )}

      {/* Quick Add Party Modal */}
      <Modal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        title="Add New Party / Contact"
        zIndex="z-[1100]"
        size="md"
      >
        <form onSubmit={handleQuickAddSubmit} className="space-y-4">
          <div>
            <label className="agri-label">Party / Person Name *</label>
            <input
              type="text"
              className="agri-input"
              placeholder="e.g. Ali Khan, Habib Bank, Al-Madina Traders"
              value={newPartyData.name}
              onChange={(e) => setNewPartyData({ ...newPartyData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="agri-label">Party Role / Type</label>
              <select
                className="agri-input"
                value={newPartyData.type}
                onChange={(e) => setNewPartyData({ ...newPartyData, type: e.target.value })}
              >
                <option value="Vendor">Vendor / Supplier</option>
                <option value="Buyer">Buyer / Customer</option>
                <option value="Lender">Lender / Bank</option>
                <option value="Borrower">Borrower</option>
                <option value="Other">Other / General</option>
              </select>
            </div>

            <div>
              <label className="agri-label">Phone / WhatsApp</label>
              <input
                type="text"
                className="agri-input"
                placeholder="e.g. 0300-1234567"
                value={newPartyData.contact}
                onChange={(e) => setNewPartyData({ ...newPartyData, contact: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="agri-label">Address / Location (Optional)</label>
            <input
              type="text"
              className="agri-input"
              placeholder="e.g. Grain Market, Chak 42"
              value={newPartyData.address}
              onChange={(e) => setNewPartyData({ ...newPartyData, address: e.target.value })}
            />
          </div>

          <div>
            <label className="agri-label">Notes (Optional)</label>
            <textarea
              className="agri-input"
              rows="2"
              placeholder="Any details, references, or agreements..."
              value={newPartyData.note}
              onChange={(e) => setNewPartyData({ ...newPartyData, note: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsQuickAddOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              disabled={isSubmittingQuickAdd}
            >
              {isSubmittingQuickAdd ? 'Saving...' : 'Save & Select Party'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
