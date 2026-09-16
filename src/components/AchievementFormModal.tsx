import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Upload, Trophy, Image as ImageIcon, Link as LinkIcon, AlertCircle, CheckCircle2, Loader2, Pin } from 'lucide-react';
import { Achievement } from '../types.ts';

interface AchievementFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: { imageUrl: string; comment: string; isPinned?: boolean }) => Promise<void>;
  initialAchievement?: Achievement | null;
}

export const AchievementFormModal: React.FC<AchievementFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialAchievement,
}) => {
  const [imageMode, setImageMode] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(initialAchievement);

  useEffect(() => {
    if (initialAchievement) {
      setImageUrl(initialAchievement.imageUrl);
      setUploadedBase64(initialAchievement.imageUrl.startsWith('data:') ? initialAchievement.imageUrl : null);
      setImageMode(initialAchievement.imageUrl.startsWith('data:') ? 'upload' : 'url');
      setComment(initialAchievement.comment);
      setIsPinned(Boolean(initialAchievement.isPinned));
      setUploadSuccess(true);
    } else {
      setImageUrl('');
      setUploadedBase64(null);
      setImageMode('upload');
      setComment('');
      setIsPinned(false);
      setUploadSuccess(false);
    }
    setError(null);
    setIsSubmitting(false);
    setIsUploading(false);
  }, [initialAchievement, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isSubmitting]);

  const activeImage = imageMode === 'upload' ? (uploadedBase64 || imageUrl) : imageUrl;

  const handleFileUpload = (file?: File) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file (PNG, JPG, WebP, SVG).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size exceeds 10MB limit. Please choose a smaller image.');
      return;
    }

    setError(null);
    setIsUploading(true);
    setUploadSuccess(false);

    const reader = new FileReader();
    reader.onload = () => {
      setTimeout(() => {
        setUploadedBase64(reader.result as string);
        setImageUrl('');
        setIsUploading(false);
        setUploadSuccess(true);
      }, 400); // smooth upload simulation feedback
    };
    reader.onerror = () => {
      setIsUploading(false);
      setError('Failed to read image file. Please try again.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const finalImage = activeImage?.trim();
    if (!finalImage) {
      setError('Achievement Image is required. Please upload an image or provide a valid image URL.');
      return;
    }

    if (!comment.trim()) {
      setError('Admin Comment is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        imageUrl: finalImage,
        comment: comment.trim(),
        isPinned,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save achievement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          id="achievement-form-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) onClose();
          }}
        >
          <motion.div
            id="achievement-form-modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="relative w-full max-w-lg bg-white dark:bg-neutral-900 rounded-3xl shadow-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden flex flex-col max-h-[92vh]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 flex items-center justify-center border border-amber-200/50 dark:border-amber-800/50 shadow-xs">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h2 id="achievement-form-title" className="text-lg font-bold text-neutral-900 dark:text-neutral-100 tracking-tight leading-none">
                    {isEditing ? "Edit User's Achievement" : "Add User's Achievement"}
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                    Upload achievement photo and write admin comment
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="w-9 h-9 rounded-full flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
              {error && (
                <div
                  id="achievement-form-error"
                  className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs font-medium flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Achievement Image Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                    Achievement Image *
                  </label>
                  <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        imageMode === 'upload'
                          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
                      }`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('url')}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                        imageMode === 'url'
                          ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                          : 'text-neutral-500 hover:text-neutral-900 dark:text-neutral-400'
                      }`}
                    >
                      Image URL
                    </button>
                  </div>
                </div>

                {/* Upload or URL Controls */}
                {imageMode === 'upload' ? (
                  <div className="space-y-3">
                    <label
                      htmlFor="achievement-image-file-input"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      className={`flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                        isUploading
                          ? 'border-indigo-400 bg-indigo-50/20 dark:bg-indigo-950/20'
                          : activeImage
                          ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/10 dark:bg-emerald-950/10'
                          : 'border-neutral-200 dark:border-neutral-700 hover:border-indigo-500 dark:hover:border-indigo-400 bg-neutral-50/60 dark:bg-neutral-800/50'
                      }`}
                    >
                      {isUploading ? (
                        <div className="text-center py-2 space-y-2">
                          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
                          <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                            Processing image...
                          </p>
                        </div>
                      ) : (
                        <div className="text-center space-y-1.5">
                          <div className="w-10 h-10 rounded-xl bg-neutral-100 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-300 mx-auto flex items-center justify-center shadow-xs">
                            <Upload className="w-5 h-5" />
                          </div>
                          <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                            PNG, JPG, WebP, SVG up to 10MB
                          </p>
                        </div>
                      )}
                    </label>

                    <input
                      id="achievement-image-file-input"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                      className="hidden"
                      disabled={isUploading || isSubmitting}
                    />

                    {uploadSuccess && activeImage && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>Image uploaded successfully!</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        id="achievement-image-url-input"
                        type="url"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full pl-10 pr-4 py-2.5 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>
                )}

                {/* Image Preview Box */}
                {activeImage && (
                  <div className="mt-3">
                    <span className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider block mb-1.5">
                      Preview:
                    </span>
                    <div className="w-full max-h-48 overflow-hidden rounded-xl bg-neutral-900 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center">
                      <img
                        src={activeImage}
                        alt="Achievement preview"
                        referrerPolicy="no-referrer"
                        className="max-h-48 w-full object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Admin Comment Field */}
              <div>
                <label
                  htmlFor="achievement-comment-input"
                  className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider mb-2"
                >
                  Admin Comment *
                </label>
                <textarea
                  id="achievement-comment-input"
                  rows={4}
                  required
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Congratulations Ritesh! 🎉&#10;Your hard work and consistency have paid off. Keep learning and keep growing.&#10;Proud of you! ❤️"
                  className="w-full px-4 py-3 bg-neutral-50 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 rounded-xl text-sm text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-sans leading-relaxed resize-y min-h-[100px]"
                />
                <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                  Supports multiple lines, congratulations messages, and emojis.
                </p>
              </div>

              {/* Pin Status Checkbox */}
              <label className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/80 cursor-pointer select-none hover:bg-neutral-100/70 dark:hover:bg-neutral-800 transition-colors">
                <input
                  type="checkbox"
                  id="achievement-form-pin-checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-neutral-300 dark:border-neutral-600 accent-indigo-600"
                />
                <div className="flex items-center gap-1.5 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                  <Pin className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                  <span>Pin this achievement to top (appears immediately below Admin Message)</span>
                </div>
              </label>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  id="achievement-form-submit-btn"
                  type="submit"
                  disabled={isSubmitting || isUploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{isEditing ? 'Save Changes' : 'Publish Achievement'}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
