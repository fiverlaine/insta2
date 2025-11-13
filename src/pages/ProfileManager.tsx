import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  Upload,
  Save,
  Eye,
  EyeOff,
  Trash2,
  GripVertical,
  Edit,
  Plus,
  X,
  Image as ImageIcon,
  User,
  Link2,
} from "lucide-react";
import { ProfileService, type ProfileSettings, type Post } from "@/services/profileService";
import { MediaService } from "@/services/mediaService";
import styles from "./ProfileManager.module.css";

export default function ProfileManager() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "posts">("profile");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  
  // Profile form states
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
  // Post form states
  const [postImages, setPostImages] = useState<string[]>([]);
  const [postCaption, setPostCaption] = useState("");
  const [postDate, setPostDate] = useState("");
  const [postLikes, setPostLikes] = useState(0);
  const [postLikesInput, setPostLikesInput] = useState("0");
  const [uploadingImage, setUploadingImage] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const postImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadProfile();
    loadPosts();
  }, []);

  const formatNumberWithDots = (num: number) => {
    return num.toLocaleString('pt-BR');
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1).replace(".", ",")}mi`;
    } else if (num >= 1000) {
      const mil = Math.floor(num / 1000);
      return `${mil} mil`;
    }
    return num.toString();
  };

  // Normalizar URL da imagem (suporta URLs do Supabase e caminhos locais)
  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '/profile.jpg';
    
    // Se já for URL completa (http/https), retorna direto
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }
    
    // Se começar com /assets, remove o /assets pois o Vite já serve do public/assets
    if (imagePath.startsWith('/assets/')) {
      return imagePath.replace('/assets/', '/');
    }
    
    // Caso contrário, retorna como está
    return imagePath;
  };

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (data) {
        setProfile(data);
        setUsername(data.username);
        setName(data.name);
        setAvatarUrl(data.avatar_url);
        setBio(data.bio);
        setLink(data.link);
        setFollowersCount(data.followers_count);
        setFollowingCount(data.following_count);
      }
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadPosts = async () => {
    try {
      // Primeiro busca o perfil para pegar o username atual
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (!profileData) return;
      
      const data = await ProfileService.getAllPosts(profileData.username);
      setPosts(data);
    } catch (error) {
      console.error("Erro ao carregar posts:", error);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;

    try {
      setSaving(true);
      const success = await ProfileService.updateProfile(profile.username, {
        username,
        name,
        avatar_url: avatarUrl,
        bio,
        link,
        followers_count: followersCount,
        following_count: followingCount,
      });

      if (success) {
        alert("Perfil atualizado com sucesso!");
        await loadProfile();
      } else {
        alert("Erro ao atualizar perfil");
      }
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      alert("Erro ao salvar perfil");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setSaving(true);
      
      if (!MediaService.isValidFileType(file) || MediaService.getMediaType(file) !== 'image') {
        alert("Tipo de arquivo não suportado. Use uma imagem.");
        return;
      }

      const compressed = await MediaService.compressImage(file, 400);
      const url = await ProfileService.uploadAvatar(compressed, profile?.username || username);
      
      if (url) {
        setAvatarUrl(url);
        alert("Foto de perfil enviada! Clique em 'Salvar Perfil' para confirmar.");
      } else {
        alert("Erro ao fazer upload da foto");
      }
    } catch (error) {
      console.error("Erro ao fazer upload do avatar:", error);
      alert("Erro ao fazer upload");
    } finally {
      setSaving(false);
      if (avatarInputRef.current) {
        avatarInputRef.current.value = "";
      }
    }
  };

  const handleAddBioLine = () => {
    setBio([...bio, ""]);
  };

  const handleRemoveBioLine = (index: number) => {
    setBio(bio.filter((_, i) => i !== index));
  };

  const handleBioLineChange = (index: number, value: string) => {
    const newBio = [...bio];
    newBio[index] = value;
    setBio(newBio);
  };

  const handleOpenPostModal = (post?: Post) => {
    if (post) {
      setEditingPost(post);
      setPostImages(post.images);
      setPostCaption(post.caption);
      setPostDate(post.post_date);
      setPostLikes(post.likes_count);
      setPostLikesInput(formatNumberWithDots(post.likes_count));
    } else {
      setEditingPost(null);
      setPostImages([]);
      setPostCaption("");
      setPostDate(new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' }));
      setPostLikes(0);
      setPostLikesInput("0");
    }
    setShowPostModal(true);
  };

  const handleClosePostModal = () => {
    setShowPostModal(false);
    setEditingPost(null);
    setPostImages([]);
    setPostCaption("");
    setPostDate("");
    setPostLikes(0);
    setPostLikesInput("0");
  };

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingImage(true);
      
      if (!MediaService.isValidFileType(file) || MediaService.getMediaType(file) !== 'image') {
        alert("Tipo de arquivo não suportado. Use uma imagem.");
        return;
      }

      const compressed = await MediaService.compressImage(file, 1080);
      const url = await ProfileService.uploadPostImage(compressed, profile?.username || username);
      
      if (url) {
        setPostImages([...postImages, url]);
      } else {
        alert("Erro ao fazer upload da imagem");
      }
    } catch (error) {
      console.error("Erro ao fazer upload da imagem:", error);
      alert("Erro ao fazer upload");
    } finally {
      setUploadingImage(false);
      if (postImageInputRef.current) {
        postImageInputRef.current.value = "";
      }
    }
  };

  const handleRemovePostImage = (index: number) => {
    setPostImages(postImages.filter((_, i) => i !== index));
  };

  const handleSavePost = async () => {
    if (postImages.length === 0) {
      alert("Adicione pelo menos uma imagem");
      return;
    }

    if (!postCaption.trim()) {
      alert("Adicione uma legenda");
      return;
    }

    try {
      setSaving(true);

      if (editingPost) {
        // Atualizar post existente
        const success = await ProfileService.updatePost(editingPost.id, profile?.username || username, {
          images: postImages,
          caption: postCaption,
          post_date: postDate,
          likes_count: postLikes,
        });

        if (success) {
          alert("Post atualizado com sucesso!");
          await loadPosts();
          handleClosePostModal();
        } else {
          alert("Erro ao atualizar post");
        }
      } else {
        // Criar novo post
        const newPost = await ProfileService.createPost(
          profile?.username || username,
          postImages,
          postCaption,
          postDate,
          postLikes
        );

        if (newPost) {
          alert("Post criado com sucesso!");
          await loadPosts();
          await loadProfile(); // Atualizar contagem
          handleClosePostModal();
        } else {
          alert("Erro ao criar post");
        }
      }
    } catch (error) {
      console.error("Erro ao salvar post:", error);
      alert("Erro ao salvar post");
    } finally {
      setSaving(false);
    }
  };

  const handleTogglePostActive = async (post: Post) => {
    const success = await ProfileService.togglePostActive(
      post.id,
      !post.is_active,
      profile?.username || username
    );

    if (success) {
      await loadPosts();
      await loadProfile(); // Atualizar contagem
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!confirm("Tem certeza que deseja deletar este post?")) return;

    const success = await ProfileService.deletePost(post.id, profile?.username || username);
    if (success) {
      alert("Post deletado com sucesso!");
      await loadPosts();
      await loadProfile(); // Atualizar contagem
    }
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newPosts = [...posts];
    const draggedItem = newPosts[draggedIndex];
    newPosts.splice(draggedIndex, 1);
    newPosts.splice(index, 0, draggedItem);

    setPosts(newPosts);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    const postIds = posts.map((p) => p.id);
    const success = await ProfileService.reorderPosts(postIds, profile?.username || username);

    if (success) {
      await loadPosts();
    } else {
      alert("Erro ao reordenar posts");
      await loadPosts();
    }

    setDraggedIndex(null);
  };

  const handleLikesInputChange = (value: string) => {
    const digitsOnly = value.replace(/\D/g, "");

    if (!digitsOnly) {
      setPostLikes(0);
      setPostLikesInput("");
      return;
    }

    const numericValue = parseInt(digitsOnly, 10);
    setPostLikes(numericValue);
    setPostLikesInput(formatNumberWithDots(numericValue));
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <span>Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button
          className={styles.backButton}
          onClick={() => navigate("/admin987654321")}
        >
          <ChevronLeft size={24} />
        </button>
        <h1 className={styles.title}>Gerenciar Perfil</h1>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "profile" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("profile")}
        >
          <User size={18} />
          <span>Perfil</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === "posts" ? styles.activeTab : ""}`}
          onClick={() => setActiveTab("posts")}
        >
          <ImageIcon size={18} />
          <span>Posts</span>
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <div className={styles.content}>
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <User size={20} />
              Informações do Perfil
            </h2>

            {/* Avatar */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Foto de Perfil</label>
              <div className={styles.avatarUpload}>
                <div className={styles.avatarPreview}>
                  <img 
                    src={getImageUrl(avatarUrl)} 
                    alt="Avatar" 
                    className={styles.avatarImage}
                    onError={(e) => {
                      e.currentTarget.src = '/profile.jpg';
                    }}
                  />
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: "none" }}
                />
                <button
                  className={styles.uploadButton}
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={saving}
                >
                  <Upload size={16} />
                  <span>Alterar Foto</span>
                </button>
              </div>
            </div>

            {/* Username */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Nome de Usuário (@)</label>
              <input
                type="text"
                className={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="seu_username"
              />
            </div>

            {/* Name */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Nome</label>
              <input
                type="text"
                className={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Seu Nome Completo"
              />
            </div>

            {/* Bio */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Bio</label>
              {bio.map((line, index) => (
                <div key={index} className={styles.bioLine}>
                  <input
                    type="text"
                    className={styles.input}
                    value={line}
                    onChange={(e) => handleBioLineChange(index, e.target.value)}
                    placeholder={`Linha ${index + 1} da bio`}
                  />
                  <button
                    className={styles.removeButton}
                    onClick={() => handleRemoveBioLine(index)}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button className={styles.addButton} onClick={handleAddBioLine}>
                <Plus size={16} />
                <span>Adicionar Linha</span>
              </button>
            </div>

            {/* Link */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Link</label>
              <div className={styles.inputWithIcon}>
                <Link2 size={16} className={styles.inputIcon} />
                <input
                  type="text"
                  className={styles.input}
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="seusite.com"
                />
              </div>
            </div>

            {/* Stats */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Estatísticas</label>
              <div className={styles.statsGrid}>
                <div className={styles.statInput}>
                  <label className={styles.statLabel}>Seguidores</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={followersCount}
                    onChange={(e) => setFollowersCount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className={styles.statInput}>
                  <label className={styles.statLabel}>Seguindo</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={followingCount}
                    onChange={(e) => setFollowingCount(parseInt(e.target.value) || 0)}
                  />
                </div>
                <div className={styles.statInput}>
                  <label className={styles.statLabel}>Posts</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={profile?.posts_count || 0}
                    disabled
                    title="Atualizado automaticamente"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              className={styles.saveButton}
              onClick={handleSaveProfile}
              disabled={saving}
            >
              <Save size={18} />
              <span>{saving ? "Salvando..." : "Salvar Perfil"}</span>
            </button>
          </div>

          {/* Preview */}
          <div className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Eye size={20} />
              Prévia do Perfil
            </h2>
            <div className={styles.preview}>
              <div className={styles.previewHeader}>
                <div className={styles.previewAvatar}>
                  <img 
                    src={getImageUrl(avatarUrl)} 
                    alt="Avatar"
                    onError={(e) => {
                      e.currentTarget.src = '/profile.jpg';
                    }}
                  />
                </div>
                <div className={styles.previewInfo}>
                  <span className={styles.previewName}>{name}</span>
                  <div className={styles.previewStats}>
                    <div>
                      <strong>{profile?.posts_count || 0}</strong> posts
                    </div>
                    <div>
                      <strong>{formatNumber(followersCount)}</strong> seguidores
                    </div>
                    <div>
                      <strong>{followingCount}</strong> seguindo
                    </div>
                  </div>
                </div>
              </div>
              <div className={styles.previewBio}>
                {bio.map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
                {link && (
                  <p className={styles.previewLink}>
                    <Link2 size={12} /> {link}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts Tab */}
      {activeTab === "posts" && (
        <div className={styles.content}>
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>
                <ImageIcon size={20} />
                Gerenciar Posts
              </h2>
              <button className={styles.addPostButton} onClick={() => handleOpenPostModal()}>
                <Plus size={18} />
                <span>Novo Post</span>
              </button>
            </div>

            {posts.length === 0 ? (
              <div className={styles.empty}>
                <ImageIcon size={48} color="#6e6e6e" />
                <span>Nenhum post cadastrado</span>
                <p>Clique em "Novo Post" para adicionar</p>
              </div>
            ) : (
              <div className={styles.postsList}>
                <div className={styles.postsHeader}>
                  <span className={styles.count}>
                    {posts.length} {posts.length === 1 ? "post" : "posts"}
                  </span>
                  <span className={styles.activeCount}>
                    {posts.filter((p) => p.is_active).length} ativos
                  </span>
                </div>
                {posts.map((post, index) => {
                  const thumbnailUrl = getImageUrl(post.images[0]);
                  
                  return (
                    <div
                      key={post.id}
                      className={styles.postItem}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className={styles.postPreview}>
                        <img
                          src={thumbnailUrl}
                          alt="Post"
                          className={styles.postThumbnail}
                          onError={(e) => {
                            e.currentTarget.src = '/profile.jpg';
                          }}
                        />
                        {post.images.length > 1 && (
                          <div className={styles.multipleIndicator}>
                            {post.images.length}
                          </div>
                        )}
                      </div>

                    <div className={styles.postInfo}>
                      <div className={styles.postMeta}>
                        <span className={styles.postDate}>{post.post_date}</span>
                        <span className={styles.postLikes}>
                          {formatNumberWithDots(post.likes_count)} curtidas
                        </span>
                        <span className={styles.postOrder}>#{index + 1}</span>
                      </div>
                      <p className={styles.postCaption}>
                        {post.caption.length > 100
                          ? `${post.caption.substring(0, 100)}...`
                          : post.caption}
                      </p>
                    </div>

                    <div className={styles.postActions}>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleOpenPostModal(post)}
                        title="Editar"
                      >
                        <Edit size={18} color="#4150F7" />
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleTogglePostActive(post)}
                        title={post.is_active ? "Desativar" : "Ativar"}
                      >
                        {post.is_active ? (
                          <Eye size={18} color="#4150F7" />
                        ) : (
                          <EyeOff size={18} color="#6e6e6e" />
                        )}
                      </button>
                      <button
                        className={styles.actionButton}
                        onClick={() => handleDeletePost(post)}
                        title="Deletar"
                      >
                        <Trash2 size={18} color="#ff3b30" />
                      </button>
                      <button className={styles.dragHandle} title="Arrastar para reordenar">
                        <GripVertical size={18} color="#a8a8a8" />
                      </button>
                    </div>

                      {!post.is_active && (
                        <div className={styles.inactiveBadge}>Inativo</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Post Modal */}
      {showPostModal && (
        <div className={styles.modal} onClick={handleClosePostModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>{editingPost ? "Editar Post" : "Novo Post"}</h2>
              <button className={styles.modalClose} onClick={handleClosePostModal}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Images */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Imagens</label>
                <div className={styles.postImagesGrid}>
                  {postImages.map((img, index) => {
                    const imgUrl = getImageUrl(img);
                    
                    return (
                      <div key={index} className={styles.postImageItem}>
                        <img 
                          src={imgUrl} 
                          alt={`Post ${index + 1}`}
                          onError={(e) => {
                            e.currentTarget.src = '/profile.jpg';
                          }}
                        />
                        <button
                          type="button"
                          className={styles.removeImageButton}
                          onClick={() => handleRemovePostImage(index)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })}
                  <input
                    ref={postImageInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePostImageUpload}
                    style={{ display: "none" }}
                  />
                  <button
                    className={styles.addImageButton}
                    onClick={() => postImageInputRef.current?.click()}
                    disabled={uploadingImage}
                  >
                    {uploadingImage ? (
                      <span>Enviando...</span>
                    ) : (
                      <>
                        <Plus size={24} />
                        <span>Adicionar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Caption */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Legenda</label>
                <textarea
                  className={styles.textarea}
                  value={postCaption}
                  onChange={(e) => setPostCaption(e.target.value)}
                  placeholder="Escreva uma legenda..."
                  rows={4}
                />
              </div>

              {/* Date and Likes */}
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Data</label>
                  <input
                    type="text"
                    className={styles.input}
                    value={postDate}
                    onChange={(e) => setPostDate(e.target.value)}
                    placeholder="8 de outubro"
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Curtidas</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    className={styles.input}
                    value={postLikesInput}
                    placeholder="0"
                    onChange={(e) => handleLikesInputChange(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                className={styles.cancelButton}
                onClick={handleClosePostModal}
              >
                Cancelar
              </button>
              <button
                className={styles.saveButton}
                onClick={handleSavePost}
                disabled={saving || postImages.length === 0 || !postCaption.trim()}
              >
                <Save size={18} />
                <span>{saving ? "Salvando..." : "Salvar Post"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Footer */}
      <div className={styles.infoFooter}>
        <p>
          💡 <strong>Dica:</strong> As alterações só aparecem após salvar
        </p>
        <p>
          ⚡ <strong>Cache:</strong> Limpo automaticamente após alterações
        </p>
      </div>
    </div>
  );
}

