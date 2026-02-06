import { supabase } from '@/lib/supabase';

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
  link_type: 'visible' | 'invisible' | 'none';
  link_x: number;
  link_y: number;
  link_url?: string | null; // URL específica do story
  created_at: string;
  updated_at: string;
}

/**
 * Serviço de Gerenciamento de Stories com Cache e Otimizações
 */
export class StoryService {
  private static readonly BUCKET_NAME = 'stories-media';
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  /**
   * Upload de mídia para stories
   */
  static async uploadStoryMedia(
    file: File,
    profileUsername: string
  ): Promise<{ url: string; path: string } | null> {
    try {
      if (file.size > this.MAX_FILE_SIZE) {
        console.error('Arquivo muito grande. Máximo: 50MB');
        return null;
      }

      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const fileName = `${profileUsername}/${timestamp}_${random}.${extension}`;

      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error('Erro ao fazer upload:', error);
        return null;
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        path: data.path,
      };
    } catch (error) {
      console.error('Erro no uploadStoryMedia:', error);
      return null;
    }
  }

  /**
   * Criar um novo story
   */
  static async createStory(
    profileUsername: string,
    mediaUrl: string,
    mediaType: 'image' | 'video',
    duration: number = 5000,
    thumbnail?: string | null
  ): Promise<Story | null> {
    try {
      // Buscar o próximo order_index
      const { data: maxOrder } = await supabase
        .from('stories')
        .select('order_index')
        .eq('profile_username', profileUsername)
        .order('order_index', { ascending: false })
        .limit(1)
        .single();

      const nextOrder = (maxOrder?.order_index || 0) + 1;

      const { data, error } = await supabase
        .from('stories')
        .insert({
          profile_username: profileUsername,
          media_url: mediaUrl,
          media_type: mediaType,
          duration: duration,
          order_index: nextOrder,
          is_active: true,
          show_link: false,
          thumbnail: thumbnail || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao criar story:', error);
        return null;
      }

      // Limpar cache após criar
      this.clearCache(profileUsername);

      return data;
    } catch (error) {
      console.error('Erro no createStory:', error);
      return null;
    }
  }

  /**
   * Listar stories ativos (COM CACHE OTIMIZADO)
   */
  static async getActiveStories(profileUsername: string): Promise<Story[]> {
    // 1. Tentar cache localStorage primeiro (INSTANTÂNEO ~0ms)
    const cacheKey = `stories_${profileUsername}`;
    const cacheTimeKey = `stories_${profileUsername}_time`;

    try {
      const cached = localStorage.getItem(cacheKey);
      const cacheTime = localStorage.getItem(cacheTimeKey);

      if (cached && cacheTime) {
        const age = Date.now() - parseInt(cacheTime);
        // Cache válido por 5 minutos
        if (age < this.CACHE_DURATION) {
          console.log('✅ Stories do cache (0ms)');
          return JSON.parse(cached);
        }
      }
    } catch (error) {
      console.warn('Erro ao ler cache:', error);
    }

    // 2. Buscar do Supabase
    try {
      console.log(`🔍 [StoryService] Buscando stories para username: "${profileUsername}"`);
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('profile_username', profileUsername)
        .eq('is_active', true)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('❌ [StoryService] Erro ao buscar stories:', error);
        // Se der erro, tentar retornar cache expirado
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : [];
      }

      const stories = data || [];
      console.log(`✅ [StoryService] Stories encontrados: ${stories.length} para username "${profileUsername}"`);

      // Salvar no cache
      try {
        localStorage.setItem(cacheKey, JSON.stringify(stories));
        localStorage.setItem(cacheTimeKey, Date.now().toString());
        console.log('✅ Stories do Supabase (200-400ms) - salvos no cache');
      } catch (error) {
        console.warn('Erro ao salvar cache:', error);
      }

      return stories;
    } catch (error) {
      console.error('Erro no getActiveStories:', error);
      // Se der erro, tentar retornar cache mesmo expirado
      try {
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    }
  }

  /**
   * Listar TODOS os stories (para admin)
   */
  static async getAllStories(profileUsername: string): Promise<Story[]> {
    try {
      const { data, error } = await supabase
        .from('stories')
        .select('*')
        .eq('profile_username', profileUsername)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Erro ao buscar stories:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro no getAllStories:', error);
      return [];
    }
  }

  /**
   * Deletar story
   */
  static async deleteStory(storyId: string, profileUsername: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stories')
        .delete()
        .eq('id', storyId);

      if (error) {
        console.error('Erro ao deletar story:', error);
        return false;
      }

      // Limpar cache após deletar
      this.clearCache(profileUsername);

      return true;
    } catch (error) {
      console.error('Erro no deleteStory:', error);
      return false;
    }
  }

  /**
   * Ativar/Desativar story
   */
  static async toggleStoryActive(
    storyId: string,
    isActive: boolean,
    profileUsername: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stories')
        .update({
          is_active: isActive,
          updated_at: new Date().toISOString()
        })
        .eq('id', storyId);

      if (error) {
        console.error('Erro ao atualizar story:', error);
        return false;
      }

      // Limpar cache após atualizar
      this.clearCache(profileUsername);

      return true;
    } catch (error) {
      console.error('Erro no toggleStoryActive:', error);
      return false;
    }
  }

  /**
   * Ativar/Desativar link no story
   */
  static async toggleStoryLink(
    storyId: string,
    showLink: boolean,
    profileUsername: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stories')
        .update({
          show_link: showLink,
          updated_at: new Date().toISOString()
        })
        .eq('id', storyId);

      if (error) {
        console.error('Erro ao atualizar show_link do story:', error);
        return false;
      }

      // Limpar cache após atualizar
      this.clearCache(profileUsername);

      return true;
    } catch (error) {
      console.error('Erro no toggleStoryLink:', error);
      return false;
    }
  }

  /**
   * Atualizar configuração de link do story (tipo e posição)
   */
  static async updateStoryLinkConfig(
    storyId: string,
    linkType: 'visible' | 'invisible' | 'none',
    linkX: number,
    linkY: number,
    profileUsername: string,
    linkUrl?: string | null
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('stories')
        .update({
          link_type: linkType,
          link_x: linkX,
          link_y: linkY,
          link_url: linkUrl,
          show_link: linkType !== 'none', // Manter compatibilidade
          updated_at: new Date().toISOString()
        })
        .eq('id', storyId);

      if (error) {
        console.error('Erro ao atualizar configuração do link:', error);
        return false;
      }

      // Limpar cache após atualizar
      this.clearCache(profileUsername);

      return true;
    } catch (error) {
      console.error('Erro no updateStoryLinkConfig:', error);
      return false;
    }
  }

  /**
   * Reordenar stories
   */
  static async reorderStories(storyIds: string[], profileUsername: string): Promise<boolean> {
    try {
      const updates = storyIds.map((id, index) => ({
        id,
        order_index: index,
        updated_at: new Date().toISOString(),
      }));

      for (const update of updates) {
        const { error } = await supabase
          .from('stories')
          .update({
            order_index: update.order_index,
            updated_at: update.updated_at
          })
          .eq('id', update.id);

        if (error) {
          console.error('Erro ao reordenar:', error);
          return false;
        }
      }

      // Limpar cache após reordenar
      this.clearCache(profileUsername);

      return true;
    } catch (error) {
      console.error('Erro no reorderStories:', error);
      return false;
    }
  }

  /**
   * Limpar cache de stories
   */
  static clearCache(profileUsername: string): void {
    try {
      localStorage.removeItem(`stories_${profileUsername}`);
      localStorage.removeItem(`stories_${profileUsername}_time`);
      console.log(`✅ Cache limpo para username: "${profileUsername}"`);
    } catch (error) {
      console.warn('Erro ao limpar cache:', error);
    }
  }

  /**
   * Limpar todo o cache de stories (útil para debug)
   */
  static clearAllStoriesCache(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('stories_')) {
          localStorage.removeItem(key);
        }
      });
      console.log('✅ Todo cache de stories limpo');
    } catch (error) {
      console.warn('Erro ao limpar todo cache:', error);
    }
  }

  static async updateStoryThumbnail(
    storyId: string,
    thumbnail: string,
    profileUsername?: string
  ): Promise<void> {
    try {
      await supabase
        .from('stories')
        .update({
          thumbnail,
          updated_at: new Date().toISOString(),
        })
        .eq('id', storyId);

      if (profileUsername) {
        this.clearCache(profileUsername);
      }
    } catch (error) {
      console.error('Erro ao atualizar thumbnail do story:', error);
    }
  }

  /**
   * Pré-carregar stories (para otimização)
   */
  static async preloadStories(profileUsername: string): Promise<void> {
    // Carregar em background sem bloquear
    this.getActiveStories(profileUsername).catch(() => {
      // Silenciosamente falhar
    });
  }

  /**
   * Detectar duração de vídeo
   */
  static async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.src = URL.createObjectURL(file);

      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        const duration = Math.round(video.duration * 1000); // em ms
        resolve(duration || 5000); // default 5s
      };

      video.onerror = () => {
        URL.revokeObjectURL(video.src);
        resolve(5000); // default 5s
      };
    });
  }
}

