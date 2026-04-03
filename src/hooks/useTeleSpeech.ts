/**
 * useTeleSpeech — drives the "AI is talking" signal for EmployerDashboard.
 *
 * PREVIOUS APPROACH (broken):
 *   Registered its own `transcriptionReceived` listener and checked
 *   `participant.kind !== 'agent'` (string). LiveKit's ParticipantKind is a
 *   numeric protobuf enum (AGENT = 4), so that string comparison was always
 *   `true` — every agent transcript was filtered out, `isTalking` never fired,
 *   and the chat spinner rotated forever.
 *
 * CURRENT APPROACH (correct):
 *   The Zustand voice-session store already handles `TranscriptionReceived`
 *   using the correct numeric check (`participant.kind === ParticipantKind.AGENT`).
 *   We simply watch `state.transcripts` and process new final agent entries,
 *   eliminating the duplicate listener and the string-vs-number bug entirely.
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

  // IDs of final agent transcripts we've already surfaced to the UI.
  const processedIdsRef = useRef<Set<string>>(new Set());
  // Set to true after the first render so we can skip pre-existing transcripts.
  const initializedRef = useRef(false);

  const transcripts = useVoiceSessionStore((s) => s.transcripts);

  useEffect(() => {
    if (!initializedRef.current) {
      // First render: treat all current final agent transcripts as already seen
      // so we don't replay history on mount.
      transcripts
        .filter((t) => t.isAgent && t.isFinal)
        .forEach((t) => processedIdsRef.current.add(t.id));
      initializedRef.current = true;
      return;
    }

    // Find final agent transcripts that haven't been surfaced yet.
    // This handles both newly-appended segments AND segments that were
    // initially non-final and then got their isFinal flag flipped to true
    // (same ID, updated in place in the store array).
    const newAgentFinals = transcripts.filter(
      (t) => t.isAgent && t.isFinal && t.text && !processedIdsRef.current.has(t.id),
    );

    if (newAgentFinals.length === 0) return;

    newAgentFinals.forEach((t) => processedIdsRef.current.add(t.id));

    // Use the latest segment's text as the current speech chunk.
    const latestText = newAgentFinals[newAgentFinals.length - 1].text;
    setIsTalking(true);
    setSpeech(latestText);

    // Reset the silence window: mark as "not talking" 1 s after the last chunk.
    if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    speechTimeoutRef.current = setTimeout(() => {
      setIsTalking(false);
    }, 1000);
  }, [transcripts]);

  // Cleanup the silence timer on unmount.
  useEffect(() => {
    return () => {
      if (speechTimeoutRef.current) clearTimeout(speechTimeoutRef.current);
    };
  }, []);

  return { speech, isTalking };
}
