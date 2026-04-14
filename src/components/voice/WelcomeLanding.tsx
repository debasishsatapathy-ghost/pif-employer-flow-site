'use client';

import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';
import { ArrowRight } from 'lucide-react';

const agentName = process.env.NEXT_PUBLIC_AGENT_NAME || 'AI Assistant';

export function WelcomeLanding() {
  const connect = useVoiceSessionStore((s) => s.connect);
  const sessionState = useVoiceSessionStore((s) => s.sessionState);

  const isConnecting = sessionState === 'connecting';

  return (
    <div className="min-h-dvh lg:h-dvh lg:overflow-hidden grid grid-rows-[auto_1fr_auto] p-3 md:p-6 lg:p-8">
      {/* Header — agent name top-left */}
      <header className="flex items-center">
        <span className="text-white/80 font-hero text-lg md:text-xl font-semibold tracking-tight">
          {agentName}
        </span>
      </header>

      {/* Content — left-aligned, vertically centered */}
      <main className="flex items-center">
        <div className="max-w-2xl space-y-6">
          {/* Badge pill */}
          <div
            className="animate-slide-in-left"
            style={{ animationDelay: '0.1s' }}
          >
            <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-data tracking-[0.15em] text-white/80 uppercase backdrop-blur-sm border border-white/10">
              {agentName} &middot; AI POWERED
            </span>
          </div>

          {/* Title */}
          <h1
            className="animate-slide-in-left font-hero text-5xl sm:text-6xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight text-white"
            style={{ animationDelay: '0.25s' }}
          >
            Your AI{' '}
            <span className="text-[#00e5ff]">
              Assistant
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="animate-slide-in-left text-base sm:text-lg md:text-xl text-white/60 max-w-lg"
            style={{ animationDelay: '0.4s' }}
          >
            Always available &middot; Instant answers &middot; Personalized help
          </p>

          {/* START CONVERSATION button */}
          <div
            className="animate-slide-in-left"
            style={{ animationDelay: '0.55s' }}
          >
            <button
              onClick={connect}
              disabled={isConnecting}
              className="start-button inline-flex items-center gap-3 rounded-none disabled:opacity-60"
            >
              {isConnecting ? 'CONNECTING...' : 'START CONVERSATION'}
              {!isConnecting && <ArrowRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between text-[10px] sm:text-xs font-data text-white/40 uppercase tracking-widest">
        <span>POWERED BY MOBEUS</span>
        <span>VOICE AI PLATFORM</span>
      </footer>
    </div>
  );
}
