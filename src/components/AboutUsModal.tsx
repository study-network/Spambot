import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Info, ShieldCheck, Heart } from 'lucide-react';
import { SiteSettings } from '../types.ts';

interface AboutUsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SiteSettings | null;
}

export const AboutUsModal: React.FC<AboutUsModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  // Close on Escape key
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

  const title = settings?.aboutTitle || 'About Us';
  const description = settings?.aboutDescription || 
    'Welcome to Web App Link Manager. We provide verified multi-server link routing with real-time status indicators, high-speed failover, and zero downtime connection to your favourite web applications.';

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="about-us-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            id="about-us-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50 shadow-xs shrink-0">
                  <Info className="w-5 h-5" />
                </div>
                <div>
                  <h3 id="about-us-modal-title" className="font-bold text-lg text-neutral-900 dark:text-neutral-100 tracking-tight leading-none">
                    {title}
                  </h3>
                  <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                    Web App Link Manager
                  </span>
                </div>
              </div>

              <button
                id="about-us-close-btn"
                type="button"
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-4">
              <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-wrap">
                {description}
              </div>

              {/* Highlights badge box */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified Multi-Server Links
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 font-medium">
                  <Heart className="w-3.5 h-3.5 text-purple-500" />
                  Community Driven
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-end">
              <button
                id="about-us-modal-dismiss-btn"
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-neutral-200 transition-colors cursor-pointer"
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
