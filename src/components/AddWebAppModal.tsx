import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Trash2, ArrowUp, ArrowDown, Upload, Link as LinkIcon, Image as ImageIcon, Sparkles, Check } from 'lucide-react';
import { ServerCategory } from '../types.ts';
import { CategoryBadge } from './CategoryBadge.tsx';

interface ServerDraft {
  tempId: string;
  url: string;
  category: ServerCategory;
}

interface AddWebAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    icon: string;
    servers: Array<{ url: string; category: ServerCategory }>;
  }) => Promise<void>;
}

// Preset popular icons for quick testing / aesthetic presets
const PRESET_ICONS = [
  { label: 'Study & Books', url: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&w=256&q=80' },
  { label: 'Movie & Cinema', url: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=256&q=80' },
  { label: 'Coding & Dev', url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=256&q=80' },
  { label: 'Tools & Utilities', url: 'https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?auto=format&fit=crop&w=256&q=80' },
  { label: 'Music & Audio', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=256&q=80' },
  { label: 'Finance & Crypto', url: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=256&q=80' },
];

export const AddWebAppModal: React.FC<AddWebAppModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [iconMode, setIconMode] = useState<'url' | 'upload'>('url');
  const [iconUrl, setIconUrl] = useState('');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const [servers, setServers] = useState<ServerDraft[]>([
    { tempId: 'initial-1', url: '', category: 'Working' },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeIcon = iconMode === 'upload' ? uploadedImage : iconUrl;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setUploadedImage(reader.result as string);
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleAddServer = () => {
    setServers(prev => [
      ...prev,
      { tempId: 'server-' + Date.now() + Math.random(), url: '', category: 'Working' },
    ]);
  };

  const handleRemoveServer = (index: number) => {
    if (servers.length <= 1) {
      setError('At least one server link is required.');
      return;
    }
    setServers(prev => prev.filter((_, i) => i !== index));
    setError(null);
  };

  const handleMoveServer = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= servers.length) return;
    const newServers = [...servers];
    const [moved] = newServers.splice(index, 1);
    newServers.splice(targetIndex, 0, moved);
    setServers(newServers);
  };

  const handleServerChange = (index: number, field: 'url' | 'category', value: string) => {
    setServers(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 1. Validate Name
    if (!name.trim()) {
      setError('Please enter a Web App name.');
      return;
    }

    // 2. Validate Icon
    const finalIcon = activeIcon?.trim();
    if (!finalIcon) {
      setError('Please provide an image icon by uploading or entering an image URL.');
      return;
    }

    // 3. Validate Servers
    if (servers.length === 0) {
      setError('Please add at least one server link.');
      return;
    }

    for (let i = 0; i < servers.length; i++) {
      const s = servers[i];
      const trimmedUrl = s.url.trim();
      if (!trimmedUrl) {
        setError(`Server ${i + 1}: URL cannot be empty.`);
        return;
      }
      try {
        const parsed = new URL(trimmedUrl);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error();
        }
      } catch {
        setError(`Server ${i + 1}: Please provide a valid URL beginning with http:// or https://`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: name.trim(),
        icon: finalIcon,
        servers: servers.map(s => ({
          url: s.url.trim(),
          category: s.category,
        })),
      });
      // Reset & close
      setName('');
      setIconUrl('');
      setUploadedImage(null);
      setServers([{ tempId: 'initial-1', url: '', category: 'Working' }]);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create Web App');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        id="add-webapp-modal-backdrop"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !isSubmitting) onClose();
        }}
      >
        <motion.div
          id="add-webapp-modal-card"
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-2xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col my-8 max-h-[92vh]"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 shrink-0">
            <div>
              <h2 id="add-modal-title" className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Add New Web App
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                Register a web application with dynamic server routes
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div id="add-form-error" className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium">
                {error}
              </div>
            )}

            {/* Web App Name */}
            <div>
              <label htmlFor="app-name-input" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2">
                Web App Name *
              </label>
              <input
                id="app-name-input"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Study App, Movie App, Tools Portal"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Web App Icon */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Web App Icon *
                </label>
                <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setIconMode('url')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      iconMode === 'url'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
                    }`}
                  >
                    Image URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setIconMode('upload')}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      iconMode === 'upload'
                        ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                        : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
                    }`}
                  >
                    Upload Image
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Preview Box */}
                <div className="w-20 h-20 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center shrink-0 shadow-inner">
                  {activeIcon ? (
                    <img
                      src={activeIcon}
                      alt="Icon preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-neutral-400" />
                  )}
                </div>

                {/* Input Controls */}
                <div className="flex-1 w-full space-y-2">
                  {iconMode === 'url' ? (
                    <div>
                      <div className="relative">
                        <LinkIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="app-icon-url-input"
                          type="url"
                          value={iconUrl}
                          onChange={(e) => setIconUrl(e.target.value)}
                          placeholder="https://images.unsplash.com/..."
                          className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                        />
                      </div>

                      {/* Quick Presets */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" /> Quick presets:
                        </span>
                        {PRESET_ICONS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setIconUrl(preset.url)}
                            className="px-2 py-0.5 text-[11px] rounded-md bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 transition-colors cursor-pointer"
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label
                        htmlFor="app-icon-file-input"
                        className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-neutral-200 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-400 rounded-xl cursor-pointer bg-neutral-50/60 dark:bg-neutral-800/50 transition-colors"
                      >
                        <Upload className="w-6 h-6 text-neutral-400 mb-1" />
                        <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                          {uploadedImage ? 'Change uploaded image' : 'Click to browse or drag and drop'}
                        </span>
                        <span className="text-[10px] text-neutral-400 mt-0.5">
                          PNG, JPG, SVG up to 5MB
                        </span>
                        <input
                          id="app-icon-file-input"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Servers Section */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider block">
                    Server Links ({servers.length})
                  </label>
                  <span className="text-[11px] text-neutral-400">
                    Names are automatically derived dynamically (Server 1, Server 2...)
                  </span>
                </div>

                <button
                  id="add-another-server-btn"
                  type="button"
                  onClick={handleAddServer}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Another Link</span>
                </button>
              </div>

              {/* Dynamic Servers List */}
              <div className="space-y-3.5">
                {servers.map((server, index) => {
                  const derivedName = `Server ${index + 1}`;

                  return (
                    <div
                      key={server.tempId}
                      className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 transition-all"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 px-2 py-0.5 rounded-md bg-white dark:bg-neutral-700 border border-neutral-200 dark:border-neutral-600">
                            {derivedName}
                          </span>
                          <CategoryBadge category={server.category} size="sm" showIcon={false} />
                        </div>

                        {/* Reorder and Delete Controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={index === 0}
                            onClick={() => handleMoveServer(index, 'up')}
                            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer"
                            title="Move up"
                            aria-label="Move up"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={index === servers.length - 1}
                            onClick={() => handleMoveServer(index, 'down')}
                            className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 disabled:opacity-20 cursor-pointer"
                            title="Move down"
                            aria-label="Move down"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveServer(index)}
                            disabled={servers.length <= 1}
                            className="p-1 text-rose-500 hover:text-rose-700 disabled:opacity-20 cursor-pointer ml-1"
                            title="Remove server"
                            aria-label="Remove server"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                            Destination URL
                          </label>
                          <input
                            type="url"
                            required
                            value={server.url}
                            onChange={(e) => handleServerChange(index, 'url', e.target.value)}
                            placeholder="https://server1.example.com"
                            className="w-full px-3.5 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium uppercase tracking-wider text-neutral-400 mb-1">
                            Status Category
                          </label>
                          <select
                            value={server.category}
                            onChange={(e) => handleServerChange(index, 'category', e.target.value as ServerCategory)}
                            className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all cursor-pointer"
                          >
                            <option value="Working">Working</option>
                            <option value="Error">Error</option>
                            <option value="Some Error">Some Error</option>
                            <option value="Unfilter">Unfilter</option>
                            <option value="Testing">Testing</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-sm font-medium text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="save-new-webapp-btn"
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md hover:shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Save Web App</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
