import { useState, useEffect } from 'react';
import { IconShieldLock, IconUsers, IconCircleCheck, IconCircleX, IconLoader2, IconSearch } from '@tabler/icons-react';
import Button from '../../shared/Button';
import Badge from '../../shared/Badge';
import Modal from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../utils/toast';

const AdminPanel = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [searchTerm, setSearchSearchTerm] = useState('');
  const [proModalOrg, setProModalOrg] = useState(null);
  const [proMonths, setProMonths] = useState('1');

  const fetchAllOrgs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select(`
          *,
          organization_members(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error) {
      console.error('Admin Error:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    fetchAllOrgs();
  }, []);

  const applyTierChange = async (orgId, newTier, months = 1) => {
    setUpdatingId(orgId);

    const expiryDate = newTier === 'pro'
      // eslint-disable-next-line react-hooks/purity -- expiry computed in an event handler, not render
      ? new Date(Date.now() + months * 30 * 24 * 60 * 60 * 1000).toISOString()
      : null;

    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          subscription_tier: newTier,
          subscription_status: newTier === 'pro' ? 'active' : 'inactive',
          subscription_expires_at: expiryDate
        })
        .eq('id', orgId);

      if (error) throw error;

      setOrganizations(prev => prev.map(org =>
        org.id === orgId ? {
          ...org,
          subscription_tier: newTier,
          subscription_status: newTier === 'pro' ? 'active' : 'inactive',
          subscription_expires_at: expiryDate
        } : org
      ));
    } catch (error) {
      toast.error('Error updating plan: ' + error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleTierAction = (org) => {
    if (org.subscription_tier === 'pro') {
      applyTierChange(org.id, 'free');
    } else {
      setProMonths('1');
      setProModalOrg(org);
    }
  };

  const confirmActivatePro = async () => {
    if (!proModalOrg) return;
    const orgId = proModalOrg.id;
    const months = parseInt(proMonths) || 1;
    setProModalOrg(null);
    await applyTierChange(orgId, 'pro', months);
  };

  const filteredOrgs = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
            <IconShieldLock className="text-primary" size={24} />
            System Administration
          </h2>
          <p className="text-sm text-text-muted">Manage all organizations and manual Pro activations.</p>
        </div>
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
          <input 
            type="text" 
            placeholder="Search organizations..."
            className="agri-input pl-10 w-64"
            value={searchTerm}
            onChange={(e) => setSearchSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="agri-card p-5 border-l-4 border-primary">
          <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">Total Organizations</span>
          <span className="text-2xl font-bold">{organizations.length}</span>
        </div>
        <div className="agri-card p-5 border-l-4 border-revenue">
          <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">Pro Organizations</span>
          <span className="text-2xl font-bold text-revenue">
            {organizations.filter(o => o.subscription_tier === 'pro').length}
          </span>
        </div>
        <div className="agri-card p-5 border-l-4 border-accent-amber">
          <span className="text-[10px] font-bold text-text-muted uppercase block mb-1">Free Tier</span>
          <span className="text-2xl font-bold text-accent-amber">
            {organizations.filter(o => o.subscription_tier !== 'pro').length}
          </span>
        </div>
      </div>

      <div className="agri-card overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="agri-table-header">
              <th className="px-6 py-3">Organization Name</th>
              <th className="px-6 py-3">Created Date</th>
              <th className="px-6 py-3">Users</th>
              <th className="px-6 py-3 text-center">Plan Tier</th>
              <th className="px-6 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <IconLoader2 className="animate-spin mx-auto text-primary" size={32} />
                  <p className="mt-2 text-sm text-text-muted">Loading organization data...</p>
                </td>
              </tr>
            ) : filteredOrgs.length > 0 ? (
              filteredOrgs.map((org) => (
                <tr key={org.id} className="agri-table-row">
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-text-primary">{org.name}</span>
                      <span className="text-[10px] text-text-muted font-mono">{org.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-text-secondary">
                    {new Date(org.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <IconUsers size={16} className="text-text-muted" />
                      <span className="text-sm font-bold">{org.organization_members?.[0]?.count || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Badge variant={org.subscription_tier === 'pro' ? 'success' : 'primary'}>
                      {org.subscription_tier?.toUpperCase() || 'FREE'}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button 
                      size="small" 
                      variant={org.subscription_tier === 'pro' ? 'outline' : 'primary'}
                      onClick={() => handleTierAction(org)}
                      disabled={updatingId === org.id}
                    >
                      {updatingId === org.id ? (
                        <IconLoader2 className="animate-spin" size={14} />
                      ) : org.subscription_tier === 'pro' ? (
                        <>
                          <IconCircleX size={14} />
                          Revoke Pro
                        </>
                      ) : (
                        <>
                          <IconCircleCheck size={14} />
                          Activate Pro
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-text-muted">
                  No organizations found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={!!proModalOrg}
        onClose={() => setProModalOrg(null)}
        title="Activate Pro Access"
      >
        <form
          onSubmit={(e) => { e.preventDefault(); confirmActivatePro(); }}
          className="space-y-4"
        >
          <p className="text-sm text-text-secondary">
            Grant Pro access to <strong className="text-text-primary">{proModalOrg?.name}</strong>. Choose the duration below.
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor="pro-months" className="agri-label">Months of Pro access</label>
            <input
              id="pro-months"
              type="number"
              min="1"
              required
              autoFocus
              className="agri-input"
              value={proMonths}
              onChange={(e) => setProMonths(e.target.value)}
            />
          </div>
          <div className="pt-2 flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setProModalOrg(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1">
              Activate Pro
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AdminPanel;
