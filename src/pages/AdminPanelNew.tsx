import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  MessageCircle,
  TrendingUp,
  Plus,
  ArrowUpRight,
  UserCheck,
  Calendar,
  Layers,
  Sparkles,
  Eye,
  Heart,
  ChevronRight,
  Activity,
  Zap
} from "lucide-react";
import { StoryService } from "@/services/storyService";
import { StoryViewTrackingService } from "@/services/storyViewTrackingService";
import { ProfileService } from "@/services/profileService";
import { AdminChatService } from "@/services/chatService";
import AdminLayout from "@/components/AdminLayout";
import styles from "./AdminPanelNew.module.css";

export default function AdminPanelNew() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalStories: 0,
    totalViews: 0,
    uniqueViews: 0,
    totalConversations: 0,
    unreadMessages: 0,
    totalFollowers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const [posts, profileData, conversations] = await Promise.all([
        ProfileService.getPosts(),
        ProfileService.getProfile(undefined, { forceRefresh: true }),
        AdminChatService.getAllConversations()
      ]);

      if (!profileData) return;

      const stories = await StoryService.getActiveStories(profileData.username);
      const storyStats = await StoryViewTrackingService.getAllStoriesStats();
      
      let totalViews = 0;
      let uniqueViews = 0;
      storyStats.forEach(stat => {
        totalViews += stat.total_views;
        uniqueViews += stat.unique_views;
      });

      const unread = conversations.filter((c: any) => c.unread_count > 0).length;

      setStats({
        totalPosts: posts.length,
        totalStories: stories.length,
        totalViews,
        uniqueViews,
        totalConversations: conversations.length,
        unreadMessages: unread,
        totalFollowers: profileData.followers_count || 0
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout unreadCount={stats.unreadMessages}>
      <div className={styles.dashboardView}>
        <div className={styles.viewHeader}>
          <div className={styles.viewHeaderInfo}>
            <h1 className={styles.viewTitle}>Dashboard Analytics</h1>
            <p className={styles.viewSubtitle}>Seu funil de leads está performando 12% melhor que ontem.</p>
          </div>
          <div className={styles.headerButtons}>
            <button className={styles.secondaryBtn} onClick={loadStats} disabled={loading}>
              <Zap size={16} />
              <span>{loading ? 'Sincronizando...' : 'Recarregar'}</span>
            </button>
            <button className={styles.primaryBtn} onClick={() => navigate('/admin987654321/stories')}>
              <Plus size={16} />
              <span>Novo Story</span>
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className={styles.kpiGrid}>
          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIcon} ${styles.blue}`}>
                <Eye size={22} />
              </div>
              <div className={styles.kpiTrend}>
                <ArrowUpRight size={14} />
                <span>12%</span>
              </div>
            </div>
            <div className={styles.kpiBody}>
              <span className={styles.kpiValue}>{stats.uniqueViews.toLocaleString()}</span>
              <span className={styles.kpiLabel}>Visitantes Únicos</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIcon} ${styles.purple}`}>
                <MessageCircle size={22} />
              </div>
              <div className={styles.kpiTrend}>
                <ArrowUpRight size={14} />
                <span>5%</span>
              </div>
            </div>
            <div className={styles.kpiBody}>
              <span className={styles.kpiValue}>{stats.totalConversations.toLocaleString()}</span>
              <span className={styles.kpiLabel}>Novos Leads</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIcon} ${styles.rose}`}>
                <Heart size={22} />
              </div>
              <div className={styles.kpiTrend}>
                <ArrowUpRight size={14} />
                <span>8%</span>
              </div>
            </div>
            <div className={styles.kpiBody}>
              <span className={styles.kpiValue}>{stats.totalFollowers.toLocaleString()}</span>
              <span className={styles.kpiLabel}>Seguidores</span>
            </div>
          </div>

          <div className={styles.kpiCard}>
            <div className={styles.kpiHeader}>
              <div className={`${styles.kpiIcon} ${styles.emerald}`}>
                <TrendingUp size={22} />
              </div>
              <div className={styles.kpiTrend}>
                <ArrowUpRight size={14} />
                <span>15%</span>
              </div>
            </div>
            <div className={styles.kpiBody}>
              <span className={styles.kpiValue}>{stats.totalViews.toLocaleString()}</span>
              <span className={styles.kpiLabel}>Cliques Totais</span>
            </div>
          </div>
        </div>

        {/* Bento Grid Features */}
        <div className={styles.bentoGrid}>
          <div className={`${styles.bentoItem} ${styles.large}`}>
            <div className={styles.bentoHeader}>
              <Activity size={18} />
              <span>Tráfego em Tempo Real</span>
            </div>
            <div className={styles.activityList}>
              {[1, 2, 3, 4, 5].map(idx => (
                <div key={idx} className={styles.activityItem}>
                  <div className={styles.activityIcon}>
                    <UserCheck size={16} />
                  </div>
                  <div className={styles.activityContent}>
                    <p className={styles.activityText}>
                      <strong>Visitante de {['São Paulo', 'Lisboa', 'New York', 'Rio'][idx % 4]}</strong> visualizou seus stories agora.
                    </p>
                    <span className={styles.activityTime}>{idx * 2} min atrás</span>
                  </div>
                  <ChevronRight size={16} className={styles.activityArrow} />
                </div>
              ))}
            </div>
          </div>

          <div className={`${styles.bentoItem} ${styles.medium}`}>
            <div className={styles.bentoHeader}>
              <Layers size={18} />
              <span>Inventário de Mídia</span>
            </div>
            <div className={styles.statusGrid}>
              <div className={styles.statusBox}>
                <span className={styles.statusNumber}>{stats.totalPosts}</span>
                <span className={styles.statusLabel}>Posts</span>
              </div>
              <div className={styles.statusBox}>
                <span className={styles.statusNumber}>{stats.totalStories}</span>
                <span className={styles.statusLabel}>Stories</span>
              </div>
            </div>
            <div className={styles.calendarMini}>
              <Calendar size={14} />
              <span>Próximo backup: Hoje, 23:59</span>
            </div>
          </div>

          <div className={`${styles.bentoItem} ${styles.small} ${styles.accent}`}>
            <div className={styles.bentoContent}>
              <Sparkles size={32} />
              <h3>Premium Upgrade</h3>
              <p>Desbloqueie ferramentas avançadas de rastreamento de cliques.</p>
              <button className={styles.accentBtn}>Saiba Mais</button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
