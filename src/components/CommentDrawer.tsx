import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Mic, Send, Square, Trash2, X } from 'lucide-react';
import { generateWaveform } from '../lib/audio';
import { uploadAudioBlob } from '../lib/cloudinary';
import { subscribeToComments } from '../lib/firestoreSync';
import { formatAudioClock, formatRelativeTime } from '../lib/utils';
import { SafeImage } from './SafeImage';
import { VoiceWavePlayer } from './VoiceWavePlayer';
import type { CommentItem, CreatorProfile, PostItem } from '../types';

interface CommentDrawerProps {
  post: PostItem;
  currentUser: CreatorProfile;
  onClose: () => void;
  onAddComment: (postId: string, comment: CommentItem) => Promise<void>;
}

const MAX_VOICE_SECONDS = 10;

export const CommentDrawer: React.FC<CommentDrawerProps> = ({
  post,
  currentUser,
  onClose,
  onAddComment,
}) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [text, setText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [liveBars, setLiveBars] = useState<number[]>([]);
  const [recordedClip, setRecordedClip] = useState<{
    duration: number;
    waveform: number[];
    blob?: Blob;
    localUrl?: string;
  } | null>(null);

  const timerRef = useRef<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const elapsedRef = useRef<number>(0);
  const barsRef = useRef<number[]>([]);

  useEffect(() => {
    const unsub = subscribeToComments(post.id, setComments);
    return () => unsub();
  }, [post.id]);

  const cleanupRecording = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch {
        // ignore stop errors
      }
    }
    mediaRecorderRef.current = null;
  };

  useEffect(() => {
    return () => cleanupRecording();
  }, []);

  const stopRecording = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const finalDur = Math.max(1, Math.min(MAX_VOICE_SECONDS, Math.round(elapsedRef.current)));
    const finalWave =
      barsRef.current.length >= 12
        ? barsRef.current.slice(-26)
        : generateWaveform(24, Date.now() % 997);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const mr = mediaRecorderRef.current;
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = blob.size > 0 ? URL.createObjectURL(blob) : undefined;
        mr.stream.getTracks().forEach((t) => t.stop());
        setRecordedClip({ duration: finalDur, waveform: finalWave, blob, localUrl: url });
        setIsRecording(false);
      };
      mr.stop();
    } else {
      setRecordedClip({ duration: finalDur, waveform: finalWave });
      setIsRecording(false);
    }
  };

  const startRecording = async () => {
    setRecordedClip(null);
    setRecordSeconds(0);
    setLiveBars([]);
    elapsedRef.current = 0;
    barsRef.current = [];
    chunksRef.current = [];
    setIsRecording(true);

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
      const bar = Math.round(24 + Math.random() * 68);
      barsRef.current = [...barsRef.current.slice(-25), bar];
      setLiveBars([...barsRef.current]);
      setRecordSeconds(Math.min(MAX_VOICE_SECONDS, elapsedRef.current));

      if (elapsedRef.current >= MAX_VOICE_SECONDS) {
        stopRecording();
      }
    }, 250);
  };

  const handleSendText = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;
    setIsSending(true);
    try {
      await onAddComment(post.id, {
        id: `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        postId: post.id,
        authorId: currentUser.uid,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatarUrl,
        authorAura: currentUser.auraBadge,
        type: 'text',
        text: trimmed,
        audioDuration: 0,
        waveform: [],
        createdAt: Date.now(),
      });
      setText('');
    } finally {
      setIsSending(false);
    }
  };

  const handleSendVoice = async () => {
    if (!recordedClip || isSending) return;
    setIsSending(true);
    try {
      const uploadedAudioUrl = recordedClip.blob
        ? await uploadAudioBlob(recordedClip.blob).catch(() => '')
        : '';

      await onAddComment(post.id, {
        id: `vc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        postId: post.id,
        authorId: currentUser.uid,
        authorHandle: currentUser.handle,
        authorAvatar: currentUser.avatarUrl,
        authorAura: currentUser.auraBadge,
        type: 'voice',
        text: `Voice Note · ${formatAudioClock(recordedClip.duration)}`,
        audioUrl: uploadedAudioUrl || undefined,
        audioDuration: recordedClip.duration,
        waveform: recordedClip.waveform,
        createdAt: Date.now(),
      });
      setRecordedClip(null);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="absolute inset-0 z-[60] flex flex-col justify-end bg-black/65 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Dismiss comments"
        onClick={onClose}
        className="flex-1 w-full cursor-default"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
        className="max-h-[78%] rounded-t-[32px] bg-[#0B0B10] border-t border-white/12 flex flex-col overflow-hidden"
      >
        <div className="pt-3 pb-2.5 px-5 border-b border-white/8">
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3" />
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-base font-semibold text-white">
                Thread · {comments.length}
              </h3>
              <p className="text-[11px] text-zinc-400">
                Drop a reply or record a 10s voice note
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close comments"
              className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Firestore Comments List */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 py-4 space-y-4">
          {comments.length === 0 ? (
            <div className="py-10 text-center space-y-1.5">
              <p className="text-sm font-medium text-zinc-300">No comments yet</p>
              <p className="text-xs text-zinc-500">
                Start the thread with a text reply or a 10-second voice comment.
              </p>
            </div>
          ) : (
            comments.map((comment, idx) => (
              <div key={comment.id} className="flex items-start gap-3">
                <SafeImage
                  src={comment.authorAvatar}
                  alt={comment.authorHandle}
                  className="w-8 h-8 rounded-xl object-cover bg-white/10 shrink-0 mt-0.5"
                />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-white">
                      @{comment.authorHandle}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-zinc-500">
                      · {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>

                  {comment.type === 'voice' ? (
                    <VoiceWavePlayer
                      id={comment.id}
                      durationSec={comment.audioDuration || 5}
                      waveform={comment.waveform}
                      audioUrl={comment.audioUrl}
                      compact
                      seed={idx + 11}
                    />
                  ) : (
                    <p className="text-[13px] text-zinc-200 leading-relaxed">
                      {comment.text}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Composer */}
        <div className="p-4 border-t border-white/10 bg-[#08080C] space-y-3">
          {isRecording ? (
            <div className="rounded-2xl bg-[#FF2E93]/12 border border-[#FF2E93]/40 p-3 flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#FF6B35] shrink-0 animate-pulse" />
              <div className="flex-1 flex items-center gap-[2px] h-7 overflow-hidden">
                {(liveBars.length > 0 ? liveBars : [20, 35, 50]).map((h, i) => (
                  <span
                    key={i}
                    className="flex-1 rounded-full bg-gradient-to-t from-[#7B2CBF] via-[#FF2E93] to-[#FF6B35]"
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
              <span className="text-xs font-mono tabular-nums text-white shrink-0">
                {formatAudioClock(recordSeconds)} / 0:10
              </span>
              <button
                type="button"
                onClick={stopRecording}
                aria-label="Stop recording voice note"
                className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shrink-0 active:scale-95 transition-transform cursor-pointer"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            </div>
          ) : recordedClip ? (
            <div className="space-y-2.5">
              <VoiceWavePlayer
                id="draft_voice_comment"
                durationSec={recordedClip.duration}
                waveform={recordedClip.waveform}
                audioUrl={recordedClip.localUrl}
                label="Recorded Voice Note"
                compact
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => setRecordedClip(null)}
                  className="h-11 px-4 rounded-xl bg-white/[0.06] text-zinc-300 text-xs font-medium flex items-center gap-1.5 hover:bg-white/10 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  Discard
                </button>
                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendVoice}
                  className="flex-1 h-11 rounded-xl vibe-gradient-bg text-white text-xs font-semibold flex items-center justify-center gap-1.5 shadow-[0_8px_20px_-6px_rgba(255,46,147,0.55)] active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? 'Saving…' : 'Post Voice Comment'}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSendText} className="flex items-center gap-2">
              <button
                type="button"
                onClick={startRecording}
                aria-label="Record 10-second voice note"
                title="Record 10s Voice Note"
                className="w-11 h-11 rounded-2xl bg-[#7B2CBF]/25 border border-[#FF2E93]/40 text-[#FF6B35] hover:bg-[#7B2CBF]/40 flex items-center justify-center shrink-0 active:scale-95 transition-all cursor-pointer"
              >
                <Mic className="w-5 h-5" />
              </button>
              <input
                type="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Write a comment or tap mic…"
                maxLength={280}
                className="flex-1 h-11 rounded-2xl bg-white/[0.06] border border-white/10 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E93]/65"
              />
              <button
                type="submit"
                disabled={!text.trim() || isSending}
                aria-label="Post text comment"
                className="w-11 h-11 rounded-2xl vibe-gradient-bg text-white flex items-center justify-center shrink-0 disabled:opacity-35 active:scale-95 transition-all cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
