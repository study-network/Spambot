import React, { useState, useEffect } from 'react';
import { SiteSettings } from '../types.ts';
import { Send, MessageCircle, Info, Heart, Save, Check, RefreshCw } from 'lucide-react';

interface SiteSettingsFormProps {
  settings: SiteSettings | null;
  onSave: (payload: Partial<SiteSettings>) => Promise<void>;
}

export const SiteSettingsForm: React.FC<SiteSettingsFormProps> = ({
  settings,
  onSave,
}) => {
  const [telegramUrl, setTelegramUrl] = useState('');
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [aboutTitle, setAboutTitle] = useState('About Us');
  const [aboutDescription, setAboutDescription] = useState('');
  const [happyTitle, setHappyTitle] = useState('Stay Happy');
  const [happyMessage, setHappyMessage] = useState('Good things take time 💜');
  const [happyIcon, setHappyIcon] = useState('💜');

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state when props change
  useEffect(() => {
    if (settings) {
      setTelegramUrl(settings.telegramUrl || '');
      setWhatsappUrl(settings.whatsappUrl || '');
      setAboutTitle(settings.aboutTitle || 'About Us');
      setAboutDescription(settings.aboutDescription || '');
      setHappyTitle(settings.happyTitle || 'Stay Happy');
      setHappyMessage(settings.happyMessage || 'Good things take time 💜');
      setHappyIcon(settings.happyIcon || '💜');
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    try {
      await onSave({
        telegramUrl,
        whatsappUrl,
        aboutTitle,
        aboutDescription,
        happyTitle,
        happyMessage,
        happyIcon,
        messageTitle: settings?.messageTitle,
        messageContent: settings?.messageContent,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div id="site-settings-panel" className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 id="site-settings-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
            Site Settings & Navigation Drawer
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            Configure public Telegram, WhatsApp, About Us modal content, and Stay Happy section
          </p>
        </div>

        {saveSuccess && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl animate-fade-in">
            <Check className="w-3.5 h-3.5" />
            <span>Saved successfully!</span>
          </div>
        )}
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
        {/* Section: Social & Contact Links */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <Send className="w-4 h-4 text-sky-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              Social Links
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Telegram URL */}
            <div>
              <label htmlFor="setting-telegram-url" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-sky-500" />
                <span>Telegram URL</span>
              </label>
              <input
                id="setting-telegram-url"
                type="url"
                value={telegramUrl}
                onChange={(e) => setTelegramUrl(e.target.value)}
                placeholder="https://t.me/yourchannel"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Direct URL to your Telegram channel or group.
              </p>
            </div>

            {/* WhatsApp URL */}
            <div>
              <label htmlFor="setting-whatsapp-url" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>WhatsApp URL</span>
              </label>
              <input
                id="setting-whatsapp-url"
                type="url"
                value={whatsappUrl}
                onChange={(e) => setWhatsappUrl(e.target.value)}
                placeholder="https://wa.me/1234567890"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-mono text-xs"
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Direct WhatsApp link (e.g., https://wa.me/number or https://chat.whatsapp.com/...).
              </p>
            </div>
          </div>
        </div>

        {/* Section: About Us Modal Content */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <Info className="w-4 h-4 text-indigo-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              About Us Content
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <label htmlFor="setting-about-title" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                About Us Title
              </label>
              <input
                id="setting-about-title"
                type="text"
                value={aboutTitle}
                onChange={(e) => setAboutTitle(e.target.value)}
                placeholder="About Us"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label htmlFor="setting-about-desc" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                About Us Description
              </label>
              <textarea
                id="setting-about-desc"
                rows={4}
                value={aboutDescription}
                onChange={(e) => setAboutDescription(e.target.value)}
                placeholder="Write about your web app directory, purpose, failover routing, and mission..."
                className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all leading-relaxed resize-y"
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Shown inside the modal popup when users click "About Us" in the slide-out menu.
              </p>
            </div>
          </div>
        </div>

        {/* Section: Stay Happy Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <Heart className="w-4 h-4 text-purple-500" />
            <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
              Stay Happy Section
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="setting-happy-title" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Title
              </label>
              <input
                id="setting-happy-title"
                type="text"
                value={happyTitle}
                onChange={(e) => setHappyTitle(e.target.value)}
                placeholder="Stay Happy"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div>
              <label htmlFor="setting-happy-icon" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Optional Icon / Emoji
              </label>
              <input
                id="setting-happy-icon"
                type="text"
                value={happyIcon}
                onChange={(e) => setHappyIcon(e.target.value)}
                placeholder="💜 or ☀ or ✨"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-center"
              />
            </div>

            <div className="md:col-span-3">
              <label htmlFor="setting-happy-message" className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                Message
              </label>
              <input
                id="setting-happy-message"
                type="text"
                value={happyMessage}
                onChange={(e) => setHappyMessage(e.target.value)}
                placeholder="Good things take time 💜"
                className="w-full px-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <p className="mt-1 text-[11px] text-neutral-400">
                Inspirational note displayed prominently at the bottom of the navigation drawer.
              </p>
            </div>
          </div>

          {/* Live Preview Card */}
          <div className="mt-4 p-4 rounded-2xl bg-gradient-to-br from-indigo-50/70 via-purple-50/60 to-pink-50/50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/20 border border-purple-200/60 dark:border-purple-800/40">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300 block mb-2">
              Live Preview in Slide-out Menu:
            </span>
            <div className="flex items-start gap-3">
              <span className="text-2xl select-none shrink-0" role="img" aria-label="happy icon">
                {happyIcon || '💜'}
              </span>
              <div>
                <span className="font-bold text-sm text-purple-900 dark:text-purple-200 block">
                  {happyTitle || 'Stay Happy'}
                </span>
                <span className="text-xs text-purple-800/80 dark:text-purple-300/80 block mt-0.5">
                  {happyMessage || 'Good things take time 💜'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="pt-4 border-t border-neutral-200/70 dark:border-neutral-800 flex items-center justify-end gap-3">
          <button
            id="save-site-settings-btn"
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-sm shadow-md shadow-indigo-500/20 disabled:opacity-60 transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Settings...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>SAVE SETTINGS</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
