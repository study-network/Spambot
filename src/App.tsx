import React, { useState, useEffect, useCallback } from 'react';
import { 
  PublicWebApp, 
  AdminWebApp, 
  DashboardStats, 
  ServerCategory,
  AuthResponse
} from './types.ts';
import { 
  fetchPublicWebApps, 
  fetchAdminStats, 
  fetchAdminWebApps, 
  createAdminWebApp, 
  updateAdminWebApp, 
  deleteAdminWebApp,
  getAuthToken,
  getStoredUser,
  setAuthSession,
  checkAuthMe
} from './lib/api.ts';
import { WebAppCard } from './components/WebAppCard.tsx';
import { ServerModal } from './components/ServerModal.tsx';
import { LoginForm } from './components/LoginForm.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { AddWebAppModal } from './components/AddWebAppModal.tsx';
import { EditWebAppModal } from './components/EditWebAppModal.tsx';
import { ConfirmDialog } from './components/ConfirmDialog.tsx';
import { ToastContainer, ToastMessage } from './components/Toast.tsx';
import { 
  AppWindow, 
  Search, 
  Server, 
  Sparkles
} from 'lucide-react';

export default function App() {
  // Navigation View: 'public' | 'login' | 'admin'
  const [view, setView] = useState<'public' | 'login' | 'admin'>('public');

  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<{ email: string } | null>(null);

  // Public Data
  const [publicApps, setPublicApps] = useState<PublicWebApp[]>([]);
  const [isLoadingPublic, setIsLoadingPublic] = useState<boolean>(true);
  const [publicSearchQuery, setPublicSearchQuery] = useState<string>('');
  const [selectedWebApp, setSelectedWebApp] = useState<PublicWebApp | null>(null);

  // Admin Data
  const [adminApps, setAdminApps] = useState<AdminWebApp[]>([]);
  const [adminStats, setAdminStats] = useState<DashboardStats | null>(null);
  const [isLoadingAdmin, setIsLoadingAdmin] = useState<boolean>(false);

  // Modals & Dialogs State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<AdminWebApp | null>(null);
  const [deletingApp, setDeletingApp] = useState<AdminWebApp | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Load public data
  const loadPublicData = useCallback(async () => {
    try {
      setIsLoadingPublic(true);
      const data = await fetchPublicWebApps();
      setPublicApps(data);
    } catch (err: any) {
      console.error('Failed to load public apps:', err);
      addToast('error', 'Unable to load web apps. Please try again.');
    } finally {
      setIsLoadingPublic(false);
    }
  }, []);

  // Load admin data
  const loadAdminData = useCallback(async () => {
    if (!getAuthToken()) return;
    try {
      setIsLoadingAdmin(true);
      const [apps, stats] = await Promise.all([
        fetchAdminWebApps(),
        fetchAdminStats(),
      ]);
      setAdminApps(apps);
      setAdminStats(stats);
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
  }, []);

  // Initial authentication check & URL hash listener
  useEffect(() => {
    const initAuth = async () => {
      const valid = await checkAuthMe();
      if (valid) {
        setIsAuthenticated(true);
        setCurrentUser(getStoredUser());
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
      if (hash === '#admin') {
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
          adminEmail={currentUser?.email}
          onOpenAdd={() => setIsAddOpen(true)}
          onOpenEdit={(app) => setEditingApp(app)}
          onOpenDelete={(app) => setDeletingApp(app)}
          onLogout={handleLogout}
          onSwitchToPublic={() => switchView('public')}
        />
      )}

      {/* VIEW: PUBLIC HOME PAGE */}
      {view === 'public' && (
        <div id="public-homepage-root" className="flex-1 flex flex-col">
          {/* Public Header */}
          <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
              {/* Brand Logo & Name */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
                  <AppWindow className="w-5 h-5" />
                </div>
                <div>
                  <h1 id="public-header-title" className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100 tracking-tight leading-none">
                    Web App Link Manager
                  </h1>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium">
                    Verified Multi-Server Launcher
                  </span>
                </div>
              </div>

              {/* Header Right Actions: Search Only */}
              <div className="flex items-center gap-3">
                <div className="relative w-48 sm:w-64 md:w-72">
                  <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="public-search-input"
                    type="text"
                    value={publicSearchQuery}
                    onChange={(e) => setPublicSearchQuery(e.target.value)}
                    placeholder="Search apps..."
                    className="w-full pl-9 pr-4 py-2 bg-neutral-100/80 dark:bg-neutral-800/80 border border-neutral-200/80 dark:border-neutral-700/60 rounded-xl text-xs text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Public Hero / Announcement bar */}
          <div className="bg-gradient-to-b from-indigo-50/50 via-white to-transparent dark:from-indigo-950/20 dark:via-neutral-950 dark:to-transparent border-b border-neutral-100/80 dark:border-neutral-900 py-10 sm:py-14 px-4 sm:px-6 lg:px-8 text-center">
            <div className="max-w-2xl mx-auto">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-semibold mb-3 border border-indigo-200/60 dark:border-indigo-800/60">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Multi-Server Failover Directory</span>
              </div>
              <h2 id="public-main-headline" className="text-2xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
                Launch Your Web Apps
              </h2>
              <p className="mt-2 text-sm sm:text-base text-neutral-500 dark:text-neutral-400 max-w-lg mx-auto">
                Click any application card below to view active servers and connect instantly with real-time status indicators.
              </p>

              {/* Mobile search bar */}
              <div className="mt-6 relative sm:hidden max-w-sm mx-auto">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="mobile-search-input"
                  type="text"
                  value={publicSearchQuery}
                  onChange={(e) => setPublicSearchQuery(e.target.value)}
                  placeholder="Search web apps..."
                  className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
                />
              </div>
            </div>
          </div>

          {/* Main Apps Grid Container */}
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full">
            {isLoadingPublic ? (
              <div id="public-loading-skeleton" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-6">
                {[1, 2, 3, 4, 5, 6].map(n => (
                  <div
                    key={n}
                    className="p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 animate-pulse flex flex-col items-center"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-neutral-200 dark:bg-neutral-800 mb-4"></div>
                    <div className="w-24 h-4 rounded bg-neutral-200 dark:bg-neutral-800 mb-2"></div>
                    <div className="w-16 h-3 rounded bg-neutral-100 dark:bg-neutral-800/60"></div>
                  </div>
                ))}
              </div>
            ) : filteredPublicApps.length === 0 ? (
              <div id="public-empty-state" className="text-center py-20 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs max-w-md mx-auto p-8">
                <AppWindow className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
                  {publicSearchQuery ? 'No matching apps found' : 'No Web Apps Available'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {publicSearchQuery 
                    ? 'Try searching with a different term.' 
                    : 'The administrator has not added any public web applications yet.'}
                </p>
                {publicSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setPublicSearchQuery('')}
                    className="mt-4 px-3.5 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                  >
                    Clear Search Filter
                  </button>
                )}
              </div>
            ) : (
              /* Public Web App Cards Grid */
              <div id="public-apps-grid" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
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

          {/* Footer */}
          <footer className="mt-auto border-t border-neutral-200/60 dark:border-neutral-800/80 bg-white/50 dark:bg-neutral-950 py-6 text-center text-xs text-neutral-400 dark:text-neutral-500">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-center gap-2">
              <Server className="w-3.5 h-3.5 text-indigo-500" />
              <span>Web App Link Manager &bull; Safe Multi-Server Architecture</span>
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
    </div>
  );
}
