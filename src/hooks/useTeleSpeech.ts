/**
 * useTeleSpeech - Mobeus Platform compatible hook
 * 
 * Listens to agent speech via LiveKit transcription events.
 * Works with the Mobeus platform's existing room connection.
 */

import { useState, useEffect, useRef } from 'react';

interface TeleSpeechState {
  speech: string | null;
  isTalking: boolean;
}

/**
 * Gets the LiveKit room from the Mobeus platform.
 */
function getMobeusRoom(): any {
  // Check for employer room (set by EmployerDashboard)
  if ((window as any).__employerRoom) {
    return (window as any).__employerRoom;
  }
  
  // Check for Mobeus SDK room
  if ((window as any).__mobeusRoom) {
    return (window as any).__mobeusRoom;
  }
  
  // Check for MobeusSDK object
  const sdk = (window as any).MobeusSDK;
  if (sdk?.room) {
    return sdk.room;
  }
  
  // Check for voice session store
  const store = (window as any).__voiceSessionStore;
  if (store?.getState?.()?.room) {
    return store.getState().room;
  }
  
  return null;
}

export function useTeleSpeech(): TeleSpeechState {
  const [speech, setSpeech] = useState<string | null>(null);
  const [isTalking, setIsTalking] = useState(false);
  const speechTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [room, setRoom] = useState<any>(null);

  // Find the room on mount and when it changes
  useEffect(() => {
    const checkRoom = () => {
      const foundRoom = getMobeusRoom();
      if (foundRoom && foundRoom !== room) {
        setRoom(foundRoom);
      }
    };

    // Check immediately
    checkRoom();

    // Check periodically in case room connects later
    const interval = setInterval(checkRoom, 1000);

    return () => clearInterval(interval);
  }, [room]);

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
