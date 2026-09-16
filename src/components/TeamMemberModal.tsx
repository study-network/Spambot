import React, { useState, useEffect } from 'react';
import { X, User, Image as ImageIcon } from 'lucide-react';
import { TeamMember, SocialLink } from '../types.ts';
import { SocialLinksEditor } from './SocialLinksEditor.tsx';

interface TeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (memberData: {
    id?: string;
    name: string;
    role: string;
    description: string;
    photo: string;
    socialLinks: SocialLink[];
  }) => Promise<void>;
  member?: TeamMember | null;
}

export const TeamMemberModal: React.FC<TeamMemberModalProps> = ({
  isOpen,
  onClose,
  onSave,
  member,
}) => {
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState('');
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (member) {
      setName(member.name || '');
      setRole(member.role || '');
      setDescription(member.description || '');
      setPhoto(member.photo || '');
      setSocialLinks(member.socialLinks ? [...member.socialLinks] : []);
    } else {
      setName('');
      setRole('');
      setDescription('');
      setPhoto('');
      setSocialLinks([]);
    }
    setError(null);
  }, [member, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Member name is required');
      return;
    }
    if (!role.trim()) {
      setError('Role / designation is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        id: member?.id,
        name: name.trim(),
        role: role.trim(),
        description: description.trim(),
        photo: photo.trim(),
        socialLinks,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save team member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      id="team-member-modal-backdrop" 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn overflow-y-auto"
      onClick={onClose}
    >
      <div
        id="team-member-modal"
        className="relative w-full max-w-lg my-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-xl text-purple-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {member ? 'Edit Team Member' : 'Add Team Member'}
              </h2>
              <p className="text-xs text-slate-400">
                Manage profile info and optional social links
              </p>
            </div>
          </div>
          <button
            id="btn-close-team-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {/* Name & Role in grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name <span className="text-red-400">*</span>
              </label>
              <input
                id="team-member-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mohit"
                className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400/50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Role / Title <span className="text-red-400">*</span>
              </label>
              <input
                id="team-member-role-input"
                type="text"
                required
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g. Operations Head"
                className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400/50"
              />
            </div>
          </div>

          {/* Photo URL with preview */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Profile Photo URL <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden shrink-0">
                {photo ? (
                  <img
                    src={photo}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                ) : (
                  <ImageIcon className="w-5 h-5 text-slate-600" />
                )}
              </div>
              <input
                id="team-member-photo-input"
                type="url"
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                placeholder="https://example.com/avatar.jpg"
                className="flex-1 px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400/50"
              />
            </div>
          </div>

          {/* Description / Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Short Bio / Description <span className="text-slate-500 font-normal">(optional)</span>
            </label>
            <textarea
              id="team-member-desc-input"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Managing community, platform stability, and daily support."
              className="w-full px-3.5 py-2 text-sm bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-purple-400 focus:border-purple-400/50 resize-none"
            />
          </div>

          {/* Social Links Editor */}
          <div className="pt-2 border-t border-slate-800/80">
            <SocialLinksEditor
              links={socialLinks}
              onChange={setSocialLinks}
              maxLinks={10}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-800">
            <button
              id="btn-cancel-team-modal"
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-save-team-member"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl transition-all shadow-md shadow-purple-900/30 disabled:opacity-50"
            >
              {loading ? 'Saving...' : member ? 'Update Member' : 'Save Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
