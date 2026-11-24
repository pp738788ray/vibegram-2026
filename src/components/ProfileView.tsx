import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  AtSign,
  Bookmark,
  Camera,
  Check,
  Eye,
  Flame,
  Grid,
  Lock,
  LogOut,
  Mail,
  MapPin,
  MessageSquare,
  Mic,
  Pencil,
  Play,
  Settings,
  Square,
  User as UserIcon,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { generateWaveform } from '../lib/audio';
import { uploadAudioBlob, uploadMedia } from '../lib/cloudinary';
import { formatAudioClock, formatCount, getAuraBorderStyle, sanitizeHandle } from '../lib/utils';
import { SafeImage } from './SafeImage';
import { UserAvatar } from './UserAvatar';
import { VoiceWavePlayer } from './VoiceWavePlayer';
import type { AuraBorder, CreatorProfile, PostItem } from '../types';

interface ProfileViewProps {
  profile: CreatorProfile;
  userEmail?: string;
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
  userEmail,
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const [editName, setEditName] = useState(profile.displayName);
  const [editHandle, setEditHandle] = useState(profile.handle);
  const [editBio, setEditBio] = useState(profile.bio);
  const [editLocation, setEditLocation] = useState(profile.location);
  const [editAvatarUrl, setEditAvatarUrl] = useState(profile.avatarUrl);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [isRecordingBio, setIsRecordingBio] = useState(false);
  const [bioSeconds, setBioSeconds] = useState(0);
  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedRef = useRef<number>(0);
  const modalAvatarInputRef = useRef<HTMLInputElement | null>(null);

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

  const openEditProfileModal = () => {
    setEditName(profile.displayName);
    setEditHandle(profile.handle);
    setEditBio(profile.bio);
    setEditLocation(profile.location);
    setEditAvatarUrl(profile.avatarUrl);
    setEditError(null);
    setShowSettingsModal(false);
    setShowEditModal(true);
  };

