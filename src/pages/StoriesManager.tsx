import { useState, useEffect, useRef } from "react";
import { Upload, Eye, EyeOff, Trash2, GripVertical, Play, Image as ImageIcon, Link2, Link2Off, X, MousePointer2 } from "lucide-react";
import { StoryService, type Story } from "@/services/storyService";
import { MediaService } from "@/services/mediaService";
import { ProfileService } from "@/services/profileService";
import AdminLayout from "@/components/AdminLayout";
import styles from "./StoriesManager.module.css";

export default function StoriesManager() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const [editingLinkStory, setEditingLinkStory] = useState<Story | null>(null);
  const [linkType, setLinkType] = useState<'visible' | 'invisible' | 'none'>('none');
  const [linkPosition, setLinkPosition] = useState({ x: 50, y: 50 });
  const [linkUrl, setLinkUrl] = useState('');
  const [isDraggingLink, setIsDraggingLink] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadStories(); }, []);

  const loadStories = async () => {
    setLoading(true);
    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
    if (profileData) {
      const data = await StoryService.getAllStories(profileData.username);
      setStories(data);
    }
    setLoading(false);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    if (MediaService.isValidFileType(file)) {
      const mediaType = MediaService.getMediaType(file);
      let fileToUpload = file;
      let thumbnail: string | null = null;
      if (mediaType === 'image') fileToUpload = await MediaService.compressImage(file, 1080);
      else if (mediaType === 'video') thumbnail = await MediaService.createVideoThumbnail(file);

      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (profileData) {
        const upload = await StoryService.uploadStoryMedia(fileToUpload, profileData.username);
        if (upload) {
          const duration = mediaType === 'video' ? await StoryService.getVideoDuration(file) : 5000;
          await StoryService.createStory(profileData.username, upload.url, mediaType === 'video' ? 'video' : 'image', duration, thumbnail ?? undefined);
          await loadStories();
        }
      }
    }
    setUploading(false);
  };

  const handleToggleActive = async (story: Story) => {
    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
    if (profileData) {
      const success = await StoryService.toggleStoryActive(story.id, !story.is_active, profileData.username);
      if (success) await loadStories();
    }
  };

  const saveLinkConfig = async () => {
    if (!editingLinkStory) return;
    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
    if (profileData) {
      const success = await StoryService.updateStoryLinkConfig(editingLinkStory.id, linkType, linkPosition.x, linkPosition.y, profileData.username, linkUrl);
      if (success) { await loadStories(); setEditingLinkStory(null); }
    }
  };

  const handleDelete = async (story: Story) => {
    if (confirm('Deletar story?')) {
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (profileData) {
        await StoryService.deleteStory(story.id, profileData.username);
        await loadStories();
      }
    }
  };

  const formatDuration = (ms: number) => `${Math.floor(ms / 1000)}s`;

  return (
    <AdminLayout>
      <div className={styles.storiesManager}>
         <div className={styles.viewHeader}>
          <div>
            <h1 className={styles.viewTitle}>Gerenciar Stories</h1>
            <p className={styles.viewSubtitle}>Controle o fluxo narrativo para seus leads.</p>
          </div>
          <button className={styles.addBtn} onClick={() => fileInputRef.current?.click()} disabled={uploading}>
            <Upload size={16} /> {uploading ? 'Enviando...' : 'Novo Story'}
          </button>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={handleFileSelect} />
        </div>

        <div className={styles.storiesGrid}>
          {loading ? <div className={styles.info}>Carregando...</div> : stories.length === 0 ? <div className={styles.info}>Nenhum story.</div> : (
            stories.map((story, i) => (
              <div key={story.id} className={`${styles.storyCard} ${!story.is_active ? styles.inactive : ''}`}>
                <div className={styles.mediaContainer}>
                  {story.media_type === 'video' ? <video src={story.media_url} /> : <img src={story.media_url} />}
                  <div className={styles.overlay}>
                    <button onClick={() => handleDelete(story)} className={styles.danger}><Trash2 size={16}/></button>
                    <button onClick={() => setEditingLinkStory(story)}><Link2 size={16}/></button>
                    <button onClick={() => handleToggleActive(story)}>{story.is_active ? <Eye size={16}/> : <EyeOff size={16}/>}</button>
                  </div>
                </div>
                <div className={styles.cardInfo}>
                  <div className={styles.meta}>
                    <span>{story.media_type}</span>
                    <span>{formatDuration(story.duration)}</span>
                  </div>
                  <span className={styles.date}>{new Date(story.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {editingLinkStory && (
        <div className={styles.modal}>
          <div className={styles.modalInner}>
            <h3>Configurar Link</h3>
            <div className={styles.field}>
              <label>Link URL</label>
              <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className={styles.modalActions}>
               <button onClick={() => setEditingLinkStory(null)}>Cancelar</button>
               <button onClick={saveLinkConfig} className={styles.saveBtn}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
