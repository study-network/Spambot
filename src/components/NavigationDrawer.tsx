import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, MessageCircle, Info, Sparkles, ExternalLink, Megaphone, Trophy } from 'lucide-react';
import { SiteSettings } from '../types.ts';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SiteSettings | null;
  onOpenAbout: () => void;
  onOpenAchievements: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  settings,
  onOpenAbout,
  onOpenAchievements,
}) => {
  // Close drawer on Escape key
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

  const telegramUrl = settings?.telegramUrl || '';
  const whatsappUrl = settings?.whatsappUrl || '';
  const happyTitle = settings?.happyTitle || 'Stay Happy';
  const happyMessage = settings?.happyMessage || 'Good things take time 💜';
  const happyIcon = settings?.happyIcon || '💜';
  const messageTitle = settings?.messageTitle || 'Message';
  const messageContent = settings?.messageContent || '';
  const hasMessage = Boolean(messageContent && messageContent.trim().length > 0);

  const handleTelegramClick = () => {
    if (telegramUrl) {
      window.open(telegramUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleWhatsAppClick = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="drawer-wrapper" className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop with fade */}
          <motion.div
            id="drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          />

          {/* Drawer Panel sliding from right to left */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10 pointer-events-none">
            <motion.div
              id="navigation-drawer-panel"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="w-screen max-w-sm sm:max-w-md bg-white dark:bg-neutral-900 border-l border-neutral-200/80 dark:border-neutral-800 shadow-2xl flex flex-col pointer-events-auto h-full"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
                <div>
                  <h2 id="drawer-title" className="font-bold text-lg text-neutral-900 dark:text-neutral-100 tracking-tight leading-snug">
                    Web App Link Manager
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                    Verified Multi-Server Launcher
                  </p>
                </div>

                <button
                  id="drawer-close-btn"
                  type="button"
                  onClick={onClose}
                  aria-label="Close menu"
                  className="p-2 rounded-xl text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content / Menu Items */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-3">
                {/* 1. Telegram Item */}
                <button
                  id="drawer-item-telegram"
                  type="button"
                  onClick={handleTelegramClick}
                  disabled={!telegramUrl}
                  className={`w-full group flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                    telegramUrl
                      ? 'border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 hover:border-sky-300 dark:hover:border-sky-800 hover:bg-sky-50/40 dark:hover:bg-sky-950/20 shadow-xs cursor-pointer'
                      : 'border-neutral-100 dark:border-neutral-800/40 bg-neutral-50 dark:bg-neutral-900/40 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center shadow-xs">
                      <Send className="w-5 h-5 -rotate-12 translate-x-[-1px] translate-y-[-1px]" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 block">
                        Telegram
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {telegramUrl ? 'Join our official channel' : 'Link not configured'}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-sky-500 transition-colors" />
                </button>

                {/* 2. WhatsApp Item */}
                <button
                  id="drawer-item-whatsapp"
                  type="button"
                  onClick={handleWhatsAppClick}
                  disabled={!whatsappUrl}
                  className={`w-full group flex items-center justify-between p-3.5 rounded-2xl border transition-all text-left ${
                    whatsappUrl
                      ? 'border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 shadow-xs cursor-pointer'
                      : 'border-neutral-100 dark:border-neutral-800/40 bg-neutral-50 dark:bg-neutral-900/40 opacity-50 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 block">
                        WhatsApp
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {whatsappUrl ? 'Chat on WhatsApp community' : 'Link not configured'}
                      </span>
                    </div>
                  </div>
                  <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                </button>

                {/* 3. User's Achievement Item */}
                <button
                  id="drawer-item-achievements"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAchievements();
                  }}
                  className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/40 dark:hover:bg-amber-950/20 shadow-xs transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center shadow-xs">
                      <Trophy className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 block">
                        User's Achievement
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        See what our users have achieved
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/80">
                    View
                  </span>
                </button>

                {/* 4. About Us Item */}
                <button
                  id="drawer-item-about"
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenAbout();
                  }}
                  className="w-full group flex items-center justify-between p-3.5 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/20 shadow-xs transition-all text-left cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
                      <Info className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 block">
                        About Us
                      </span>
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        Know more about our platform
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/80">
                    View
                  </span>
                </button>

                {/* 4. Admin Message / Notice Card (Directly below About Us) */}
                {hasMessage && (
                  <div
                    id="drawer-item-message"
                    className="w-full p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 shadow-xs transition-all text-left"
                  >
                    <div className="flex items-center gap-3.5 mb-2.5">
                      <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 dark:bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 flex items-center justify-center shadow-xs shrink-0">
                        <Megaphone className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-semibold text-sm text-neutral-900 dark:text-neutral-100 block">
                          {messageTitle || 'Message'}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap break-words font-normal">
                      {messageContent}
                    </div>
                  </div>
                )}
              </div>

              {/* STAY HAPPY SECTION (At the bottom of the drawer) */}
              <div
                id="drawer-stay-happy-section"
                className="p-5 mx-6 mb-6 rounded-2xl bg-gradient-to-br from-indigo-50/80 via-purple-50/70 to-pink-50/60 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/30 border border-purple-200/70 dark:border-purple-800/50 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl select-none shrink-0" role="img" aria-label="happy icon">
                    {happyIcon || '💜'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 text-purple-900 dark:text-purple-200 font-bold text-sm tracking-tight">
                      <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                      <span>{happyTitle}</span>
                    </div>
                    <p className="mt-1 text-xs text-purple-800/80 dark:text-purple-300/80 leading-relaxed break-words whitespace-pre-wrap">
                      {happyMessage}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      )}
    </AnimatePresence>
  );
};
