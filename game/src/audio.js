// Procedural sound: every effect is a few WebAudio oscillators, no audio
// files. The context is created on the first user gesture, so a screenshot
// run stays silent, and M mutes everything.

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let lastStepAt = 0;

  function ensure() {
    if (context) return true;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.16;
      master.connect(context.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(frequency, duration, type, volume, when = 0, slideTo = null) {
    if (!ensure() || muted) return;
    try {
      const t0 = context.currentTime + when;
      const osc = context.createOscillator();
      const gain = context.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, t0);
      if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch {
      // Audio is decoration: never let it break the game.
    }
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.16;
      return muted;
    },
    isMuted() {
      return muted;
    },
    /** A soft footstep tick, throttled so running does not buzz. */
    footstep(sneaking) {
      const now = performance.now();
      if (now - lastStepAt < (sneaking ? 420 : 260)) return;
      lastStepAt = now;
      tone(sneaking ? 140 : 190, 0.05, 'triangle', sneaking ? 0.25 : 0.5);
    },
    pickup() {
      tone(880, 0.12, 'sine', 0.8);
      tone(1318, 0.18, 'sine', 0.7, 0.09);
    },
    spotted() {
      tone(520, 0.16, 'square', 0.35, 0, 760);
    },
    alarm() {
      tone(392, 0.5, 'sawtooth', 0.5, 0, 196);
      tone(392, 0.5, 'sawtooth', 0.4, 0.12, 196);
    },
    caught() {
      tone(220, 0.6, 'sawtooth', 0.6, 0, 55);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 'sine', 0.7, i * 0.11));
    },
    click() {
      tone(660, 0.06, 'sine', 0.4);
    },
  };
}
