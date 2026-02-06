import { useState, useEffect } from 'react';
import { 
  Eye, Users, MapPin, Monitor, Globe, 
  Clock, ChevronDown, ChevronUp, Smartphone,
  Tablet, Laptop, Activity, TrendingUp, Timer, Percent, Sparkles, History
} from 'lucide-react';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { StoryService, type Story } from '@/services/storyService';
import { ProfileService } from '@/services/profileService';
import { 
  StoryViewTrackingService, 
  type StoryViewStats,
  type ViewsByCountry,
  type ViewsByDevice,
  type ViewsByCity,
  type StoryView
} from '@/services/storyViewTrackingService';
import AdminLayout from '@/components/AdminLayout';
import styles from './AdminStoryAnalytics.module.css';

export default function AdminStoryAnalytics() {
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [stats, setStats] = useState<StoryViewStats | null>(null);
  const [viewsByCountry, setViewsByCountry] = useState<ViewsByCountry[]>([]);
  const [viewsByDevice, setViewsByDevice] = useState<ViewsByDevice[]>([]);
  const [viewsByCity, setViewsByCity] = useState<ViewsByCity[]>([]);
  const [recentViews, setRecentViews] = useState<StoryView[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStory, setExpandedStory] = useState<string | null>(null);

  useEffect(() => {
    loadStories();
  }, []);

  useEffect(() => {
    if (selectedStory) {
      loadStoryAnalytics(selectedStory.id);
    }
  }, [selectedStory]);

  const loadStories = async () => {
    try {
      setLoading(true);
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (!profileData) return;
      const storiesData = await StoryService.getAllStories(profileData.username);
      setStories(storiesData);
      
      if (storiesData.length > 0 && !selectedStory) {
        setSelectedStory(storiesData[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar stories:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStoryAnalytics = async (storyId: string) => {
    try {
      const [statsData, countryData, deviceData, cityData, viewsData] = await Promise.all([
        StoryViewTrackingService.getStoryStats(storyId),
        StoryViewTrackingService.getViewsByCountry(storyId),
        StoryViewTrackingService.getViewsByDevice(storyId),
        StoryViewTrackingService.getViewsByCity(storyId),
        StoryViewTrackingService.getStoryViews(storyId)
      ]);

      setStats(statsData);
      setViewsByCountry(countryData);
      setViewsByDevice(deviceData);
      setViewsByCity(cityData);
      setRecentViews(viewsData.slice(0, 20));
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const formatNumber = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '0';
    return Number(value).toLocaleString('pt-BR');
  };

  const formatWatchTime = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '--';
    const numeric = Number(value);
    if (numeric < 1000) return `${Math.round(numeric)}ms`;
    if (numeric < 60000) return `${(numeric / 1000).toFixed(1)}s`;
    return `${Math.floor(numeric / 60000)}m ${Math.round((numeric % 60000) / 1000)}s`;
  };

  const formatPercentageValue = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '--';
    return `${Number(value).toFixed(1)}%`;
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile': return <Smartphone size={16} />;
      case 'tablet': return <Tablet size={16} />;
      case 'desktop': return <Laptop size={16} />;
      default: return <Monitor size={16} />;
    }
  };

  const COLORS = ['#6366f1', '#a855f7', '#f43f5e', '#10b981', '#fbbf24', '#3b82f6'];

  return (
    <AdminLayout>
      <div className={styles.analyticsLayout}>
        <div className={styles.viewHeader}>
          <div>
            <h1 className={styles.viewTitle}>Analytics de Stories</h1>
            <p className={styles.viewSubtitle}>Análise detalhada de comportamento e retenção.</p>
          </div>
        </div>

        {loading ? (
          <div className={styles.loading}>Sincronizando dados...</div>
        ) : stories.length === 0 ? (
          <div className={styles.empty}>Nenhum story para analisar.</div>
        ) : (
          <>
            <section className={styles.storyRail}>
              <h3 className={styles.sectionTitle}>Selecionar Story</h3>
              <div className={styles.railInner}>
                {stories.map((story) => (
                  <button
                    key={story.id}
                    className={`${styles.storyThumb} ${selectedStory?.id === story.id ? styles.active : ''}`}
                    onClick={() => setSelectedStory(story)}
                  >
                    <div className={styles.thumbMedia}>
                      {story.media_type === 'image' ? <img src={story.media_url} alt="" /> : <video src={story.media_url} />}
                    </div>
                    <span>{new Date(story.created_at).toLocaleDateString()}</span>
                  </button>
                ))}
              </div>
            </section>

            {selectedStory && (
              <div className={styles.dashboard}>
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <Eye size={20} className={styles.icon} />
                    <span className={styles.label}>Views Totais</span>
                    <span className={styles.value}>{formatNumber(stats?.total_views)}</span>
                  </div>
                  <div className={styles.statCard}>
                    <Users size={20} className={styles.icon} />
                    <span className={styles.label}>Leads Únicos</span>
                    <span className={styles.value}>{formatNumber(stats?.unique_visitors)}</span>
                  </div>
                  <div className={styles.statCard}>
                    <Timer size={20} className={styles.icon} />
                    <span className={styles.label}>Retenção Média</span>
                    <span className={styles.value}>{formatPercentageValue(stats?.avg_viewed_percentage)}</span>
                  </div>
                  <div className={styles.statCard}>
                    <Activity size={20} className={styles.icon} />
                    <span className={styles.label}>Taxa de Conclusão</span>
                    <span className={styles.value}>{formatPercentageValue(stats?.completion_rate_percentage)}</span>
                  </div>
                </div>

                <div className={styles.chartsRow}>
                  <div className={styles.chartCard}>
                    <h4 className={styles.chartTitle}>Visualizações por País</h4>
                    <ResponsiveContainer width="100%" height={240}>
                      <BarChart data={viewsByCountry}>
                        <XAxis dataKey="country" stroke="rgba(255,255,255,0.3)" fontSize={12} />
                        <YAxis stroke="rgba(255,255,255,0.3)" fontSize={12} />
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', borderRadius: '8px' }} />
                        <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className={styles.chartCard}>
                    <h4 className={styles.chartTitle}>Distribuição por Dispositivo</h4>
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie data={viewsByDevice} dataKey="count" nameKey="device_type" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5}>
                          {viewsByDevice.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#1a1a1a', border: 'none', borderRadius: '8px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={styles.tableSection}>
                  <h4 className={styles.sectionTitle}>Visualizações Recentes</h4>
                  <div className={styles.viewsList}>
                    {recentViews.map((view) => (
                      <div key={view.id} className={styles.viewRow}>
                        <div className={styles.viewMain}>
                          <MapPin size={14} />
                          <span>{view.city || 'Desconhecida'}, {view.country}</span>
                          <span className={styles.sep}>•</span>
                          {getDeviceIcon(view.device_type || '')}
                          <span>{view.device_type}</span>
                          <span className={styles.sep}>•</span>
                          <span className={view.completed ? styles.tagOk : styles.tagWarn}>
                            {view.completed ? 'Concluído' : `${formatPercentageValue(view.viewed_percentage)}`}
                          </span>
                        </div>
                        <button className={styles.detailsBtn} onClick={() => setExpandedStory(expandedStory === view.id ? null : view.id)}>
                          {expandedStory === view.id ? 'Fechar' : 'Detalhes'}
                        </button>
                        {expandedStory === view.id && (
                          <div className={styles.expandedDetails}>
                            <p><strong>IP:</strong> {view.ip_address}</p>
                            <p><strong>Provedor:</strong> {view.isp}</p>
                            <p><strong>OS:</strong> {view.os} {view.os_version}</p>
                            <p><strong>Fingerprint:</strong> <code>{view.fingerprint}</code></p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
