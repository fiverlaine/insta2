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
  Eye,
  TrendingUp,
  LogOut,
  Settings,
  Mail
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
    logoutAdmin();
    navigate('/admin987654321/login');
  };

  const statCards: StatCard[] = [
    {
      title: 'Total de Posts',
      value: stats.totalPosts,
      icon: <LayoutDashboard size={24} />,
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      change: undefined
    },
    {
      title: 'Stories Ativos',
      value: stats.totalStories,
      icon: <Film size={24} />,
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      change: undefined
    },
    {
      title: 'Views Únicos',
      value: stats.uniqueViews,
      icon: <Eye size={24} />,
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      change: '+12%'
    },
    {
      title: 'Total de Views',
      value: stats.totalViews,
      icon: <TrendingUp size={24} />,
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
      change: '+8%'
    },
    {
      title: 'Conversas',
      value: stats.totalConversations,
      icon: <Users size={24} />,
      gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      change: undefined
    },
    {
      title: 'Não Lidas',
      value: stats.unreadMessages,
      icon: <Mail size={24} />,
      gradient: 'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)',
      change: undefined
    }
  ];

  const managementSections = [
    {
      title: 'Conteúdo',
      description: 'Gerencie posts, stories e mídias',
      items: [
        {
          title: 'Gerenciar Perfil',
          description: 'Editar informações do perfil',
          icon: <User size={20} />,
          gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          path: '/admin987654321/profile',
          badge: 0
        },
        {
          title: 'Gerenciar Stories',
          description: 'Adicionar, editar e remover stories',
          icon: <Film size={20} />,
          gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
          path: '/admin987654321/stories',
          badge: 0
        },
        {
          title: 'Gerenciar Comentários',
          description: 'Criar e moderar comentários',
          icon: <MessageSquare size={20} />,
          gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
          path: '/admin987654321/comments',
          badge: 0
        }
      ]
    },
    {
      title: 'Analytics',
      description: 'Visualize métricas e estatísticas',
      items: [
        {
          title: 'Analytics de Stories',
          description: 'Visualizações, países, dispositivos',
          icon: <BarChart3 size={20} />,
          gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
          path: '/admin987654321/analytics',
          badge: 0
        }
      ]
    },
    {
      title: 'Comunicação',
      description: 'Interaja com visitantes',
      items: [
        {
          title: 'Chat com Visitantes',
          description: 'Responda mensagens em tempo real',
          icon: <MessageCircle size={20} />,
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
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <div className={styles.headerLeft}>
            <div className={styles.logoContainer}>
              <LayoutDashboard size={32} className={styles.logoIcon} />
            </div>
            <div>
              <h1 className={styles.title}>Painel de Administração</h1>
              <p className={styles.subtitle}>Bem-vindo, Admin</p>
            </div>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.settingsButton} title="Configurações">
              <Settings size={20} />
            </button>
            <button 
              className={styles.logoutButton}
              onClick={handleLogout}
              title="Sair"
            >
              <LogOut size={20} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className={styles.content}>
        {/* Stats Grid */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Visão Geral</h2>
            <p className={styles.sectionSubtitle}>Estatísticas em tempo real</p>
          </div>
          
          <div className={styles.statsGrid}>
            {statCards.map((stat, index) => (
              <div key={index} className={styles.statCard}>
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
                      {loading ? '...' : stat.value}
                    </h3>
                    {stat.change && (
                      <span className={styles.statChange}>{stat.change}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Management Sections */}
        {managementSections.map((section, sectionIndex) => (
          <section key={sectionIndex} className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{section.title}</h2>
              <p className={styles.sectionSubtitle}>{section.description}</p>
            </div>
            
            <div className={styles.cardsGrid}>
              {section.items.map((item, itemIndex) => (
                <button
                  key={itemIndex}
                  className={styles.managementCard}
                  onClick={() => navigate(item.path)}
                >
                  <div 
                    className={styles.cardIconContainer}
                    style={{ background: item.gradient }}
                  >
                    {item.icon}
                  </div>
                  <div className={styles.cardContent}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <p className={styles.cardDescription}>{item.description}</p>
                  </div>
                  {item.badge && item.badge > 0 && (
                    <div className={styles.cardBadge}>{item.badge}</div>
                  )}
                  <div className={styles.cardArrow}>→</div>
                </button>
              ))}
            </div>
          </section>
        ))}

        {/* Quick Actions */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Ações Rápidas</h2>
            <p className={styles.sectionSubtitle}>Acesso rápido às funções mais usadas</p>
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
        <div className={styles.footer}>
          <p className={styles.footerText}>
            Instagram Profissional © 2025 · Painel Admin v2.0
          </p>
        </div>
      </div>
    </div>
  );
}

