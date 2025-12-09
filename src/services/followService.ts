import { supabase } from '@/lib/supabase';
import { getVisitorId } from '@/utils/visitor';

export interface ProfileFollow {
  id: string;
  visitor_id: string;
  profile_username: string;
  is_following: boolean;
  followed_at: string;
  updated_at: string;
}

export class FollowService {
  private static readonly CACHE_KEY = 'follow_state_';

  /**
   * Obter estado de follow do cache (síncrono - instantâneo)
   */
  static getCachedFollowState(profileUsername: string): boolean {
    try {
      const visitorId = getVisitorId();
      const cacheKey = `${this.CACHE_KEY}${visitorId}_${profileUsername}`;
      const cached = localStorage.getItem(cacheKey);
      return cached === 'true';
    } catch (error) {
      return false;
    }
  }

  /**
   * Salvar estado de follow no cache
   */
  private static setCachedFollowState(profileUsername: string, isFollowing: boolean): void {
    try {
      const visitorId = getVisitorId();
      const cacheKey = `${this.CACHE_KEY}${visitorId}_${profileUsername}`;
      localStorage.setItem(cacheKey, isFollowing.toString());
    } catch (error) {
      console.warn('Erro ao salvar cache de follow:', error);
    }
  }

  /**
   * Verifica se o visitante está seguindo o perfil
   */
  static async isFollowing(profileUsername: string): Promise<boolean> {
    try {
      const visitorId = getVisitorId();
      
      const { data, error } = await supabase
        .from('profile_follows')
        .select('is_following')
        .eq('visitor_id', visitorId)
        .eq('profile_username', profileUsername)
        .maybeSingle();

      if (error) {
        console.error('Erro ao verificar follow:', error);
        return this.getCachedFollowState(profileUsername);
      }

      if (!data) {
        // Nenhum registro encontrado
        this.setCachedFollowState(profileUsername, false);
        return false;
      }

      const isFollowing = data?.is_following || false;
      this.setCachedFollowState(profileUsername, isFollowing);
      return isFollowing;
    } catch (error) {
      console.error('Erro ao verificar follow:', error);
      return this.getCachedFollowState(profileUsername);
    }
  }

  /**
   * Alterna o estado de follow (seguir/deixar de seguir)
   */
  static async toggleFollow(profileUsername: string): Promise<boolean> {
    try {
      const visitorId = getVisitorId();
      
      // Verificar se já existe um registro
      const { data: existing } = await supabase
        .from('profile_follows')
        .select('*')
        .eq('visitor_id', visitorId)
        .eq('profile_username', profileUsername)
        .maybeSingle();

      if (existing) {
        // Atualizar registro existente
        const newFollowState = !existing.is_following;
        
        const { error } = await supabase
          .from('profile_follows')
          .update({
            is_following: newFollowState,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existing.id);

        if (error) {
          console.error('Erro ao atualizar follow:', error);
          return existing.is_following;
        }

        // Atualizar cache
        this.setCachedFollowState(profileUsername, newFollowState);
        return newFollowState;
      } else {
        // Criar novo registro
        const { error } = await supabase
          .from('profile_follows')
          .insert({
            visitor_id: visitorId,
            profile_username: profileUsername,
            is_following: true,
          });

        if (error) {
          console.error('Erro ao criar follow:', error);
          return false;
        }

        // Atualizar cache
        this.setCachedFollowState(profileUsername, true);
        return true;
      }
    } catch (error) {
      console.error('Erro ao alternar follow:', error);
      return false;
    }
  }

  /**
   * Subscribe para mudanças no estado de follow
   */
  static subscribeToFollow(
    profileUsername: string,
    callback: (isFollowing: boolean) => void
  ) {
    const visitorId = getVisitorId();

    const channel = supabase
      .channel(`follow:${visitorId}:${profileUsername}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profile_follows',
          filter: `visitor_id=eq.${visitorId}`,
        },
        (payload) => {
          if (payload.new && (payload.new as any).profile_username === profileUsername) {
            const isFollowing = (payload.new as any).is_following;
            // Atualizar cache quando receber update em tempo real
            this.setCachedFollowState(profileUsername, isFollowing);
            callback(isFollowing);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

