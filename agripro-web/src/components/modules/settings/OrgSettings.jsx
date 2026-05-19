import React, { useState } from 'react';
import { IconBuildingCommunity, IconEdit, IconLoader2, IconCircleCheck, IconCalendarTime } from '@tabler/icons-react';
import Button from '../../shared/Button';
import { supabase } from '../../../lib/supabase';

const OrgSettings = ({ currentOrg, user, refetch }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(currentOrg?.name || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const isOwner = currentOrg?.organization_members?.find(m => m.user_id === user.id)?.role === 'owner';

  const handleUpdateName = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { error } = await supabase
        .from('organizations')
        .update({ name: newName })
        .eq('id', currentOrg.id);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Organization name updated successfully!' });
      setIsEditing(false);
      refetch();
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Organization Settings</h2>
        <p className="text-sm text-text-muted">Manage your business profile and identity.</p>
      </div>

      <div className="agri-card p-8">
        <div className="flex justify-between items-start mb-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
              <IconBuildingCommunity size={32} />
            </div>
            <div>
              {isEditing ? (
                <form onSubmit={handleUpdateName} className="flex flex-col gap-2">
                  <input 
                    type="text" 
                    className="agri-input font-bold text-lg"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button type="submit" size="small" disabled={loading}>
                      {loading ? <IconLoader2 className="animate-spin" size={14} /> : 'Save'}
                    </Button>
                    <Button type="button" variant="outline" size="small" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-3">
                  <h3 className="text-2xl font-bold text-text-primary">{currentOrg?.name}</h3>
                  {isOwner && (
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="text-text-muted hover:text-primary p-1.5 rounded-full hover:bg-bg transition-all"
                    >
                      <IconEdit size={18} />
                    </button>
                  )}
                </div>
              )}
              <p className="text-sm text-text-muted mt-1 uppercase tracking-widest font-bold">
                Organization ID: <span className="font-mono text-[10px]">{currentOrg?.id}</span>
              </p>
            </div>
          </div>
          <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${currentOrg?.subscription_tier === 'pro' ? 'bg-revenue/10 text-revenue border border-revenue/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
            {currentOrg?.subscription_tier || 'Free'} Plan
          </div>
        </div>

        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {message.type === 'success' ? <IconCircleCheck size={20} /> : <IconCircleCheck size={20} className="rotate-45" />}
            <span className="text-sm font-medium">{message.text}</span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-border">
          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold text-text-muted uppercase tracking-[2px]">Subscription Details</h4>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <IconCircleCheck size={18} className="text-primary" />
              <span>Status: <strong className="text-text-primary uppercase">{currentOrg?.subscription_status || 'Active'}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-sm text-text-secondary">
              <IconCalendarTime size={18} className="text-primary" />
              <span>
                {currentOrg?.subscription_expires_at 
                  ? `Expires on: ${new Date(currentOrg.subscription_expires_at).toLocaleDateString()}` 
                  : 'Never Expires (Manual Access)'}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-extrabold text-text-muted uppercase tracking-[2px]">Usage Limits</h4>
            <div className="flex justify-between items-center text-sm">
              <span className="text-text-secondary">Farms Managed:</span>
              <span className="font-bold">{currentOrg?.subscription_tier === 'pro' ? 'Unlimited' : '1 Max'}</span>
            </div>
            <div className="w-full bg-bg h-2 rounded-full overflow-hidden">
              <div className="bg-primary h-full" style={{ width: currentOrg?.subscription_tier === 'pro' ? '10%' : '100%' }}></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrgSettings;
