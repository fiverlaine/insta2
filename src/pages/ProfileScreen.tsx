import { useNavigate, useLocation } from "react-router-dom";
import { Grid3x3, PlaySquare, UserSquare, ChevronLeft, MoreVertical, Link2 } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { ProfileService, type ProfileSettings, type Post } from "@/services/profileService";
import { useFollow } from "@/hooks/useFollow";
import { StoryService } from "@/services/storyService";
import styles from "./ProfileScreen.module.css";

// Função helper para normalizar URLs (evita duplicação de https://)
const normalizeUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  // Remove espaços e quebras de linha
  url = url.trim();
  // Se já começa com http:// ou https://, retorna como está
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  // Caso contrário, adiciona https://
  return `https://${url}`;
};

// Componente para iframe com fbp na URL
const IframeWithFbp = ({ src, ...props }: { src: string | null;[key: string]: any }) => {
  const [iframeSrc, setIframeSrc] = useState<string>('');

  useEffect(() => {
    const addFbpToUrl = async () => {
      let url = normalizeUrl(src);

      // Adicionar fbp na URL para garantir match entre eventos
      try {
        const { getFbpCookie } = await import('@/utils/facebookPixel');
        const fbp = getFbpCookie();
        if (fbp) {
          const urlObj = new URL(url);
          // Não sobrescrever se já existir
          if (!urlObj.searchParams.has('fbp')) {
            urlObj.searchParams.set('fbp', fbp);
            url = urlObj.toString();
          }
        }
      } catch (fbpError) {
        console.warn('Erro ao adicionar fbp na URL do iframe:', fbpError);
      }

      setIframeSrc(url);
    };

    if (src) {
      addFbpToUrl();
    }
  }, [src]);

  if (!iframeSrc) {
    return null;
  }

  return <iframe src={iframeSrc} {...props} />;
};

