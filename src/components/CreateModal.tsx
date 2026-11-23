import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { AlertCircle, Globe, ImagePlus, Lock, Sparkles, Upload, X } from 'lucide-react';
import { isCloudinaryConfigured, uploadMedia } from '../lib/cloudinary';
import type { CreatorProfile, FeedScope, Mood, PostItem, StoryItem } from '../types';

interface CreateModalProps {
  currentUser: CreatorProfile;
  initialMode?: 'post' | 'story';
  onClose: () => void;
  onPublishPost: (post: PostItem) => Promise<void>;
  onPublishStory: (story: StoryItem) => Promise<void>;
}

const MOODS: Mood[] = ['Desi', 'Music', 'Chill', 'Gaming', 'Tech', 'Aesthetic'];

export const CreateModal: React.FC<CreateModalProps> = ({
  currentUser,
  initialMode = 'post',
  onClose,
  onPublishPost,
  onPublishStory,
}) => {
  const [mode, setMode] = useState<'post' | 'story'>(initialMode);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [caption, setCaption] = useState('');
  const [location, setLocation] = useState(currentUser.location || '');
  const [mood, setMood] = useState<Mood>('Desi');
  const [visibility, setVisibility] = useState<FeedScope>('public');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cloudinaryReady = isCloudinaryConfigured();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage(null);

    const isVideo = file.type.startsWith('video/');
    if (isVideo && !cloudinaryReady) {
      setErrorMessage(
        'Video uploads are currently unavailable. Please select a photo instead.',
      );
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(file);
    setMediaType(isVideo ? 'video' : 'image');
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a photo or video from your device first.');
      return;
    }

    setErrorMessage(null);
    setIsPublishing(true);
    try {
      setStatusMessage('Uploading...');
      const uploaded = await uploadMedia(selectedFile);

      setStatusMessage(mode === 'story' ? 'Sharing story...' : 'Publishing...');
      const timestamp = Date.now();
      const id = `${mode}_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;

      if (mode === 'story') {
        await onPublishStory({
          id,
          authorId: currentUser.uid,
          authorHandle: currentUser.handle,
          authorName: currentUser.displayName,
          authorAvatar: currentUser.avatarUrl,
          authorAura: currentUser.auraBadge,
          mediaUrl: uploaded.url,
          mediaType: uploaded.mediaType,
          caption: caption.trim(),
          mood,
          visibility,
          isSeen: false,
          createdAt: timestamp,
        });
      } else {
        await onPublishPost({
          id,
          authorId: currentUser.uid,
          authorHandle: currentUser.handle,
          authorName: currentUser.displayName,
          authorAvatar: currentUser.avatarUrl,
          authorAura: currentUser.auraBadge,
          mediaUrl: uploaded.url,
          mediaType: uploaded.mediaType,
          caption: caption.trim(),
          location: location.trim() || undefined,
          mood,
          visibility,
          likesCount: 0,
          commentsCount: 0,
          isLiked: false,
          isBookmarked: false,
          comments: [],
          createdAt: timestamp,
        });
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Upload failed. Please try again.',
      );
    } finally {
      setIsPublishing(false);
      setStatusMessage('');
    }
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col justify-end bg-black/75 backdrop-blur-md">
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className="max-h-[92%] rounded-t-[34px] bg-[#0A0A0F] border-t border-white/12 flex flex-col overflow-hidden"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/8">
          <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/[0.06] border border-white/8">
            <button
              type="button"
              onClick={() => setMode('post')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === 'post' ? 'vibe-gradient-bg text-white shadow-[0_6px_16px_-4px_rgba(255,46,147,0.5)]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Feed Post
            </button>
            <button
              type="button"
              onClick={() => setMode('story')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                mode === 'story' ? 'vibe-gradient-bg text-white shadow-[0_6px_16px_-4px_rgba(255,46,147,0.5)]' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Capsule Story
            </button>
          </div>

          <button
            type="button"
            disabled={isPublishing}
            onClick={onClose}
            aria-label="Close composer"
            className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handlePublish} className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
          {/* Real Media Upload Zone (No preset mock images) */}
          <div className="space-y-2">
            {previewUrl ? (
              <div className="relative rounded-[24px] overflow-hidden bg-white/[0.04] border border-white/10 aspect-[4/3]">
                {mediaType === 'video' ? (
                  <video
                    src={previewUrl}
                    autoPlay
                    muted
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <img
                    src={previewUrl}
                    alt="Selected upload preview"
                    className="w-full h-full object-cover"
                  />
                )}
                <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/85 via-black/40 to-transparent flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={isPublishing}
                    onClick={() => fileInputRef.current?.click()}
                    className="h-10 px-3.5 rounded-xl bg-black/65 backdrop-blur-md border border-white/20 text-xs font-semibold text-white flex items-center gap-2 hover:bg-white/15 cursor-pointer"
                  >
                    <ImagePlus className="w-4 h-4 text-[#FF6B35]" />
                    <span>Change Media</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full rounded-[24px] border border-dashed border-white/20 bg-white/[0.03] hover:bg-white/[0.06] hover:border-[#FF2E93]/55 transition-all aspect-[4/3] flex flex-col items-center justify-center gap-3 p-6 text-center cursor-pointer"
              >
                <div className="w-14 h-14 rounded-2xl vibe-gradient-bg flex items-center justify-center text-white shadow-[0_0_28px_-6px_rgba(255,46,147,0.6)]">
                  <Upload className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white">
                    {mode === 'story' ? 'Add Story Media' : 'Add Photo or Video'}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {cloudinaryReady
                      ? 'Choose a photo or video from your device'
                      : 'Choose a photo from your device'}
                  </p>
                </div>
              </button>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept={cloudinaryReady ? 'image/*,video/*' : 'image/*'}
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Caption */}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-zinc-300">Caption</span>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              maxLength={mode === 'story' ? 180 : 450}
              placeholder={
                mode === 'story'
                  ? 'Add a caption to your vertical capsule…'
                  : 'Write a caption for your drop…'
              }
              className="w-full rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E93]/65 resize-none"
            />
          </label>

          {mode === 'post' && (
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">Location (optional)</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={60}
                placeholder="City or neighborhood"
                className="w-full h-11 rounded-2xl bg-white/[0.06] border border-white/10 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E93]/65"
              />
            </label>
          )}

          {/* Mood Tag Selector */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-300">Mood Vibe</span>
            <div className="flex items-center gap-2 flex-wrap">
              {MOODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMood(m)}
                  className={`h-9 px-3.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    mood === m
                      ? 'vibe-gradient-bg text-white font-semibold shadow-[0_6px_16px_-4px_rgba(255,46,147,0.5)]'
                      : 'bg-white/[0.06] text-zinc-300 border border-white/10 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Visibility: Public vs Inner Circle */}
          <div className="space-y-2">
            <span className="text-xs font-medium text-zinc-300">Audience</span>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setVisibility('public')}
                className={`h-12 rounded-2xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                  visibility === 'public'
                    ? 'border-[#FF6B35]/70 bg-[#FF6B35]/15 text-white'
                    : 'border-white/10 bg-white/[0.04] text-zinc-400'
                }`}
              >
                <Globe className="w-4 h-4 text-[#FF6B35]" />
                Public Feed
              </button>
              <button
                type="button"
                onClick={() => setVisibility('inner_circle')}
                className={`h-12 rounded-2xl border flex items-center justify-center gap-2 text-xs font-semibold transition-all cursor-pointer ${
                  visibility === 'inner_circle'
                    ? 'border-[#FF2E93]/75 bg-[#7B2CBF]/25 text-white'
                    : 'border-white/10 bg-white/[0.04] text-zinc-400'
                }`}
              >
                <Lock className="w-4 h-4 text-[#C77DFF]" />
                Inner Circle
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="rounded-2xl bg-rose-500/12 border border-rose-500/30 p-3.5 flex items-start gap-2.5 text-xs text-rose-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isPublishing || !selectedFile}
            className="w-full h-13 rounded-2xl vibe-gradient-bg text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_12px_32px_-8px_rgba(255,46,147,0.55)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isPublishing
                ? statusMessage || 'Uploading...'
                : mode === 'story'
                  ? 'Share Story'
                  : 'Publish'}
            </span>
          </button>
        </form>
      </motion.div>
    </div>
  );
};
