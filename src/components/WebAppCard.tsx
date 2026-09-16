import React, { useState } from 'react';
import { motion } from 'motion/react';
import { AppWindow, ArrowRight, Layers, Radio } from 'lucide-react';
import { PublicWebApp } from '../types.ts';

interface WebAppCardProps {
  webApp: PublicWebApp;
  onClick: (webApp: PublicWebApp) => void;
}

export const WebAppCard: React.FC<WebAppCardProps> = ({ webApp, onClick }) => {
  const [imageError, setImageError] = useState(false);
  const serverCount = webApp.servers ? webApp.servers.length : 0;
  const activeServers = webApp.servers ? webApp.servers.filter(s => s.isActive).length : 0;

  return (
    <motion.div
      whileHover={{ y: -6, transition: { duration: 0.22, ease: 'easeOut' } }}
      whileTap={{ scale: 0.98 }}
      className="w-full h-full"
    >
      <button
        id={`webapp-card-${webApp.id}`}
        type="button"
        onClick={() => onClick(webApp)}
        className="group relative flex flex-col items-center justify-between p-6 sm:p-7 w-full h-full text-center cursor-pointer select-none rounded-[20px] bg-neutral-900/55 backdrop-blur-xl border border-white/[0.08] hover:border-amber-400/40 transition-all duration-300 shadow-[0_8px_30px_rgba(0,0,0,0.45)] hover:shadow-[0_12px_35px_rgba(212,175,55,0.18)] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 overflow-hidden"
      >
        {/* Subtle Ambient Radial Glow on Hover */}
        <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.06] via-transparent to-amber-500/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

        {/* Top Active Status Chip */}
        <div className="w-full flex items-center justify-between text-[11px] font-medium text-neutral-400 mb-4 z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.06]">
            <Radio className={`w-3 h-3 ${activeServers > 0 ? 'text-emerald-400 animate-pulse' : 'text-neutral-500'}`} />
            <span className={activeServers > 0 ? 'text-emerald-300' : 'text-neutral-400'}>
              {activeServers > 0 ? 'Active' : 'Offline'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-neutral-400 text-xs">
            <Layers className="w-3.5 h-3.5 text-indigo-400/80" />
            <span>{serverCount}</span>
          </div>
        </div>

        {/* APP ICON (Centered, with glowing ambient ring) */}
        <div className="relative my-2 z-10">
          <div className="relative w-20 h-20 sm:w-22 sm:h-22 rounded-[18px] overflow-hidden bg-neutral-800/80 border border-white/[0.12] p-1 flex items-center justify-center shadow-inner group-hover:border-amber-400/50 group-hover:shadow-[0_0_20px_rgba(212,175,55,0.25)] transition-all duration-300">
            {!imageError && webApp.icon ? (
              <img
                id={`webapp-icon-${webApp.id}`}
                src={webApp.icon}
                alt={`${webApp.name} icon`}
                referrerPolicy="no-referrer"
                onError={() => setImageError(true)}
                className="w-full h-full object-cover rounded-[14px] group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full rounded-[14px] bg-gradient-to-br from-indigo-600 via-indigo-700 to-amber-600/80 text-white shadow-inner">
                <AppWindow className="w-9 h-9" />
              </div>
            )}
          </div>
        </div>

        {/* APPLICATION NAME (Centered, Clean Modern Typography) */}
        <div className="mt-3 w-full z-10">
          <h3
            id={`webapp-title-${webApp.id}`}
            className="font-bold text-lg sm:text-xl text-neutral-100 tracking-tight line-clamp-1 group-hover:text-amber-300 transition-colors duration-200"
          >
            {webApp.name}
          </h3>

          {/* Existing Server Info */}
          <p className="mt-1 text-xs text-neutral-400 font-normal">
            {serverCount} {serverCount === 1 ? 'server available' : 'servers available'}
          </p>
        </div>

        {/* VIEW SERVERS -> (Action Cue Button) */}
        <div className="mt-5 w-full z-10">
          <div className="w-full py-2.5 px-4 rounded-xl bg-white/[0.05] group-hover:bg-gradient-to-r group-hover:from-indigo-600/30 group-hover:to-amber-500/30 border border-white/[0.08] group-hover:border-amber-400/50 text-xs sm:text-sm font-medium text-neutral-200 group-hover:text-white flex items-center justify-center gap-2 transition-all duration-200 shadow-xs">
            <span>View Servers</span>
            <ArrowRight className="w-3.5 h-3.5 text-amber-400 group-hover:translate-x-1 transition-transform duration-200" />
          </div>
        </div>
      </button>
    </motion.div>
  );
};
