import React, { useEffect, useState } from 'react';
import { Pause, Play, Volume2 } from 'lucide-react';
import { audioEngine } from '../lib/audio';
import { formatAudioClock } from '../lib/utils';

interface VoiceWavePlayerProps {
  id: string;
  durationSec: number;
  waveform: number[];
  audioUrl?: string;
  label?: string;
  transcript?: string;
  compact?: boolean;
  seed?: number;
}

export const VoiceWavePlayer: React.FC<VoiceWavePlayerProps> = ({
  id,
  durationSec,
  waveform,
  audioUrl,
  label,
  transcript,
  compact = false,
  seed = 7,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    return () => {
      if (audioEngine.getActiveId() === id) {
        audioEngine.stop();
      }
    };
  }, [id]);

  const togglePlay = () => {
    if (isPlaying) {
      audioEngine.stop();
      setIsPlaying(false);
      setProgress(0);
      return;
    }

    setIsPlaying(true);
    audioEngine.playVoiceClip({
      id,
      audioUrl,
      durationSec,
      seed,
      onProgress: (p) => setProgress(p),
      onEnded: () => {
        setIsPlaying(false);
        setProgress(0);
      },
    });
  };

  const bars = waveform.length > 0 ? waveform : [28, 46, 72, 58, 84, 62, 44, 68, 88, 52, 38, 60, 74, 48, 36, 54, 66, 40, 28, 22];
  const currentSec = isPlaying ? Math.ceil(progress * durationSec) : durationSec;

  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/[0.04] ${
        compact ? 'px-3 py-2.5' : 'p-3.5'
      } transition-colors ${isPlaying ? 'border-[#FF2E93]/45 bg-[#FF2E93]/[0.06]' : ''}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={isPlaying ? 'Pause voice note' : 'Play voice note'}
          className={`${
            compact ? 'w-9 h-9' : 'w-11 h-11'
          } rounded-full vibe-gradient-bg text-white flex items-center justify-center shrink-0 shadow-[0_0_20px_-4px_rgba(255,46,147,0.55)] active:scale-95 transition-transform cursor-pointer`}
        >
          {isPlaying ? (
            <Pause className="w-4 h-4 fill-current" />
          ) : (
            <Play className="w-4 h-4 fill-current translate-x-[1px]" />
          )}
        </button>

        <div className="flex-1 min-w-0 space-y-1.5">
          {label && (
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#FF6B35]">
                <Volume2 className="w-3.5 h-3.5" />
                {label}
              </span>
              <span className="text-[11px] font-mono tabular-nums text-zinc-400">
                {formatAudioClock(currentSec)} / {formatAudioClock(durationSec)}
              </span>
            </div>
          )}

          {/* Waveform visualizer */}
          <div className={`flex items-center gap-[2.5px] ${compact ? 'h-6' : 'h-7'}`}>
            {bars.map((height, idx) => {
              const ratio = idx / bars.length;
              const isFilled = isPlaying && ratio <= progress;
              return (
                <span
                  key={idx}
                  className="flex-1 rounded-full transition-colors duration-100"
                  style={{
                    height: `${Math.max(20, height)}%`,
                    background: isFilled
                      ? 'linear-gradient(180deg, #FF6B35 0%, #FF2E93 52%, #7B2CBF 100%)'
                      : 'rgba(255, 255, 255, 0.22)',
                  }}
                />
              );
            })}
          </div>
        </div>

        {!label && (
          <span className="text-[11px] font-mono tabular-nums text-zinc-400 shrink-0">
            {formatAudioClock(currentSec)}
          </span>
        )}
      </div>

      {transcript && !compact && (
        <p className="mt-2.5 text-xs text-zinc-300/90 leading-relaxed line-clamp-2">
          “{transcript}”
        </p>
      )}
    </div>
  );
};
