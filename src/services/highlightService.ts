import { supabase } from '@/lib/supabase';
import type { Story } from './storyService';

export interface Highlight {
  id: string;
  profile_username: string;
  name: string;
  cover_media_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface HighlightWithStories extends Highlight {
  stories: Story[];
}

export interface HighlightStory {
  id: string;
  highlight_id: string;
  story_id: string;
  order_index: number;
  created_at: string;
}

/**
 * Serviço de Gerenciamento de Destaques (Highlights) com Cache
 */
export class HighlightService {
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // ─── Leitura ───────────────────────────────────────

  /**
   * Buscar destaques ativos com seus stories (para visitante)
   */
  static async getActiveHighlights(profileUsername: string): Promise<HighlightWithStories[]> {
    // Tentar cache
    const cacheKey = `highlights_${profileUsername}`;
    const cacheTimeKey = `highlights_${profileUsername}_time`;

    try {
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheTimeKey);
      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        if (age < this.CACHE_DURATION) {
          return JSON.parse(cached);
        }
      }
    } catch {}

    try {
      // 1. Buscar highlights ativos
      const { data: highlights, error: hError } = await supabase
        .from('highlights')
        .select('*')
        .eq('profile_username', profileUsername)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (hError || !highlights || highlights.length === 0) return [];

      // 2. Buscar relações highlight_stories com dados do story
      const highlightIds = highlights.map(h => h.id);
      const { data: relations, error: rError } = await supabase
        .from('highlight_stories')
        .select('highlight_id, story_id, order_index')
        .in('highlight_id', highlightIds)
        .order('order_index', { ascending: true });

      if (rError) {
        console.error('Erro ao buscar relações highlight_stories:', rError);
        return [];
      }

      // 3. Buscar os stories referenciados
      const storyIds = [...new Set((relations || []).map(r => r.story_id))];
      let storiesMap: Map<string, Story> = new Map();

      if (storyIds.length > 0) {
        const { data: stories, error: sError } = await supabase
          .from('stories')
          .select('*')
          .in('id', storyIds);

        if (!sError && stories) {
          stories.forEach(s => storiesMap.set(s.id, s));
        }
      }

      // 4. Montar resultado
      const result: HighlightWithStories[] = highlights.map(h => {
        const hRelations = (relations || []).filter(r => r.highlight_id === h.id);
        const hStories = hRelations
          .map(r => storiesMap.get(r.story_id))
          .filter(Boolean) as Story[];

        return {
          ...h,
          stories: hStories,
        };
      }).filter(h => h.stories.length > 0); // Só mostrar highlights com pelo menos 1 story

      // Salvar no cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(result));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
      } catch {}

