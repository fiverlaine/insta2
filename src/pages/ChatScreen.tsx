import { useNavigate } from "react-router-dom";
import { ChevronLeft, Phone, Video, Send, Mic, Image as ImageIcon } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { profileData } from "@/mocks/profile";
import { ChatService } from "@/services/chatService";
import { MediaService } from "@/services/mediaService";
import type { Message, Conversation } from "@/lib/supabase";
import styles from "./ChatScreen.module.css";

export default function ChatScreen() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Carregar conversa e mensagens
  useEffect(() => {
    loadConversation();
  }, []);

  // Scroll para última mensagem
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscrever a novas mensagens
  useEffect(() => {
    if (!conversation) return;

    const unsubscribe = ChatService.subscribeToMessages(
      conversation.id,
      (newMessage) => {
        // Verificar se a mensagem já existe antes de adicionar
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === newMessage.id);
          if (exists) return prev;
          return [...prev, newMessage];
        });
        
        // Marcar como lida se for do admin
        if (newMessage.is_from_admin) {
          ChatService.markAsRead(conversation.id);
        }
      }
    );

    return () => {
      unsubscribe();
    };
  }, [conversation]);

  const loadConversation = async () => {
    try {
      setLoading(true);
      const conv = await ChatService.getOrCreateConversation(profileData.name);
      
      if (conv) {
        setConversation(conv);
        const msgs = await ChatService.getMessages(conv.id);
        setMessages(msgs);
        
        // Marcar mensagens do admin como lidas
        await ChatService.markAsRead(conv.id);
      }
    } catch (error) {
      console.error('Erro ao carregar conversa:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      const newMessage = await ChatService.sendMessage(message.trim());
      
      if (newMessage) {
        setMessages((prev) => [...prev, newMessage]);
        setMessage("");
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!conversation || uploading) return;

    try {
      setUploading(true);

      // Validar tipo de arquivo
      if (!MediaService.isValidFileType(file)) {
        alert('Tipo de arquivo não suportado');
        return;
      }

      // Comprimir imagem se necessário
      let fileToUpload = file;
      if (MediaService.getMediaType(file) === 'image') {
        fileToUpload = await MediaService.compressImage(file);
      }

      // Upload para Supabase Storage
      const uploadResult = await MediaService.uploadFile(fileToUpload, conversation.id);
      if (!uploadResult) {
        alert('Erro ao fazer upload do arquivo');
        return;
      }

      // Obter informações extras
      const mediaType = MediaService.getMediaType(file);
      let thumbnail: string | undefined;
      let duration: number | undefined;

      if (mediaType === 'video') {
        thumbnail = await MediaService.createVideoThumbnail(file) || undefined;
        duration = await MediaService.getMediaDuration(file) || undefined;
      } else if (mediaType === 'audio') {
        duration = await MediaService.getMediaDuration(file) || undefined;
      }

      // Enviar mensagem com mídia
      const newMessage = await ChatService.sendMessage(
        '', // Sem texto
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

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
    e.target.value = ''; // Limpar input
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate(-1)} className={styles.backButton}>
          <ChevronLeft color="#fff" size={28} />
        </button>

        <button className={styles.headerCenter} onClick={() => navigate('/')}>
          <div className={styles.headerAvatarContainer}>
            <img src={profileData.avatar} alt="Avatar" className={styles.headerAvatar} />
            <div className={styles.gradientRing} />
          </div>
          <div className={styles.headerTextContainer}>
            <span className={styles.headerName}>{profileData.name}</span>
            <span className={styles.headerUsername}>{profileData.username}</span>
          </div>
        </button>

        <div className={styles.headerActions}>
          <button className={styles.headerButton}>
            <Phone color="#fff" size={22} />
          </button>
          <button className={styles.headerButton}>
            <Video color="#fff" size={24} />
          </button>
        </div>
      </div>

      <div className={styles.messagesContainer}>
        {loading ? (
          <div className={styles.loadingContainer}>
            <span className={styles.loadingText}>Carregando...</span>
          </div>
        ) : (
          <>
            {/* Introdução do perfil - sempre visível */}
            <div className={styles.profileIntro}>
              <div className={styles.profileAvatarContainer}>
                <img src={profileData.avatar} alt="Avatar" className={styles.profileAvatar} />
              </div>
              <span className={styles.profileName}>{profileData.name}</span>
              <span className={styles.profileUsername}>{profileData.username}</span>
              <span className={styles.profileFollowers}>
                {(profileData.followers / 1000).toFixed(1).replace(".", ",")} mil seguidores · {profileData.posts} posts
              </span>
              <button className={styles.viewProfileButton} onClick={() => navigate('/')}>
                <span className={styles.viewProfileText}>Ver perfil</span>
              </button>
            </div>

             {/* Mensagens - aparecem abaixo da intro */}
             {messages.length > 0 && (
               <div className={styles.messagesWrapper}>
                 {messages.map((msg) => (
                   <div
                     key={msg.id}
                     className={`${styles.messageItem} ${
                       msg.is_from_admin ? styles.messageFromAdmin : styles.messageFromVisitor
                     }`}
                   >
                     {/* Avatar para mensagens do admin */}
                     {msg.is_from_admin && (
                       <img 
                         src={profileData.avatar} 
                         alt="Avatar" 
                         className={styles.messageAvatar}
                       />
                     )}
                     
                     <div className={styles.messageContent}>
                     {/* Resposta ao Story */}
                     {msg.replied_to_story_media_url && (
                       <div className={styles.storyReplyContainer}>
                         <span className={styles.storyReplyText}>
                           {msg.is_from_admin ? "Respondeu ao seu story" : "Você respondeu ao story"}
                         </span>
                         {msg.replied_to_story_media_type === 'video' && msg.replied_to_story_thumbnail ? (
                           // Para vídeos, mostrar thumbnail
                           <img 
                             src={msg.replied_to_story_thumbnail} 
                             alt="Story" 
                             className={styles.storyReplyThumbnail}
                             onClick={() => navigate(msg.replied_to_story_id ? `/story?id=${msg.replied_to_story_id}` : '/story')}
                             style={{ cursor: 'pointer' }}
                             title="Ver story"
                           />
                         ) : (
                           // Para imagens, mostrar a própria imagem
                           <img 
                             src={msg.replied_to_story_media_url} 
                             alt="Story" 
                             className={styles.storyReplyThumbnail}
                             onClick={() => navigate(msg.replied_to_story_id ? `/story?id=${msg.replied_to_story_id}` : '/story')}
                             style={{ cursor: 'pointer' }}
                             title="Ver story"
                           />
                         )}
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
                       
                     </div>
                   </div>
                 ))}
                 <div ref={messagesEndRef} />
               </div>
             )}
          </>
        )}
      </div>

      <form onSubmit={handleSendMessage} className={styles.inputContainer}>
        {/* Input oculto para galeria */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        

        {/* Input de texto no centro */}
        <input
          type="text"
          className={styles.input}
          placeholder={uploading ? "Enviando..." : "Mensagem..."}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={sending || uploading}
        />

        {/* Ícones à direita */}
        <div className={styles.rightIcons}>
          {!message.trim() && (
            <>
              {/* Ícone de microfone */}
              <button 
                type="button" 
                className={styles.iconButton}
                disabled={uploading || sending}
                title="Gravação de áudio em breve"
              >
                <Mic color="#fff" size={22} />
              </button>

              {/* Ícone de galeria */}
              <button 
                type="button" 
                className={styles.iconButton} 
                onClick={handleGalleryClick}
                disabled={uploading || sending}
              >
                <ImageIcon color="#fff" size={22} />
              </button>

              
            </>
          )}

          {/* Botão de enviar (só aparece com texto) */}
          {message.trim() && (
            <button type="submit" className={styles.sendButton} disabled={sending || uploading}>
              <Send color="#4150F7" size={20} />
            </button>
          )}
        </div>
      </form>

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

