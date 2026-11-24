import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bookmark,
  Heart,
  Lock,
  MessageCircle,
  Send,
  Trash2,
} from 'lucide-react';
import { formatCount, formatRelativeTime } from '../lib/utils';
import { SafeImage } from './SafeImage';
import { UserAvatar } from './UserAvatar';
import type { PostItem } from '../types';

interface PostViewerModalProps {
  post: PostItem;
  isOwnPost: boolean;
  onClose: () => void;
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onOpenComments: (post: PostItem) => void;
  onShare: (post: PostItem) => void;
  onDeletePost?: (postId: string) => void;
  onInspectCreator: (authorId: string) => void;
}

export const PostViewerModal: React.FC<PostViewerModalProps> = ({
  post,
  isOwnPost,
  onClose,
  onToggleLike,
  onToggleBookmark,
  onOpenComments,
  onShare,
  onDeletePost,
  onInspectCreator,
}) => {
  const [showHeartBurst, setShowHeartBurst] = useState(false);
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
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-50 bg-[#050505] flex flex-col select-none"
    >
      {/* Top Header */}
      <div className="shrink-0 h-15 px-3 bg-[#050505]/92 backdrop-blur-xl border-b border-white/[0.07] flex items-center justify-between gap-2 z-20">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close post viewer"
            className="w-10 h-10 rounded-full flex items-center justify-center text-white hover:bg-white/[0.08] active:scale-95 transition-all cursor-pointer shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onInspectCreator(post.authorId);
            }}
            className="flex items-center gap-2.5 min-w-0 text-left cursor-pointer group"
          >
            <div className="p-[1.5px] rounded-xl vibe-capsule-ring shrink-0">
              <UserAvatar
                src={post.authorAvatar}
                alt={post.authorName}
                className="w-9 h-9 rounded-[10.5px]"
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-white group-hover:text-[#FF6B35] truncate">
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
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {post.visibility === 'inner_circle' && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#C77DFF] px-2 py-1 rounded-full bg-[#7B2CBF]/20 border border-[#7B2CBF]/35">
              <Lock className="w-3 h-3" />
              Circle
            </span>
          )}
          {isOwnPost && onDeletePost && (
            <button
              type="button"
              onClick={() => onDeletePost(post.id)}
              aria-label="Delete post"
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-white/[0.08] cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Full-Screen Media Canvas with Dark Blurred Backdrop & object-contain */}
      <div
        onClick={handleMediaTap}
        onDoubleClick={triggerDoubleTapLike}
        className="relative flex-1 min-h-0 overflow-hidden bg-[#050505] flex items-center justify-center cursor-pointer"
      >
        <div
          className="pointer-events-none absolute inset-0 z-0 overflow-hidden bg-[#050505]"
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

      {/* Bottom Action Bar & Caption */}
      <div className="shrink-0 bg-[#08080D]/95 backdrop-blur-xl border-t border-white/[0.08] px-4 pt-2 pb-5 space-y-2 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
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
              aria-label="Open comments"
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

        {post.caption && (
          <p className="text-[13.5px] text-zinc-200 leading-relaxed max-h-24 overflow-y-auto no-scrollbar">
            <span className="font-semibold text-white mr-1.5">@{post.authorHandle}</span>
            {post.caption}
          </p>
        )}
      </div>
    </motion.div>
  );
};
