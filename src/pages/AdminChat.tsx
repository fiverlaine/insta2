import { useState, useEffect, useRef } from "react";
import { AdminChatService } from "@/services/chatService";
import { MediaService } from "@/services/mediaService";
import type { Conversation, Message } from "@/lib/supabase";
import { supabase } from "@/lib/supabase";
import { Send, Users, MessageCircle, Clock, Camera, Image as ImageIcon } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import styles from "./AdminChat.module.css";

export default function AdminChat() {
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

    return () => unsubscribe();
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
          setMessages((prev) => {
            const exists = prev.some(m => m.id === (payload.new as Message).id);
            if (exists) return prev;
            return [...prev, payload.new as Message];
          });
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
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!selectedConversation || uploading) return;

    try {
      setUploading(true);
      if (!MediaService.isValidFileType(file)) {
        alert('Tipo de arquivo não suportado.');
        return;
      }

      let fileToUpload = file;
      const mediaType = MediaService.getMediaType(file);
      let thumbnail: string | undefined;
      let duration: number | undefined;

      if (mediaType === 'image') {
        fileToUpload = await MediaService.compressImage(file, 1920);
      } else if (mediaType === 'video') {
        thumbnail = await MediaService.createVideoThumbnail(file) || undefined;
        const durationSeconds = await MediaService.getMediaDuration(file);
        duration = durationSeconds ? durationSeconds * 1000 : undefined;
      }

      const uploadResult = await MediaService.uploadFile(fileToUpload, selectedConversation.id);
      if (!uploadResult) return;

      await AdminChatService.sendAdminMessage(
        selectedConversation.id,
        '',
        uploadResult.url,
        mediaType,
        thumbnail,
        duration
      );
    } catch (error) {
      console.error("Erro ao enviar mídia:", error);
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const unreadCount = conversations.filter(c => c.unread_count > 0).length;

  return (
    <AdminLayout unreadCount={unreadCount}>
      <div className={styles.chatModule}>
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3>Conversas</h3>
            <span className={styles.badge}>{conversations.length}</span>
          </div>

          <div className={styles.conversationsList}>
            {loading ? (
              <p className={styles.infoText}>Carregando...</p>
            ) : conversations.length === 0 ? (
              <p className={styles.infoText}>Nenhuma conversa</p>
            ) : (
              conversations.map((conv) => (
                <button
                  key={conv.id}
                  className={`${styles.conversationItem} ${selectedConversation?.id === conv.id ? styles.active : ''}`}
                  onClick={() => setSelectedConversation(conv)}
                >
                  <div className={styles.avatar}>
                    <Users size={18} />
                  </div>
                  <div className={styles.convDetails}>
                    <div className={styles.convHeader}>
                      <span className={styles.name}>{conv.visitor_name || 'Visitante'}</span>
                      <span className={styles.time}>{formatTime(conv.last_message_at)}</span>
                    </div>
                    <div className={styles.preview}>
                      <span className={styles.lastMsg}>Clique para ver a conversa</span>
                      {conv.unread_count > 0 && <span className={styles.unreadBadge}>{conv.unread_count}</span>}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className={styles.chatArea}>
          {!selectedConversation ? (
            <div className={styles.emptyChat}>
              <MessageCircle size={48} />
              <h4>Selecione um lead para interagir</h4>
              <p>O chat em tempo real permite converter visitantes em clientes.</p>
            </div>
          ) : (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.chatUserInfo}>
                  <div className={styles.chatAvatar}>
                    <Users size={20} />
                  </div>
                  <div>
                    <h5>{selectedConversation.visitor_name}</h5>
                    <p>ID: {selectedConversation.visitor_id.substring(0, 12)}...</p>
                  </div>
                </div>
              </div>

              <div className={styles.messagesList}>
                {messages.map((msg) => (
                  <div key={msg.id} className={`${styles.message} ${msg.is_from_admin ? styles.sent : styles.received}`}>
                    {msg.media_url && (
                      <div className={styles.media}>
                        {msg.media_type === 'image' && <img src={msg.media_url} alt="" onClick={() => setImageModal(msg.media_url!)} />}
                        {msg.media_type === 'video' && <video src={msg.media_url} controls />}
                      </div>
                    )}
                    {msg.content && <p className={styles.text}>{msg.content}</p>}
                    <span className={styles.msgTime}>{formatTime(msg.created_at)}</span>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className={styles.inputBar}>
                <button className={styles.actionBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <ImageIcon size={20} />
                </button>
                <input
                  type="text"
                  placeholder="Escreva sua mensagem..."
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={sending || uploading}
                />
                <button className={styles.sendBtn} onClick={handleSendMessage} disabled={!messageInput.trim() || sending}>
                  <Send size={20} />
                </button>
                <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} />
              </div>
            </>
          )}
        </div>
      </div>

      {imageModal && (
        <div className={styles.modal} onClick={() => setImageModal(null)}>
          <img src={imageModal} alt="" />
        </div>
      )}
    </AdminLayout>
  );
}
