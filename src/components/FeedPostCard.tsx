import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bookmark,
  Heart,
  Lock,
  MessageCircle,
  Send,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatCount, formatRelativeTime } from '../lib/utils';
import { SafeImage } from './SafeImage';
import type { PostItem } from '../types';

interface FeedPostCardProps {
  post: PostItem;
  isOwnPost: boolean;
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
  onToggleLike,
  onToggleBookmark,
  onOpenComments,
  onShare,
  onDeletePost,
  onInspectCreator,
}) => {
  const [showHeartBurst, setShowHeartBurst] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const lastTapRef = useRef<number>(0);

  const triggerDoubleTapLike = () => {
    setShowHeartBurst(true);
    if (!post.isLiked) {
      onToggleLike(post.id);
    }
    window.setTimeout(() => setShowHeartBurst(false), 780);
  };

  const handleMediaTap = () => {
    const now = Date.now();
    if (now - lastTapRef.current < 320) {
      triggerDoubleTapLike();
    }
    lastTapRef.current = now;
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
            <SafeImage
              src={post.authorAvatar}
              alt={post.authorName}
              className="w-10 h-10 rounded-[14.5px] object-cover bg-[#0A0A0D]"
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

      {/* Media Surface with Double-Tap Neon Heart Burst */}
      <div
        onClick={handleMediaTap}
        onDoubleClick={triggerDoubleTapLike}
        className="relative mx-2 rounded-[22px] overflow-hidden bg-[#0A0A0F] aspect-[4/5] cursor-pointer select-none"
      >
        {post.mediaType === 'video' ? (
          <video
            src={post.mediaUrl}
            autoPlay
            muted={isMuted}
            loop
            playsInline
            className="w-full h-full object-cover"
          />
        ) : (
          <SafeImage
            src={post.mediaUrl}
            alt={post.caption || `Post by @${post.authorHandle}`}
            fallbackLabel={`@${post.authorHandle}`}
            className="w-full h-full object-cover"
          />
        )}

        {/* Real Video sound toggle */}
        {post.mediaType === 'video' && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsMuted((prev) => !prev);
            }}
            aria-label={isMuted ? 'Unmute video' : 'Mute video'}
            className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center text-white hover:bg-black/75 transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#FF6B35]" />}
          </button>
        )}

        {/* Double-tap Sunset-Neon Pulse Heart Animation */}
        <AnimatePresence>
          {showHeartBurst && (
            <motion.div
              initial={{ opacity: 0, scale: 0.45 }}
              animate={{ opacity: 1, scale: 1.05 }}
              exit={{ opacity: 0, scale: 1.35 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
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
      <div className="px-4 pt-2.5 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onToggleLike(post.id)}
            aria-label={post.isLiked ? 'Unlike post' : 'Like post'}
            className="min-h-[44px] px-2.5 -ml-2 rounded-xl flex items-center gap-1.5 text-zinc-200 hover:bg-white/[0.06] active:scale-95 transition-all cursor-pointer"
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                post.isLiked ? 'text-[#FF2E93] fill-[#FF2E93] drop-shadow-[0_0_8px_rgba(255,46,147,0.7)]' : 'text-zinc-200'
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
        </div>

        <button
          type="button"
          onClick={() => onToggleBookmark(post.id)}
          aria-label={post.isBookmarked ? 'Remove bookmark' : 'Bookmark post'}
          className="min-h-[44px] min-w-[44px] -mr-2 rounded-xl flex items-center justify-center text-zinc-200 hover:bg-white/[0.06] active:scale-95 transition-all cursor-pointer"
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
