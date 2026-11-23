import type { AuraBorder } from '../types';

export function formatCount(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return String(num);
}

export function formatRelativeTime(timestamp: number): string {
  const diffSec = Math.max(1, Math.floor((Date.now() - timestamp) / 1000));
  if (diffSec < 60) return 'just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d`;
}

export function formatAudioClock(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export function sanitizeHandle(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^@+/, '')
    .replace(/[^a-z0-9._]/g, '')
    .slice(0, 24);
}

export function getAuraBorderStyle(border: AuraBorder): {
  ring: string;
  glow: string;
  label: string;
} {
  switch (border) {
    case 'flame':
      return {
        ring: 'bg-gradient-to-tr from-[#FF6B35] via-[#FF9F1C] to-[#FF2E93]',
        glow: 'shadow-[0_0_26px_-4px_rgba(255,107,53,0.62)]',
        label: 'Desi Flame',
      };
    case 'magenta':
      return {
        ring: 'bg-gradient-to-tr from-[#FF2E93] via-[#F72585] to-[#7B2CBF]',
        glow: 'shadow-[0_0_26px_-4px_rgba(255,46,147,0.62)]',
        label: 'Neon Pink',
      };
    case 'violet':
      return {
        ring: 'bg-gradient-to-tr from-[#7B2CBF] via-[#C77DFF] to-[#FF2E93]',
        glow: 'shadow-[0_0_26px_-4px_rgba(123,44,191,0.68)]',
        label: 'Royal Violet',
      };
    case 'sunset':
    case 'aurora':
    case 'cyan':
    case 'emerald':
    default:
      return {
        ring: 'bg-gradient-to-tr from-[#FF6B35] via-[#FF2E93] to-[#7B2CBF]',
        glow: 'shadow-[0_0_28px_-4px_rgba(255,107,53,0.48),0_0_24px_-4px_rgba(255,46,147,0.52)]',
        label: 'VibeGram Sunset',
      };
  }
}
