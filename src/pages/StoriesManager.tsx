import { useState, useEffect, useRef } from "react";
import { Upload, Eye, EyeOff, Trash2, Link2, Link2Off, Loader2 } from "lucide-react";
import { StoryService, type Story } from "@/services/storyService";
import { MediaService } from "@/services/mediaService";
import { ProfileService } from "@/services/profileService";
import AdminLayout from "@/components/AdminLayout";
import styles from "./StoriesManager.module.css";

export default function StoriesManager() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);

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
    if (togglingId) return;
    setTogglingId(story.id);
    try {
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (profileData) {
        const success = await StoryService.toggleStoryActive(story.id, !story.is_active, profileData.username);
        if (success) {
           await loadStories();
        } else {
           alert('Erro ao alterar status do story.');
        }
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao processar solicitação.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleEditLink = (story: Story) => {
    setLinkType(story.link_type || 'none');
    setLinkPosition({ x: story.link_x || 50, y: story.link_y || 50 });
    setLinkUrl(story.link_url || '');
    setEditingLinkStory(story);
  };

  const saveLinkConfig = async () => {
    if (!editingLinkStory) return;
    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
    if (profileData) {
      // Se tiver URL mas tipo for none, sugere visível
      let finalLinkType = linkType;
      if (linkUrl && linkType === 'none') {
         finalLinkType = 'visible';
      }

      const success = await StoryService.updateStoryLinkConfig(
        editingLinkStory.id, 
        finalLinkType, 
        linkPosition.x, 
        linkPosition.y, 
        profileData.username, 
        linkUrl
      );
      
      if (success) { 
        await loadStories(); 
        setEditingLinkStory(null); 
      } else {
        alert('Erro ao salvar link.');
      }
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
                  {story.media_type === 'video' ? <video src={story.media_url} muted loop /> : <img src={story.media_url} />}
                  <div className={styles.overlay}>
                    <button onClick={() => handleDelete(story)} className={styles.danger}><Trash2 size={16}/></button>
                    <button onClick={() => handleEditLink(story)}>
                      {story.link_type !== 'none' ? <Link2 size={16}/> : <Link2Off size={16} style={{opacity: 0.5}} />}
                    </button>
                    <button onClick={() => handleToggleActive(story)} disabled={togglingId === story.id}>
                      {togglingId === story.id ? <Loader2 size={16} className={styles.spin} /> : (story.is_active ? <Eye size={16}/> : <EyeOff size={16}/>)}
                    </button>
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
              <label>Tipo de Link</label>
              <select 
                value={linkType} 
                onChange={e => setLinkType(e.target.value as any)}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  padding: '12px',
                  color: '#fff',
                  width: '100%'
                }}
              >
                <option value="none" style={{color: 'black'}}>Sem Link</option>
                <option value="visible" style={{color: 'black'}}>Link Visível (Adesivo)</option>
                <option value="invisible" style={{color: 'black'}}>Link Invisível (Tela Cheia)</option>
              </select>
            </div>

            <div className={styles.field}>
              <label>Link URL</label>
              <input type="text" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://..." />
            </div>

            {linkType === 'visible' && (
              <div className={styles.field}>
                <label>Posicionamento do Link</label>
                <div 
                  ref={previewRef}
                  className={styles.positionPreview}
                  onMouseMove={(e) => {
                    if (isDraggingLink && previewRef.current) {
                      const rect = previewRef.current.getBoundingClientRect();
                      const x = ((e.clientX - rect.left) / rect.width) * 100;
                      const y = ((e.clientY - rect.top) / rect.height) * 100;
                      setLinkPosition({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
                    }
                  }}
                  onMouseUp={() => setIsDraggingLink(false)}
                  onMouseLeave={() => setIsDraggingLink(false)}
                  style={{ position: 'relative', width: '200px', height: '355px', margin: '0 auto', background: '#000', borderRadius: '12px', overflow: 'hidden' }}
                >
                  {editingLinkStory.media_type === 'video' ? 
                    <video src={editingLinkStory.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} /> :
                    <img src={editingLinkStory.media_url} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
                  }
                  
                  <div
                    onMouseDown={() => setIsDraggingLink(true)}
                    style={{
                      position: 'absolute',
                      left: `${linkPosition.x}%`,
                      top: `${linkPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      background: '#fff',
                      color: '#000',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 'bold',
                      cursor: 'move',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }}
                  >
                    <Link2 size={10} /> Link
                  </div>
                </div>
                <p style={{fontSize: '11px', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '8px'}}>
                  Arraste o botão para posicionar o link no story
                </p>
              </div>
            )}

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
