// Web Audio synthesizer + real HTMLAudio playback for Voice Bios, Voice Comments & Spark ambience

class VibeGramAudioEngine {
  private ctx: AudioContext | null = null;
  private activeHtmlAudio: HTMLAudioElement | null = null;
  private activeTimer: number | null = null;
  private activeNodes: AudioNode[] = [];
  private activeId: string | null = null;
  private onEndedCallback: (() => void) | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return null;
    if (!this.ctx) {
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }

  public stop(): void {
    if (this.activeHtmlAudio) {
      this.activeHtmlAudio.pause();
      this.activeHtmlAudio.currentTime = 0;
      this.activeHtmlAudio = null;
    }
    if (this.activeTimer !== null) {
      window.clearInterval(this.activeTimer);
      this.activeTimer = null;
    }
    this.activeNodes.forEach((node) => {
      try {
        if ('stop' in node && typeof (node as OscillatorNode).stop === 'function') {
          (node as OscillatorNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already stopped audio nodes
      }
    });
    this.activeNodes = [];
    this.activeId = null;
    this.onEndedCallback = null;
  }

  public getActiveId(): string | null {
    return this.activeId;
  }

  /**
   * Plays either a real recorded audioUrl (Blob/DataURL) or a subtle warm vocal-cadence
   * ambient synth for pre-populated creator voice notes and voice bios.
   */
  public playVoiceClip(params: {
    id: string;
    audioUrl?: string;
    durationSec: number;
    seed?: number;
    onProgress: (progress: number) => void;
    onEnded: () => void;
  }): void {
    const { id, audioUrl, durationSec, seed = 1, onProgress, onEnded } = params;

    if (this.activeId === id) {
      this.stop();
      onEnded();
      return;
    }

    this.stop();
    this.activeId = id;
    this.onEndedCallback = onEnded;

    // If user actually recorded a real mic clip, play that HTMLAudioElement
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      this.activeHtmlAudio = audio;
      audio.ontimeupdate = () => {
        if (audio.duration > 0) {
          onProgress(Math.min(1, audio.currentTime / audio.duration));
        }
      };
      audio.onended = () => {
        this.stop();
        onProgress(0);
        onEnded();
      };
      audio.play().catch(() => {
        this.playAmbientCadence(id, durationSec, seed, onProgress, onEnded);
      });
      return;
    }

    this.playAmbientCadence(id, durationSec, seed, onProgress, onEnded);
  }

  private playAmbientCadence(
    id: string,
    durationSec: number,
    seed: number,
    onProgress: (progress: number) => void,
    onEnded: () => void,
  ): void {
    const ctx = this.ensureContext();
    const safeDuration = Math.max(2, Math.min(12, durationSec));
    const startedAt = performance.now();

    if (ctx) {
      const scales = [
        [261.63, 311.13, 392.0, 466.16, 523.25], // C minor 7
        [293.66, 349.23, 440.0, 523.25, 587.33], // D minor 7
        [246.94, 293.66, 369.99, 440.0, 493.88], // B minor 7
      ];
      const chord = scales[Math.abs(seed) % scales.length];

      const master = ctx.createGain();
      master.gain.setValueAtTime(0.0001, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(0.075, ctx.currentTime + 0.25);
      master.gain.setValueAtTime(0.075, ctx.currentTime + safeDuration - 0.45);
      master.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + safeDuration);
      master.connect(ctx.destination);
      this.activeNodes.push(master);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1100, ctx.currentTime);
      filter.connect(master);
      this.activeNodes.push(filter);

      // Gentle rhythmic voice-like pulses
      const stepCount = Math.floor(safeDuration * 2.5);
      for (let i = 0; i < stepCount; i++) {
        const osc = ctx.createOscillator();
        const noteGain = ctx.createGain();
        const freq = chord[(i + seed) % chord.length];
        const t = ctx.currentTime + i * 0.38;
        if (t >= ctx.currentTime + safeDuration - 0.2) break;

        osc.type = i % 2 === 0 ? 'sine' : 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        noteGain.gain.setValueAtTime(0.0001, t);
        noteGain.gain.exponentialRampToValueAtTime(0.32, t + 0.06);
        noteGain.gain.exponentialRampToValueAtTime(0.001, t + 0.34);

        osc.connect(noteGain);
        noteGain.connect(filter);

        osc.start(t);
        osc.stop(t + 0.36);
        this.activeNodes.push(osc, noteGain);
      }
    }

    this.activeTimer = window.setInterval(() => {
      if (this.activeId !== id) return;
      const elapsed = (performance.now() - startedAt) / 1000;
      const pct = Math.min(1, elapsed / safeDuration);
      onProgress(pct);
      if (pct >= 1) {
        const cb = this.onEndedCallback;
        this.stop();
        onProgress(0);
        cb?.();
      }
    }, 60);
  }
}

export const audioEngine = new VibeGramAudioEngine();

export function generateWaveform(length = 28, seed = 42): number[] {
  const bars: number[] = [];
  let s = seed;
  for (let i = 0; i < length; i++) {
    s = (s * 16807) % 2147483647;
    const envelope = Math.sin((i / (length - 1)) * Math.PI);
    const val = Math.round(18 + ((s % 72) * (0.45 + 0.55 * envelope)));
    bars.push(Math.max(14, Math.min(96, val)));
  }
  return bars;
}
