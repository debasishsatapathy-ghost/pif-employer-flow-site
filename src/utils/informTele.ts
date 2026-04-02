/**
 * informTele — Send invisible correction feedback to the voice agent
 *
 * Publishes a feedback message via LiveKit Data Channel on topic "tele:feedback".
 * The agent listens for this topic and injects the message as a system message
 * into its chat context, allowing it to self-correct (e.g., fix layout mismatches,
 * unknown card types).
 *
 * Used by GridView to report rendering issues.
 */

import type { Room } from 'livekit-client';

let _room: Room | null = null;

/**
 * Set the LiveKit room reference. Called once from voice-session-store
 * when the room connects.
 */
export function setInformTeleRoom(room: Room | null): void {
  _room = room;
}

/**
 * Send a session update to the voice agent.
 * The agent receives this as context and can act on it.
 */
export function informTele(message: string): void {
  if (!message || typeof message !== 'string') {
    console.warn('[informTele] Invalid message:', message);
    return;
  }

  console.log('[informTele] Feedback:', message);

  // Also fire a custom event for local debugging / dev tools
  setTimeout(() => {
    window.dispatchEvent(
      new CustomEvent('informTeleEvent', { detail: { message, timestamp: Date.now() } }),
    );
  }, 0);

  // Publish to data channel
  if (_room?.localParticipant) {
    try {
      const payload = new TextEncoder().encode(
        JSON.stringify({ message, timestamp: Date.now() }),
      );
      _room.localParticipant.publishData(payload, { reliable: true, topic: 'tele:feedback' });
    } catch (error) {
      console.error('[informTele] Failed to publish:', error);
    }
  } else {
    console.warn('[informTele] No room connected — feedback not sent');
  }
}
