import React from 'react';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { SocialLink, SocialPlatform } from '../types.ts';
import { PLATFORM_INFO } from './SocialIcon.tsx';

interface SocialLinksEditorProps {
  links: SocialLink[];
  onChange: (links: SocialLink[]) => void;
  maxLinks?: number;
}

export const SocialLinksEditor: React.FC<SocialLinksEditorProps> = ({
  links = [],
  onChange,
  maxLinks = 10,
}) => {
  const handleAddLink = () => {
    if (links.length >= maxLinks) return;
    const newLink: SocialLink = {
      id: `link-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      platform: 'telegram',
      url: '',
    };
    onChange([...links, newLink]);
  };

  const handleUpdate = (index: number, field: keyof SocialLink, value: string) => {
    const updated = [...links];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    onChange(updated);
  };

  const handleRemove = (index: number) => {
    const updated = links.filter((_, i) => i !== index);
    onChange(updated);
  };

  const platformKeys = Object.keys(PLATFORM_INFO);

  return (
    <div id="social-links-editor-container" className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Social Links <span className="text-slate-500 font-normal lowercase">(optional)</span>
        </label>
        {links.length < maxLinks && (
          <button
            id="btn-add-social-link"
            type="button"
            onClick={handleAddLink}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-cyan-400 bg-cyan-950/40 border border-cyan-500/30 rounded-lg hover:bg-cyan-900/40 hover:border-cyan-400/50 transition-colors duration-150"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Social Link</span>
          </button>
        )}
      </div>

      {links.length === 0 ? (
        <div className="p-3 border border-dashed border-slate-800 rounded-xl bg-slate-900/30 text-center">
          <p className="text-xs text-slate-400">
            No social links added yet. Social links are optional.
          </p>
          <button
            id="btn-add-first-social-link"
            type="button"
            onClick={handleAddLink}
            className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <Plus className="w-3 h-3" />
            <span>Add a social link</span>
          </button>
        </div>
      ) : (
        <div className="space-y-2.5">
          {links.map((link, index) => {
            const pKey = (link.platform || 'website').toLowerCase();
            const info = PLATFORM_INFO[pKey] || PLATFORM_INFO.custom;
            const IconComp = info.icon;
            const isCustom = pKey === 'custom';

            const hasError = link.url && !link.url.startsWith('http://') && !link.url.startsWith('https://');

            return (
              <div
                key={link.id || index}
                className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 hover:border-slate-700/80 transition-all space-y-2"
              >
                <div className="flex items-center gap-2">
                  {/* Platform Selector with icon */}
                  <div className="relative min-w-[130px] sm:min-w-[150px]">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <IconComp className={`w-3.5 h-3.5 ${info.colorClass}`} />
                    </div>
                    <select
                      id={`social-platform-select-${index}`}
                      value={pKey}
                      onChange={(e) => handleUpdate(index, 'platform', e.target.value)}
                      className="w-full pl-8 pr-6 py-1.5 text-xs font-medium bg-slate-950 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-400 appearance-none cursor-pointer"
                    >
                      {platformKeys.map((k) => (
                        <option key={k} value={k}>
                          {PLATFORM_INFO[k].label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* URL Input */}
                  <div className="flex-1 min-w-0">
                    <input
                      id={`social-url-input-${index}`}
                      type="url"
                      value={link.url}
                      onChange={(e) => handleUpdate(index, 'url', e.target.value)}
                      placeholder={info.placeholder}
                      className={`w-full px-3 py-1.5 text-xs bg-slate-950 border rounded-lg text-slate-100 placeholder:text-slate-600 focus:outline-none transition-colors ${
                        hasError
                          ? 'border-red-500/80 focus:ring-1 focus:ring-red-400'
                          : 'border-slate-700 focus:ring-1 focus:ring-cyan-400'
                      }`}
                    />
                  </div>

                  {/* Remove Button */}
                  <button
                    id={`social-link-remove-${index}`}
                    type="button"
                    onClick={() => handleRemove(index)}
                    title="Remove link"
                    aria-label="Remove link"
                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Custom platform name row if platform is custom */}
                {isCustom && (
                  <div className="pl-1 pr-1">
                    <input
                      id={`social-custom-name-${index}`}
                      type="text"
                      value={link.customName || ''}
                      onChange={(e) => handleUpdate(index, 'customName', e.target.value)}
                      placeholder="Display label (e.g. Portfolio, Discord, Twitch)"
                      className="w-full px-3 py-1 text-xs bg-slate-950/80 border border-slate-700/80 rounded-lg text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                )}

                {hasError && (
                  <p className="text-[11px] text-red-400/90 pl-1">
                    URL must start with http:// or https://
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