      return result;
    } catch (error) {
      console.error('Erro ao buscar highlights:', error);
      try {
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    }
  }

  /**
   * Buscar TODOS os highlights (para admin)
   */
  static async getAllHighlights(profileUsername: string): Promise<HighlightWithStories[]> {
    try {
      const { data: highlights, error: hError } = await supabase
        .from('highlights')
        .select('*')
        .eq('profile_username', profileUsername)
        .order('order_index', { ascending: true });

      if (hError || !highlights) return [];

      const highlightIds = highlights.map(h => h.id);
      if (highlightIds.length === 0) return highlights.map(h => ({ ...h, stories: [] }));

      const { data: relations } = await supabase
        .from('highlight_stories')
        .select('highlight_id, story_id, order_index')
        .in('highlight_id', highlightIds)
        .order('order_index', { ascending: true });

      const storyIds = [...new Set((relations || []).map(r => r.story_id))];
      let storiesMap: Map<string, Story> = new Map();

      if (storyIds.length > 0) {
        const { data: stories } = await supabase
          .from('stories')
          .select('*')
          .in('id', storyIds);

        if (stories) {
          stories.forEach(s => storiesMap.set(s.id, s));
        }
      }

      return highlights.map(h => {
        const hRelations = (relations || []).filter(r => r.highlight_id === h.id);
        const hStories = hRelations
          .map(r => storiesMap.get(r.story_id))
          .filter(Boolean) as Story[];

        return { ...h, stories: hStories };
      });
    } catch (error) {
      console.error('Erro ao buscar todos os highlights:', error);
      return [];
    }
  }

  // ─── Escrita ───────────────────────────────────────

  /**
   * Criar um novo destaque
   */
  static async createHighlight(
    profileUsername: string,
    name: string,
    storyIds: string[],
    coverMediaUrl?: string | null
  ): Promise<Highlight | null> {
    try {
      // Buscar próximo order_index
      const { data: maxOrder } = await supabase
        .from('highlights')
        .select('order_index')
        .eq('profile_username', profileUsername)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxOrder?.order_index || 0) + 1;

      const { data: highlight, error } = await supabase
        .from('highlights')
        .insert({
          profile_username: profileUsername,
          name,
          cover_media_url: coverMediaUrl || null,
          order_index: nextOrder,
          is_active: true,
        })
        .select()
        .single();

      if (error || !highlight) {
        console.error('Erro ao criar highlight:', error);
        return null;
      }

      // Inserir relações com stories
      if (storyIds.length > 0) {
        const relations = storyIds.map((storyId, index) => ({
          highlight_id: highlight.id,
          story_id: storyId,
          order_index: index,
        }));

        const { error: relError } = await supabase
          .from('highlight_stories')
          .insert(relations);

        if (relError) {
          console.error('Erro ao inserir relações:', relError);
        }
      }

      this.clearCache(profileUsername);
      return highlight;
    } catch (error) {
      console.error('Erro no createHighlight:', error);
      return null;
    }
  }

  /**
   * Atualizar nome e capa de um destaque
   */
  static async updateHighlight(
    highlightId: string,
    name: string,
    coverMediaUrl: string | null,
    profileUsername: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('highlights')
        .update({
          name,
          cover_media_url: coverMediaUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', highlightId);

      if (error) {
        console.error('Erro ao atualizar highlight:', error);
        return false;
      }

      this.clearCache(profileUsername);
      return true;
    } catch (error) {
      console.error('Erro no updateHighlight:', error);
      return false;
    }
  }

  /**
   * Atualizar stories de um destaque (substituição completa)
   */
  static async updateHighlightStories(
    highlightId: string,
    storyIds: string[],
    profileUsername: string
  ): Promise<boolean> {
    try {
      // Deletar relações existentes
      const { error: deleteError } = await supabase
        .from('highlight_stories')
        .delete()
        .eq('highlight_id', highlightId);

      if (deleteError) {
        console.error('Erro ao deletar relações:', deleteError);
        return false;
      }

      // Inserir novas relações
      if (storyIds.length > 0) {
        const relations = storyIds.map((storyId, index) => ({
          highlight_id: highlightId,
          story_id: storyId,
          order_index: index,
        }));

        const { error: insertError } = await supabase
          .from('highlight_stories')
          .insert(relations);

        if (insertError) {
          console.error('Erro ao inserir relações:', insertError);
          return false;
        }
      }

      this.clearCache(profileUsername);
      return true;
    } catch (error) {
      console.error('Erro no updateHighlightStories:', error);
      return false;
    }
  }

  /**
   * Deletar destaque
   */
  static async deleteHighlight(highlightId: string, profileUsername: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('highlights')
        .delete()
        .eq('id', highlightId);

      if (error) {
        console.error('Erro ao deletar highlight:', error);
        return false;
      }

      this.clearCache(profileUsername);
      return true;
    } catch (error) {
      console.error('Erro no deleteHighlight:', error);
      return false;
    }
  }

  /**
   * Ativar/Desativar destaque
   */
  static async toggleHighlightActive(
    highlightId: string,
    isActive: boolean,
    profileUsername: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('highlights')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString(),
        })
        .eq('id', highlightId);

      if (error) {
        console.error('Erro ao toggle highlight:', error);
        return false;
      }

      this.clearCache(profileUsername);
      return true;
    } catch (error) {
      console.error('Erro no toggleHighlightActive:', error);
      return false;
    }
  }

  /**
   * Upload de capa de destaque
   */
  static async uploadHighlightCover(
    file: File,
    profileUsername: string
  ): Promise<string | null> {
    try {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const fileName = `${profileUsername}/highlights/${timestamp}_${random}.${extension}`;

      const { data, error } = await supabase.storage
        .from('profile-media')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Erro ao fazer upload da capa:', error);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('profile-media')
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro no uploadHighlightCover:', error);
      return null;
    }
  }

  // ─── Cache ─────────────────────────────────────────

  static clearCache(profileUsername: string): void {
    try {
      localStorage.removeItem(`highlights_${profileUsername}`);
      localStorage.removeItem(`highlights_${profileUsername}_time`);
    } catch {}
  }

  static async preloadHighlights(profileUsername: string): Promise<void> {
    this.getActiveHighlights(profileUsername).catch(() => {});
  }
}
