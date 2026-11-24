import React, { useMemo, useState } from 'react';
import { Eye, Heart, MessageSquare, Play, Search, UserCheck, UserPlus, X } from 'lucide-react';
import { formatCount, getAuraBorderStyle } from '../lib/utils';
import { SafeImage } from './SafeImage';
import { UserAvatar } from './UserAvatar';
import type { CreatorProfile, MoodFilter, PostItem } from '../types';

interface ExploreViewProps {
  currentUserId: string;
  creators: CreatorProfile[];
  posts: PostItem[];
  onToggleFollow: (creatorUid: string) => void;
  onInspectCreator: (creatorUid: string) => void;
  onOpenDMWith: (creator: CreatorProfile) => void;
  onOpenPost: (post: PostItem) => void;
}

const EXPLORE_MOODS: MoodFilter[] = ['All', 'Desi', 'Music', 'Chill', 'Gaming', 'Tech', 'Aesthetic'];

export const ExploreView: React.FC<ExploreViewProps> = ({
  currentUserId,
  creators,
  posts,
  onToggleFollow,
  onInspectCreator,
  onOpenDMWith,
  onOpenPost,
}) => {
  const [query, setQuery] = useState('');
  const [selectedMood, setSelectedMood] = useState<MoodFilter>('All');

  const trimmed = query.trim().toLowerCase();

  const otherCreators = useMemo(
    () => creators.filter((c) => c.uid !== currentUserId),
    [creators, currentUserId],
  );

  const filteredCreators = useMemo(() => {
    if (!trimmed) return otherCreators;
    return otherCreators.filter(
      (c) =>
        c.handle.toLowerCase().includes(trimmed) ||
        c.displayName.toLowerCase().includes(trimmed) ||
        c.location.toLowerCase().includes(trimmed) ||
        c.auraBadge.toLowerCase().includes(trimmed),
    );
  }, [otherCreators, trimmed]);

  const filteredPosts = useMemo(() => {
    return posts.filter((p) => {
      const moodOk = selectedMood === 'All' || p.mood === selectedMood;
      const queryOk =
        !trimmed ||
        p.caption.toLowerCase().includes(trimmed) ||
        p.authorHandle.toLowerCase().includes(trimmed) ||
        p.authorName.toLowerCase().includes(trimmed) ||
        p.mood.toLowerCase().includes(trimmed) ||
        (p.location || '').toLowerCase().includes(trimmed);
      return moodOk && queryOk;
    });
  }, [posts, selectedMood, trimmed]);

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-28">
      <div className="sticky top-0 z-20 bg-[#050505]/88 backdrop-blur-xl px-4 pt-4 pb-3 border-b border-white/[0.06] space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-xl font-bold tracking-tight text-white">Explore</h1>
          <span className="text-xs text-zinc-400 font-mono tabular-nums">
            {creators.length} {creators.length === 1 ? 'member' : 'members'}
          </span>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search real @handles, cities, or moods…"
            className="w-full h-11 rounded-2xl bg-white/[0.06] border border-white/10 pl-10 pr-10 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E93]/65 transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {EXPLORE_MOODS.map((mood) => (
            <button
              key={mood}
              type="button"
              onClick={() => setSelectedMood(mood)}
              className={`shrink-0 h-8 px-3.5 rounded-full text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                selectedMood === mood
                  ? 'vibe-gradient-bg text-white font-semibold shadow-[0_6px_16px_-4px_rgba(255,46,147,0.5)]'
                  : 'bg-white/[0.06] text-zinc-300 border border-white/8 hover:text-white'
              }`}
            >
              {mood}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-6">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-white">
              {trimmed ? 'Matching Members' : 'People on VibeGram'}
            </h2>
          </div>

          {filteredCreators.length === 0 ? (
            <div className="rounded-2xl glass-surface p-5 text-center space-y-1">
              <p className="text-xs font-medium text-zinc-300">
                {trimmed ? `No members matched “${query}”.` : 'No other members have joined yet.'}
              </p>
              {!trimmed && (
                <p className="text-[11px] text-zinc-500">
                  Real accounts signed in via Google will appear here automatically.
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredCreators.map((creator) => {
                const aura = getAuraBorderStyle(creator.auraBorder);
                return (
                  <div
                    key={creator.uid}
                    className="rounded-2xl glass-surface p-3 flex items-center justify-between gap-3"
                  >
                    <button
                      type="button"
                      onClick={() => onInspectCreator(creator.uid)}
                      className="flex items-center gap-3 min-w-0 text-left flex-1 cursor-pointer group"
                    >
                      <div className={`p-[1.5px] rounded-2xl shrink-0 ${aura.ring}`}>
                        <UserAvatar
                          src={creator.avatarUrl}
                          alt={creator.displayName}
                          className="w-11 h-11 rounded-[14.5px]"
                        />
                      </div>
                      <div className="min-w-0">
                        <span className="block text-sm font-semibold text-white group-hover:text-[#FF6B35] truncate">
                          @{creator.handle}
                        </span>
                        <p className="text-[11px] vibe-gradient-text font-medium truncate">
                          {creator.auraBadge}
                        </p>
                        <p className="text-[11px] text-zinc-400 truncate">
                          <span className="font-mono tabular-nums text-zinc-300">
                            {formatCount(creator.followersCount)}
                          </span>{' '}
                          followers{creator.location ? ` · ${creator.location}` : ''}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => onOpenDMWith(creator)}
                        aria-label={`Message ${creator.handle}`}
                        className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-zinc-300 hover:text-[#FF6B35] active:scale-95 transition-all cursor-pointer"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onToggleFollow(creator.uid)}
                        className={`h-10 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                          creator.isFollowing
                            ? 'bg-white/[0.08] text-zinc-200 border border-white/12'
                            : 'vibe-gradient-bg text-white shadow-[0_6px_16px_-4px_rgba(255,46,147,0.5)]'
                        }`}
                      >
                        {creator.isFollowing ? (
                          <>
                            <UserCheck className="w-3.5 h-3.5 text-[#FF6B35]" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-3.5 h-3.5" />
                            Follow
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-display text-sm font-semibold text-white">Recent Drops</h2>
          {filteredPosts.length === 0 ? (
            <div className="rounded-2xl glass-surface p-6 text-center space-y-1">
              <p className="text-xs font-medium text-zinc-300">No drops uploaded yet</p>
              <p className="text-[11px] text-zinc-500">
                Posts created with the + button will appear here live.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {filteredPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => onOpenPost(post)}
                  className="group relative rounded-[22px] overflow-hidden aspect-[4/5] bg-[#0B0B0F] border border-white/8 text-left cursor-pointer"
                >
                  {post.mediaType === 'video' ? (
                    <video
                      src={post.mediaUrl}
                      muted
                      playsInline
                      preload="metadata"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <SafeImage
                      src={post.mediaUrl}
                      alt={post.caption || post.authorHandle}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  )}
                  {post.mediaType === 'video' && (
                    <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-white fill-white translate-x-[1px]" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  <div className="absolute bottom-2.5 inset-x-2.5 space-y-0.5">
                    <span className="block text-[11px] font-semibold text-white truncate">
                      @{post.authorHandle}
                    </span>
                    <div className="flex items-center justify-between text-[10px] text-zinc-300">
                      <span>{post.mood}</span>
                      {post.mediaType === 'video' ? (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Eye className="w-3 h-3 text-[#FF6B35]" />
                          {formatCount(post.views)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                          <Heart className="w-3 h-3 text-[#FF2E93] fill-[#FF2E93]" />
                          {formatCount(post.likesCount)}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
