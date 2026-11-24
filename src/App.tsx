import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { onAuthStateChanged, signOut, type User as FirebaseUser } from 'firebase/auth';
import { Globe, Heart, Lock, MessageCircle, Plus, Sparkles } from 'lucide-react';
import { auth } from './lib/firebase';
import {
  createFirestoreComment,
  createFirestoreNotification,
  createFirestorePost,
  createFirestoreStory,
  deleteFirestoreComment,
  deleteFirestorePost,
  deleteFirestoreStory,
  fetchUserPrivate,
  fetchUserProfile,
  incrementFirestorePostViews,
  makeChatId,
  markNotificationsRead,
  reactFirestoreMessage,
  recordFirestoreStoryView,
  saveUserPrivateOnly,
  saveUserProfile,
  sendFirestoreMessage,
  subscribeToChats,
  subscribeToDiscoverableUsers,
  subscribeToNotifications,
  subscribeToPosts,
  subscribeToStories,
  toggleFirestorePostLike,
  toggleFirestoreStoryLike,
  updateTargetFollowersCount,
  type RawChatDoc,
} from './lib/firestoreSync';
import { AuthOnboarding } from './components/AuthOnboarding';
import { VerticalCapsuleStories } from './components/VerticalCapsuleStories';
import { StoryViewerModal } from './components/StoryViewerModal';
import { FeedPostCard } from './components/FeedPostCard';
import { CommentDrawer } from './components/CommentDrawer';
import { CreateModal } from './components/CreateModal';
import { SparksView } from './components/SparksView';
import { ExploreView } from './components/ExploreView';
import { DirectMessagesModal } from './components/DirectMessagesModal';
import { ActivityModal } from './components/ActivityModal';
import { ConfirmDialog } from './components/ConfirmDialog';
import { ProfileView } from './components/ProfileView';
import { FloatingBottomDock } from './components/FloatingBottomDock';
import { SplashScreen } from './components/SplashScreen';
import { PostViewerModal } from './components/PostViewerModal';
import type {
  ActiveTab,
  ChatThread,
  CommentItem,
  CreatorProfile,
  FeedScope,
  MoodFilter,
  NotificationItem,
  PostItem,
  StoryItem,
  UserPrivateState,
} from './types';

