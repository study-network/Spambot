import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Code, 
  Plus, 
  Edit3, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Save, 
  Check, 
  RefreshCw, 
  Sparkles,
  Info,
  Globe,
  Image as ImageIcon
} from 'lucide-react';
import { SiteSettings, TeamMember, SocialLink, AdminPermission } from '../types.ts';
import { SocialLinksEditor } from './SocialLinksEditor.tsx';
import { SocialIcon } from './SocialIcon.tsx';
import { TeamMemberModal } from './TeamMemberModal.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import { 
  fetchAdminTeamMembers, 
  createTeamMember, 
  updateTeamMember, 
  deleteTeamMember,
  reorderTeamMembers 
} from '../lib/api.ts';
import { FormattedTextWithLinks } from './FormattedTextWithLinks.tsx';

interface AboutUsAdminSectionProps {
  settings: SiteSettings | null;
  onSaveSettings: (payload: Partial<SiteSettings>) => Promise<void>;
  userPermissions?: AdminPermission[];
  isMainAdmin?: boolean;
}

export const AboutUsAdminSection: React.FC<AboutUsAdminSectionProps> = ({
  settings,
  onSaveSettings,
  userPermissions,
  isMainAdmin = false,
}) => {
  // Permission checks
  const canEditAboutUs = isMainAdmin || (userPermissions ? userPermissions.includes('EDIT_ABOUT_US') : true);
  const canEditDeveloper = isMainAdmin || (userPermissions ? userPermissions.includes('EDIT_DEVELOPER') : true);
  const canAddMember = isMainAdmin || (userPermissions ? userPermissions.includes('ADD_TEAM_MEMBER') : true);
  const canEditMember = isMainAdmin || (userPermissions ? userPermissions.includes('EDIT_TEAM_MEMBER') : true);
  const canDeleteMember = isMainAdmin || (userPermissions ? userPermissions.includes('DELETE_TEAM_MEMBER') : true);
  const canManageTeamSocial = isMainAdmin || (userPermissions ? userPermissions.includes('MANAGE_TEAM_SOCIAL_LINKS') : true);
  const canReorderMembers = isMainAdmin || (userPermissions ? userPermissions.includes('REORDER_TEAM_MEMBERS') : true);
  // Brand & Intro state
  const [brandName, setBrandName] = useState(settings?.brandName || 'Study Network');
  const [brandTagline, setBrandTagline] = useState(settings?.brandTagline || '');
  const [brandLogo, setBrandLogo] = useState(settings?.brandLogo || '');
  const [aboutTitle, setAboutTitle] = useState(settings?.aboutTitle || 'About Us');
  const [aboutDescription, setAboutDescription] = useState(settings?.aboutDescription || '');
  const [aboutMessageTitle, setAboutMessageTitle] = useState(settings?.aboutMessageTitle || '');
  const [aboutMessageSubtitle, setAboutMessageSubtitle] = useState(settings?.aboutMessageSubtitle || '');

  // Developer section state
  const [developerName, setDeveloperName] = useState(settings?.developerName || '');
  const [developerRole, setDeveloperRole] = useState(settings?.developerRole || '');
  const [developerDescription, setDeveloperDescription] = useState(settings?.developerDescription || '');
  const [developerPhoto, setDeveloperPhoto] = useState(settings?.developerPhoto || '');
  const [developerTagline, setDeveloperTagline] = useState(settings?.developerTagline || '');
  const [developerSocialLinks, setDeveloperSocialLinks] = useState<SocialLink[]>(settings?.developerSocialLinks ? [...settings.developerSocialLinks] : []);

  // Footer banner state
  const [aboutFooterTitle, setAboutFooterTitle] = useState(settings?.aboutFooterTitle || '');
  const [aboutFooterSubtitle, setAboutFooterSubtitle] = useState(settings?.aboutFooterSubtitle || '');
  const [aboutFooterTagline, setAboutFooterTagline] = useState(settings?.aboutFooterTagline || '');

  // Team members state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

  // Delete confirmation state
  const [deletingMember, setDeletingMember] = useState<TeamMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [memberActionMessage, setMemberActionMessage] = useState<string | null>(null);

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync settings when props change
  useEffect(() => {
    if (settings) {
      setBrandName(settings.brandName || 'Study Network');
      setBrandTagline(settings.brandTagline || '');
      setBrandLogo(settings.brandLogo || '');
      setAboutTitle(settings.aboutTitle || 'About Us');
      setAboutDescription(settings.aboutDescription || '');
      setAboutMessageTitle(settings.aboutMessageTitle || '');
      setAboutMessageSubtitle(settings.aboutMessageSubtitle || '');

      setDeveloperName(settings.developerName || '');
      setDeveloperRole(settings.developerRole || '');
      setDeveloperDescription(settings.developerDescription || '');
      setDeveloperPhoto(settings.developerPhoto || '');
      setDeveloperTagline(settings.developerTagline || '');
      setDeveloperSocialLinks(settings.developerSocialLinks ? [...settings.developerSocialLinks] : []);

      setAboutFooterTitle(settings.aboutFooterTitle || '');
      setAboutFooterSubtitle(settings.aboutFooterSubtitle || '');
      setAboutFooterTagline(settings.aboutFooterTagline || '');
    }
  }, [settings]);

  // Load team members
  const loadTeam = async () => {
    setLoadingTeam(true);
    setTeamError(null);
    try {
      const data = await fetchAdminTeamMembers();
      setTeamMembers(data);
    } catch (err: any) {
      setTeamError(err.message || 'Failed to load team members');
    } finally {
      setLoadingTeam(false);
    }
  };

  useEffect(() => {
    loadTeam();
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      await onSaveSettings({
        brandName,
        brandTagline,
        brandLogo,
        aboutTitle,
        aboutDescription,
        aboutMessageTitle,
        aboutMessageSubtitle,
        developerName,
        developerRole,
        developerDescription,
        developerPhoto,
        developerTagline,
        developerSocialLinks,
        aboutFooterTitle,
        aboutFooterSubtitle,
        aboutFooterTagline,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      setSaveError(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Team member actions
  const handleOpenAddMember = () => {
    setEditingMember(null);
    setIsModalOpen(true);
  };

  const handleOpenEditMember = (member: TeamMember) => {
    setEditingMember(member);
    setIsModalOpen(true);
  };

  const handleSaveMember = async (data: {
    id?: string;
    name: string;
    role: string;
    description: string;
    photo: string;
    socialLinks: SocialLink[];
  }) => {
    if (data.id) {
      await updateTeamMember(data.id, data);
      setMemberActionMessage(`Team member "${data.name}" updated successfully.`);
    } else {
      await createTeamMember(data);
      setMemberActionMessage(`New team member "${data.name}" added successfully.`);
    }
    setTimeout(() => setMemberActionMessage(null), 4000);
    await loadTeam();
  };

  const handleDeleteMember = (member: TeamMember) => {
    setDeletingMember(member);
    setDeleteError(null);
  };

  const handleConfirmDeleteMember = async () => {
    if (!deletingMember) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const deletedName = deletingMember.name;
      await deleteTeamMember(deletingMember.id);
      setDeletingMember(null);
      await loadTeam();
      setMemberActionMessage(`"${deletedName}" has been successfully deleted from team members.`);
      setTimeout(() => setMemberActionMessage(null), 4000);
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete team member');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveMember = async (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= teamMembers.length) return;

    const reordered = [...teamMembers];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    setTeamMembers(reordered);
    try {
      await reorderTeamMembers(reordered.map((m) => m.id));
    } catch (err) {
      loadTeam();
    }
  };

  return (
    <div id="about-us-admin-panel" className="space-y-8">
      {/* Save status notification */}
      {saveSuccess && (
        <div className="p-4 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-medium">
            About Us & Developer settings saved successfully! Changes are live on the public About Us modal.
          </p>
        </div>
      )}

      {saveError && (
        <div className="p-4 bg-red-950/50 border border-red-500/40 rounded-2xl text-red-300 text-sm">
          {saveError}
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-8">
        {/* SECTION 1: DEVELOPER SETTINGS (Priority User Request) */}
        <div
          id="developer-settings-card"
          className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 rounded-xl text-indigo-400">
                <Code className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Developer Profile & Social Links
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Configure developer information and optional social links shown in About Us
                </p>
              </div>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full">
              Developer Card
            </span>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Developer Name, Role, and Photo URL */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Developer Name
                </label>
                <input
                  id="developer-name-input"
                  type="text"
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                  placeholder="e.g. Lead Developer"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Role / Title
                </label>
                <input
                  id="developer-role-input"
                  type="text"
                  value={developerRole}
                  onChange={(e) => setDeveloperRole(e.target.value)}
                  placeholder="e.g. Founder & Lead Engineer"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Tagline
                </label>
                <input
                  id="developer-tagline-input"
                  type="text"
                  value={developerTagline}
                  onChange={(e) => setDeveloperTagline(e.target.value)}
                  placeholder="e.g. Building open tools for everyone"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Photo URL with preview */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Profile Photo URL <span className="text-neutral-400 font-normal">(optional)</span>
              </label>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center overflow-hidden shrink-0">
                  {developerPhoto ? (
                    <img
                      src={developerPhoto}
                      alt="Developer Avatar Preview"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-sm font-bold text-indigo-400">
                      {developerName.slice(0, 2).toUpperCase() || 'DEV'}
                    </span>
                  )}
                </div>
                <input
                  id="developer-photo-input"
                  type="url"
                  value={developerPhoto}
                  onChange={(e) => setDeveloperPhoto(e.target.value)}
                  placeholder="https://example.com/photo.jpg (leave empty for default initial icon)"
                  className="flex-1 px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs"
                />
              </div>
            </div>

            {/* Developer Bio / Description */}
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Developer Description
              </label>
              <textarea
                id="developer-description-input"
                rows={3}
                value={developerDescription}
                onChange={(e) => setDeveloperDescription(e.target.value)}
                placeholder="Hi! I'm the developer of LINK VERSE. I build this platform to make learning and resources easily accessible for everyone..."
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Developer Social Links Editor */}
            <div className="pt-4 border-t border-neutral-200/80 dark:border-neutral-800">
              <div className="mb-2">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
                  Developer Social Links
                </span>
                <p className="text-[11px] text-neutral-400">
                  Optional links (Telegram, WhatsApp, Instagram, YouTube, GitHub, Twitter, Facebook, LinkedIn, Website, Custom).
                  Only valid URLs are displayed as subtle icons in the public UI.
                </p>
              </div>

              <SocialLinksEditor
                links={developerSocialLinks}
                onChange={setDeveloperSocialLinks}
                maxLinks={10}
              />

              {/* Live Preview of developer social icons */}
              {developerSocialLinks.filter((l) => l.url).length > 0 && (
                <div className="mt-3.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">
                    Public preview of developer icons:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {developerSocialLinks
                      .filter((l) => l.url)
                      .map((l) => (
                        <SocialIcon key={l.id} link={l} size="sm" />
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION 2: OUR TEAM MEMBERS MANAGEMENT (Priority User Request) */}
        <div
          id="our-team-admin-card"
          className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl text-purple-400">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Our Team Members ({teamMembers.length})
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Manage team members, roles, optional bios, photos, and social icons
                </p>
              </div>
            </div>

            <button
              id="btn-admin-add-team-member"
              type="button"
              onClick={handleOpenAddMember}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-xl transition-all shadow-sm cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Team Member</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {teamError && (
              <div className="mb-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
                {teamError}
              </div>
            )}

            {memberActionMessage && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 animate-fadeIn">
                <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{memberActionMessage}</span>
              </div>
            )}

            {loadingTeam ? (
              <div className="py-8 text-center text-sm text-neutral-400">
                Loading team members...
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
                <Users className="w-8 h-8 mx-auto text-neutral-400 mb-2 opacity-60" />
                <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  No team members added yet
                </p>
                <p className="text-xs text-neutral-400 mt-0.5 mb-4">
                  Add team members to showcase contributors, mentors, or moderators
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddMember}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-purple-400 bg-purple-950/40 border border-purple-500/30 rounded-xl hover:bg-purple-900/40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add First Member</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {teamMembers.map((member, index) => {
                  const activeLinks = (member.socialLinks || []).filter((l) => l.url);

                  return (
                    <div
                      key={member.id}
                      id={`team-member-item-${member.id}`}
                      className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/70 hover:border-neutral-300 dark:hover:border-neutral-600 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Avatar + Details */}
                      <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-300 flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                          {member.photo ? (
                            <img
                              src={member.photo}
                              alt={member.name}
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <span>{member.name.slice(0, 2).toUpperCase()}</span>
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate">
                              {member.name}
                            </h4>
                            <span className="text-[11px] px-2 py-0.5 bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-medium rounded-full">
                              {member.role}
                            </span>
                          </div>

                          {member.description && (
                            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1 max-w-xl">
                              <FormattedTextWithLinks text={member.description} linkClassName="text-indigo-600 dark:text-indigo-400 hover:underline break-all" />
                            </div>
                          )}

                          {/* Social links preview */}
                          {activeLinks.length > 0 && (
                            <div className="flex items-center gap-1.5 mt-2">
                              {activeLinks.map((l) => (
                                <SocialIcon key={l.id} link={l} size="sm" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Controls: Reorder, Edit, Delete */}
                      <div className="flex items-center gap-1 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveMember(index, 'up')}
                          className="p-1.5 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={index === teamMembers.length - 1}
                          onClick={() => handleMoveMember(index, 'down')}
                          className="p-1.5 text-neutral-400 hover:text-neutral-200 disabled:opacity-30 disabled:cursor-not-allowed rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          id={`btn-edit-team-member-${member.id}`}
                          type="button"
                          onClick={() => handleOpenEditMember(member)}
                          className="p-2 text-indigo-500 hover:text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors ml-1 cursor-pointer"
                          title="Edit member"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          id={`btn-delete-team-member-${member.id}`}
                          type="button"
                          disabled={!canDeleteMember}
                          onClick={() => handleDeleteMember(member)}
                          className={`p-2 rounded-xl transition-colors ${
                            canDeleteMember
                              ? 'text-rose-500 hover:text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer'
                              : 'text-neutral-400 opacity-40 cursor-not-allowed'
                          }`}
                          title={canDeleteMember ? `Delete ${member.name}` : 'Permission required to delete team member'}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* SECTION 3: BRANDING & GENERAL ABOUT US CONTENT */}
        <div
          id="branding-about-card"
          className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-5 border-b border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500/20 to-teal-500/20 border border-blue-500/30 rounded-xl text-blue-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                  Brand Identity & Modal Messages
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Header name, tagline, intro quote, and footer announcement
                </p>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Brand Name
                </label>
                <input
                  id="brand-name-input"
                  type="text"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="LINK VERSE"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Brand Tagline
                </label>
                <input
                  id="brand-tagline-input"
                  type="text"
                  value={brandTagline}
                  onChange={(e) => setBrandTagline(e.target.value)}
                  placeholder="LEARN • EXPLORE • GROW"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Header Quote / Title
                </label>
                <input
                  id="about-message-title-input"
                  type="text"
                  value={aboutMessageTitle}
                  onChange={(e) => setAboutMessageTitle(e.target.value)}
                  placeholder="Knowledge shared is a brighter tomorrow."
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Header Subtitle / Tagline
                </label>
                <input
                  id="about-message-subtitle-input"
                  type="text"
                  value={aboutMessageSubtitle}
                  onChange={(e) => setAboutMessageSubtitle(e.target.value)}
                  placeholder="Stay Connected • Stay Curious • Stay Ahead"
                  className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Footer Banner */}
            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-200/80 dark:border-neutral-700/60 space-y-3">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-700 dark:text-neutral-300 block">
                About Us Modal Footer Banner
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  id="about-footer-title-input"
                  type="text"
                  value={aboutFooterTitle}
                  onChange={(e) => setAboutFooterTitle(e.target.value)}
                  placeholder="Thanks for being a part of LINK VERSE."
                  className="w-full px-3.5 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100"
                />
                <input
                  id="about-footer-tagline-input"
                  type="text"
                  value={aboutFooterTagline}
                  onChange={(e) => setAboutFooterTagline(e.target.value)}
                  placeholder="Keep Learning • Keep Exploring • Keep Growing"
                  className="w-full px-3.5 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100"
                />
              </div>
              <input
                id="about-footer-subtitle-input"
                type="text"
                value={aboutFooterSubtitle}
                onChange={(e) => setAboutFooterSubtitle(e.target.value)}
                placeholder="Together, we can make learning simple, free and accessible for everyone."
                className="w-full px-3.5 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs text-neutral-900 dark:text-neutral-100"
              />
            </div>
          </div>
        </div>

        {/* Global Save Button */}
        <div className="sticky bottom-4 z-20 p-4 bg-white/90 dark:bg-neutral-900/90 backdrop-blur-md rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl flex items-center justify-between">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:block">
            Saves Developer information, social links, branding, and About Us modal configuration.
          </p>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              id="btn-save-about-settings"
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 disabled:opacity-60 transition-all cursor-pointer w-full sm:w-auto"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>SAVE ABOUT US SETTINGS</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Team Member Modal */}
      <TeamMemberModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMember}
        onDelete={(member) => {
          setIsModalOpen(false);
          handleDeleteMember(member);
        }}
        member={editingMember}
        canManageSocialLinks={canManageTeamSocial}
        canDelete={canDeleteMember}
      />

      {/* Delete Team Member Confirmation Modal */}
      <ConfirmDialog
        isOpen={!!deletingMember}
        title="Delete Team Member"
        message={
          deletingMember
            ? `Are you sure you want to delete "${deletingMember.name}" (${deletingMember.role})? This will permanently remove them from the Our Team Members list.`
            : ''
        }
        confirmText="Yes, Delete Member"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        error={deleteError}
        onConfirm={handleConfirmDeleteMember}
        onCancel={() => {
          if (!isDeleting) {
            setDeletingMember(null);
            setDeleteError(null);
          }
        }}
      />
    </div>
  );
};
