import { supabase } from '@/lib/supabase';

export interface BetLead {
  id: string;
  email: string | null;
  phone: string | null;
  name: string | null;
  document: string | null;
  visitor_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utmify: string | null;
  created_at: string;
}

export interface BetDeposit {
  id: string;
  txid: string | null;
  amount: number;
  status: string;
  visitor_id: string | null;
  fingerprint: string | null;
  utm_source: string | null;
  created_at: string;
}

export const BetService = {
  async getLeads() {
    const { data, error } = await supabase
      .from('bet_leads')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching bet leads:', error);
      return [];
    }
    return data;
  },

  async getDeposits() {
    const { data, error } = await supabase
      .from('deposits')
      .select('*, leads:bet_leads(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching deposits:', error);
      return [];
    }
    return data;
  }

};
