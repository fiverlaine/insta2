import { useState, useEffect } from 'react';
import { LikeService } from '@/services/likeService';

export function useStoryLike(storyId: string) {
  // Carregar do cache IMEDIATAMENTE (síncrono)
  const cachedState = storyId ? LikeService.getCachedStoryLikeState(storyId) : false;
  const [isLiked, setIsLiked] = useState(cachedState);
  const [loading, setLoading] = useState(false);

  // Verificar no banco (assíncrono, mas não bloqueia a UI)
  useEffect(() => {
    if (!storyId) {
      setIsLiked(false);
      return;
    }

    const loadLikeState = async () => {
      const liked = await LikeService.isStoryLiked(storyId);
      setIsLiked(liked);
      setLoading(false);
    };

    loadLikeState();
  }, [storyId]);

  // Subscribe para mudanças em tempo real
  useEffect(() => {
    if (!storyId) {
      return;
    }

    const unsubscribe = LikeService.subscribeToStoryLike(
      storyId,
      (liked) => {
        setIsLiked(liked);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [storyId]);

  // Função para alternar like
  const toggleLike = async () => {
    if (!storyId) {
      return false;
    }
    const newState = await LikeService.toggleStoryLike(storyId);
    setIsLiked(newState);
    return newState;
  };

  return {
    isLiked,
    loading,
    toggleLike,
  };
}

