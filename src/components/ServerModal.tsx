import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Server, AppWindow } from 'lucide-react';
import { PublicWebApp } from '../types.ts';
import { ServerList } from './ServerList.tsx';

interface ServerModalProps {
  webApp: PublicWebApp | null;
  onClose: () => void;
  onLaunched?: (serverName: string) => void;
  onError?: (msg: string) => void;
}

export const ServerModal: React.FC<ServerModalProps> = ({
  webApp,
  onClose,
  onLaunched,
  onError,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (webApp) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [webApp, onClose]);

  return (
    <AnimatePresence>
      {webApp && (
        <div
          id="server-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            id="server-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center border border-neutral-200 dark:border-neutral-700 shadow-xs shrink-0">
                  {webApp.icon ? (
                    <img
                      src={webApp.icon}
                      alt={webApp.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <AppWindow className="w-6 h-6 text-indigo-500" />
                  )}
                </div>
                <div>
                  <h2
                    id="server-modal-title"
                    className="font-bold text-lg text-neutral-900 dark:text-neutral-100 tracking-tight"
                  >
                    {webApp.name}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Select a server to connect
                  </p>
                </div>
              </div>

              <button
                id="server-modal-close-btn"
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4 text-neutral-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    Servers ({webApp.servers.length})
                  </span>
                </div>
                <span className="text-[11px] text-neutral-400">
                  Status verified
                </span>
              </div>

              <ServerList
                webAppId={webApp.id}
                servers={webApp.servers}
                onLaunched={onLaunched}
                onError={onError}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-neutral-50 dark:bg-neutral-900/80 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-400 dark:text-neutral-500">
              <span>Opens securely in a new browser tab</span>
              <button
                id="server-modal-done-btn"
                type="button"
                onClick={onClose}
                className="px-3.5 py-1.5 font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
