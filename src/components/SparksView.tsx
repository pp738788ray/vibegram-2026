import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bookmark,
  Flame,
  Heart,
  MessageCircle,
  Plus,
  Send,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatCount } from '../lib/utils';
import { SafeImage } from './SafeImage';
import type { PostItem } from '../types';

interface SparksViewProps {
  videoPosts: PostItem[];
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onOpenComments: (post: PostItem) => void;
  onShare: (post: PostItem) => void;
  onInspectCreator: (authorId: string) => void;
  onOpenCreate: () => void;
}

export const SparksView: React.FC<SparksViewProps> = ({
  videoPosts,
  onToggleLike,
  onToggleBookmark,
  onOpenComments,
  onShare,
  onInspectCreator,
  onOpenCreate,
}) => {
  const [isMuted, setIsMuted] = useState(true);
  const [burstId, setBurstId] = useState<string | null>(null);

  const handleDoubleTap = (post: PostItem) => {
    setBurstId(post.id);
    if (!post.isLiked) {
      onToggleLike(post.id);
    }
    window.setTimeout(() => setBurstId(null), 700);
  };

  if (videoPosts.length === 0) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center px-6 pb-24 text-center bg-[#050505] space-y-5">
        <div className="w-16 h-16 rounded-[24px] glass-surface flex items-center justify-center text-[#FF6B35]">
          <Flame className="w-8 h-8" />
        </div>
        <div className="space-y-1.5 max-w-[280px]">
          <h2 className="font-display text-xl font-bold text-white">No Sparks yet</h2>
          <p className="text-xs text-zinc-400 leading-relaxed">
            Sparks showcases real short videos uploaded via Create (+). Upload a video clip to ignite the feed.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenCreate}
          className="h-11 px-5 rounded-2xl vibe-gradient-bg text-white text-xs font-semibold flex items-center gap-2 shadow-[0_10px_28px_-8px_rgba(255,46,147,0.55)] active:scale-95 transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Upload Video Spark
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-[#050505]">
      {videoPosts.map((spark) => (
        <section
          key={spark.id}
          onDoubleClick={() => handleDoubleTap(spark)}
          className="relative h-full w-full snap-start shrink-0 overflow-hidden bg-[#050505] select-none"
        >
          {/* Real uploaded vertical video */}
          <video
            src={spark.mediaUrl}
            autoPlay
            loop
            playsInline
            muted={isMuted}
            className="w-full h-full object-cover"
          />

          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/75 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-72 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

          {/* Header overlay */}
          <div className="absolute top-4 inset-x-4 z-10 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold tracking-tight text-white">
              Sparks
            </h2>
            <button
              type="button"
              onClick={() => setIsMuted((prev) => !prev)}
              aria-label={isMuted ? 'Unmute spark video' : 'Mute spark video'}
              className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white cursor-pointer"
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5 text-[#FF6B35]" />
              )}
            </button>
          </div>

          <AnimatePresence>
            {burstId === spark.id && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1.15 }}
                exit={{ opacity: 0, scale: 1.5 }}
                transition={{ duration: 0.35 }}
                className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
              >
                <div className="w-20 h-20 rounded-full vibe-gradient-bg flex items-center justify-center shadow-[0_0_40px_rgba(255,46,147,0.75)]">
                  <Heart className="w-10 h-10 text-white fill-white" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Right Vertical Action Rail */}
          <div className="absolute right-3 bottom-28 z-20 flex flex-col items-center gap-4">
            <button
              type="button"
              onClick={() => onToggleLike(spark.id)}
              aria-label="Like spark"
              className="flex flex-col items-center gap-1 min-w-[44px] cursor-pointer active:scale-90 transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center">
                <Heart
                  className={`w-5 h-5 ${
                    spark.isLiked ? 'text-[#FF2E93] fill-[#FF2E93]' : 'text-white'
                  }`}
                />
              </div>
              <span className="text-[11px] font-mono tabular-nums text-white drop-shadow">
                {formatCount(spark.likesCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onOpenComments(spark)}
              aria-label="Spark comments"
              className="flex flex-col items-center gap-1 min-w-[44px] cursor-pointer active:scale-90 transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-mono tabular-nums text-white drop-shadow">
                {formatCount(spark.commentsCount)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => onToggleBookmark(spark.id)}
              aria-label="Bookmark spark"
              className="flex flex-col items-center gap-1 min-w-[44px] cursor-pointer active:scale-90 transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center">
                <Bookmark
                  className={`w-5 h-5 ${
                    spark.isBookmarked ? 'text-[#C77DFF] fill-[#C77DFF]' : 'text-white'
                  }`}
                />
              </div>
              <span className="text-[11px] font-medium text-white drop-shadow">Save</span>
            </button>

            <button
              type="button"
              onClick={() => onShare(spark)}
              aria-label="Share spark"
              className="flex flex-col items-center gap-1 min-w-[44px] cursor-pointer active:scale-90 transition-transform"
            >
              <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <span className="text-[11px] font-medium text-white drop-shadow">Share</span>
            </button>
          </div>

          {/* Bottom Creator Info */}
          <div className="absolute left-4 right-20 bottom-28 z-20 space-y-2">
            <button
              type="button"
              onClick={() => onInspectCreator(spark.authorId)}
              className="flex items-center gap-2.5 text-left cursor-pointer group"
            >
              <div className="p-[1.5px] rounded-2xl vibe-capsule-ring">
                <SafeImage
                  src={spark.authorAvatar}
                  alt={spark.authorHandle}
                  className="w-10 h-10 rounded-[14.5px] object-cover"
                />
              </div>
              <div>
                <span className="block text-sm font-semibold text-white group-hover:text-[#FF6B35]">
                  @{spark.authorHandle}
                </span>
                <span className="text-[11px] font-medium vibe-gradient-text">
                  {spark.authorAura} · {spark.mood}
                </span>
              </div>
            </button>

            {spark.caption && (
              <p className="text-xs text-zinc-100 leading-relaxed drop-shadow">
                {spark.caption}
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
};
