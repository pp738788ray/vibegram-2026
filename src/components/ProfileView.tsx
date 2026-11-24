import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  Camera,
  Check,
  Eye,
  Flame,
  Grid,
  Lock,
  LogOut,
  MessageSquare,
  Mic,
  Play,
  SlidersHorizontal,
  Square,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { generateWaveform } from '../lib/audio';
import { uploadAudioBlob, uploadMedia } from '../lib/cloudinary';
import { formatAudioClock, formatCount, getAuraBorderStyle, sanitizeHandle } from '../lib/utils';
import { SafeImage } from './SafeImage';
import { VoiceWavePlayer } from './VoiceWavePlayer';
import type { AuraBorder, CreatorProfile, PostItem } from '../types';

interface ProfileViewProps {
  profile: CreatorProfile;
  isOwnProfile: boolean;
  posts: PostItem[];
  bookmarkedPosts: PostItem[];
  creators: CreatorProfile[];
  onBack?: () => void;
  onUpdateProfile: (updates: Partial<CreatorProfile>) => Promise<void>;
  onToggleFollow?: (uid: string) => void;
  onToggleInnerCircleMember: (uid: string) => void;
  onOpenDM?: (creator: CreatorProfile) => void;
  onOpenPost: (post: PostItem) => void;
  onSignOut: () => void;
}

const AURA_BORDERS: { id: AuraBorder; label: string }[] = [
  { id: 'sunset', label: 'Sunset' },
  { id: 'flame', label: 'Flame' },
  { id: 'magenta', label: 'Pink' },
  { id: 'violet', label: 'Violet' },
];

