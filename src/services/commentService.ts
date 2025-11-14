import { supabase } from '@/lib/supabase';

export interface Comment {
  id: string;
  post_id: string;
  parent_comment_id: string | null;
  username: string;
  avatar_url: string | null;
  is_verified: boolean;
  text: string;
  image_url?: string | null;
  likes_count: number;
  time_ago: string;
  created_at: string;
  updated_at: string;
  replies?: Comment[];
}

export interface CommentInput {
  post_id: string;
  parent_comment_id?: string | null;
  username: string;
  avatar_url?: string | null;
  is_verified?: boolean;
  text: string;
  image_url?: string | null;
  likes_count?: number;
  time_ago?: string;
}

export class CommentService {
  /**
   * Buscar todos os comentários de um post (com respostas aninhadas)
   */
  static async getCommentsByPost(postId: string): Promise<Comment[]> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Organizar comentários com respostas aninhadas
      const comments = data || [];
      const commentsMap = new Map<string, Comment>();
      const rootComments: Comment[] = [];

      // Primeiro, criar o mapa de todos os comentários
      comments.forEach(comment => {
        commentsMap.set(comment.id, { ...comment, replies: [] });
      });

      // Depois, organizar hierarquia
      comments.forEach(comment => {
        const commentWithReplies = commentsMap.get(comment.id)!;
        
        if (comment.parent_comment_id) {
          // É uma resposta, adicionar ao comentário pai
          const parent = commentsMap.get(comment.parent_comment_id);
          if (parent) {
            parent.replies!.push(commentWithReplies);
          }
        } else {
          // É um comentário raiz
          rootComments.push(commentWithReplies);
        }
      });

      return rootComments;
    } catch (error) {
      console.error('Erro ao buscar comentários:', error);
      return [];
    }
  }

  /**
   * Criar novo comentário
   */
  static async createComment(input: CommentInput): Promise<Comment | null> {
    try {
      const commentData = {
        post_id: input.post_id,
        parent_comment_id: input.parent_comment_id || null,
        username: input.username,
        avatar_url: input.avatar_url || null,
        is_verified: input.is_verified || false,
        text: input.text,
        image_url: input.image_url || null,
        likes_count: input.likes_count || 0,
        time_ago: input.time_ago || 'Agora'
      };

      const { data, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao criar comentário:', error);
      throw error;
    }
  }

  /**
   * Atualizar comentário
   */
  static async updateComment(id: string, updates: Partial<CommentInput>): Promise<Comment | null> {
    try {
      const { data, error } = await supabase
        .from('comments')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Erro ao atualizar comentário:', error);
      throw error;
    }
  }

  /**
   * Deletar comentário (cascade deleta respostas automaticamente)
   */
  static async deleteComment(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', id);

      if (error) throw error;

      return true;
    } catch (error) {
      console.error('Erro ao deletar comentário:', error);
      throw error;
    }
  }

  /**
   * Contar total de comentários de um post (incluindo respostas)
   */
  static async countComments(postId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('comments_stats')
        .select('total_count')
        .eq('post_id', postId)
        .single();

      if (error) {
        // Se a view não existe ou não há dados, contar manualmente
        const { count } = await supabase
          .from('comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', postId);
        
        return count || 0;
      }

      return data?.total_count || 0;
    } catch (error) {
      console.error('Erro ao contar comentários:', error);
      return 0;
    }
  }

  /**
   * Buscar estatísticas de comentários de todos os posts
   */
  static async getAllCommentsStats(): Promise<{ [postId: string]: number }> {
    try {
      const { data, error } = await supabase
        .from('comments_stats')
        .select('post_id, total_count');

      if (error) throw error;

      const stats: { [postId: string]: number } = {};
      data?.forEach(stat => {
        stats[stat.post_id] = stat.total_count;
      });

      return stats;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {};
    }
  }

  /**
   * Subscrever a mudanças em comentários de um post
   */
  static subscribeToComments(
    postId: string,
    callback: (comment: Comment) => void
  ) {
    const channel = supabase
      .channel(`comments:${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        (payload) => {
          callback(payload.new as Comment);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

