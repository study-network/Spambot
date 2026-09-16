import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  ShieldAlert, 
  UserPlus, 
  KeyRound, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Lock, 
  UserCheck, 
  UserX, 
  RefreshCw, 
  AlertCircle,
  Search,
  CheckCircle2,
  Settings2,
  Layers,
  Globe,
  Users
} from 'lucide-react';
import { OtherAdminUser, AdminPermission } from '../types.ts';
import { 
  fetchOtherAdmins, 
  createOtherAdmin, 
  updateOtherAdmin, 
  toggleOtherAdminStatus, 
  deleteOtherAdmin 
} from '../lib/api.ts';

interface OtherAdminsAdminSectionProps {
  onNotify?: (type: 'success' | 'error' | 'info', message: string) => void;
}

interface PermissionGroup {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  permissions: {
    key: AdminPermission;
    label: string;
    description: string;
  }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    name: 'Web Apps Management',
    icon: Layers,
    description: 'Control web app entries and directory items',
    permissions: [
      { key: 'ADD_WEBAPP', label: 'Add Web App', description: 'Create new web app entries' },
      { key: 'EDIT_WEBAPP', label: 'Edit Web App', description: 'Modify web app details, icons, and names' },
      { key: 'DELETE_WEBAPP', label: 'Delete Web App', description: 'Remove web apps from directory' },
    ],
  },
  {
    name: 'Server & Category Controls',
    icon: Settings2,
    description: 'Control server links, status failovers, and categories',
    permissions: [
      { key: 'ADD_SERVER', label: 'Add Server', description: 'Add new server links to web apps' },
      { key: 'EDIT_SERVER', label: 'Edit Server', description: 'Update server URLs and categories' },
      { key: 'DELETE_SERVER', label: 'Delete Server', description: 'Remove servers from web apps' },
      { key: 'TOGGLE_SERVER_STATUS', label: 'Toggle Server Status', description: 'Turn servers ON or OFF in real-time' },
      { key: 'ADD_CATEGORY', label: 'Manage Categories', description: 'Assign categories (Working, Error, etc.)' },
    ],
  },
  {
    name: 'Site Settings & Social Links',
    icon: Globe,
    description: 'Control public announcements, social channels, and modals',
    permissions: [
      { key: 'EDIT_SITE_SETTINGS', label: 'Edit Site Settings', description: 'Update general settings and Notice Box' },
      { key: 'EDIT_TELEGRAM_LINK', label: 'Edit Telegram Link', description: 'Update official Telegram channel URL' },
      { key: 'EDIT_WHATSAPP_LINK', label: 'Edit WhatsApp Link', description: 'Update official WhatsApp community URL' },
      { key: 'EDIT_STAY_HAPPY', label: 'Edit Stay Happy', description: 'Modify the Stay Happy card content and icon' },
      { key: 'EDIT_ABOUT_US', label: 'Edit About Us & Team', description: 'Manage About Us info, team members, and achievements' },
    ],
  },
  {
    name: 'General Access',
    icon: Users,
    description: 'System-level access and telemetry',
    permissions: [
      { key: 'VIEW_DASHBOARD', label: 'View Dashboard Stats', description: 'View dashboard metrics, statistics, and counts' },
    ],
  },
];

const ALL_PERMISSIONS_LIST: AdminPermission[] = PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.key));

