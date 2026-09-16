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

    if (!server.isActive) {
      if (onError) {
        onError(`${server.name} is currently inactive and cannot be launched.`);
      }
      return;
    }

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
            disabled={isLaunching || !server.isActive}
            onClick={() => handleServerClick(server)}
            className={`group w-full flex items-center justify-between p-3.5 rounded-xl border transition-all text-left min-h-[52px] ${
              server.isActive
                ? 'bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 border-neutral-200/70 dark:border-neutral-700/60 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'
                : 'bg-neutral-100/60 dark:bg-neutral-900/40 border-neutral-200/50 dark:border-neutral-800/50 opacity-75 cursor-not-allowed'
            }`}
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
                {/* Category • Active / Inactive on the same line, smaller than server name */}
                <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                  <span>{server.category} • </span>
                  <span className={server.isActive ? 'text-emerald-600 dark:text-emerald-400 font-medium' : 'text-neutral-400 dark:text-neutral-500 font-medium'}>
                    {server.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Category badge with status + Action icon */}
            <div className="flex items-center gap-3">
              <CategoryBadge 
                category={server.category} 
                status={server.isActive ? 'Active' : 'Inactive'} 
              />
              
              <div className="text-neutral-400 group-hover:text-indigo-600 dark:text-neutral-500 dark:group-hover:text-indigo-400 transition-colors">
                {isLaunching ? (
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : server.isActive ? (
                  <ExternalLink className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 px-1.5 py-0.5 rounded bg-neutral-200/60 dark:bg-neutral-700/60">
                    OFF
                  </span>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