export default function ProfileScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<"grid" | "reels" | "tagged">("grid");
  const [showIframe, setShowIframe] = useState(false);
  const cachedProfile = useMemo(() => ProfileService.getCachedProfileSync(), []);
  const cachedPosts = useMemo(() => ProfileService.getCachedPostsSync(), []);
  const [profile, setProfile] = useState<ProfileSettings | null>(cachedProfile);
  const [posts, setPosts] = useState<Post[]>(cachedPosts);

  const { isFollowing, toggleFollow } = useFollow(profile?.username || '');

  // Carregar perfil e posts do Supabase
  useEffect(() => {
    loadProfile();
    loadPosts();
  }, []);

  // Carregar stories quando perfil estiver disponível
  useEffect(() => {
    if (profile) {
      StoryService.preloadStories(profile.username);
    }
  }, [profile?.username]);

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

  const loadPosts = async () => {
    try {
      const data = await ProfileService.getPosts();
      setPosts(data);
    } catch (error) {
      console.error("Erro ao carregar posts:", error);
    }
  };

  const handleFollow = async () => {
    await toggleFollow();
  };

  const handlePostPress = (postId: string) => {
    navigate(`/post/${postId}`);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1).replace(".", ",")}mi`;
    } else if (num >= 1000) {
      const mil = Math.floor(num / 1000);
      return `${mil} mil`;
    }
    return num.toString();
  };

  // Normalizar URL da imagem (suporta URLs do Supabase e caminhos locais)
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) {
      console.warn('⚠️ Imagem sem caminho');
      return '/profile.jpg';
    }

    // Se já for URL completa (http/https), retorna direto
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    // Se começar com /assets, remove o /assets pois o Vite já serve do public/assets
    if (imagePath.startsWith('/assets/')) {
      return imagePath.replace('/assets/', '/');
    }

    // Caso contrário, retorna como está (pode ser caminho relativo)
    return imagePath;
  };

  // Skeleton somente quando não há dados locais
  const showSkeleton = !profile;
  const showPostsSkeleton = posts.length === 0;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <ChevronLeft color="#fff" size={28} />
          <span className={styles.headerUsername}>
            {showSkeleton ? '...' : profile?.username}
          </span>
        </div>
        <MoreVertical color="#fff" size={24} />
      </div>

      <div className={styles.scrollView}>
        <div className={styles.profileSection}>
          <div className={styles.profileHeader}>
            <button
              className={styles.avatarContainer}
              onClick={() => !showSkeleton && navigate('/story', { state: { background: location } })}
              style={{ opacity: showSkeleton ? 0.5 : 1 }}
            >
              <div className={styles.avatarGradient}>
                <div className={styles.avatarInner}>
                  {showSkeleton ? (
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
            </button>

            <div className={styles.profileInfo}>
              <span className={styles.profileName}>
                {showSkeleton ? 'Carregando...' : profile?.name}
              </span>

              <div className={styles.statsContainer}>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>
                    {showSkeleton ? '...' : profile?.posts_count}
                  </span>
                  <span className={styles.statLabel}>posts</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>
                    {showSkeleton ? '...' : formatNumber(profile?.followers_count || 0)}
                  </span>
                  <span className={styles.statLabel}>seguidores</span>
                </div>
                <div className={styles.statItem}>
                  <span className={styles.statNumber}>
                    {showSkeleton ? '...' : profile?.following_count}
                  </span>
                  <span className={styles.statLabel}>seguindo</span>
                </div>
              </div>
            </div>
          </div>

          <div className={styles.bioSection}>
            {showSkeleton ? (
              <>
                <span className={styles.bioText}>Carregando bio...</span>
              </>
            ) : (
              <>
                {profile?.bio.map((line, index) => (
                  <span key={index} className={styles.bioText}>
                    {line}
                  </span>
                ))}
                {profile?.link && (
                  <button
                    className={styles.linkContainer}
                    onClick={() => setShowIframe(true)}
                  >
                    <Link2 color="#74A1FF" size={13} className={styles.linkIcon} />
                    <span className={styles.bioLink}>{profile.link}</span>
                  </button>
                )}
              </>
            )}
          </div>

          <div className={styles.actionsContainer}>
            <button
              className={`${styles.followButton} ${isFollowing ? styles.followingButton : ''}`}
              onClick={handleFollow}
              disabled={showSkeleton}
              style={{ opacity: showSkeleton ? 0.5 : 1 }}
            >
              <span className={styles.followButtonText}>
                {isFollowing ? "Seguindo" : "Seguir"}
              </span>
            </button>
            <button
              className={styles.messageButton}
              onClick={() => navigate('/chat')}
              disabled={showSkeleton}
              style={{ opacity: showSkeleton ? 0.5 : 1 }}
            >
              <span className={styles.messageButtonText}>Mensagem</span>
            </button>
            <button className={styles.iconButton} disabled={showSkeleton} style={{ opacity: showSkeleton ? 0.5 : 1 }}>
              <UserSquare color="#fff" size={16} />
            </button>
          </div>
        </div>

        <div className={styles.tabsContainer}>
          <button
            className={`${styles.tab} ${activeTab === "grid" ? styles.activeTab : ''}`}
            onClick={() => setActiveTab("grid")}
          >
            <Grid3x3 color="#fff" size={24} />
          </button>
          <button
            className={`${styles.tab} ${activeTab === "reels" ? styles.activeTab : ''}`}
            onClick={() => setActiveTab("reels")}
          >
            <PlaySquare color="#fff" size={24} />
          </button>
          <button
            className={`${styles.tab} ${activeTab === "tagged" ? styles.activeTab : ''}`}
            onClick={() => setActiveTab("tagged")}
          >
            <UserSquare color="#fff" size={24} />
          </button>
        </div>

        {activeTab === 'grid' ? (
          <div className={styles.gridContainer}>
            {showPostsSkeleton ? (
              Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={`skeleton-${i}`}
                  className={styles.gridItem}
                  style={{
                    background: '#2a2a2a',
                    animation: 'pulse 1.5s ease-in-out infinite'
                  }}
                />
              ))
            ) : (
              posts.map((post) => {
                const thumbnailUrl = getImageUrl(post.images[0]);

                return (
                  <button
                    key={post.id}
                    className={styles.gridItem}
                    onClick={() => handlePostPress(post.id)}
                  >
                    <img
                      src={thumbnailUrl}
                      alt="Post"
                      className={styles.gridImage}
                      onError={(e) => {
                        e.currentTarget.src = '/profile.jpg';
                      }}
                    />
                    {post.images.length > 1 && (
                      <div className={styles.multipleIndicator} aria-hidden="true">
                        <svg
                          className={styles.multipleIcon}
                          viewBox="0 0 48 48"
                          role="img"
                          focusable="false"
                        >
                          <path d="M34.8 29.7V11c0-2.9-2.3-5.2-5.2-5.2H11c-2.9 0-5.2 2.3-5.2 5.2v18.7c0 2.9 2.3 5.2 5.2 5.2h18.7c2.8-.1 5.1-2.4 5.1-5.2zM39.2 15v16.1c0 4.5-3.7 8.2-8.2 8.2H14.9c-.6 0-.9.7-.5 1.1 1 1.1 2.4 1.8 4.1 1.8h13.4c5.7 0 10.3-4.6 10.3-10.3V18.5c0-1.6-.7-3.1-1.8-4.1-.5-.4-1.2 0-1.2.6z" />
                        </svg>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <svg
                aria-label="Câmera"
                className={styles.emptyIcon}
                fill="currentColor"
                height="62"
                width="62"
                viewBox="0 0 96 96"
                role="img"
              >
                <circle cx="48" cy="48" fill="none" r="47" stroke="currentColor" strokeMiterlimit="10" strokeWidth="2" />
                <ellipse cx="48.002" cy="49.524" fill="none" rx="10.444" ry="10.476" stroke="currentColor" strokeLinejoin="round" strokeWidth="2.095" />
                <path d="M63.994 69A8.02 8.02 0 0 0 72 60.968V39.456a8.023 8.023 0 0 0-8.01-8.035h-1.749a4.953 4.953 0 0 1-4.591-3.242C56.61 25.696 54.859 25 52.469 25h-8.983c-2.39 0-4.141.695-5.181 3.178a4.954 4.954 0 0 1-4.592 3.242H32.01a8.024 8.024 0 0 0-8.012 8.035v21.512A8.02 8.02 0 0 0 32.007 69Z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="2" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Ainda não há nenhum post</h2>
          </div>
        )}
      </div>

      {/* Modal de iframe fullscreen */}
      {showIframe && profile && profile.link && (
        <div className={styles.iframeModal}>
          <div className={styles.iframeHeader}>
            <button
              className={styles.iframeCloseButton}
              onClick={() => setShowIframe(false)}
            >
              <ChevronLeft color="#fff" size={28} />
            </button>
            <span className={styles.iframeUrl}>{profile.link}</span>
          </div>
          <IframeWithFbp
            src={profile.link}
            className={styles.iframeContent}
            title="Bio Link"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}
    </div>
  );
}

