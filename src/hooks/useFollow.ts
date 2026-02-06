import { useState, useEffect } from 'react';
import { FollowService } from '@/services/followService';

export function useFollow(profileUsername: string) {
  // Carregar do cache IMEDIATAMENTE (síncrono)
  const cachedState = FollowService.getCachedFollowState(profileUsername);
  const [isFollowing, setIsFollowing] = useState(cachedState);
  const [loading, setLoading] = useState(false);

  // Verificar no banco (assíncrono, mas não bloqueia a UI)
  useEffect(() => {
    const loadFollowState = async () => {
      const following = await FollowService.isFollowing(profileUsername);
      setIsFollowing(following);
      setLoading(false);
    };

    loadFollowState();
  }, [profileUsername]);

  // Subscribe para mudanças em tempo real
  useEffect(() => {
    const unsubscribe = FollowService.subscribeToFollow(
      profileUsername,
      (following) => {
        setIsFollowing(following);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [profileUsername]);

  // Função para alternar follow
  const toggleFollow = async () => {
    const newState = await FollowService.toggleFollow(profileUsername);
    setIsFollowing(newState);
    return newState;
  };

  return {
    isFollowing,
    loading,
    toggleFollow,
  };
}

