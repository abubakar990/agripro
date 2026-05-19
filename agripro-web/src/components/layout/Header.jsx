import React, { useState, useEffect } from 'react';
import { 
  IconBell, 
  IconChevronDown, 
  IconPlant, 
  IconLogout, 
  IconBuildingCommunity, 
  IconMenu2,
  IconCheck,
  IconClock,
  IconTrash
} from '@tabler/icons-react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

const Header = ({ farms, farmFilter, setFarmFilter, currentFarmName, user, organizations = [], currentOrg, onOrgSwitch, toggleMobileSidebar }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const fetchNotifications = async () => {
    if (!currentOrg?.id) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('org_id', currentOrg.id)
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (!error) setNotifications(data || []);
  };

  useEffect(() => {
    fetchNotifications();

    if (currentOrg?.id) {
      const channel = supabase.channel(`notifications-${currentOrg.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `org_id=eq.${currentOrg.id}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentOrg?.id]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAsRead = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);
    
    if (!error) {
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }
  };

  const deleteNotification = async (id) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);
    
    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }
  };

  const handleNotificationClick = (n) => {
    markAsRead(n.id);
    if (n.link) navigate(n.link);
    setShowNotifications(false);
  };

  return (
    <header className="h-[58px] bg-white border-b border-border flex items-center justify-between px-4 lg:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Mobile Menu Toggle */}
        <button 
          onClick={toggleMobileSidebar}
          className="p-2 -ml-2 text-text-secondary hover:bg-bg rounded-md lg:hidden"
        >
          <IconMenu2 size={24} />
        </button>

        {/* Organization Switcher */}
        {organizations.length > 1 && (
          <div className="relative group">
            <button className="flex items-center gap-2 px-2 lg:px-3 py-1.5 rounded-md border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors font-bold text-[10px] lg:text-xs text-primary uppercase tracking-wider">
              <IconBuildingCommunity size={16} className="hidden sm:block" />
              <span className="max-w-[80px] lg:max-w-[120px] truncate">{currentOrg?.name}</span>
              <IconChevronDown size={12} />
            </button>
            
            <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-md shadow-xl border border-border hidden group-hover:block overflow-hidden z-[60]">
              <div className="px-4 py-2 border-b border-border bg-gray-50">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Switch Organization</span>
              </div>
              {organizations.map(org => (
                <button 
                  key={org.id}
                  onClick={() => onOrgSwitch(org.id)}
                  className={`w-full text-left px-4 py-3 text-sm hover:bg-bg transition-colors flex items-center justify-between ${currentOrg?.id === org.id ? 'bg-primary/5 font-bold text-primary' : 'text-text-secondary'}`}
                >
                  <div className="flex flex-col">
                    <span className="truncate">{org.name}</span>
                    <span className="text-[10px] opacity-60 font-normal">{org.subscription_tier?.toUpperCase()} PLAN</span>
                  </div>
                  {currentOrg?.id === org.id && <div className="w-1.5 h-1.5 rounded-full bg-primary"></div>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Farm Filter */}
        <div className="relative group">
          <button className="flex items-center gap-2 px-3 lg:px-4 py-2 rounded-md border border-border hover:bg-bg transition-colors font-bold text-xs lg:text-sm text-text-primary">
            <IconPlant size={18} className="text-primary hidden sm:block" />
            <span className="max-w-[80px] lg:max-w-none truncate">{currentFarmName}</span>
            <IconChevronDown size={14} className="text-text-muted" />
          </button>
          
          <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-md shadow-lg border border-border hidden group-hover:block overflow-hidden z-50">
            <button 
              onClick={() => setFarmFilter('all')}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-bg transition-colors ${farmFilter === 'all' ? 'bg-bg font-bold text-primary' : ''}`}
            >
              🌾 All Farms
            </button>
            {farms.map(farm => (
              <button 
                key={farm.id}
                onClick={() => setFarmFilter(farm.id)}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-bg transition-colors ${Number(farmFilter) === farm.id ? 'bg-bg font-bold text-primary' : ''}`}
              >
                🏡 {farm.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 lg:gap-4">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 text-text-secondary hover:bg-bg rounded-full transition-colors flex"
          >
            <IconBell size={20} stroke={1.5} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-expense text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowNotifications(false)}
              ></div>
              <div className="absolute top-full right-0 mt-2 w-80 bg-white rounded-md shadow-2xl border border-border z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border bg-gray-50 flex justify-between items-center">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Notifications</span>
                  {unreadCount > 0 && (
                    <button 
                      onClick={async () => {
                        const { error } = await supabase.from('notifications').update({ is_read: true }).eq('org_id', currentOrg.id);
                        if (!error) fetchNotifications();
                      }}
                      className="text-[9px] font-bold text-primary hover:underline uppercase"
                    >
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                  {notifications.length > 0 ? (
                    notifications.map((n) => (
                      <div 
                        key={n.id} 
                        className={`group px-4 py-3 border-b border-border/50 last:border-0 hover:bg-bg/50 transition-colors cursor-pointer relative ${!n.is_read ? 'bg-primary/[0.02]' : ''}`}
                        onClick={() => handleNotificationClick(n)}
                      >
                        <div className="flex justify-between items-start gap-2 pr-6">
                          <div>
                            <h4 className={`text-xs ${!n.is_read ? 'font-bold text-text-primary' : 'text-text-secondary'}`}>
                              {n.title}
                            </h4>
                            <p className="text-[11px] text-text-muted mt-1 leading-relaxed line-clamp-2">
                              {n.message}
                            </p>
                            <div className="flex items-center gap-1.5 mt-2 opacity-60">
                              <IconClock size={10} />
                              <span className="text-[9px] font-medium">{new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(n.created_at).toLocaleDateString()}</span>
                            </div>
                          </div>
                          {!n.is_read && <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1"></div>}
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="absolute top-3 right-3 p-1 text-text-muted hover:text-expense opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <IconTrash size={12} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="py-12 text-center opacity-40">
                      <IconBell size={32} className="mx-auto mb-2" />
                      <p className="text-[11px] font-bold uppercase tracking-wider">No new notifications</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
        
        <div className="h-8 w-[1px] bg-border mx-1 lg:mx-2 hidden xs:block"></div>
        
        <div className="flex items-center gap-2 lg:gap-3">
          <div className="flex flex-col items-end hidden md:flex">
            <span className="text-[12px] font-bold text-text-primary leading-none truncate max-w-[120px]">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <span className="text-[10px] text-text-muted font-bold uppercase mt-1 tracking-wider">Administrator</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm flex-shrink-0">
            {(user?.user_metadata?.full_name || user?.email)?.charAt(0).toUpperCase() || 'A'}
          </div>
          <button 
            onClick={handleLogout}
            className="p-2 text-text-muted hover:text-expense hover:bg-red-50 rounded-lg transition-all flex items-center gap-2 group"
            title="Sign Out"
          >
            <IconLogout size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
