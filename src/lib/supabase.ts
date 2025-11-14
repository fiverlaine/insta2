import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://izuspwvgvozwdjzbrpvt.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml6dXNwd3Zndm96d2RqemJycHZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIzMDE1NzksImV4cCI6MjA3Nzg3NzU3OX0.0ktkBb-_OnYhqIdDcj15UQxIsArT6ZIU2oFnAHITRuo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Types
export interface Conversation {
  id: string;
  visitor_id: string;
  visitor_name: string;
  last_message_at: string;
  unread_count: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  content: string;
  is_from_admin: boolean;
  read: boolean;
  created_at: string;
  updated_at: string;
  media_url?: string | null;
  media_type?: 'image' | 'video' | 'audio' | 'document' | null;
  media_thumbnail?: string | null;
  media_duration?: number | null;
  replied_to_story_media_url?: string | null;
  replied_to_story_media_type?: 'image' | 'video' | null;
  replied_to_story_id?: string | null;
  replied_to_story_thumbnail?: string | null;
}

export interface Story {
  id: string;
  profile_username: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail?: string | null;
  duration: number;
  order_index: number;
  is_active: boolean;
  show_link: boolean;
  created_at: string;
  updated_at: string;
}

