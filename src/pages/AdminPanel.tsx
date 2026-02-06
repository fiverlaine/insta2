import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AdminChatService } from "@/services/chatService";
import { MediaService } from "@/services/mediaService";
import type { Conversation, Message } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { Send, Users, MessageCircle, Clock, Camera, Image as ImageIcon, Mic, Smile, Film, User, LogOut, BarChart3, TrendingUp, Eye, MessageSquare } from "lucide-react";
import { clearAllCache, clearSupabaseImageCache, diagnoseImageLoading } from "@/utils/cacheBuster";
import { ProfileService } from "@/services/profileService";
import { logoutAdmin } from "@/utils/adminAuth";
import { StoryService } from "@/services/storyService";
import { StoryViewTrackingService } from "@/services/storyViewTrackingService";
import styles from "./AdminPanel.module.css";

export default function AdminPanel() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [totalStoryViews, setTotalStoryViews] = useState(0);
  const [totalUniqueViews, setTotalUniqueViews] = useState(0);
  const [activeStories, setActiveStories] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Carregar conversas
  useEffect(() => {
    loadConversations();
    loadStoryStats();
  }, []);

  const loadStoryStats = async () => {
    try {
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (!profileData) return;
      
      const stories = await StoryService.getActiveStories(profileData.username);
      setActiveStories(stories.length);

      const allStats = await StoryViewTrackingService.getAllStoriesStats();
      
      let totalViews = 0;
      let totalUnique = 0;
      
      allStats.forEach(stat => {
        totalViews += stat.total_views;
        totalUnique += stat.unique_views;
      });

      setTotalStoryViews(totalViews);
      setTotalUniqueViews(totalUnique);
    } catch (error) {
      console.error('Erro ao carregar estatísticas de stories:', error);
    }
  };

  // Subscrever a updates de conversas
  useEffect(() => {
    const unsubscribe = AdminChatService.subscribeToConversations((updatedConv) => {
      setConversations((prev) => {
        const index = prev.findIndex((c) => c.id === updatedConv.id);
        if (index >= 0) {
          const newConvs = [...prev];
          newConvs[index] = updatedConv;
          return newConvs.sort((a, b) => 
            new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
          );
        } else {
          return [updatedConv, ...prev];
        }
      });
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Carregar mensagens quando seleciona conversa
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  // Subscrever a novas mensagens da conversa selecionada
  useEffect(() => {
    if (!selectedConversation) return;

    const channel = supabase
      .channel(`admin-messages:${selectedConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${selectedConversation.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          // Verificar se a mensagem já existe antes de adicionar
          setMessages((prev) => {
            const exists = prev.some((msg) => msg.id === newMessage.id);
            if (exists) return prev;
            return [...prev, newMessage];
          });
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  // Auto scroll
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const convs = await AdminChatService.getAllConversations();
      setConversations(convs);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar mensagens:', error);
        return;
      }

      setMessages(data || []);
    } catch (error) {
      console.error('Erro no loadMessages:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!messageInput.trim() || !selectedConversation || sending) return;

    try {
      setSending(true);
      const newMessage = await AdminChatService.sendAdminMessage(
        selectedConversation.id,
        messageInput.trim()
      );
      
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
        setMessageInput("");
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!selectedConversation || uploading) return;

    try {
      setUploading(true);

      if (!MediaService.isValidFileType(file)) {
        alert('Tipo de arquivo não suportado');
        return;
      }

      let fileToUpload = file;
      if (MediaService.getMediaType(file) === 'image') {
        fileToUpload = await MediaService.compressImage(file);
      }

      const uploadResult = await MediaService.uploadFile(fileToUpload, selectedConversation.id);
      if (!uploadResult) {
        alert('Erro ao fazer upload do arquivo');
        return;
      }

      const mediaType = MediaService.getMediaType(file);
      let thumbnail: string | undefined;
      let duration: number | undefined;

      if (mediaType === 'video') {
        thumbnail = await MediaService.createVideoThumbnail(file) || undefined;
        duration = await MediaService.getMediaDuration(file) || undefined;
      } else if (mediaType === 'audio') {
        duration = await MediaService.getMediaDuration(file) || undefined;
      }

      const newMessage = await AdminChatService.sendAdminMessage(
        selectedConversation.id,
        '',
        uploadResult.url,
        mediaType,
        thumbnail,
        duration
      );

      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
      }
    } catch (error) {
      console.error('Erro ao enviar mídia:', error);
      alert('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = '';
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  };

  const handleDiagnose = async () => {
    console.log('🔍 Iniciando diagnóstico completo...');
    
    // Limpar cache
    clearSupabaseImageCache();
    
    // Buscar posts
    const posts = await ProfileService.getPosts();
    console.log('📊 Posts encontrados:', posts.length);
    
    // Coletar todas as URLs de imagens
    const imageUrls: string[] = [];
    posts.forEach((post) => {
      imageUrls.push(...post.images);
    });
    
    console.log('🖼️ Total de imagens:', imageUrls.length);
    console.log('URLs:', imageUrls);
    
    // Testar acessibilidade
    await diagnoseImageLoading(imageUrls);
    
    alert('✅ Diagnóstico completo! Veja o console (F12) para detalhes.');
  };

  const handleClearCache = () => {
    if (confirm('Limpar todo o cache? A página será recarregada.')) {
      clearAllCache();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate('/admin987654321/login', { replace: true });
  };

  const totalUnread = conversations.reduce((sum, conv) => sum + conv.unread_count, 0);

  return (
    <div className={styles.container}>
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h1 className={styles.title}>Painel Admin</h1>
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <Users size={16} />
              <span>{conversations.length}</span>
            </div>
            <div className={styles.statItem}>
              <MessageCircle size={16} />
              <span>{totalUnread}</span>
            </div>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className={styles.statsCards}>
          <div className={styles.statCard}>
            <div className={styles.statCardIcon} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <Eye size={20} />
            </div>
            <div className={styles.statCardInfo}>
              <span className={styles.statCardLabel}>Views Únicas</span>
              <span className={styles.statCardValue}>{totalUniqueViews}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statCardIcon} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
              <TrendingUp size={20} />
            </div>
            <div className={styles.statCardInfo}>
              <span className={styles.statCardLabel}>Total Views</span>
              <span className={styles.statCardValue}>{totalStoryViews}</span>
            </div>
          </div>

          <div className={styles.statCard}>
            <div className={styles.statCardIcon} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
              <Film size={20} />
            </div>
            <div className={styles.statCardInfo}>
              <span className={styles.statCardLabel}>Stories Ativos</span>
              <span className={styles.statCardValue}>{activeStories}</span>
            </div>
          </div>
        </div>

        {/* Botões de gerenciamento */}
        <div className={styles.managementButtons}>
          <button 
            className={styles.manageButton}
            onClick={() => navigate('/admin987654321/analytics')}
            style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
          >
            <BarChart3 size={18} />
            <span>Analytics de Stories</span>
          </button>

          <button 
            className={styles.manageButton}
            onClick={() => navigate('/admin987654321/profile')}
          >
            <User size={18} />
            <span>Gerenciar Perfil</span>
          </button>
          
          <button 
            className={styles.manageButton}
            onClick={() => navigate('/admin987654321/stories')}
          >
            <Film size={18} />
            <span>Gerenciar Stories</span>
          </button>

          <button 
            className={styles.manageButton}
            onClick={() => navigate('/admin987654321/comments')}
            style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}
          >
            <MessageSquare size={18} />
            <span>Gerenciar Comentários</span>
          </button>

          <button
            className={styles.manageButton}
            onClick={handleLogout}
            style={{ background: '#d62828' }}
            title="Encerrar sessão"
          >
            <LogOut size={18} />
            <span>Sair do Admin</span>
          </button>
        </div>
        
        <div className={styles.devTools}>
          <button
            className={styles.devButton}
            onClick={handleDiagnose}
            title="Testar carregamento de imagens"
          >
            🔍 Diagnosticar
          </button>
          
          <button
            className={styles.devButton}
            onClick={handleClearCache}
            title="Limpar cache e recarregar"
          >
            🗑️ Limpar Cache
          </button>
        </div>

        <div className={styles.conversationsList}>
          {loading ? (
            <div className={styles.loadingContainer}>
              <span className={styles.loadingText}>Carregando...</span>
            </div>
          ) : conversations.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageCircle size={48} color="#6e6e6e" />
              <span className={styles.emptyText}>Nenhuma conversa ainda</span>
            </div>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                className={`${styles.conversationItem} ${
                  selectedConversation?.id === conv.id ? styles.selectedConversation : ''
                }`}
                onClick={() => setSelectedConversation(conv)}
              >
                <div className={styles.conversationAvatar}>
                  <Users size={24} />
                </div>
                <div className={styles.conversationInfo}>
                  <div className={styles.conversationHeader}>
                    <span className={styles.conversationName}>{conv.visitor_name}</span>
                    <div className={styles.conversationMeta}>
                      <Clock size={12} />
                      <span className={styles.conversationTime}>
                        {formatDate(conv.last_message_at)}
                      </span>
                    </div>
                  </div>
                  <span className={styles.conversationId}>{conv.visitor_id}</span>
                </div>
                {conv.unread_count > 0 && (
                  <div className={styles.unreadBadge}>
                    {conv.unread_count}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      <div className={styles.chatArea}>
        {selectedConversation ? (
          <>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderInfo}>
                <h2 className={styles.chatTitle}>{selectedConversation.visitor_name}</h2>
                <span className={styles.chatSubtitle}>{selectedConversation.visitor_id}</span>
              </div>
            </div>

            <div className={styles.messagesContainer}>
              {messages.length === 0 ? (
                <div className={styles.emptyChat}>
                  <MessageCircle size={48} color="#6e6e6e" />
                  <span className={styles.emptyText}>Nenhuma mensagem ainda</span>
                </div>
              ) : (
                 <div className={styles.messagesWrapper}>
                   {messages.map((msg) => (
                     <div
                       key={msg.id}
                       className={`${styles.messageItem} ${
                         msg.is_from_admin ? styles.messageFromAdmin : styles.messageFromVisitor
                       }`}
                     >
                       {/* Avatar para mensagens do visitante */}
                       {!msg.is_from_admin && (
                         <div className={styles.messageAvatar}>
                           <Users size={16} />
                         </div>
                       )}
                       
                       <div className={styles.messageContent}>
                         {/* Resposta ao Story */}
                         {(msg.replied_to_story_media_url || msg.replied_to_story_thumbnail) && (
                           <div className={styles.storyReplyContainer}>
                             <span className={styles.storyReplyText}>
                               {msg.is_from_admin ? "Você respondeu ao story" : "Respondeu ao seu story"}
                             </span>
                             <img
                               src={
                                 msg.replied_to_story_media_type === 'video' && msg.replied_to_story_thumbnail
                                   ? msg.replied_to_story_thumbnail
                                   : msg.replied_to_story_media_url || ''
                               }
                               alt="Story"
                               className={styles.storyReplyThumbnail}
                               onClick={() => navigate(msg.replied_to_story_id ? `/story?id=${msg.replied_to_story_id}` : '/story')}
                               style={{ cursor: 'pointer' }}
                               title="Ver story"
                               onError={(e) => {
                                 e.currentTarget.src = '/profile.jpg';
                               }}
                             />
                           </div>
                         )}

                         {/* Renderizar mídia se existir - sem background */}
                         {msg.media_url && (
                           <div className={styles.mediaContainer}>
                             {msg.media_type === 'image' && (
                               <img 
                                 src={msg.media_url} 
                                 alt="Imagem" 
                                 className={styles.mediaImage}
                                 onClick={() => setImageModal(msg.media_url!)}
                               />
                             )}
                             {msg.media_type === 'video' && (
                               <video src={msg.media_url} controls className={styles.mediaVideo} />
                             )}
                             {msg.media_type === 'audio' && (
                               <audio src={msg.media_url} controls className={styles.mediaAudio} />
                             )}
                           </div>
                         )}
                         {/* Texto da mensagem - com background */}
                         {msg.content && (
                           <div className={styles.messageBubble}>
                             <span className={styles.messageText}>{msg.content}</span>
                           </div>
                         )}
                         <span className={styles.messageTime}>{formatTime(msg.created_at)}</span>
                       </div>
                     </div>
                   ))}
                   <div ref={messagesEndRef} />
                 </div>
              )}
            </div>

            <form onSubmit={handleSendMessage} className={styles.inputContainer}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              {/* Ícone de câmera em círculo gradiente à esquerda */}
              <button 
                type="button" 
                className={styles.cameraButton} 
                onClick={() => cameraInputRef.current?.click()} 
                disabled={uploading || sending}
              >
                <Camera size={20} />
              </button>

              {/* Input de texto no centro */}
              <input
                type="text"
                className={styles.input}
                placeholder={uploading ? "Enviando..." : "Mensagem..."}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sending || uploading}
                autoFocus
              />

              {/* Ícones à direita */}
              <div className={styles.rightIcons}>
                {!messageInput.trim() && (
                  <>
                    {/* Ícone de microfone */}
                    <button 
                      type="button" 
                      className={styles.iconButton} 
                      disabled={uploading || sending} 
                      title="Em breve"
                    >
                      <Mic size={22} />
                    </button>

                    {/* Ícone de galeria */}
                    <button 
                      type="button" 
                      className={styles.iconButton} 
                      onClick={() => fileInputRef.current?.click()} 
                      disabled={uploading || sending}
                    >
                      <ImageIcon size={22} />
                    </button>

                    {/* Ícone de emoji/sticker */}
                    <button 
                      type="button" 
                      className={styles.iconButton} 
                      disabled={uploading || sending} 
                      title="Em breve"
                    >
                      <Smile size={22} />
                    </button>
                  </>
                )}

              {/* Botão de enviar (só aparece com texto) */}
              {messageInput.trim() && (
                <button type="submit" className={styles.sendButton} disabled={sending || uploading}>
                  <Send color="#4150F7" size={20} />
                </button>
              )}
              </div>
            </form>
          </>
        ) : (
          <div className={styles.noSelection}>
            <MessageCircle size={64} color="#6e6e6e" />
            <span className={styles.noSelectionText}>
              Selecione uma conversa para começar
            </span>
          </div>
        )}
      </div>

      {/* Modal de visualização de imagem */}
      {imageModal && (
        <div className={styles.imageModal} onClick={() => setImageModal(null)}>
          <div className={styles.imageModalContent}>
            <button className={styles.imageModalClose} onClick={() => setImageModal(null)}>
              ✕
            </button>
            <img src={imageModal} alt="Visualização" className={styles.imageModalImage} />
          </div>
        </div>
      )}
    </div>
  );
}

