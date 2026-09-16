import React, { useState } from 'react';
import { PublicServer } from '../types.ts';
import { CategoryBadge } from './CategoryBadge.tsx';
import { ExternalLink, Loader2, Server } from 'lucide-react';
import { launchServer } from '../lib/api.ts';

interface ServerListProps {
  webAppId: string;
  servers: PublicServer[];
  onLaunched?: (serverName: string) => void;
  onError?: (msg: string) => void;
}

export const ServerList: React.FC<ServerListProps> = ({
  webAppId,
  servers,
  onLaunched,
  onError,
}) => {
  const [launchingId, setLaunchingId] = useState<string | null>(null);

  const handleServerClick = async (server: PublicServer) => {
    if (launchingId) return;

    try {
      setLaunchingId(server.id);
      const url = await launchServer(webAppId, server.id);
      
      if (!url) {
        throw new Error('No launch URL configured for this server');
      }

      // Safe window.open
      const newTab = window.open(url, '_blank', 'noopener,noreferrer');
      if (!newTab) {
        // Fallback for pop-up blockers
        window.location.href = url;
      }

      if (onLaunched) {
        onLaunched(server.name);
      }
    } catch (err: any) {
      console.error('Launch failed:', err);
      if (onError) {
        onError(err.message || 'Failed to open server link');
      }
    } finally {
      setLaunchingId(null);
    }
  };

  if (servers.length === 0) {
    return (
      <div id="servers-empty-state" className="text-center py-8 text-neutral-400 dark:text-neutral-500">
        <Server className="w-10 h-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm font-medium">No active server links available.</p>
      </div>
    );
  }

  return (
    <div id="servers-container" className="space-y-2.5">
      {servers.map((server) => {
        const isLaunching = launchingId === server.id;

        return (
          <button
            key={server.id}
            id={`server-btn-${server.id}`}
            type="button"
            disabled={isLaunching}
            onClick={() => handleServerClick(server)}
            className="group w-full flex items-center justify-between p-3.5 bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl border border-neutral-200/70 dark:border-neutral-700/60 transition-all text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 min-h-[52px]"
          >
            {/* Left: Server Name (Server 1, Server 2, etc.) */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white dark:bg-neutral-700 flex items-center justify-center text-neutral-600 dark:text-neutral-300 shadow-xs border border-neutral-200/60 dark:border-neutral-600/60 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 transition-colors">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <span className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm sm:text-base group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {server.name}
                </span>
                <span className="block text-[11px] text-neutral-400 dark:text-neutral-500">
                  Click to launch safely
                </span>
              </div>
            </div>

            {/* Right: Category badge + Action status icon */}
            <div className="flex items-center gap-3">
              <CategoryBadge category={server.category} />
              
              <div className="text-neutral-400 group-hover:text-indigo-600 dark:text-neutral-500 dark:group-hover:text-indigo-400 transition-colors">
                {isLaunching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : (
                  <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
