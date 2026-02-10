import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import ProfileScreen from './pages/ProfileScreen';
import PostScreen from './pages/PostScreen';
import StoryScreen from './pages/StoryScreen';
import ChatScreen from './pages/ChatScreen';
import CommentsScreen from './pages/CommentsScreen';
import AdminPanelNew from './pages/AdminPanelNew';
import AdminChat from './pages/AdminChat';
import StoriesManager from './pages/StoriesManager';
import ProfileManager from './pages/ProfileManager';
import CommentsManager from './pages/CommentsManager';
import AdminStoryAnalytics from './pages/AdminStoryAnalytics';
import SettingsManager from './pages/SettingsManager';
import NotFoundScreen from './pages/NotFoundScreen';
import AdminLogin from './pages/AdminLogin';
import BetLeads from './pages/BetLeads';
import RequireAdminAuth from './components/RequireAdminAuth';
import styles from './App.module.css';

const queryClient = new QueryClient();

import { useLocation } from 'react-router-dom';

function AppRoutes() {
  const location = useLocation();
  const state = location.state as any;
  const background = state?.background;

  return (
    <>
      <Routes location={background || location}>
        <Route path="/admin987654321/login" element={<div className="admin-fullscreen"><AdminLogin /></div>} />
        <Route
          path="/admin987654321"
          element={
            <RequireAdminAuth>
              <div className="admin-fullscreen"><AdminPanelNew /></div>
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin987654321/chat"
          element={
            <RequireAdminAuth>
              <div className="admin-fullscreen"><AdminChat /></div>
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin987654321/stories"
          element={
            <RequireAdminAuth>
              <div className="admin-fullscreen"><StoriesManager /></div>
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin987654321/profile"
          element={
            <RequireAdminAuth>
              <div className="admin-fullscreen"><ProfileManager /></div>
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin987654321/analytics"
          element={
            <RequireAdminAuth>
              <div className="admin-fullscreen"><AdminStoryAnalytics /></div>
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin987654321/comments"
          element={
            <RequireAdminAuth>
              <div className="admin-fullscreen"><CommentsManager /></div>
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin987654321/settings"
          element={
            <RequireAdminAuth>
              <div className="admin-fullscreen"><SettingsManager /></div>
            </RequireAdminAuth>
          }
        />
        <Route
          path="/admin987654321/bet-leads"
          element={
            <RequireAdminAuth>
              <div className="admin-fullscreen"><BetLeads /></div>
            </RequireAdminAuth>
          }
        />

        <Route path="/" element={<div className={styles.appContainer}><ProfileScreen /></div>} />
        <Route path="/post/:postId" element={<div className={styles.appContainer}><PostScreen /></div>} />
        <Route path="/post/:postId/comments" element={<div className={styles.appContainer}><CommentsScreen /></div>} />
        <Route path="/story" element={<div className={styles.appContainer}><StoryScreen /></div>} />
        <Route path="/chat" element={<div className={styles.appContainer}><ChatScreen /></div>} />
        <Route path="*" element={<div className={styles.appContainer}><NotFoundScreen /></div>} />
      </Routes>

      {background && (
        <Routes>
          <Route path="/story" element={<div className={styles.storyOverlay}><StoryScreen /></div>} />
        </Routes>
      )}
    </>
  );
}

function App() {


  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

