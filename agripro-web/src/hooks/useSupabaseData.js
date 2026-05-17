import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function useSupabaseData(session) {
  const [data, setData] = useState({
    farms: [],
    revenue: [],
    expenses: [],
    creditEntries: [],
    loans: [],
    inventory: [],
    workers: [],
    attendance: [],
    machinery: [],
    machineUsage: [],
    livestock: [],
    animalHealth: [],
    cropCycles: [],
    mandiPrices: [],
    irrigationLog: [],
    sprayLog: [],
    vendorsBuyers: [],
    categories: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchData = async (isSilent = false) => {
    if (!session) {
      setLoading(false);
      return;
    }

    if (!isSilent) setLoading(true);
    
    try {
      const [
        { data: farms },
        { data: revenue },
        { data: expenses },
        { data: creditEntries },
        { data: loans },
        { data: inventory },
        { data: workers },
        { data: attendance },
        { data: machinery },
        { data: machineUsage },
        { data: livestock },
        { data: animalHealth },
        { data: cropCycles },
        { data: mandiPrices },
        { data: irrigationLog },
        { data: sprayLog },
        { data: vendorsBuyers },
        { data: categories }
      ] = await Promise.all([
        supabase.from('farms').select('*').order('id'),
        supabase.from('revenue').select('*').order('date', { ascending: false }),
        supabase.from('expenses').select('*').order('date', { ascending: false }),
        supabase.from('credit_entries').select('*, payments:credit_payments(*)').order('date', { ascending: false }),
        supabase.from('loans').select('*, payments:loan_payments(*)').order('date', { ascending: false }),
        supabase.from('inventory').select('*').order('id'),
        supabase.from('workers').select('*').order('id'),
        supabase.from('attendance').select('*').order('date', { ascending: false }),
        supabase.from('machinery').select('*').order('id'),
        supabase.from('machine_usage').select('*').order('date', { ascending: false }),
        supabase.from('livestock').select('*').order('id'),
        supabase.from('animal_health').select('*').order('date', { ascending: false }),
        supabase.from('crop_cycles').select('*').order('sowing_date', { ascending: false }),
        supabase.from('mandi_prices').select('*').order('date', { ascending: false }),
        supabase.from('irrigation_log').select('*').order('date', { ascending: false }),
        supabase.from('spray_log').select('*').order('date', { ascending: false }),
        supabase.from('vendors_buyers').select('*').order('name'),
        supabase.from('categories').select('*').order('name')
      ]);

      setData({
        farms: farms || [],
        revenue: revenue || [],
        expenses: expenses || [],
        creditEntries: creditEntries || [],
        loans: loans || [],
        inventory: inventory || [],
        workers: workers || [],
        attendance: attendance || [],
        machinery: machinery || [],
        machineUsage: machineUsage || [],
        livestock: livestock || [],
        animalHealth: animalHealth || [],
        cropCycles: cropCycles || [],
        mandiPrices: mandiPrices || [],
        irrigationLog: irrigationLog || [],
        sprayLog: sprayLog || [],
        vendorsBuyers: vendorsBuyers || [],
        categories: categories || []
      });
    } catch (error) {
      console.error('Error fetching data from Supabase:', error);
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (session) {
      fetchData();

      const channel = supabase.channel('schema-db-changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public' 
        }, (payload) => {
          console.log('Database change detected:', payload);
          fetchData(true); // Silent refetch to avoid showing global loader
        })
        .subscribe((status) => {
          console.log('Realtime subscription status:', status);
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Reset state on logout
      setData({
        farms: [],
        revenue: [],
        expenses: [],
        creditEntries: [],
        loans: [],
        inventory: [],
        workers: [],
        attendance: [],
        machinery: [],
        machineUsage: [],
        livestock: [],
        animalHealth: [],
        cropCycles: [],
        mandiPrices: [],
        irrigationLog: [],
        sprayLog: [],
        vendorsBuyers: [],
      });
      setLoading(false);
    }
  }, [session]);

  return { ...data, loading, refetch: fetchData };
}
