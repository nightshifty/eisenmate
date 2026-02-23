/**
 * Synthesises a pleasant completion chime using the Web Audio API.
 * No external audio file required.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Play a single bell-like tone at the given frequency. */
function playTone(
  ctx: AudioContext,
  freq: number,
  startTime: number,
  duration: number,
  volume: number,
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + duration);
}

/**
 * Play a gentle two-note ascending chime (C6 → E6) with soft harmonics.
 * Sounds like a friendly, warm bell — much nicer than a beep.
 */
export function playCompletionChime(): void {
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Note 1: C6 (1047 Hz) — base + octave harmonic
    playTone(ctx, 1047, now, 1.2, 0.3);
    playTone(ctx, 2094, now, 0.8, 0.1); // octave harmonic

    // Note 2: E6 (1319 Hz) — 150 ms later, slightly louder
    playTone(ctx, 1319, now + 0.15, 1.4, 0.35);
    playTone(ctx, 2637, now + 0.15, 0.9, 0.12); // octave harmonic

    // Subtle fifth (G6) to fill out the chord, very quiet
    playTone(ctx, 1568, now + 0.3, 1.0, 0.08);
  } catch {
    // Silently ignore — browser may block audio before user interaction
  }
}
