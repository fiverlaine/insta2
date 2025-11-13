import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  MessageCircle, 
  Film, 
  User, 
  BarChart3, 
  MessageSquare,
  Users,
  TrendingUp,
  LogOut,
  Settings,
  Mail,
  Sparkles,
  Activity,
  Clock,
  ArrowRight,
  Zap
} from "lucide-react";
import { logoutAdmin } from "@/utils/adminAuth";
import { StoryService } from "@/services/storyService";
import { StoryViewTrackingService } from "@/services/storyViewTrackingService";
import { ProfileService } from "@/services/profileService";
import { AdminChatService } from "@/services/chatService";
import styles from "./AdminPanelNew.module.css";

interface StatCard {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  gradient: string;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
}

export default function AdminPanelNew() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalPosts: 0,
    totalStories: 0,
    totalViews: 0,
    uniqueViews: 0,
    totalConversations: 0,
    unreadMessages: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Atualizar stats a cada 30 segundos
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);

      // Posts
      const posts = await ProfileService.getPosts();
      
      // Stories - buscar perfil primeiro
      const profileData = await ProfileService.getProfile(undefined, { forceRefresh: true });
      if (!profileData) {
        console.error('Perfil não encontrado');
        return;
      }
      const stories = await StoryService.getActiveStories(profileData.username);
      
      // Story Views
      const storyStats = await StoryViewTrackingService.getAllStoriesStats();
      let totalViews = 0;
      let uniqueViews = 0;
      storyStats.forEach(stat => {
        totalViews += stat.total_views;
        uniqueViews += stat.unique_views;
      });

      // Conversas
      const conversations = await AdminChatService.getAllConversations();
      const unread = conversations.filter((c: any) => c.unread_count > 0).length;

      setStats({
        totalPosts: posts.length,
        totalStories: stories.length,
        totalViews,
        uniqueViews,
        totalConversations: conversations.length,
        unreadMessages: unread
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    if (confirm('Tem certeza que deseja sair?')) {
      logoutAdmin();
      navigate('/admin987654321/login');
    }
  };

  const statCards: StatCard[] = [
    {
      title: 'Total de Posts',
      value: stats.totalPosts,
      icon: <LayoutDashboard size={24} />,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      trend: 'neutral'
    },
    {
      title: 'Stories Ativos',
      value: stats.totalStories,
      icon: <Film size={24} />,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      trend: 'neutral'
    },
    {
      title: 'Views Únicos',
      value: stats.uniqueViews,
      icon: <Sparkles size={24} />,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      trend: 'up'
    },
    {
      title: 'Total de Views',
      value: stats.totalViews,
      icon: <TrendingUp size={24} />,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      trend: 'up'
    },
    {
      title: 'Conversas',
      value: stats.totalConversations,
      icon: <Users size={24} />,
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      trend: 'neutral'
    },
    {
      title: 'Mensagens Não Lidas',
      value: stats.unreadMessages,
      icon: <Mail size={24} />,
      gradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
      trend: stats.unreadMessages > 0 ? 'up' : 'neutral'
    }
  ];

  const managementSections = [
    {
      title: 'Conteúdo',
      description: 'Gerencie posts, stories e mídias',
      items: [
        {
          title: 'Gerenciar Perfil',
          description: 'Editar informações do perfil, avatar e bio',
          icon: <User size={22} />,
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          path: '/admin987654321/profile',
          badge: 0
        },
        {
          title: 'Gerenciar Stories',
          description: 'Adicionar, editar e remover stories',
          icon: <Film size={22} />,
          gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          path: '/admin987654321/stories',
          badge: 0
        },
        {
          title: 'Gerenciar Comentários',
          description: 'Criar e moderar comentários dos posts',
          icon: <MessageSquare size={22} />,
          gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          path: '/admin987654321/comments',
          badge: 0
        }
      ]
    },
    {
      title: 'Analytics',
      description: 'Visualize métricas e estatísticas detalhadas',
      items: [
        {
          title: 'Analytics de Stories',
          description: 'Visualizações, países, dispositivos e muito mais',
          icon: <BarChart3 size={22} />,
          gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          path: '/admin987654321/analytics',
          badge: 0
        }
      ]
    },
    {
      title: 'Comunicação',
      description: 'Interaja com visitantes em tempo real',
      items: [
        {
          title: 'Chat com Visitantes',
          description: 'Responda mensagens e interaja com leads',
          icon: <MessageCircle size={22} />,
          gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
          path: '/admin987654321/chat',
          badge: stats.unreadMessages > 0 ? stats.unreadMessages : 0
        }
      ]
    }
  ];

  return (
    <div className={styles.container}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.logoContainer}>
              <LayoutDashboard size={28} className={styles.logoIcon} />
            </div>
            <div className={styles.headerText}>
              <h1 className={styles.title}>Painel de Administração</h1>
              <p className={styles.subtitle}>Gerenciamento completo da plataforma</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.settingsButton} 
              title="Configurações"
              onClick={() => alert('Configurações em breve')}
            >
              <Settings size={20} />
            </button>
            <button 
              className={styles.logoutButton}
              onClick={handleLogout}
              title="Sair do painel"
            >
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={styles.content}>
        {/* Welcome Section */}
        <section className={styles.welcomeSection}>
          <div className={styles.welcomeContent}>
            <div className={styles.welcomeText}>
              <h2 className={styles.welcomeTitle}>
                Bem-vindo ao Painel Admin
              </h2>
              <p className={styles.welcomeDescription}>
                Gerencie seu conteúdo, visualize analytics e interaja com seus visitantes de forma eficiente.
              </p>
            </div>
            <div className={styles.welcomeStats}>
              <div className={styles.welcomeStat}>
                <Activity size={20} />
                <div>
                  <span className={styles.welcomeStatValue}>{stats.totalViews}</span>
                  <span className={styles.welcomeStatLabel}>Views Totais</span>
                </div>
              </div>
              <div className={styles.welcomeStat}>
                <Users size={20} />
                <div>
                  <span className={styles.welcomeStatValue}>{stats.totalConversations}</span>
                  <span className={styles.welcomeStatLabel}>Conversas</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Grid */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Visão Geral</h2>
              <p className={styles.sectionSubtitle}>Estatísticas em tempo real do seu conteúdo</p>
            </div>
            <button 
              className={styles.refreshButton}
              onClick={loadStats}
              disabled={loading}
              title="Atualizar estatísticas"
            >
              <Zap size={16} />
              <span>Atualizar</span>
            </button>
          </div>
          
          <div className={styles.statsGrid}>
            {statCards.map((stat, index) => (
              <div 
                key={index} 
                className={styles.statCard}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div 
                  className={styles.statIconContainer}
                  style={{ background: stat.gradient }}
                >
                  {stat.icon}
                </div>
                <div className={styles.statContent}>
                  <p className={styles.statTitle}>{stat.title}</p>
                  <div className={styles.statValueRow}>
                    <h3 className={styles.statValue}>
                      {loading ? (
                        <span className={styles.loadingDots}>...</span>
                      ) : (
                        typeof stat.value === 'number' 
                          ? stat.value.toLocaleString('pt-BR')
                          : stat.value
                      )}
                    </h3>
                    {stat.trend && stat.trend !== 'neutral' && (
                      <span className={`${styles.statTrend} ${styles[`statTrend${stat.trend === 'up' ? 'Up' : 'Down'}`]}`}>
                        {stat.trend === 'up' ? '↑' : '↓'}
                      </span>
                    )}
                  </div>
                </div>
                <div className={styles.statGlow} style={{ background: stat.gradient }} />
              </div>
            ))}
          </div>
        </section>

        {/* Management Sections */}
        {managementSections.map((section, sectionIndex) => (
          <section key={sectionIndex} className={styles.section}>
            <div className={styles.sectionHeader}>
              <div>
                <h2 className={styles.sectionTitle}>{section.title}</h2>
                <p className={styles.sectionSubtitle}>{section.description}</p>
              </div>
            </div>
            
            <div className={styles.cardsGrid}>
              {section.items.map((item, itemIndex) => (
                <button
                  key={itemIndex}
                  className={styles.managementCard}
                  onClick={() => navigate(item.path)}
                >
                  <div className={styles.cardGradient} style={{ background: item.gradient }} />
                  <div 
                    className={styles.cardIconContainer}
                    style={{ background: item.gradient }}
                  >
                    {item.icon}
                  </div>
                  <div className={styles.cardContent}>
                    <div className={styles.cardHeader}>
                      <h3 className={styles.cardTitle}>{item.title}</h3>
                      {item.badge && item.badge > 0 && (
                        <div className={styles.cardBadge}>{item.badge}</div>
                      )}
                    </div>
                    <p className={styles.cardDescription}>{item.description}</p>
                  </div>
                  <div className={styles.cardArrow}>
                    <ArrowRight size={20} />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* Quick Actions */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h2 className={styles.sectionTitle}>Ações Rápidas</h2>
              <p className={styles.sectionSubtitle}>Acesso rápido às funções mais usadas</p>
            </div>
          </div>
          
          <div className={styles.quickActionsGrid}>
            <button 
              className={styles.quickActionCard}
              onClick={() => navigate('/admin987654321/stories')}
            >
              <div className={styles.quickActionIcon} style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' }}>
                <Film size={24} />
              </div>
              <span className={styles.quickActionText}>Adicionar Story</span>
            </button>
            
            <button 
              className={styles.quickActionCard}
              onClick={() => navigate('/admin987654321/comments')}
            >
              <div className={styles.quickActionIcon} style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)' }}>
                <MessageSquare size={24} />
              </div>
              <span className={styles.quickActionText}>Novo Comentário</span>
            </button>
            
            <button 
              className={styles.quickActionCard}
              onClick={() => navigate('/admin987654321/analytics')}
            >
              <div className={styles.quickActionIcon} style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' }}>
                <BarChart3 size={24} />
              </div>
              <span className={styles.quickActionText}>Ver Analytics</span>
            </button>
            
            <button 
              className={styles.quickActionCard}
              onClick={() => navigate('/admin987654321/chat')}
            >
              <div className={styles.quickActionIcon} style={{ background: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)' }}>
                <MessageCircle size={24} />
              </div>
              <span className={styles.quickActionText}>Abrir Chat</span>
              {stats.unreadMessages > 0 && (
                <div className={styles.quickActionBadge}>{stats.unreadMessages}</div>
              )}
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className={styles.footer}>
          <p className={styles.footerText}>
            © 2025 Instagram Profissional · Painel Admin v3.0 · Desenvolvido com ❤️
          </p>
          <div className={styles.footerLinks}>
            <Clock size={14} />
            <span>Última atualização: {new Date().toLocaleTimeString('pt-BR')}</span>
          </div>
        </footer>
      </main>
    </div>
  );
}
