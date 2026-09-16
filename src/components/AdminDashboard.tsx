import React, { useState, useEffect } from 'react';
import { 
  AdminWebApp, 
  DashboardStats, 
  SiteSettings, 
  Achievement, 
  AchievementMessage, 
  AdminUser, 
  AdminPermission 
} from '../types.ts';
import { 
  AppWindow, 
  Layers, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  ShieldAlert, 
  FlaskConical, 
  Edit3, 
  Trash2, 
  Search, 
  LogOut, 
  ExternalLink, 
  ShieldCheck, 
  Server, 
  Settings, 
  Megaphone, 
  Trophy, 
  Users,
  Shield,
  UserCheck,
  Plus
} from 'lucide-react';
import { FloatingAddButton } from './FloatingAddButton.tsx';
import { CategoryBadge } from './CategoryBadge.tsx';
import { SiteSettingsForm } from './SiteSettingsForm.tsx';
import { MessageNoticeForm } from './MessageNoticeForm.tsx';
import { AchievementAdminSection } from './AchievementAdminSection.tsx';
import { AboutUsAdminSection } from './AboutUsAdminSection.tsx';
import { OtherAdminsAdminSection } from './OtherAdminsAdminSection.tsx';

interface AdminDashboardProps {
  stats: DashboardStats | null;
  webApps: AdminWebApp[];
  settings: SiteSettings | null;
  onSaveSettings: (settings: Partial<SiteSettings>) => Promise<void>;
  achievements?: Achievement[];
  achievementsLoading?: boolean;
  onOpenAddAchievement?: () => void;
  onOpenEditAchievement?: (achievement: Achievement) => void;
  onDeleteAchievement?: (id: string) => void;
  achievementMessage?: AchievementMessage | null;
  onSaveAchievementMessage?: (payload: { title: string; content: string }) => Promise<void>;
  onTogglePinAchievement?: (id: string, isPinned: boolean) => Promise<void>;
  adminEmail?: string;
  currentUser?: AdminUser | null;
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
  onOpenAdd: () => void;
  onOpenEdit: (app: AdminWebApp) => void;
  onOpenDelete: (app: AdminWebApp) => void;
  onLogout: () => void;
  onSwitchToPublic: () => void;
  onToggleServerStatus?: (appId: string, serverId: string, newStatus: boolean) => Promise<void>;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  webApps,
  settings,
  onSaveSettings,
  achievements = [],
  achievementsLoading = false,
  onOpenAddAchievement = () => {},
  onOpenEditAchievement = () => {},
  onDeleteAchievement = () => {},
  achievementMessage = null,
  onSaveAchievementMessage,
  onTogglePinAchievement,
  adminEmail,
  currentUser,
  onNotify,
  onOpenAdd,
  onOpenEdit,
  onOpenDelete,
  onLogout,
  onSwitchToPublic,
  onToggleServerStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'apps' | 'achievements' | 'message' | 'about' | 'settings' | 'admins'>('apps');
  const [searchQuery, setSearchQuery] = useState('');

  // Role & Permissions Determination
  const isMainAdmin = !currentUser?.role || currentUser.role === 'MAIN_ADMIN';
  const userPermissions = currentUser?.permissions || [];

  const hasPermission = (perm: AdminPermission): boolean => {
    if (isMainAdmin) return true;
    return userPermissions.includes(perm);
  };

  const hasAnyPermission = (perms: AdminPermission[]): boolean => {
    if (isMainAdmin) return true;
    return perms.some(p => userPermissions.includes(p));
  };

  const canViewApps = hasAnyPermission([
    'VIEW_DASHBOARD',
    'ADD_WEBAPP',
    'EDIT_WEBAPP',
    'DELETE_WEBAPP',
    'ADD_SERVER',
    'EDIT_SERVER',
    'DELETE_SERVER',
    'TOGGLE_SERVER_STATUS',
  ]);
  const canViewAchievements = hasAnyPermission(['VIEW_DASHBOARD', 'EDIT_ABOUT_US']);
  const canViewMessage = hasPermission('EDIT_SITE_SETTINGS');
  const canViewAbout = hasPermission('EDIT_ABOUT_US');
  const canViewSettings = hasAnyPermission([
    'EDIT_SITE_SETTINGS',
    'EDIT_TELEGRAM_LINK',
    'EDIT_WHATSAPP_LINK',
    'EDIT_STAY_HAPPY',
  ]);
  const canViewAdmins = isMainAdmin;

