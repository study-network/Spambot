import React, { useState, useEffect } from 'react';
import { X, Megaphone, Link as LinkIcon, Sparkles } from 'lucide-react';
import { NoticeMessage } from '../types.ts';

interface MessageModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: {
    id?: string;
    title: string;
    content: string;
    isPublished: boolean;
    linkUrl?: string;
    linkLabel?: string;
  }) => Promise<void>;
  message?: NoticeMessage | null;
  canManageLinks?: boolean;
}

export const MessageModal: React.FC<MessageModalProps> = ({
  isOpen,
  onClose,
  onSave,
  message,
  canManageLinks = true,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkLabel, setLinkLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setTitle(message.title || '');
      setContent(message.content || '');
      setIsPublished(message.isPublished ?? true);
      setLinkUrl(message.linkUrl || '');
      setLinkLabel(message.linkLabel || '');
    } else {
      setTitle('');
      setContent('');
      setIsPublished(true);
      setLinkUrl('');
      setLinkLabel('');
    }
    setError(null);
  }, [message, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Message title is required');
      return;
    }
    if (!content.trim()) {
      setError('Message content is required');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await onSave({
        id: message?.id,
        title: title.trim(),
        content: content.trim(),
        isPublished,
        linkUrl: canManageLinks && linkUrl.trim() ? linkUrl.trim() : undefined,
        linkLabel: canManageLinks && linkLabel.trim() ? linkLabel.trim() : undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save notice message');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadTemplate = () => {
    setTitle('Scheduled Maintenance & Updates');
    setContent('We are constantly improving your experience! Some servers are being updated for faster performance.\n\nThank you for learning with us.');
    if (canManageLinks) {
      setLinkUrl('https://t.me/');
      setLinkLabel('Join Channel for Updates');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div 
        id="message-notice-modal"
        className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-900 dark:text-neutral-100">
                {message ? 'Edit Notice / Message' : 'Add Notice / Message'}
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                {message ? 'Update existing notice details' : 'Post a new announcement or notice'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300">
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Notice Title <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleLoadTemplate}
                className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Sample Template</span>
              </button>
            </div>
            <input
              id="notice-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Server Maintenance Notice"
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
              Message Content <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="notice-content-textarea"
              required
              rows={4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter announcement details, guidelines, or notices..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none font-sans"
            />
            <p className="text-[11px] text-neutral-400 mt-1">
              Supports paragraphs and standard markdown-style URLs.
            </p>
          </div>

          {/* Publish / Visibility */}
          <div className="flex items-center justify-between p-3 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/60">
            <div>
              <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                Publish Immediately
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block">
                Visible to users on public site when active
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="notice-publish-toggle"
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-neutral-200 peer-focus:outline-none rounded-full peer dark:bg-neutral-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>

          {/* Message Link (Button / URL) */}
          {canManageLinks && (
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-800/40 border border-neutral-200/80 dark:border-neutral-700/60 space-y-3">
              <div className="flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-indigo-500" />
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Optional Action Button / Link
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Button Label
                  </label>
                  <input
                    id="notice-link-label-input"
                    type="text"
                    value={linkLabel}
                    onChange={(e) => setLinkLabel(e.target.value)}
                    placeholder="e.g. Join Channel"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                    Target URL
                  </label>
                  <input
                    id="notice-link-url-input"
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://t.me/example"
                    className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Footer Buttons */}
          <div className="pt-3 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
            >
              Cancel
            </button>
            <button
              id="notice-modal-submit-btn"
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-all disabled:opacity-60"
            >
              {loading ? 'Saving...' : message ? 'Save Changes' : 'Create Notice'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