  const handleModalAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setEditError(null);
    setIsUploadingAvatar(true);
    try {
      const uploaded = await uploadMedia(file);
      setEditAvatarUrl(uploaded.url);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not upload profile picture.');
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = '';
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = sanitizeHandle(editHandle);
    if (cleaned.length < 2) {
      setEditError('Username must be at least 2 characters (letters, numbers, dots, underscores).');
      return;
    }
    setEditError(null);
    setIsSavingEdit(true);
    try {
      await onUpdateProfile({
        displayName: editName.trim() || profile.displayName,
        handle: cleaned,
        bio: editBio.trim(),
        location: editLocation.trim(),
        avatarUrl: editAvatarUrl,
      });
      setShowEditModal(false);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Could not save profile changes.');
    } finally {
      setIsSavingEdit(false);
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
  const displayEmail = profile.email || userEmail || '';

  return (
    <div className="relative h-full overflow-y-auto no-scrollbar pb-28">
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
              onClick={() => setShowSettingsModal(true)}
              aria-label="Profile settings and your information"
              title="Profile Settings"
              className="w-10 h-10 rounded-full flex items-center justify-center text-zinc-300 hover:text-white hover:bg-white/[0.06] cursor-pointer"
            >
              <Settings className="w-4 h-4" />
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
              <UserAvatar
                src={profile.avatarUrl}
                alt={profile.displayName}
                className="w-20 h-20 rounded-[27px]"
              />
            </div>
            {isOwnProfile && (
              <button
                type="button"
                onClick={openEditProfileModal}
                aria-label="Edit profile photo"
                title="Edit Profile & Photo"
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full vibe-gradient-bg text-white flex items-center justify-center shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
              >
                <Camera className="w-4 h-4" />
              </button>
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

        {/* Own Profile Actions: Edit Profile + Settings */}
        {isOwnProfile && (
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={openEditProfileModal}
              className="h-10 rounded-2xl vibe-gradient-bg text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_8px_20px_-6px_rgba(255,46,147,0.5)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Profile
            </button>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="h-10 rounded-2xl glass-surface text-zinc-100 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-white/10 active:scale-[0.98] transition-all cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-[#FF6B35]" />
              Settings
            </button>
          </div>
        )}

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
                    <UserAvatar
                      src={c.avatarUrl}
                      alt={c.handle}
                      className="w-10 h-10 rounded-xl shrink-0"
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

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isOwnProfile && showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed md:absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex flex-col justify-end"
          >
            <button
              type="button"
              aria-label="Close edit profile"
              onClick={() => !isSavingEdit && setShowEditModal(false)}
              className="flex-1 w-full cursor-default"
            />
            <motion.form
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              onSubmit={handleSaveEdit}
              className="max-h-[90%] rounded-t-[34px] bg-[#0A0A10] border-t border-white/14 flex flex-col overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-white">Edit Profile</h2>
                <button
                  type="button"
                  disabled={isSavingEdit}
                  onClick={() => setShowEditModal(false)}
                  aria-label="Close edit profile modal"
                  className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
                {/* Profile Picture Upload */}
                <div className="flex flex-col items-center gap-2.5">
                  <div className="relative">
                    <div className={`p-[3px] rounded-[30px] ${auraStyle.ring}`}>
                      <UserAvatar
                        src={editAvatarUrl}
                        alt={editName || profile.displayName}
                        className="w-22 h-22 rounded-[27px]"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => modalAvatarInputRef.current?.click()}
                      aria-label="Upload new profile picture"
                      className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full vibe-gradient-bg text-white flex items-center justify-center shadow-lg cursor-pointer disabled:opacity-50"
                    >
                      <Camera className="w-4 h-4" />
                    </button>
                    <input
                      ref={modalAvatarInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleModalAvatarUpload}
                      className="hidden"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={isUploadingAvatar}
                      onClick={() => modalAvatarInputRef.current?.click()}
                      className="text-xs font-semibold vibe-gradient-text cursor-pointer"
                    >
                      {isUploadingAvatar ? 'Uploading photo…' : 'Change Profile Photo'}
                    </button>
                    {editAvatarUrl && (
                      <button
                        type="button"
                        onClick={() => setEditAvatarUrl('')}
                        className="text-xs text-zinc-500 hover:text-rose-400 cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-300">Display Name</span>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                    maxLength={50}
                    className="w-full h-11 rounded-2xl bg-white/[0.06] border border-white/10 px-4 text-sm text-white focus:outline-none focus:border-[#FF2E93]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-300">Username</span>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono text-[#FF6B35]">
                      @
                    </span>
                    <input
                      type="text"
                      required
                      value={editHandle}
                      onChange={(e) => setEditHandle(sanitizeHandle(e.target.value))}
                      placeholder="username"
                      maxLength={24}
                      className="w-full h-11 rounded-2xl bg-white/[0.06] border border-white/10 pl-9 pr-4 text-sm font-mono text-white focus:outline-none focus:border-[#FF2E93]"
                    />
                  </div>
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-300">City</span>
                  <input
                    type="text"
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    placeholder="e.g. Bengaluru, IN"
                    maxLength={60}
                    className="w-full h-11 rounded-2xl bg-white/[0.06] border border-white/10 px-4 text-sm text-white focus:outline-none focus:border-[#FF2E93]"
                  />
                </label>

                <label className="block space-y-1">
                  <span className="text-xs font-medium text-zinc-300">Bio</span>
                  <textarea
                    rows={3}
                    value={editBio}
                    onChange={(e) => setEditBio(e.target.value)}
                    placeholder="Tell people about your vibe…"
                    maxLength={200}
                    className="w-full rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 text-sm text-white focus:outline-none focus:border-[#FF2E93] resize-none"
                  />
                </label>

                {editError && (
                  <p className="text-xs text-rose-400 text-center">{editError}</p>
                )}

                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={isSavingEdit}
                    onClick={() => setShowEditModal(false)}
                    className="h-12 rounded-2xl bg-white/[0.06] text-xs font-semibold text-zinc-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingEdit || isUploadingAvatar}
                    className="h-12 rounded-2xl vibe-gradient-bg text-white text-xs font-semibold shadow-[0_8px_22px_-6px_rgba(255,46,147,0.55)] cursor-pointer disabled:opacity-50"
                  >
                    {isSavingEdit ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Profile Settings -> "Your Information" Modal */}
      <AnimatePresence>
        {isOwnProfile && showSettingsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed md:absolute inset-0 z-50 bg-black/75 backdrop-blur-md flex flex-col justify-end"
          >
            <button
              type="button"
              aria-label="Close settings"
              onClick={() => setShowSettingsModal(false)}
              className="flex-1 w-full cursor-default"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="max-h-[85%] rounded-t-[34px] bg-[#0A0A10] border-t border-white/14 flex flex-col overflow-hidden"
            >
              <div className="px-5 pt-4 pb-3 border-b border-white/10 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-base font-bold text-white">Profile Settings</h2>
                  <p className="text-[11px] text-zinc-400">Account details &amp; preferences</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  aria-label="Close profile settings"
                  className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-5">
                {/* Your Information Section */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 px-1">
                    Your Information
                  </h3>
                  <div className="rounded-[24px] glass-surface divide-y divide-white/[0.07] overflow-hidden">
                    <div className="p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-[#FF6B35] shrink-0">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] text-zinc-400">Email Address</span>
                        <span className="block text-sm font-medium text-white truncate">
                          {displayEmail || 'Not linked'}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-[#FF2E93] shrink-0">
                        <AtSign className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] text-zinc-400">Username</span>
                        <span className="block text-sm font-mono font-medium text-white truncate">
                          @{profile.handle}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-[#C77DFF] shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] text-zinc-400">Display Name</span>
                        <span className="block text-sm font-medium text-white truncate">
                          {profile.displayName}
                        </span>
                      </div>
                    </div>

                    <div className="p-3.5 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.06] flex items-center justify-center text-[#FF6B35] shrink-0">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="block text-[11px] text-zinc-400">City</span>
                        <span className="block text-sm font-medium text-white truncate">
                          {profile.location || 'Not set'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={openEditProfileModal}
                    className="w-full h-12 rounded-2xl vibe-gradient-bg text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-[0_8px_22px_-6px_rgba(255,46,147,0.5)] cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit Profile &amp; Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSettingsModal(false);
                      onSignOut();
                    }}
                    className="w-full h-12 rounded-2xl bg-rose-500/12 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center justify-center gap-2 hover:bg-rose-500/20 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>

                <div className="text-center pt-1 pb-2 space-y-0.5">
                  <p className="text-[11px] font-semibold vibe-gradient-text">
                    VibeGram · Catch the Desi Vibe
                  </p>
                  <p className="text-[11px] text-zinc-500">🇮🇳 India&apos;s Own Social Platform</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
