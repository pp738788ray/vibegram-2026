import React, { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, Eye, Heart, Lock, Send, Trash2, X } from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';
import { SafeImage } from './SafeImage';
import { UserAvatar } from './UserAvatar';
import { ConfirmDialog } from './ConfirmDialog';
import type { CreatorProfile, StoryItem } from '../types';

interface StoryViewerModalProps {
  stories: StoryItem[];
  initialIndex: number;
  currentUser: CreatorProfile;
  creators: CreatorProfile[];
  onClose: () => void;
  onMarkSeen: (storyId: string) => void;
  onRecordStoryView: (story: StoryItem) => void;
  onToggleStoryLike: (story: StoryItem) => void;
  onDeleteStory: (storyId: string) => Promise<void>;
  onReplyToStory: (story: StoryItem, text: string) => void;
  onInspectCreator: (uid: string) => void;
}

const STORY_DURATION_MS = 5500;
const QUICK_REACTIONS = ['⚡', '🔥', '❤️', '🎵'];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  currentUser,
  creators,
  onClose,
  onMarkSeen,
  onRecordStoryView,
  onToggleStoryLike,
  onDeleteStory,
  onReplyToStory,
  onInspectCreator,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);
  const [showActivitySheet, setShowActivitySheet] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const safeIndex = Math.min(currentIndex, Math.max(0, stories.length - 1));
  const story = stories[safeIndex];

  useEffect(() => {
    if (stories.length === 0) {
      onClose();
      return;
    }
    if (currentIndex >= stories.length) {
      setCurrentIndex(stories.length - 1);
    }
  }, [currentIndex, onClose, stories.length]);

  useEffect(() => {
    if (!story) return;
    onMarkSeen(story.id);
    if (story.authorId !== currentUser.uid && !story.viewedBy.includes(currentUser.uid)) {
      onRecordStoryView(story);
    }
    setProgress(0);
    setShowActivitySheet(false);
    setShowDeleteConfirm(false);
  }, [story?.id]);

  const effectivePaused = isPaused || showActivitySheet || showDeleteConfirm || isDeleting;

  useEffect(() => {
    if (!story || effectivePaused) return;
    const stepMs = 50;
    const increment = (stepMs / STORY_DURATION_MS) * 100;
    const timer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 100) {
          if (safeIndex < stories.length - 1) {
            setCurrentIndex((i) => i + 1);
            return 0;
          }
          onClose();
          return 100;
        }
        return prev + increment;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [effectivePaused, onClose, safeIndex, stories.length, story]);

  const viewerEntries = useMemo(() => {
    if (!story) return [];
    const likedSet = new Set(story.likedBy || []);
    const uniqueIds = Array.from(new Set([...(story.viewedBy || []), ...(story.likedBy || [])])).filter(
      (uid) => uid && uid !== story.authorId,
    );
    return uniqueIds.map((uid) => {
      const matched = creators.find((c) => c.uid === uid);
      return {
        uid,
        handle: matched?.handle || uid.slice(0, 12),
        displayName: matched?.displayName || 'VibeGram Member',
        avatarUrl: matched?.avatarUrl || '',
        liked: likedSet.has(uid),
      };
    });
  }, [creators, story]);

  if (!story) return null;

  const isOwnStory = story.authorId === currentUser.uid;
  const isLikedByMe = (story.likedBy || []).includes(currentUser.uid);

  const goPrev = () => {
    if (safeIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else {
      setProgress(0);
    }
  };

  const goNext = () => {
    if (safeIndex < stories.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      onClose();
    }
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = replyText.trim();
    if (!trimmed) return;
    onReplyToStory(story, trimmed);
    setReplyText('');
    setIsPaused(false);
  };

  const handleQuickReact = (emoji: string) => {
    setBurstEmoji(emoji);
    onReplyToStory(story, `Reacted ${emoji} to your capsule`);
    window.setTimeout(() => setBurstEmoji(null), 900);
  };

  const handleToggleLike = () => {
    if (!isLikedByMe) {
      setBurstEmoji('❤️');
      window.setTimeout(() => setBurstEmoji(null), 700);
    }
    onToggleStoryLike(story);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await onDeleteStory(story.id);
      setShowDeleteConfirm(false);
      if (stories.length <= 1) {
        onClose();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className="absolute inset-0 z-50 bg-[#050505] flex flex-col select-none"
    >
      {/* Background media */}
      <div className="relative flex-1 overflow-hidden bg-[#050505] flex items-center justify-center">
        {/* Dark blurred ambient backdrop for non-9:16 aspect ratios */}
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#050505]" aria-hidden="true">
          {story.mediaType === 'video' ? (
            <video
              src={story.mediaUrl}
              autoPlay
              muted
              loop
              playsInline
              tabIndex={-1}
              className="w-full h-full object-cover scale-110 blur-2xl opacity-45 brightness-50"
            />
          ) : (
            <SafeImage
              src={story.mediaUrl}
              alt=""
              className="w-full h-full object-cover scale-110 blur-2xl opacity-45 brightness-50"
            />
          )}
          <div className="absolute inset-0 bg-black/35" />
        </div>

        {/* Crisp full-frame foreground media (no side cropping) */}
        {story.mediaType === 'video' ? (
          <video
            src={story.mediaUrl}
            autoPlay
            muted
            loop
            playsInline
            className="relative z-[1] w-full h-full object-contain"
          />
        ) : (
          <SafeImage
            src={story.mediaUrl}
            alt={story.caption}
            className="relative z-[1] w-full h-full object-contain"
          />
        )}

        {/* Top & bottom contrast scrims */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-36 bg-gradient-to-b from-black/85 via-black/40 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-52 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

        {/* Progress bars */}
        <div className="absolute top-3 inset-x-3 z-20 flex items-center gap-1.5">
          {stories.map((s, i) => (
            <div key={s.id} className="h-[3px] flex-1 rounded-full bg-white/25 overflow-hidden">
              <div
                className="h-full rounded-full vibe-gradient-bg transition-[width] duration-75"
                style={{
                  width: i < safeIndex ? '100%' : i === safeIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 inset-x-3 z-20 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onInspectCreator(story.authorId);
            }}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
          >
            <div className="p-[1.5px] rounded-full vibe-capsule-ring shrink-0">
              <UserAvatar
                src={story.authorAvatar}
                alt={story.authorHandle}
                className="w-9 h-9 rounded-full"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white truncate">
                  @{story.authorHandle}
                </span>
                <span className="text-[11px] text-zinc-300 font-mono tabular-nums">
                  · {formatRelativeTime(story.createdAt)}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-zinc-300">
                <span>{story.mood}</span>
                {story.visibility === 'inner_circle' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-[#C77DFF] font-medium">
                      <Lock className="w-2.5 h-2.5" /> Inner Circle
                    </span>
                  </>
                )}
              </div>
            </div>
          </button>

          <div className="flex items-center gap-2 shrink-0">
            {isOwnStory && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                aria-label="Delete capsule"
                title="Delete Capsule"
                className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-zinc-200 hover:text-rose-400 hover:bg-rose-500/20 transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close story viewer"
              className="w-10 h-10 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-white/15 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tap zones (Left = Prev, Right = Next, Hold = Pause) */}
        <div
          className="absolute inset-0 z-10 flex"
          onPointerDown={() => setIsPaused(true)}
          onPointerUp={() => setIsPaused(false)}
          onPointerLeave={() => setIsPaused(false)}
        >
          <button
            type="button"
            aria-label="Previous story"
            onClick={goPrev}
            className="w-1/3 h-full cursor-pointer focus:outline-none"
          />
          <button
            type="button"
            aria-label="Next story"
            onClick={goNext}
            className="w-2/3 h-full cursor-pointer focus:outline-none"
          />
        </div>

        {/* Reaction Burst */}
        <AnimatePresence>
          {burstEmoji && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1.4, y: -40 }}
              exit={{ opacity: 0, scale: 1.8, y: -90 }}
              transition={{ duration: 0.65 }}
              className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center text-6xl"
            >
              {burstEmoji}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 space-y-3">
          {story.caption && (
            <p className="text-sm text-white/95 leading-snug drop-shadow-md">
              {story.caption}
            </p>
          )}

          {isOwnStory ? (
            /* Creator Activity / Seen By Bar */
            <div className="flex items-center justify-between gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowActivitySheet(true)}
                className="inline-flex items-center gap-2.5 h-11 pl-3 pr-4 rounded-full bg-black/60 backdrop-blur-xl border border-white/20 hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
              >
                {viewerEntries.length > 0 ? (
                  <div className="flex -space-x-2">
                    {viewerEntries.slice(0, 3).map((v) => (
                      <UserAvatar
                        key={v.uid}
                        src={v.avatarUrl}
                        alt={v.handle}
                        className="w-6 h-6 rounded-full ring-2 ring-black"
                      />
                    ))}
                  </div>
                ) : (
                  <Eye className="w-4 h-4 text-[#FF6B35]" />
                )}
                <span className="text-xs font-semibold text-white">
                  Activity · Seen by {viewerEntries.length}
                </span>
                {(story.likedBy?.length || 0) > 0 && (
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-mono text-[#FF2E93]">
                    <Heart className="w-3 h-3 fill-[#FF2E93]" />
                    {story.likedBy.length}
                  </span>
                )}
                <ChevronUp className="w-3.5 h-3.5 text-zinc-400" />
              </button>
            </div>
          ) : (
            /* Viewer Quick Reactions + Reply + Heart Like */
            <>
              <div className="flex items-center justify-between gap-2">
                {QUICK_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleQuickReact(emoji)}
                    className="flex-1 h-10 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-base active:scale-90 transition-transform cursor-pointer"
                    aria-label={`React with ${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSendReply} className="flex items-center gap-2">
                <input
                  type="text"
                  value={replyText}
                  onFocus={() => setIsPaused(true)}
                  onBlur={() => setIsPaused(false)}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to @${story.authorHandle}…`}
                  maxLength={200}
                  className="flex-1 h-11 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 px-4 text-sm text-white placeholder:text-zinc-400 focus:outline-none focus:border-[#FF2E93]"
                />
                <button
                  type="button"
                  onClick={handleToggleLike}
                  aria-label={isLikedByMe ? 'Unlike capsule' : 'Like capsule'}
                  className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-xl border border-white/20 flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer"
                >
                  <Heart
                    className={`w-5 h-5 transition-colors ${
                      isLikedByMe
                        ? 'text-[#FF2E93] fill-[#FF2E93] drop-shadow-[0_0_8px_rgba(255,46,147,0.75)]'
                        : 'text-white'
                    }`}
                  />
                </button>
                <button
                  type="submit"
                  aria-label="Send story reply"
                  className="w-11 h-11 rounded-full vibe-gradient-bg text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>

        {/* Slide-Up Capsule Activity (Viewers & Likes) Sheet */}
        <AnimatePresence>
          {showActivitySheet && isOwnStory && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black/65 backdrop-blur-sm flex flex-col justify-end"
            >
              <button
                type="button"
                aria-label="Close viewers sheet"
                onClick={() => setShowActivitySheet(false)}
                className="flex-1 w-full cursor-default"
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="max-h-[68%] rounded-t-[32px] bg-[#0B0B11] border-t border-white/14 flex flex-col overflow-hidden"
              >
                <div className="pt-3 pb-3 px-5 border-b border-white/10">
                  <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 font-display text-sm font-bold text-white">
                        <Eye className="w-4 h-4 text-[#FF6B35]" />
                        Seen by {viewerEntries.length}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-mono text-[#FF2E93]">
                        <Heart className="w-3.5 h-3.5 fill-[#FF2E93]" />
                        {story.likedBy?.length || 0}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowActivitySheet(false)}
                      aria-label="Close activity sheet"
                      className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2.5">
                  {viewerEntries.length === 0 ? (
                    <div className="py-10 text-center space-y-1.5">
                      <p className="text-sm font-medium text-zinc-300">No viewers yet</p>
                      <p className="text-xs text-zinc-500">
                        People who watch or like your Capsule will appear here live.
                      </p>
                    </div>
                  ) : (
                    viewerEntries.map((viewer) => (
                      <button
                        key={viewer.uid}
                        type="button"
                        onClick={() => {
                          setShowActivitySheet(false);
                          onClose();
                          onInspectCreator(viewer.uid);
                        }}
                        className="w-full rounded-2xl glass-surface p-3 flex items-center justify-between gap-3 hover:bg-white/[0.09] transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <UserAvatar
                            src={viewer.avatarUrl}
                            alt={viewer.displayName}
                            className="w-10 h-10 rounded-full shrink-0"
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-white truncate">
                              @{viewer.handle}
                            </p>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {viewer.displayName}
                            </p>
                          </div>
                        </div>

                        {viewer.liked && (
                          <div
                            className="w-8 h-8 rounded-full bg-[#FF2E93]/18 border border-[#FF2E93]/40 flex items-center justify-center shrink-0"
                            title="Liked your Capsule"
                          >
                            <Heart className="w-4 h-4 text-[#FF2E93] fill-[#FF2E93]" />
                          </div>
                        )}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Capsule Confirmation Modal */}
        <ConfirmDialog
          open={showDeleteConfirm}
          title="Delete this Capsule?"
          description="This story will be permanently removed from VibeGram."
          confirmLabel="Delete"
          isLoading={isDeleting}
          onConfirm={() => void handleConfirmDelete()}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    </motion.div>
  );
};
