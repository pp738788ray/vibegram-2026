import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, MessageSquare, Send, X } from 'lucide-react';
import { subscribeToMessages } from '../lib/firestoreSync';
import { formatRelativeTime } from '../lib/utils';
import { SafeImage } from './SafeImage';
import type { ChatMessage, ChatThread, CreatorProfile } from '../types';

interface DirectMessagesModalProps {
  currentUser: CreatorProfile;
  threads: ChatThread[];
  initialThreadId?: string | null;
  onClose: () => void;
  onSendMessage: (thread: ChatThread, text: string) => Promise<void>;
  onReactMessage: (chatId: string, messageId: string, emoji: string) => Promise<void>;
}

const REACTION_EMOJIS = ['❤️', '🔥', '⚡', '😂'];

export const DirectMessagesModal: React.FC<DirectMessagesModalProps> = ({
  currentUser,
  threads,
  initialThreadId = null,
  onClose,
  onSendMessage,
  onReactMessage,
}) => {
  const [activeThreadId, setActiveThreadId] = useState<string | null>(initialThreadId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [reactingMessageId, setReactingMessageId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const activeThread = threads.find((t) => t.id === activeThreadId) || null;

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    const unsub = subscribeToMessages(activeThreadId, currentUser.uid, setMessages);
    return () => unsub();
  }, [activeThreadId, currentUser.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || isSending) return;
    const trimmed = draft.trim();
    if (!trimmed) return;
    setIsSending(true);
    try {
      await onSendMessage(activeThread, trimmed);
      setDraft('');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <motion.div
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 z-50 bg-[#050505] flex flex-col"
    >
      {/* Top Bar */}
      <div className="h-16 px-4 border-b border-white/10 bg-[#08080C]/90 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
        {activeThread ? (
          <>
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => setActiveThreadId(null)}
                aria-label="Back to messages"
                className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-200 hover:text-white cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="relative shrink-0">
                <SafeImage
                  src={activeThread.participant.avatarUrl}
                  alt={activeThread.participant.displayName}
                  className="w-10 h-10 rounded-2xl object-cover"
                />
                <span
                  className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full vibe-gradient-bg ring-2 ring-[#08080C]"
                  title="Active"
                />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  @{activeThread.participant.handle}
                </p>
                <p className="text-[11px] text-zinc-400 truncate">
                  {activeThread.participant.displayName}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close direct messages"
              className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 className="font-display text-lg font-bold text-white">Direct</h2>
              <p className="text-[11px] text-zinc-400">1-on-1 conversations</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close direct messages"
              className="w-10 h-10 rounded-full bg-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Body */}
      {!activeThread ? (
        <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-2.5">
          {threads.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12 space-y-3">
              <div className="w-14 h-14 rounded-2xl glass-surface flex items-center justify-center text-[#FF6B35]">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">No conversations yet</p>
                <p className="text-xs text-zinc-400 max-w-[250px] leading-relaxed">
                  Visit Explore to find real VibeGram members and start a 1-on-1 message thread.
                </p>
              </div>
            </div>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setActiveThreadId(thread.id)}
                className="w-full rounded-2xl glass-surface p-3.5 flex items-center gap-3.5 text-left hover:bg-white/[0.09] active:scale-[0.99] transition-all cursor-pointer"
              >
                <SafeImage
                  src={thread.participant.avatarUrl}
                  alt={thread.participant.displayName}
                  className="w-12 h-12 rounded-2xl object-cover shrink-0"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white truncate">
                      @{thread.participant.handle}
                    </span>
                    <span className="text-[11px] font-mono tabular-nums text-zinc-500 shrink-0">
                      {formatRelativeTime(thread.updatedAt)}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 truncate mt-0.5">
                    {thread.lastMessage || 'Start chatting…'}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      ) : (
        <>
          {/* Live Messages */}
          <div className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
            {messages.length === 0 ? (
              <p className="text-center text-xs text-zinc-500 py-10">
                Say hello to @{activeThread.participant.handle}.
              </p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.senderId === currentUser.uid;
                const isSelecting = reactingMessageId === msg.id;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}
                  >
                    <button
                      type="button"
                      onClick={() => setReactingMessageId(isSelecting ? null : msg.id)}
                      className={`relative max-w-[82%] rounded-[22px] px-4 py-2.5 text-left text-[13.5px] leading-relaxed transition-transform active:scale-[0.98] cursor-pointer ${
                        isMine
                          ? 'vibe-gradient-bg text-white font-medium rounded-br-md shadow-[0_6px_18px_-6px_rgba(255,46,147,0.5)]'
                          : 'glass-surface text-zinc-100 rounded-bl-md'
                      }`}
                    >
                      {msg.text}
                      {msg.reaction && (
                        <span
                          className={`absolute -bottom-2.5 ${
                            isMine ? 'left-2' : 'right-2'
                          } text-xs px-1.5 py-0.5 rounded-full bg-[#14141C] border border-white/15 shadow`}
                        >
                          {msg.reaction}
                        </span>
                      )}
                    </button>

                    {isSelecting && (
                      <div className="mt-2 flex items-center gap-1 rounded-full bg-[#12121A] border border-white/12 p-1 shadow-xl">
                        {REACTION_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => {
                              void onReactMessage(
                                activeThread.id,
                                msg.id,
                                msg.reaction === emoji ? '' : emoji,
                              );
                              setReactingMessageId(null);
                            }}
                            className="w-8 h-8 rounded-full hover:bg-white/10 text-sm flex items-center justify-center cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    <span className="mt-1 px-1 text-[10px] font-mono tabular-nums text-zinc-500">
                      {formatRelativeTime(msg.createdAt)}
                    </span>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-3.5 border-t border-white/10 bg-[#08080C] flex items-center gap-2"
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={`Message @${activeThread.participant.handle}…`}
              maxLength={450}
              className="flex-1 h-11 rounded-full bg-white/[0.06] border border-white/10 px-4 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-[#FF2E93]/65"
            />
            <button
              type="submit"
              disabled={!draft.trim() || isSending}
              aria-label="Send direct message"
              className="w-11 h-11 rounded-full vibe-gradient-bg text-white flex items-center justify-center shrink-0 disabled:opacity-35 active:scale-95 transition-all cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </motion.div>
  );
};
