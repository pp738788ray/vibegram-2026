import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Send, X } from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';
import { SafeImage } from './SafeImage';
import type { StoryItem } from '../types';

interface StoryViewerModalProps {
  stories: StoryItem[];
  initialIndex: number;
  onClose: () => void;
  onMarkSeen: (storyId: string) => void;
  onReplyToStory: (story: StoryItem, text: string) => void;
}

const STORY_DURATION_MS = 5500;
const QUICK_REACTIONS = ['⚡', '🔥', '❤️', '🎵'];

export const StoryViewerModal: React.FC<StoryViewerModalProps> = ({
  stories,
  initialIndex,
  onClose,
  onMarkSeen,
  onReplyToStory,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [burstEmoji, setBurstEmoji] = useState<string | null>(null);

  const story = stories[currentIndex];

  useEffect(() => {
    if (!story) return;
    onMarkSeen(story.id);
    setProgress(0);
  }, [currentIndex, story, onMarkSeen]);

  useEffect(() => {
    if (!story || isPaused) return;
    const stepMs = 50;
    const increment = (stepMs / STORY_DURATION_MS) * 100;
    const timer = window.setInterval(() => {
      setProgress((prev) => {
        if (prev + increment >= 100) {
          if (currentIndex < stories.length - 1) {
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
  }, [currentIndex, isPaused, onClose, stories.length, story]);

  if (!story) return null;

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    } else {
      setProgress(0);
    }
  };

  const goNext = () => {
    if (currentIndex < stories.length - 1) {
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
                  width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
                }}
              />
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="absolute top-7 inset-x-3 z-20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-[1.5px] rounded-full vibe-capsule-ring shrink-0">
              <SafeImage
                src={story.authorAvatar}
                alt={story.authorHandle}
                className="w-9 h-9 rounded-full object-cover bg-[#0A0A0D]"
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
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close story viewer"
            className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
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

        {/* Caption & Quick Reactions + Reply Bar */}
        <div className="absolute bottom-0 inset-x-0 z-20 p-4 space-y-3">
          {story.caption && (
            <p className="text-sm text-white/95 leading-snug drop-shadow-md">
              {story.caption}
            </p>
          )}

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
              type="submit"
              aria-label="Send story reply"
              className="w-11 h-11 rounded-full vibe-gradient-bg text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </motion.div>
  );
};
