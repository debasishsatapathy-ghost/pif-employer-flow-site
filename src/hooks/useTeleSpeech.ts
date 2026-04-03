/**
 * useTeleSpeech - Mobeus Platform compatible hook
 *
 * Listens to agent speech via LiveKit transcription events.
 * Gets the LiveKit room directly from the Zustand voice-session store,
 * so it works correctly in standalone mode (no window globals needed).
 */

import { useState, useEffect, useRef } from 'react';
import { useVoiceSessionStore } from '@/lib/stores/voice-session-store';

interface TeleSpeechState {
  speech: string | null;
  isTalking: boolean;
}

export function useTeleSpeech(): TeleSpeechState {
  const [speech, setSpeech] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reactively get the room from the store — updates automatically when connect() completes
  const room = useVoiceSessionStore((s) => s.room);

  useEffect(() => {
    if (!room) {
      return;
    }

    // Listen for transcription events from the agent
    const handleTranscription = (
      segments: any[],
      participant: any,
    ) => {
      // Only process agent transcriptions
      if (participant?.kind !== 'agent') return;

      for (const segment of segments) {
        if (segment.final && segment.text) {
          // Agent is talking
          setIsTalking(true);
          setSpeech(segment.text);

          // Clear any existing timeout
          if (speechTimeoutRef.current) {
            clearTimeout(speechTimeoutRef.current);
          }

          // Mark as not talking after 1 second of silence
          speechTimeoutRef.current = setTimeout(() => {
            setIsTalking(false);
          }, 1000);
        }
      }
    };

    // Listen for agent state changes (alternative way to detect talking)
    const handleParticipantAttributesChanged = (
      changedAttributes: Record<string, string>,
      participant: any,
    ) => {
      if (participant?.kind !== 'agent') return;

      const agentState = changedAttributes['lk.agent.state'];
      if (agentState === 'speaking') {
        setIsTalking(true);
      } else if (agentState === 'listening' || agentState === 'thinking') {
        setIsTalking(false);
      }
    };

    // Register event listeners
    try {
      room.on('transcriptionReceived', handleTranscription);
      room.on('participantAttributesChanged', handleParticipantAttributesChanged);
    } catch (err) {
      console.warn('[useTeleSpeech] Failed to register event listeners:', err);
    }

    // Cleanup
    return () => {
      try {
        room.off('transcriptionReceived', handleTranscription);
        room.off('participantAttributesChanged', handleParticipantAttributesChanged);
      } catch (err) {
        // Ignore cleanup errors
      }

      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, [room]);

  return { speech, isTalking };
}
