import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Eye, EyeOff, Pencil, Loader2, Check, Image } from "lucide-react";
import { HighlightService, type HighlightWithStories } from "@/services/highlightService";
import { StoryService, type Story } from "@/services/storyService";
import { ProfileService } from "@/services/profileService";
import { MediaService } from "@/services/mediaService";
import AdminLayout from "@/components/AdminLayout";
import styles from "./HighlightsManager.module.css";

type ModalMode = "create" | "edit" | null;

export default function HighlightsManager() {
  const [highlights, setHighlights] = useState<HighlightWithStories[]>([]);
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modal state
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingHighlight, setEditingHighlight] = useState<HighlightWithStories | null>(null);
  const [highlightName, setHighlightName] = useState("");
  const [selectedStoryIds, setSelectedStoryIds] = useState<string[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingCover, setUploadingCover] = useState(false);

  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
    if (profileData) {
      const [highlightsData, storiesData] = await Promise.all([
        HighlightService.getAllHighlights(profileData.username),
        StoryService.getAllStories(profileData.username),
      ]);
      setHighlights(highlightsData);
      setAllStories(storiesData);
    }
    setLoading(false);
  };

  // ─── Modal Abrir/Fechar ──────────────────────────

  const openCreateModal = () => {
    setModalMode("create");
    setEditingHighlight(null);
    setHighlightName("");
    setSelectedStoryIds([]);
    setCoverUrl(null);
  };

  const openEditModal = (highlight: HighlightWithStories) => {
    setModalMode("edit");
    setEditingHighlight(highlight);
    setHighlightName(highlight.name);
    setSelectedStoryIds(highlight.stories.map((s) => s.id));
    setCoverUrl(highlight.cover_media_url);
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingHighlight(null);
    setHighlightName("");
    setSelectedStoryIds([]);
    setCoverUrl(null);
  };

  // ─── Seleção de Stories ──────────────────────────

  const toggleStorySelection = (storyId: string) => {
    setSelectedStoryIds((prev) => {
      if (prev.includes(storyId)) {
        return prev.filter((id) => id !== storyId);
      }
      return [...prev, storyId];
    });
  };

  // ─── Upload de Capa ──────────────────────────────

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    try {
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: false });
      if (profileData) {
        const compressedFile = await MediaService.compressImage(file, 400);
        const url = await HighlightService.uploadHighlightCover(compressedFile, profileData.username);
        if (url) {
          setCoverUrl(url);
        } else {
          alert("Erro ao fazer upload da capa.");
        }
      }
    } catch (error) {
      console.error("Erro no upload:", error);
      alert("Erro ao fazer upload.");
    } finally {
      setUploadingCover(false);
    }
  };

  // ─── Salvar Highlight ────────────────────────────

  const handleSave = async () => {
    if (!highlightName.trim()) {
      alert("Digite um nome para o destaque.");
      return;
    }
    if (selectedStoryIds.length === 0) {
      alert("Selecione pelo menos um story.");
      return;
    }

    setSaving(true);
    try {
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: false });
      if (!profileData) return;

      if (modalMode === "create") {
        const result = await HighlightService.createHighlight(
          profileData.username,
          highlightName.trim(),
          selectedStoryIds,
          coverUrl
        );
        if (!result) {
          alert("Erro ao criar destaque.");
          return;
        }
      } else if (modalMode === "edit" && editingHighlight) {
        const updated = await HighlightService.updateHighlight(
          editingHighlight.id,
          highlightName.trim(),
          coverUrl,
          profileData.username
        );
        if (!updated) {
          alert("Erro ao atualizar destaque.");
          return;
        }

        const storiesUpdated = await HighlightService.updateHighlightStories(
          editingHighlight.id,
          selectedStoryIds,
          profileData.username
        );
        if (!storiesUpdated) {
          alert("Erro ao atualizar stories do destaque.");
          return;
        }
      }

      await loadData();
      closeModal();
    } catch (error) {
      console.error("Erro ao salvar:", error);
      alert("Erro ao salvar destaque.");
    } finally {
      setSaving(false);
    }
  };

  // ─── Ações no Card ───────────────────────────────

  const handleToggleActive = async (highlight: HighlightWithStories) => {
    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: false });
    if (profileData) {
      const success = await HighlightService.toggleHighlightActive(
        highlight.id,
        !highlight.is_active,
        profileData.username
      );
      if (success) {
        await loadData();
      } else {
        alert("Erro ao alterar status.");
      }
    }
  };

  const handleDelete = async (highlight: HighlightWithStories) => {
    if (!confirm(`Deletar o destaque "${highlight.name}"?`)) return;

    const profileData = await ProfileService.getProfile(undefined, { forceRefresh: false });
    if (profileData) {
      const success = await HighlightService.deleteHighlight(
        highlight.id,
        profileData.username
      );
      if (success) {
        await loadData();
      } else {
        alert("Erro ao deletar destaque.");
      }
    }
  };

  // ─── Render ──────────────────────────────────────

  const getCoverForHighlight = (h: HighlightWithStories): string => {
    return h.cover_media_url || h.stories[0]?.thumbnail || h.stories[0]?.media_url || "/profile.jpg";
  };

  return (
    <AdminLayout>
      <div className={styles.highlightsManager}>
        <div className={styles.viewHeader}>
          <div>
            <h1 className={styles.viewTitle}>Destaques</h1>
            <p className={styles.viewSubtitle}>
              Crie e gerencie seus destaques do perfil.
            </p>
          </div>
          <button className={styles.addBtn} onClick={openCreateModal}>
            <Plus size={16} /> Novo Destaque
          </button>
        </div>

        <div className={styles.highlightsGrid}>
          {loading ? (
            <div className={styles.info}>Carregando...</div>
          ) : highlights.length === 0 ? (
            <div className={styles.info}>Nenhum destaque criado.</div>
          ) : (
            highlights.map((highlight) => (
              <div
                key={highlight.id}
                className={`${styles.highlightCard} ${!highlight.is_active ? styles.inactive : ""}`}
              >
                <div className={styles.cardHeader}>
                  <div className={styles.cardCover}>
                    <img
                      src={getCoverForHighlight(highlight)}
                      alt={highlight.name}
                      onError={(e) => {
                        e.currentTarget.src = "/profile.jpg";
                      }}
                    />
                  </div>
                  <div className={styles.cardTitle}>
                    <h3>{highlight.name}</h3>
                    <span>
                      {highlight.stories.length} {highlight.stories.length === 1 ? "story" : "stories"}
                    </span>
                  </div>
                </div>

                {highlight.stories.length > 0 && (
                  <div className={styles.storiesPreview}>
                    {highlight.stories.slice(0, 6).map((story) => (
                      <div key={story.id} className={styles.storyMini}>
                        {story.media_type === "video" ? (
                          <img
                            src={story.thumbnail || story.media_url}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.src = "/profile.jpg";
                            }}
                          />
                        ) : (
                          <img
                            src={story.media_url}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.src = "/profile.jpg";
                            }}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className={styles.cardActions}>
                  <button onClick={() => openEditModal(highlight)}>
                    <Pencil size={14} /> Editar
                  </button>
                  <button onClick={() => handleToggleActive(highlight)}>
                    {highlight.is_active ? (
                      <>
                        <Eye size={14} /> Ativo
                      </>
                    ) : (
                      <>
                        <EyeOff size={14} /> Inativo
                      </>
                    )}
                  </button>
                  <button className={styles.danger} onClick={() => handleDelete(highlight)}>
                    <Trash2 size={14} /> Excluir
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Modal Criar/Editar ── */}
      {modalMode && (
        <div className={styles.modal}>
          <div className={styles.modalInner}>
            <h3>{modalMode === "create" ? "Novo Destaque" : "Editar Destaque"}</h3>
            <p>
              {modalMode === "create"
                ? "Dê um nome e selecione os stories para o destaque."
                : "Altere as configurações do destaque."}
            </p>

            {/* Nome */}
            <div className={styles.field}>
              <label>Nome do Destaque</label>
              <input
                type="text"
                value={highlightName}
                onChange={(e) => setHighlightName(e.target.value)}
                placeholder="Ex: Viagem, Trabalho, Dia a dia..."
                maxLength={30}
              />
            </div>

            {/* Capa */}
            <div className={styles.coverUpload}>
              <div className={styles.coverPreview}>
                <img
                  src={
                    coverUrl ||
                    (selectedStoryIds.length > 0
                      ? allStories.find((s) => s.id === selectedStoryIds[0])?.thumbnail ||
                        allStories.find((s) => s.id === selectedStoryIds[0])?.media_url ||
                        "/profile.jpg"
                      : "/profile.jpg")
                  }
                  alt="Capa"
                  onError={(e) => {
                    e.currentTarget.src = "/profile.jpg";
                  }}
                />
              </div>
              <div className={styles.coverButtons}>
                <button onClick={() => coverInputRef.current?.click()} disabled={uploadingCover}>
                  <Image size={12} />{" "}
                  {uploadingCover ? "Enviando..." : "Escolher Capa"}
                </button>
                {coverUrl && (
                  <button onClick={() => setCoverUrl(null)}>Remover Capa</button>
                )}
              </div>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleCoverUpload}
              />
            </div>

            {/* Seletor de Stories */}
            <div className={styles.storiesSelector}>
              <label>
                Selecione os Stories ({selectedStoryIds.length} selecionados)
              </label>

              {allStories.length === 0 ? (
                <div className={styles.noStories}>
                  Nenhum story disponível. Crie stories primeiro.
                </div>
              ) : (
                <div className={styles.storiesGrid}>
                  {allStories.map((story) => {
                    const isSelected = selectedStoryIds.includes(story.id);
                    const orderIndex = selectedStoryIds.indexOf(story.id);
                    return (
                      <div
                        key={story.id}
                        className={`${styles.storyOption} ${isSelected ? styles.selected : ""}`}
                        onClick={() => toggleStorySelection(story.id)}
                      >
                        {story.media_type === "video" ? (
                          <img
                            src={story.thumbnail || story.media_url}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.src = "/profile.jpg";
                            }}
                          />
                        ) : (
                          <img
                            src={story.media_url}
                            alt=""
                            onError={(e) => {
                              e.currentTarget.src = "/profile.jpg";
                            }}
                          />
                        )}
                        {isSelected && (
                          <>
                            <div className={styles.storyCheckmark}>
                              <Check size={12} />
                            </div>
                            <div className={styles.storyOrderBadge}>{orderIndex + 1}</div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelBtn} onClick={closeModal}>
                Cancelar
              </button>
              <button
                className={styles.saveBtn}
                onClick={handleSave}
                disabled={saving || !highlightName.trim() || selectedStoryIds.length === 0}
              >
                {saving ? (
                  <>
                    <Loader2 size={14} className={styles.spin} /> Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
