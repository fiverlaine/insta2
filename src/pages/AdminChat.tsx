import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AdminChatService } from "@/services/chatService";
import { MediaService } from "@/services/mediaService";
import type { Conversation, Message } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { Send, Users, MessageCircle, Clock, Camera, Image as ImageIcon, ChevronLeft } from "lucide-react";
import styles from "./AdminChat.module.css";

export default function AdminChat() {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

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

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

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
          filter: `conversation_id=eq.${selectedConversation.id}`
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          setTimeout(scrollToBottom, 100);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      const data = await AdminChatService.getAllConversations();
      setConversations(data);
    } catch (error) {
      console.error("Erro ao carregar conversas:", error);
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
      
      if (error) throw error;
      setMessages(data || []);
      
      // Marcar como lida
      await supabase
        .from('conversations')
        .update({ unread_count: 0 })
        .eq('id', conversationId);
      
      scrollToBottom();
    } catch (error) {
      console.error("Erro ao carregar mensagens:", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSendMessage = async () => {
    if (!selectedConversation || (!messageInput.trim() && !uploading)) return;

    try {
      setSending(true);
      await AdminChatService.sendAdminMessage(
        selectedConversation.id,
        messageInput.trim()
      );
      setMessageInput("");
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      alert("Erro ao enviar mensagem");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!selectedConversation || uploading) return;

    try {
      setUploading(true);

      // Validar tipo de arquivo
      if (!MediaService.isValidFileType(file)) {
        alert('Tipo de arquivo não suportado. Use imagens, vídeos ou áudios.');
        return;
      }

      // Comprimir se for imagem
      let fileToUpload = file;
      const mediaType = MediaService.getMediaType(file);
      let thumbnail: string | undefined;
      let duration: number | undefined;

      if (mediaType === 'image') {
        fileToUpload = await MediaService.compressImage(file, 1920);
      } else if (mediaType === 'video') {
        thumbnail = await MediaService.createVideoThumbnail(file) || undefined;
        const durationSeconds = await MediaService.getMediaDuration(file);
        // Converter segundos para milissegundos
        duration = durationSeconds ? durationSeconds * 1000 : undefined;
      } else if (mediaType === 'audio') {
        const durationSeconds = await MediaService.getMediaDuration(file);
        // Converter segundos para milissegundos
        duration = durationSeconds ? durationSeconds * 1000 : undefined;
      }

      // Upload do arquivo
      const uploadResult = await MediaService.uploadFile(fileToUpload, selectedConversation.id);
      if (!uploadResult) {
        alert('Erro ao fazer upload do arquivo');
        return;
      }

      // Enviar mensagem com mídia
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
        setMessageInput("");
      }
    } catch (error) {
      console.error("Erro ao enviar mídia:", error);
      alert("Erro ao enviar arquivo");
    } finally {
      setUploading(false);
      // Limpar inputs
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (cameraInputRef.current) cameraInputRef.current.value = '';
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return 'Hoje';
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Ontem';
    } else {
      return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button onClick={() => navigate('/admin987654321')} className={styles.backButton}>
          <ChevronLeft size={24} />
        </button>
        <h1 className={styles.title}>Chat com Visitantes</h1>
        <div className={styles.headerStats}>
          <div className={styles.statBadge}>
            <Users size={16} />
            <span>{conversations.length}</span>
          </div>
          <div className={styles.statBadge}>
            <MessageCircle size={16} />
            <span>{conversations.filter(c => c.unread_count > 0).length}</span>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Sidebar - Lista de Conversas */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h2 className={styles.sidebarTitle}>Conversas</h2>
            <span className={styles.conversationCount}>{conversations.length}</span>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Carregando...</div>
          ) : conversations.length === 0 ? (
            <div className={styles.emptyState}>
              <MessageCircle size={48} />
              <p>Nenhuma conversa ainda</p>
            </div>
          ) : (
            <div className={styles.conversationsList}>
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`${styles.conversationItem} ${
                    selectedConversation?.id === conv.id ? styles.active : ''
                  }`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className={styles.conversationAvatar}>
                    <Users size={20} />
                  </div>
                  <div className={styles.conversationInfo}>
                    <div className={styles.conversationHeader}>
                      <span className={styles.conversationName}>
                        {conv.visitor_name || 'Visitante'}
                      </span>
                      <span className={styles.conversationTime}>
                        {formatTime(conv.last_message_at)}
                      </span>
                    </div>
                    <div className={styles.conversationPreview}>
                      <p className={styles.lastMessage}>
                        Conversa ativa
                      </p>
                      {conv.unread_count > 0 && (
                        <span className={styles.unreadBadge}>{conv.unread_count}</span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main - Área de Chat */}
        <div className={styles.main}>
          {!selectedConversation ? (
            <div className={styles.noConversation}>
              <MessageCircle size={64} />
              <h3>Selecione uma conversa</h3>
              <p>Escolha uma conversa da lista para começar a responder</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className={styles.chatHeader}>
                <div className={styles.chatAvatar}>
                  <Users size={24} />
                </div>
                <div className={styles.chatInfo}>
                  <h3 className={styles.chatName}>
                    {selectedConversation.visitor_name || 'Visitante'}
                  </h3>
                  <p className={styles.chatStatus}>
                    <Clock size={14} />
                    Última mensagem {formatDate(selectedConversation.last_message_at)}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className={styles.messagesContainer}>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`${styles.message} ${
                      message.is_from_admin ? styles.sent : styles.received
                    }`}
                  >
                    {/* Resposta ao Story */}
                    {(message.replied_to_story_media_url || message.replied_to_story_thumbnail) && (
                      <div className={styles.storyReplyContainer}>
                        <span className={styles.storyReplyText}>
                          {message.is_from_admin ? "Você respondeu ao story" : "Respondeu ao seu story"}
                        </span>
                        <img
                          src={
                            message.replied_to_story_media_type === 'video' && message.replied_to_story_thumbnail
                              ? message.replied_to_story_thumbnail
                              : message.replied_to_story_media_url || ''
                          }
                          alt="Story"
                          className={styles.storyReplyThumbnail}
                          onClick={() => navigate(message.replied_to_story_id ? `/story?id=${message.replied_to_story_id}` : '/story')}
                          style={{ cursor: 'pointer' }}
                          title="Ver story"
                          onError={(e) => {
                            e.currentTarget.src = '/profile.jpg';
                          }}
                        />
                      </div>
                    )}

                    {/* Renderizar mídia se existir */}
                    {message.media_url && (
                      <div className={styles.mediaContainer}>
                        {message.media_type === 'image' && (
                          <img 
                            src={message.media_url} 
                            alt="Imagem" 
                            className={styles.messageImage}
                            onClick={() => setImageModal(message.media_url!)}
                            onError={(e) => {
                              e.currentTarget.src = '/profile.jpg';
                            }}
                          />
                        )}
                        {message.media_type === 'video' && (
                          <div className={styles.videoContainer}>
                            <video 
                              src={message.media_url} 
                              controls 
                              className={styles.messageVideo}
                              preload="metadata"
                              poster={message.media_thumbnail || undefined}
                            />
                          </div>
                        )}
                        {message.media_type === 'audio' && (
                          <div className={styles.audioContainer}>
                            <audio 
                              src={message.media_url} 
                              controls 
                              className={styles.messageAudio}
                            />
                            {message.media_duration && (
                              <span className={styles.audioDuration}>
                                {MediaService.formatDuration(Math.floor(message.media_duration / 1000))}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Texto da mensagem */}
                    {message.content && (
                      <div className={styles.messageBubble}>
                        <p className={styles.messageText}>{message.content}</p>
                      </div>
                    )}

                    <span className={styles.messageTime}>
                      {formatTime(message.created_at)}
                    </span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className={styles.inputContainer}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,video/*,audio/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*,video/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />

                <button
                  className={styles.iconButton}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || sending}
                  title="Enviar imagem ou vídeo"
                >
                  <ImageIcon size={20} />
                </button>

                <button
                  className={styles.iconButton}
                  onClick={() => cameraInputRef.current?.click()}
                  disabled={uploading || sending}
                  title="Tirar foto ou gravar vídeo"
                >
                  <Camera size={20} />
                </button>

                <input
                  type="text"
                  className={styles.input}
                  placeholder="Digite uma mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  disabled={sending || uploading}
                />

                <button
                  className={styles.sendButton}
                  onClick={handleSendMessage}
                  disabled={(!messageInput.trim() && !uploading) || sending || uploading}
                  title={uploading ? "Enviando mídia..." : "Enviar mensagem"}
                >
                  {sending || uploading ? (
                    <div className={styles.spinner} />
                  ) : (
                    <Send size={20} />
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {imageModal && (
        <div className={styles.modal} onClick={() => setImageModal(null)}>
          <div className={styles.modalContent}>
            <img src={imageModal} alt="Imagem expandida" className={styles.modalImage} />
          </div>
        </div>
      )}
    </div>
  );
}

