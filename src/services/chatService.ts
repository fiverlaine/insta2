import { supabase, type Conversation, type Message } from '@/lib/supabase';
import { getVisitorId } from '@/utils/visitor';

/**
 * Serviço de Chat com Supabase
 */
export class ChatService {
  /**
   * Obtém ou cria uma conversa para o visitante atual
   */
  static async getOrCreateConversation(visitorName: string = 'Visitante'): Promise<Conversation | null> {
    try {
      const visitorId = getVisitorId();

      // Tentar buscar conversa existente
      const { data: existing, error: fetchError } = await supabase
        .from('conversations')
        .select('*')
        .eq('visitor_id', visitorId)
        .single();

      if (existing && !fetchError) {
        return existing;
      }

      // Criar nova conversa
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          visitor_id: visitorId,
          visitor_name: visitorName,
        })
        .select()
        .single();

      if (createError) {
        console.error('Erro ao criar conversa:', createError);
        return null;
      }

      return newConversation;
    } catch (error) {
      console.error('Erro no getOrCreateConversation:', error);
      return null;
    }
  }

  /**
   * Envia uma mensagem do visitante
   */
  static async sendMessage(
    content: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video' | 'audio' | 'document',
    mediaThumbnail?: string,
    mediaDuration?: number,
    repliedToStoryMediaUrl?: string,
    repliedToStoryMediaType?: 'image' | 'video',
    repliedToStoryId?: string,
    repliedToStoryThumbnail?: string
  ): Promise<Message | null> {
    try {
      const conversation = await this.getOrCreateConversation();
      
      if (!conversation) {
        console.error('Não foi possível obter/criar conversa');
        return null;
      }

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content: content || '', // Pode ser vazio se tiver mídia
          is_from_admin: false,
          media_url: mediaUrl || null,
          media_type: mediaType || null,
          media_thumbnail: mediaThumbnail || null,
          media_duration: mediaDuration || null,
          replied_to_story_media_url: repliedToStoryMediaUrl || null,
          replied_to_story_media_type: repliedToStoryMediaType || null,
          replied_to_story_id: repliedToStoryId || null,
          replied_to_story_thumbnail: repliedToStoryThumbnail || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao enviar mensagem:', error);
        return null;
      }

      // Atualizar conversa: atualizar last_message_at e incrementar unread_count
      const { data: convData } = await supabase
        .from('conversations')
        .select('unread_count')
        .eq('id', conversation.id)
        .single();

      await supabase
        .from('conversations')
        .update({ 
          last_message_at: new Date().toISOString(),
          unread_count: (convData?.unread_count || 0) + 1
        })
        .eq('id', conversation.id);

      return data;
    } catch (error) {
      console.error('Erro no sendMessage:', error);
      return null;
    }
  }

  /**
   * Busca mensagens de uma conversa
   */
  static async getMessages(conversationId: string): Promise<Message[]> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao buscar mensagens:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro no getMessages:', error);
      return [];
    }
  }

  /**
   * Subscreve em tempo real para novas mensagens
   */
  static subscribeToMessages(
    conversationId: string,
    callback: (message: Message) => void
  ) {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          callback(payload.new as Message);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  /**
   * Marca mensagens como lidas
   */
  static async markAsRead(conversationId: string): Promise<void> {
    try {
      await supabase
        .from('messages')
        .update({ read: true })
        .eq('conversation_id', conversationId)
        .eq('is_from_admin', true)
        .eq('read', false);
    } catch (error) {
      console.error('Erro ao marcar como lidas:', error);
    }
  }
}

/**
 * Serviço Admin para gerenciar conversas
 */
export class AdminChatService {
  /**
   * Lista todas as conversas
   */
  static async getAllConversations(): Promise<Conversation[]> {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar conversas:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Erro no getAllConversations:', error);
      return [];
    }
  }

  /**
   * Envia mensagem como admin
   */
  static async sendAdminMessage(
    conversationId: string,
    content: string,
    mediaUrl?: string,
    mediaType?: 'image' | 'video' | 'audio' | 'document',
    mediaThumbnail?: string,
    mediaDuration?: number,
    repliedToStoryMediaUrl?: string,
    repliedToStoryMediaType?: 'image' | 'video',
    repliedToStoryId?: string,
    repliedToStoryThumbnail?: string
  ): Promise<Message | null> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          content: content || '', // Pode ser vazio se tiver mídia
          is_from_admin: true,
          media_url: mediaUrl || null,
          media_type: mediaType || null,
          media_thumbnail: mediaThumbnail || null,
          media_duration: mediaDuration || null,
          replied_to_story_media_url: repliedToStoryMediaUrl || null,
          replied_to_story_media_type: repliedToStoryMediaType || null,
          replied_to_story_id: repliedToStoryId || null,
          replied_to_story_thumbnail: repliedToStoryThumbnail || null,
        })
        .select()
        .single();

      if (error) {
        console.error('Erro ao enviar mensagem admin:', error);
        return null;
      }

      // Atualizar conversa: resetar contador de não lidas e atualizar last_message_at
      await supabase
        .from('conversations')
        .update({ 
          unread_count: 0,
          last_message_at: new Date().toISOString()
        })
        .eq('id', conversationId);

      return data;
    } catch (error) {
      console.error('Erro no sendAdminMessage:', error);
      return null;
    }
  }

  /**
   * Subscreve a todas as conversas
   */
  static subscribeToConversations(callback: (conversation: Conversation) => void) {
    const channel = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            callback(payload.new as Conversation);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

