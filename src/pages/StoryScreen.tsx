import { useNavigate, useSearchParams } from "react-router-dom";
import { X, Heart, Send, Volume2, VolumeX, Link2, ChevronLeft } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useFollow } from "@/hooks/useFollow";
import { useStoryLike } from "@/hooks/useStoryLike";
import { ChatService } from "@/services/chatService";
import { StoryService, type Story } from "@/services/storyService";
import { MediaService } from "@/services/mediaService";
import { ProfileService, type ProfileSettings } from "@/services/profileService";
import {
  StoryViewTrackingService,
  type StoryViewSessionContext,
  type StoryPlaybackEvent,
  type StoryViewExitReason,
} from "@/services/storyViewTrackingService";
import { supabase } from "@/lib/supabase";
import styles from "./StoryScreen.module.css";

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

// Helper para persistir UTMs e parâmetros de rastreamento
const appendTrackingParams = (targetUrl: string) => {
  try {
    const urlObj = new URL(targetUrl);
    const currentParams = new URLSearchParams(window.location.search);
    
    // Lista de parâmetros para repassar
    const paramsToForward = [
      'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
      'fbclid', 'ttclid', 'gclid', 'src', 'sck', 'funnel_id', 'utmify'
    ];

    paramsToForward.forEach(param => {
      const value = currentParams.get(param);
      if (value) {
        urlObj.searchParams.set(param, value);
      }
    });

    return urlObj.toString();
  } catch (error) {
    console.error('Erro ao adicionar params de tracking:', error);
    return targetUrl;
  }
};

// Componente para iframe simplificado (sem injeção de FBP)
const IframeWithFbp = ({ src, ...props }: { src: string | null;[key: string]: any }) => {
  if (!src) return null;
  const url = normalizeUrl(src);
  return <iframe src={url} {...props} />;
};

