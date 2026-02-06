import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Heart } from "lucide-react";
import { useState, useEffect } from "react";
import { CommentService, type Comment as SupabaseComment } from "@/services/commentService";
import { AvatarService } from "@/services/avatarService";
import styles from "./CommentsScreen.module.css";

// Interface local para compatibilidade com o componente
interface Comment {
  id: string;
  postId: string;
  username: string;
  avatar: string;
  isVerified: boolean;
  text: string;
  likes: number;
  timeAgo: string;
  replies?: Comment[];
}

export default function CommentsScreen() {
  const navigate = useNavigate();
  const { postId } = useParams<{ postId: string }>();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  // Converter comentário do Supabase para formato local
  const convertSupabaseToLocal = (supabaseComment: SupabaseComment): Comment => {
    return {
      id: supabaseComment.id,
      postId: supabaseComment.post_id,
      username: supabaseComment.username,
      avatar: supabaseComment.avatar_url || AvatarService.getRandomAvatar(),
      isVerified: supabaseComment.is_verified,
      text: supabaseComment.text,
      likes: supabaseComment.likes_count,
      timeAgo: supabaseComment.time_ago,
      replies: supabaseComment.replies?.map(convertSupabaseToLocal) || []
    };
  };

  // Carregar comentários do Supabase
  useEffect(() => {
    const loadComments = async () => {
      if (!postId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabaseComments = await CommentService.getCommentsByPost(postId);
        const convertedComments = supabaseComments.map(convertSupabaseToLocal);
        setComments(convertedComments);
      } catch (error) {
        console.error('Erro ao carregar comentários:', error);
        setComments([]);
      } finally {
        setLoading(false);
      }
    };

    loadComments();
  }, [postId]);

  const toggleLikeComment = (commentId: string) => {
    setLikedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const toggleReplies = (commentId: string) => {
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commentId)) {
        newSet.delete(commentId);
      } else {
        newSet.add(commentId);
      }
      return newSet;
    });
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isLiked = likedComments.has(comment.id);
    const isExpanded = expandedComments.has(comment.id);
    const hasReplies = comment.replies && comment.replies.length > 0;

    return (
      <div key={comment.id} className={isReply ? styles.replyItem : styles.commentItem}>
        <div className={styles.commentContent}>
          <div className={styles.avatarContainer}>
            <img 
              src={comment.avatar} 
              alt={comment.username} 
              className={styles.avatar}
              onError={(e) => {
                e.currentTarget.src = '/profile.jpg';
              }}
            />
          </div>

          <div className={styles.commentTextSection}>
            <div className={styles.commentHeader}>
              <span className={styles.username}>
                {comment.username}
                {comment.isVerified && (
                  <svg 
                    aria-label="Verificado" 
                    className={styles.verifiedBadge}
                    fill="#0095f6" 
                    height="12" 
                    width="12" 
                    viewBox="0 0 40 40"
                  >
                    <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"></path>
                  </svg>
                )}
              </span>
              <span className={styles.commentTime}>{comment.timeAgo}</span>
            </div>

            <p className={styles.commentText}>
              {comment.text.split(' ').map((word, i) => {
                if (word.startsWith('#') || word.startsWith('@')) {
                  return (
                    <span key={i} className={styles.hashtag}>
                      {word}{' '}
                    </span>
                  );
                }
                return word + ' ';
              })}
            </p>

            <div className={styles.commentActions}>
              {comment.likes > 0 && (
                <span className={styles.likesCount}>{comment.likes} curtidas</span>
              )}
              <button className={styles.replyButton}>Responder</button>
            </div>

            {hasReplies && !isExpanded && (
              <button 
                className={styles.viewRepliesButton}
                onClick={() => toggleReplies(comment.id)}
              >
                <div className={styles.replyLine} />
                <span className={styles.viewRepliesText}>
                  Ver todas as {comment.replies!.length} respostas
                </span>
              </button>
            )}

            {hasReplies && isExpanded && (
              <>
                <button 
                  className={styles.hideRepliesButton}
                  onClick={() => toggleReplies(comment.id)}
                >
                  <div className={styles.replyLine} />
                  <span className={styles.hideRepliesText}>
                    Ocultar respostas
                  </span>
                </button>
                <div className={styles.repliesContainer}>
                  {comment.replies!.map(reply => renderComment(reply, true))}
                </div>
              </>
            )}
          </div>

          <button 
            className={styles.likeButton}
            onClick={() => toggleLikeComment(comment.id)}
          >
            <Heart
              color={isLiked ? "#ff3040" : "#fff"}
              fill={isLiked ? "#ff3040" : "transparent"}
              size={12}
            />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <ChevronLeft color="#fff" size={28} />
        </button>
        <h1 className={styles.title}>Comentários</h1>
      </div>

      <div className={styles.scrollView}>
        {loading ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <svg
                aria-label="Comentário"
                className={styles.emptyIcon}
                fill="currentColor"
                height="62"
                width="62"
                viewBox="0 0 48 48"
              >
                <path d="M47.5 46.1l-2.8-11c1.8-3.3 2.8-7.1 2.8-11.1C47.5 11 37 .5 24 .5S.5 11 .5 24 11 47.5 24 47.5c4 0 7.8-1 11.1-2.8l11 2.8c.8.2 1.6-.6 1.4-1.4zm-3-22.1c0 4-1 7-2.6 10-.2.4-.3.9-.2 1.4l2.1 8.4-8.3-2.1c-.5-.1-1-.1-1.4.2-1.8 1-5.2 2.6-10 2.6-11.4 0-20.6-9.2-20.6-20.5S12.7 3.5 24 3.5 44.5 12.7 44.5 24z"></path>
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Carregando comentários...</h2>
          </div>
        ) : comments.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconWrapper}>
              <svg
                aria-label="Comentário"
                className={styles.emptyIcon}
                fill="currentColor"
                height="62"
                width="62"
                viewBox="0 0 48 48"
              >
                <path d="M47.5 46.1l-2.8-11c1.8-3.3 2.8-7.1 2.8-11.1C47.5 11 37 .5 24 .5S.5 11 .5 24 11 47.5 24 47.5c4 0 7.8-1 11.1-2.8l11 2.8c.8.2 1.6-.6 1.4-1.4zm-3-22.1c0 4-1 7-2.6 10-.2.4-.3.9-.2 1.4l2.1 8.4-8.3-2.1c-.5-.1-1-.1-1.4.2-1.8 1-5.2 2.6-10 2.6-11.4 0-20.6-9.2-20.6-20.5S12.7 3.5 24 3.5 44.5 12.7 44.5 24z"></path>
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Nenhum comentário ainda</h2>
            <p className={styles.emptyText}>Seja o primeiro a comentar</p>
          </div>
        ) : (
          <div className={styles.commentsList}>
            {comments.map(comment => renderComment(comment))}
          </div>
        )}
      </div>

      <div className={styles.inputContainer}>
        <div className={styles.avatarContainer}>
          <img 
            src="/profile.jpg" 
            alt="Seu avatar" 
            className={styles.inputAvatar}
          />
        </div>
        <input
          type="text"
          className={styles.input}
          placeholder="Adicione um comentário..."
          disabled
        />
      </div>
    </div>
  );
}

