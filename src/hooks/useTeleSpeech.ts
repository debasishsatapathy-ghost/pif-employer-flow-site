/**
 * useTeleSpeech - Mobeus 2.0 compatible hook
 * 
 * Listens to agent speech via LiveKit transcription events.
 * This replaces the trainco-v1 data channel approach with proper LiveKit transcription.
 */

import { useState, useEffect, useRef } from 'react';

interface TeleSpeechState {
  speech: string | null;
  isTalking: boolean;
}

export function useTeleSpeech(): TeleSpeechState {
  const [speech, setSpeech] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const room = (window as any).__employerRoom;
    if (!room) {
      console.warn('[useTeleSpeech] No employer room available');
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
    room.on('transcriptionReceived', handleTranscription);
    room.on('participantAttributesChanged', handleParticipantAttributesChanged);

    // Cleanup
    return () => {
      room.off('transcriptionReceived', handleTranscription);
      room.off('participantAttributesChanged', handleParticipantAttributesChanged);
      
      if (speechTimeoutRef.current) {
        clearTimeout(speechTimeoutRef.current);
      }
    };
  }, []);

  return { speech, isTalking };
}
