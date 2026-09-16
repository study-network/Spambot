import React, { useState, useEffect } from 'react';
import { SiteSettings } from '../types.ts';
import { Megaphone, Save, CheckCircle2, AlertCircle, RefreshCw, Sparkles } from 'lucide-react';
import { FormattedTextWithLinks } from './FormattedTextWithLinks.tsx';

interface MessageNoticeFormProps {
  settings: SiteSettings | null;
  onSave: (payload: Partial<SiteSettings>) => Promise<void>;
}

export const MessageNoticeForm: React.FC<MessageNoticeFormProps> = ({
  settings,
  onSave,
}) => {
  const [messageTitle, setMessageTitle] = useState('Important Message');
  const [messageContent, setMessageContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync with incoming settings
  useEffect(() => {
    if (settings) {
      setMessageTitle(settings.messageTitle ?? 'Important Message');
      setMessageContent(settings.messageContent ?? '');
    }
  }, [settings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setErrorMessage(null);

    try {
      await onSave({
        messageTitle: messageTitle.trim() || 'Important Message',
        messageContent: messageContent,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update message. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetExample = () => {
    setMessageTitle('Important Message');
    setMessageContent(
      `📚 Stay consistent and keep learning every day.\n🚫 Do not misuse or share restricted links.\n💡 Use this platform only for educational purposes.\n❤️ Keep learning and stay motivated!`
    );
  };

  return (
    <div id="message-notice-panel" className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h2 id="message-section-title" className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
          Message / Notice
        </h2>
        <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          Edit the message that appears in the user menu.
        </p>
      </div>

      {/* Main Edit Card */}
      <div className="bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200/80 dark:border-neutral-800 p-6 sm:p-8 shadow-xs">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Message Title Field */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="message-title-input" className="block text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Message Title
              </label>
              <button
                type="button"
                onClick={handleSetExample}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>Load Template</span>
              </button>
            </div>
            <input
              id="message-title-input"
              type="text"
              value={messageTitle}
              onChange={(e) => setMessageTitle(e.target.value)}
              placeholder="e.g. Important Message"
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-medium transition-all"
            />
          </div>

          {/* Message Content Field */}
          <div>
            <label htmlFor="message-content-textarea" className="block text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
              Message Content
            </label>
            <textarea
              id="message-content-textarea"
              rows={6}
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder={`📚 Stay consistent and keep learning every day.\n🚫 Do not misuse or share restricted links.\n💡 Use this platform only for educational purposes.\n❤️ Keep learning and stay motivated!`}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 dark:border-neutral-700/80 bg-neutral-50 dark:bg-neutral-800/80 text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm leading-relaxed whitespace-pre-wrap font-normal transition-all resize-y"
            />
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-2">
              You can write 4–5 or more lines. Use line breaks as needed.
            </p>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-800 dark:text-rose-300 text-sm font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <div>
            <button
              id="update-message-btn"
              type="submit"
              disabled={isSaving}
              className="w-full py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-sm transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Updating Message...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Message</span>
                </>
              )}
            </button>
          </div>

          {/* Success Banner */}
          {saveSuccess && (
            <div
              id="message-update-success-banner"
              className="p-3.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-950/50 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center gap-2.5 transition-all"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>Message updated successfully!</span>
            </div>
          )}
        </form>
      </div>

      {/* Preview Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Preview (How it will look in menu)
          </h3>
          <span className="text-xs text-neutral-400">
            {messageContent.trim() ? 'Visible in menu' : 'Hidden (empty content)'}
          </span>
        </div>

        <div className="max-w-md">
          {messageContent.trim() ? (
            <div className="w-full p-4 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-800/60 shadow-xs transition-all text-left">
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
                <FormattedTextWithLinks text={messageContent} />
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl border border-dashed border-neutral-300 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40 text-center text-xs text-neutral-500 dark:text-neutral-400">
              No message content entered. The card is currently hidden from the user menu. Enter content above to display it.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
