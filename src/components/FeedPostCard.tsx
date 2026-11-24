import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bookmark,
  Eye,
  Heart,
  Lock,
  MessageCircle,
  Play,
  Send,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatCount, formatRelativeTime } from '../lib/utils';
import { SafeImage } from './SafeImage';
import { UserAvatar } from './UserAvatar';
import type { PostItem } from '../types';

interface FeedPostCardProps {
  post: PostItem;
  isOwnPost: boolean;
  isActiveVideo: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenVideoInSparks: (postId: string) => void;
  onRecordVideoView: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onOpenComments: (post: PostItem) => void;
  onShare: (post: PostItem) => void;
  onDeletePost?: (postId: string) => void;
  onInspectCreator: (authorId: string) => void;
}

export const FeedPostCard: React.FC<FeedPostCardProps> = ({
  post,
  isOwnPost,
  isActiveVideo,
  isMuted,
  onToggleMute,
  onOpenVideoInSparks,
  onRecordVideoView,
  onToggleLike,
  onToggleBookmark,
  onOpenComments,
  onShare,
  onDeletePost,
  onInspectCreator,
}) => {
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const singleTapTimerRef = useRef<number | null>(null);

  // Strictly play ONLY when this card is the single active visible video; pause & mute otherwise
  useEffect(() => {
    if (post.mediaType !== 'video') return;
    const video = videoRef.current;
    if (!video) return;

    if (isActiveVideo) {
      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          // Browser autoplay policy fallback if not yet interacted
          video.muted = true;
          void video.play().catch(() => {});
        });
      }
    } else {
      video.pause();
      video.muted = true;
    }
  }, [isActiveVideo, isMuted, post.mediaType]);

  // Increment video views after > 2 seconds of continuous active playback
  useEffect(() => {
    if (post.mediaType !== 'video' || !isActiveVideo) return;
    const video = videoRef.current;
    if (!video) return;

    let timer: number | null = null;
    const clearTimer = () => {
      if (timer !== null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };
    const startTimer = () => {
      clearTimer();
      timer = window.setTimeout(() => {
        if (videoRef.current && !videoRef.current.paused) {
          onRecordVideoView(post.id);
        }
      }, 2000);
    };

    if (!video.paused) {
      startTimer();
    }
    video.addEventListener('playing', startTimer);
    video.addEventListener('pause', clearTimer);

    return () => {
      clearTimer();
      video.removeEventListener('playing', startTimer);
      video.removeEventListener('pause', clearTimer);
    };
  }, [isActiveVideo, onRecordVideoView, post.id, post.mediaType]);

  // Clean up any pending single-tap timeout on unmount
  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current !== null) {
        window.clearTimeout(singleTapTimerRef.current);
      }
    };
  }, []);

  const triggerDoubleTapLike = () => {
    setShowHeartBurst(true);
    if (!post.isLiked) {
      onToggleLike(post.id);
    }
    window.setTimeout(() => setShowHeartBurst(false), 780);
  };

  const handleMediaTap = () => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 260;
    lastTapRef.current = now;

    if (isDoubleTap) {
      if (singleTapTimerRef.current !== null) {
        window.clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      triggerDoubleTapLike();
      return;
    }

    if (post.mediaType === 'video') {
      if (singleTapTimerRef.current !== null) {
        window.clearTimeout(singleTapTimerRef.current);
      }
      singleTapTimerRef.current = window.setTimeout(() => {
        singleTapTimerRef.current = null;
        onOpenVideoInSparks(post.id);
      }, 260);
    }
  };

  const commentCount = Math.max(post.commentsCount, post.comments.length);

  return (
    <article className="mx-3 rounded-[28px] glass-surface overflow-hidden">
      {/* Author Header */}
      <div className="flex items-center justify-between gap-3 px-4 pt-3.5 pb-3">
        <button
          type="button"
          onClick={() => onInspectCreator(post.authorId)}
          className="flex items-center gap-3 min-w-0 text-left cursor-pointer group"
        >
          <div className="p-[1.5px] rounded-2xl vibe-capsule-ring shrink-0">
            <UserAvatar
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-10 h-10 rounded-[14.5px]"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm font-semibold text-white group-hover:text-[#FF6B35] transition-colors truncate">
                @{post.authorHandle}
              </span>
              <span className="text-[11px] font-medium vibe-gradient-text whitespace-nowrap">
                {post.authorAura}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 truncate">
              <span>{post.mood}</span>
              {post.location && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{post.location}</span>
                </>
              )}
              <span aria-hidden="true">·</span>
              <span className="font-mono tabular-nums">{formatRelativeTime(post.createdAt)}</span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {post.visibility === 'inner_circle' && (
            <div
              className="inline-flex items-center gap-1 text-[11px] font-medium text-[#C77DFF]"
              title="Inner Circle exclusive"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Circle</span>
            </div>
          )}

          {isOwnPost && onDeletePost && (
            <button
              type="button"
              onClick={() => onDeletePost(post.id)}
              aria-label="Delete post"
              title="Delete post"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-zinc-500 hover:text-rose-400 hover:bg-white/[0.06] transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Media Surface */}
      <div
        data-feed-video-id={post.mediaType === 'video' ? post.id : undefined}
        onClick={handleMediaTap}
        className="relative mx-2 rounded-[22px] overflow-hidden bg-[#060609] w-[calc(100%-1rem)] aspect-[4/5] flex items-center justify-center cursor-pointer select-none"
      >
        {post.mediaType === 'video' ? (
          <>
            {/* Clean edge-to-edge 4:5 fill with zero side pillarboxing on vertical 9:16 videos */}
            <video
              ref={videoRef}
              src={post.mediaUrl}
              muted={isMuted || !isActiveVideo}
              loop
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
            />

            {/* Subtle Spark / Reels indicator badge */}
            <div className="pointer-events-none absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-[10.5px] font-semibold text-white">
              <Play className="w-3 h-3 fill-white" />
              <span>Spark</span>
            </div>

            {/* Global Sound Toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleMute();
              }}
              aria-label={isMuted ? 'Unmute video' : 'Mute video'}
              className="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/80 active:scale-95 transition-all cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#FF6B35]" />
              )}
            </button>
          </>
        ) : (
          <>
            {/* Dark blurred ambient backdrop + object-contain for photos (wide 16:9 never crops sides) */}
            <div
              className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#060609]"
              aria-hidden="true"
            >
              <SafeImage
                src={post.mediaUrl}
                alt=""
                className="w-full h-full object-cover scale-110 blur-2xl opacity-45 brightness-50"
              />
              <div className="absolute inset-0 bg-black/35" />
            </div>

            <SafeImage
              src={post.mediaUrl}
              alt={post.caption || `Post by @${post.authorHandle}`}
              fallbackLabel={`@${post.authorHandle}`}
              className="relative z-[1] w-full h-full object-contain"
            />
          </>
        )}

        {/* Double-tap Sunset-Neon Pulse Heart Animation */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div
              initial={{ opacity: 0, scale: 0.45 }}
              animate={{ opacity: 1, scale: 1.05 }}
              exit={{ opacity: 0, scale: 1.35 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
            >
              <div className="relative flex items-center justify-center">
                <span className="absolute w-28 h-28 rounded-full border-2 border-[#FF6B35] animate-pulse-ring" />
                <span className="absolute w-24 h-24 rounded-full bg-[#FF2E93]/40 blur-2xl" />
                <div className="w-20 h-20 rounded-full vibe-gradient-bg flex items-center justify-center shadow-[0_0_40px_rgba(255,46,147,0.75)]">
                  <Heart className="w-10 h-10 text-white fill-white" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Rail */}
      <div className="px-4 pt-2.5 pb-1 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 min-w-0">
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            aria-label={post.isLiked ? 'Unlike post' : 'Like post'}
            className="min-h-[44px] px-2.5 -ml-2 rounded-xl flex items-center gap-1.5 text-zinc-200 hover:bg-white/[0.06] active:scale-95 transition-all cursor-pointer"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                post.isLiked
                  ? 'text-[#FF2E93] fill-[#FF2E93] drop-shadow-[0_0_8px_rgba(255,46,147,0.7)]'
                  : 'text-zinc-200'
              }`}
            />
            <span className="text-xs font-mono font-medium tabular-nums">
              {formatCount(post.likesCount)}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onOpenComments(post)}
            aria-label="Open comments and voice notes"
            className="min-h-[44px] px-2.5 rounded-xl flex items-center gap-1.5 text-zinc-200 hover:bg-white/[0.06] active:scale-95 transition-all cursor-pointer"
          >
            <MessageCircle className="w-5 h-5" />
            <span className="text-xs font-mono font-medium tabular-nums">
              {commentCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onShare(post)}
            aria-label="Share post"
            className="min-h-[44px] min-w-[44px] rounded-xl flex items-center justify-center text-zinc-200 hover:bg-white/[0.06] active:scale-95 transition-all cursor-pointer"
          >
            <Send className="w-5 h-5" />
          </button>

          {post.mediaType === 'video' && (
            <span
              className="inline-flex items-center gap-1 text-[11.5px] font-mono tabular-nums text-zinc-400 pl-1 whitespace-nowrap"
              aria-label={`${post.views} views`}
            >
              <Eye className="w-3.5 h-3.5 text-[#FF6B35]/85" />
              {formatCount(post.views)} {post.views === 1 ? 'view' : 'views'}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => onToggleBookmark(post.id)}
          aria-label={post.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
          className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl flex items-center justify-center text-zinc-200 hover:bg-white/[0.06] active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <Bookmark
            className={`w-5 h-5 transition-colors ${
              post.isBookmarked ? 'text-[#C77DFF] fill-[#C77DFF]' : 'text-zinc-200'
            }`}
          />
        </button>
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pb-4">
          <p className="text-[13.5px] text-zinc-200 leading-relaxed">
            <span className="font-semibold text-white mr-1.5">@{post.authorHandle}</span>
            {post.caption}
          </p>
        </div>
      )}
    </article>
  );
};