export const OtherAdminsAdminSection: React.FC<OtherAdminsAdminSectionProps> = ({ onNotify }) => {
  const [admins, setAdmins] = useState<OtherAdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Form / Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState<OtherAdminUser | null>(null);
  const [formData, setFormData] = useState<{
    username: string;
    password: string;
    isActive: boolean;
    permissions: AdminPermission[];
  }>({
    username: '',
    password: '',
    isActive: true,
    permissions: ['VIEW_DASHBOARD'],
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete confirmation
  const [deletingAdmin, setDeletingAdmin] = useState<OtherAdminUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadAdmins = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await fetchOtherAdmins();
      setAdmins(data);
    } catch (err: any) {
      console.error('Failed to load other admins:', err);
      setError(err.message || 'Failed to load other admins');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingAdmin(null);
    setFormData({
      username: '',
      password: '',
      isActive: true,
      permissions: ['VIEW_DASHBOARD', 'ADD_WEBAPP', 'EDIT_WEBAPP', 'ADD_SERVER', 'EDIT_SERVER', 'TOGGLE_SERVER_STATUS'],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (admin: OtherAdminUser) => {
    setEditingAdmin(admin);
    setFormData({
      username: admin.username,
      password: '', // leave empty to keep existing password
      isActive: admin.isActive,
      permissions: [...admin.permissions],
    });
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleTogglePermission = (perm: AdminPermission) => {
    setFormData(prev => {
      const exists = prev.permissions.includes(perm);
      return {
        ...prev,
        permissions: exists 
          ? prev.permissions.filter(p => p !== perm) 
          : [...prev.permissions, perm],
      };
    });
  };

  const handleSelectAllPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: [...ALL_PERMISSIONS_LIST] }));
  };

  const handleClearPermissions = () => {
    setFormData(prev => ({ ...prev, permissions: [] }));
  };

  const handlePresetPermissions = (type: 'apps' | 'social') => {
    if (type === 'apps') {
      setFormData(prev => ({
        ...prev,
        permissions: [
          'VIEW_DASHBOARD',
          'ADD_WEBAPP',
          'EDIT_WEBAPP',
          'DELETE_WEBAPP',
          'ADD_SERVER',
          'EDIT_SERVER',
          'DELETE_SERVER',
          'TOGGLE_SERVER_STATUS',
          'ADD_CATEGORY',
        ],
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        permissions: [
          'VIEW_DASHBOARD',
          'EDIT_SITE_SETTINGS',
          'EDIT_TELEGRAM_LINK',
          'EDIT_WHATSAPP_LINK',
          'EDIT_STAY_HAPPY',
          'EDIT_ABOUT_US',
        ],
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const trimmedUsername = formData.username.trim();
    if (!trimmedUsername || trimmedUsername.length < 3) {
      setFormError('Admin ID / Username must be at least 3 characters long');
      return;
    }

    if (!editingAdmin && (!formData.password || formData.password.length < 4)) {
      setFormError('Password must be at least 4 characters long');
      return;
    }

    if (editingAdmin && formData.password && formData.password.length < 4) {
      setFormError('New password must be at least 4 characters long');
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingAdmin) {
        await updateOtherAdmin(editingAdmin.id, {
          username: trimmedUsername,
          password: formData.password ? formData.password : undefined,
          permissions: formData.permissions,
          isActive: formData.isActive,
        });
        if (onNotify) onNotify('success', `Admin "${trimmedUsername}" updated successfully`);
      } else {
        await createOtherAdmin({
          username: trimmedUsername,
          password: formData.password,
          permissions: formData.permissions,
          isActive: formData.isActive,
        });
        if (onNotify) onNotify('success', `New Admin "${trimmedUsername}" created successfully`);
      }

      setIsModalOpen(false);
      await loadAdmins();
    } catch (err: any) {
      setFormError(err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (admin: OtherAdminUser) => {
    try {
      const nextStatus = !admin.isActive;
      await toggleOtherAdminStatus(admin.id, nextStatus);
      setAdmins(prev =>
        prev.map(a => (a.id === admin.id ? { ...a, isActive: nextStatus } : a))
      );
      if (onNotify) {
        onNotify(
          'info',
          `Admin "${admin.username}" is now ${nextStatus ? 'Active' : 'Disabled'}`
        );
      }
    } catch (err: any) {
      if (onNotify) onNotify('error', err.message || 'Failed to update status');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deletingAdmin) return;
    try {
      setIsDeleting(true);
      await deleteOtherAdmin(deletingAdmin.id);
      if (onNotify) onNotify('success', `Admin "${deletingAdmin.username}" deleted successfully`);
      setDeletingAdmin(null);
      await loadAdmins();
    } catch (err: any) {
      if (onNotify) onNotify('error', err.message || 'Failed to delete admin');
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredAdmins = admins.filter(a =>
    a.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div id="other-admins-section" className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-6 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/60 dark:border-indigo-800/60 shadow-xs shrink-0">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Two-Level Admin Management
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[11px] font-bold uppercase tracking-wider border border-amber-500/30">
                Main Admin Exclusive
              </span>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              Create and manage Other Admin accounts with granular permission control.
            </p>
          </div>
        </div>

        <button
          id="btn-add-other-admin"
          type="button"
          onClick={handleOpenCreateModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-sm font-semibold shadow-xs hover:shadow-indigo-500/20 transition-all cursor-pointer shrink-0"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Other Admin</span>
        </button>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-other-admins-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search admins by ID..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400 self-end sm:self-auto">
          <span>Total: <strong className="text-neutral-800 dark:text-neutral-200">{admins.length}</strong></span>
          <span>&bull;</span>
          <span>Active: <strong className="text-emerald-600 dark:text-emerald-400">{admins.filter(a => a.isActive).length}</strong></span>
          <span>&bull;</span>
          <span>Disabled: <strong className="text-neutral-400 dark:text-neutral-500">{admins.filter(a => !a.isActive).length}</strong></span>
          <button
            type="button"
            onClick={loadAdmins}
            title="Refresh Admin List"
            className="p-1.5 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs sm:text-sm font-medium flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={loadAdmins}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition-colors cursor-pointer shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Admins Table / Cards List */}
      {isLoading ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800">
          <div className="w-8 h-8 mx-auto border-3 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 font-medium">
            Loading admin accounts...
          </p>
        </div>
      ) : filteredAdmins.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800">
          <ShieldAlert className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100">
            {searchQuery ? 'No matching admins found' : 'No Other Admins Configured'}
          </h3>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-md mx-auto">
            {searchQuery 
              ? 'Try searching with a different username.' 
              : 'You can create secondary administrators with customized permissions to safely delegate tasks.'}
          </p>
          {!searchQuery && (
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer"
            >
              Create First Other Admin
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAdmins.map((admin) => {
            const permCount = admin.permissions?.length || 0;
            const allAssigned = permCount === ALL_PERMISSIONS_LIST.length;

            return (
              <div
                key={admin.id}
                id={`admin-card-${admin.id}`}
                className={`p-5 bg-white dark:bg-neutral-900 rounded-3xl border transition-all flex flex-col justify-between gap-4 shadow-xs ${
                  admin.isActive 
                    ? 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700' 
                    : 'border-neutral-200/50 dark:border-neutral-800/40 bg-neutral-50/50 dark:bg-neutral-900/40 opacity-75'
                }`}
              >
                <div>
                  {/* Top Bar: Username, Status & Role Badge */}
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        admin.isActive 
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/60' 
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 border border-neutral-200 dark:border-neutral-700'
                      }`}>
                        {admin.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 truncate">
                            {admin.username}
                          </h3>
                          <span className="px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-[10px] font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                            OTHER_ADMIN
                          </span>
                        </div>
                        <span className="text-[11px] text-neutral-400 dark:text-neutral-500 font-mono">
                          ID: {admin.id}
                        </span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(admin)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                        admin.isActive
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200'
                      }`}
                      title={admin.isActive ? 'Click to deactivate' : 'Click to activate'}
                    >
                      {admin.isActive ? (
                        <>
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-3.5 h-3.5" />
                          <span>Disabled</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Permissions Summary Badges */}
                  <div className="space-y-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                        Assigned Permissions:
                      </span>
                      <span className="font-mono text-neutral-500 text-[11px]">
                        {permCount} / {ALL_PERMISSIONS_LIST.length}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {allAssigned ? (
                        <span className="px-2 py-0.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 text-[11px] font-semibold">
                          All Permissions Granted
                        </span>
                      ) : permCount === 0 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 text-[11px] font-semibold">
                          No Permissions Assigned
                        </span>
                      ) : (
                        admin.permissions.map((p) => (
                          <span
                            key={p}
                            className="px-2 py-0.5 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[11px] font-medium border border-neutral-200/60 dark:border-neutral-700/60"
                          >
                            {p}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div className="flex items-center justify-between pt-3 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                  <span className="text-[11px] text-neutral-400">
                    Created {new Date(admin.createdAt).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(admin)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-200 rounded-xl font-semibold transition-colors cursor-pointer"
                      title="Edit admin permissions or reset password"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingAdmin(admin)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-600 dark:text-rose-400 rounded-xl font-semibold transition-colors cursor-pointer"
                      title="Delete admin account"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div
          id="admin-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/70 backdrop-blur-xs overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsModalOpen(false);
          }}
        >
          <div
            id="admin-modal-card"
            className="w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden my-auto flex flex-col max-h-[92vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100 leading-tight">
                    {editingAdmin ? `Edit Admin: ${editingAdmin.username}` : 'Add New Other Admin'}
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Configure login credentials and grant custom module permissions.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {formError && (
                  <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Username & Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                      Admin ID / Username <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="modal-admin-username"
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      placeholder="e.g. subadmin1"
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 uppercase tracking-wider">
                      {editingAdmin ? 'New Password (leave blank to keep)' : 'Password *'}
                    </label>
                    <input
                      id="modal-admin-password"
                      type="password"
                      required={!editingAdmin}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder={editingAdmin ? '••••••••' : 'Minimum 4 characters'}
                      className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Account Status Switch */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80">
                  <div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                      Account Status
                    </span>
                    <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      Inactive admins are barred from signing in.
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:bg-neutral-700 peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Permissions Presets & Controls */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                        Granular Permissions ({formData.permissions.length} Selected)
                      </h4>
                      <p className="text-[11px] text-neutral-400">
                        Select which areas and actions this administrator is allowed to perform.
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={handleSelectAllPermissions}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 transition-colors cursor-pointer"
                      >
                        Select All
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetPermissions('apps')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 transition-colors cursor-pointer"
                      >
                        Apps & Servers
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePresetPermissions('social')}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 transition-colors cursor-pointer"
                      >
                        Settings & Notice
                      </button>
                      <button
                        type="button"
                        onClick={handleClearPermissions}
                        className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-neutral-200 transition-colors cursor-pointer"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  {/* Grouped Permission Checkboxes */}
                  <div className="space-y-4">
                    {PERMISSION_GROUPS.map((group) => {
                      const GroupIcon = group.icon;
                      return (
                        <div
                          key={group.name}
                          className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/60 space-y-3"
                        >
                          <div className="flex items-center gap-2">
                            <GroupIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                            <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                              {group.name}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {group.permissions.map((perm) => {
                              const isChecked = formData.permissions.includes(perm.key);
                              return (
                                <label
                                  key={perm.key}
                                  className={`flex items-start gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer select-none ${
                                    isChecked
                                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800 text-indigo-950 dark:text-indigo-100'
                                      : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => handleTogglePermission(perm.key)}
                                    className="mt-0.5 rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <span className="text-xs font-bold block leading-snug">
                                      {perm.label}
                                    </span>
                                    <span className="text-[10px] text-neutral-500 dark:text-neutral-400 block leading-tight mt-0.5">
                                      {perm.description}
                                    </span>
                                  </div>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 flex items-center justify-end gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingAdmin ? 'Update Administrator' : 'Create Administrator'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingAdmin && (
        <div
          id="delete-admin-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeletingAdmin(null);
          }}
        >
          <div
            id="delete-admin-modal-card"
            className="w-full max-w-md bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200 dark:border-rose-900/60 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100">
                Delete Administrator Account?
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Are you sure you want to delete <strong className="text-neutral-900 dark:text-neutral-100 font-semibold">{deletingAdmin.username}</strong>? 
                This action is permanent and their access tokens will immediately be invalidated.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingAdmin(null)}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteConfirm}
                className="flex-1 py-2.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Admin</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
