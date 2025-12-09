import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Upload, Eye, EyeOff, Trash2, GripVertical, Play, Image as ImageIcon, Link2, Link2Off, X, MousePointer2 } from "lucide-react";
import { StoryService, type Story } from "@/services/storyService";
import { MediaService } from "@/services/mediaService";
import { ProfileService } from "@/services/profileService";
import styles from "./StoriesManager.module.css";

export default function StoriesManager() {
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Link Editor State
  const [editingLinkStory, setEditingLinkStory] = useState<Story | null>(null);
  const [linkType, setLinkType] = useState<'visible' | 'invisible' | 'none'>('none');
  const [linkPosition, setLinkPosition] = useState({ x: 50, y: 50 });
  const [isDraggingLink, setIsDraggingLink] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      setLoading(true);
      // Buscar perfil primeiro para garantir username correto
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (!profileData) {
        console.error('Perfil não encontrado');
        return;
      }
      const data = await StoryService.getAllStories(profileData.username);
      setStories(data);
    } catch (error) {
      console.error('Erro ao carregar stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);

      // Validar tipo
      if (!MediaService.isValidFileType(file)) {
        alert('Tipo de arquivo não suportado. Use imagens ou vídeos.');
        return;
      }

      // Comprimir se for imagem
      let fileToUpload = file;
      const mediaType = MediaService.getMediaType(file);
      let storyThumbnail: string | null = null;

      if (mediaType === 'image') {
        fileToUpload = await MediaService.compressImage(file, 1080);
      } else if (mediaType === 'video') {
        storyThumbnail = await MediaService.createVideoThumbnail(file);
      }

      // Buscar perfil para garantir username correto
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (!profileData) {
        alert('Erro: Perfil não encontrado');
        return;
      }

      // Upload
      const upload = await StoryService.uploadStoryMedia(fileToUpload, profileData.username);
      if (!upload) {
        alert('Erro ao fazer upload');
        return;
      }

      // Detectar duração para vídeos
      let duration = 5000; // Default 5s para imagens
      if (mediaType === 'video') {
        duration = await StoryService.getVideoDuration(file);
      }

      // Criar story
      const newStory = await StoryService.createStory(
        profileData.username,
        upload.url,
        mediaType === 'video' ? 'video' : 'image',
        duration,
        storyThumbnail ?? undefined
      );

      if (newStory) {
        const normalizedThumbnail = newStory.thumbnail ?? storyThumbnail;
        setStories([
          ...stories,
          {
            ...newStory,
            thumbnail: normalizedThumbnail,
          },
        ]);
        alert('Story adicionado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao adicionar story:', error);
      alert('Erro ao adicionar story');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleToggleActive = async (story: Story) => {
    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
    if (!profileData) {
      alert('Erro: Perfil não encontrado');
      return;
    }

    const success = await StoryService.toggleStoryActive(
      story.id,
      !story.is_active,
      profileData.username
    );

    if (success) {
      setStories(stories.map(s =>
        s.id === story.id ? { ...s, is_active: !s.is_active } : s
      ));
    }
  };

  const openLinkEditor = (story: Story) => {
    setEditingLinkStory(story);
    setLinkType(story.link_type || (story.show_link ? 'visible' : 'none'));
    setLinkPosition({ x: story.link_x || 50, y: story.link_y || 50 });
  };

  const saveLinkConfig = async () => {
    if (!editingLinkStory) return;

    try {
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (!profileData) {
        alert('Erro ao carregar perfil. Tente novamente.');
        return;
      }

      const success = await StoryService.updateStoryLinkConfig(
        editingLinkStory.id,
        linkType,
        linkPosition.x,
        linkPosition.y,
        profileData.username
      );

      if (success) {
        setStories(stories.map(s =>
          s.id === editingLinkStory.id ? {
            ...s,
            link_type: linkType,
            link_x: linkPosition.x,
            link_y: linkPosition.y,
            show_link: linkType !== 'none'
          } : s
        ));
        setEditingLinkStory(null);
      } else {
        console.error('Falha ao salvar: StoryService.updateStoryLinkConfig retornou false. Verifique os logs anteriores para o erro do Supabase.');
        alert('Erro ao salvar configuração do link. Verifique o console (F12) para mais detalhes.');
      }
    } catch (error: any) {
      console.error('Erro detalhado ao salvar link:', error);
      alert(`Erro inesperado ao salvar: ${error.message || 'Erro desconhecido'}`);
    }
  };

  const handleLinkDragStart = () => {
    setIsDraggingLink(true);
  };

  const handleLinkDragEnd = () => {
    setIsDraggingLink(false);
  };

  const handleLinkDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDraggingLink || !previewRef.current) return;

    // Prevent scrolling on mobile
    // e.preventDefault(); 

    const rect = previewRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    let x = ((clientX - rect.left) / rect.width) * 100;
    let y = ((clientY - rect.top) / rect.height) * 100;

    // Clamp
    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    setLinkPosition({ x, y });
  };

  const handleDelete = async (story: Story) => {
    if (!confirm('Tem certeza que deseja deletar este story?')) return;

    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
    if (!profileData) {
      alert('Erro: Perfil não encontrado');
      return;
    }

    const success = await StoryService.deleteStory(story.id, profileData.username);
    if (success) {
      setStories(stories.filter(s => s.id !== story.id));
      alert('Story deletado com sucesso!');
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return `${seconds}s`;
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newStories = [...stories];
    const draggedItem = newStories[draggedIndex];
    newStories.splice(draggedIndex, 1);
    newStories.splice(index, 0, draggedItem);

    setStories(newStories);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    if (draggedIndex === null) return;

    // Buscar perfil para garantir username correto
    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
    if (!profileData) {
      alert('Erro: Perfil não encontrado');
      setDraggedIndex(null);
      return;
    }

    // Salvar nova ordem no banco
    const storyIds = stories.map(s => s.id);
    const success = await StoryService.reorderStories(storyIds, profileData.username);

    if (success) {
      await loadStories(); // Recarregar para confirmar
    } else {
      alert('Erro ao reordenar stories');
      await loadStories(); // Reverter
    }

    setDraggedIndex(null);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/admin987654321')}>
          <ChevronLeft size={24} />
        </button>
        <h1 className={styles.title}>Gerenciar Stories</h1>
      </div>

      {/* Upload Section */}
      <div className={styles.uploadSection}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        <button
          className={styles.uploadButton}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload size={20} />
          <span>{uploading ? 'Enviando...' : 'Adicionar Story'}</span>
        </button>
        <p className={styles.uploadInfo}>
          Imagens ou vídeos • Máx 50MB • Imagens: 5s • Vídeos: duração automática
        </p>
      </div>

      {/* Stories List */}
      <div className={styles.storiesList}>
        {loading ? (
          <div className={styles.loading}>
            <span>Carregando stories...</span>
          </div>
        ) : stories.length === 0 ? (
          <div className={styles.empty}>
            <span>Nenhum story cadastrado</span>
            <p>Clique em "Adicionar Story" para começar</p>
          </div>
        ) : (
          <>
            <div className={styles.listHeader}>
              <span className={styles.count}>
                {stories.length} {stories.length === 1 ? 'story' : 'stories'}
              </span>
              <span className={styles.activeCount}>
                {stories.filter(s => s.is_active).length} ativos
              </span>
            </div>
            {stories.map((story, index) => (
              <div
                key={story.id}
                className={styles.storyItem}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
              >
                {/* Thumbnail */}
                <div className={styles.storyPreview}>
                  {story.media_type === 'video' ? (
                    <>
                      <video src={story.media_url} className={styles.storyThumbnail} />
                      <div className={styles.playIcon}>
                        <Play size={20} fill="#fff" />
                      </div>
                    </>
                  ) : (
                    <img src={story.media_url} alt="Story" className={styles.storyThumbnail} />
                  )}
                </div>

                {/* Info */}
                <div className={styles.storyInfo}>
                  <div className={styles.storyMeta}>
                    <span className={styles.storyType}>
                      {story.media_type === 'video' ? (
                        <><Play size={14} /> Vídeo</>
                      ) : (
                        <><ImageIcon size={14} /> Imagem</>
                      )}
                    </span>
                    <span className={styles.storyDuration}>
                      {formatDuration(story.duration)}
                    </span>
                    <span className={styles.storyOrder}>
                      #{index + 1}
                    </span>
                  </div>
                  <span className={styles.storyDate}>
                    {new Date(story.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* Actions */}
                <div className={styles.storyActions}>
                  <button
                    className={styles.actionButton}
                    onClick={() => openLinkEditor(story)}
                    title="Configurar Link"
                  >
                    {story.show_link ? (
                      <Link2 size={18} color="#1877f2" />
                    ) : (
                      <Link2Off size={18} color="#6e6e6e" />
                    )}
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleToggleActive(story)}
                    title={story.is_active ? 'Desativar' : 'Ativar'}
                  >
                    {story.is_active ? (
                      <Eye size={18} color="#4150F7" />
                    ) : (
                      <EyeOff size={18} color="#6e6e6e" />
                    )}
                  </button>
                  <button
                    className={styles.actionButton}
                    onClick={() => handleDelete(story)}
                    title="Deletar"
                  >
                    <Trash2 size={18} color="#ff3b30" />
                  </button>
                  <button
                    className={styles.dragHandle}
                    title="Arrastar para reordenar"
                  >
                    <GripVertical size={18} color="#a8a8a8" />
                  </button>
                </div>

                {/* Status Badge */}
                {!story.is_active && (
                  <div className={styles.inactiveBadge}>
                    Inativo
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Info Footer */}
      <div className={styles.infoFooter}>
        <p>💡 <strong>Dica:</strong> Stories ativos aparecem para os leads na ordem listada</p>
        <p>⚡ <strong>Performance:</strong> Cache de 5 minutos para velocidade máxima</p>
      </div>


      {/* Link Editor Modal */}
      {
        editingLinkStory && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h2>Configurar Link do Story</h2>
                <button onClick={() => setEditingLinkStory(null)}>
                  <X size={24} />
                </button>
              </div>

              <div className={styles.modalBody}>
                <div className={styles.linkOptions}>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="linkType"
                      checked={linkType === 'none'}
                      onChange={() => setLinkType('none')}
                    />
                    <span>Sem Link</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="linkType"
                      checked={linkType === 'visible'}
                      onChange={() => setLinkType('visible')}
                    />
                    <span>Botão Visível (Padrão)</span>
                  </label>
                  <label className={styles.radioOption}>
                    <input
                      type="radio"
                      name="linkType"
                      checked={linkType === 'invisible'}
                      onChange={() => setLinkType('invisible')}
                    />
                    <span>Área Invisível (Personalizável)</span>
                  </label>
                </div>

                {(linkType === 'invisible' || linkType === 'visible') && (
                  <div className={styles.previewContainer}>
                    <p className={styles.previewHint}>
                      Arraste o {linkType === 'visible' ? 'botão' : 'box'} para posicionar o link
                    </p>
                    <div
                      className={styles.storyPreviewLarge}
                      ref={previewRef}
                      onMouseMove={handleLinkDragMove}
                      onMouseUp={handleLinkDragEnd}
                      onMouseLeave={handleLinkDragEnd}
                      onTouchMove={handleLinkDragMove}
                      onTouchEnd={handleLinkDragEnd}
                    >
                      {editingLinkStory.media_type === 'video' ? (
                        <video src={editingLinkStory.media_url} className={styles.previewMedia} />
                      ) : (
                        <img src={editingLinkStory.media_url} alt="Preview" className={styles.previewMedia} />
                      )}

                      <div
                        className={linkType === 'visible' ? styles.visibleLinkPreview : styles.invisibleLinkBox}
                        style={{
                          left: `${linkPosition.x}%`,
                          top: `${linkPosition.y}%`,
                          cursor: isDraggingLink ? 'grabbing' : 'grab'
                        }}
                        onMouseDown={handleLinkDragStart}
                        onTouchStart={handleLinkDragStart}
                      >
                        {linkType === 'visible' ? (
                          <>
                            <Link2 size={16} color="#1877f2" />
                            <span>LINK DO CÓDIGO</span>
                          </>
                        ) : (
                          <>
                            <MousePointer2 size={16} color="#fff" />
                            <span>Área do Link</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelButton}
                  onClick={() => setEditingLinkStory(null)}
                >
                  Cancelar
                </button>
                <button
                  className={styles.saveButton}
                  onClick={saveLinkConfig}
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        )
      }
    </div >
  );
}