export const ProfileView: React.FC<ProfileViewProps> = ({
  profile,
  isOwnProfile,
  posts,
  bookmarkedPosts,
  creators,
  onBack,
  onUpdateProfile,
  onToggleFollow,
  onToggleInnerCircleMember,
  onOpenDM,
  onOpenPost,
  onSignOut,
}) => {
  const [activeTab, setActiveTab] = useState<'drops' | 'sparks' | 'saved' | 'circle'>('drops');
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(profile.displayName);
  const [editHandle, setEditHandle] = useState(profile.handle);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editLocation, setEditLocation] = useState(profile.location);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const [isRecordingBio, setIsRecordingBio] = useState(false);
  const [bioSeconds, setBioSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedRef = useRef<number>(0);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) window.clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
          mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        } catch {
          // ignore
        }
      }
    };
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setIsUploadingAvatar(true);
    try {
      const uploaded = await uploadMedia(file);
      await onUpdateProfile({ avatarUrl: uploaded.url });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const stopVoiceBioRecording = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const finalDur = Math.max(2, Math.min(10, Math.round(elapsedRef.current)));
    const newWave = generateWaveform(30, Date.now() % 997);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const mr = mediaRecorderRef.current;
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        mr.stream.getTracks().forEach((t) => t.stop());
        const uploadedUrl = await uploadAudioBlob(blob).catch(() => '');
        await onUpdateProfile({
          voiceBioUrl: uploadedUrl || undefined,
          voiceBioDuration: finalDur,
          voiceBioWaveform: newWave,
          voiceBioTranscript: `Voice Bio · ${finalDur}s`,
        });
        setIsRecordingBio(false);
      };
      mr.stop();
    } else {
      void onUpdateProfile({
        voiceBioUrl: undefined,
        voiceBioDuration: finalDur,
        voiceBioWaveform: newWave,
        voiceBioTranscript: `Voice Bio · ${finalDur}s`,
      }).finally(() => setIsRecordingBio(false));
    }
  };

  const startVoiceBioRecording = async () => {
    elapsedRef.current = 0;
    setBioSeconds(0);
    chunksRef.current = [];
    setIsRecordingBio(true);

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (ev) => {
          if (ev.data.size > 0) chunksRef.current.push(ev.data);
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
      }
    } catch {
      mediaRecorderRef.current = null;
    }

    timerRef.current = window.setInterval(() => {
      elapsedRef.current += 0.25;
      setBioSeconds(Math.min(10, elapsedRef.current));
      if (elapsedRef.current >= 10) {
        stopVoiceBioRecording();
      }
    }, 250);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeHandle(editHandle);
    await onUpdateProfile({
      displayName: editName.trim() || profile.displayName,
      handle: cleaned.length >= 2 ? cleaned : profile.handle,
      bio: editBio.trim(),
      location: editLocation.trim(),
    });
    setIsEditing(false);
  };

  const auraStyle = getAuraBorderStyle(profile.auraBorder);
  const userPosts = posts.filter((p) => p.authorId === profile.uid);
  const userSparks = userPosts.filter((p) => p.mediaType === 'video');
  const gridItems =
    activeTab === 'saved'
      ? bookmarkedPosts
      : activeTab === 'sparks'
        ? userSparks
        : userPosts;
  const otherCreators = creators.filter((c) => c.uid !== profile.uid);

  return (
    <div className="h-full overflow-y-auto no-scrollbar pb-28">
      {/* Top Bar */}
      <div className="sticky top-0 z-20 bg-[#050505]/88 backdrop-blur-xl px-4 h-14 flex items-center justify-between border-b border-white/[0.06]">
        <div className="flex items-center gap-2 min-w-0">
          {!isOwnProfile && onBack && (
            <button
              type="button"
              onClick={onBack}
              aria-label="Go back"
              className="w-10 h-10 -ml-2 rounded-full flex items-center justify-center text-zinc-200 hover:bg-white/[0.06] cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <span className="font-display text-base font-bold text-white truncate">
            @{profile.handle}
          </span>
        </div>

        {isOwnProfile && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setEditName(profile.displayName);
                setEditHandle(profile.handle);
                setEditBio(profile.bio);
                setEditLocation(profile.location);
                setIsEditing((prev) => !prev);
              }}
              aria-label="Edit profile"
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-400 hover:text-rose-400 hover:bg-white/[0.06] cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Hero Profile Header */}
      <div className="px-4 pt-5 pb-4 space-y-5">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className={`p-[3px] rounded-[30px] ${auraStyle.ring} ${auraStyle.glow}`}>
              <SafeImage
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-20 h-20 rounded-[27px] object-cover bg-[#0A0A0D]"
              />
            </div>
            {isOwnProfile && (
              <>
                <button
                  type="button"
                  disabled={isUploadingAvatar}
                  onClick={() => avatarInputRef.current?.click()}
                  aria-label="Upload profile photo"
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full vibe-gradient-bg text-white flex items-center justify-center shadow-lg cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </>
            )}
          </div>

          <div className="flex-1 grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="block font-display text-lg font-bold text-white tabular-nums">
                {formatCount(profile.followersCount)}
              </span>
              <span className="text-[11px] text-zinc-400">Followers</span>
            </div>
            <div>
              <span className="block font-display text-lg font-bold text-white tabular-nums">
                {formatCount(profile.followingCount)}
              </span>
              <span className="text-[11px] text-zinc-400">Following</span>
            </div>
            <div>
              <span className="block font-display text-lg font-bold text-white tabular-nums">
                {userPosts.length}
              </span>
              <span className="text-[11px] text-zinc-400">Drops</span>
            </div>
          </div>
        </div>

        {/* Name, Aura Badge & Text Bio */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-lg font-bold text-white">
              {profile.displayName}
            </h1>
            <span className="text-xs font-semibold vibe-gradient-text">
              {profile.auraBadge}
            </span>
          </div>
          {profile.bio && (
            <p className="text-[13.5px] text-zinc-300 leading-relaxed">{profile.bio}</p>
          )}
          {profile.location && <p className="text-[11px] text-zinc-500">{profile.location}</p>}
        </div>

        {/* 10-Second Playable Voice Bio */}
        <div className="space-y-2">
          {profile.voiceBioDuration > 0 && (
            <VoiceWavePlayer
              id={`voice_bio_${profile.uid}`}
              durationSec={profile.voiceBioDuration}
              waveform={profile.voiceBioWaveform}
              audioUrl={profile.voiceBioUrl}
              label="Voice Bio"
              transcript={profile.voiceBioTranscript}
              seed={profile.uid.length * 13}
            />
          )}

          {isOwnProfile && (
            <div className="flex items-center justify-between gap-2">
              {isRecordingBio ? (
                <button
                  type="button"
                  onClick={stopVoiceBioRecording}
                  className="w-full h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Recording Voice Bio… {formatAudioClock(bioSeconds)} / 0:10 (Tap to save)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startVoiceBioRecording}
                  className="w-full h-10 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] border border-white/10 text-zinc-200 text-xs font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5 text-[#FF6B35]" />
                  <span>
                    {profile.voiceBioDuration > 0
                      ? 'Re-record 10s Voice Bio'
                      : 'Record your 10s Voice Bio'}
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Own Profile Border Picker OR Other User Follow/Message */}
        {isOwnProfile ? (
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-zinc-400">Profile Aura Border</span>
            <div className="grid grid-cols-4 gap-2">
              {AURA_BORDERS.map((b) => {
                const st = getAuraBorderStyle(b.id);
                const selected = profile.auraBorder === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => void onUpdateProfile({ auraBorder: b.id })}
                    className={`h-9 rounded-xl p-[1.5px] cursor-pointer ${
                      selected ? st.ring : 'bg-white/10'
                    }`}
                  >
                    <div className="w-full h-full rounded-[10.5px] bg-[#0B0B10] flex items-center justify-center gap-1 text-[11px] font-medium text-zinc-200">
                      {selected && <Check className="w-3 h-3 text-[#FF6B35]" />}
                      {b.label}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => onToggleFollow?.(profile.uid)}
              className={`h-11 rounded-2xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                profile.isFollowing
                  ? 'glass-surface text-white'
                  : 'vibe-gradient-bg text-white shadow-[0_8px_20px_-6px_rgba(255,46,147,0.55)]'
              }`}
            >
              {profile.isFollowing ? (
                <>
                  <UserCheck className="w-4 h-4 text-[#FF6B35]" /> Following
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" /> Follow
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => onOpenDM?.(profile)}
              className="h-11 rounded-2xl glass-surface text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-white/10 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4 text-[#FF6B35]" />
              Message
            </button>
          </div>
        )}

        {/* Inline Edit Profile Form */}
        {isOwnProfile && isEditing && (
          <form onSubmit={handleSaveEdit} className="rounded-2xl glass-surface p-4 space-y-3">
            <h3 className="font-display text-sm font-semibold text-white">Edit Profile</h3>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Display Name"
              maxLength={50}
              className="w-full h-10 rounded-xl bg-black/50 border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-[#FF2E93]"
            />
            <input
              type="text"
              value={editHandle}
              onChange={(e) => setEditHandle(sanitizeHandle(e.target.value))}
              placeholder="handle"
              maxLength={24}
              className="w-full h-10 rounded-xl bg-black/50 border border-white/10 px-3 text-xs font-mono text-white focus:outline-none focus:border-[#FF2E93]"
            />
            <input
              type="text"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              placeholder="City"
              maxLength={60}
              className="w-full h-10 rounded-xl bg-black/50 border border-white/10 px-3 text-xs text-white focus:outline-none focus:border-[#FF2E93]"
            />
            <textarea
              rows={2}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Bio"
              maxLength={200}
              className="w-full rounded-xl bg-black/50 border border-white/10 p-3 text-xs text-white focus:outline-none focus:border-[#FF2E93] resize-none"
            />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="flex-1 h-10 rounded-xl bg-white/[0.06] text-xs font-medium text-zinc-300 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 h-10 rounded-xl vibe-gradient-bg text-white text-xs font-semibold shadow-[0_6px_16px_-4px_rgba(255,46,147,0.5)] cursor-pointer"
              >
                Save Changes
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Content Tabs: Drops, Sparks, Saved, Circle */}
      <div className="px-4 pb-3">
        <div
          className={`grid ${
            isOwnProfile ? 'grid-cols-4' : 'grid-cols-2'
          } p-1 rounded-2xl bg-white/[0.05] border border-white/8 gap-1`}
        >
          <button
            type="button"
            onClick={() => setActiveTab('drops')}
            className={`h-9 rounded-xl text-[11.5px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'drops' ? 'bg-white/12 text-white' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Grid className="w-3.5 h-3.5 shrink-0" />
            <span>Drops</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sparks')}
            className={`h-9 rounded-xl text-[11.5px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
              activeTab === 'sparks'
                ? 'vibe-gradient-bg text-white shadow-[0_4px_14px_-4px_rgba(255,46,147,0.55)]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 shrink-0" />
            <span>Sparks</span>
          </button>

          {isOwnProfile && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('saved')}
                className={`h-9 rounded-xl text-[11.5px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'saved'
                    ? 'bg-white/12 text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5 shrink-0" />
                <span>Saved</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('circle')}
                className={`h-9 rounded-xl text-[11.5px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                  activeTab === 'circle'
                    ? 'bg-[#7B2CBF]/40 text-[#E0AAFF]'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>Circle</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === 'circle' && isOwnProfile ? (
          <div className="space-y-2.5">
            {otherCreators.length === 0 ? (
              <div className="rounded-2xl glass-surface p-6 text-center text-xs text-zinc-400">
                When other real members join VibeGram, you can add them to your Inner Circle here.
              </div>
            ) : (
              otherCreators.map((c) => (
                <div
                  key={c.uid}
                  className="rounded-2xl glass-surface p-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <SafeImage
                      src={c.avatarUrl}
                      alt={c.handle}
                      className="w-10 h-10 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-white truncate">@{c.handle}</p>
                      <p className="text-[11px] text-zinc-400 truncate">{c.displayName}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleInnerCircleMember(c.uid)}
                    className={`h-9 px-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                      c.isInnerCircle
                        ? 'bg-[#7B2CBF] text-white'
                        : 'bg-white/[0.06] text-zinc-400 border border-white/10'
                    }`}
                  >
                    {c.isInnerCircle ? 'In Circle' : 'Add'}
                  </button>
                </div>
              ))
            )}
          </div>
        ) : gridItems.length === 0 ? (
          <div className="rounded-2xl glass-surface p-8 text-center space-y-1.5">
            <p className="text-sm font-medium text-zinc-200">
              {activeTab === 'saved'
                ? 'No bookmarked drops yet'
                : activeTab === 'sparks'
                  ? 'No Sparks videos yet'
                  : 'No drops shared yet'}
            </p>
            <p className="text-xs text-zinc-500">
              {activeTab === 'saved'
                ? 'Bookmark posts to keep them in your collection.'
                : activeTab === 'sparks'
                  ? 'Short videos uploaded via Create (+) will appear here.'
                  : 'Tap the glowing + button in the dock to upload your first drop.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {gridItems.map((post) => (
              <button
                key={post.id}
                type="button"
                onClick={() => onOpenPost(post)}
                className="relative rounded-[20px] overflow-hidden aspect-[4/5] bg-[#0B0B10] border border-white/8 cursor-pointer group text-left"
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

                {/* Play icon badge on video thumbnails */}
                {post.mediaType === 'video' && (
                  <div className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-md">
                    <Play className="w-3.5 h-3.5 text-white fill-white translate-x-[1px]" />
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 p-2.5 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-center justify-between text-[10.5px] text-zinc-200">
                  {post.mediaType === 'video' ? (
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums font-medium text-white">
                      <Eye className="w-3 h-3 text-[#FF6B35]" />
                      {formatCount(post.views)}
                    </span>
                  ) : (
                    <span>{post.mood}</span>
                  )}
                  {post.visibility === 'inner_circle' && (
                    <Lock className="w-3 h-3 text-[#C77DFF]" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Proud Indian Social Platform About Card */}
        {isOwnProfile && (
          <div className="mt-6 rounded-[24px] glass-surface p-4 flex items-center gap-3.5">
            <img
              src="/assets/vibegram-icon.png"
              alt="VibeGram"
              className="w-11 h-11 rounded-[14px] object-cover shrink-0 shadow-[0_6px_20px_-4px_rgba(255,46,147,0.5)]"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-display text-sm font-bold text-white">VibeGram</span>
                <span className="text-[11px] font-semibold vibe-gradient-text">
                  Catch the Desi Vibe
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                🇮🇳 India&apos;s Own Social Platform
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
