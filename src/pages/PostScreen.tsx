import { useParams, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Heart,
  Bookmark,
  MoreVertical,
  MessageCircle,
  Send,
} from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import { ProfileService, type ProfileSettings, type Post } from "@/services/profileService";
import { CommentService } from "@/services/commentService";
import { useFollow } from "@/hooks/useFollow";
import { usePostLike } from "@/hooks/usePostLike";
import styles from "./PostScreen.module.css";

export default function PostScreen() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const normalizedPostId = postId ?? '';
  const cachedProfile = useMemo(() => ProfileService.getCachedProfileSync(), []);
  const cachedPosts = useMemo(() => ProfileService.getCachedPostsSync(), []);
  const initialPost = useMemo(
    () => cachedPosts.find((p) => p.id === normalizedPostId) || null,
    [cachedPosts, normalizedPostId]
  );
  const [profile, setProfile] = useState<ProfileSettings | null>(cachedProfile);
  const [post, setPost] = useState<Post | null>(initialPost);
  const [error, setError] = useState<string | null>(null);
  const [commentsCount, setCommentsCount] = useState<number>(0);
  
  const { isFollowing, toggleFollow } = useFollow(profile?.username || '');
  const [isSaved, setIsSaved] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageWidth, setImageWidth] = useState(0);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setImageWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  // Carregar perfil e post do Supabase
  useEffect(() => {
    loadProfile();
    loadPost();
  }, [postId]);

  // Carregar contagem de comentários do Supabase
  useEffect(() => {
    const loadCommentsCount = async () => {
      if (!postId) return;
      
      try {
        const count = await CommentService.countComments(postId);
        setCommentsCount(count);
      } catch (error) {
        console.error('Erro ao carregar contagem de comentários:', error);
        setCommentsCount(0);
      }
    };

    loadCommentsCount();
  }, [postId]);

  const loadProfile = async () => {
    try {
      const data = await ProfileService.getProfile();
      if (data) {
        setProfile(data);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  };

  const loadPost = async () => {
    try {
      setError(null);
      
      const posts = await ProfileService.getPosts();
      const foundPost = posts.find((p) => p.id === normalizedPostId);
      
      if (foundPost) {
        setPost(foundPost);
        setError(null);
      } else {
        if (!post) {
          setError("Post não encontrado");
        }
      }
    } catch (error) {
      console.error("Erro ao carregar post:", error);
      if (!post) {
        setError("Erro ao carregar post");
      }
    }
  };

  const { isLiked, likesCount, toggleLike } = usePostLike(postId || '', post?.likes_count || 0);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = currentImageIndex * imageWidth;
    }
  }, [currentImageIndex, imageWidth]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const scrollLeft = e.currentTarget.scrollLeft;
    const newIndex = Math.round(scrollLeft / imageWidth);
    if (newIndex !== currentImageIndex && newIndex >= 0 && newIndex < (post?.images.length || 0)) {
      setCurrentImageIndex(newIndex);
    }
  };

  // Normalizar URL da imagem (suporta URLs do Supabase e caminhos locais)
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '/profile.jpg';
    
    // Se já for URL completa (http/https), retorna direto
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Se começar com /assets, remove o /assets pois o Vite já serve do public/assets
    if (imagePath.startsWith('/assets/')) {
      return imagePath.replace('/assets/', '/');
    }
    
    // Caso contrário, retorna como está
    return imagePath;
  };

  const showProfileSkeleton = !profile;
  const showPostSkeleton = !post;

  if (!post && error) {
    return (
      <div className={styles.container} ref={containerRef}>
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '16px',
            color: '#fff',
          }}
        >
          <p style={{ fontSize: '18px' }}>{error}</p>
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              background: '#0095f6',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Voltar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container} ref={containerRef}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <button onClick={() => navigate(-1)} className={styles.backButton}>
            <ChevronLeft color="#fff" size={28} />
          </button>
          <span className={styles.headerTitle}>Posts</span>
        </div>
        <button
          className={`${styles.followButton} ${isFollowing ? styles.followingButton : ''}`}
          onClick={() => toggleFollow()}
          disabled={showProfileSkeleton}
          style={{ opacity: showProfileSkeleton ? 0.5 : 1 }}
        >
          <span className={styles.followButtonText}>
            {isFollowing ? "Seguindo" : "Seguir"}
          </span>
        </button>
      </div>

      <div className={styles.scrollView}>
        <div className={styles.postHeader}>
          <div className={styles.userInfo}>
            <div className={styles.avatarContainer}>
              <div className={styles.avatarGradient}>
                <div className={styles.avatarInner}>
                  {showProfileSkeleton ? (
                    <div style={{ 
                      width: '100%', 
                      height: '100%', 
                      background: '#2a2a2a', 
                      borderRadius: '50%' 
                    }} />
                  ) : (
                    <img 
                      src={getImageUrl(profile.avatar_url)} 
                      alt="Avatar" 
                      className={styles.avatar}
                      onError={(e) => {
                        e.currentTarget.src = '/profile.jpg';
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
            <div>
              <span className={styles.username}>
                {showProfileSkeleton ? 'Carregando...' : profile?.username}
              </span>
              <span className={styles.date}>
                {showPostSkeleton ? '...' : post?.post_date}
              </span>
            </div>
          </div>
          <button
            disabled={showProfileSkeleton}
            className={styles.actionButton}
            aria-label="Mais opções"
          >
            <MoreVertical color="#fff" size={24} />
          </button>
        </div>

        <div className={styles.carouselContainer}>
          <div
            ref={scrollContainerRef}
            className={styles.imageScroll}
            onScroll={handleScroll}
            style={{ overflowX: 'auto', scrollSnapType: 'x mandatory', display: 'flex' }}
          >
              {showPostSkeleton ? (
                <div
                  className={styles.imageContainer}
                  style={{ 
                    width: imageWidth || '100%', 
                    height: imageWidth ? imageWidth * 1.25 : 500, 
                    flexShrink: 0,
                    background: '#2a2a2a',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
              ) : (
                post.images.map((image, index) => {
                  const imageUrl = getImageUrl(image);
                  
                  return (
                    <div
                      key={index}
                      className={styles.imageContainer}
                      style={{ 
                        width: imageWidth || '100%', 
                        height: imageWidth ? imageWidth * 1.25 : 'auto', 
                        flexShrink: 0, 
                        scrollSnapAlign: 'start'
                      }}
                    >
                      <img 
                        src={imageUrl} 
                        alt={`Post ${index + 1}`} 
                        className={styles.postImage}
                        onError={(e) => {
                          e.currentTarget.src = '/profile.jpg';
                        }}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    </div>
                  );
                })
              )}
          </div>

          {!showPostSkeleton && post.images.length > 1 && (
            <div className={styles.imageCounter}>
              <span className={styles.imageCounterText}>
                {currentImageIndex + 1}/{post.images.length}
              </span>
            </div>
          )}

          {!showPostSkeleton && post.images.length > 1 && (
            <div className={styles.dotsContainer}>
              {post.images.map((_, index) => (
                <div
                  key={index}
                  className={`${styles.dot} ${currentImageIndex === index ? styles.activeDot : ''}`}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.actionsContainer}>
          <div className={styles.leftActions}>
            <button onClick={() => toggleLike()} className={styles.actionButton} disabled={showPostSkeleton}>
              <Heart
                color={isLiked ? "#ff3040" : "#fff"}
                fill={isLiked ? "#ff3040" : "transparent"}
                size={28}
              />
            </button>
            <button onClick={() => post && navigate(`/post/${post.id}/comments`)} className={styles.actionButton} disabled={showPostSkeleton}>
              <MessageCircle
                color="#fff"
                fill="transparent"
                size={28}
                strokeWidth={1.8}
              />
            </button>
            <button 
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: 'Confira este post!',
                    text: post?.caption || 'Post no Instagram',
                    url: window.location.href
                  }).catch(err => console.log('Erro ao compartilhar:', err));
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Link copiado para a área de transferência!');
                }
              }} 
              className={styles.actionButton} 
              disabled={showPostSkeleton}
            >
              <Send
                color="#fff"
                fill="transparent"
                size={26}
                strokeWidth={1.8}
              />
            </button>
          </div>
          <button
            onClick={() => setIsSaved(!isSaved)}
            disabled={showPostSkeleton}
            className={styles.actionButton}
          >
            <Bookmark
              color="#fff"
              fill={isSaved ? "#fff" : "transparent"}
              size={26}
            />
          </button>
        </div>

        <div className={styles.likesContainer}>
          <span className={styles.likesText}>
            {showPostSkeleton ? '... curtidas' : `${likesCount} curtidas`}
          </span>
        </div>

        {!showPostSkeleton && post && commentsCount > 0 && (
          <button 
            className={styles.commentsButton}
            onClick={() => navigate(`/post/${post.id}/comments`)}
          >
            <span className={styles.commentsText}>
              Ver {commentsCount === 1 ? 'o' : 'todos os'} {commentsCount} {commentsCount === 1 ? 'comentário' : 'comentários'}
            </span>
          </button>
        )}

        <div className={styles.captionContainer}>
          <span className={styles.captionText}>
            {showPostSkeleton ? (
              'Carregando legenda...'
            ) : (
              <>
                <span className={styles.captionUsername}>{profile?.username ?? ''}</span> {post.caption}
              </>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

