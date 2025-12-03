import { useState, useEffect } from 'react';
import { LikeService } from '@/services/likeService';

export function usePostLike(postId: string, baseLikes: number = 0) {
  // Carregar do cache IMEDIATAMENTE (síncrono)
  const cachedState = LikeService.getCachedPostLikeState(postId);
  const [isLiked, setIsLiked] = useState(cachedState);
  const [likesCount, setLikesCount] = useState(baseLikes + (cachedState ? 1 : 0));
  const [loading, setLoading] = useState(false);

  // Verificar no banco (assíncrono, mas não bloqueia a UI)
  useEffect(() => {
    const loadLikeState = async () => {
      const liked = await LikeService.isPostLiked(postId);
      setIsLiked(liked);
      setLikesCount(baseLikes + (liked ? 1 : 0));
      setLoading(false);
    };

    loadLikeState();
  }, [postId, baseLikes]);

  // Subscribe para mudanças em tempo real
  useEffect(() => {
    const unsubscribe = LikeService.subscribeToPostLike(
      postId,
      (liked) => {
        setIsLiked(liked);
        setLikesCount(baseLikes + (liked ? 1 : 0));
      }
    );

    return () => {
      unsubscribe();
    };
  }, [postId, baseLikes]);

  // Função para alternar like
  const toggleLike = async () => {
    const newState = await LikeService.togglePostLike(postId);
    setIsLiked(newState);
    setLikesCount(baseLikes + (newState ? 1 : 0));
    return newState;
  };

  return {
    isLiked,
    likesCount,
    loading,
    toggleLike,
  };
}

