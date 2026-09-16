import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AppWindow, Layers } from 'lucide-react';
import { PublicWebApp } from '../types.ts';

interface WebAppCardProps {
  webApp: PublicWebApp;
  onClick: (webApp: PublicWebApp) => void;
}

export const WebAppCard: React.FC<WebAppCardProps> = ({ webApp, onClick }) => {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.button
      id={`webapp-card-${webApp.id}`}
      type="button"
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onClick(webApp)}
      className="group relative flex flex-col items-center justify-center p-6 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm hover:shadow-xl hover:border-neutral-300 dark:hover:border-neutral-700 transition-all text-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 w-full"
    >
      {/* Visual Server Count indicator (subtle non-revealing pill) */}
      <div className="absolute top-3 right-3 text-[11px] font-medium text-neutral-400 dark:text-neutral-500 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Layers className="w-3 h-3" />
        <span>{webApp.servers.length}</span>
      </div>

      {/* App Icon */}
      <div className="relative w-20 h-20 mb-4 rounded-2xl overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center shadow-inner border border-neutral-200/50 dark:border-neutral-700/50 group-hover:shadow-md transition-shadow">
        {!imageError && webApp.icon ? (
          <img
            id={`webapp-icon-${webApp.id}`}
            src={webApp.icon}
            alt={`${webApp.name} icon`}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white">
            <AppWindow className="w-9 h-9" />
          </div>
        )}
      </div>

      {/* App Name */}
      <h3
        id={`webapp-title-${webApp.id}`}
        className="font-semibold text-lg text-neutral-900 dark:text-neutral-100 tracking-tight line-clamp-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
      >
        {webApp.name}
      </h3>

      <span className="mt-1 text-xs text-neutral-400 dark:text-neutral-500 font-normal">
        Click to view servers
      </span>
    </motion.button>
  );
};