const MOOD_FILTERS: MoodFilter[] = ['All', 'Desi', 'Music', 'Chill', 'Gaming', 'Tech', 'Aesthetic'];

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [pendingFirebaseUser, setPendingFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<CreatorProfile | null>(null);
  const [userPrivate, setUserPrivate] = useState<UserPrivateState>({
    email: '',
    innerCircleIds: [],
    bookmarkedPostIds: [],
    likedPostIds: [],
    followingIds: [],
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [feedScope, setFeedScope] = useState<FeedScope>('public');
  const [moodFilter, setMoodFilter] = useState<MoodFilter>('All');

  // 100% Real Firestore Live Collections (Zero fake/mock arrays)
  const [rawCreators, setRawCreators] = useState<CreatorProfile[]>([]);
  const [rawStories, setRawStories] = useState<StoryItem[]>([]);
  const [rawPosts, setRawPosts] = useState<PostItem[]>([]);
  const [rawChats, setRawChats] = useState<RawChatDoc[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [seenStoryIds, setSeenStoryIds] = useState<Set<string>>(new Set());
  const [draftThreads, setDraftThreads] = useState<ChatThread[]>([]);

  // Modals & Overlays
  const [viewingStoryIndex, setViewingStoryIndex] = useState<number | null>(null);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [createMode, setCreateMode] = useState<'post' | 'story' | null>(null);
  const [dmOpen, setDmOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [dmInitialThreadId, setDmInitialThreadId] = useState<string | null>(null);
  const [inspectedCreatorId, setInspectedCreatorId] = useState<string | null>(null);
  const [sparksOverlayVideoId, setSparksOverlayVideoId] = useState<string | null>(null);
  const [viewerPostId, setViewerPostId] = useState<string | null>(null);
  const [pendingDeletePostId, setPendingDeletePostId] = useState<string | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Global Sound State & Single Active Home Video State
  const [isMuted, setIsMuted] = useState(true);
  const [activeFeedVideoId, setActiveFeedVideoId] = useState<string | null>(null);
  const [optimisticMinViews, setOptimisticMinViews] = useState<Record<string, number>>({});
  const homeScrollRef = useRef<HTMLDivElement | null>(null);
  const countedViewsRef = useRef<Set<string>>(new Set());

  const handleToggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  const showToast = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 2600);
  }, []);

  // 0. 2-Second Animated VibeGram Splash Screen on Launch
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, []);

  // 1. Firebase Auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setPendingFirebaseUser(null);
        setCurrentUser(null);
        setRawCreators([]);
        setRawPosts([]);
        setRawStories([]);
        setRawChats([]);
        setNotifications([]);
        setAuthReady(true);
        return;
      }

      try {
        const existingProfile = await fetchUserProfile(fbUser.uid);
        if (existingProfile) {
          const existingPriv = (await fetchUserPrivate(fbUser.uid)) || {
            email: fbUser.email || '',
            innerCircleIds: [],
            bookmarkedPostIds: [],
            likedPostIds: [],
            followingIds: [],
          };
          const resolvedEmail = existingProfile.email || fbUser.email || existingPriv.email || '';
          const syncedProfile: CreatorProfile = {
            ...existingProfile,
            email: resolvedEmail || undefined,
          };
          const syncedPriv: UserPrivateState = {
            ...existingPriv,
            email: resolvedEmail,
          };
          setCurrentUser(syncedProfile);
          setUserPrivate(syncedPriv);
          setPendingFirebaseUser(null);

          // Automatically persist email onto users/{uid} for legacy accounts
          if (!existingProfile.email && resolvedEmail) {
            void saveUserProfile(syncedProfile, syncedPriv).catch(() => {});
          }
        } else {
          setPendingFirebaseUser(fbUser);
          setCurrentUser(null);
        }
      } catch {
        setPendingFirebaseUser(fbUser);
      } finally {
        setAuthReady(true);
      }
    });
    return () => unsub();
  }, []);

  // 2. Real-time Firestore Subscriptions (only active when signed in with a real profile)
  useEffect(() => {
    if (!currentUser) return;

    const unsubUsers = subscribeToDiscoverableUsers((users) => {
      setRawCreators(users);
      const mine = users.find((u) => u.uid === currentUser.uid);
      if (mine) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                email: mine.email || prev.email,
                followersCount: mine.followersCount,
                followingCount: mine.followingCount,
              }
            : mine,
        );
      }
    });

    const unsubPosts = subscribeToPosts(currentUser.uid, setRawPosts);
    const unsubStories = subscribeToStories(currentUser.uid, setRawStories);
    const unsubChats = subscribeToChats(currentUser.uid, setRawChats);
    const unsubNotifs = subscribeToNotifications(currentUser.uid, setNotifications);

    return () => {
      unsubUsers();
      unsubPosts();
      unsubStories();
      unsubChats();
      unsubNotifs();
    };
  }, [currentUser?.uid]);

  const handleAuthComplete = (profile: CreatorProfile, priv: UserPrivateState) => {
    setCurrentUser(profile);
    setUserPrivate(priv);
    setPendingFirebaseUser(null);
    showToast(`Welcome to VibeGram, @${profile.handle}`);
  };

  const handleSignOut = async () => {
    await signOut(auth);
    setCurrentUser(null);
    setPendingFirebaseUser(null);
    setActiveTab('home');
    setInspectedCreatorId(null);
    setDmOpen(false);
    setActivityOpen(false);
  };

  // Enrich real Firestore collections with the signed-in user's private state (likes, bookmarks, follows, inner circle)
  const followingSet = useMemo(() => new Set(userPrivate.followingIds), [userPrivate.followingIds]);
  const innerCircleSet = useMemo(() => new Set(userPrivate.innerCircleIds), [userPrivate.innerCircleIds]);
  const bookmarkSet = useMemo(() => new Set(userPrivate.bookmarkedPostIds), [userPrivate.bookmarkedPostIds]);
  const likedSet = useMemo(() => new Set(userPrivate.likedPostIds), [userPrivate.likedPostIds]);

  const creators = useMemo(
    () =>
      rawCreators.map((c) => ({
        ...c,
        isFollowing: followingSet.has(c.uid),
        isInnerCircle: innerCircleSet.has(c.uid),
      })),
    [rawCreators, followingSet, innerCircleSet],
  );

  const posts = useMemo(
    () =>
      rawPosts.map((p) => ({
        ...p,
        views: Math.max(p.views, optimisticMinViews[p.id] || 0),
        isLiked: likedSet.has(p.id),
        isBookmarked: bookmarkSet.has(p.id),
      })),
    [rawPosts, optimisticMinViews, likedSet, bookmarkSet],
  );

  const stories = useMemo(
    () =>
      rawStories.map((s) => ({
        ...s,
        isSeen: seenStoryIds.has(s.id),
      })),
    [rawStories, seenStoryIds],
  );

  const chats = useMemo<ChatThread[]>(() => {
    if (!currentUser) return [];
    const byId = new Map<string, ChatThread>();

    rawChats.forEach((raw) => {
      const otherUid = raw.participantIds.find((id) => id !== currentUser.uid) || currentUser.uid;
      const participant =
        creators.find((c) => c.uid === otherUid) || {
          uid: otherUid,
          handle: 'member',
          displayName: 'VibeGram Member',
          bio: '',
          location: '',
          avatarUrl: '',
          auraBadge: '⚡ Trendsetter',
          auraBorder: 'sunset',
          voiceBioTranscript: '',
          voiceBioDuration: 0,
          voiceBioWaveform: [],
          followersCount: 0,
          followingCount: 0,
          sparksCount: 0,
        };
      byId.set(raw.id, {
        id: raw.id,
        participantIds: raw.participantIds,
        participant,
        lastMessage: raw.lastMessage,
        unreadCount: 0,
        messages: [],
        updatedAt: raw.updatedAt,
      });
    });

    draftThreads.forEach((dt) => {
      if (!byId.has(dt.id)) byId.set(dt.id, dt);
    });

    return Array.from(byId.values()).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [rawChats, draftThreads, creators, currentUser]);

  const visibleStories = useMemo(() => {
    if (feedScope === 'public') return stories;
    return stories.filter(
      (s) =>
        s.visibility === 'inner_circle' ||
        innerCircleSet.has(s.authorId) ||
        s.authorId === currentUser?.uid,
    );
  }, [stories, feedScope, innerCircleSet, currentUser?.uid]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const scopeMatch =
        feedScope === 'public'
          ? post.visibility === 'public' || post.authorId === currentUser?.uid
          : post.visibility === 'inner_circle' ||
            innerCircleSet.has(post.authorId) ||
            post.authorId === currentUser?.uid;
      const moodMatch = moodFilter === 'All' || post.mood === moodFilter;
      return scopeMatch && moodMatch;
    });
  }, [posts, feedScope, moodFilter, innerCircleSet, currentUser?.uid]);

  const videoSparks = useMemo(
    () => posts.filter((p) => p.mediaType === 'video'),
    [posts],
  );

  // Suspend Home Feed video playback whenever another tab or full-screen viewer/modal is active
  const isHomeFeedSuspended =
    activeTab !== 'home' ||
    Boolean(inspectedCreatorId) ||
    Boolean(sparksOverlayVideoId) ||
    Boolean(viewerPostId) ||
    Boolean(pendingDeletePostId) ||
    viewingStoryIndex !== null ||
    Boolean(createMode) ||
    dmOpen ||
    activityOpen;

  // Single Active Video Observer for Home Feed (prevents overlapping audio & pauses off-screen videos)
  useEffect(() => {
    if (isHomeFeedSuspended) {
      setActiveFeedVideoId(null);
      return;
    }

    const rootEl = homeScrollRef.current;
    if (!rootEl) return;

    const videoNodes = rootEl.querySelectorAll<HTMLElement>('[data-feed-video-id]');
    if (videoNodes.length === 0) {
      setActiveFeedVideoId(null);
      return;
    }

    const visibilityMap = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const id = (entry.target as HTMLElement).dataset.feedVideoId;
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
        setActiveFeedVideoId(bestId);
      },
      {
        root: rootEl,
        threshold: [0, 0.25, 0.4, 0.5, 0.65, 0.8, 0.95],
      },
    );

    videoNodes.forEach((node) => observer.observe(node));

    return () => observer.disconnect();
  }, [isHomeFeedSuspended, filteredPosts]);

  // Increment Firestore views count once per video per session after > 2 seconds of playback
  const handleRecordVideoView = useCallback(
    (postId: string) => {
      if (countedViewsRef.current.has(postId)) return;
      countedViewsRef.current.add(postId);

      const currentViews = posts.find((p) => p.id === postId)?.views ?? 0;
      setOptimisticMinViews((prev) => ({
        ...prev,
        [postId]: Math.max(prev[postId] || 0, currentViews + 1),
      }));
      void incrementFirestorePostViews(postId);
    },
    [posts],
  );

  const handleOpenPostViewer = useCallback((post: PostItem) => {
    if (post.mediaType === 'video') {
      setSparksOverlayVideoId(post.id);
    } else {
      setViewerPostId(post.id);
    }
  }, []);

  // --- Real Firestore Mutations ---

  const handleToggleLikePost = async (postId: string) => {
    if (!currentUser) return;
    const alreadyLiked = likedSet.has(postId);
    const targetPost = posts.find((p) => p.id === postId);
    const nextLiked = alreadyLiked
      ? userPrivate.likedPostIds.filter((id) => id !== postId)
      : [...userPrivate.likedPostIds, postId];

    const nextPriv = { ...userPrivate, likedPostIds: nextLiked };
    setUserPrivate(nextPriv);

    await Promise.all([
      toggleFirestorePostLike(postId, alreadyLiked ? -1 : 1),
      saveUserPrivateOnly(currentUser.uid, nextPriv),
    ]);

    if (!alreadyLiked && targetPost && targetPost.authorId !== currentUser.uid) {
      void createFirestoreNotification({
        recipientId: targetPost.authorId,
        sender: currentUser,
        type: 'like',
        postId: targetPost.id,
      });
    }
  };

  const handleToggleBookmarkPost = async (postId: string) => {
    if (!currentUser) return;
    const alreadySaved = bookmarkSet.has(postId);
    const nextSaved = alreadySaved
      ? userPrivate.bookmarkedPostIds.filter((id) => id !== postId)
      : [...userPrivate.bookmarkedPostIds, postId];

    const nextPriv = { ...userPrivate, bookmarkedPostIds: nextSaved };
    setUserPrivate(nextPriv);
    await saveUserPrivateOnly(currentUser.uid, nextPriv);
    showToast(alreadySaved ? 'Removed from Bookmarks' : 'Saved to Bookmarks');
  };

  const handlePublishPost = async (post: PostItem) => {
    await createFirestorePost(post);
    setActiveTab('home');
    if (post.visibility === 'inner_circle') {
      setFeedScope('inner_circle');
    }
    showToast(
      post.visibility === 'inner_circle'
        ? 'Shared with Inner Circle!'
        : 'Published!',
    );
  };

  const handleRequestDeletePost = (postId: string) => {
    setPendingDeletePostId(postId);
  };

  const handleConfirmDeletePost = async () => {
    if (!pendingDeletePostId) return;
    const targetId = pendingDeletePostId;
    setIsDeletingPost(true);
    try {
      await deleteFirestorePost(targetId);
      if (viewerPostId === targetId) setViewerPostId(null);
      if (sparksOverlayVideoId === targetId) setSparksOverlayVideoId(null);
      if (activeCommentPostId === targetId) setActiveCommentPostId(null);
      setPendingDeletePostId(null);
      showToast('Deleted successfully');
    } finally {
      setIsDeletingPost(false);
    }
  };

  const handlePublishStory = async (story: StoryItem) => {
    await createFirestoreStory(story);
    setActiveTab('home');
    showToast('Capsule shared!');
  };

  const handleDeleteStory = async (storyId: string) => {
    await deleteFirestoreStory(storyId);
    showToast('Capsule deleted');
  };

  const handleRecordStoryView = useCallback(
    (story: StoryItem) => {
      if (!currentUser || story.authorId === currentUser.uid) return;
      void recordFirestoreStoryView(story.id, currentUser.uid);
    },
    [currentUser],
  );

  const handleToggleStoryLike = useCallback(
    (story: StoryItem) => {
      if (!currentUser) return;
      const alreadyLiked = (story.likedBy || []).includes(currentUser.uid);
      void toggleFirestoreStoryLike(story.id, currentUser.uid, !alreadyLiked);
      if (!alreadyLiked && story.authorId !== currentUser.uid) {
        void createFirestoreNotification({
          recipientId: story.authorId,
          sender: currentUser,
          type: 'like',
        });
      }
    },
    [currentUser],
  );

  const handleAddComment = async (postId: string, comment: CommentItem) => {
    await createFirestoreComment(postId, comment);
    showToast(comment.type === 'voice' ? 'Voice note posted!' : 'Comment posted!');
    const targetPost = posts.find((p) => p.id === postId);
    if (currentUser && targetPost && targetPost.authorId !== currentUser.uid) {
      void createFirestoreNotification({
        recipientId: targetPost.authorId,
        sender: currentUser,
        type: 'comment',
        postId: targetPost.id,
      });
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    await deleteFirestoreComment(postId, commentId);
    showToast('Comment deleted');
  };

  const handleMarkStorySeen = useCallback((storyId: string) => {
    setSeenStoryIds((prev) => {
      if (prev.has(storyId)) return prev;
      const next = new Set(prev);
      next.add(storyId);
      return next;
    });
  }, []);

  const handleMarkAllNotificationsRead = useCallback(() => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      void markNotificationsRead(unreadIds);
    }
  }, [notifications]);

  const handleToggleFollow = async (targetUid: string) => {
    if (!currentUser || targetUid === currentUser.uid) return;
    const isFollowing = followingSet.has(targetUid);
    const nextFollowingIds = isFollowing
      ? userPrivate.followingIds.filter((id) => id !== targetUid)
      : [...userPrivate.followingIds, targetUid];

    const nextPriv = { ...userPrivate, followingIds: nextFollowingIds };
    const nextProfile: CreatorProfile = {
      ...currentUser,
      followingCount: nextFollowingIds.length,
    };

    setUserPrivate(nextPriv);
    setCurrentUser(nextProfile);

    await Promise.all([
      saveUserProfile(nextProfile, nextPriv),
      updateTargetFollowersCount(targetUid, isFollowing ? -1 : 1),
    ]);

    if (!isFollowing) {
      void createFirestoreNotification({
        recipientId: targetUid,
        sender: currentUser,
        type: 'follow',
      });
    }
  };

  const handleToggleInnerCircleMember = async (targetUid: string) => {
    if (!currentUser) return;
    const isMember = innerCircleSet.has(targetUid);
    const nextCircle = isMember
      ? userPrivate.innerCircleIds.filter((id) => id !== targetUid)
      : [...userPrivate.innerCircleIds, targetUid];

    const nextPriv = { ...userPrivate, innerCircleIds: nextCircle };
    setUserPrivate(nextPriv);
    await saveUserPrivateOnly(currentUser.uid, nextPriv);
  };

  const handleUpdateCurrentUser = async (updates: Partial<CreatorProfile>) => {
    if (!currentUser) return;
    const nextProfile: CreatorProfile = { ...currentUser, ...updates };
    setCurrentUser(nextProfile);
    await saveUserProfile(nextProfile, userPrivate);
    showToast('Changes saved!');
  };

  const handleOpenDMWith = (creator: CreatorProfile) => {
    if (!currentUser || creator.uid === currentUser.uid) return;
    const chatId = makeChatId(currentUser.uid, creator.uid);
    const exists = chats.some((c) => c.id === chatId);
    if (!exists) {
      setDraftThreads((prev) => [
        {
          id: chatId,
          participantIds: [currentUser.uid, creator.uid].sort(),
          participant: creator,
          lastMessage: '',
          unreadCount: 0,
          messages: [],
          updatedAt: Date.now(),
        },
        ...prev,
      ]);
    }
    setDmInitialThreadId(chatId);
    setDmOpen(true);
  };

  const handleSendMessage = async (thread: ChatThread, text: string) => {
    if (!currentUser) return;
    await sendFirestoreMessage(thread.id, thread.participantIds, currentUser.uid, text);
  };

  const handleReactMessage = async (chatId: string, messageId: string, emoji: string) => {
    await reactFirestoreMessage(chatId, messageId, emoji);
  };

  const handleReplyToStory = (story: StoryItem, text: string) => {
    if (!currentUser || story.authorId === currentUser.uid) {
      showToast('Reply sent');
      return;
    }
    const chatId = makeChatId(currentUser.uid, story.authorId);
    const participantIds = [currentUser.uid, story.authorId].sort();
    void sendFirestoreMessage(chatId, participantIds, currentUser.uid, `[Capsule reply] ${text}`);
    showToast(`Sent to @${story.authorHandle}`);
  };

  const handleShare = async (post: PostItem, kind: 'post' | 'Spark' = 'post') => {
    const shareUrl = `${window.location.origin}${window.location.pathname}#${post.id}`;
    const shareTitle = `VibeGram · @${post.authorHandle}`;
    const shareText = post.caption
      ? `@${post.authorHandle}: ${post.caption}`
      : `Check out @${post.authorHandle}'s ${kind} on VibeGram`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return;
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
    showToast(`Link copied for @${post.authorHandle}'s ${kind}`);
  };

  const handleInspectCreator = (authorId: string) => {
    if (currentUser && authorId === currentUser.uid) {
      setInspectedCreatorId(null);
      setActiveTab('profile');
      return;
    }
    setInspectedCreatorId(authorId);
  };

  const activeCommentPost = posts.find((p) => p.id === activeCommentPostId) || null;
  const inspectedCreator = creators.find((c) => c.uid === inspectedCreatorId) || null;
  const viewerPost = posts.find((p) => p.id === viewerPostId) || null;
  const pendingDeletePost = posts.find((p) => p.id === pendingDeletePostId) || null;
  const unreadNotificationsCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );
  const isSparksTabSuspended =
    Boolean(sparksOverlayVideoId) ||
    Boolean(viewerPostId) ||
    Boolean(pendingDeletePostId) ||
    viewingStoryIndex !== null ||
    Boolean(createMode) ||
    dmOpen ||
    activityOpen;

  return (
    <div className="min-h-dvh w-full bg-[#020204] text-zinc-100 flex items-center justify-center md:p-5 overflow-hidden">
      <div
        className="pointer-events-none fixed inset-0 hidden md:block"
        style={{
          background:
            'radial-gradient(circle at 22% 18%, rgba(255, 107, 53, 0.11), transparent 42%), radial-gradient(circle at 50% 52%, rgba(255, 46, 147, 0.08), transparent 46%), radial-gradient(circle at 78% 82%, rgba(123, 44, 191, 0.14), transparent 45%)',
        }}
      />

      <main className="relative w-full h-dvh md:w-[430px] md:h-[min(892px,94dvh)] bg-[#050505] md:rounded-[44px] md:border md:border-white/[0.12] md:shadow-[0_32px_100px_-16px_rgba(0,0,0,0.95),0_0_60px_-24px_rgba(255,46,147,0.22)] overflow-hidden flex flex-col">
        {!authReady ? (
          <div className="h-full w-full flex flex-col items-center justify-center gap-3 bg-[#050505]">
            <img
              src="/assets/vibegram-icon.png"
              alt="VibeGram"
              className="w-12 h-12 rounded-2xl object-cover animate-pulse shadow-[0_8px_24px_-4px_rgba(255,46,147,0.55)]"
            />
            <p className="text-xs text-zinc-400">Connecting to VibeGram…</p>
          </div>
        ) : !currentUser ? (
          <AuthOnboarding
            pendingFirebaseUser={pendingFirebaseUser}
            onComplete={handleAuthComplete}
          />
        ) : (
          <>
            <div className="relative flex-1 min-h-0 overflow-hidden">
              {inspectedCreator ? (
                <ProfileView
                  profile={inspectedCreator}
                  isOwnProfile={false}
                  posts={posts}
                  bookmarkedPosts={[]}
                  creators={creators}
                  onBack={() => setInspectedCreatorId(null)}
                  onUpdateProfile={async () => {}}
                  onToggleFollow={handleToggleFollow}
                  onToggleInnerCircleMember={handleToggleInnerCircleMember}
                  onOpenDM={handleOpenDMWith}
                  onOpenPost={handleOpenPostViewer}
                  onSignOut={handleSignOut}
                />
              ) : activeTab === 'home' ? (
                <div ref={homeScrollRef} className="h-full overflow-y-auto no-scrollbar pb-28">
                  {/* Top Header */}
                  <header className="sticky top-0 z-30 h-14 px-4 bg-[#050505]/86 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 shrink-0">
                      <img
                        src="/assets/vibegram-icon.png"
                        alt="VibeGram"
                        className="w-7 h-7 rounded-lg object-cover shadow-[0_4px_14px_-2px_rgba(255,46,147,0.5)]"
                      />
                      <span className="font-display text-base font-bold tracking-tight text-white">
                        VibeGram
                      </span>
                    </div>

                    {/* Public vs. Inner Circle Toggle */}
                    <div
                      role="tablist"
                      aria-label="Feed audience scope"
                      className="flex items-center p-1 rounded-full bg-white/[0.06] border border-white/10"
                    >
                      <button
                        type="button"
                        role="tab"
                        aria-selected={feedScope === 'public'}
                        onClick={() => setFeedScope('public')}
                        className={`h-7 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer ${
                          feedScope === 'public'
                            ? 'vibe-gradient-bg text-white shadow-[0_0_14px_rgba(255,46,147,0.45)]'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Globe className="w-3 h-3" />
                        Public
                      </button>
                      <button
                        type="button"
                        role="tab"
                        aria-selected={feedScope === 'inner_circle'}
                        onClick={() => setFeedScope('inner_circle')}
                        className={`h-7 px-2.5 rounded-full text-[11px] font-semibold flex items-center gap-1 whitespace-nowrap transition-all cursor-pointer ${
                          feedScope === 'inner_circle'
                            ? 'bg-[#7B2CBF] text-white shadow-[0_0_14px_rgba(123,44,191,0.65)]'
                            : 'text-zinc-400 hover:text-white'
                        }`}
                      >
                        <Lock className="w-3 h-3" />
                        Circle
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setActivityOpen(true)}
                        aria-label="Open Activity and Notifications"
                        className="relative w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white hover:bg-white/12 active:scale-95 transition-all cursor-pointer"
                      >
                        <Heart className="w-[18px] h-[18px]" />
                        {unreadNotificationsCount > 0 && (
                          <span
                            aria-label={`${unreadNotificationsCount} unread notifications`}
                            className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-[#FF2E93] ring-2 ring-[#050505] shadow-[0_0_8px_#FF2E93]"
                          />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setDmInitialThreadId(null);
                          setDmOpen(true);
                        }}
                        aria-label="Open Direct Messages"
                        className="relative w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white hover:bg-white/12 active:scale-95 transition-all cursor-pointer"
                      >
                        <MessageCircle className="w-[18px] h-[18px]" />
                      </button>
                    </div>
                  </header>

                  {/* 1. REAL VERTICAL CAPSULE STORIES */}
                  <VerticalCapsuleStories
                    currentUser={currentUser}
                    stories={visibleStories}
                    onOpenStory={(index) => setViewingStoryIndex(index)}
                    onCreateStory={() => setCreateMode('story')}
                  />

                  {/* 2. MOOD / VIBE FEED FILTER PILLS */}
                  <div
                    aria-label="Filter feed by mood"
                    className="flex items-center gap-2 overflow-x-auto no-scrollbar px-4 pb-3.5"
                  >
                    {MOOD_FILTERS.map((mood) => {
                      const active = moodFilter === mood;
                      return (
                        <button
                          key={mood}
                          type="button"
                          onClick={() => setMoodFilter(mood)}
                          className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                            active
                              ? 'vibe-gradient-bg text-white font-semibold shadow-[0_6px_18px_-6px_rgba(255,46,147,0.55)]'
                              : 'bg-white/[0.06] text-zinc-300 border border-white/10 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {mood}
                        </button>
                      );
                    })}
                  </div>

                  {/* 3. REAL FIRESTORE FEED */}
                  <div className="space-y-4">
                    {filteredPosts.length === 0 ? (
                      <div className="mx-4 rounded-[28px] glass-surface p-8 text-center space-y-4">
                        <div className="w-14 h-14 rounded-2xl mx-auto bg-white/[0.05] border border-white/10 flex items-center justify-center text-[#FF6B35]">
                          <Sparkles className="w-6 h-6" />
                        </div>
                        <div className="space-y-1.5">
                          <p className="font-display text-base font-semibold text-white">
                            {moodFilter !== 'All'
                              ? `No ${moodFilter} drops yet`
                              : feedScope === 'inner_circle'
                                ? 'Your Inner Circle is quiet'
                                : 'Your live feed is empty'}
                          </p>
                          <p className="text-xs text-zinc-400 leading-relaxed max-w-[260px] mx-auto">
                            Tap Create (+) to upload your first photo or video and share it on VibeGram.
                          </p>
                        </div>
                        <div className="flex items-center justify-center gap-2 pt-1">
                          {moodFilter !== 'All' && (
                            <button
                              type="button"
                              onClick={() => setMoodFilter('All')}
                              className="h-10 px-4 rounded-xl bg-white/[0.07] text-zinc-200 text-xs font-semibold cursor-pointer"
                            >
                              Show All Moods
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setCreateMode('post')}
                            className="h-10 px-4 rounded-xl vibe-gradient-bg text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-[0_8px_20px_-6px_rgba(255,46,147,0.55)] cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            Create First Post
                          </button>
                        </div>
                      </div>
                    ) : (
                      filteredPosts.map((post) => (
                        <FeedPostCard
                          key={post.id}
                          post={post}
                          isOwnPost={post.authorId === currentUser.uid}
                          isActiveVideo={!isHomeFeedSuspended && activeFeedVideoId === post.id}
                          isMuted={isMuted}
                          onToggleMute={handleToggleMute}
                          onOpenVideoInSparks={(videoId) => setSparksOverlayVideoId(videoId)}
                          onRecordVideoView={handleRecordVideoView}
                          onToggleLike={handleToggleLikePost}
                          onToggleBookmark={handleToggleBookmarkPost}
                          onOpenComments={(p) => setActiveCommentPostId(p.id)}
                          onShare={(p) => void handleShare(p, p.mediaType === 'video' ? 'Spark' : 'post')}
                          onDeletePost={handleRequestDeletePost}
                          onInspectCreator={handleInspectCreator}
                        />
                      ))
                    )}
                  </div>
                </div>
              ) : activeTab === 'explore' ? (
                <ExploreView
                  currentUserId={currentUser.uid}
                  creators={creators}
                  posts={posts}
                  onToggleFollow={handleToggleFollow}
                  onInspectCreator={handleInspectCreator}
                  onOpenDMWith={handleOpenDMWith}
                  onOpenPost={handleOpenPostViewer}
                />
              ) : activeTab === 'sparks' ? (
                <SparksView
                  currentUserId={currentUser.uid}
                  videoPosts={videoSparks}
                  isMuted={isMuted}
                  isSuspended={isSparksTabSuspended}
                  onToggleMute={handleToggleMute}
                  onRecordVideoView={handleRecordVideoView}
                  onToggleLike={handleToggleLikePost}
                  onToggleBookmark={handleToggleBookmarkPost}
                  onOpenComments={(p) => setActiveCommentPostId(p.id)}
                  onShare={(p) => void handleShare(p, 'Spark')}
                  onDeletePost={handleRequestDeletePost}
                  onInspectCreator={handleInspectCreator}
                  onOpenCreate={() => setCreateMode('post')}
                />
              ) : (
                <ProfileView
                  profile={currentUser}
                  userEmail={userPrivate.email}
                  isOwnProfile
                  posts={posts}
                  bookmarkedPosts={posts.filter((p) => p.isBookmarked)}
                  creators={creators}
                  onUpdateProfile={handleUpdateCurrentUser}
                  onToggleInnerCircleMember={handleToggleInnerCircleMember}
                  onOpenPost={handleOpenPostViewer}
                  onSignOut={handleSignOut}
                />
              )}
            </div>

            <FloatingBottomDock
              activeTab={activeTab}
              onSelectTab={(tab) => {
                setInspectedCreatorId(null);
                setSparksOverlayVideoId(null);
                setViewerPostId(null);
                setActiveTab(tab);
              }}
              onOpenCreate={() => setCreateMode('post')}
            />

            {/* Full-Screen Sparks Viewer Overlay (launched from Home Feed video tap or Profile/Explore video click) */}
            <AnimatePresence>
              {sparksOverlayVideoId && videoSparks.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 24 }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute inset-0 z-50 bg-[#050505]"
                >
                  <SparksView
                    currentUserId={currentUser.uid}
                    videoPosts={videoSparks}
                    initialVideoId={sparksOverlayVideoId}
                    isMuted={isMuted}
                    isSuspended={
                      Boolean(pendingDeletePostId) ||
                      viewingStoryIndex !== null ||
                      Boolean(createMode) ||
                      dmOpen ||
                      activityOpen
                    }
                    onToggleMute={handleToggleMute}
                    onRecordVideoView={handleRecordVideoView}
                    onToggleLike={handleToggleLikePost}
                    onToggleBookmark={handleToggleBookmarkPost}
                    onOpenComments={(p) => setActiveCommentPostId(p.id)}
                    onShare={(p) => void handleShare(p, 'Spark')}
                    onDeletePost={handleRequestDeletePost}
                    onInspectCreator={handleInspectCreator}
                    onOpenCreate={() => {
                      setSparksOverlayVideoId(null);
                      setCreateMode('post');
                    }}
                    onClose={() => setSparksOverlayVideoId(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Full-Screen Photo Post Viewer Modal (launched from Profile or Explore grid click) */}
            <AnimatePresence>
              {viewerPost && (
                <PostViewerModal
                  post={viewerPost}
                  isOwnPost={viewerPost.authorId === currentUser.uid}
                  onClose={() => setViewerPostId(null)}
                  onToggleLike={handleToggleLikePost}
                  onToggleBookmark={handleToggleBookmarkPost}
                  onOpenComments={(p) => setActiveCommentPostId(p.id)}
                  onShare={(p) => void handleShare(p, 'post')}
                  onDeletePost={handleRequestDeletePost}
                  onInspectCreator={handleInspectCreator}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {viewingStoryIndex !== null && visibleStories.length > 0 && (
                <StoryViewerModal
                  stories={visibleStories}
                  initialIndex={viewingStoryIndex}
                  currentUser={currentUser}
                  creators={creators}
                  onClose={() => setViewingStoryIndex(null)}
                  onMarkSeen={handleMarkStorySeen}
                  onRecordStoryView={handleRecordStoryView}
                  onToggleStoryLike={handleToggleStoryLike}
                  onDeleteStory={handleDeleteStory}
                  onReplyToStory={handleReplyToStory}
                  onInspectCreator={handleInspectCreator}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activeCommentPost && (
                <CommentDrawer
                  post={activeCommentPost}
                  currentUser={currentUser}
                  onClose={() => setActiveCommentPostId(null)}
                  onAddComment={handleAddComment}
                  onDeleteComment={handleDeleteComment}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {createMode && (
                <CreateModal
                  currentUser={currentUser}
                  initialMode={createMode}
                  onClose={() => setCreateMode(null)}
                  onPublishPost={handlePublishPost}
                  onPublishStory={handlePublishStory}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {dmOpen && (
                <DirectMessagesModal
                  currentUser={currentUser}
                  threads={chats}
                  initialThreadId={dmInitialThreadId}
                  onClose={() => setDmOpen(false)}
                  onSendMessage={handleSendMessage}
                  onReactMessage={handleReactMessage}
                />
              )}
            </AnimatePresence>

            <AnimatePresence>
              {activityOpen && (
                <ActivityModal
                  notifications={notifications}
                  posts={posts}
                  onClose={() => setActivityOpen(false)}
                  onMarkAllRead={handleMarkAllNotificationsRead}
                  onOpenPost={handleOpenPostViewer}
                  onInspectCreator={handleInspectCreator}
                />
              )}
            </AnimatePresence>

            {/* Quick In-App Delete Confirmation for Posts & Sparks */}
            <ConfirmDialog
              open={Boolean(pendingDeletePostId)}
              title={
                pendingDeletePost?.mediaType === 'video'
                  ? 'Delete this Spark?'
                  : 'Delete this post?'
              }
              description="This drop will be permanently removed from VibeGram."
              confirmLabel="Delete"
              isLoading={isDeletingPost}
              onConfirm={() => void handleConfirmDeletePost()}
              onCancel={() => setPendingDeletePostId(null)}
            />

            <AnimatePresence>
              {toast && (
                <motion.div
                  initial={{ opacity: 0, y: -16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  className="pointer-events-none absolute top-16 inset-x-0 z-[70] flex justify-center px-4"
                >
                  <div className="px-4 py-2 rounded-full bg-[#12121A]/95 border border-[#FF2E93]/40 text-xs font-medium text-white shadow-2xl backdrop-blur-xl">
                    {toast}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}

        {/* 2-Second Animated Splash Screen */}
        <AnimatePresence>{showSplash && <SplashScreen />}</AnimatePresence>
      </main>
    </div>
  );
}