export default function StoryScreen() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const storyIdFromUrl = searchParams.get('id');
  const [storiesData, setStoriesData] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [storyMessage, setStoryMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [showIframe, setShowIframe] = useState(false);
  const { isFollowing, toggleFollow } = useFollow(profile?.username || '');
  const progressRefs = useRef<(HTMLDivElement | null)[]>([]);
  const progressAnims = useRef<(number | null)[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const currentStory = storiesData[currentIndex];
  const intervalRef = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // ── Tracking refs ──
  const viewSessionRef = useRef<StoryViewSessionContext | null>(null);
  const viewStartTimeRef = useRef<number>(0);
  const playbackEventsRef = useRef<StoryPlaybackEvent[]>([]);
  const trackingInitializedRef = useRef<string | null>(null); // storyId que já foi inicializado

  // Hook de like - sempre chamado, mas só funciona quando há story válido
  const { isLiked, toggleLike: toggleLikeFromHook } = useStoryLike(currentStory?.id || '');

  const performanceNow = useCallback(() => {
    if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
      return performance.now();
    }
    return Date.now();
  }, []);

  const toggleLike = async () => {
    if (currentStory?.id) {
      await toggleLikeFromHook();
    }
  };

  // ── Funções de tracking ──
  const commitCurrentSession = useCallback(async (exitReason: StoryViewExitReason) => {
    const session = viewSessionRef.current;
    if (!session) return;

    const story = storiesData.find(s => s.id === session.storyId);
    if (!story) return;

    const watchTimeMs = performanceNow() - viewStartTimeRef.current;
    const durationMs = story.duration || 5000;
    const viewedPercentage = Math.min(1, watchTimeMs / durationMs);

    try {
      await StoryViewTrackingService.commitViewSession(session, {
        watchTimeMs,
        viewedPercentage,
        completed: viewedPercentage >= 0.95,
        exitReason,
        startedAt: new Date(Date.now() - watchTimeMs).toISOString(),
        endedAt: new Date().toISOString(),
        playbackEvents: playbackEventsRef.current,
        mediaType: story.media_type,
        durationMs,
      });
    } catch (err) {
      console.error('❌ Erro ao salvar view do story:', err);
    }
  }, [storiesData, performanceNow]);

  // ── Iniciar sessão de tracking quando muda de story ──
  useEffect(() => {
    if (!currentStory) return;

    // Evitar dupla inicialização para o mesmo story
    if (trackingInitializedRef.current === currentStory.id) return;
    trackingInitializedRef.current = currentStory.id;

    // Commitar sessão anterior antes de iniciar nova
    if (viewSessionRef.current && viewSessionRef.current.storyId !== currentStory.id) {
      commitCurrentSession('story_switch');
    }

    // Iniciar nova sessão
    viewStartTimeRef.current = performanceNow();
    playbackEventsRef.current = [{ type: 'enter', timestamp: new Date().toISOString() }];

    StoryViewTrackingService.beginViewSession(currentStory.id)
      .then(session => {
        if (session) {
          viewSessionRef.current = session;
          console.log(`👁️ Tracking iniciado para story ${currentStory.id}`);
        }
      })
      .catch(err => console.error('Erro ao iniciar tracking:', err));
  }, [currentStory?.id, performanceNow, commitCurrentSession]);

  // ── Commit ao sair da página ou fechar ──
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (viewSessionRef.current) {
        // Usar sendBeacon via commitCurrentSession de forma sync-safe
        const session = viewSessionRef.current;
        const story = storiesData.find(s => s.id === session.storyId);
        if (!story) return;
        const watchTimeMs = performanceNow() - viewStartTimeRef.current;
        const durationMs = story.duration || 5000;
        const viewedPercentage = Math.min(1, watchTimeMs / durationMs);

        // Fire-and-forget: usar supabase diretamente para garantir que o request sai
        StoryViewTrackingService.commitViewSession(session, {
          watchTimeMs,
          viewedPercentage,
          completed: viewedPercentage >= 0.95,
          exitReason: 'screen_unload',
          startedAt: new Date(Date.now() - watchTimeMs).toISOString(),
          endedAt: new Date().toISOString(),
          playbackEvents: playbackEventsRef.current,
          mediaType: story.media_type,
          durationMs,
        }).catch(() => {});
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [storiesData, performanceNow]);

  // ── Cleanup ao desmontar componente ──
  useEffect(() => {
    return () => {
      if (viewSessionRef.current) {
        commitCurrentSession('close_button');
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Carregar stories e perfil do Supabase
  useEffect(() => {
    StoryService.clearAllStoriesCache();
    loadProfileAndStories();
  }, []);

  const loadProfileAndStories = async () => {
    try {
      setLoading(true);
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });

      if (profileData) {
        console.log('✅ Perfil carregado:', { username: profileData.username, name: profileData.name });
        setProfile(profileData);

        console.log(`🔍 Buscando stories para username: "${profileData.username}"`);
        const stories = await StoryService.getActiveStories(profileData.username);
        console.log(`📊 Stories encontrados: ${stories.length}`, stories.map(s => ({ id: s.id, order: s.order_index, active: s.is_active })));

        setStoriesData(stories);

        if (storyIdFromUrl && stories.length > 0) {
          const storyIndex = stories.findIndex(s => s.id === storyIdFromUrl);
          if (storyIndex !== -1) {
            setCurrentIndex(storyIndex);
            console.log(`✅ Abrindo story específico no índice ${storyIndex}`);
          }
        }
      } else {
        console.error('❌ Perfil não encontrado - tentando buscar sem filtro de is_active');
        try {
          const { data: fallbackProfile } = await supabase
            .from('profile_settings')
            .select('*')
            .limit(1)
            .single();

          if (fallbackProfile) {
            console.log('✅ Perfil encontrado (fallback):', { username: fallbackProfile.username });
            setProfile(fallbackProfile);
            const stories = await StoryService.getActiveStories(fallbackProfile.username);
            console.log(`📊 Stories encontrados (fallback): ${stories.length}`);
            setStoriesData(stories);
          }
        } catch (fallbackError) {
          console.error('❌ Erro no fallback de perfil:', fallbackError);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar perfil e stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = useCallback((_reason?: string) => {
    // Reset tracking para permitir inicialização do próximo story
    trackingInitializedRef.current = null;

    if (currentIndex < storiesData.length - 1) {
      if (progressAnims.current[currentIndex] !== null) {
        progressAnims.current[currentIndex] = 1;
        updateProgressBar(currentIndex, 1);
      }

      // Registrar evento de avanço
      playbackEventsRef.current.push({
        type: _reason === 'auto_advance' ? 'complete' : 'exit',
        timestamp: new Date().toISOString(),
        progress: progressAnims.current[currentIndex] ?? undefined,
        payload: { reason: _reason },
      });

      // Commitar sessão atual
      const exitReason: StoryViewExitReason = _reason === 'auto_advance' ? 'auto_advance' : 'manual_next';
      commitCurrentSession(exitReason);

      setCurrentIndex(currentIndex + 1);
    } else {
      // Último story — commitar e sair
      commitCurrentSession(_reason === 'auto_advance' ? 'auto_advance' : 'manual_next');
      navigate(-1);
    }
  }, [currentIndex, navigate, storiesData.length, commitCurrentSession]);

  const handlePrevious = useCallback(() => {
    trackingInitializedRef.current = null;

    if (currentIndex > 0) {
      commitCurrentSession('manual_previous');

      if (progressAnims.current[currentIndex] !== null) {
        progressAnims.current[currentIndex] = 0;
        updateProgressBar(currentIndex, 0);
      }
      setCurrentIndex(currentIndex - 1);
      if (progressAnims.current[currentIndex - 1] !== null) {
        progressAnims.current[currentIndex - 1] = 0;
        updateProgressBar(currentIndex - 1, 0);
      }
    }
  }, [currentIndex, commitCurrentSession]);

  const updateProgressBar = (index: number, progress: number) => {
    const bar = progressRefs.current[index];
    if (bar) {
      bar.style.width = `${progress * 100}%`;
    }
  };

  useEffect(() => {
    if (storiesData.length > 0) {
      storiesData.forEach((_, index) => {
        progressAnims.current[index] = index < currentIndex ? 1 : index === currentIndex ? 0 : 0;
      });
    }
  }, [storiesData, currentIndex]);

  // Prefetch da próxima story (otimização de performance)
  useEffect(() => {
    if (currentIndex < storiesData.length - 1) {
      const nextStory = storiesData[currentIndex + 1];
      if (nextStory && nextStory.media_type === 'image') {
        const img = new Image();
        img.src = nextStory.media_url;
      }
    }
  }, [currentIndex, storiesData]);

  useEffect(() => {
    if (!currentStory || isPaused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const duration = currentStory.duration;
    const startTime = performanceNow();
    const startProgress = progressAnims.current[currentIndex] || 0;

    const animate = () => {
      const now = performanceNow();
      const elapsed = now - startTime;
      const progress = Math.min(startProgress + elapsed / duration, 1);

      progressAnims.current[currentIndex] = progress;
      updateProgressBar(currentIndex, progress);

      if (progress >= 1) {
        handleNext('auto_advance');
      } else {
        intervalRef.current = window.requestAnimationFrame(animate);
      }
    };

    intervalRef.current = window.requestAnimationFrame(animate);

    return () => {
      if (intervalRef.current) {
        cancelAnimationFrame(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentIndex, currentStory, handleNext, isPaused, performanceNow]);

  const handleTapLeft = () => {
    handlePrevious();
  };

  const handleTapRight = () => {
    handleNext('manual_next');
  };

  const handleMouseDown = () => {
    setIsPaused(true);
    playbackEventsRef.current.push({ type: 'pause', timestamp: new Date().toISOString() });
  };

  const handleMouseUp = () => {
    setIsPaused(false);
    playbackEventsRef.current.push({ type: 'resume', timestamp: new Date().toISOString() });
  };

  const handleFollow = async () => {
    await toggleFollow();
  };

  const handleToggleMute = () => {
    setIsMuted((prev) => {
      const nextMuted = !prev;
      if (videoRef.current) {
        videoRef.current.muted = nextMuted;
      }
      playbackEventsRef.current.push({ type: 'mute_toggle', timestamp: new Date().toISOString(), payload: { muted: nextMuted } });
      return nextMuted;
    });
  };

  const handleVideoPlay = () => {};

  const handleVideoPause = () => {};

  const handleLinkClick = async (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();

    if (!currentStory) return;

    const targetLink = currentStory.link_url || profile?.link;
    if (!targetLink) return;

    let normalizedLink = normalizeUrl(targetLink);

    // Blindagem de Link: Adicionar parâmetros de rastreamento (UTMs)
    normalizedLink = appendTrackingParams(normalizedLink);

    // Registrar evento de link click no tracking
    playbackEventsRef.current.push({ type: 'link', timestamp: new Date().toISOString(), payload: { url: normalizedLink } });
    commitCurrentSession('link_click');

    setIsPaused(true);
    window.open(normalizedLink, '_blank');
  };

  // Atualizar muted quando trocar de story
  useEffect(() => {
    if (videoRef.current && currentStory?.media_type === 'video') {
      videoRef.current.muted = isMuted;
    }
  }, [currentIndex, isMuted, currentStory]);

  const handleSendStoryReply = async () => {
    if (!storyMessage.trim() || sending) return;

    try {
      setSending(true);

      // Para vídeos, gerar thumbnail se não existir
      let storyThumbnail = currentStory.thumbnail || undefined;
      if (currentStory.media_type === 'video' && !storyThumbnail) {
        const generated = await MediaService.createVideoThumbnailFromUrl(currentStory.media_url);
        if (generated) {
          storyThumbnail = generated;
          await StoryService.updateStoryThumbnail(currentStory.id, generated, currentStory.profile_username);
          setStoriesData((prev) =>
            prev.map((story) =>
              story.id === currentStory.id ? { ...story, thumbnail: generated } : story
            )
          );
        }
      }

      await ChatService.sendMessage(
        storyMessage,
        undefined,
        undefined,
        undefined,
        undefined,
        currentStory.media_url,
        currentStory.media_type,
        currentStory.id,
        storyThumbnail
      );

      // Registrar evento de reply no tracking
      playbackEventsRef.current.push({ type: 'reply', timestamp: new Date().toISOString() });

      setStoryMessage("");
      navigate('/chat');
    } catch (error) {
      console.error('Erro ao enviar resposta ao story:', error);
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendStoryReply();
    }
  };

  const handleClose = useCallback(async () => {
    trackingInitializedRef.current = null;
    await commitCurrentSession('close_button');
    navigate(-1);
  }, [navigate, commitCurrentSession]);

  // Swipe down logic
  const minSwipeDistance = 100;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
    isDraggingRef.current = true;

    if (contentRef.current) contentRef.current.style.transition = 'none';
    if (backdropRef.current) backdropRef.current.style.transition = 'none';
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !touchStartY.current) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStartY.current;

    if (deltaY < 0) return;

    if (contentRef.current && backdropRef.current) {
      const scale = Math.max(0.8, 1 - (deltaY / window.innerHeight) * 0.4);
      const opacity = Math.max(0, 1 - (deltaY / window.innerHeight) * 1.5);
      const borderRadius = Math.min(20, (deltaY / 100) * 20);

      contentRef.current.style.transform = `translateY(${deltaY}px) scale(${scale})`;
      contentRef.current.style.borderRadius = `${borderRadius}px`;
      backdropRef.current.style.opacity = opacity.toString();
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDraggingRef.current || !touchStartY.current) return;
    isDraggingRef.current = false;

    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY.current;

    if (deltaY > minSwipeDistance) {
      if (contentRef.current && backdropRef.current) {
        contentRef.current.style.transition = 'transform 0.3s ease-out';
        contentRef.current.style.transform = `translateY(100vh) scale(0.5)`;
        backdropRef.current.style.transition = 'opacity 0.3s ease-out';
        backdropRef.current.style.opacity = '0';

        setTimeout(() => {
          handleClose();
        }, 300);
      } else {
        handleClose();
      }
    } else {
      if (contentRef.current && backdropRef.current) {
        contentRef.current.style.transition = 'transform 0.3s ease-out, border-radius 0.3s ease-out';
        contentRef.current.style.transform = '';
        contentRef.current.style.borderRadius = '0px';
        backdropRef.current.style.transition = 'opacity 0.3s ease-out';
        backdropRef.current.style.opacity = '1';
      }
    }
    touchStartY.current = null;
  };

  // Loading state
  if (loading) {
    return (
      <div className={styles.container} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#fff', fontSize: '16px' }}>Carregando stories...</span>
      </div>
    );
  }

  // Sem stories
  if (storiesData.length === 0) {
    return (
      <div className={styles.container} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <span style={{ color: '#fff', fontSize: '16px' }}>Nenhum story disponível</span>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 20px',
            backgroundColor: '#363636',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          Voltar
        </button>
      </div>
    );
  }

  return (
    <div
      className={styles.container}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className={styles.backdrop} ref={backdropRef} />
      <div className={styles.content} ref={contentRef}>
        {currentStory.media_type === 'video' ? (
          <video
            ref={videoRef}
            src={currentStory.media_url}
            className={styles.backgroundImage}
            autoPlay
            muted={isMuted}
            playsInline
            loop={false}
            preload="auto"
            onPlay={handleVideoPlay}
            onPause={handleVideoPause}
          />
        ) : (
          <img src={currentStory.media_url} alt="Story" className={styles.backgroundImage} loading="eager" />
        )}

        <div className={styles.overlay}>
          <div className={styles.progressContainer}>
            {storiesData.map((_, index) => (
              <div key={index} className={styles.progressBarContainer}>
                <div className={styles.progressBarBackground}>
                  <div
                    ref={(el) => {
                      progressRefs.current[index] = el;
                    }}
                    className={styles.progressBarFill}
                    style={{
                      width: index < currentIndex ? '100%' : index === currentIndex ? '0%' : '0%',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className={styles.header}>
            <div className={styles.userInfo}>
              <div className={styles.avatarContainer}>
                <img
                  src={profile?.avatar_url || '/assets/images/profile.jpg'}
                  alt="Avatar"
                  className={styles.avatar}
                />
              </div>
              <span className={styles.username}>{profile?.username || 'Carregando...'}</span>
              <span className={styles.time}>14 h</span>
            </div>

            <div className={styles.headerActions}>
              {currentStory.media_type === 'video' && (
                <button
                  className={styles.muteButton}
                  onClick={handleToggleMute}
                  title={isMuted ? "Ativar som" : "Desativar som"}
                >
                  {isMuted ? (
                    <VolumeX color="#fff" size={24} />
                  ) : (
                    <Volume2 color="#fff" size={24} />
                  )}
                </button>
              )}
              {!isFollowing && (
                <button className={styles.followButton} onClick={handleFollow}>
                  <span className={styles.followButtonText}>Seguir</span>
                </button>
              )}
              <button className={styles.closeButton} onClick={handleClose}>
                <X color="#fff" size={28} />
              </button>
            </div>
          </div>

          <div className={styles.tapAreas}>
            <button
              className={styles.tapLeft}
              onClick={handleTapLeft}
            />
            <div
              className={styles.tapCenter}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleMouseDown}
              onTouchEnd={handleMouseUp}
            />
            <button
              className={styles.tapRight}
              onClick={handleTapRight}
            />
          </div>

          {/* Botão de link visual igual ao Instagram */}
          {currentStory && (currentStory.link_type === 'visible' || (!currentStory.link_type && currentStory.show_link)) && (currentStory.link_url || profile?.link) && (
            <button
              className={styles.storyLinkButton}
              onClick={handleLinkClick}
              title="Abrir link"
              style={
                currentStory.link_type === 'visible' && currentStory.link_x !== undefined && currentStory.link_y !== undefined
                  ? {
                    left: `${currentStory.link_x}%`,
                    top: `${currentStory.link_y}%`,
                    transform: 'translate(-50%, -50%)',
                  }
                  : undefined
              }
            >
              <Link2 className={styles.storyLinkIcon} size={16} />
              <span className={styles.storyLinkText}>LINK DO CÓDIGO</span>
            </button>
          )}

          {/* Link Invisível - Área clicável posicionada */}
          {currentStory && currentStory.link_type === 'invisible' && (currentStory.link_url || profile?.link) && (
            <div
              style={{
                position: 'absolute',
                left: `${currentStory.link_x ?? 50}%`,
                top: `${currentStory.link_y ?? 50}%`,
                width: '120px',
                height: '60px',
                transform: 'translate(-50%, -50%)',
                zIndex: 20,
                cursor: 'pointer',
              }}
              onClick={handleLinkClick}
              onTouchEnd={handleLinkClick}
            />
          )}

          {/* Modal de iframe fullscreen */}
          {showIframe && (currentStory?.link_url || profile?.link) && (
            <div className={styles.iframeModal}>
              <div className={styles.iframeHeader}>
                <button
                  className={styles.iframeCloseButton}
                  onClick={() => setShowIframe(false)}
                >
                  <ChevronLeft color="#fff" size={28} />
                </button>
                <span className={styles.iframeUrl}>{currentStory?.link_url || profile?.link}</span>
              </div>
              <IframeWithFbp
                src={currentStory?.link_url || profile?.link || ''}
                className={styles.iframeContent}
                title="Story Link"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          <div className={styles.footer}>
            <div className={styles.messageInputContainer}>
              <input
                type="text"
                className={styles.messageInput}
                placeholder="Enviar mensagem..."
                value={storyMessage}
                onChange={(e) => setStoryMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending}
              />
            </div>
            <button
              className={styles.footerButton}
              onClick={() => toggleLike()}
            >
              <Heart
                color={isLiked ? "#ff3040" : "#fff"}
                fill={isLiked ? "#ff3040" : "transparent"}
                size={28}
              />
            </button>
            <button
              className={styles.footerButton}
              onClick={handleSendStoryReply}
              disabled={!storyMessage.trim() || sending}
              style={{ opacity: storyMessage.trim() ? 1 : 0.5 }}
            >
              <Send color="#fff" size={28} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}