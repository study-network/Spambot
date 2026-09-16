import React, { useState, useEffect } from 'react';
import { SiteSettings, NoticeMessage, AdminPermission } from '../types.ts';
import { 
  Megaphone, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { FormattedTextWithLinks } from './FormattedTextWithLinks.tsx';
import { ConfirmDialog } from './ConfirmDialog.tsx';
import { MessageModal } from './MessageModal.tsx';
import {
  fetchAdminMessages,
  createMessage,
  updateMessage,
  deleteMessage,
  publishMessage,
  reorderMessages
} from '../lib/api.ts';

interface MessageNoticeFormProps {
  settings: SiteSettings | null;
  onSave?: (payload: Partial<SiteSettings>) => Promise<void>;
  userPermissions?: AdminPermission[];
  isMainAdmin?: boolean;
}

export const MessageNoticeForm: React.FC<MessageNoticeFormProps> = ({
  settings,
  onSave,
  userPermissions,
  isMainAdmin = false,
}) => {
  // Permission checks
  const canViewMessages = isMainAdmin || (userPermissions ? userPermissions.includes('VIEW_MESSAGES') : true);
  const canAddMessage = isMainAdmin || (userPermissions ? userPermissions.includes('ADD_MESSAGE') : true);
  const canEditMessage = isMainAdmin || (userPermissions ? userPermissions.includes('EDIT_MESSAGE') : true);
  const canDeleteMessage = isMainAdmin || (userPermissions ? userPermissions.includes('DELETE_MESSAGE') : true);
  const canPublishMessage = isMainAdmin || (userPermissions ? userPermissions.includes('PUBLISH_MESSAGE') : true);
  const canReorderMessages = isMainAdmin || (userPermissions ? userPermissions.includes('REORDER_MESSAGES') : true);
  const canManageLinks = isMainAdmin || (userPermissions ? userPermissions.includes('MANAGE_MESSAGE_LINKS') : true);

  // Notice messages state
  const [messages, setMessages] = useState<NoticeMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<NoticeMessage | null>(null);

  // Delete confirmation
  const [deletingMessage, setDeletingMessage] = useState<NoticeMessage | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Legacy single message in Site Settings
  const [showLegacyBanner, setShowLegacyBanner] = useState(false);
  const [legacyTitle, setLegacyTitle] = useState('Important Message');
  const [legacyContent, setLegacyContent] = useState('');
  const [isSavingLegacy, setIsSavingLegacy] = useState(false);
  const [legacySuccess, setLegacySuccess] = useState(false);
  const [legacyError, setLegacyError] = useState<string | null>(null);

  // Load notices
  const loadMessages = async () => {
    setLoadingMessages(true);
    setMessagesError(null);
    try {
      const data = await fetchAdminMessages();
      setMessages(data);
    } catch (err: any) {
      setMessagesError(err.message || 'Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  // Sync legacy settings
  useEffect(() => {
    if (settings) {
      setLegacyTitle(settings.messageTitle ?? 'Important Message');
      setLegacyContent(settings.messageContent ?? '');
    }
  }, [settings]);

  // Handle open add / edit modal
  const handleOpenAdd = () => {
    setEditingMessage(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (msg: NoticeMessage) => {
    setEditingMessage(msg);
    setIsModalOpen(true);
  };

  const handleSaveMessage = async (data: {
    id?: string;
    title: string;
    content: string;
    isPublished: boolean;
    linkUrl?: string;
    linkLabel?: string;
  }) => {
    if (data.id) {
      await updateMessage(data.id, data);
    } else {
      await createMessage(data);
    }
    await loadMessages();
  };

  const handleTogglePublish = async (msg: NoticeMessage) => {
    if (!canPublishMessage) return;
    try {
      await publishMessage(msg.id, !msg.isPublished);
      await loadMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to update message status');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingMessage) return;
    setIsDeleting(true);
    try {
      await deleteMessage(deletingMessage.id);
      setDeletingMessage(null);
      await loadMessages();
    } catch (err: any) {
      alert(err.message || 'Failed to delete message');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMoveMessage = async (index: number, direction: 'up' | 'down') => {
    if (!canReorderMessages) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= messages.length) return;

    const reordered = [...messages];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(targetIdx, 0, moved);

    setMessages(reordered);
    try {
      await reorderMessages(reordered.map((m) => m.id));
    } catch (err) {
      loadMessages();
    }
  };

  const handleSaveLegacy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSave) return;
    setIsSavingLegacy(true);
    setLegacySuccess(false);
    setLegacyError(null);

    try {
      await onSave({
        messageTitle: legacyTitle.trim() || 'Important Message',
        messageContent: legacyContent,
      });
      setLegacySuccess(true);
      setTimeout(() => setLegacySuccess(false), 3500);
    } catch (err: any) {
      setLegacyError(err.message || 'Failed to update legacy banner');
    } finally {
      setIsSavingLegacy(false);
    }
  };

  return (
    <div id="message-notice-panel" className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 id="message-section-title" className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2.5">
            <Megaphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <span>Message / Notice Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Create, publish, reorder, and link announcements for users and visitors.
          </p>
        </div>

        {canAddMessage && (
          <button
            id="btn-add-notice-message"
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            <span>Add Notice / Message</span>
          </button>
        )}
      </div>

      {/* Main Notice Messages Section */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Notices List ({messages.length})
            </span>
            <span className="text-xs text-neutral-400">
              ({messages.filter(m => m.isPublished).length} published)
            </span>
          </div>
          <button
            type="button"
            onClick={loadMessages}
            disabled={loadingMessages}
            className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${loadingMessages ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {messagesError && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-2xl text-xs text-rose-700 dark:text-rose-300">
            {messagesError}
          </div>
        )}

        {loadingMessages ? (
          <div className="py-12 text-center text-sm text-neutral-400">
            Loading announcements and notices...
          </div>
        ) : messages.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-6">
            <Megaphone className="w-8 h-8 mx-auto text-neutral-400 mb-2 opacity-60" />
            <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              No notices or messages added yet
            </p>
            <p className="text-xs text-neutral-400 mt-1 mb-4">
              Publish announcements, update alerts, or maintenance notes with custom buttons.
            </p>
            {canAddMessage && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/60 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/50 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create First Notice</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3.5">
            {messages.map((msg, index) => (
              <div
                key={msg.id}
                id={`notice-item-${msg.id}`}
                className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                  msg.isPublished
                    ? 'bg-neutral-50/70 dark:bg-neutral-800/50 border-neutral-200/80 dark:border-neutral-700/60 shadow-2xs'
                    : 'bg-neutral-100/40 dark:bg-neutral-800/20 border-neutral-200/40 dark:border-neutral-800/40 opacity-75'
                }`}
              >
                {/* Details */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                      {msg.title}
                    </h3>

                    {/* Status Badge */}
                    {canPublishMessage ? (
                      <button
                        type="button"
                        onClick={() => handleTogglePublish(msg)}
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                          msg.isPublished
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-200'
                        }`}
                        title={msg.isPublished ? 'Click to unpublish' : 'Click to publish'}
                      >
                        {msg.isPublished ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                        <span>{msg.isPublished ? 'Published' : 'Draft / Hidden'}</span>
                      </button>
                    ) : (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                          msg.isPublished
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 border-neutral-200 dark:border-neutral-700'
                        }`}
                      >
                        {msg.isPublished ? 'Published' : 'Draft / Hidden'}
                      </span>
                    )}

                    {msg.linkUrl && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium border border-indigo-200/50 dark:border-indigo-800/50">
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>{msg.linkLabel || 'Link Attached'}</span>
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-300 line-clamp-2 leading-relaxed font-sans">
                    {msg.content}
                  </p>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    disabled={!canReorderMessages || index === 0}
                    onClick={() => handleMoveMessage(index, 'up')}
                    className="p-1.5 text-neutral-400 hover:text-neutral-200 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    title="Move Up"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={!canReorderMessages || index === messages.length - 1}
                    onClick={() => handleMoveMessage(index, 'down')}
                    className="p-1.5 text-neutral-400 hover:text-neutral-200 disabled:opacity-20 disabled:cursor-not-allowed rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700"
                    title="Move Down"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>

                  {canEditMessage && (
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(msg)}
                      className="p-2 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-colors ml-1 cursor-pointer"
                      title="Edit Notice"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}

                  {canDeleteMessage && (
                    <button
                      type="button"
                      onClick={() => setDeletingMessage(msg)}
                      className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors cursor-pointer"
                      title="Delete Notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legacy / Single Banner Fallback (Collapsible) */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-xs">
        <button
          type="button"
          onClick={() => setShowLegacyBanner(!showLegacyBanner)}
          className="w-full flex items-center justify-between text-left cursor-pointer"
        >
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              Site Settings Message Banner (Legacy Fallback)
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Quick banner text stored directly in global site configuration
            </p>
          </div>
          {showLegacyBanner ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </button>

        {showLegacyBanner && (
          <form onSubmit={handleSaveLegacy} className="mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 space-y-4">
            {legacySuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs text-emerald-700 dark:text-emerald-300">
                Banner updated successfully!
              </div>
            )}
            {legacyError && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl text-xs text-rose-700 dark:text-rose-300">
                {legacyError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Banner Title
              </label>
              <input
                type="text"
                value={legacyTitle}
                onChange={(e) => setLegacyTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Banner Content
              </label>
              <textarea
                rows={3}
                value={legacyContent}
                onChange={(e) => setLegacyContent(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 resize-none font-sans"
              />
            </div>

            <button
              type="submit"
              disabled={isSavingLegacy}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSavingLegacy ? 'Saving...' : 'Save Banner'}
            </button>
          </form>
        )}
      </div>

      {/* Add / Edit Modal */}
      <MessageModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveMessage}
        message={editingMessage}
        canManageLinks={canManageLinks}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingMessage}
        title="Delete Notice / Message"
        message={
          deletingMessage
            ? `Are you sure you want to delete "${deletingMessage.title}"? This announcement will be permanently removed.`
            : ''
        }
        confirmText="Yes, Delete Notice"
        cancelText="Cancel"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => {
          if (!isDeleting) setDeletingMessage(null);
        }}
      />
    </div>
  );
};
