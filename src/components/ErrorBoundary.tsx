import React from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'Unexpected error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-dvh bg-[#050505] text-zinc-100 flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-3xl glass-surface p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-rose-500/15 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h2 className="font-display text-lg font-semibold text-white">Something interrupted VibeGram</h2>
            <p className="text-xs text-zinc-400 leading-relaxed break-words">
              {this.state.message.slice(0, 180)}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="w-full h-11 rounded-2xl vibe-gradient-bg text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-[0_8px_24px_-6px_rgba(255,46,147,0.5)] active:scale-[0.98] transition-transform"
            >
              <RefreshCw className="w-4 h-4" />
              Reload App
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
