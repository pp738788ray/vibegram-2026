import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  Bookmark,
  Eye,
  Flame,
  Heart,
  MessageCircle,
  Play,
  Plus,
  Send,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { formatCount } from '../lib/utils';
import { UserAvatar } from './UserAvatar';
import type { PostItem } from '../types';

interface SparksViewProps {
  currentUserId: string;
  videoPosts: PostItem[];
  initialVideoId?: string | null;
  isMuted: boolean;
  isSuspended?: boolean;
  onToggleMute: () => void;
  onRecordVideoView: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onOpenComments: (post: PostItem) => void;
  onShare: (post: PostItem) => void;
  onDeletePost?: (postId: string) => void;
  onInspectCreator: (authorId: string) => void;
  onOpenCreate: () => void;
  onClose?: () => void;
}

interface SparkSlideProps {
  spark: PostItem;
  isOwnSpark: boolean;
  isActive: boolean;
  isMuted: boolean;
  isOverlay: boolean;
  onToggleMute: () => void;
  onRecordVideoView: (postId: string) => void;
  onToggleLike: (postId: string) => void;
  onToggleBookmark: (postId: string) => void;
  onOpenComments: (post: PostItem) => void;
  onShare: (post: PostItem) => void;
  onDeletePost?: (postId: string) => void;
  onInspectCreator: (authorId: string) => void;
  onClose?: () => void;
}

const SparkSlide: React.FC<SparkSlideProps> = ({
  spark,
  isOwnSpark,
  isActive,
  isMuted,
  isOverlay,
  onToggleMute,
  onRecordVideoView,
  onToggleLike,
  onToggleBookmark,
  onOpenComments,
  onShare,
  onDeletePost,
  onInspectCreator,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bgVideoRef = useRef<HTMLVideoElement | null>(null);
  const lastTapRef = useRef<number>(0);
  const singleTapTimerRef = useRef<number | null>(null);

  const [isPausedByUser, setIsPausedByUser] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Reset manual pause when scrolling away so next visit plays cleanly
  useEffect(() => {
    if (!isActive) {
      setIsPausedByUser(false);
    }
  }, [isActive]);

  // Strictly play ONLY when active & not user-paused; pause & mute all off-screen videos
  useEffect(() => {
    const video = videoRef.current;
    const bgVideo = bgVideoRef.current;
    if (!video) return;

    const shouldPlay = isActive && !isPausedByUser;
    if (shouldPlay) {
      video.muted = isMuted;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {
          video.muted = true;
          void video.play().catch(() => {});
        });
      }
      if (bgVideo) {
        bgVideo.muted = true;
        void bgVideo.play().catch(() => {});
      }
    } else {
      video.pause();
      video.muted = true;
      if (bgVideo) {
        bgVideo.pause();
      }
    }
  }, [isActive, isMuted, isPausedByUser]);

  // Increment Firestore views after > 2 seconds of continuous active playback
  useEffect(() => {
    if (!isActive || isPausedByUser) return;
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
          onRecordVideoView(spark.id);
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
  }, [isActive, isPausedByUser, onRecordVideoView, spark.id]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current !== null) {
        window.clearTimeout(singleTapTimerRef.current);
      }
    };
  }, []);

  const handleSurfaceTap = () => {
    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 260;
    lastTapRef.current = now;

    if (isDoubleTap) {
      if (singleTapTimerRef.current !== null) {
        window.clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      setShowHeartBurst(true);
      if (!spark.isLiked) {
        onToggleLike(spark.id);
      }
      window.setTimeout(() => setShowHeartBurst(false), 720);
      return;
    }

    if (singleTapTimerRef.current !== null) {
      window.clearTimeout(singleTapTimerRef.current);
    }
    singleTapTimerRef.current = window.setTimeout(() => {
      singleTapTimerRef.current = null;
      setIsPausedByUser((prev) => !prev);
    }, 260);
  };

  const bottomOffset = isOverlay ? 'bottom-8' : 'bottom-28';

  return (
    <section
      data-spark-id={spark.id}
      onClick={handleSurfaceTap}
      className="relative h-full w-full snap-start shrink-0 overflow-hidden bg-[#050505] select-none flex items-center justify-center"
    >
      {/* Blurred dark backdrop for landscape 16:9 videos so they never crop sides */}
      {isLandscape && (
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
          <video
            ref={bgVideoRef}
            src={spark.mediaUrl}
            muted
            loop
            playsInline
            tabIndex={-1}
            className="w-full h-full object-cover scale-110 blur-2xl opacity-45 brightness-50"
          />
          <div className="absolute inset-0 bg-black/35" />
        </div>
      )}

      {/* Primary video: full 9:16 vertical fill (object-cover) or uncropped 16:9 landscape (object-contain) */}
      <video
        ref={videoRef}
        src={spark.mediaUrl}
        loop
        playsInline
        muted={isMuted || !isActive}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const el = e.currentTarget;
          setIsLandscape(el.videoWidth > el.videoHeight);
        }}
        className={`relative z-[1] w-full h-full ${isLandscape ? 'object-contain' : 'object-cover'}`}
      />

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[5] h-28 bg-gradient-to-b from-black/75 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-72 bg-gradient-to-t from-black/95 via-black/55 to-transparent" />

      {/* Top Header Overlay */}
      <div className="absolute top-4 inset-x-4 z-20 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          {onClose && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close Sparks viewer"
              className="w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h2 className="font-display text-lg font-bold tracking-tight text-white drop-shadow">
            Sparks
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {isOwnSpark && onDeletePost && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeletePost(spark.id);
              }}
              aria-label="Delete Spark"
              title="Delete Spark"
              className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-zinc-200 hover:text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMute();
            }}
            aria-label={isMuted ? 'Unmute spark video' : 'Mute spark video'}
            className="w-11 h-11 rounded-full bg-black/50 backdrop-blur-md border border-white/15 flex items-center justify-center text-white active:scale-95 transition-transform cursor-pointer"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5 text-[#FF6B35]" />
            )}
          </button>
        </div>
      </div>

      {/* Paused Center Indicator */}
      <AnimatePresence>
        {isPausedByUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <div className="w-16 h-16 rounded-full bg-black/55 backdrop-blur-md border border-white/20 flex items-center justify-center">
              <Play className="w-7 h-7 text-white fill-white translate-x-[2px]" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Double-Tap Heart Burst */}
      <AnimatePresence>
        {showHeartBurst && (
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
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute right-3 ${bottomOffset} z-20 flex flex-col items-center gap-3.5`}
      >
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

        <div
          className="flex flex-col items-center gap-1 min-w-[44px]"
          aria-label={`${spark.views} views`}
        >
          <div className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-md border border-white/15 flex items-center justify-center">
            <Eye className="w-5 h-5 text-[#FF6B35]" />
          </div>
          <span className="text-[11px] font-mono tabular-nums text-white drop-shadow">
            {formatCount(spark.views)}
          </span>
        </div>

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
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute left-4 right-20 ${bottomOffset} z-20 space-y-2`}
      >
        <button
          type="button"
          onClick={() => {
            onClose?.();
            onInspectCreator(spark.authorId);
          }}
          className="flex items-center gap-2.5 text-left cursor-pointer group"
        >
          <div className="p-[1.5px] rounded-2xl vibe-capsule-ring">
            <UserAvatar
              src={spark.authorAvatar}
              alt={spark.authorHandle}
              className="w-10 h-10 rounded-[14.5px]"
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
          <p className="text-xs text-zinc-100 leading-relaxed drop-shadow line-clamp-3">
            {spark.caption}
          </p>
        )}

        <div className="inline-flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-zinc-300/90">
          <Play className="w-3 h-3 fill-[#FF6B35] text-[#FF6B35]" />
          <span>
            {formatCount(spark.views)} {spark.views === 1 ? 'view' : 'views'}
          </span>
        </div>
      </div>
    </section>
  );
};

