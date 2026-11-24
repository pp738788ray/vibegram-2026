export type Mood = 'Desi' | 'Music' | 'Chill' | 'Gaming' | 'Tech' | 'Aesthetic';
export type MoodFilter = 'All' | Mood;
export type FeedScope = 'public' | 'inner_circle';
export type AuraBorder = 'sunset' | 'flame' | 'magenta' | 'violet' | 'aurora' | 'cyan' | 'emerald';
export type ActiveTab = 'home' | 'explore' | 'sparks' | 'profile';

export interface CreatorProfile {
  uid: string;
  handle: string;
  displayName: string;
  bio: string;
  location: string;
  avatarUrl: string;
  auraBadge: string;
  auraBorder: AuraBorder;
  voiceBioUrl?: string;
  voiceBioTranscript: string;
  voiceBioDuration: number; // seconds, up to 10
  voiceBioWaveform: number[];
  followersCount: number;
  followingCount: number;
  sparksCount: number;
  isOnline?: boolean;
  isInnerCircle?: boolean;
  isFollowing?: boolean;
}

export interface UserPrivateState {
  email: string;
  innerCircleIds: string[];
  bookmarkedPostIds: string[];
  likedPostIds: string[];
  followingIds: string[];
}

export interface CommentItem {
  id: string;
  postId: string;
  authorId: string;
  authorHandle: string;
  authorAvatar: string;
  authorAura?: string;
  type: 'text' | 'voice';
  text: string;
  audioUrl?: string;
  audioDuration: number;
  waveform: number[];
  createdAt: number;
}

export interface PostItem {
  id: string;
  authorId: string;
  authorHandle: string;
  authorName: string;
  authorAvatar: string;
  authorAura: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  location?: string;
  mood: Mood;
  visibility: FeedScope;
  likesCount: number;
  commentsCount: number;
  views: number;
  isLiked: boolean;
  isBookmarked: boolean;
  comments: CommentItem[];
  createdAt: number;
}

export interface StoryItem {
  id: string;
  authorId: string;
  authorHandle: string;
  authorName: string;
  authorAvatar: string;
  authorAura: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  caption: string;
  mood: Mood;
  visibility: FeedScope;
  isSeen: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  participantIds: string[];
  text: string;
  reaction?: string;
  createdAt: number;
}

export interface ChatThread {
  id: string;
  participantIds: string[];
  participant: CreatorProfile;
  lastMessage: string;
  unreadCount: number;
  messages: ChatMessage[];
  updatedAt: number;
}
