import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trophy, 
  Edit2, 
  Trash2, 
  Calendar, 
  Megaphone, 
  Pin, 
  PinOff,
  CheckCircle2, 
  Loader2,
  Sparkles
} from 'lucide-react';
import { Achievement, AchievementMessage } from '../types.ts';

interface AchievementAdminSectionProps {
  achievements: Achievement[];
  isLoading: boolean;
  onOpenAddModal: () => void;
  onOpenEditModal: (achievement: Achievement) => void;
  onDeleteAchievement: (id: string) => void;
  message?: AchievementMessage | null;
  onSaveMessage?: (payload: { title: string; content: string }) => Promise<void>;
  onTogglePin?: (id: string, isPinned: boolean) => Promise<void>;
}

export const AchievementAdminSection: React.FC<AchievementAdminSectionProps> = ({
  achievements,
  isLoading,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteAchievement,
  message,
  onSaveMessage,
  onTogglePin,
}) => {
  const [messageTitle, setMessageTitle] = useState(message?.title || 'Important Message');
  const [messageContent, setMessageContent] = useState(message?.content || '');
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [messageSaveSuccess, setMessageSaveSuccess] = useState(false);
  const [togglingPinId, setTogglingPinId] = useState<string | null>(null);

  useEffect(() => {
    if (message) {
      setMessageTitle(message.title ?? 'Important Message');
      setMessageContent(message.content ?? '');
    }
  }, [message]);

  const handleMessageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSaveMessage) return;
    try {
      setIsSavingMessage(true);
      setMessageSaveSuccess(false);
      await onSaveMessage({
        title: messageTitle.trim(),
        content: messageContent.trim(),
      });
      setMessageSaveSuccess(true);
      setTimeout(() => setMessageSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save message:', err);
    } finally {
      setIsSavingMessage(false);
    }
  };

  const handleTogglePinClick = async (item: Achievement) => {
    if (!onTogglePin) return;
    try {
      setTogglingPinId(item.id);
      await onTogglePin(item.id, !item.isPinned);
    } catch (err) {
      console.error('Failed to toggle pin:', err);
    } finally {
      setTogglingPinId(null);
    }
  };

  const formatDate = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div id="admin-achievements-section" className="space-y-8">
      {/* 1. ADMIN ACHIEVEMENT MESSAGE SECTION */}
      <div 
        id="admin-achievement-message-card"
        className="bg-white dark:bg-neutral-900 p-5 sm:p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs space-y-5"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-xs shrink-0">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h3 id="achievement-message-section-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight flex items-center gap-2">
                Achievement Message
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                This notice appears at the top of the User's Achievement viewer, visually and logically separate from achievement cards.
              </p>
            </div>
          </div>

          {messageSaveSuccess && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Message Saved!
            </span>
          )}
        </div>

        <form onSubmit={handleMessageSubmit} className="space-y-4">
          <div>
            <label 
              htmlFor="achievement-msg-title-input" 
              className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5"
            >
              Message Title
            </label>
            <input
              id="achievement-msg-title-input"
              type="text"
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              placeholder="e.g. Important Message"
              className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs"
            />
          </div>

          <div>
            <label 
              htmlFor="achievement-msg-content-input" 
              className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-1.5"
            >
              Message Content
            </label>
            <textarea
              id="achievement-msg-content-input"
              rows={4}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Keep working hard and stay consistent.&#10;Your hard work will definitely pay off.&#10;Never give up on your goals.&#10;Keep learning and improving every day. ❤️"
              className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-xs sm:text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-xs leading-relaxed resize-y"
            />
            <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
              Supports multiple lines and emojis. If left blank, this section will be hidden in the public achievement viewer.
            </p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              id="save-achievement-message-btn"
              type="submit"
              disabled={isSavingMessage}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSavingMessage ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save / Update Message</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 2. ACHIEVEMENTS POSTS SECTION */}
      <div className="space-y-4">
        {/* Header & Add Button */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-neutral-900 p-5 sm:p-6 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-xs">
                <Trophy className="w-5 h-5" />
              </div>
              <h2 id="admin-achievements-title" className="text-xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                Achievements ({achievements.length})
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
              Upload proof photos and congratulatory comments. Pinned achievements appear at the top.
            </p>
          </div>

          <button
            id="admin-add-achievement-btn"
            type="button"
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add Achievement</span>
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="py-20 text-center space-y-3 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
            <div className="w-8 h-8 mx-auto border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
              Loading achievements...
            </p>
          </div>
        ) : achievements.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center space-y-4 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                No achievements published yet
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto">
                Add achievements to celebrate user milestones. They will appear immediately on the public side under User's Achievement.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add First Achievement</span>
            </button>
          </div>
        ) : (
          /* Achievements List */
          <div className="grid grid-cols-1 gap-4">
            {achievements.map((item, index) => {
              const formattedDate = formatDate(item.createdAt);
              const isPinned = Boolean(item.isPinned);
              const isTogglingPin = togglingPinId === item.id;

              return (
                <div
                  key={item.id}
                  id={`admin-achievement-item-${item.id}`}
                  className={`p-4 sm:p-5 bg-white dark:bg-neutral-900 rounded-2xl border transition-all shadow-xs flex flex-col md:flex-row gap-4 sm:gap-5 items-start md:items-center justify-between ${
                    isPinned 
                      ? 'border-amber-400/50 dark:border-amber-600/50 ring-1 ring-amber-400/20' 
                      : 'border-neutral-200/80 dark:border-neutral-800'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center flex-1 min-w-0 w-full">
                    {/* Thumbnail */}
                    <div className="w-full sm:w-28 h-32 sm:h-24 rounded-xl overflow-hidden bg-neutral-900/90 border border-neutral-200 dark:border-neutral-800 shrink-0 flex items-center justify-center relative">
                      <img
                        src={item.imageUrl}
                        alt={`Achievement ${index + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      {isPinned && (
                        <div className="absolute top-1.5 left-1.5 p-1 rounded-md bg-amber-500 text-white shadow-xs">
                          <Pin className="w-3 h-3 fill-white" />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 bg-neutral-100 dark:bg-neutral-800 px-2.5 py-0.5 rounded-md">
                          Achievement #{index + 1}
                        </span>

                        {/* Status: Pinned or Not Pinned */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-neutral-400 font-medium">Status:</span>
                          {isPinned ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-800 px-2 py-0.5 rounded-md">
                              <Pin className="w-3 h-3 fill-amber-500 text-amber-500" />
                              Pinned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                              Not Pinned
                            </span>
                          )}
                        </div>

                        {formattedDate && (
                          <span className="text-[11px] text-neutral-400 font-medium flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formattedDate}
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words leading-relaxed font-normal">
                        {item.comment}
                      </p>
                    </div>
                  </div>

                  {/* Actions: [Edit] [Pin/Unpin] [Delete] */}
                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end pt-3 sm:pt-0 border-t sm:border-t-0 border-neutral-100 dark:border-neutral-800 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(item)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 hover:text-indigo-600 dark:hover:text-indigo-400 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/70 dark:hover:bg-neutral-700 rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>

                    {/* Pin / Unpin Button */}
                    <button
                      type="button"
                      disabled={isTogglingPin}
                      onClick={() => handleTogglePinClick(item)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors cursor-pointer ${
                        isPinned
                          ? 'text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-950/60 hover:bg-amber-200/80 dark:hover:bg-amber-900/60 border border-amber-300 dark:border-amber-800'
                          : 'text-neutral-700 dark:text-neutral-300 bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200/70 dark:hover:bg-neutral-700'
                      }`}
                      title={isPinned ? 'Unpin from top' : 'Pin to top'}
                    >
                      {isTogglingPin ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isPinned ? (
                        <>
                          <PinOff className="w-3.5 h-3.5" />
                          <span>Unpin</span>
                        </>
                      ) : (
                        <>
                          <Pin className="w-3.5 h-3.5 text-amber-500" />
                          <span>Pin</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onDeleteAchievement(item.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 rounded-xl transition-colors cursor-pointer"
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
      </div>
    </div>
  );
};
