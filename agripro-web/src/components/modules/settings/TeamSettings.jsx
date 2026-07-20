import React, { useState, useEffect } from 'react';
import { 
  IconUserPlus, 
  IconMail, 
  IconShieldCheck, 
  IconUser, 
  IconTrash, 
  IconLoader2, 
  IconCircleCheck, 
  IconHistory, 
  IconLockAccess,
  IconPlant,
  IconCheck
} from '@tabler/icons-react';
import Button from '../../shared/Button';
import Badge from '../../shared/Badge';
import Modal from '../../shared/Modal';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../utils/toast';

const TeamSettings = ({ currentOrg, user, farms = [] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [accessType, setAccessType] = useState('all');
  const [selectedFarms, setSelectedFarms] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [memberDetails, setMemberDetails] = useState({});
  const [pendingInvites, setPendingInvites] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);

  const members = currentOrg?.organization_members || [];
  const isOwner = members.find(m => m.user_id === user.id)?.role === 'owner';

  // Fetch profiles, invites AND logs
  useEffect(() => {
    const fetchMemberProfiles = async () => {
      const userIds = members.map(m => m.user_id);
      if (userIds.length === 0) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (!error && data) {
        const details = {};
        data.forEach(p => {
          details[p.id] = p;
        });
        setMemberDetails(details);
      }
    };

    const fetchInvites = async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('org_id', currentOrg.id);
      
      if (!error) setPendingInvites(data || []);
    };

    const fetchLogs = async () => {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('org_id', currentOrg.id)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error) setActivityLogs(data || []);
    };

    fetchMemberProfiles();
    if (currentOrg?.id) {
      fetchInvites();
      fetchLogs();
    }
  }, [members, currentOrg?.id]);

  const handleInvite = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const farmAccess = accessType === 'all' 
      ? { type: 'all' } 
      : { type: 'specific', farm_ids: selectedFarms };

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email.toLowerCase())
        .maybeSingle();

      if (profile) {
        const { error } = await supabase
          .from('organization_members')
          .insert([{
            org_id: currentOrg.id,
            user_id: profile.id,
            role: role,
            farm_access: farmAccess
          }]);

        if (error) throw error;
        
        setMessage({ type: 'success', text: `Successfully added ${email} to the team.` });
      } else {
        const { error } = await supabase
          .from('invitations')
          .insert([{
            org_id: currentOrg.id,
            email: email.toLowerCase(),
            role: role,
            invited_by: user.id,
            farm_access: farmAccess
          }]);

        if (error) {
          if (error.code === '23505') throw new Error('An invitation for this email is already pending.');
          throw error;
        }

        await supabase.functions.invoke('send-invite-email', {
          body: {
            email: email.toLowerCase(),
            orgName: currentOrg.name,
            invitedBy: user.user_metadata?.full_name || user.email,
            inviteLink: import.meta.env.VITE_SITE_URL || window.location.origin
          }
        });

        setMessage({ type: 'success', text: `Invitation sent to ${email}.` });
      }

      setEmail('');
      setSelectedFarms([]);
      setIsModalOpen(false);
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeMember = async (memberId, memberUserId) => {
    if (!window.confirm('Are you sure you want to remove this member?')) return;
    
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('id', memberId);
      
      if (error) throw error;
    } catch (error) {
      toast.error('Error removing member: ' + error.message);
    }
  };

  const cancelInvite = async (inviteId, inviteEmail) => {
    if (!window.confirm('Cancel this invitation?')) return;
    
    try {
      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', inviteId);
      
      if (error) throw error;
      setPendingInvites(prev => prev.filter(i => i.id !== inviteId));
    } catch (error) {
      toast.error('Error canceling invite: ' + error.message);
    }
  };

  const toggleFarmSelection = (farmId) => {
    setSelectedFarms(prev => 
      prev.includes(farmId) 
        ? prev.filter(id => id !== farmId) 
        : [...prev, farmId]
    );
  };

  const renderLogDetails = (log) => {
    const { action, details } = log;
    const actionClean = action.replace(/_/g, ' ');
    
    if (action === 'invite_sent') {
      return `Sent invitation to ${details?.email} (${details?.role})`;
    }
    
    if (action.endsWith('_created')) {
      const module = action.split('_')[0];
      return `Created new ${module}: ${details?.name || details?.item || details?.category || 'record'}`;
    }

    if (action.endsWith('_updated')) {
      const module = action.split('_')[0];
      return `Updated ${module} record #${details?.new?.id}`;
    }

    if (action.endsWith('_deleted')) {
      const module = action.split('_')[0];
      return `Deleted ${module} record: ${details?.name || details?.item || details?.category || 'record'}`;
    }

    return actionClean;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold text-text-primary">Team Management</h2>
          <p className="text-sm text-text-muted">Manage users, roles, and granular farm access within {currentOrg?.name}.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setShowLogs(!showLogs)}>
            <IconHistory size={18} />
            {showLogs ? 'Hide Logs' : 'Activity Logs'}
          </Button>
          {isOwner && (
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              <IconUserPlus size={18} />
              Invite Member
            </Button>
          )}
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-md flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {message.type === 'success' ? <IconCircleCheck size={20} /> : <IconMail size={20} />}
          <span className="text-sm font-medium">{message.text}</span>
        </div>
      )}

      {showLogs && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider flex items-center gap-2">
            <IconHistory size={16} />
            Recent Team Activity
          </h3>
          <div className="agri-card p-4 space-y-1">
            <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {activityLogs.length > 0 ? activityLogs.map((log) => (
                <div key={log.id} className="flex items-start justify-between py-3 border-b border-border/50 last:border-0 hover:bg-bg/50 px-2 rounded-lg transition-colors">
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-primary flex-shrink-0 shadow-sm border border-border">
                      <IconUser size={16} />
                    </div>
                    <div>
                      <p className="text-sm text-text-primary">
                        <span className="font-bold">{memberDetails[log.user_id]?.full_name || 'System'}</span>
                        <span className="mx-1 text-text-muted">•</span>
                        <span className="text-text-secondary">{renderLogDetails(log)}</span>
                      </p>
                      <p className="text-[10px] text-text-muted mt-0.5">{new Date(log.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-text-muted text-center py-8">No recent activity logs found.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Active Members</h3>
        <div className="agri-card overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="agri-table-header">
                <th className="px-6 py-3">Member</th>
                <th className="px-6 py-3">Role</th>
                <th className="px-6 py-3">Access</th>
                <th className="px-6 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="agri-table-row">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-bg flex items-center justify-center text-primary font-bold text-xs shadow-sm">
                        {memberDetails[member.user_id]?.full_name?.charAt(0).toUpperCase() || <IconUser size={16} />}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-text-primary flex items-center gap-1.5">
                          {memberDetails[member.user_id]?.full_name || 'Anonymous User'}
                          {member.user_id === user.id && <span className="text-[10px] bg-bg px-1.5 py-0.5 rounded text-text-muted">(You)</span>}
                        </span>
                        <span className="text-[11px] text-text-muted">
                          {memberDetails[member.user_id]?.email || 'No email found'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Badge variant={member.role === 'owner' ? 'success' : 'primary'}>
                      {member.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 text-xs font-medium text-text-secondary">
                      <IconLockAccess size={14} className="text-primary" />
                      {member.farm_access?.type === 'all' ? 'All Farms' : `${member.farm_access?.farm_ids?.length || 0} Farms`}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isOwner && member.user_id !== user.id && (
                      <button 
                        onClick={() => removeMember(member.id, member.user_id)}
                        className="text-text-muted hover:text-expense p-2 rounded-full transition-colors"
                      >
                        <IconTrash size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {pendingInvites.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Pending Invitations</h3>
          <div className="agri-card overflow-hidden border-dashed border-2 border-border/60">
            <table className="w-full text-left">
              <thead>
                <tr className="agri-table-header">
                  <th className="px-6 py-3">Email Address</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Access</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {pendingInvites.map((invite) => (
                  <tr key={invite.id} className="agri-table-row">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-bg border-dashed border border-primary flex items-center justify-center text-primary font-bold text-xs shadow-sm">
                          <IconMail size={16} />
                        </div>
                        <span className="text-sm font-bold text-text-primary">{invite.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant="warning">{invite.role.toUpperCase()}</Badge>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-text-secondary">
                        {invite.farm_access?.type === 'all' ? 'All Farms' : 'Specific Farms'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {isOwner && (
                        <button 
                          onClick={() => cancelInvite(invite.id, invite.email)}
                          className="text-text-muted hover:text-expense p-2 rounded-full transition-colors"
                          title="Cancel Invite"
                        >
                          <IconTrash size={18} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Invite Team Member"
      >
        <form onSubmit={handleInvite} className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="agri-label">Email Address</label>
            <div className="relative">
              <IconMail className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" size={16} />
              <input
                type="email"
                required
                className="agri-input pl-10"
                placeholder="colleague@farm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1">
              <label className="agri-label">Role</label>
              <select 
                className="agri-input"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="agri-label">Farm Access</label>
              <select 
                className="agri-input"
                value={accessType}
                onChange={(e) => setAccessType(e.target.value)}
              >
                <option value="all">All Farms</option>
                <option value="specific">Specific Farms</option>
              </select>
            </div>
          </div>

          {accessType === 'specific' && (
            <div className="space-y-2 animate-in fade-in duration-300">
              <label className="agri-label">Select Farms</label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-1">
                {farms.map(farm => (
                  <button
                    key={farm.id}
                    type="button"
                    onClick={() => toggleFarmSelection(farm.id)}
                    className={`flex items-center justify-between p-3 rounded-lg border text-sm transition-all ${
                      selectedFarms.includes(farm.id) 
                        ? 'border-primary bg-primary/5 text-primary font-bold' 
                        : 'border-border hover:bg-bg text-text-secondary'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <IconPlant size={16} />
                      {farm.name}
                    </div>
                    {selectedFarms.includes(farm.id) && <IconCheck size={16} />}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="bg-bg p-4 rounded-md flex gap-3">
            <IconShieldCheck className="text-primary flex-shrink-0" size={20} />
            <p className="text-[11px] text-text-secondary leading-relaxed">
              <strong>Member:</strong> View & edit records. <strong>Admin:</strong> Manage billing & team.
              <br/>Granular access limits data visibility to only the selected farms.
            </p>
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
              disabled={isSubmitting || (accessType === 'specific' && selectedFarms.length === 0)}
            >
              {isSubmitting ? <IconLoader2 className="animate-spin" size={18} /> : 'Send Invite'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeamSettings;
