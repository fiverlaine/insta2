import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Eye, Users, MapPin, Monitor, Globe, 
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
import styles from './AdminStoryAnalytics.module.css';

export default function AdminStoryAnalytics() {
  const navigate = useNavigate();
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
      if (!profileData) {
        console.error('Perfil não encontrado');
        return;
      }
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
      setRecentViews(viewsData.slice(0, 20)); // Top 20 mais recentes
    } catch (error) {
      console.error('Erro ao carregar analytics:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatNumber = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '0';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '0';
    return numeric.toLocaleString('pt-BR');
  };

  const formatWatchTime = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '--';
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return '0s';

    if (numeric < 1000) {
      return `${Math.round(numeric)}ms`;
    }

    if (numeric < 60000) {
      const seconds = numeric / 1000;
      return `${seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1)}s`;
    }

    const minutes = Math.floor(numeric / 60000);
    const seconds = Math.round((numeric % 60000) / 1000)
      .toString()
      .padStart(2, '0');
    return `${minutes}m ${seconds}s`;
  };

  const formatPercentageValue = (value: number | string | null | undefined) => {
    if (value === null || value === undefined) return '--';
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return '--';
    return `${numeric.toFixed(1)}%`;
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone size={16} />;
      case 'tablet':
        return <Tablet size={16} />;
      case 'desktop':
        return <Laptop size={16} />;
      default:
        return <Monitor size={16} />;
    }
  };

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#fee140', '#30cfd0'];

  const avgWatchTimeMs =
    stats?.avg_watch_time_ms !== null && stats?.avg_watch_time_ms !== undefined
      ? Number(stats.avg_watch_time_ms)
      : undefined;
  const avgViewedPercentage =
    stats?.avg_viewed_percentage !== null && stats?.avg_viewed_percentage !== undefined
      ? Number(stats.avg_viewed_percentage)
      : undefined;
  const completionRate =
    stats?.completion_rate_percentage !== null && stats?.completion_rate_percentage !== undefined
      ? Number(stats.completion_rate_percentage)
      : undefined;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner} />
          <span>Carregando analytics...</span>
        </div>
      </div>
    );
  }

  if (stories.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <button className={styles.backButton} onClick={() => navigate('/admin987654321')}>
            <ArrowLeft size={24} />
          </button>
          <h1 className={styles.title}>Analytics de Stories</h1>
        </div>
        <div className={styles.emptyState}>
          <Eye size={64} color="#6e6e6e" />
          <span>Nenhum story encontrado</span>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate('/admin987654321')}>
          <ArrowLeft size={24} />
        </button>
        <h1 className={styles.title}>Analytics de Stories</h1>
      </div>

      <div className={styles.content}>
        {/* Story Selector */}
        <div className={styles.storySelector}>
          <h2 className={styles.sectionTitle}>Selecione um Story</h2>
          <div className={styles.storiesGrid}>
            {stories.map((story) => (
              <button
                key={story.id}
                className={`${styles.storyCard} ${selectedStory?.id === story.id ? styles.storyCardActive : ''}`}
                onClick={() => setSelectedStory(story)}
              >
                <div className={styles.storyPreview}>
                  {story.media_type === 'image' ? (
                    <img src={story.media_url} alt="Story" />
                  ) : (
                    <video src={story.media_url} />
                  )}
                  {!story.is_active && (
                    <div className={styles.inactiveBadge}>Inativo</div>
                  )}
                </div>
                <div className={styles.storyCardInfo}>
                  <span className={styles.storyIndex}>#{story.order_index + 1}</span>
                  <span className={styles.storyDate}>
                    {new Date(story.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Analytics Dashboard */}
        {selectedStory && (
          <>
            {/* Stats Cards */}
            <div className={styles.statsGrid}>
              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <Eye size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Visualizações Totais</span>
                  <span className={styles.statValue}>{formatNumber(stats?.total_views)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                  <Sparkles size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Visualizações Únicas</span>
                  <span className={styles.statValue}>{formatNumber(stats?.unique_views)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                  <Users size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Visitantes Únicos</span>
                  <span className={styles.statValue}>{formatNumber(stats?.unique_visitors)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
                  <Clock size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Visualizações (24h)</span>
                  <span className={styles.statValue}>{formatNumber(stats?.views_last_24h)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                  <Activity size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Visualizações Concluídas</span>
                  <span className={styles.statValue}>{formatNumber(stats?.completed_views)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  <TrendingUp size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Taxa de Conclusão</span>
                  <span className={styles.statValue}>{formatPercentageValue(completionRate)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #7F53AC 0%, #647DEE 100%)' }}>
                  <Timer size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Tempo Médio Assistido</span>
                  <span className={styles.statValue}>{formatWatchTime(avgWatchTimeMs)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #F7971E 0%, #FFD200 100%)' }}>
                  <Percent size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Percentual Médio Assistido</span>
                  <span className={styles.statValue}>{formatPercentageValue(avgViewedPercentage)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                  <Globe size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Países</span>
                  <span className={styles.statValue}>{formatNumber(stats?.countries_count)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                  <Monitor size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Tipos de Dispositivos</span>
                  <span className={styles.statValue}>{formatNumber(stats?.device_types_count)}</span>
                </div>
              </div>

              <div className={styles.statCard}>
                <div className={styles.statIcon} style={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)' }}>
                  <History size={24} />
                </div>
                <div className={styles.statInfo}>
                  <span className={styles.statLabel}>Última Visualização</span>
                  <span className={styles.statValue} style={{ fontSize: '12px' }}>
                    {stats?.last_viewed_at ? formatDate(stats.last_viewed_at) : 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className={styles.chartsGrid}>
              {/* Gráfico de Países */}
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>
                  <Globe size={20} />
                  Visualizações por País
                </h3>
                {viewsByCountry.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={viewsByCountry.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                      <XAxis dataKey="country" stroke="#a8a8a8" />
                      <YAxis stroke="#a8a8a8" />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: '8px' }}
                        labelStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count" fill="#667eea" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.noData}>Nenhum dado disponível</div>
                )}
              </div>

              {/* Gráfico de Dispositivos */}
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>
                  <Monitor size={20} />
                  Dispositivos
                </h3>
                {viewsByDevice.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={viewsByDevice as any}
                        dataKey="count"
                        nameKey="device_type"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(item: any) => `${item.device_type}: ${item.count}`}
                      >
                        {viewsByDevice.map((_item, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: '8px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={styles.noData}>Nenhum dado disponível</div>
                )}
              </div>
            </div>

            {/* Top Cidades */}
            <div className={styles.tableCard}>
              <h3 className={styles.chartTitle}>
                <MapPin size={20} />
                Top 10 Cidades
              </h3>
              {viewsByCity.length > 0 ? (
                <div className={styles.table}>
                  <div className={styles.tableHeader}>
                    <span>Cidade</span>
                    <span>País</span>
                    <span>Visualizações</span>
                  </div>
                  {viewsByCity.slice(0, 10).map((city, index) => (
                    <div key={index} className={styles.tableRow}>
                      <span>{city.city}</span>
                      <span>{city.country}</span>
                      <span className={styles.badge}>{city.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noData}>Nenhum dado disponível</div>
              )}
            </div>

            {/* Visualizações Recentes */}
            <div className={styles.tableCard}>
              <h3 className={styles.chartTitle}>
                <Clock size={20} />
                Visualizações Recentes (Top 20)
              </h3>
              {recentViews.length > 0 ? (
                <div className={styles.viewsList}>
                  {recentViews.map((view) => (
                    <div key={view.id} className={styles.viewItem}>
                      <button
                        className={styles.viewHeader}
                        onClick={() => setExpandedStory(expandedStory === view.id ? null : view.id)}
                      >
                        <div className={styles.viewMainInfo}>
                          <div className={styles.viewLocation}>
                            <MapPin size={16} />
                            <span>{view.city || 'Desconhecida'}, {view.country || 'N/A'}</span>
                          </div>
                          <div className={styles.viewDevice}>
                            {getDeviceIcon(view.device_type || 'unknown')}
                            <span>{view.device_type || 'Unknown'}</span>
                          </div>
                          <div className={styles.viewMetric}>
                            <Timer size={14} />
                            <span>{formatWatchTime(view.watch_time_ms)}</span>
                          </div>
                          <div className={`${styles.viewStatus} ${view.completed ? styles.viewStatusCompleted : styles.viewStatusPartial}`}>
                            {view.completed ? 'Completou' : `${formatPercentageValue(view.viewed_percentage)} assistido`}
                          </div>
                          <div className={styles.viewTime}>
                            <Clock size={14} />
                            <span>{formatDate(view.last_viewed_at || view.viewed_at)}</span>
                          </div>
                        </div>
                        {expandedStory === view.id ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                      </button>
                      
                      {expandedStory === view.id && (
                        <div className={styles.viewDetails}>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>IP:</span>
                            <span className={styles.detailValue}>{view.ip_address || 'N/A'}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>ISP:</span>
                            <span className={styles.detailValue}>{view.isp || 'N/A'}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Sessões:</span>
                            <span className={styles.detailValue}>{view.session_count}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Tempo Assistido:</span>
                            <span className={styles.detailValue}>{formatWatchTime(view.watch_time_ms)}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Primeira Visualização:</span>
                            <span className={styles.detailValue}>{formatDate(view.first_viewed_at || view.viewed_at)}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Última Visualização:</span>
                            <span className={styles.detailValue}>{formatDate(view.last_viewed_at || view.viewed_at)}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Progresso:</span>
                            <span className={styles.detailValue}>{formatPercentageValue(view.viewed_percentage)}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Completou?</span>
                            <span className={styles.detailValue}>{view.completed ? 'Sim' : 'Não'}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Região:</span>
                            <span className={styles.detailValue}>{view.region || 'N/A'}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Coordenadas:</span>
                            <span className={styles.detailValue}>
                              {view.latitude && view.longitude 
                                ? `${view.latitude.toFixed(4)}, ${view.longitude.toFixed(4)}`
                                : 'N/A'}
                            </span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Dispositivo:</span>
                            <span className={styles.detailValue}>{view.device_vendor || 'N/A'} {view.device_model || ''}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Browser:</span>
                            <span className={styles.detailValue}>{view.browser || 'N/A'} {view.browser_version || ''}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>OS:</span>
                            <span className={styles.detailValue}>{view.os || 'N/A'} {view.os_version || ''}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Resolução:</span>
                            <span className={styles.detailValue}>{view.screen_resolution || 'N/A'}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Timezone:</span>
                            <span className={styles.detailValue}>{view.timezone || 'N/A'}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Idioma:</span>
                            <span className={styles.detailValue}>{view.language || 'N/A'}</span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>Fingerprint:</span>
                            <span className={styles.detailValue} style={{ fontSize: '11px', fontFamily: 'monospace' }}>
                              {view.fingerprint}
                            </span>
                          </div>
                          <div className={styles.detailRow}>
                            <span className={styles.detailLabel}>User Agent:</span>
                            <span className={styles.detailValue} style={{ fontSize: '11px', wordBreak: 'break-all' }}>
                              {view.user_agent || 'N/A'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.noData}>Nenhuma visualização registrada</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

