import React, { useState, useEffect, useCallback } from 'react';
import { 
  PublicWebApp, 
  AdminWebApp, 
  DashboardStats, 
  ServerCategory,
  AuthResponse,
  SiteSettings,
  Achievement,
  AchievementMessage,
  AdminUser,
} from './types.ts';
import { 
  fetchPublicWebApps, 
  fetchAdminStats, 
  fetchAdminWebApps, 
  createAdminWebApp, 
  updateAdminWebApp, 
  deleteAdminWebApp,
  updateServerStatus,
  fetchSiteSettings,
  fetchAdminSettings,
  saveAdminSettings,
  getAuthToken,
  getStoredUser,
  setAuthSession,
  checkAuthMe,
  fetchPublicAchievements,
  fetchPublicAchievementMessage,
  saveAdminAchievementMessage,
  toggleAchievementPin,
  createAchievement,
  updateAchievement,
  deleteAchievement
} from './lib/api.ts';
import { WebAppCard } from './components/WebAppCard.tsx';
import { ServerModal } from './components/ServerModal.tsx';
import { LoginForm } from './components/LoginForm.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AddWebAppModal } from './components/AddWebAppModal.tsx';
import { EditWebAppModal } from './components/EditWebAppModal.tsx';
import { ConfirmDialog } from './components/ConfirmDialog.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { NavigationDrawer } from './components/NavigationDrawer.tsx';
import { AboutUsModal } from './components/AboutUsModal.tsx';
import { AchievementModal } from './components/AchievementModal.tsx';
import { AchievementFormModal } from './components/AchievementFormModal.tsx';
import { StudyNetworkLogo } from './components/StudyNetworkLogo.tsx';
import { 
  AppWindow, 
  Search, 
  Server, 
  Menu
} from 'lucide-react';

