/**
 * UNIFIED GLASS SOUND SYSTEM
 * All sounds use the elegant UI sound architecture
 *
 * Three sound personalities:
 * - 'chat' (C5): Soft, conversational - for generic interactions
 * - 'mic' (E5): Bright, clear - for use case selections
 * - 'avatar' (G5): Deep, spatial - for navigation
 */

// Singleton AudioContext for UI sounds
let uiAudioContext: AudioContext | null = null;

const getUIAudioContext = (): AudioContext | null => {
  if (!uiAudioContext) {
    try {
      uiAudioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

      if (uiAudioContext.state === 'suspended') {
        uiAudioContext.resume();
      }
    } catch {
      return null;
    }
  }
  return uiAudioContext;
};

/**
 * Plays a UI sound effect for all interface interactions
 * @param type - 'on' for activation sound, 'off' for deactivation sound
 * @param buttonType - 'chat', 'mic', or 'avatar' determines the frequency
 * @param volumeMultiplier - Volume multiplier from 0 to 1 (default 1)
 */
export const playUISound = (type: 'on' | 'off', buttonType: 'chat' | 'mic' | 'avatar', volumeMultiplier: number = 1) => {
  try {
    const ctx = getUIAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const frequencies = {
      chat: 523.25,   // C5 - Soft, conversational
      mic: 659.25,    // E5 - Bright, clear
      avatar: 783.99  // G5 - Deep, spatial
    };

    const baseFreq = frequencies[buttonType];

    const oscillators: OscillatorNode[] = [];
    const gainNodes: GainNode[] = [];

    for (let i = 0; i < 2; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.connect(gain);
      gain.connect(ctx.destination);

      oscillators.push(osc);
      gainNodes.push(gain);
    }

    const clampedVolume = Math.max(0, Math.min(1, volumeMultiplier));

    if (type === 'on') {
      oscillators[0].frequency.setValueAtTime(baseFreq, ctx.currentTime);
      oscillators[1].frequency.setValueAtTime(baseFreq * 1.25, ctx.currentTime);

      oscillators.forEach((osc, i) => {
        osc.type = 'sine';
        gainNodes[i].gain.setValueAtTime(0, ctx.currentTime);
        gainNodes[i].gain.exponentialRampToValueAtTime(0.03 * clampedVolume, ctx.currentTime + 0.02);
        gainNodes[i].gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      });
    } else {
      oscillators[0].frequency.setValueAtTime(baseFreq * 1.25, ctx.currentTime);
      oscillators[1].frequency.setValueAtTime(baseFreq, ctx.currentTime);

      oscillators.forEach((osc, i) => {
        osc.type = 'sine';
        gainNodes[i].gain.setValueAtTime(0, ctx.currentTime);
        gainNodes[i].gain.exponentialRampToValueAtTime(0.02 * clampedVolume, ctx.currentTime + 0.01);
        gainNodes[i].gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      });
    }
  } catch {
    // Sound playback failed silently
  }
};

// ============================================================
// GLASS CLICK SOUND
// A gentle, floating chime for start interactions
// ============================================================

export const playGlassSound = (volumeMultiplier: number = 1) => {
  try {
    const ctx = getUIAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;
    const clampedVolume = Math.max(0, Math.min(1, volumeMultiplier));

    // Primary tone (1200 Hz - clear, bright)
    const primaryOsc = ctx.createOscillator();
    const primaryGain = ctx.createGain();
    primaryOsc.type = 'sine';
    primaryOsc.frequency.setValueAtTime(1200, now);
    primaryGain.gain.setValueAtTime(0, now);
    primaryGain.gain.linearRampToValueAtTime(0.15 * clampedVolume, now + 0.01);
    primaryGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    primaryOsc.connect(primaryGain);
    primaryGain.connect(ctx.destination);
    primaryOsc.start(now);
    primaryOsc.stop(now + 0.6);

    // Harmonic (2400 Hz - octave)
    const harmonicOsc = ctx.createOscillator();
    const harmonicGain = ctx.createGain();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.setValueAtTime(2400, now);
    harmonicGain.gain.setValueAtTime(0, now);
    harmonicGain.gain.linearRampToValueAtTime(0.08 * clampedVolume, now + 0.01);
    harmonicGain.gain.exponentialRampToValueAtTime(0.01, now + 0.42);
    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(ctx.destination);
    harmonicOsc.start(now);
    harmonicOsc.stop(now + 0.6);

    // Sub tone (600 Hz - warmth)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(600, now);
    subGain.gain.setValueAtTime(0, now);
    subGain.gain.linearRampToValueAtTime(0.1 * clampedVolume, now + 0.02);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
    subOsc.connect(subGain);
    subGain.connect(ctx.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.6);
  } catch {
    // Sound playback failed silently
  }
};

// ============================================================
// THINKING SOUND SYSTEM
// A subtle, pulsing ambient tone that plays while the agent thinks
// Limited to MAX 3 plays per thinking session
// ============================================================

let isThinkingSoundPlaying = false;
let thinkingSoundPlayCount = 0;
const MAX_THINKING_SOUND_PLAYS = 3;
let thinkingChimeInterval: ReturnType<typeof setInterval> | null = null;

const playWarmChime = (ctx: AudioContext): void => {
  // Warm major triad - E5, G#5, B5
  const frequencies = [659.25, 830.61, 987.77];
  const duration = 0.6;
  const maxGain = 0.008;

  frequencies.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);

    const attackTime = 0.02;
    const staggerDelay = i * 0.03;

    gain.gain.setValueAtTime(0, ctx.currentTime + staggerDelay);
    gain.gain.linearRampToValueAtTime(maxGain * (1 - i * 0.2), ctx.currentTime + staggerDelay + attackTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + staggerDelay + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + staggerDelay);
    osc.stop(ctx.currentTime + staggerDelay + duration + 0.1);
  });
};

export const playThinkingSound = (): void => {
  if (isThinkingSoundPlaying) return;
  if (thinkingSoundPlayCount >= MAX_THINKING_SOUND_PLAYS) return;

  try {
    const ctx = getUIAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    thinkingSoundPlayCount++;
    isThinkingSoundPlaying = true;

    playWarmChime(ctx);

    thinkingChimeInterval = setInterval(() => {
      if (!isThinkingSoundPlaying) {
        if (thinkingChimeInterval) clearInterval(thinkingChimeInterval);
        return;
      }
      playWarmChime(ctx);
    }, 2500);
  } catch {
    isThinkingSoundPlaying = false;
  }
};

export const stopThinkingSound = (): void => {
  if (!isThinkingSoundPlaying) return;

  try {
    if (thinkingChimeInterval) {
      clearInterval(thinkingChimeInterval);
      thinkingChimeInterval = null;
    }
    isThinkingSoundPlaying = false;
    thinkingSoundPlayCount = 0;
  } catch {
    if (thinkingChimeInterval) {
      clearInterval(thinkingChimeInterval);
      thinkingChimeInterval = null;
    }
    isThinkingSoundPlaying = false;
    thinkingSoundPlayCount = 0;
  }
};
