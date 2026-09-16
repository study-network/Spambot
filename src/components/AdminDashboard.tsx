import React, { useState } from 'react';
import { 
  AdminWebApp, 
  DashboardStats 
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
  Server
} from 'lucide-react';
import { FloatingAddButton } from './FloatingAddButton.tsx';
import { CategoryBadge } from './CategoryBadge.tsx';

interface AdminDashboardProps {
  stats: DashboardStats | null;
  webApps: AdminWebApp[];
  adminEmail?: string;
  onOpenAdd: () => void;
  onOpenEdit: (app: AdminWebApp) => void;
  onOpenDelete: (app: AdminWebApp) => void;
  onLogout: () => void;
  onSwitchToPublic: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  webApps,
  adminEmail,
  onOpenAdd,
  onOpenEdit,
  onOpenDelete,
  onLogout,
  onSwitchToPublic,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

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
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 id="admin-header-title" className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100 tracking-tight leading-none">
                Admin Dashboard
              </h1>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Web App & Server Manager
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

            {adminEmail && (
              <span className="hidden md:inline-flex items-center text-xs text-neutral-500 dark:text-neutral-400 px-2.5 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg font-mono">
                {adminEmail}
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
        {/* Metric Cards Banner */}
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

        {/* Web Apps List */}
        {filteredApps.length === 0 ? (
          <div id="admin-empty-state" className="text-center py-16 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs p-8">
            <AppWindow className="w-12 h-12 mx-auto mb-3 text-neutral-300 dark:text-neutral-600" />
            <h3 className="font-bold text-neutral-900 dark:text-neutral-100 text-base">
              {searchQuery ? 'No matching web apps found' : 'No Web Apps Added Yet'}
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-sm mx-auto">
              {searchQuery 
                ? 'Try adjusting your search keywords.' 
                : 'Click the "+" button in the bottom right corner to add your first web application.'}
            </p>
          </div>
        ) : (
          <div id="admin-apps-list" className="space-y-4">
            {filteredApps.map((app) => {
              const workingCount = app.servers.filter(s => s.category === 'Working').length;
              const errorCount = app.servers.filter(s => s.category === 'Error').length;
              const someErrorCount = app.servers.filter(s => s.category === 'Some Error').length;
              const unfilterCount = app.servers.filter(s => s.category === 'Unfilter').length;
              const testingCount = app.servers.filter(s => s.category === 'Testing').length;

              return (
                <div
                  key={app.id}
                  id={`admin-app-row-${app.id}`}
                  className="group bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md transition-all p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Left: Icon & Meta */}
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shrink-0 shadow-inner flex items-center justify-center">
                      {app.icon ? (
                        <img
                          src={app.icon}
                          alt={app.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <AppWindow className="w-7 h-7 text-indigo-500" />
                      )}
                    </div>

                    <div>
                      <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">
                        {app.name}
                      </h3>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200/60 dark:border-neutral-700/60">
                          <Server className="w-3 h-3" />
                          {app.servers.length} {app.servers.length === 1 ? 'Server' : 'Servers'}
                        </span>

                        {workingCount > 0 && (
                          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                            {workingCount} working
                          </span>
                        )}
                        {errorCount > 0 && (
                          <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                            {errorCount} error
                          </span>
                        )}
                        {someErrorCount > 0 && (
                          <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">
                            {someErrorCount} some error
                          </span>
                        )}
                        {unfilterCount > 0 && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                            {unfilterCount} unfilter
                          </span>
                        )}
                        {testingCount > 0 && (
                          <span className="text-[11px] text-cyan-600 dark:text-cyan-400 font-medium">
                            {testingCount} testing
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Middle: Quick Server Preview Pills */}
                  <div className="flex flex-wrap items-center gap-1.5 md:max-w-md">
                    {app.servers.map((s, idx) => (
                      <div
                        key={s.id || idx}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 rounded-lg text-xs"
                      >
                        <span className="font-medium text-neutral-700 dark:text-neutral-300">
                          Server {idx + 1}
                        </span>
                        <CategoryBadge category={s.category} size="sm" showIcon={false} />
                      </div>
                    ))}
                  </div>

                  {/* Right: Edit & Delete Actions */}
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      id={`edit-app-btn-${app.id}`}
                      type="button"
                      onClick={() => onOpenEdit(app)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/80 dark:border-indigo-800 transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      id={`delete-app-btn-${app.id}`}
                      type="button"
                      onClick={() => onOpenDelete(app)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Add Button in Bottom-Right Corner */}
      <FloatingAddButton onClick={onOpenAdd} />
    </div>
  );
};