export default function App() {
  // Navigation View: 'public' | 'login' | 'admin'
  const [view, setView] = useState<'public' | 'login' | 'admin'>('public');

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(getStoredUser);

  // Public Data
  const [publicApps, setPublicApps] = useState<PublicWebApp[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState<boolean>(true);
  const [publicSearchQuery, setPublicSearchQuery] = useState<string>('');
  const [selectedWebApp, setSelectedWebApp] = useState<PublicWebApp | null>(null);

  // Site Settings & Slide-out Drawer State
  const [siteSettings, setSiteSettings] = useState<SiteSettings | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isAboutOpen, setIsAboutOpen] = useState<boolean>(false);

  // Admin Data
  const [adminApps, setAdminApps] = useState<AdminWebApp[]>([]);
  const [adminStats, setAdminStats] = useState<DashboardStats | null>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState<boolean>(false);

  // Modals & Dialogs State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AdminWebApp | null>(null);
  const [deletingApp, setDeletingApp] = useState<AdminWebApp | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // User's Achievements State
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [achievementMessage, setAchievementMessage] = useState<AchievementMessage | null>(null);
  const [isLoadingAchievements, setIsLoadingAchievements] = useState<boolean>(false);
  const [isAchievementViewerOpen, setIsAchievementViewerOpen] = useState<boolean>(false);
  const [isAchievementFormOpen, setIsAchievementFormOpen] = useState<boolean>(false);
  const [editingAchievement, setEditingAchievement] = useState<Achievement | null>(null);
  const [deletingAchievementId, setDeletingAchievementId] = useState<string | null>(null);
  const [isDeletingAchievement, setIsDeletingAchievement] = useState<boolean>(false);

  // Toast Notifications
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error' | 'info', message: string) => {
    const id = 'toast-' + Date.now() + Math.random();
    setToasts(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load site settings (public & fallback)
  const loadSettings = useCallback(async () => {
    try {
      const data = await fetchSiteSettings();
      setSiteSettings(data);
    } catch (err: any) {
      console.error('Failed to load site settings:', err);
    }
  }, []);

  // Load achievements
  const loadAchievements = useCallback(async () => {
    try {
      setIsLoadingAchievements(true);
      const data = await fetchPublicAchievements();
      setAchievements(data);
    } catch (err: any) {
      console.error('Failed to load achievements:', err);
    } finally {
      setIsLoadingAchievements(false);
    }
  }, []);

  // Load achievement message
  const loadAchievementMessage = useCallback(async () => {
    try {
      const msg = await fetchPublicAchievementMessage();
      setAchievementMessage(msg);
    } catch (err: any) {
      console.error('Failed to load achievement message:', err);
    }
  }, []);

  // Load public data
  const loadPublicData = useCallback(async () => {
    try {
      setIsLoadingPublic(true);
      const [apps] = await Promise.all([
        fetchPublicWebApps(),
        loadSettings(),
        loadAchievements(),
        loadAchievementMessage(),
      ]);
      setPublicApps(apps);
    } catch (err: any) {
      console.error('Failed to load public apps:', err);
      addToast('error', 'Unable to load web apps. Please try again.');
    } finally {
      setIsLoadingPublic(false);
    }
  }, [loadSettings, loadAchievements, loadAchievementMessage]);

  // Load admin data
  const loadAdminData = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      setIsLoadingAdmin(true);
      const [apps, stats, settingsData] = await Promise.all([
        fetchAdminWebApps(),
        fetchAdminStats(),
        fetchAdminSettings().catch(() => null),
        loadAchievements(),
        loadAchievementMessage(),
      ]);
      setAdminApps(apps);
      setAdminStats(stats);
      if (settingsData) {
        setSiteSettings(settingsData);
      }
    } catch (err: any) {
      console.error('Failed to load admin dashboard data:', err);
      if (err.message?.includes('Unauthorized')) {
        setAuthSession(null);
        setIsAuthenticated(false);
        setView('login');
      } else {
        addToast('error', 'Failed to refresh admin data.');
      }
    } finally {
      setIsLoadingAdmin(false);
    }
  }, [loadAchievements, loadAchievementMessage]);

  // Initial authentication check & URL hash listener
  useEffect(() => {
    const initAuth = async () => {
      const user = await checkAuthMe();
      if (user) {
        setIsAuthenticated(true);
        setCurrentUser(user);
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
    };
    initAuth();
    loadPublicData();

    // Initial authentication check & URL hash listener
    const handleHashRouting = () => {
      const hash = window.location.hash.toLowerCase();
      if (hash.startsWith('#admin') || hash.startsWith('#admins')) {
        if (getAuthToken()) {
          setView('admin');
          loadAdminData();
        } else {
          setView('login');
        }
      } else if (hash === '#login') {
        setView('login');
      } else {
        setView('public');
      }
    };

    window.addEventListener('hashchange', handleHashRouting);
    handleHashRouting();

    return () => {
      window.removeEventListener('hashchange', handleHashRouting);
    };
  }, [loadPublicData, loadAdminData]);

  // Sync hash when view changes
  const switchView = (newView: 'public' | 'login' | 'admin') => {
    setView(newView);
    if (newView === 'admin') {
      window.location.hash = '#admin';
      loadAdminData();
    } else if (newView === 'login') {
      window.location.hash = '#login';
    } else {
      window.location.hash = '';
      loadPublicData();
    }
  };

  // Login handler
  const handleLoginSuccess = (auth: AuthResponse) => {
    setIsAuthenticated(true);
    setCurrentUser(auth.user);
    addToast('success', 'Signed in successfully as Administrator');
    switchView('admin');
  };

  // Logout handler
  const handleLogout = () => {
    setAuthSession(null);
    setIsAuthenticated(false);
    setCurrentUser(null);
    addToast('info', 'You have been logged out.');
    switchView('public');
  };

  // Save new WebApp
  const handleSaveNewWebApp = async (payload: {
    name: string;
    icon: string;
    servers: Array<{ url: string; category: ServerCategory }>;
  }) => {
    await createAdminWebApp(payload);
    addToast('success', `Created "${payload.name}" with ${payload.servers.length} server links!`);
    await Promise.all([loadAdminData(), loadPublicData()]);
  };

  // Update existing WebApp
  const handleUpdateWebApp = async (
    id: string,
    payload: {
      name: string;
      icon: string;
      servers: Array<{ id?: string; url: string; category: ServerCategory }>;
    }
  ) => {
    await updateAdminWebApp(id, payload);
    addToast('success', `Updated "${payload.name}" successfully!`);
    await Promise.all([loadAdminData(), loadPublicData()]);
  };

  // Delete WebApp
  const handleConfirmDelete = async () => {
    if (!deletingApp) return;
    try {
      setIsDeleting(true);
      await deleteAdminWebApp(deletingApp.id);
      addToast('success', `Deleted "${deletingApp.name}" and its servers.`);
      setDeletingApp(null);
      await Promise.all([loadAdminData(), loadPublicData()]);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to delete Web App');
    } finally {
      setIsDeleting(false);
    }
  };

  // Save Site Settings (Admin only)
  const handleSaveSettings = async (payload: Partial<SiteSettings>) => {
    const updated = await saveAdminSettings(payload);
    setSiteSettings(updated);
    addToast('success', 'Site settings updated successfully!');
  };

  // Toggle Server Status (Admin only)
  const handleToggleServerStatus = async (appId: string, serverId: string, newStatus: boolean) => {
    try {
      // Optimistic update for snappy UI
      setAdminApps(prev => prev.map(app => {
        if (app.id !== appId) return app;
        return {
          ...app,
          servers: app.servers.map(s => s.id === serverId ? { ...s, isActive: newStatus } : s),
        };
      }));

      await updateServerStatus(serverId, newStatus);
      addToast('success', `Server status updated: ${newStatus ? 'Active (ON)' : 'Inactive (OFF)'}`);

      // Sync stats & public view silently
      loadAdminData();
      fetchPublicWebApps().then(setPublicApps).catch(() => {});
    } catch (err: any) {
      console.error('Failed to update server status:', err);
      addToast('error', err.message || 'Failed to update server status');
      loadAdminData();
    }
  };

  // Create or Update Achievement (Admin only)
  const handleSaveAchievement = async (payload: { imageUrl: string; comment: string; isPinned?: boolean }) => {
    try {
      if (editingAchievement) {
        await updateAchievement(editingAchievement.id, payload);
        addToast('success', 'Achievement updated successfully!');
      } else {
        await createAchievement(payload);
        addToast('success', 'Achievement published successfully!');
      }
      setIsAchievementFormOpen(false);
      setEditingAchievement(null);
      await loadAchievements();
    } catch (err: any) {
      console.error('Failed to save achievement:', err);
      addToast('error', err.message || 'Failed to save achievement');
      throw err;
    }
  };

  // Save Achievement Message (Admin only)
  const handleSaveAchievementMessage = async (payload: { title: string; content: string }) => {
    try {
      const updated = await saveAdminAchievementMessage(payload);
      setAchievementMessage(updated);
      addToast('success', 'Achievement message saved successfully!');
    } catch (err: any) {
      console.error('Failed to save achievement message:', err);
      addToast('error', err.message || 'Failed to save achievement message');
      throw err;
    }
  };

  // Pin / Unpin Achievement (Admin only)
  const handleTogglePinAchievement = async (id: string, isPinned: boolean) => {
    try {
      await toggleAchievementPin(id, isPinned);
      addToast('success', isPinned ? 'Achievement pinned to top!' : 'Achievement unpinned.');
      await loadAchievements();
    } catch (err: any) {
      console.error('Failed to toggle achievement pin:', err);
      addToast('error', err.message || 'Failed to update pin status');
      throw err;
    }
  };

  // Confirm Delete Achievement (Admin only)
  const handleConfirmDeleteAchievement = async () => {
    if (!deletingAchievementId) return;
    try {
      setIsDeletingAchievement(true);
      await deleteAchievement(deletingAchievementId);
      addToast('success', 'Achievement deleted successfully.');
      setDeletingAchievementId(null);
      await loadAchievements();
    } catch (err: any) {
      console.error('Failed to delete achievement:', err);
      addToast('error', err.message || 'Failed to delete achievement');
    } finally {
      setIsDeletingAchievement(false);
    }
  };

  // Filter public apps
  const filteredPublicApps = publicApps.filter(app =>
    app.name.toLowerCase().includes(publicSearchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#fafafc] dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Toast Notification Layer */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />

      {/* VIEW: ADMIN LOGIN */}
      {view === 'login' && (
        <LoginForm
          onSuccess={handleLoginSuccess}
          onBackToHome={() => switchView('public')}
        />
      )}

      {/* VIEW: ADMIN DASHBOARD */}
      {view === 'admin' && (
        <AdminDashboard
          stats={adminStats}
          webApps={adminApps}
          settings={siteSettings}
          onSaveSettings={handleSaveSettings}
          achievements={achievements}
          achievementsLoading={isLoadingAchievements}
          onOpenAddAchievement={() => {
            setEditingAchievement(null);
            setIsAchievementFormOpen(true);
          }}
          onOpenEditAchievement={(item) => {
            setEditingAchievement(item);
            setIsAchievementFormOpen(true);
          }}
          onDeleteAchievement={(id) => setDeletingAchievementId(id)}
          achievementMessage={achievementMessage}
          onSaveAchievementMessage={handleSaveAchievementMessage}
          onTogglePinAchievement={handleTogglePinAchievement}
          adminEmail={currentUser?.username || currentUser?.email || 'admin'}
          currentUser={currentUser}
          onNotify={addToast}
          onOpenAdd={() => setIsAddOpen(true)}
          onOpenEdit={(app) => setEditingApp(app)}
          onOpenDelete={(app) => setDeletingApp(app)}
          onLogout={handleLogout}
          onSwitchToPublic={() => switchView('public')}
          onToggleServerStatus={handleToggleServerStatus}
        />
      )}

      {/* VIEW: PUBLIC HOME PAGE */}
      {view === 'public' && (
        <div id="public-homepage-root" className="relative flex-1 flex flex-col min-h-screen bg-[#060813] text-neutral-100 overflow-x-hidden">
          {/* CSS-Based Futuristic Space / Technology Background (No external image) */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
            {/* Deep Navy/Black Canvas Base */}
            <div className="absolute inset-0 bg-[#060813]" />

            {/* Blue and Purple Nebula Glows */}
            <div className="absolute -top-32 left-1/4 w-[500px] h-[500px] rounded-full bg-blue-600/10 blur-[130px]" />
            <div className="absolute top-1/3 -right-32 w-[550px] h-[550px] rounded-full bg-purple-700/10 blur-[140px]" />
            <div className="absolute bottom-10 left-10 w-[450px] h-[450px] rounded-full bg-amber-600/[0.05] blur-[130px]" />

            {/* Subtle Star Field / Micro Particles using CSS Radial Gradients */}
            <div 
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage: `
                  radial-gradient(1px 1px at 25px 35px, rgba(255, 255, 255, 0.45), transparent),
                  radial-gradient(1.5px 1.5px at 120px 80px, rgba(253, 224, 71, 0.35), transparent),
                  radial-gradient(1px 1px at 210px 190px, rgba(255, 255, 255, 0.4), transparent),
                  radial-gradient(1px 1px at 320px 110px, rgba(147, 197, 253, 0.4), transparent),
                  radial-gradient(1.5px 1.5px at 450px 290px, rgba(255, 255, 255, 0.35), transparent)
                `,
                backgroundSize: '480px 360px'
              }}
            />

            {/* Subtle Tech Dot Grid */}
            <div 
              className="absolute inset-0 opacity-[0.035]"
              style={{
                backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.8) 1px, transparent 1px)',
                backgroundSize: '28px 28px'
              }}
            />

            {/* Elegant Thin Golden Curved Light Trails */}
            <svg className="absolute inset-0 w-full h-full opacity-20" preserveAspectRatio="none" viewBox="0 0 1440 900">
              <defs>
                <linearGradient id="goldTrail1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity="0" />
                  <stop offset="40%" stopColor="#F5D77F" stopOpacity="0.8" />
                  <stop offset="70%" stopColor="#DFB135" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#8A5A0A" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="goldTrail2" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity="0" />
                  <stop offset="50%" stopColor="#A855F7" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path
                d="M -100 150 C 300 280, 800 -40, 1540 220"
                fill="none"
                stroke="url(#goldTrail1)"
                strokeWidth="1.2"
              />
              <path
                d="M -100 700 C 450 520, 950 820, 1540 580"
                fill="none"
                stroke="url(#goldTrail2)"
                strokeWidth="1"
              />
            </svg>
          </div>

          {/* ================================================== */}
          {/* HEADER                                             */}
          {/* [STUDY NETWORK LOGO]  Study Network            [☰] */}
          {/* ================================================== */}
          <header className="sticky top-0 z-30 bg-[#070913]/80 backdrop-blur-xl border-b border-white/[0.08] shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-18 flex items-center justify-between gap-4">
              {/* Brand Logo & Name: Logo LEFT of "Study Network" */}
              <div className="flex items-center gap-3 sm:gap-3.5">
                <StudyNetworkLogo size={42} className="shrink-0" />
                <div>
                  <h1 id="public-header-title" className="font-bold text-lg sm:text-xl text-white tracking-tight leading-none">
                    Study Network
                  </h1>
                </div>
              </div>

              {/* Header Right: Hamburger Menu Button */}
              <div className="flex items-center gap-3">
                <button
                  id="header-hamburger-btn"
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-neutral-200 hover:text-white transition-all duration-200 cursor-pointer border border-white/[0.1] hover:border-amber-400/40 shadow-xs focus:outline-none focus:ring-2 focus:ring-amber-400/50"
                  aria-label="Open navigation menu"
                  title="Menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          {/* ================================================== */}
          {/* HERO                                               */}
          {/* WELCOME + Description + Subtle Glow (NO Logo here) */}
          {/* ================================================== */}
          <div className="relative z-10 py-10 sm:py-14 lg:py-16 px-4 sm:px-6 lg:px-8 text-center overflow-hidden">
            {/* Subtle Ambient Radial Glow Behind Hero */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 sm:w-[500px] sm:h-[500px] bg-gradient-to-tr from-indigo-600/15 via-purple-600/10 to-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative max-w-2xl mx-auto">
              <h2
                id="public-main-headline"
                className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white drop-shadow-[0_2px_15px_rgba(255,255,255,0.15)]"
              >
                WELCOME
              </h2>

              {/* Subtle decorative gold/blue glow line */}
              <div className="w-24 sm:w-32 h-0.5 mx-auto mt-4 rounded-full bg-gradient-to-r from-transparent via-amber-400/80 to-transparent shadow-[0_0_10px_rgba(212,175,55,0.5)]" />

              <p className="mt-4 text-sm sm:text-base lg:text-lg text-neutral-300 max-w-lg mx-auto font-normal leading-relaxed">
                Explore your web applications and connect to active servers instantly.
              </p>

              {/* ================================================== */}
              {/* SEARCH FIELD                                       */}
              {/* ================================================== */}
              <div className="mt-8 relative max-w-md sm:max-w-lg mx-auto">
                <div className="relative group">
                  <Search className="w-4 h-4 text-neutral-400 group-focus-within:text-amber-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none transition-colors duration-200" />
                  <input
                    id="main-apps-search-input"
                    type="text"
                    value={publicSearchQuery}
                    onChange={(e) => setPublicSearchQuery(e.target.value)}
                    placeholder="Search web apps..."
                    className="w-full pl-11 pr-10 py-3 sm:py-3.5 bg-neutral-900/60 backdrop-blur-xl border border-white/[0.12] rounded-2xl text-sm sm:text-base text-white placeholder-neutral-400 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-indigo-500/30 focus:shadow-[0_0_25px_rgba(99,102,241,0.25)] transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
                  />
                  {publicSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPublicSearchQuery('')}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-neutral-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
                      aria-label="Clear search"
                    >
                      <span className="text-xs font-bold leading-none">✕</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* APPLICATION CARDS                                  */}
          {/* Dynamic real data only (CW app preserved)          */}
          {/* Mobile: 1 col | Desktop: multi-column              */}
          {/* ================================================== */}
          <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full">
            {isLoadingPublic ? (
              <div id="public-loading-skeleton" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {[1, 2, 3, 4].map(n => (
                  <div
                    key={n}
                    className="p-7 bg-neutral-900/40 rounded-[20px] border border-white/[0.06] animate-pulse flex flex-col items-center"
                  >
                    <div className="w-20 h-20 rounded-[18px] bg-neutral-800/80 mb-4" />
                    <div className="w-28 h-5 rounded bg-neutral-800 mb-2" />
                    <div className="w-20 h-3 rounded bg-neutral-800/60 mb-5" />
                    <div className="w-full h-10 rounded-xl bg-neutral-800/40" />
                  </div>
                ))}
              </div>
            ) : filteredPublicApps.length === 0 ? (
              <div id="public-empty-state" className="text-center py-16 sm:py-20 px-6 sm:px-8 bg-neutral-900/50 backdrop-blur-xl rounded-[24px] border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.5)] max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-indigo-400 shadow-inner">
                  <AppWindow className="w-8 h-8" />
                </div>
                <h3 className="font-bold text-white text-lg">
                  {publicSearchQuery ? 'No matching apps found' : 'No Web Apps Available'}
                </h3>
                <p className="text-sm text-neutral-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  {publicSearchQuery 
                    ? 'Try searching with a different term.' 
                    : 'The administrator has not added any public web applications yet.'}
                </p>
                {publicSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPublicSearchQuery('')}
                    className="mt-5 px-4 py-2 text-xs font-semibold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all cursor-pointer"
                  >
                    Clear Search Filter
                  </button>
                )}
              </div>
            ) : (
              /* Public Web App Cards Grid: 1 column on mobile, multi-col on tablet/desktop */
              <div id="public-apps-grid" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 sm:gap-6">
                {filteredPublicApps.map((webApp) => (
                  <WebAppCard
                    key={webApp.id}
                    webApp={webApp}
                    onClick={(app) => setSelectedWebApp(app)}
                  />
                ))}
              </div>
            )}
          </main>

          {/* ================================================== */}
          {/* FOOTER                                             */}
          {/* Dark glass, subtle border, existing links          */}
          {/* ================================================== */}
          <footer className="relative z-10 mt-auto border-t border-white/[0.08] bg-[#070913]/75 backdrop-blur-md py-6 sm:py-7 text-center text-xs text-neutral-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Server className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-medium text-neutral-200">Study Network</span>
                <span className="text-neutral-600 hidden sm:inline">•</span>
                <span className="text-neutral-400 hidden sm:inline text-[11px]">Web App Launcher</span>
              </div>

              <div className="flex items-center gap-4 text-[11px] text-neutral-400">
                <span>Active Server Gateway</span>
                <span className="text-neutral-600">•</span>
                <button
                  type="button"
                  onClick={() => setIsAboutOpen(true)}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  About Us
                </button>
                <span className="text-neutral-600">•</span>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="hover:text-amber-300 transition-colors cursor-pointer"
                >
                  Menu
                </button>
              </div>
            </div>
          </footer>
        </div>
      )}

      {/* POPUP / MODAL: Public Server Modal */}
      <ServerModal
        webApp={selectedWebApp}
        onClose={() => setSelectedWebApp(null)}
        onLaunched={(name) => {
          addToast('info', `Connecting to ${name}...`);
        }}
        onError={(msg) => {
          addToast('error', msg);
        }}
      />

      {/* MODAL: Add New Web App (Admin only) */}
      <AddWebAppModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSave={handleSaveNewWebApp}
      />

      {/* MODAL: Edit Web App (Admin only) */}
      <EditWebAppModal
        webApp={editingApp}
        isOpen={!!editingApp}
        onClose={() => setEditingApp(null)}
        onSave={handleUpdateWebApp}
      />

      {/* DIALOG: Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingApp}
        title="Delete Web App?"
        message={`Are you sure you want to delete "${deletingApp?.name}"? This action is permanent and will safely remove all ${deletingApp?.servers.length || 0} associated server records.`}
        confirmText="Delete Web App"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeletingApp(null)}
      />

      {/* SLIDE-OUT NAVIGATION DRAWER */}
      <NavigationDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        settings={siteSettings}
        onOpenAbout={() => setIsAboutOpen(true)}
        onOpenAchievements={() => setIsAchievementViewerOpen(true)}
      />

      {/* ABOUT US MODAL */}
      <AboutUsModal
        isOpen={isAboutOpen}
        onClose={() => setIsAboutOpen(false)}
        settings={siteSettings}
      />

      {/* USER'S ACHIEVEMENT MODAL (PUBLIC) */}
      <AchievementModal
        isOpen={isAchievementViewerOpen}
        onClose={() => setIsAchievementViewerOpen(false)}
        message={achievementMessage}
        achievements={achievements}
        isLoading={isLoadingAchievements}
      />

      {/* ACHIEVEMENT FORM MODAL (ADMIN) */}
      <AchievementFormModal
        isOpen={isAchievementFormOpen}
        onClose={() => {
          setIsAchievementFormOpen(false);
          setEditingAchievement(null);
        }}
        onSave={handleSaveAchievement}
        initialAchievement={editingAchievement}
      />

      {/* DIALOG: Delete Achievement Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingAchievementId}
        title="Delete Achievement?"
        message="Are you sure you want to delete this user achievement? This action is permanent and will remove the achievement from public view."
        confirmText="Delete Achievement"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeletingAchievement}
        onConfirm={handleConfirmDeleteAchievement}
        onCancel={() => setDeletingAchievementId(null)}
      />
    </div>
  );
}
