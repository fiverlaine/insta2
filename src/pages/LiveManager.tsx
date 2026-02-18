
import { useState, useEffect, useRef } from "react";
import { liveService, LiveConfig, LiveComment } from "@/services/liveService";
import { ProfileService } from "@/services/profileService";
import styles from "./LiveManager.module.css";
import AdminLayout from "@/components/AdminLayout";
import { Trash2, Plus, Play, Pause, Upload, Loader2 } from "lucide-react";

export default function LiveManager() {
  const [config, setConfig] = useState<LiveConfig | null>(null);
  const [comments, setComments] = useState<LiveComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Comment Form
  const [newComment, setNewComment] = useState({
    username: "",
    message: "",
    avatar_url: undefined as string | undefined, // Explicit type
    video_timestamp: 0,
    is_random: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [conf, comms] = await Promise.all([
      liveService.getLiveConfig(),
      liveService.getComments()
    ]);
    setConfig(conf);
    setComments(comms);
    setLoading(false);
  };

  const handleConfigUpdate = async () => {
    if (!config) return;
    try {
      await liveService.updateLiveConfig({
        video_url: config.video_url,
        viewer_count_min: config.viewer_count_min,
        viewer_count_max: config.viewer_count_max
      });
      alert("Configurações salvas!");
    } catch (e) {
      alert("Erro ao salvar config");
    }
  };

  const toggleLive = async () => {
    if (!config) return;
    try {
      await liveService.toggleLive(!config.is_active);
      setConfig({ ...config, is_active: !config.is_active });
    } catch (e) {
      alert("Erro ao alterar status");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.indexOf('video') === -1) {
      alert('Por favor selecione um arquivo de vídeo (MP4)');
      return;
    }

    setUploading(true);
    try {
      // Reusing the logic from StoryService/MediaService but adapted
      // We need a profile username to construct the path usually, but we can fetch it
      const profile = await ProfileService.getProfile();
      const username = profile?.username || 'admin';
      
      // Compress/Process if needed? For live video usually we want raw but maybe size limit
      // Just upload directly using MediaService logic manually since StoryService expects to Create a story
      
      // Let's use a similar path structure: stories-media/{username}/{timestamp}_live.mp4
      const timestamp = Date.now();
      const fileName = `${username}/${timestamp}_live.mp4`;
      
      // Use supabase directly or via a new service method? 
      // Let's use the valid file type check from MediaService at least
      
      const { data, error } = await import("@/lib/supabase").then(m => m.supabase.storage
        .from('stories-media') // Reusing stories bucket
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        }));

      if (error) throw error;

      const { data: urlData } = await import("@/lib/supabase").then(m => m.supabase.storage
        .from('stories-media')
        .getPublicUrl(data.path));

      const publicUrl = urlData.publicUrl;
      
      if (config) {
        setConfig({ ...config, video_url: publicUrl });
      }
      
    } catch (e) {
      console.error(e);
      alert('Erro ao fazer upload do vídeo');
    } finally {
      setUploading(false);
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAddComment = async () => {
    if (!newComment.username || !newComment.message) return;
    
    try {
      const added = await liveService.addComment({
        username: newComment.username,
        message: newComment.message,
        avatar_url: newComment.avatar_url || undefined,
        video_timestamp: newComment.is_random ? undefined : newComment.video_timestamp
      });
      
      if (added) {
        setComments([...comments, added]);
        setNewComment({
          username: "",
          message: "",
          avatar_url: "",
          video_timestamp: 0,
          is_random: true
        });
      }
    } catch (e) {
      alert("Erro ao adicionar comentário");
    }
  };

  const handleDeleteComment = async (id: string) => {
    if (!confirm("Deletar comentário?")) return;
    try {
      await liveService.deleteComment(id);
      setComments(comments.filter(c => c.id !== id));
    } catch (e) {
      alert("Erro ao deletar");
    }
  };

  if (loading) return <div>Carregando...</div>;

  return (
    <AdminLayout>
      <div className={styles.liveManager}>
        <div className={styles.viewHeader}>
          <div>
            <h1 className={styles.viewTitle}>Gerenciar Live</h1>
            <p className={styles.viewSubtitle}>Simule transmissões ao vivo para converter seus leads.</p>
          </div>
          <div className={`${styles.statusBadge} ${config?.is_active ? styles.statusActive : styles.statusInactive}`}>
            {config?.is_active ? "SINAL ATIVO" : "SINAL OFFLINE"}
          </div>
        </div>
        
        {/* Live Status Control */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Transmissão Técnica</h2>
          
          <div className={styles.field}>
            <label className={styles.label}>Origem do Sinal (Vídeo MP4)</label>
            <div className={styles.inputGroup}>
              <input 
                className={styles.input}
                value={config?.video_url || ''}
                onChange={e => config && setConfig({...config, video_url: e.target.value})}
                placeholder="https://exemplo.com/live.mp4"
              />
              <button 
                className={styles.secondaryBtn} 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                style={{width: 50, height: 46, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0}}
              >
                  {uploading ? <Loader2 size={20} className={styles.spin} /> : <Upload size={20} />}
              </button>
            </div>
            <input 
               ref={fileInputRef} 
               type="file" 
               accept="video/mp4,video/quicktime" 
               style={{ display: 'none' }} 
               onChange={handleFileSelect} 
            />
          </div>

          <div className={styles.row}>
            <div className={styles.field}>
              <label className={styles.label}>Audiência Mínima</label>
              <input 
                type="number"
                className={styles.input}
                value={config?.viewer_count_min || 0}
                onChange={e => config && setConfig({...config, viewer_count_min: parseInt(e.target.value)})}
              />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Audiência Máxima</label>
              <input 
                type="number"
                className={styles.input}
                value={config?.viewer_count_max || 0}
                onChange={e => config && setConfig({...config, viewer_count_max: parseInt(e.target.value)})}
              />
            </div>
          </div>

          <div style={{display: 'flex', gap: 12, marginTop: 12}}>
            <button className={styles.actionBtn} onClick={handleConfigUpdate} style={{flex: 1}}>
              Salvar Configurações
            </button>
            <button 
              className={`${styles.actionBtn} ${config?.is_active ? styles.dangerBtn : styles.actionBtn}`}
              onClick={toggleLive}
              style={{flex: 1}}
            >
              {config?.is_active ? <><Pause size={18} /> PARAR LIVE</> : <><Play size={18} /> INICIAR LIVE</>}
            </button>
          </div>
        </div>

        {/* Comments Manager */}
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Engine de Chat ({comments.length})</h2>
          
          <div className={styles.addCommentSection}>
            <h3 style={{marginBottom: 16, fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.8)'}}>Novo Comentário</h3>
            <div className={styles.row} style={{marginBottom: 16}}>
              <div className={styles.field} style={{marginBottom: 0}}>
                <label className={styles.label}>Username</label>
                <input 
                  className={styles.input} 
                  placeholder="ex: pedro_lucas" 
                  value={newComment.username}
                  onChange={e => setNewComment({...newComment, username: e.target.value})}
                />
              </div>
              <div className={styles.field} style={{marginBottom: 0}}>
                <label className={styles.label}>Mensagem</label>
                <input 
                  className={styles.input} 
                  placeholder="ex: Esse método é top!" 
                  value={newComment.message}
                  onChange={e => setNewComment({...newComment, message: e.target.value})}
                />
              </div>
            </div>
            
            <div style={{display:'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <div style={{display: 'flex', gap: 24}}>
                  <label style={{display:'flex', gap: 10, alignItems:'center', cursor:'pointer', fontSize: 13, color: 'rgba(255,255,255,0.7)'}}>
                    <input 
                      type="checkbox" 
                      style={{width: 18, height: 18, accentColor: '#6366f1'}}
                      checked={newComment.is_random} 
                      onChange={e => setNewComment({...newComment, is_random: e.target.checked})}
                    />
                    Loop Aleatório
                  </label>
                  
                  {!newComment.is_random && (
                    <div style={{display:'flex', alignItems: 'center', gap: 10}}>
                        <label className={styles.label} style={{margin: 0}}>Tempo (seg):</label>
                        <input 
                        type="number" 
                        className={styles.input} 
                        style={{width: 80, padding: '8px 12px'}}
                        value={newComment.video_timestamp}
                        onChange={e => setNewComment({...newComment, video_timestamp: parseInt(e.target.value)})}
                        />
                    </div>
                  )}
              </div>
              
              <button 
                className={styles.actionBtn} 
                onClick={handleAddComment} 
                disabled={!newComment.username || !newComment.message}
                style={{padding: '10px 20px'}}
              >
                <Plus size={18} /> Adicionar
              </button>
            </div>
          </div>

          <div className={styles.commentsList}>
            {comments.map(comment => (
              <div key={comment.id} className={styles.commentItem}>
                <div>
                  <div className={styles.commentUser}>
                    @{comment.username} 
                    {comment.video_timestamp != null ? (
                       <span className={`${styles.commentType} ${styles.typeTimed}`}>
                         TRIGGER: {Math.floor(comment.video_timestamp / 60)}:{(comment.video_timestamp % 60).toString().padStart(2, '0')}
                       </span>
                    ) : (
                       <span className={`${styles.commentType} ${styles.typeRandom}`}>LOOP</span>
                    )}
                  </div>
                  <div className={styles.commentMsg}>"{comment.message}"</div>
                </div>
                <button className={styles.deleteBtn} onClick={() => handleDeleteComment(comment.id)}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>
    </AdminLayout>
  );
}