  // Granular action permissions
  const canAddWebApp = hasPermission('ADD_WEBAPP');
  const canEditWebApp = hasAnyPermission(['EDIT_WEBAPP', 'ADD_SERVER', 'EDIT_SERVER', 'DELETE_SERVER']);
  const canDeleteWebApp = hasPermission('DELETE_WEBAPP');
  const canToggleServer = hasPermission('TOGGLE_SERVER_STATUS');

  // If currently active tab is not allowed, auto-switch to first allowed tab
  useEffect(() => {
    if (activeTab === 'admins' && !canViewAdmins) {
      setActiveTab('apps');
    } else if (activeTab === 'apps' && !canViewApps) {
      if (canViewAchievements) setActiveTab('achievements');
      else if (canViewMessage) setActiveTab('message');
      else if (canViewAbout) setActiveTab('about');
      else if (canViewSettings) setActiveTab('settings');
    }
  }, [activeTab, canViewAdmins, canViewApps, canViewAchievements, canViewMessage, canViewAbout, canViewSettings]);

  const filteredApps = webApps.filter(app =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.servers.some(s => s.url.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div id="admin-dashboard-root" className="min-h-screen pb-24 bg-neutral-50/50 dark:bg-neutral-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs text-white ${
              isMainAdmin ? 'bg-gradient-to-br from-indigo-600 to-purple-600' : 'bg-indigo-600'
            }`}>
              {isMainAdmin ? <ShieldCheck className="w-5 h-5" /> : <Shield className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 id="admin-header-title" className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100 tracking-tight leading-none">
                  Admin Dashboard
                </h1>
                {isMainAdmin ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold uppercase tracking-wider border border-amber-500/30">
                    MAIN ADMIN
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/30">
                    OTHER ADMIN
                  </span>
                )}
              </div>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                {isMainAdmin ? 'Full System & Administrator Access' : 'Delegated Role-Based Access'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              id="admin-view-public-btn"
              type="button"
              onClick={onSwitchToPublic}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/70 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Public Home</span>
            </button>

            {(currentUser?.username || adminEmail) && (
              <span className="hidden md:inline-flex items-center text-xs text-neutral-600 dark:text-neutral-300 px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg font-mono">
                {currentUser?.username || adminEmail}
              </span>
            )}

            <button
              id="admin-logout-btn"
              type="button"
              onClick={onLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Metric Cards Banner (only shown if user has VIEW_DASHBOARD permission) */}
        {hasPermission('VIEW_DASHBOARD') && (
          <section id="admin-stats-grid" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-3.5 mb-8">
            {/* Total Web Apps */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Web Apps</span>
                <AppWindow className="w-4 h-4 text-indigo-500" />
              </div>
              <div id="stat-total-webapps" className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                {stats?.totalWebApps ?? webApps.length}
              </div>
            </div>

            {/* Total Servers */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
              <div className="flex items-center justify-between text-neutral-500 dark:text-neutral-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total</span>
                <Layers className="w-4 h-4 text-violet-500" />
              </div>
              <div id="stat-total-servers" className="text-2xl sm:text-3xl font-bold text-neutral-900 dark:text-neutral-100">
                {stats?.totalServers ?? 0}
              </div>
            </div>

            {/* Working Servers */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-emerald-200/70 dark:border-emerald-900/40 shadow-xs bg-emerald-50/20 dark:bg-emerald-950/10">
              <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Working</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
              <div id="stat-working-servers" className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400">
                {stats?.workingServers ?? 0}
              </div>
            </div>

            {/* Error Servers */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-rose-200/70 dark:border-rose-900/40 shadow-xs bg-rose-50/20 dark:bg-rose-950/10">
              <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Error</span>
                <AlertCircle className="w-4 h-4 text-rose-500" />
              </div>
              <div id="stat-error-servers" className="text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-400">
                {stats?.errorServers ?? 0}
              </div>
            </div>

            {/* Some Error Servers */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-orange-200/70 dark:border-orange-900/40 shadow-xs bg-orange-50/20 dark:bg-orange-950/10">
              <div className="flex items-center justify-between text-orange-700 dark:text-orange-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Some Error</span>
                <AlertTriangle className="w-4 h-4 text-orange-500" />
              </div>
              <div id="stat-some-error-servers" className="text-2xl sm:text-3xl font-bold text-orange-700 dark:text-orange-400">
                {stats?.someErrorServers ?? 0}
              </div>
            </div>

            {/* Unfilter Servers */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-amber-200/70 dark:border-amber-900/40 shadow-xs bg-amber-50/20 dark:bg-amber-950/10">
              <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Unfilter</span>
                <ShieldAlert className="w-4 h-4 text-amber-500" />
              </div>
              <div id="stat-unfilter-servers" className="text-2xl sm:text-3xl font-bold text-amber-700 dark:text-amber-400">
                {stats?.unfilterServers ?? 0}
              </div>
            </div>

            {/* Testing Servers */}
            <div className="p-4 bg-white dark:bg-neutral-900 rounded-2xl border border-cyan-200/70 dark:border-cyan-900/40 shadow-xs bg-cyan-50/20 dark:bg-cyan-950/10">
              <div className="flex items-center justify-between text-cyan-700 dark:text-cyan-400 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Testing</span>
                <FlaskConical className="w-4 h-4 text-cyan-500" />
              </div>
              <div id="stat-testing-servers" className="text-2xl sm:text-3xl font-bold text-cyan-700 dark:text-cyan-400">
                {stats?.testingServers ?? 0}
              </div>
            </div>
          </section>
        )}

        {/* Tab Selection */}
        <div className="flex items-center gap-2 mb-6 border-b border-neutral-200/80 dark:border-neutral-800 pb-3 overflow-x-auto">
          {canViewApps && (
            <button
              id="tab-web-apps"
              type="button"
              onClick={() => setActiveTab('apps')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'apps'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <AppWindow className="w-4 h-4" />
              <span>Web Apps & Servers ({webApps.length})</span>
            </button>
          )}

          {canViewAchievements && (
            <button
              id="tab-user-achievements"
              type="button"
              onClick={() => setActiveTab('achievements')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'achievements'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Trophy className="w-4 h-4 text-amber-500" />
              <span>User's Achievements ({achievements.length})</span>
            </button>
          )}

          {canViewMessage && (
            <button
              id="tab-message-notice"
              type="button"
              onClick={() => setActiveTab('message')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'message'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Megaphone className="w-4 h-4" />
              <span>Message / Notice</span>
            </button>
          )}

          {canViewAbout && (
            <button
              id="tab-about-us-settings"
              type="button"
              onClick={() => setActiveTab('about')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'about'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Users className="w-4 h-4 text-purple-400" />
              <span>About Us & Team</span>
            </button>
          )}

          {canViewSettings && (
            <button
              id="tab-site-settings"
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Settings className="w-4 h-4" />
              <span>Site Settings</span>
            </button>
          )}

          {/* MAIN ADMIN EXCLUSIVE: Admin Accounts Tab */}
          {canViewAdmins && (
            <button
              id="tab-admin-accounts"
              type="button"
              onClick={() => setActiveTab('admins')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'admins'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-sm'
                  : 'text-purple-700 dark:text-purple-300 hover:text-purple-900 dark:hover:text-purple-100 hover:bg-purple-50 dark:hover:bg-purple-950/40 border border-purple-200/60 dark:border-purple-800/60'
              }`}
            >
              <Shield className="w-4 h-4 text-purple-400" />
              <span>Admin Accounts</span>
            </button>
          )}
        </div>

        {/* Tab 1: Achievements */}
        {activeTab === 'achievements' && canViewAchievements && (
          <AchievementAdminSection
            achievements={achievements}
            isLoading={achievementsLoading}
            onOpenAddModal={onOpenAddAchievement}
            onOpenEditModal={onOpenEditAchievement}
            onDeleteAchievement={onDeleteAchievement}
            message={achievementMessage}
            onSaveMessage={onSaveAchievementMessage}
            onTogglePin={onTogglePinAchievement}
          />
        )}

        {/* Tab 2: Message / Notice */}
        {activeTab === 'message' && canViewMessage && (
          <MessageNoticeForm
            settings={settings}
            onSave={onSaveSettings}
          />
        )}

        {/* Tab 3: About Us */}
        {activeTab === 'about' && canViewAbout && (
          <AboutUsAdminSection
            settings={settings}
            onSaveSettings={onSaveSettings}
          />
        )}

        {/* Tab 4: Site Settings */}
        {activeTab === 'settings' && canViewSettings && (
          <SiteSettingsForm
            settings={settings}
            onSave={onSaveSettings}
          />
        )}

        {/* Tab 5: Admin Accounts (Main Admin only) */}
        {activeTab === 'admins' && canViewAdmins && (
          <OtherAdminsAdminSection onNotify={onNotify} />
        )}

        {/* Tab 6: Web Apps & Servers */}
        {activeTab === 'apps' && canViewApps && (
          <>
            {/* Action Header & Search */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div>
                <h2 id="admin-list-title" className="text-xl font-bold text-neutral-900 dark:text-neutral-100">
                  Web Apps ({filteredApps.length})
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Manage web application endpoints, routing, and health status
                </p>
              </div>

              <div className="w-full sm:w-72 relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search apps or URLs..."
                  className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
                />
              </div>
            </div>

            {/* Apps List */}
            {filteredApps.length === 0 ? (
              <div id="admin-empty-state" className="text-center py-16 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs max-w-md mx-auto p-6">
                <AppWindow className="w-10 h-10 mx-auto mb-3 text-neutral-400 dark:text-neutral-600" />
                <h3 className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">
                  {searchQuery ? 'No matching web apps' : 'No Web Apps in Database'}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                  {searchQuery ? 'Try another search query.' : 'Click "Add Web App" below to configure your first application.'}
                </p>
              </div>
            ) : (
              <div id="admin-apps-list" className="space-y-3">
                {filteredApps.map((app) => {
                  const activeServersCount = app.servers.filter(s => s.isActive).length;
                  return (
                    <div
                      key={app.id}
                      id={`admin-app-row-${app.id}`}
                      className="p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      {/* Left: App Identity */}
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center overflow-hidden border border-neutral-200/60 dark:border-neutral-700/60 shrink-0">
                          {app.icon ? (
                            <img
                              src={app.icon}
                              alt={app.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <AppWindow className="w-6 h-6 text-neutral-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 truncate">
                            {app.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-neutral-500 dark:text-neutral-400">
                              {app.servers.length} server{app.servers.length === 1 ? '' : 's'} total
                            </span>
                            <span className="text-xs text-neutral-300 dark:text-neutral-700">&bull;</span>
                            <span className={`text-xs font-medium ${activeServersCount > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                              {activeServersCount} active
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Middle: Quick Server Preview Pills & ON/OFF Controls */}
                      <div className="flex flex-wrap items-center gap-2 md:max-w-lg">
                        {app.servers.map((s, idx) => (
                          <div
                            key={s.id || idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 rounded-lg text-xs shadow-2xs"
                          >
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              Server {idx + 1}
                            </span>
                            <CategoryBadge category={s.category} size="sm" showIcon={false} />
                            
                            {/* Independent ON/OFF toggle button */}
                            {canToggleServer ? (
                              <button
                                id={`toggle-btn-${app.id}-${s.id || idx}`}
                                type="button"
                                onClick={() => onToggleServerStatus && onToggleServerStatus(app.id, s.id, !s.isActive)}
                                title={`Click to turn Server ${idx + 1} ${s.isActive ? 'OFF' : 'ON'}`}
                                className={`ml-0.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider transition-all cursor-pointer ${
                                  s.isActive
                                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-xs'
                                    : 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-600 dark:text-neutral-300'
                                }`}
                              >
                                {s.isActive ? 'ON' : 'OFF'}
                              </button>
                            ) : (
                              <span
                                className={`ml-0.5 px-2 py-0.5 rounded text-[10px] font-bold tracking-wider opacity-80 ${
                                  s.isActive
                                    ? 'bg-emerald-500 text-white'
                                    : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                                }`}
                              >
                                {s.isActive ? 'ON' : 'OFF'}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Right: Edit & Delete Actions */}
                      <div className="flex items-center gap-2 self-end md:self-center">
                        {canEditWebApp && (
                          <button
                            id={`edit-app-btn-${app.id}`}
                            type="button"
                            onClick={() => onOpenEdit(app)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                        )}

                        {canDeleteWebApp && (
                          <button
                            id={`delete-app-btn-${app.id}`}
                            type="button"
                            onClick={() => onOpenDelete(app)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* Floating Add Button in Bottom-Right Corner (Only in Apps Tab if user has permission) */}
      {activeTab === 'apps' && canAddWebApp && <FloatingAddButton onClick={onOpenAdd} />}
    </div>
  );
};

