import React from 'react';
import { IconBell, IconChevronDown, IconPlant, IconLogout } from '@tabler/icons-react';
import { supabase } from '../../lib/supabase';

const Header = ({ farms, farmFilter, setFarmFilter, currentFarmName, user }) => {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <header className="h-[58px] bg-white border-b border-border flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <div className="relative group">
          <button className="flex items-center gap-2 px-4 py-2 rounded-md border border-border hover:bg-bg transition-colors font-bold text-sm">
            <IconPlant size={18} className="text-primary" />
            <span>{currentFarmName}</span>
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

      <div className="flex items-center gap-4">
        <button className="relative p-2.5 text-text-secondary hover:bg-bg rounded-full transition-colors">
          <IconBell size={20} stroke={1.5} />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-expense rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-[1px] bg-border mx-2"></div>
        
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end hidden sm:flex">
            <span className="text-[12px] font-bold text-text-primary leading-none truncate max-w-[120px]">
              {user?.user_metadata?.full_name || user?.email}
            </span>
            <span className="text-[10px] text-text-muted font-bold uppercase mt-1 tracking-wider">Administrator</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm shadow-sm">
            {(user?.user_metadata?.full_name || user?.email)?.charAt(0).toUpperCase() || 'A'}
          </div>
          <button 
            onClick={handleLogout}
            className="ml-2 p-2 text-text-muted hover:text-expense hover:bg-red-50 rounded-lg transition-all flex items-center gap-2 group"
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
