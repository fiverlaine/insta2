import { supabase } from '@/lib/supabase';
import { getVisitorId } from '@/utils/visitor';

export interface PostLike {
  id: string;
  visitor_id: string;
  post_id: string;
  is_liked: boolean;
  liked_at: string;
  updated_at: string;
}

export interface StoryLike {
  id: string;
  visitor_id: string;
  story_id: string;
  is_liked: boolean;
  liked_at: string;
  updated_at: string;
}

export class LikeService {
  private static readonly CACHE_KEY_POST = 'post_like_';
  private static readonly CACHE_KEY_STORY = 'story_like_';

  /**
   * Obter estado de like do post do cache (síncrono - instantâneo)
   */
  static getCachedPostLikeState(postId: string): boolean {
    try {
      const visitorId = getVisitorId();
      const cacheKey = `${this.CACHE_KEY_POST}${visitorId}_${postId}`;
      const cached = localStorage.getItem(cacheKey);
      return cached === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Obter estado de like do story do cache (síncrono - instantâneo)
   */
  static getCachedStoryLikeState(storyId: string): boolean {
    try {
      const visitorId = getVisitorId();
      const cacheKey = `${this.CACHE_KEY_STORY}${visitorId}_${storyId}`;
      const cached = localStorage.getItem(cacheKey);
      return cached === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Salvar estado de like do post no cache
   */
  private static setCachedPostLikeState(postId: string, isLiked: boolean): void {
    try {
      const visitorId = getVisitorId();
      const cacheKey = `${this.CACHE_KEY_POST}${visitorId}_${postId}`;
      localStorage.setItem(cacheKey, isLiked.toString());
    } catch (error) {
      console.warn('Erro ao salvar cache de like do post:', error);
    }
  }

  /**
   * Salvar estado de like do story no cache
   */
  private static setCachedStoryLikeState(storyId: string, isLiked: boolean): void {
    try {
      const visitorId = getVisitorId();
      const cacheKey = `${this.CACHE_KEY_STORY}${visitorId}_${storyId}`;
      localStorage.setItem(cacheKey, isLiked.toString());
    } catch (error) {
      console.warn('Erro ao salvar cache de like do story:', error);
    }
  }

  /**
   * Verifica se o visitante curtiu o post
   */
  static async isPostLiked(postId: string): Promise<boolean> {
    try {
      const visitorId = getVisitorId();
      
      const { data, error } = await supabase
        .from('post_likes')
        .select('is_liked')
        .eq('visitor_id', visitorId)
        .eq('post_id', postId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar like do post:', error);
        return this.getCachedPostLikeState(postId);
      }

      if (!data) {
        // Nenhum registro encontrado
        this.setCachedPostLikeState(postId, false);
        return false;
      }

      const isLiked = data?.is_liked || false;
      this.setCachedPostLikeState(postId, isLiked);
      return isLiked;
    } catch (error) {
      console.error('Erro ao verificar like do post:', error);
      return this.getCachedPostLikeState(postId);
    }
  }

  /**
   * Verifica se o visitante curtiu o story
   */
  static async isStoryLiked(storyId: string): Promise<boolean> {
    try {
      const visitorId = getVisitorId();
      
      const { data, error } = await supabase
        .from('story_likes')
        .select('is_liked')
        .eq('visitor_id', visitorId)
        .eq('story_id', storyId)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar like do story:', error);
        return this.getCachedStoryLikeState(storyId);
      }

      if (!data) {
        // Nenhum registro encontrado
        this.setCachedStoryLikeState(storyId, false);
        return false;
      }

      const isLiked = data?.is_liked || false;
      this.setCachedStoryLikeState(storyId, isLiked);
      return isLiked;
    } catch (error) {
      console.error('Erro ao verificar like do story:', error);
      return this.getCachedStoryLikeState(storyId);
    }
  }

  /**
   * Alterna o estado de like do post (curtir/descurtir)
   */
  static async togglePostLike(postId: string): Promise<boolean> {
    try {
      const visitorId = getVisitorId();
      
      // Verificar se já existe um registro
      const { data: existing } = await supabase
        .from('post_likes')
        .select('*')
        .eq('visitor_id', visitorId)
        .eq('post_id', postId)
        .maybeSingle();

      if (existing) {
        // Atualizar registro existente
        const newLikeState = !existing.is_liked;
        
        const { error } = await supabase
          .from('post_likes')
          .update({
            is_liked: newLikeState,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Erro ao atualizar like do post:', error);
          return existing.is_liked;
        }

        // Atualizar cache
        this.setCachedPostLikeState(postId, newLikeState);
        return newLikeState;
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('post_likes')
          .insert({
            visitor_id: visitorId,
            post_id: postId,
            is_liked: true,
          });

        if (error) {
          console.error('Erro ao criar like do post:', error);
          return false;
        }

        // Atualizar cache
        this.setCachedPostLikeState(postId, true);
        return true;
      }
    } catch (error) {
      console.error('Erro ao alternar like do post:', error);
      return false;
    }
  }

  /**
   * Alterna o estado de like do story (curtir/descurtir)
   */
  static async toggleStoryLike(storyId: string): Promise<boolean> {
    try {
      const visitorId = getVisitorId();
      
      // Verificar se já existe um registro
      const { data: existing } = await supabase
        .from('story_likes')
        .select('*')
        .eq('visitor_id', visitorId)
        .eq('story_id', storyId)
        .maybeSingle();

      if (existing) {
        // Atualizar registro existente
        const newLikeState = !existing.is_liked;
        
        const { error } = await supabase
          .from('story_likes')
          .update({
            is_liked: newLikeState,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Erro ao atualizar like do story:', error);
          return existing.is_liked;
        }

        // Atualizar cache
        this.setCachedStoryLikeState(storyId, newLikeState);
        return newLikeState;
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('story_likes')
          .insert({
            visitor_id: visitorId,
            story_id: storyId,
            is_liked: true,
          });

        if (error) {
          console.error('Erro ao criar like do story:', error);
          return false;
        }

        // Atualizar cache
        this.setCachedStoryLikeState(storyId, true);
        return true;
      }
    } catch (error) {
      console.error('Erro ao alternar like do story:', error);
      return false;
    }
  }

  /**
   * Conta quantos likes um post tem (do visitante atual)
   */
  static async getPostLikeCount(postId: string): Promise<number> {
    try {
      // Verificar se o visitante curtiu
      const isLiked = await this.isPostLiked(postId);
      
      // Por enquanto, retornamos apenas 1 se o visitante curtiu
      // Como é individual, sempre será 0 ou 1 para o visitante
      return isLiked ? 1 : 0;
    } catch (error) {
      console.error('Erro ao contar likes do post:', error);
      return 0;
    }
  }

  /**
   * Conta quantos likes um story tem (do visitante atual)
   */
  static async getStoryLikeCount(storyId: string): Promise<number> {
    try {
      // Verificar se o visitante curtiu
      const isLiked = await this.isStoryLiked(storyId);
      
      // Por enquanto, retornamos apenas 1 se o visitante curtiu
      // Como é individual, sempre será 0 ou 1 para o visitante
      return isLiked ? 1 : 0;
    } catch (error) {
      console.error('Erro ao contar likes do story:', error);
      return 0;
    }
  }

  /**
   * Subscribe para mudanças no estado de like do post
   */
  static subscribeToPostLike(
    postId: string,
    callback: (isLiked: boolean) => void
  ) {
    const visitorId = getVisitorId();

    const channel = supabase
      .channel(`post_like:${visitorId}:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'post_likes',
          filter: `visitor_id=eq.${visitorId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).post_id === postId) {
            const isLiked = (payload.new as any).is_liked;
            // Atualizar cache quando receber update em tempo real
            this.setCachedPostLikeState(postId, isLiked);
            callback(isLiked);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe para mudanças no estado de like do story
   */
  static subscribeToStoryLike(
    storyId: string,
    callback: (isLiked: boolean) => void
  ) {
    const visitorId = getVisitorId();

    const channel = supabase
      .channel(`story_like:${visitorId}:${storyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'story_likes',
          filter: `visitor_id=eq.${visitorId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).story_id === storyId) {
            const isLiked = (payload.new as any).is_liked;
            // Atualizar cache quando receber update em tempo real
            this.setCachedStoryLikeState(storyId, isLiked);
            callback(isLiked);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

