import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageCircle,
  Film,
  User,
  BarChart3,
  MessageSquare,
  Settings,
  LogOut,
  Sparkles,
  Bell,
  Search,
  ShieldCheck,
  Star
} from 'lucide-react';
import { logoutAdmin } from '@/utils/adminAuth';
import styles from './AdminLayout.module.css';

interface AdminLayoutProps {
  children: React.ReactNode;
  unreadCount?: number;
}

export default function AdminLayout({ children, unreadCount = 0 }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (confirm('Deseja realmente encerrar sua sessão administrativa?')) {
      logoutAdmin();
      navigate('/admin987654321/login');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} />, path: '/admin987654321' },
    { id: 'chat', label: 'Mensagens', icon: <MessageCircle size={20} />, path: '/admin987654321/chat', badge: unreadCount },
    { id: 'stories', label: 'Stories', icon: <Film size={20} />, path: '/admin987654321/stories' },
    { id: 'live', label: 'Live (Fake)', icon: <Film size={20} className={styles.liveIcon} />, path: '/admin987654321/live' },
    { id: 'highlights', label: 'Destaques', icon: <Star size={20} />, path: '/admin987654321/highlights' },
    { id: 'profile', label: 'Perfil', icon: <User size={20} />, path: '/admin987654321/profile' },
    { id: 'comments', label: 'Interações', icon: <MessageSquare size={20} />, path: '/admin987654321/comments' },
    { id: 'analytics', label: 'Relatórios', icon: <BarChart3 size={20} />, path: '/admin987654321/analytics' },
    { id: 'bet-leads', label: 'Leads Bet', icon: <ShieldCheck size={20} />, path: '/admin987654321/bet-leads' },
    { id: 'settings', label: 'Configurações', icon: <Settings size={20} />, path: '/admin987654321/settings' },

  ];

  return (
    <div className={styles.adminLayout}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarBrand}>
          <div className={styles.brandLogo}>
            <Sparkles className={styles.sparkleIcon} />
          </div>
          <span className={styles.brandName}>Insta<span className={styles.brandAccent}>Elite</span></span>
        </div>

        <nav className={styles.sidebarNav}>
          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Principal</span>
            {menuItems.slice(0, 1).map(item => (
              <Link 
                key={item.id}
                to={item.path} 
                className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Conteúdo</span>
            {menuItems.slice(1, 5).map(item => (
              <Link 
                key={item.id}
                to={item.path} 
                className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && item.badge > 0 ? (
                  <span className={styles.navBadge}>{item.badge}</span>
                ) : null}
              </Link>
            ))}
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Engajamento</span>
            {menuItems.slice(5, 7).map(item => (
              <Link 
                key={item.id}
                to={item.path} 
                className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          <div className={styles.navGroup}>
            <span className={styles.navGroupLabel}>Sistema</span>
            {menuItems.slice(7).map(item => (
              <Link 
                key={item.id}
                to={item.path} 
                className={`${styles.navItem} ${location.pathname === item.path ? styles.active : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <button onClick={handleLogout} className={styles.logoutBtn}>
            <LogOut size={18} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <main className={styles.mainContent}>
        <header className={styles.topBar}>
          <div className={styles.searchBar}>
            <Search size={18} className={styles.searchIcon} />
            <input type="text" placeholder="Pesquisar..." />
          </div>

          <div className={styles.topBarActions}>
            <button className={styles.iconBtn}>
              <Bell size={20} />
              {unreadCount > 0 && <span className={styles.notifictionDot} />}
            </button>
            <div className={styles.userInfo}>
              <div className={styles.userAvatar}>
                <ShieldCheck size={16} />
              </div>
              <div className={styles.userDetails}>
                <span className={styles.userName}>Dashboard Admin</span>
                <span className={styles.userRole}>Acesso Master</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.contentBody}>
          {children}
        </div>
      </main>
    </div>
  );
}
