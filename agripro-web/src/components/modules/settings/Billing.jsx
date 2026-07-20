import React, { useState } from 'react';
import { IconCreditCard, IconCircleCheck, IconLock, IconLoader2, IconExternalLink } from '@tabler/icons-react';
import Button from '../../shared/Button';
import Badge from '../../shared/Badge';
import { supabase } from '../../../lib/supabase';
import { toast } from '../../../utils/toast';

const Billing = ({ currentOrg }) => {
  const [loading, setLoading] = useState(false);

  const tiers = [
    {
      id: 'free',
      name: 'Free Tier',
      price: '0',
      description: 'Ideal for individual farmers starting out.',
      features: [
        'Manage 1 Farm',
        'Standard Financial Tracking',
        'Inventory Management',
        'Community Support'
      ],
      isCurrent: currentOrg?.subscription_tier === 'free' || !currentOrg?.subscription_tier
    },
    {
      id: 'pro',
      name: 'Pro Plan',
      price: '2,500',
      description: 'Full power for growing agricultural businesses.',
      features: [
        'Unlimited Farms',
        'Advanced Team Collaboration',
        'Detailed Financial Analytics',
        'Priority Support',
        'Multi-user Access'
      ],
      isCurrent: currentOrg?.subscription_tier === 'pro',
      recommended: true
    }
  ];

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      // This will call a Supabase Edge Function that we'll create next
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { orgId: currentOrg.id }
      });
      
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Stripe Error:', error);
      toast.info('Could not initiate checkout. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-portal-link', {
        body: { orgId: currentOrg.id }
      });
      
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Portal Error:', error);
      toast.info('Could not open billing portal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h2 className="text-xl font-bold text-text-primary">Billing & Subscriptions</h2>
        <p className="text-sm text-text-muted">Manage your plan and organization billing settings.</p>
      </div>

      <div className="agri-card p-6 bg-primary/5 border-primary/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-bold text-primary uppercase tracking-widest block mb-1">Active Plan</span>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-bold text-text-primary">
              {currentOrg?.subscription_tier === 'pro' ? 'Pro Plan' : 'Free Tier'}
            </h3>
            <Badge variant={currentOrg?.subscription_tier === 'pro' ? 'success' : 'primary'}>
              {currentOrg?.subscription_status?.toUpperCase() || 'ACTIVE'}
            </Badge>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            {currentOrg?.subscription_tier === 'pro' 
              ? 'Your organization has full access to all features.' 
              : 'You are currently on the limited free tier.'}
          </p>
        </div>
        {currentOrg?.subscription_tier === 'pro' && (
          <Button variant="outline" onClick={handleManage} disabled={loading}>
            {loading ? <IconLoader2 className="animate-spin" size={18} /> : <IconExternalLink size={18} />}
            Manage Billing
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tiers.map((tier) => (
          <div 
            key={tier.id} 
            className={`agri-card p-8 flex flex-col relative ${tier.recommended ? 'border-2 border-primary shadow-lg' : ''}`}
          >
            {tier.recommended && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Recommended
              </span>
            )}
            
            <div className="mb-6">
              <h4 className="text-lg font-bold text-text-primary">{tier.name}</h4>
              <p className="text-sm text-text-muted mt-1">{tier.description}</p>
            </div>

            <div className="mb-8">
              <span className="text-3xl font-bold text-text-primary">PKR {tier.price}</span>
              <span className="text-text-muted text-sm ml-1">/month</span>
            </div>

            <ul className="space-y-4 flex-1 mb-8">
              {tier.features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3 text-sm text-text-secondary">
                  <IconCircleCheck size={18} className="text-primary flex-shrink-0 mt-0.5" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button 
              variant={tier.isCurrent ? 'outline' : tier.recommended ? 'primary' : 'outline'}
              className="w-full"
              disabled={tier.isCurrent || loading}
              onClick={tier.id === 'pro' ? handleUpgrade : null}
            >
              {loading && tier.id === 'pro' ? (
                <IconLoader2 className="animate-spin" size={18} />
              ) : tier.isCurrent ? (
                'Current Plan'
              ) : (
                `Upgrade to ${tier.name}`
              )}
            </Button>
          </div>
        ))}
      </div>

      <div className="agri-card p-6 border-l-4 border-accent-blue bg-blue-50/30 flex items-start gap-4">
        <IconLock size={24} className="text-accent-blue mt-1" />
        <div>
          <h4 className="text-sm font-bold text-text-primary">Secure Payments</h4>
          <p className="text-xs text-text-secondary mt-1">
            All payments are processed securely via Stripe. Your card information never touches our servers.
            You can cancel or change your plan at any time through the billing portal.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Billing;
