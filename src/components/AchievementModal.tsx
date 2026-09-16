import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Trophy, Calendar, Sparkles, Megaphone, Pin } from 'lucide-react';
import { Achievement, AchievementMessage } from '../types.ts';

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  message?: AchievementMessage | null;
  achievements: Achievement[];
  isLoading?: boolean;
}

export const AchievementModal: React.FC<AchievementModalProps> = ({
  isOpen,
  onClose,
  message,
  achievements,
  isLoading = false,
}) => {
  // Close on Escape key & lock document body scroll
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

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

  // Separate pinned and unpinned achievements
  const pinnedAchievements = achievements.filter((a) => Boolean(a.isPinned));
  const otherAchievements = achievements.filter((a) => !Boolean(a.isPinned));

  // Determine if Admin Message is present and non-empty
  const hasAdminMessage = Boolean(
    message && message.content && message.content.trim().length > 0
  );

  // Helper to render text with auto-detected URLs and preserve line breaks
  const renderTextWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return parts.map((part, i) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-500 break-all"
            onClick={(e) => e.stopPropagation()}
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="achievement-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            id="achievement-modal-card"
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            transition={{ type: 'spring', damping: 25, stiffness: 360 }}
            className="relative w-full max-w-xl bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Top Bar / Header */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-4 sm:py-5 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/70 dark:bg-neutral-900/70 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50 shadow-xs shrink-0">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="achievement-modal-title"
                    className="font-bold text-base sm:text-lg text-neutral-900 dark:text-neutral-100 tracking-tight leading-none flex items-center gap-1.5"
                  >
                    User's Achievement
                  </h3>
                  <p className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    Real Stories. Real Progress. Real Inspiration.
                  </p>
                </div>
              </div>

              <button
                id="achievement-close-btn"
                type="button"
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Feed */}
            <div
              id="achievement-scroll-container"
              className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6"
            >
              {isLoading ? (
                <div className="py-16 text-center space-y-3">
                  <div className="w-8 h-8 mx-auto border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    Loading achievements...
                  </p>
                </div>
              ) : (
                <>
                  {/* ============================================================ */}
                  {/* 1. ADMIN MESSAGE (FIRST - Always at the very top if present) */}
                  {/* ============================================================ */}
                  {hasAdminMessage && message && (
                    <div
                      id="achievement-admin-message-card"
                      className="rounded-2xl border border-amber-400/40 dark:border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/25 p-4 sm:p-5 space-y-3 shadow-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                          <Megaphone className="w-4 h-4" />
                        </div>
                        <h4
                          id="achievement-admin-message-title"
                          className="font-bold text-sm sm:text-base text-neutral-900 dark:text-neutral-100 tracking-tight"
                        >
                          {message.title || 'Important Message'}
                        </h4>
                      </div>

                      <div
                        id="achievement-admin-message-content"
                        className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap break-words font-medium pl-0.5"
                      >
                        {renderTextWithLinks(message.content)}
                      </div>
                    </div>
                  )}

                  {/* ============================================================ */}
                  {/* 2. PINNED ACHIEVEMENTS (SECOND - immediately below Message)  */}
                  {/* ============================================================ */}
                  {pinnedAchievements.length > 0 && (
                    <div id="pinned-achievements-container" className="space-y-4">
                      {pinnedAchievements.map((item, index) => {
                        const formattedDate = formatDate(item.createdAt);
                        return (
                          <article
                            key={item.id}
                            id={`achievement-card-pinned-${item.id}`}
                            className="rounded-2xl border border-amber-400/40 dark:border-amber-600/40 bg-neutral-50/80 dark:bg-neutral-850 p-3 sm:p-4.5 space-y-3.5 shadow-xs relative"
                          >
                            {/* Achievement Image */}
                            <div className="w-full overflow-hidden rounded-xl bg-neutral-900/90 dark:bg-neutral-950 border border-neutral-200/50 dark:border-neutral-800 flex items-center justify-center relative">
                              <img
                                src={item.imageUrl}
                                alt={`Pinned Achievement ${index + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full max-h-[380px] object-contain rounded-xl"
                                loading="lazy"
                              />
                            </div>

                            {/* Pinned Badge & Date */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-100/90 dark:bg-amber-950/90 border border-amber-300/80 dark:border-amber-700/80 px-2 py-0.5 rounded-md shadow-2xs">
                                    <Pin className="w-3 h-3 fill-amber-500 text-amber-500" />
                                    Pinned Achievement
                                  </span>
                                </div>

                                {formattedDate && (
                                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-neutral-400" />
                                    {formattedDate}
                                  </span>
                                )}
                              </div>

                              {/* Admin Comment Header & Body */}
                              <div className="space-y-1">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  Admin Comment:
                                </span>
                                <div className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap break-words font-medium pl-0.5">
                                  {renderTextWithLinks(item.comment)}
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {/* ============================================================ */}
                  {/* 3. OTHER / UNPINNED ACHIEVEMENTS (THIRD)                     */}
                  {/* ============================================================ */}
                  {otherAchievements.length > 0 && (
                    <div id="other-achievements-container" className="space-y-4">
                      {otherAchievements.map((item, index) => {
                        const formattedDate = formatDate(item.createdAt);
                        return (
                          <article
                            key={item.id}
                            id={`achievement-card-${item.id}`}
                            className="rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 p-3 sm:p-4.5 space-y-3.5 shadow-xs transition-all"
                          >
                            {/* Achievement Image */}
                            <div className="w-full overflow-hidden rounded-xl bg-neutral-900/90 dark:bg-neutral-950 border border-neutral-200/50 dark:border-neutral-800 flex items-center justify-center">
                              <img
                                src={item.imageUrl}
                                alt={`Achievement ${pinnedAchievements.length + index + 1}`}
                                referrerPolicy="no-referrer"
                                className="w-full max-h-[380px] object-contain rounded-xl"
                                loading="lazy"
                              />
                            </div>

                            {/* Details & Admin Comment */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                                  Admin Comment:
                                </span>

                                {formattedDate && (
                                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400 font-medium flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-neutral-400" />
                                    {formattedDate}
                                  </span>
                                )}
                              </div>

                              {/* Comment Body */}
                              <div className="text-xs sm:text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed whitespace-pre-wrap break-words font-medium pl-0.5">
                                {renderTextWithLinks(item.comment)}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}

                  {/* Empty state if no achievements at all */}
                  {achievements.length === 0 && !hasAdminMessage && (
                    <div
                      id="achievements-empty-state"
                      className="py-14 text-center px-4 space-y-3"
                    >
                      <div className="w-14 h-14 mx-auto rounded-2xl bg-neutral-100 dark:bg-neutral-800/70 text-neutral-400 flex items-center justify-center">
                        <Trophy className="w-7 h-7" />
                      </div>
                      <h4 className="font-semibold text-sm sm:text-base text-neutral-800 dark:text-neutral-200">
                        No achievements yet.
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                        Check back soon to see verified results and inspiring milestones achieved by our community.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Bottom Bar / Action Footer */}
            <div className="px-5 sm:px-6 py-3.5 sm:py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/70 shrink-0">
              <button
                id="achievement-modal-dismiss-btn"
                type="button"
                onClick={onClose}
                className="w-full py-2.5 sm:py-3 text-xs sm:text-sm font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-colors cursor-pointer shadow-sm text-center"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
