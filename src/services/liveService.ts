
import { supabase } from '../lib/supabase';

export interface LiveConfig {
  id: string;
  is_active: boolean;
  video_url: string;
  started_at: string;
  viewer_count_min: number;
  viewer_count_max: number;
}

export interface LiveComment {
  id: string;
  username: string;
  message: string;
  avatar_url?: string;
  video_timestamp?: number; // seconds from start, if null it's a random comment
  is_active: boolean;
  created_at: string;
}

export const liveService = {
  // Config
  async getLiveConfig(): Promise<LiveConfig | null> {
    const { data, error } = await supabase
      .from('live_config')
      .select('*')
      .single();
    
    if (error) {
      console.error('Error fetching live config:', error);
      return null;
    }
    return data;
  },

  async updateLiveConfig(config: Partial<LiveConfig>): Promise<void> {
    const { error } = await supabase
      .from('live_config')
      .update(config)
      .eq('id', (await this.getLiveConfig())?.id); // update strictly the single row

    if (error) throw error;
  },

  async toggleLive(isActive: boolean): Promise<void> {
    // If activating, set started_at
    const updates: Partial<LiveConfig> = { is_active: isActive };
    if (isActive) {
      updates.started_at = new Date().toISOString();
    }
    
    // First get the ID
    const current = await this.getLiveConfig();
    if (!current) return;

    const { error } = await supabase
      .from('live_config')
      .update(updates)
      .eq('id', current.id);

    if (error) throw error;
  },

  // Comments
  async getComments(): Promise<LiveComment[]> {
    const { data, error } = await supabase
      .from('live_comments')
      .select('*')
      .eq('is_active', true)
      .order('video_timestamp', { ascending: true });

    if (error) {
      console.error('Error fetching live comments:', error);
      return [];
    }
    return data || [];
  },

  async addComment(comment: Omit<LiveComment, 'id' | 'created_at' | 'is_active'>): Promise<LiveComment | null> {
    const { data, error } = await supabase
      .from('live_comments')
      .insert([comment])
      .select()
      .single();

    if (error) {
      console.error('Error adding live comment:', error);
      return null;
    }
    return data;
  },

  async deleteComment(id: string): Promise<void> {
    const { error } = await supabase
      .from('live_comments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Helper to generate a random viewer count
  getRandomViewerCount(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
};
