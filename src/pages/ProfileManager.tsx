import { useState, useEffect, useRef } from "react";
import {
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
import AdminLayout from "@/components/AdminLayout";
import styles from "./ProfileManager.module.css";

export default function ProfileManager() {
  const [profile, setProfile] = useState<ProfileSettings | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "posts">("profile");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState<string[]>([]);
  const [link, setLink] = useState("");
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  
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

  const formatNumberWithDots = (num: number) => num.toLocaleString('pt-BR');

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(".", ",")}mi`;
    if (num >= 1000) return `${Math.floor(num / 1000)} mil`;
    return num.toString();
  };

  const getImageUrl = (imagePath: string) => {
    if (!imagePath) return '/profile.jpg';
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/assets/')) return imagePath.replace('/assets/', '/');
    return imagePath;
  };

  const loadProfile = async () => {
    setLoading(true);
    const data = await ProfileService.getProfile(undefined, { forceRefresh: true });
    if (data) {
      setProfile(data); setUsername(data.username); setName(data.name);
      setAvatarUrl(data.avatar_url); setBio(data.bio); setLink(data.link);
      setFollowersCount(data.followers_count); setFollowingCount(data.following_count);
    }
    setLoading(false);
  };

  const loadPosts = async () => {
    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
    if (profileData) {
      const data = await ProfileService.getAllPosts(profileData.username);
      setPosts(data);
    }
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    const success = await ProfileService.updateProfile(profile.username, {
      username, name, avatar_url: avatarUrl, bio, link,
      followers_count: followersCount, following_count: followingCount
    });
    if (success) { alert("Perfil atualizado!"); await loadProfile(); }
    setSaving(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    if (MediaService.isValidFileType(file)) {
      const compressed = await MediaService.compressImage(file, 400);
      const url = await ProfileService.uploadAvatar(compressed, profile?.username || username);
      if (url) setAvatarUrl(url);
    }
    setSaving(false);
  };

  const handleOpenPostModal = (post?: Post) => {
    if (post) {
      setEditingPost(post); setPostImages(post.images); setPostCaption(post.caption);
      setPostDate(post.post_date); setPostLikes(post.likes_count);
      setPostLikesInput(formatNumberWithDots(post.likes_count));
    } else {
      setEditingPost(null); setPostImages([]); setPostCaption("");
      setPostDate(new Date().toLocaleDateString('pt-BR')); setPostLikes(0); setPostLikesInput("0");
    }
    setShowPostModal(true);
  };

  const handlePostImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    const compressed = await MediaService.compressImage(file, 1080);
    const url = await ProfileService.uploadPostImage(compressed, profile?.username || username);
    if (url) setPostImages([...postImages, url]);
    setUploadingImage(false);
  };

  const handleSavePost = async () => {
    setSaving(true);
    if (editingPost) {
      await ProfileService.updatePost(editingPost.id, profile?.username || username, {
        images: postImages, caption: postCaption, post_date: postDate, likes_count: postLikes
      });
    } else {
      await ProfileService.createPost(profile?.username || username, postImages, postCaption, postDate, postLikes);
    }
    await loadPosts(); await loadProfile();
    setShowPostModal(false);
    setSaving(false);
  };

  const handleDeletePost = async (post: Post) => {
    if (confirm("Deletar post?")) {
      await ProfileService.deletePost(post.id, profile?.username || username);
      await loadPosts(); await loadProfile();
    }
  };

  if (loading) return <AdminLayout><div className={styles.loading}>Sincronizando Perfil...</div></AdminLayout>;

  return (
    <AdminLayout>
      <div className={styles.profileManager}>
        <div className={styles.viewHeader}>
          <div>
            <h1 className={styles.viewTitle}>Gerenciar Perfil</h1>
            <p className={styles.viewSubtitle}>Personalize a identidade visual do seu funnel.</p>
          </div>
        </div>

        <div className={styles.tabs}>
          <button className={`${styles.tab} ${activeTab === 'profile' ? styles.active : ''}`} onClick={() => setActiveTab('profile')}>
            <User size={18} /> <span>Informações</span>
          </button>
          <button className={`${styles.tab} ${activeTab === 'posts' ? styles.active : ''}`} onClick={() => setActiveTab('posts')}>
            <ImageIcon size={18} /> <span>Posts do Feed</span>
          </button>
        </div>

        {activeTab === 'profile' ? (
          <div className={styles.tabContent}>
            <div className={styles.formRow}>
              <div className={styles.formSection}>
                <div className={styles.field}>
                  <label>Foto de Perfil</label>
                  <div className={styles.avatarZone}>
                    <img key={avatarUrl} src={getImageUrl(avatarUrl)} alt="" className={styles.avatarImg} />
                    <button className={styles.uploadBtn} onClick={() => avatarInputRef.current?.click()} disabled={saving}>
                      <Upload size={14} /> Alterar
                    </button>
                    <input ref={avatarInputRef} type="file" style={{ display: 'none' }} onChange={handleAvatarUpload} />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Username</label>
                  <div className={styles.inputGroup}>
                    <span className={styles.prefix}>@</span>
                    <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} />
                  </div>
                </div>

                <div className={styles.field}>
                  <label>Nome Visível</label>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
                </div>

                <div className={styles.field}>
                  <label>Biografia (Linhas)</label>
                  {bio.map((line, i) => (
                    <div key={i} className={styles.bioLine}>
                      <input type="text" value={line} onChange={(e) => {
                        const b = [...bio]; b[i] = e.target.value; setBio(b);
                      }} />
                      <button onClick={() => setBio(bio.filter((_, idx) => idx !== i))}><X size={14}/></button>
                    </div>
                  ))}
                  <button className={styles.addBtn} onClick={() => setBio([...bio, ""])}><Plus size={14}/> Nova Linha</button>
                </div>
              </div>

              <div className={styles.dashboardCard}>
                <h3>Resumo de Ativos</h3>
                <div className={styles.statsBar}>
                  <div className={styles.statItem}><strong>{formatNumber(followersCount)}</strong><span>Seguidores</span></div>
                  <div className={styles.statItem}><strong>{followingCount}</strong><span>Seguindo</span></div>
                  <div className={styles.statItem}><strong>{posts.length}</strong><span>Posts</span></div>
                </div>
                <button className={styles.saveMainBtn} onClick={handleSaveProfile} disabled={saving}>
                  <Save size={16} /> {saving ? 'Salvando...' : 'Atualizar Perfil'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.tabContent}>
             <div className={styles.postsHeader}>
                <button className={styles.newPostBtn} onClick={() => handleOpenPostModal()}>
                  <Plus size={16} /> Novo Post
                </button>
             </div>
             <div className={styles.postsGrid}>
                {posts.map((post, i) => (
                  <div key={post.id} className={styles.postCard}>
                    <img src={getImageUrl(post.images[0])} alt="" />
                    <div className={styles.postOverlay}>
                       <button onClick={() => handleOpenPostModal(post)}><Edit size={16}/></button>
                       <button onClick={() => handleDeletePost(post)}><Trash2 size={16}/></button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {showPostModal && (
        <div className={styles.modal}>
          <div className={styles.modalInner}>
            <h3>{editingPost ? 'Editar Post' : 'Novo Post'}</h3>
            <div className={styles.modalFields}>
               <label>Legenda</label>
               <textarea value={postCaption} onChange={e => setPostCaption(e.target.value)} />
               
               <label>Imagens</label>
               <div className={styles.imgGrid}>
                 {postImages.map((img, i) => <img key={i} src={getImageUrl(img)} />)}
                 <button onClick={() => postImageInputRef.current?.click()} className={styles.addImgBtn}>+</button>
                 <input ref={postImageInputRef} type="file" style={{ display: 'none' }} onChange={handlePostImageUpload} />
               </div>
            </div>
            <div className={styles.modalActions}>
               <button onClick={() => setShowPostModal(false)}>Cancelar</button>
               <button onClick={handleSavePost} className={styles.saveBtn}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
