'use client';

import { useState, useEffect } from 'react';
import { Mic, MicOff, MessageCircle, X, ArrowRight } from 'lucide-react';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';
import { assets } from '@/assets';
import { playUISound, playGlassSound } from '@/utils/soundGenerator';

export function ControlBar() {
  const sessionState = useVoiceSessionStore((s) => s.sessionState);
  const isMuted = useVoiceSessionStore((s) => s.isMuted);
  const isChatPanelOpen = useVoiceSessionStore((s) => s.isChatPanelOpen);
  const sceneActive = useVoiceSessionStore((s) => s.sceneActive);
  const theme = useVoiceSessionStore((s) => s.theme);
  const connect = useVoiceSessionStore((s) => s.connect);
  const disconnect = useVoiceSessionStore((s) => s.disconnect);
  const toggleMute = useVoiceSessionStore((s) => s.toggleMute);
  const toggleChatPanel = useVoiceSessionStore((s) => s.toggleChatPanel);
  const avatarThumbnailUrl = useVoiceSessionStore((s) => s.avatarThumbnailUrl);

  const [showTalkButton, setShowTalkButton] = useState(false);

  const isConnected = sessionState === 'connected';
  const isConnecting = sessionState === 'connecting';
  const isIdle = sessionState === 'idle' || sessionState === 'error';

  const isDark = theme === 'dark';
  const iconColor = (!sceneActive || isDark) ? 'text-white/70 hover:text-white' : 'text-gray-600 hover:text-gray-900';
  const iconBg = (!sceneActive || isDark) ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10';

  // Delay TALK button appearance by 2s
  useEffect(() => {
    if (isIdle) {
      const timer = setTimeout(() => setShowTalkButton(true), 2000);
      return () => clearTimeout(timer);
    }
    setShowTalkButton(false);
  }, [isIdle]);

  const handleConnect = () => {
    playGlassSound();
    connect();
  };

  const handleToggleChat = () => {
    playUISound(isChatPanelOpen ? 'off' : 'on', 'chat');
    toggleChatPanel();
  };

  const handleToggleMute = () => {
    playUISound(isMuted ? 'on' : 'off', 'mic');
    toggleMute();
  };

  const handleDisconnect = () => {
    playUISound('off', 'avatar');
    disconnect();
  };

  // z-100 when chat open so icons float above chat panel (z-50)
  const zIndex = isChatPanelOpen ? 'z-[100]' : 'z-[60]';

  return (
    <div className={`fixed top-4 right-4 md:top-6 md:right-8 ${zIndex} inline-flex items-center gap-2 sm:gap-3 transition-all duration-300 ease-in-out`}>

      {/* Chat toggle */}
      {isConnected && (
        <button
          onClick={handleToggleChat}
          className={`transition-all duration-300 ${
            isChatPanelOpen
              ? 'text-red-500 hover:text-red-400'
              : `${iconColor}`
          }`}
          title={isChatPanelOpen ? 'Close chat' : 'Open chat'}
        >
          {isChatPanelOpen ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
        </button>
      )}

      {/* Mic toggle */}
      {isConnected && (
        <button
          onClick={handleToggleMute}
          className={`p-2 rounded-full transition-all duration-200 ${
            isMuted
              ? 'text-red-500 hover:text-red-400'
              : `${iconBg} ${iconColor}`
          }`}
          title={isMuted ? 'Unmute mic' : 'Mute mic'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>
      )}

      {/* TALK button (idle) */}
      {isIdle && showTalkButton && (
        <button
          onClick={handleConnect}
          className="start-button inline-flex items-center gap-2 rounded-none text-sm"
        >
          TALK <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Connecting indicator (pulsing button) */}
      {isConnecting && (
        <button
          disabled
          className="start-button inline-flex items-center gap-2 rounded-none text-sm opacity-80 connecting-pulse"
        >
          CONNECTING...
        </button>
      )}

      {/* Disconnect */}
      {isConnected && (
        <button
          onClick={handleDisconnect}
          className="bg-red-600 text-white p-2.5 rounded-full hover:bg-red-500 transition-colors duration-300 shadow-lg shadow-red-600/30"
          title="Disconnect"
        >
          <X className="w-4 h-4" />
        </button>
      )}

      {/* Avatar thumbnail */}
      <div
        className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
          isConnecting
            ? 'border-[rgba(45,64,89,0.6)] bg-[rgba(45,64,89,0.1)] animate-pulse'
            : isConnected
              ? 'border-[rgba(45,64,89,0.8)] shadow-lg'
              : 'border-white/30 shadow-lg'
        }`}
        onClick={isIdle ? handleConnect : undefined}
      >
        <img
          src={avatarThumbnailUrl || assets.avatarProfile}
          alt="Avatar"
          className={`w-full h-full object-cover rounded-full transition-all duration-300 ${
            isIdle ? 'brightness-75 hover:brightness-100' :
            isConnecting ? '' : 'brightness-125'
          }`}
        />
      </div>
    </div>
  );
}
