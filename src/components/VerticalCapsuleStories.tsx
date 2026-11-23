import React from 'react';
import { Lock, Plus, Sparkles } from 'lucide-react';
import { SafeImage } from './SafeImage';
import type { CreatorProfile, StoryItem } from '../types';

interface VerticalCapsuleStoriesProps {
  currentUser: CreatorProfile;
  stories: StoryItem[];
  onOpenStory: (index: number) => void;
  onCreateStory: () => void;
}

export const VerticalCapsuleStories: React.FC<VerticalCapsuleStoriesProps> = ({
  currentUser,
  stories,
  onOpenStory,
  onCreateStory,
}) => {
  return (
    <section aria-label="Vertical Capsule Stories" className="pt-2 pb-3">
      <div className="flex items-center gap-3 overflow-x-auto no-scrollbar px-4">
        {/* Add Your Capsule (9:14 vertical capsule) */}
        <button
          type="button"
          onClick={onCreateStory}
          className="group relative shrink-0 w-[92px] aspect-[9/14] rounded-[28px] p-[1.5px] vibe-capsule-ring active:scale-[0.97] transition-transform cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E93]"
          aria-label="Upload a new vertical capsule story"
        >
          <div className="relative w-full h-full rounded-[26.5px] overflow-hidden bg-[#0D0D14]">
            {currentUser.avatarUrl ? (
              <SafeImage
                src={currentUser.avatarUrl}
                alt="Add to your capsule"
                className="w-full h-full object-cover scale-110 blur-[3px] brightness-50 group-hover:scale-115 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-b from-[#211018] via-[#170C24] to-[#08080D]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
              <div className="w-10 h-10 rounded-full vibe-gradient-bg flex items-center justify-center shadow-[0_0_20px_rgba(255,46,147,0.55)] group-hover:scale-105 transition-transform">
                <Plus className="w-5 h-5 text-white" strokeWidth={2.6} />
              </div>
            </div>
            <div className="absolute bottom-2.5 inset-x-2 text-center">
              <span className="block text-[11px] font-semibold text-white truncate">
                Your Capsule
              </span>
            </div>
          </div>
        </button>

        {/* Empty state prompt when no real stories have been uploaded yet */}
        {stories.length === 0 ? (
          <button
            type="button"
            onClick={onCreateStory}
            className="flex-1 min-w-[210px] h-[143px] rounded-[28px] glass-surface px-4 py-3 flex flex-col justify-center items-start gap-1.5 text-left hover:bg-white/[0.08] transition-colors cursor-pointer"
          >
            <div className="w-8 h-8 rounded-xl bg-[#FF2E93]/15 border border-[#FF2E93]/30 flex items-center justify-center text-[#FF6B35]">
              <Sparkles className="w-4 h-4" />
            </div>
            <p className="text-xs font-semibold text-white">No live capsules yet</p>
            <p className="text-[11px] text-zinc-400 leading-snug">
              Tap Your Capsule to share the first real 9:14 story on VibeGram.
            </p>
          </button>
        ) : (
          /* Real Uploaded Creator Vertical Capsule Stories (rounded-[28px], aspect 9:14) */
          stories.map((story, idx) => (
            <button
              key={story.id}
              type="button"
              onClick={() => onOpenStory(idx)}
              className={`group relative shrink-0 w-[92px] aspect-[9/14] rounded-[28px] p-[2px] active:scale-[0.97] transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF2E93] ${
                story.isSeen
                  ? 'bg-white/15'
                  : 'vibe-capsule-ring shadow-[0_8px_22px_-10px_rgba(255,46,147,0.6)]'
              }`}
              aria-label={`View @${story.authorHandle}'s capsule`}
            >
              <div className="relative w-full h-full rounded-[26px] overflow-hidden bg-[#0B0B0F]">
                {story.mediaType === 'video' ? (
                  <video
                    src={story.mediaUrl}
                    muted
                    loop
                    playsInline
                    autoPlay
                    className="w-full h-full object-cover scale-105 blur-[1.5px] brightness-[0.72] group-hover:blur-0 group-hover:brightness-90 transition-all duration-300"
                  />
                ) : (
                  <SafeImage
                    src={story.mediaUrl}
                    alt={`@${story.authorHandle} capsule preview`}
                    className="w-full h-full object-cover scale-105 blur-[1.5px] brightness-[0.72] group-hover:blur-0 group-hover:brightness-90 group-hover:scale-110 transition-all duration-300"
                  />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-black/25" />

                {story.visibility === 'inner_circle' && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#7B2CBF]/90 border border-white/20 flex items-center justify-center">
                    <Lock className="w-2.5 h-2.5 text-white" />
                  </div>
                )}

                <div className="absolute bottom-2.5 inset-x-2 text-center">
                  <span className="block text-[11px] font-semibold text-white tracking-tight truncate drop-shadow">
                    @{story.authorHandle}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  );
};