export const SparksView: React.FC<SparksViewProps> = ({
  currentUserId,
  videoPosts,
  initialVideoId = null,
  isMuted,
  isSuspended = false,
  onToggleMute,
  onRecordVideoView,
  onToggleLike,
  onToggleBookmark,
  onOpenComments,
  onShare,
  onDeletePost,
  onInspectCreator,
  onOpenCreate,
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [activeSparkId, setActiveSparkId] = useState<string | null>(
    initialVideoId || videoPosts[0]?.id || null,
  );

  // Jump immediately to initialVideoId when launched from Home Feed or Profile
  useEffect(() => {
    if (!initialVideoId || !containerRef.current) return;
    const targetIdx = videoPosts.findIndex((v) => v.id === initialVideoId);
    if (targetIdx >= 0) {
      const container = containerRef.current;
      container.scrollTo({
        top: targetIdx * container.clientHeight,
        behavior: 'instant' as ScrollBehavior,
      });
      setActiveSparkId(initialVideoId);
    }
  }, [initialVideoId, videoPosts.length]);

  // Single Active Spark Observer: ONLY the single most-visible Spark plays
  useEffect(() => {
    const container = containerRef.current;
    if (!container || videoPosts.length === 0) return;

    const visibilityMap = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.sparkId;
          if (!id) return;
          visibilityMap.set(id, entry.isIntersecting ? entry.intersectionRatio : 0);
        });

        let bestId: string | null = null;
        let bestRatio = 0.5;
        visibilityMap.forEach((ratio, id) => {
          if (ratio >= bestRatio) {
            bestRatio = ratio;
            bestId = id;
          }
        });
        if (bestId) {
          setActiveSparkId(bestId);
        }
      },
      {
        root: container,
        threshold: [0, 0.25, 0.5, 0.75, 0.95],
      },
    );

    const nodes = container.querySelectorAll<HTMLElement>('[data-spark-id]');
    nodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [videoPosts]);

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
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-scroll snap-y snap-mandatory no-scrollbar bg-[#050505]"
    >
      {videoPosts.map((spark) => (
        <SparkSlide
          key={spark.id}
          spark={spark}
          isOwnSpark={spark.authorId === currentUserId}
          isActive={!isSuspended && activeSparkId === spark.id}
          isMuted={isMuted}
          isOverlay={Boolean(onClose)}
          onToggleMute={onToggleMute}
          onRecordVideoView={onRecordVideoView}
          onToggleLike={onToggleLike}
          onToggleBookmark={onToggleBookmark}
          onOpenComments={onOpenComments}
          onShare={onShare}
          onDeletePost={onDeletePost}
          onInspectCreator={onInspectCreator}
          onClose={onClose}
        />
      ))}
    </div>
  );
};
