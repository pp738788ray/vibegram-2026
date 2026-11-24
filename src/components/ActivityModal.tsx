import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Bell, Heart, MessageCircle, UserPlus, X } from 'lucide-react';
import { formatRelativeTime } from '../lib/utils';
import { UserAvatar } from './UserAvatar';
import type { NotificationItem, PostItem } from '../types';

interface ActivityModalProps {
  notifications: NotificationItem[];
  posts: PostItem[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onOpenPost: (post: PostItem) => void;
  onInspectCreator: (uid: string) => void;
}

export const ActivityModal: React.FC<ActivityModalProps> = ({
  notifications,
  posts,
  onClose,
  onMarkAllRead,
  onOpenPost,
  onInspectCreator,
}) => {
  useEffect(() => {
    onMarkAllRead();
  }, [onMarkAllRead]);

  const getNotificationCopy = (n: NotificationItem) => {
    if (n.type === 'follow') return 'started following you.';
    if (n.type === 'comment') return 'commented on your post.';
    return n.postId ? 'liked your post.' : 'liked your Capsule.';
  };

  const getBadgeIcon = (type: NotificationItem['type']) => {
    if (type === 'follow') {
      return (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#7B2CBF] border-2 border-[#08080D] flex items-center justify-center">
          <UserPlus className="w-2.5 h-2.5 text-white" />
        </span>
      );
    }
    if (type === 'comment') {
      return (
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FF6B35] border-2 border-[#08080D] flex items-center justify-center">
          <MessageCircle className="w-2.5 h-2.5 text-white fill-white" />
        </span>
      );
    }
    return (
      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[#FF2E93] border-2 border-[#08080D] flex items-center justify-center">
        <Heart className="w-2.5 h-2.5 text-white fill-white" />
      </span>
    );
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-50 bg-[#050505] flex flex-col"
    >
      {/* Header */}
      <div className="h-16 px-4 border-b border-white/10 bg-[#08080C]/92 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
        <div>
          <h2 className="font-display text-lg font-bold text-white">Activity</h2>
          <p className="text-[11px] text-zinc-400">Likes, comments &amp; new followers</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close activity"
          className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2.5">
        {notifications.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 space-y-3">
            <div className="w-14 h-14 rounded-2xl glass-surface flex items-center justify-center text-[#FF2E93]">
              <Bell className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">All caught up</p>
              <p className="text-xs text-zinc-400 max-w-[250px] leading-relaxed">
                When someone likes your drop, comments, or follows you, it will appear right here.
              </p>
            </div>
          </div>
        ) : (
          notifications.map((notif) => {
            const linkedPost = notif.postId
              ? posts.find((p) => p.id === notif.postId)
              : undefined;

            return (
              <button
                key={notif.id}
                type="button"
                onClick={() => {
                  onClose();
                  if (linkedPost) {
                    onOpenPost(linkedPost);
                  } else {
                    onInspectCreator(notif.senderId);
                  }
                }}
                className={`w-full rounded-2xl p-3.5 flex items-center gap-3.5 text-left transition-all cursor-pointer active:scale-[0.99] ${
                  notif.read
                    ? 'glass-surface hover:bg-white/[0.09]'
                    : 'bg-[#FF2E93]/10 border border-[#FF2E93]/30 hover:bg-[#FF2E93]/15'
                }`}
              >
                <div className="relative shrink-0">
                  <UserAvatar
                    src={notif.senderAvatar}
                    alt={notif.senderName}
                    className="w-11 h-11 rounded-2xl"
                  />
                  {getBadgeIcon(notif.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-zinc-200 leading-snug">
                    <span className="font-semibold text-white">@{notif.senderHandle}</span>{' '}
                    {getNotificationCopy(notif)}
                  </p>
                  <span className="text-[11px] font-mono tabular-nums text-zinc-500 mt-0.5 block">
                    {formatRelativeTime(notif.createdAt)}
                  </span>
                </div>

                {linkedPost && (
                  <div className="w-11 h-11 rounded-xl overflow-hidden bg-zinc-900 border border-white/10 shrink-0">
                    {linkedPost.mediaType === 'video' ? (
                      <video
                        src={linkedPost.mediaUrl}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <img
                        src={linkedPost.mediaUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
              </button>
            );
          })
        )}
      </div>
    </motion.div>
  );
};
