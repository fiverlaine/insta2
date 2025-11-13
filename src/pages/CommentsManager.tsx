import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Edit2, Save, X, Check, Upload } from 'lucide-react';
import { ProfileService, type Post } from '@/services/profileService';
import { CommentService, type Comment as SupabaseComment } from '@/services/commentService';
import { AvatarService } from '@/services/avatarService';
import { supabase } from '@/lib/supabase';
import styles from './CommentsManager.module.css';

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

export default function CommentsManager() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<Post[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string>('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [isAddingReply, setIsAddingReply] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  
  // Form state para novo/editando comentário
  const [formData, setFormData] = useState({
    username: '',
    avatar: '',
    isVerified: false,
    text: '',
    likes: 0,
    timeAgo: '1 min'
  });

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (selectedPostId) {
      loadComments(selectedPostId);
    }
  }, [selectedPostId]);

  const loadPosts = async () => {
    try {
      const data = await ProfileService.getPosts();
      setPosts(data);
      if (data.length > 0 && !selectedPostId) {
        setSelectedPostId(data[0].id);
      }
    } catch (error) {
      console.error('Erro ao carregar posts:', error);
    }
  };

  const loadComments = async (postId: string) => {
    try {
      // Buscar comentários do Supabase
      const supabaseComments = await CommentService.getCommentsByPost(postId);
      
      // Converter do formato Supabase para o formato local
      const convertedComments: Comment[] = supabaseComments.map(convertSupabaseToLocal);
      
      setComments(convertedComments);
    } catch (error) {
      console.error('Erro ao carregar comentários:', error);
      setComments([]);
    }
  };

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


  const resetForm = () => {
    setFormData({
      username: '',
      avatar: '',
      isVerified: false,
      text: '',
      likes: 0,
      timeAgo: '1 min'
    });
  };

  const handleAddComment = async () => {
    if (!formData.username || !formData.text) {
      alert('Preencha username e texto!');
      return;
    }

    try {
      // Criar comentário no Supabase
      const commentInput = {
        post_id: selectedPostId,
        parent_comment_id: null,
        username: formData.username,
        avatar_url: formData.avatar || AvatarService.getRandomAvatar(),
        is_verified: formData.isVerified,
        text: formData.text,
        likes_count: formData.likes,
        time_ago: formData.timeAgo
      };

      const createdComment = await CommentService.createComment(commentInput);
      
      if (createdComment) {
        // Recarregar comentários do Supabase
        await loadComments(selectedPostId);
        
        setIsAddingComment(false);
        resetForm();
        alert('Comentário adicionado com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao adicionar comentário:', error);
      alert(`Erro ao adicionar comentário: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleAddReply = async (parentCommentId: string) => {
    if (!formData.username || !formData.text) {
      alert('Preencha username e texto!');
      return;
    }

    try {
      // Criar resposta no Supabase
      const replyInput = {
        post_id: selectedPostId,
        parent_comment_id: parentCommentId,
        username: formData.username,
        avatar_url: formData.avatar || AvatarService.getRandomAvatar(),
        is_verified: formData.isVerified,
        text: formData.text,
        likes_count: formData.likes,
        time_ago: formData.timeAgo
      };

      const createdReply = await CommentService.createComment(replyInput);
      
      if (createdReply) {
        // Recarregar comentários do Supabase
        await loadComments(selectedPostId);
        
        setIsAddingReply(null);
        resetForm();
        alert('Resposta adicionada com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao adicionar resposta:', error);
      alert(`Erro ao adicionar resposta: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setFormData({
      username: comment.username,
      avatar: comment.avatar,
      isVerified: comment.isVerified,
      text: comment.text,
      likes: comment.likes,
      timeAgo: comment.timeAgo
    });
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!formData.username || !formData.text) {
      alert('Preencha username e texto!');
      return;
    }

    try {
      // Atualizar comentário no Supabase
      const updates = {
        username: formData.username,
        avatar_url: formData.avatar || null,
        is_verified: formData.isVerified,
        text: formData.text,
        likes_count: formData.likes,
        time_ago: formData.timeAgo
      };

      await CommentService.updateComment(commentId, updates);
      
      // Recarregar comentários do Supabase
      await loadComments(selectedPostId);
      
      setEditingCommentId(null);
      resetForm();
      alert('Comentário atualizado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao atualizar comentário:', error);
      alert(`Erro ao atualizar comentário: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Tem certeza que deseja deletar este comentário?')) {
      return;
    }

    try {
      // Deletar comentário no Supabase (cascade deleta respostas automaticamente)
      await CommentService.deleteComment(commentId);
      
      // Recarregar comentários do Supabase
      await loadComments(selectedPostId);
      
      alert('Comentário deletado com sucesso!');
    } catch (error: any) {
      console.error('Erro ao deletar comentário:', error);
      alert(`Erro ao deletar comentário: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const generateCodeForCopy = () => {
    const code = `'${selectedPostId}': ${JSON.stringify(comments, null, 2)}`;
    navigator.clipboard.writeText(code);
    alert('Código copiado! Cole em src/mocks/comments.ts');
  };

  const getRandomAvatar = () => {
    return AvatarService.getRandomAvatar();
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem!');
      return;
    }

    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('A imagem deve ter no máximo 5MB!');
      return;
    }

    try {
      setUploadingAvatar(true);

      // Gerar nome único
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(2, 15);
      const extension = file.name.split('.').pop();
      const fileName = `comment-avatars/${timestamp}_${random}.${extension}`;

      // Upload para Supabase Storage (bucket: avatars ou criar um novo)
      const bucketName = 'avatars';
      
      // Tentar fazer upload
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        // Se o bucket não existir, tentar usar 'chat-media' como fallback
        const fallbackBucket = 'chat-media';
        const fallbackFileName = `avatars/${timestamp}_${random}.${extension}`;
        
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from(fallbackBucket)
          .upload(fallbackFileName, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (fallbackError) {
          throw fallbackError;
        }

        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from(fallbackBucket)
          .getPublicUrl(fallbackData.path);

        setFormData({ ...formData, avatar: urlData.publicUrl });
        alert('Avatar enviado com sucesso!');
      } else {
        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(data.path);

        setFormData({ ...formData, avatar: urlData.publicUrl });
        alert('Avatar enviado com sucesso!');
      }
    } catch (error: any) {
      console.error('Erro ao fazer upload do avatar:', error);
      alert(`Erro ao fazer upload: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setUploadingAvatar(false);
      // Limpar input
      if (avatarFileInputRef.current) {
        avatarFileInputRef.current.value = '';
      }
    }
  };

  const selectedPost = posts.find(p => p.id === selectedPostId);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate('/admin987654321')} className={styles.backButton}>
          <ChevronLeft size={24} />
        </button>
        <h1 className={styles.title}>Gerenciar Comentários</h1>
      </div>

      <div className={styles.content}>
        {/* Seletor de Post */}
        <div className={styles.section}>
          <label className={styles.label}>Selecione o Post:</label>
          <select 
            value={selectedPostId} 
            onChange={(e) => setSelectedPostId(e.target.value)}
            className={styles.select}
          >
            {posts.map(post => (
              <option key={post.id} value={post.id}>
                {post.caption.substring(0, 50)}... ({post.id.substring(0, 8)})
              </option>
            ))}
          </select>
          
          {selectedPost && (
            <div className={styles.postPreview}>
              <img 
                src={selectedPost.images[0]} 
                alt="Post preview" 
                className={styles.postImage}
                onError={(e) => {
                  e.currentTarget.src = '/profile.jpg';
                }}
              />
              <p className={styles.postCaption}>{selectedPost.caption}</p>
            </div>
          )}
        </div>

        {/* Estatísticas */}
        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{comments.length}</span>
            <span className={styles.statLabel}>Comentários</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0)}
            </span>
            <span className={styles.statLabel}>Respostas</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {comments.length + comments.reduce((acc, c) => acc + (c.replies?.length || 0), 0)}
            </span>
            <span className={styles.statLabel}>Total</span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className={styles.actionsRow}>
          <button 
            onClick={() => setIsAddingComment(true)} 
            className={styles.addButton}
          >
            <Plus size={20} />
            Adicionar Comentário
          </button>
          
          <button 
            onClick={generateCodeForCopy} 
            className={styles.copyButton}
            disabled={comments.length === 0}
          >
            <Save size={20} />
            Copiar Código
          </button>
        </div>

        {/* Form Adicionar Comentário */}
        {isAddingComment && (
          <div className={styles.formCard}>
            <div className={styles.formHeader}>
              <h3 className={styles.formTitle}>Novo Comentário</h3>
              <button onClick={() => { setIsAddingComment(false); resetForm(); }} className={styles.closeButton}>
                <X size={20} />
              </button>
            </div>
            
            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="ex: pedrosilva"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Avatar</label>
                <div className={styles.avatarRow}>
                  <input
                    type="text"
                    value={formData.avatar}
                    onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                    placeholder="URL do avatar ou clique em 'Upload'"
                    className={styles.input}
                  />
                  <input
                    ref={avatarFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    style={{ display: 'none' }}
                  />
                  <button 
                    type="button"
                    onClick={() => avatarFileInputRef.current?.click()}
                    className={styles.uploadButton}
                    disabled={uploadingAvatar}
                  >
                    <Upload size={16} />
                    {uploadingAvatar ? 'Enviando...' : 'Upload'}
                  </button>
                  <button 
                    type="button"
                    onClick={() => setFormData({...formData, avatar: getRandomAvatar()})}
                    className={styles.randomButton}
                  >
                    Aleatório
                  </button>
                </div>
                {formData.avatar && (
                  <img src={formData.avatar} alt="Preview" className={styles.avatarPreview} />
                )}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.isVerified}
                    onChange={(e) => setFormData({...formData, isVerified: e.target.checked})}
                    className={styles.checkbox}
                  />
                  <Check size={16} className={styles.checkIcon} />
                  Conta Verificada (badge azul)
                </label>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Texto do Comentário *</label>
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({...formData, text: e.target.value})}
                  placeholder="ex: Que foto incrível! 😍 #amazing"
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Curtidas</label>
                  <input
                    type="number"
                    value={formData.likes}
                    onChange={(e) => setFormData({...formData, likes: parseInt(e.target.value) || 0})}
                    className={styles.inputSmall}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Tempo Atrás</label>
                  <input
                    type="text"
                    value={formData.timeAgo}
                    onChange={(e) => setFormData({...formData, timeAgo: e.target.value})}
                    placeholder="ex: 2 h"
                    className={styles.inputSmall}
                  />
                </div>
              </div>
            </div>

            <button onClick={handleAddComment} className={styles.saveButton}>
              <Plus size={20} />
              Adicionar Comentário
            </button>
          </div>
        )}

        {/* Lista de Comentários */}
        <div className={styles.commentsList}>
          <h3 className={styles.sectionTitle}>
            Comentários ({comments.length})
          </h3>

          {comments.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyText}>
                Nenhum comentário ainda. Clique em "Adicionar Comentário" para começar!
              </p>
            </div>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} className={styles.commentCard}>
                {editingCommentId === comment.id ? (
                  // Form de edição
                  <div className={styles.editForm}>
                    <div className={styles.formGrid}>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        className={styles.input}
                        placeholder="Username"
                      />
                      <input
                        type="text"
                        value={formData.avatar}
                        onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                        className={styles.input}
                        placeholder="Avatar URL"
                      />
                      <textarea
                        value={formData.text}
                        onChange={(e) => setFormData({...formData, text: e.target.value})}
                        className={styles.textarea}
                        rows={2}
                      />
                      <div className={styles.editActions}>
                        <button onClick={() => handleSaveEdit(comment.id)} className={styles.saveEditButton}>
                          <Save size={16} /> Salvar
                        </button>
                        <button onClick={() => { setEditingCommentId(null); resetForm(); }} className={styles.cancelButton}>
                          <X size={16} /> Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Visualização do comentário
                  <>
                    <div className={styles.commentHeader}>
                      <div className={styles.commentInfo}>
                        <img src={comment.avatar} alt={comment.username} className={styles.commentAvatar} />
                        <div>
                          <div className={styles.commentUsername}>
                            {comment.username}
                            {comment.isVerified && (
                              <svg className={styles.verifiedBadge} fill="#0095f6" height="14" width="14" viewBox="0 0 40 40">
                                <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"></path>
                              </svg>
                            )}
                          </div>
                          <div className={styles.commentMeta}>
                            {comment.timeAgo} · {comment.likes} curtidas
                          </div>
                        </div>
                      </div>
                      <div className={styles.commentActions}>
                        <button onClick={() => handleEditComment(comment)} className={styles.iconButton} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDeleteComment(comment.id)} className={styles.iconButton} title="Deletar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <p className={styles.commentText}>{comment.text}</p>

                    {/* Respostas */}
                    {comment.replies && comment.replies.length > 0 && (
                      <div className={styles.repliesSection}>
                        <div className={styles.repliesHeader}>
                          <span className={styles.repliesCount}>{comment.replies.length} resposta(s)</span>
                        </div>
                        {comment.replies.map(reply => (
                          <div key={reply.id} className={styles.replyCard}>
                            <div className={styles.commentHeader}>
                              <div className={styles.commentInfo}>
                                <img src={reply.avatar} alt={reply.username} className={styles.replyAvatar} />
                                <div>
                                  <div className={styles.commentUsername}>
                                    {reply.username}
                                    {reply.isVerified && (
                                      <svg className={styles.verifiedBadge} fill="#0095f6" height="12" width="12" viewBox="0 0 40 40">
                                        <path d="M19.998 3.094 14.638 0l-2.972 5.15H5.432v6.354L0 14.64 3.094 20 0 25.359l5.432 3.137v5.905h5.975L14.638 40l5.36-3.094L25.358 40l3.232-5.6h6.162v-6.01L40 25.359 36.905 20 40 14.641l-5.248-3.03v-6.46h-6.419L25.358 0l-5.36 3.094Zm7.415 11.225 2.254 2.287-11.43 11.5-6.835-6.93 2.244-2.258 4.587 4.581 9.18-9.18Z"></path>
                                      </svg>
                                    )}
                                  </div>
                                  <div className={styles.commentMeta}>
                                    {reply.timeAgo} · {reply.likes} curtidas
                                  </div>
                                </div>
                              </div>
                              <div className={styles.commentActions}>
                                <button onClick={() => handleDeleteComment(reply.id)} className={styles.iconButton} title="Deletar">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <p className={styles.replyText}>{reply.text}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <button 
                      onClick={() => setIsAddingReply(comment.id)} 
                      className={styles.addReplyButton}
                    >
                      <Plus size={14} />
                      Adicionar Resposta
                    </button>

                    {/* Form Adicionar Resposta */}
                    {isAddingReply === comment.id && (
                      <div className={styles.replyForm}>
                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Username *</label>
                          <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({...formData, username: e.target.value})}
                            placeholder="ex: pedrosilva"
                            className={styles.input}
                          />
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Avatar</label>
                          <div className={styles.avatarRow}>
                            <input
                              type="text"
                              value={formData.avatar}
                              onChange={(e) => setFormData({...formData, avatar: e.target.value})}
                              placeholder="URL do avatar ou clique em 'Upload'"
                              className={styles.input}
                            />
                            <input
                              ref={avatarFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              style={{ display: 'none' }}
                            />
                            <button 
                              type="button"
                              onClick={() => avatarFileInputRef.current?.click()}
                              className={styles.uploadButton}
                              disabled={uploadingAvatar}
                            >
                              <Upload size={16} />
                              {uploadingAvatar ? 'Enviando...' : 'Upload'}
                            </button>
                            <button 
                              type="button"
                              onClick={() => setFormData({...formData, avatar: getRandomAvatar()})}
                              className={styles.randomButton}
                            >
                              Aleatório
                            </button>
                          </div>
                          {formData.avatar && (
                            <img src={formData.avatar} alt="Preview" className={styles.avatarPreview} />
                          )}
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.checkboxLabel}>
                            <input
                              type="checkbox"
                              checked={formData.isVerified}
                              onChange={(e) => setFormData({...formData, isVerified: e.target.checked})}
                              className={styles.checkbox}
                            />
                            <Check size={16} className={styles.checkIcon} />
                            Conta Verificada (badge azul)
                          </label>
                        </div>

                        <div className={styles.formGroup}>
                          <label className={styles.formLabel}>Texto da Resposta *</label>
                          <textarea
                            value={formData.text}
                            onChange={(e) => setFormData({...formData, text: e.target.value})}
                            placeholder="Texto da resposta"
                            className={styles.textarea}
                            rows={2}
                          />
                        </div>

                        <div className={styles.formRow}>
                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Curtidas</label>
                            <input
                              type="number"
                              value={formData.likes}
                              onChange={(e) => setFormData({...formData, likes: parseInt(e.target.value) || 0})}
                              className={styles.inputSmall}
                            />
                          </div>

                          <div className={styles.formGroup}>
                            <label className={styles.formLabel}>Tempo Atrás</label>
                            <input
                              type="text"
                              value={formData.timeAgo}
                              onChange={(e) => setFormData({...formData, timeAgo: e.target.value})}
                              placeholder="ex: 2 h"
                              className={styles.inputSmall}
                            />
                          </div>
                        </div>

                        <div className={styles.replyFormActions}>
                          <button onClick={() => handleAddReply(comment.id)} className={styles.saveButton}>
                            <Plus size={16} />
                            Adicionar Resposta
                          </button>
                          <button onClick={() => { setIsAddingReply(null); resetForm(); }} className={styles.cancelButton}>
                            <X size={16} />
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Instruções */}
        <div className={styles.instructionsCard}>
          <h3 className={styles.instructionsTitle}>📝 Como Usar</h3>
          <ol className={styles.instructionsList}>
            <li>Selecione o post que deseja adicionar comentários</li>
            <li>Clique em "Adicionar Comentário" e preencha os dados</li>
            <li>Use o botão "Aleatório" para gerar avatares do Unsplash</li>
            <li>Adicione respostas aos comentários se desejar</li>
            <li>Quando terminar, clique em "Copiar Código"</li>
            <li>Cole o código em <code>src/mocks/comments.ts</code></li>
            <li>Compile o projeto: <code>npm run build</code></li>
          </ol>
        </div>
      </div>
    </div>
  );
}

