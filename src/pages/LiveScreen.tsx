
import { useNavigate } from "react-router-dom";
import { X, Heart, Send } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import styles from "./LiveScreen.module.css";
import { ProfileService } from "@/services/profileService";
import { liveService, LiveComment, LiveConfig } from "@/services/liveService";

export default function LiveScreen() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<LiveConfig | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [visibleComments, setVisibleComments] = useState<LiveComment[]>([]);
  const [viewerCount, setViewerCount] = useState(0);
  const [commentInput, setCommentInput] = useState("");

  const [username, setUsername] = useState<string | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [tempUsername, setTempUsername] = useState("");
  const initialMount = useRef(true);

  // Load Config
  useEffect(() => {
    const init = async () => {
      try {
        const [prof, conf] = await Promise.all([
          ProfileService.getProfile(),
          liveService.getLiveConfig()
        ]);
        
        setProfile(prof);
        setConfig(conf);
        
        if (conf) {
          setViewerCount(liveService.getRandomViewerCount(conf.viewer_count_min, conf.viewer_count_max));
        }

        // Try load saved username
        const saved = localStorage.getItem('live_username');
        if (saved) setUsername(saved);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Comments Handling
  useEffect(() => {
    if (!config || !config.is_active) return;
    
    // Only fetch comments once on mount/config change to avoid overwriting user comments on re-fetches potentially
    // But since we mix them in visibleComments, it's safer to just fetch source here.
    if (initialMount.current) {
        const fetchComments = async () => {
        const allComments = await liveService.getComments();
        setComments(allComments);
        };
        fetchComments();
        initialMount.current = false;
    }
  }, [config]);

  // Video Progress & Timed Comments
  useEffect(() => {
    if (!videoRef.current || comments.length === 0) return;
    
    const video = videoRef.current;
    
    const handleTimeUpdate = () => {
      const currentTime = Math.floor(video.currentTime);
      
      // 1. Timed comments
      const timed = comments.filter(c => c.video_timestamp === currentTime);
      if (timed.length > 0) {
        setVisibleComments(prev => {
          // Avoid duplicates
          const newComments = timed.filter(t => !prev.some(p => p.id === t.id));
          if (newComments.length === 0) return prev;
          return [...prev, ...newComments].slice(-8); 
        });
      }
    };

    // 2. Random filler comments
    const randomInterval = setInterval(() => {
      const randomPool = comments.filter(c => !c.video_timestamp); // only non-timed
      if (randomPool.length > 0) {
        const randomComment = randomPool[Math.floor(Math.random() * randomPool.length)];
        // Unique ID for randoms
        const uniqueComment = { ...randomComment, id: `${randomComment.id}-${Date.now()}` }; 
        setVisibleComments(prev => [...prev, uniqueComment].slice(-8));
      }
    }, 2500 + Math.random() * 3000);

    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      clearInterval(randomInterval);
    };
  }, [comments]);
  
  // Simulate fluctuating viewer count
  useEffect(() => {
    if (!config) return;
    const interval = setInterval(() => {
      setViewerCount(prev => {
        const change = Math.floor(Math.random() * 21) - 10;
        return Math.max(config.viewer_count_min, Math.min(config.viewer_count_max, prev + change));
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [config]);

  const handleClose = () => {
    navigate(-1);
  };

  const cleanUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return url; 
  };

  const handleSendComment = () => {
    if (!commentInput.trim()) return;

    if (!username) {
        setShowUserModal(true);
        return;
    }

    const newComment: LiveComment = {
        id: `user-${Date.now()}`,
        username: username,
        message: commentInput,
        is_active: true,
        created_at: new Date().toISOString()
    };

    // Add strictly to UI, do not send to backend
    setVisibleComments(prev => [...prev, newComment].slice(-8));
    setCommentInput("");
  };

  const confirmUsername = () => {
    if (!tempUsername.trim()) return;
    const final = tempUsername.replace('@', '').trim();
    setUsername(final);
    localStorage.setItem('live_username', final);
    setShowUserModal(false);
    
    // Post the comment that was pending
    if (commentInput.trim()) {
        const newComment: LiveComment = {
            id: `user-${Date.now()}`,
            username: final,
            message: commentInput,
            is_active: true,
            created_at: new Date().toISOString()
        };
        setVisibleComments(prev => [...prev, newComment].slice(-8));
        setCommentInput("");
    }
  };

  const [floatingHearts, setFloatingHearts] = useState<{id: number, left: number}[]>([]); 
  const [isLikeAnimating, setIsLikeAnimating] = useState(false);

  // ... (previous useEffects)

  const handleLike = () => {
    // 1. Add floating heart
    const id = Date.now();
    // Randomize horizontal position slightly for natural feel
    const randomLeft = Math.random() * 20 - 10; // -10 to +10px
    setFloatingHearts(prev => [...prev, { id, left: randomLeft }]);

    // 2. Animate button
    setIsLikeAnimating(true);
    setTimeout(() => setIsLikeAnimating(false), 300);

    // 3. Remove heart after animation
    setTimeout(() => {
        setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 2000);
  };
  
  if (loading) return <div style={{background: '#000', height: '100vh'}} />;
  
  if (!config?.is_active) {
    return (
      <div style={{background: '#000', height: '100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff'}}>
        <p>Live encerrada</p>
        <button onClick={handleClose} style={{marginTop: 20, padding: '10px 20px'}}>Voltar</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Username Modal */}
      {showUserModal && (
        <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
                <h3 className={styles.modalTitle}>Como você quer aparecer?</h3>
                <input 
                    className={styles.modalInput}
                    placeholder="@seu_usuario"
                    value={tempUsername}
                    onChange={e => setTempUsername(e.target.value)}
                    autoFocus
                />
                <button className={styles.modalButton} onClick={confirmUsername}>
                    Confirmar
                </button>
            </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={cleanUrl(config.video_url)}
        className={styles.videoLayer}
        autoPlay
        playsInline
        webkit-playsinline="true"
        loop
        muted={false} 
      />

      {/* Floating Hearts Container */}
      <div className={styles.floatingHeartsContainer}>
        {floatingHearts.map(heart => (
            <div 
                key={heart.id} 
                className={styles.floatingHeart}
                style={{ transform: `translateX(${heart.left}px)` }} // Add random sway if needed, but simple up is good
            >
                <Heart fill="#E60023" color="#E60023" size={24} />
            </div>
        ))}
      </div>

      {/* Header Overlay */}
      <div className={styles.header}>
        <div className={styles.hostInfo}>
          <img 
            src={cleanUrl(profile?.avatar_url || '/profile.jpg')} 
            className={styles.hostAvatar} 
            alt="Host" 
          />
          <div style={{display:'flex', flexDirection:'column'}}>
            <span className={styles.hostName}>{profile?.username}</span>
          </div>
          <div className={styles.liveBadge}>AO VIVO</div>
        </div>
        
        <div style={{display:'flex', gap: 10}}>
          <div className={styles.viewerCount}>
            <span style={{fontSize: 16}}>👁</span> {viewerCount.toLocaleString()}
          </div>
          <button className={styles.closeButton} onClick={handleClose}>
            <X size={24} />
          </button>
        </div>
      </div>

      {/* Footer / Comments Overlay */}
      <div className={styles.overlayLayer} style={{pointerEvents: 'none'}}> 
        
        <div className={styles.commentsSection}>
          <div className={styles.commentsList}>
            {visibleComments.map((comment, idx) => (
              <div key={comment.id || idx} className={styles.commentItem}>
                <img 
                  src={comment.avatar_url || '/profile.jpg'} 
                  className={styles.commentAvatar} 
                  alt="User"
                  onError={(e) => { e.currentTarget.src = '/profile.jpg'}}
                />
                <div className={styles.commentContent}>
                  <p className={styles.commentText}>
                    <span className={styles.commentUsername}>{comment.username}</span>{' '}
                    {comment.message}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.inputSection}>
           <div className={styles.commentInputWrapper}>
             <input 
               className={styles.commentInput} 
               placeholder="Comentar..." 
               value={commentInput}
               onChange={(e) => setCommentInput(e.target.value)}
               onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
             />
           </div>
           
           <div style={{display:'flex', gap: 12}}>
             <button 
                className={`${styles.actionButton} ${isLikeAnimating ? styles.likeButtonActive : ''}`} 
                onClick={handleLike}
             >
               <Heart size={28} fill={isLikeAnimating ? "#E60023" : "none"} color={isLikeAnimating ? "#E60023" : "#fff"} strokeWidth={1.5} />
             </button>
             <button className={styles.actionButton} onClick={handleSendComment}>
               <Send size={24} strokeWidth={1.5} style={{transform: 'rotate(45deg)', marginTop: -2}} />
             </button>
           </div>
        </div>
      </div>
    </div>
  );
}
