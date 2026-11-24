import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import type {
  ChatMessage,
  CommentItem,
  CreatorProfile,
  NotificationItem,
  NotificationType,
  PostItem,
  StoryItem,
  UserPrivateState,
} from '../types';

function clampString(val: string | undefined, max: number): string {
  return (val || '').trim().slice(0, max);
}

function toMillis(ts: unknown): number {
  if (ts && typeof ts === 'object' && 'toMillis' in ts && typeof (ts as { toMillis: () => number }).toMillis === 'function') {
    return (ts as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function mapUserDoc(uid: string, data: Record<string, unknown>): CreatorProfile {
  return {
    uid,
    email: String(data.email || '') || undefined,
    handle: String(data.handle || 'vibe.user'),
    displayName: String(data.displayName || 'Creator'),
    bio: String(data.bio || ''),
    location: String(data.location || ''),
    avatarUrl: String(data.avatarUrl || ''),
    auraBadge: String(data.auraBadge || '⚡ Trendsetter'),
    auraBorder: (data.auraBorder as CreatorProfile['auraBorder']) || 'sunset',
    voiceBioUrl: String(data.voiceBioUrl || '') || undefined,
    voiceBioTranscript: String(data.voiceBioTranscript || ''),
    voiceBioDuration: Number(data.voiceBioDuration || 0),
    voiceBioWaveform: Array.isArray(data.voiceBioWaveform) ? (data.voiceBioWaveform as number[]) : [],
    followersCount: Number(data.followersCount || 0),
    followingCount: Number(data.followingCount || 0),
    sparksCount: Number(data.sparksCount || 0),
    isOnline: true,
  };
}

function mapPostDoc(id: string, data: Record<string, unknown>): PostItem {
  return {
    id,
    authorId: String(data.authorId || ''),
    authorHandle: String(data.authorHandle || 'creator'),
    authorName: String(data.authorName || 'Creator'),
    authorAvatar: String(data.authorAvatar || ''),
    authorAura: String(data.authorAura || '⚡ Trendsetter'),
    mediaUrl: String(data.mediaUrl || ''),
    mediaType: data.mediaType === 'video' ? 'video' : 'image',
    caption: String(data.caption || ''),
    location: String(data.location || '') || undefined,
    mood: (data.mood as PostItem['mood']) || 'Desi',
    visibility: data.visibility === 'inner_circle' ? 'inner_circle' : 'public',
    likesCount: Number(data.likesCount || 0),
    commentsCount: Number(data.commentsCount || 0),
    views: Number(data.views || 0),
    isLiked: false,
    isBookmarked: false,
    comments: [],
    createdAt: toMillis(data.createdAt),
  };
}

function mapStoryDoc(id: string, data: Record<string, unknown>): StoryItem {
  return {
    id,
    authorId: String(data.authorId || ''),
    authorHandle: String(data.authorHandle || 'creator'),
    authorName: String(data.authorName || 'Creator'),
    authorAvatar: String(data.authorAvatar || ''),
    authorAura: String(data.authorAura || '⚡ Trendsetter'),
    mediaUrl: String(data.mediaUrl || ''),
    mediaType: data.mediaType === 'video' ? 'video' : 'image',
    caption: String(data.caption || ''),
    mood: (data.mood as StoryItem['mood']) || 'Desi',
    visibility: data.visibility === 'inner_circle' ? 'inner_circle' : 'public',
    viewedBy: Array.isArray(data.viewedBy) ? (data.viewedBy as string[]) : [],
    likedBy: Array.isArray(data.likedBy) ? (data.likedBy as string[]) : [],
    isSeen: false,
    createdAt: toMillis(data.createdAt),
  };
}

// --- User Profile & Private Info ---

export async function fetchUserProfile(uid: string): Promise<CreatorProfile | null> {
  const path = `users/${uid}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return null;
    return mapUserDoc(snap.id, snap.data() as Record<string, unknown>);
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function fetchUserPrivate(uid: string): Promise<UserPrivateState | null> {
  const path = `users/${uid}/private/info`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'private', 'info'));
    if (!snap.exists()) return null;
    const data = snap.data();
    return {
      email: String(data.email || ''),
      innerCircleIds: Array.isArray(data.innerCircleIds) ? (data.innerCircleIds as string[]) : [],
      bookmarkedPostIds: Array.isArray(data.bookmarkedPostIds) ? (data.bookmarkedPostIds as string[]) : [],
      likedPostIds: Array.isArray(data.likedPostIds) ? (data.likedPostIds as string[]) : [],
      followingIds: Array.isArray(data.followingIds) ? (data.followingIds as string[]) : [],
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.GET, path);
  }
}

export async function saveUserProfile(
  profile: CreatorProfile,
  priv: UserPrivateState,
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== profile.uid) return;
  const userPath = `users/${profile.uid}`;
  const privatePath = `users/${profile.uid}/private/info`;

  try {
    const userRef = doc(db, 'users', profile.uid);
    const snap = await getDoc(userRef);

    const rawHandle = (profile.handle || 'vibe.user')
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, '')
      .slice(0, 32);
    const cleanHandle = rawHandle.length >= 2 ? rawHandle : 'vibe.user';

    const resolvedEmail = clampString(profile.email || priv.email || auth.currentUser.email || '', 200);

    const commonFields = {
      email: resolvedEmail,
      handle: cleanHandle,
      displayName: clampString(profile.displayName || 'Creator', 60) || 'Creator',
      bio: clampString(profile.bio, 240),
      location: clampString(profile.location, 80),
      avatarUrl: (profile.avatarUrl || '').slice(0, 350000),
      auraBadge: clampString(profile.auraBadge || '⚡ Trendsetter', 40),
      auraBorder: profile.auraBorder,
      voiceBioUrl: (profile.voiceBioUrl || '').slice(0, 2000),
      voiceBioTranscript: clampString(profile.voiceBioTranscript, 240),
      voiceBioDuration: Math.max(0, Math.min(15, Number(profile.voiceBioDuration || 0))),
      voiceBioWaveform: (profile.voiceBioWaveform || []).slice(0, 40),
      followingCount: Math.max(0, Number(profile.followingCount || 0)),
      sparksCount: Math.max(0, Number(profile.sparksCount || 0)),
      isDiscoverable: true,
      updatedAt: serverTimestamp(),
    };

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: profile.uid,
        ...commonFields,
        followersCount: Math.max(0, Number(profile.followersCount || 0)),
        createdAt: serverTimestamp(),
      });
    } else {
      await updateDoc(userRef, commonFields);
    }

    const privRef = doc(db, 'users', profile.uid, 'private', 'info');
    await setDoc(privRef, {
      uid: profile.uid,
      email: clampString(priv.email, 200),
      innerCircleIds: priv.innerCircleIds.slice(0, 100),
      bookmarkedPostIds: priv.bookmarkedPostIds.slice(0, 200),
      likedPostIds: priv.likedPostIds.slice(0, 500),
      followingIds: priv.followingIds.slice(0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `${userPath} / ${privatePath}`);
  }
}

export async function saveUserPrivateOnly(uid: string, priv: UserPrivateState): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== uid) return;
  const path = `users/${uid}/private/info`;
  try {
    await setDoc(doc(db, 'users', uid, 'private', 'info'), {
      uid,
      email: clampString(priv.email, 200),
      innerCircleIds: priv.innerCircleIds.slice(0, 100),
      bookmarkedPostIds: priv.bookmarkedPostIds.slice(0, 200),
      likedPostIds: priv.likedPostIds.slice(0, 500),
      followingIds: priv.followingIds.slice(0, 500),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

export async function updateTargetFollowersCount(
  targetUid: string,
  delta: 1 | -1,
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid === targetUid) return;
  const path = `users/${targetUid}`;
  try {
    const ref = doc(db, 'users', targetUid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const current = Number(snap.data().followersCount || 0);
    const next = Math.max(0, current + delta);
    if (next === current) return;
    await updateDoc(ref, {
      followersCount: next,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// --- Real-Time Subscriptions ---

export function subscribeToDiscoverableUsers(
  onUpdate: (users: CreatorProfile[]) => void,
): Unsubscribe {
  const path = 'users';
  const q = query(collection(db, 'users'), where('isDiscoverable', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs.map((d) => mapUserDoc(d.id, d.data() as Record<string, unknown>));
      onUpdate(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeToPosts(
  uid: string,
  onUpdate: (posts: PostItem[]) => void,
): Unsubscribe {
  const publicMap = new Map<string, PostItem>();
  const ownMap = new Map<string, PostItem>();

  const emit = () => {
    const merged = new Map<string, PostItem>();
    publicMap.forEach((v, k) => merged.set(k, v));
    ownMap.forEach((v, k) => merged.set(k, v));
    const sorted = Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
    onUpdate(sorted);
  };

  const unsubPublic = onSnapshot(
    query(collection(db, 'posts'), where('visibility', '==', 'public')),
    (snap) => {
      publicMap.clear();
      snap.docs.forEach((d) => publicMap.set(d.id, mapPostDoc(d.id, d.data() as Record<string, unknown>)));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'posts (public)'),
  );

  const unsubOwn = onSnapshot(
    query(collection(db, 'posts'), where('authorId', '==', uid)),
    (snap) => {
      ownMap.clear();
      snap.docs.forEach((d) => ownMap.set(d.id, mapPostDoc(d.id, d.data() as Record<string, unknown>)));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'posts (own)'),
  );

  return () => {
    unsubPublic();
    unsubOwn();
  };
}

export function subscribeToStories(
  uid: string,
  onUpdate: (stories: StoryItem[]) => void,
): Unsubscribe {
  const publicMap = new Map<string, StoryItem>();
  const ownMap = new Map<string, StoryItem>();

  const emit = () => {
    const merged = new Map<string, StoryItem>();
    publicMap.forEach((v, k) => merged.set(k, v));
    ownMap.forEach((v, k) => merged.set(k, v));
    const sorted = Array.from(merged.values()).sort((a, b) => b.createdAt - a.createdAt);
    onUpdate(sorted);
  };

  const unsubPublic = onSnapshot(
    query(collection(db, 'stories'), where('visibility', '==', 'public')),
    (snap) => {
      publicMap.clear();
      snap.docs.forEach((d) => publicMap.set(d.id, mapStoryDoc(d.id, d.data() as Record<string, unknown>)));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'stories (public)'),
  );

  const unsubOwn = onSnapshot(
    query(collection(db, 'stories'), where('authorId', '==', uid)),
    (snap) => {
      ownMap.clear();
      snap.docs.forEach((d) => ownMap.set(d.id, mapStoryDoc(d.id, d.data() as Record<string, unknown>)));
      emit();
    },
    (error) => handleFirestoreError(error, OperationType.LIST, 'stories (own)'),
  );

  return () => {
    unsubPublic();
    unsubOwn();
  };
}

export function subscribeToComments(
  postId: string,
  onUpdate: (comments: CommentItem[]) => void,
): Unsubscribe {
  const path = `posts/${postId}/comments`;
  const q = query(collection(db, 'posts', postId, 'comments'), where('postId', '==', postId));
  return onSnapshot(
    q,
    (snap) => {
      const list: CommentItem[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            postId: String(data.postId || postId),
            authorId: String(data.authorId || ''),
            authorHandle: String(data.authorHandle || 'creator'),
            authorAvatar: String(data.authorAvatar || ''),
            type: (data.type === 'voice' ? 'voice' : 'text') as 'text' | 'voice',
            text: String(data.text || ''),
            audioUrl: String(data.audioUrl || '') || undefined,
            audioDuration: Number(data.audioDuration || 0),
            waveform: Array.isArray(data.waveform) ? (data.waveform as number[]) : [],
            createdAt: toMillis(data.createdAt),
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path),
  );
}

// --- Post, Story & Comment Writes ---

export async function createFirestorePost(post: PostItem): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== post.authorId) {
    throw new Error('You must be signed in to publish a post.');
  }
  const path = `posts/${post.id}`;
  try {
    await setDoc(doc(db, 'posts', post.id), {
      id: post.id,
      authorId: post.authorId,
      authorHandle: clampString(post.authorHandle, 32),
      authorName: clampString(post.authorName, 60) || 'Creator',
      authorAvatar: (post.authorAvatar || '').slice(0, 350000),
      authorAura: clampString(post.authorAura || '⚡ Trendsetter', 40),
      mediaUrl: post.mediaUrl.slice(0, 450000),
      mediaType: post.mediaType,
      caption: clampString(post.caption, 500),
      location: clampString(post.location, 80),
      mood: post.mood,
      visibility: post.visibility,
      likesCount: 0,
      commentsCount: 0,
      views: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteFirestorePost(postId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `posts/${postId}`;
  try {
    await deleteDoc(doc(db, 'posts', postId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function toggleFirestorePostLike(postId: string, delta: 1 | -1): Promise<void> {
  if (!auth.currentUser) return;
  const path = `posts/${postId}`;
  try {
    const ref = doc(db, 'posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const current = Number(snap.data().likesCount || 0);
    const next = Math.max(0, current + delta);
    if (next === current) return;
    await updateDoc(ref, {
      likesCount: next,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function incrementFirestorePostViews(postId: string): Promise<void> {
  if (!auth.currentUser) return;
  try {
    const ref = doc(db, 'posts', postId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const current = Number(snap.data().views || 0);
    await updateDoc(ref, {
      views: current + 1,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking telemetry: avoid crashing video playback if rules or network reject
  }
}

export async function createFirestoreStory(story: StoryItem): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== story.authorId) {
    throw new Error('You must be signed in to publish a story.');
  }
  const path = `stories/${story.id}`;
  try {
    await setDoc(doc(db, 'stories', story.id), {
      id: story.id,
      authorId: story.authorId,
      authorHandle: clampString(story.authorHandle, 32),
      authorName: clampString(story.authorName, 60) || 'Creator',
      authorAvatar: (story.authorAvatar || '').slice(0, 350000),
      authorAura: clampString(story.authorAura || '⚡ Trendsetter', 40),
      mediaUrl: story.mediaUrl.slice(0, 450000),
      mediaType: story.mediaType,
      caption: clampString(story.caption, 200),
      mood: story.mood,
      visibility: story.visibility,
      viewedBy: [],
      likedBy: [],
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function recordFirestoreStoryView(storyId: string, viewerUid: string): Promise<void> {
  if (!auth.currentUser || !viewerUid) return;
  try {
    await updateDoc(doc(db, 'stories', storyId), {
      viewedBy: arrayUnion(viewerUid),
    });
  } catch {
    // Non-blocking story view telemetry
  }
}

export async function toggleFirestoreStoryLike(
  storyId: string,
  likerUid: string,
  shouldLike: boolean,
): Promise<void> {
  if (!auth.currentUser || !likerUid) return;
  const path = `stories/${storyId}`;
  try {
    await updateDoc(doc(db, 'stories', storyId), {
      likedBy: shouldLike ? arrayUnion(likerUid) : arrayRemove(likerUid),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

export async function deleteFirestoreStory(storyId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `stories/${storyId}`;
  try {
    await deleteDoc(doc(db, 'stories', storyId));
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

export async function createFirestoreComment(postId: string, comment: CommentItem): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== comment.authorId) return;
  const path = `posts/${postId}/comments/${comment.id}`;
  try {
    const parentRef = doc(db, 'posts', postId);
    const parentSnap = await getDoc(parentRef);
    if (!parentSnap.exists()) return;

    await setDoc(doc(db, 'posts', postId, 'comments', comment.id), {
      id: comment.id,
      postId,
      authorId: comment.authorId,
      authorHandle: clampString(comment.authorHandle, 32),
      authorAvatar: (comment.authorAvatar || '').slice(0, 350000),
      type: comment.type,
      text: clampString(comment.text, 300),
      audioUrl: (comment.audioUrl || '').slice(0, 2000),
      audioDuration: Math.max(0, Math.min(15, Number(comment.audioDuration || 0))),
      waveform: (comment.waveform || []).slice(0, 40),
      createdAt: serverTimestamp(),
    });

    await updateDoc(parentRef, {
      commentsCount: Number(parentSnap.data().commentsCount || 0) + 1,
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, path);
  }
}

export async function deleteFirestoreComment(postId: string, commentId: string): Promise<void> {
  if (!auth.currentUser) return;
  const path = `posts/${postId}/comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'posts', postId, 'comments', commentId));
    const parentRef = doc(db, 'posts', postId);
    const parentSnap = await getDoc(parentRef);
    if (parentSnap.exists()) {
      const current = Number(parentSnap.data().commentsCount || 0);
      if (current > 0) {
        await updateDoc(parentRef, {
          commentsCount: current - 1,
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// --- Real-Time Activity Notifications ---

export function subscribeToNotifications(
  uid: string,
  onUpdate: (notifications: NotificationItem[]) => void,
): Unsubscribe {
  const path = 'notifications';
  const q = query(collection(db, 'notifications'), where('recipientId', '==', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list: NotificationItem[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            recipientId: String(data.recipientId || ''),
            senderId: String(data.senderId || ''),
            senderName: String(data.senderName || 'Creator'),
            senderHandle: String(data.senderHandle || 'member'),
            senderAvatar: String(data.senderAvatar || ''),
            type: (data.type as NotificationType) || 'like',
            postId: String(data.postId || '') || undefined,
            read: Boolean(data.read),
            createdAt: toMillis(data.createdAt),
          };
        })
        .sort((a, b) => b.createdAt - a.createdAt);
      onUpdate(list);
    },
    () => {
      // Gracefully ignore until notifications rules are deployed on external Firebase project
      onUpdate([]);
    },
  );
}

export async function createFirestoreNotification(params: {
  recipientId: string;
  sender: CreatorProfile;
  type: NotificationType;
  postId?: string;
}): Promise<void> {
  if (!auth.currentUser) return;
  if (!params.recipientId || params.recipientId === params.sender.uid) return;
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  try {
    await setDoc(doc(db, 'notifications', id), {
      id,
      recipientId: params.recipientId,
      senderId: params.sender.uid,
      senderName: clampString(params.sender.displayName || 'Creator', 60) || 'Creator',
      senderHandle: clampString(params.sender.handle || 'member', 32),
      senderAvatar: (params.sender.avatarUrl || '').slice(0, 350000),
      type: params.type,
      postId: clampString(params.postId, 128),
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch {
    // Non-blocking notification write
  }
}

export async function markNotificationsRead(notificationIds: string[]): Promise<void> {
  if (!auth.currentUser || notificationIds.length === 0) return;
  await Promise.all(
    notificationIds.map((id) =>
      updateDoc(doc(db, 'notifications', id), { read: true }).catch(() => {}),
    ),
  );
}

// --- Real-Time Direct Messages ---

export interface RawChatDoc {
  id: string;
  participantIds: string[];
  lastMessage: string;
  updatedAt: number;
}

export function makeChatId(uidA: string, uidB: string): string {
  const sorted = [uidA, uidB].sort();
  return `dm_${sorted[0]}_${sorted[1]}`.slice(0, 128);
}

export function subscribeToChats(
  uid: string,
  onUpdate: (chats: RawChatDoc[]) => void,
): Unsubscribe {
  const path = 'chats';
  const q = query(collection(db, 'chats'), where('participantIds', 'array-contains', uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            participantIds: Array.isArray(data.participantIds) ? (data.participantIds as string[]) : [],
            lastMessage: String(data.lastMessage || ''),
            updatedAt: toMillis(data.updatedAt),
          };
        })
        .sort((a, b) => b.updatedAt - a.updatedAt);
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path),
  );
}

export function subscribeToMessages(
  chatId: string,
  uid: string,
  onUpdate: (messages: ChatMessage[]) => void,
): Unsubscribe {
  const path = `chats/${chatId}/messages`;
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    where('participantIds', 'array-contains', uid),
  );
  return onSnapshot(
    q,
    (snap) => {
      const list: ChatMessage[] = snap.docs
        .map((d) => {
          const data = d.data();
          return {
            id: d.id,
            chatId: String(data.chatId || chatId),
            senderId: String(data.senderId || ''),
            participantIds: Array.isArray(data.participantIds) ? (data.participantIds as string[]) : [],
            text: String(data.text || ''),
            reaction: String(data.reaction || '') || undefined,
            createdAt: toMillis(data.createdAt),
          };
        })
        .sort((a, b) => a.createdAt - b.createdAt);
      onUpdate(list);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path),
  );
}

export async function sendFirestoreMessage(
  chatId: string,
  participantIds: string[],
  senderId: string,
  text: string,
): Promise<void> {
  if (!auth.currentUser || auth.currentUser.uid !== senderId) return;
  const cleanText = clampString(text, 500);
  if (!cleanText) return;

  const chatRef = doc(db, 'chats', chatId);
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  try {
    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        id: chatId,
        participantIds,
        lastMessage: cleanText.slice(0, 300),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(chatRef, {
        lastMessage: cleanText.slice(0, 300),
        updatedAt: serverTimestamp(),
      });
    }

    await setDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      id: messageId,
      chatId,
      senderId,
      participantIds,
      text: cleanText,
      reaction: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.CREATE, `chats/${chatId}/messages/${messageId}`);
  }
}

export async function reactFirestoreMessage(
  chatId: string,
  messageId: string,
  reaction: string,
): Promise<void> {
  if (!auth.currentUser) return;
  const path = `chats/${chatId}/messages/${messageId}`;
  try {
    await updateDoc(doc(db, 'chats', chatId, 'messages', messageId), {
      reaction: reaction.slice(0, 8),
      updatedAt: serverTimestamp(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}
