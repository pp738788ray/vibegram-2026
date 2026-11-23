import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowRight, Check, Lock, Mic, Sparkles, User } from 'lucide-react';
import { signInWithPopup, type User as FirebaseUser } from 'firebase/auth';
import { auth, createGoogleProvider, popupResolver } from '../lib/firebase';
import { saveUserProfile } from '../lib/firestoreSync';
import { generateWaveform } from '../lib/audio';
import { getAuraBorderStyle, sanitizeHandle } from '../lib/utils';
import type { AuraBorder, CreatorProfile, UserPrivateState } from '../types';

interface AuthOnboardingProps {
  pendingFirebaseUser: FirebaseUser | null;
  onComplete: (profile: CreatorProfile, priv: UserPrivateState) => void;
}

const AURA_OPTIONS: { id: AuraBorder; name: string }[] = [
  { id: 'sunset', name: 'Sunset' },
  { id: 'flame', name: 'Flame' },
  { id: 'magenta', name: 'Pink' },
  { id: 'violet', name: 'Violet' },
];

const AURA_BADGES = [
  '⚡ Trendsetter',
  '🎵 Desi Beats',
  '✦ Night Nomad',
  '⌘ Tech Architect',
  '🎮 Apex Striker',
];

export const AuthOnboarding: React.FC<AuthOnboardingProps> = ({
  pendingFirebaseUser,
  onComplete,
}) => {
  const [step, setStep] = useState<'welcome' | 'handle'>(pendingFirebaseUser ? 'handle' : 'welcome');
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(pendingFirebaseUser);
  const [displayName, setDisplayName] = useState<string>(pendingFirebaseUser?.displayName || '');
  const [handle, setHandle] = useState<string>('');
  const [bio, setBio] = useState<string>('');
  const [location, setLocation] = useState<string>('');
  const [auraBadge, setAuraBadge] = useState<string>(AURA_BADGES[0]);
  const [auraBorder, setAuraBorder] = useState<AuraBorder>('sunset');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const signingInRef = useRef(false);

  // Sync whenever onAuthStateChanged detects a newly authenticated user without a profile yet
  useEffect(() => {
    if (pendingFirebaseUser) {
      setFbUser(pendingFirebaseUser);
      setDisplayName((prev) => prev || pendingFirebaseUser.displayName || '');
      setHandle((prev) => {
        if (prev) return prev;
        const suggested = sanitizeHandle(
          (
            pendingFirebaseUser.displayName ||
            pendingFirebaseUser.email?.split('@')[0] ||
            'vibe.user'
          ).replace(/\s+/g, '.'),
        );
        return suggested.length >= 2 ? suggested : '';
      });
      setStep('handle');
      setErrorMsg(null);
      setIsLoading(false);
    }
  }, [pendingFirebaseUser]);

  const handleGoogleLogin = async () => {
    if (signingInRef.current || isLoading) return;
    signingInRef.current = true;
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await auth.authStateReady();
      const provider = createGoogleProvider();
      await signInWithPopup(auth, provider, popupResolver);
      // App.tsx onAuthStateChanged handles profile lookup and transitions automatically
    } catch (err) {
      // If Firebase actually completed sign-in despite a late popup close race, let onAuthStateChanged handle it
      if (auth.currentUser) {
        return;
      }

      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      const message = err instanceof Error ? err.message : 'Sign-in failed.';

      if (code === 'auth/popup-closed-by-user' || message.includes('popup-closed-by-user')) {
        setErrorMsg('Google sign-in popup was closed. Please try again.');
      } else if (code === 'auth/cancelled-popup-request') {
        setErrorMsg('Another sign-in popup was already open. Please try again.');
      } else if (code === 'auth/popup-blocked') {
        setErrorMsg('Popup was blocked by your browser. Allow popups for this site and retry.');
      } else if (message.includes('Pending promise was never set')) {
        setErrorMsg('Sign-in was interrupted. Please click Continue with Google again.');
      } else {
        setErrorMsg(message);
      }
    } finally {
      signingInRef.current = false;
      setIsLoading(false);
    }
  };

  const handleFinishSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeUser = fbUser || auth.currentUser;
    if (!activeUser) {
      setErrorMsg('Please sign in with Google first.');
      setStep('welcome');
      return;
    }

    const cleaned = sanitizeHandle(handle);
    if (cleaned.length < 2) {
      setErrorMsg('Choose a @handle with at least 2 characters (letters, numbers, dots, or underscores).');
      return;
    }

    setErrorMsg(null);
    setIsLoading(true);
    try {
      const newProfile: CreatorProfile = {
        uid: activeUser.uid,
        handle: cleaned,
        displayName: displayName.trim() || cleaned,
        bio: bio.trim(),
        location: location.trim(),
        avatarUrl: activeUser.photoURL || '',
        auraBadge,
        auraBorder,
        voiceBioUrl: '',
        voiceBioTranscript: '',
        voiceBioDuration: 0,
        voiceBioWaveform: generateWaveform(28, activeUser.uid.length * 19),
        followersCount: 0,
        followingCount: 0,
        sparksCount: 0,
        isOnline: true,
      };
      const newPrivate: UserPrivateState = {
        email: activeUser.email || '',
        innerCircleIds: [],
        bookmarkedPostIds: [],
        likedPostIds: [],
        followingIds: [],
      };
      await saveUserProfile(newProfile, newPrivate);
      onComplete(newProfile, newPrivate);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Could not save your profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const auraStyle = getAuraBorderStyle(auraBorder);

  return (
    <div className="relative h-full w-full flex flex-col justify-between overflow-y-auto no-scrollbar bg-[#050505] px-6 py-8">
      {/* Ambient Sunset-Neon radial glows */}
      <div
        className="pointer-events-none absolute -top-24 -left-20 w-72 h-72 rounded-full blur-[100px] opacity-25"
        style={{ background: '#FF6B35' }}
      />
      <div
        className="pointer-events-none absolute top-1/3 -right-24 w-64 h-64 rounded-full blur-[100px] opacity-18"
        style={{ background: '#FF2E93' }}
      />
      <div
        className="pointer-events-none absolute bottom-12 -right-24 w-80 h-80 rounded-full blur-[110px] opacity-25"
        style={{ background: '#7B2CBF' }}
      />

      {/* Brand Header */}
      <div className="relative z-10 flex items-center justify-between pt-2">
        <div className="flex items-center gap-2.5">
          <img
            src="/assets/vibegram-icon.png"
            alt="VibeGram"
            className="w-9 h-9 rounded-[11px] object-cover shadow-[0_6px_22px_-4px_rgba(255,46,147,0.55)]"
          />
          <span className="font-display text-xl font-bold tracking-tight text-white">VibeGram</span>
        </div>
        <span className="text-[11px] font-medium text-white/80 bg-white/[0.06] border border-white/10 rounded-full px-2.5 py-1">
          🇮🇳 India&apos;s Own
        </span>
      </div>

      {step === 'welcome' ? (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="relative z-10 my-auto py-8 space-y-7"
        >
          {/* Centered VG Emblem */}
          <div className="flex flex-col items-center">
            <div className="relative mb-5">
              <div className="absolute -inset-2 rounded-[26px] vibe-gradient-bg blur-lg opacity-45" />
              <div className="relative w-20 h-20 rounded-[22px] p-[2px] vibe-gradient-bg shadow-[0_12px_36px_-6px_rgba(255,46,147,0.5)]">
                <img
                  src="/assets/vibegram-icon.png"
                  alt="VibeGram Logo"
                  className="w-full h-full rounded-[20px] object-cover"
                />
              </div>
            </div>

            <div className="space-y-2 text-center">
              <h1 className="font-display text-3xl font-bold tracking-tight text-white leading-[1.12] [text-wrap:balance]">
                Catch the <span className="vibe-gradient-text">Desi Vibe.</span>
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-[300px] mx-auto">
                Sign in with Google to join VibeGram and share real posts, vertical capsules, and voice notes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            {[
              { icon: Sparkles, title: 'Capsules', desc: '9:14 stories' },
              { icon: Mic, title: 'Voice', desc: '10s notes & bio' },
              { icon: Lock, title: 'Circle', desc: 'Close friends' },
            ].map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="rounded-[24px] glass-surface p-3.5 text-center space-y-2"
                >
                  <div className="w-9 h-9 rounded-xl mx-auto bg-white/[0.06] border border-white/10 flex items-center justify-center text-[#FF6B35]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{feat.title}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{feat.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {errorMsg && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/25 px-4 py-3 text-xs text-rose-300 text-center">
              {errorMsg}
            </div>
          )}

          <button
            type="button"
            disabled={isLoading}
            onClick={handleGoogleLogin}
            className="w-full h-13 rounded-2xl vibe-gradient-bg text-white font-semibold text-sm flex items-center justify-center gap-2.5 shadow-[0_12px_32px_-8px_rgba(255,46,147,0.55)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#FFFFFF"
                d="M21.35 11.1h-9.18v2.98h5.3c-.23 1.44-1.66 4.22-5.3 4.22-3.19 0-5.79-2.64-5.79-5.9s2.6-5.9 5.79-5.9c1.82 0 3.04.78 3.74 1.45l2.55-2.46C16.82 3.96 14.7 3 12.17 3 7.1 3 3 7.1 3 12.4s4.1 9.4 9.17 9.4c5.29 0 8.8-3.72 8.8-8.97 0-.6-.06-1.15-.16-1.73Z"
              />
            </svg>
            <span>{isLoading ? 'Signing in with Google…' : 'Continue with Google'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>
      ) : (
        <motion.form
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          onSubmit={handleFinishSetup}
          className="relative z-10 my-auto py-4 space-y-5"
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <div className={`p-[3px] rounded-[28px] ${auraStyle.ring} ${auraStyle.glow}`}>
              {fbUser?.photoURL ? (
                <img
                  src={fbUser.photoURL}
                  alt="Your profile"
                  referrerPolicy="no-referrer"
                  className="w-20 h-20 rounded-[25px] object-cover bg-[#0A0A0D]"
                />
              ) : (
                <div className="w-20 h-20 rounded-[25px] bg-[#140B16] flex items-center justify-center text-[#FF6B35]">
                  <User className="w-8 h-8" />
                </div>
              )}
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-white">Create your profile</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Pick your VibeGram handle and sunset aura to get started.
              </p>
            </div>
          </div>

          <div className="space-y-3.5">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-300">Display Name</span>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                maxLength={50}
                placeholder="Your name"
                className="w-full h-11 rounded-2xl bg-white/[0.06] border border-white/10 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E93]/65"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-300">VibeGram Handle</span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-mono text-[#FF6B35]">
                  @
                </span>
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(sanitizeHandle(e.target.value))}
                  maxLength={24}
                  placeholder="your.handle"
                  className="w-full h-11 rounded-2xl bg-white/[0.06] border border-white/10 pl-9 pr-4 text-sm font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E93]/65"
                />
              </div>
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-300">Bio (optional)</span>
              <input
                type="text"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                maxLength={180}
                placeholder="What are you creating or vibing to?"
                className="w-full h-11 rounded-2xl bg-white/[0.06] border border-white/10 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E93]/65"
              />
            </label>

            <label className="block space-y-1">
              <span className="text-xs font-medium text-zinc-300">City (optional)</span>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                maxLength={60}
                placeholder="e.g. Mumbai, IN"
                className="w-full h-11 rounded-2xl bg-white/[0.06] border border-white/10 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E93]/65"
              />
            </label>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">Creator Aura Badge</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                {AURA_BADGES.map((badge) => (
                  <button
                    key={badge}
                    type="button"
                    onClick={() => setAuraBadge(badge)}
                    className={`h-8 px-3 rounded-xl text-[11px] font-medium transition-all cursor-pointer ${
                      auraBadge === badge
                        ? 'vibe-gradient-bg text-white font-semibold shadow-[0_6px_18px_-4px_rgba(255,46,147,0.5)]'
                        : 'bg-white/[0.06] text-zinc-300 border border-white/10'
                    }`}
                  >
                    {badge}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-medium text-zinc-300">Profile Aura Border</span>
              <div className="grid grid-cols-4 gap-2">
                {AURA_OPTIONS.map((opt) => {
                  const style = getAuraBorderStyle(opt.id);
                  const active = auraBorder === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAuraBorder(opt.id)}
                      className={`h-10 rounded-xl p-[1.5px] transition-all cursor-pointer ${
                        active ? style.ring : 'bg-white/10'
                      }`}
                    >
                      <div className="w-full h-full rounded-[10.5px] bg-[#0B0B0F] flex items-center justify-center gap-1 text-[11px] font-medium text-zinc-200">
                        {active && <Check className="w-3 h-3 text-[#FF6B35]" />}
                        <span>{opt.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {errorMsg && <p className="text-xs text-rose-400 text-center">{errorMsg}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 rounded-2xl vibe-gradient-bg text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_12px_32px_-8px_rgba(255,46,147,0.55)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
          >
            <span>{isLoading ? 'Saving Profile…' : 'Enter VibeGram'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </motion.form>
      )}

      <div className="relative z-10 text-center space-y-0.5 pb-1">
        <p className="text-[11px] font-medium vibe-gradient-text">
          VibeGram · Catch the Desi Vibe
        </p>
        <p className="text-[11px] text-zinc-400">
          🇮🇳 India&apos;s Own Social Platform
        </p>
      </div>
    </div>
  );
};
