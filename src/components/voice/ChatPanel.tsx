'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';
import { assets } from '@/assets';
import { ToolCallIndicator } from './ToolCallIndicator';

const SLEEP_TIMEOUT = 5000;

export function ChatPanel() {
  const sessionState = useVoiceSessionStore((s) => s.sessionState);
  const transcripts = useVoiceSessionStore((s) => s.transcripts);
  const isChatPanelOpen = useVoiceSessionStore((s) => s.isChatPanelOpen);
  const sendTextMessage = useVoiceSessionStore((s) => s.sendTextMessage);
  const currentAgentName = useVoiceSessionStore((s) => s.currentAgentName);
  const avatarThumbnailUrl = useVoiceSessionStore((s) => s.avatarThumbnailUrl);

  const [textInput, setTextInput] = useState('');
  const [isSleeping, setIsSleeping] = useState(false);
  const [showToolCalls, setShowToolCalls] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const isConnected = sessionState === 'connected';

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts]);

  // Sleep mode: dim after mouse idle
  const resetSleep = useCallback(() => {
    setIsSleeping(false);
    if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    sleepTimerRef.current = setTimeout(() => {
      if (document.activeElement !== inputRef.current) {
        setIsSleeping(true);
      }
    }, SLEEP_TIMEOUT);
  }, []);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !isChatPanelOpen) return;

    resetSleep();
    panel.addEventListener('mousemove', resetSleep);
    panel.addEventListener('mousedown', resetSleep);

    return () => {
      panel.removeEventListener('mousemove', resetSleep);
      panel.removeEventListener('mousedown', resetSleep);
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [isChatPanelOpen, resetSleep]);

  useEffect(() => {
    if (isSleeping) {
      document.body.classList.add('chat-sleeping');
    } else {
      document.body.classList.remove('chat-sleeping');
    }
    return () => {
      document.body.classList.remove('chat-sleeping');
    };
  }, [isSleeping]);

  const handleSend = async () => {
    const message = textInput.trim();
    if (!message) return;
    setTextInput('');
    await sendTextMessage(message);
  };

  // Filter transcripts based on smart mode
  const visibleTranscripts = transcripts.filter((t) => {
    if (t.participant === 'tool') return showToolCalls;
    return t.isFinal || t.isAgent;
  });

  return (
    <div
      ref={panelRef}
      className={`fixed telelabor-panel top-0 h-dvh z-50 flex flex-col
        border-l-0
        transition-[right,opacity] duration-500 ease-out
        max-xl:left-0 max-xl:right-0 max-xl:w-full
      `}
      style={{
        width: 'var(--glass-chat-width)',
        maxWidth: '100vw',
        right: isChatPanelOpen ? '0' : 'calc(-1 * var(--glass-chat-width))',
        opacity: isChatPanelOpen ? 1 : 0,
        pointerEvents: isChatPanelOpen ? 'auto' : 'none',
      }}
    >
      {/* Chat messages area */}
      <div className="chat-messages-container flex-1 px-4 pt-20 pb-4 flex flex-col gap-3">
        {transcripts.length === 0 && isConnected && (
          <div className="flex-1 flex items-center justify-center">
            <p
              className="text-sm font-voice"
              style={{ color: 'var(--theme-chat-placeholder)' }}
            >
              Conversation will appear here...
            </p>
          </div>
        )}

        {visibleTranscripts.map((t, i) => {
          // Tool call entries
          if (t.participant === 'tool') {
            let toolParams: Record<string, unknown> = {};
            try {
              toolParams = JSON.parse(t.text);
            } catch {
              toolParams = { raw: t.text };
            }
            return (
              <ToolCallIndicator
                key={t.id}
                toolName={t.participantName}
                parameters={toolParams}
                timestamp={t.timestamp}
              />
            );
          }

          return (
            <div
              key={t.id}
              className={`animate-chat-bubble-enter flex gap-2.5 ${
                t.participant === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
              style={{ animationDelay: `${Math.min(i * 0.05, 0.3)}s` }}
            >
              {/* Avatar (agent only) */}
              {t.participant === 'agent' && (
                <div className="chat-avatar w-7 h-7 rounded-full overflow-hidden shrink-0 mt-1">
                  <img
                    src={avatarThumbnailUrl || assets.avatarProfile}
                    alt={currentAgentName || 'Agent'}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Bubble */}
              <div
                className={`chat-message-bubble max-w-[75%] sm:max-w-[70%] rounded-2xl px-3.5 py-2.5
                  text-sm leading-relaxed transition-all duration-500
                  hover:brightness-110 hover:shadow-lg
                  ${t.participant === 'user' ? 'ml-auto' : ''}`}
                style={{
                  background: 'var(--theme-chat-bubble)',
                  color: 'var(--theme-chat-text)',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
                }}
              >
                {t.text}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} />
      </div>

      {/* Text input area with sparkle toggle */}
      <div className="shrink-0 px-4 pb-4 pt-2">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-sm rounded-full px-3 sm:px-4 py-2 sm:py-2.5">
          {/* Smart Mode (sparkle) toggle */}
          <button
            onClick={() => setShowToolCalls(!showToolCalls)}
            className={`flex items-center justify-center w-7 h-7 transition-all duration-300 flex-shrink-0 bg-transparent
              ${showToolCalls
                ? 'text-amber-400'
                : 'text-gray-400/30 hover:text-gray-400/50'
              }`}
            title={showToolCalls ? 'Smart Mode: ON — Tool calls visible' : 'Smart Mode: OFF — Tool calls hidden'}
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <input
            ref={inputRef}
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onFocus={resetSleep}
            placeholder="Type a message..."
            className="flex-1 min-w-0 bg-transparent text-white text-sm placeholder:text-white/30 focus:outline-none font-voice"
            disabled={!isConnected}
          />
          <button
            onClick={handleSend}
            disabled={!isConnected || textInput.trim().length === 0}
            className="chat-icon p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors disabled:opacity-30"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
