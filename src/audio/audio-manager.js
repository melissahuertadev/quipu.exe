const PREFS = {
  ambient: 'quipu.audio.ambient',
  sfx: 'quipu.audio.sfx',
};

function readPreference(key, fallback) {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? fallback : stored === 'on';
  } catch {
    return fallback;
  }
}

function savePreference(key, enabled) {
  try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch { /* Audio is optional when storage is blocked. */ }
}

/** Optional audio layer; browsers may keep the prepared context silent until a user gesture. */
export class AudioManager {
  constructor() {
    this.ambientEnabled = readPreference(PREFS.ambient, true);
    this.sfxEnabled = readPreference(PREFS.sfx, true);
    this.context = null;
    this.sfxBus = null;
    this.ambientBus = null;
    this.windSource = null;
  }

  initialize() {
    const context = this.ensureContext();
    if (context?.state === 'running' && this.ambientEnabled) this.startWind();
  }

  ensureContext() {
    if (this.context) return this.context;
    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      const context = new AudioContextClass();
      const sfxBus = context.createGain();
      const ambientBus = context.createGain();
      sfxBus.gain.value = .9;
      ambientBus.gain.value = .9;
      sfxBus.connect(context.destination);
      ambientBus.connect(context.destination);
      this.context = context;
      this.sfxBus = sfxBus;
      this.ambientBus = ambientBus;
      return context;
    } catch {
      return null;
    }
  }

  unlock() {
    const context = this.ensureContext();
    if (!context) return;
    try {
      if (context.state === 'suspended') context.resume().catch(() => {});
      if (this.ambientEnabled) this.startWind();
    } catch { /* The game continues without audio if the browser rejects it. */ }
  }

  setAmbientEnabled(enabled) {
    this.ambientEnabled = Boolean(enabled);
    savePreference(PREFS.ambient, this.ambientEnabled);
    const context = this.ensureContext();
    if (!context) return;
    try {
      if (context.state === 'suspended') context.resume().catch(() => {});
      if (this.ambientEnabled) this.startWind();
      if (this.ambientBus) this.ambientBus.gain.setTargetAtTime(this.ambientEnabled ? .9 : 0, context.currentTime, .24);
    } catch { /* Optional sound. */ }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = Boolean(enabled);
    savePreference(PREFS.sfx, this.sfxEnabled);
  }

  startWind() {
    const context = this.context;
    if (!context || this.windSource || !this.ambientBus) return;
    try {
      const seconds = 4;
      const buffer = context.createBuffer(1, context.sampleRate * seconds, context.sampleRate);
      const data = buffer.getChannelData(0);
      let low = 0;
      for (let i = 0; i < data.length; i++) {
        const white = Math.random() * 2 - 1;
        low += (white - low) * .018;
        data[i] = low * .72 + white * .08;
      }
      const source = context.createBufferSource();
      const lowPass = context.createBiquadFilter();
      const highPass = context.createBiquadFilter();
      const windGain = context.createGain();
      source.buffer = buffer;
      source.loop = true;
      lowPass.type = 'lowpass'; lowPass.frequency.value = 620;
      highPass.type = 'highpass'; highPass.frequency.value = 85;
      windGain.gain.value = 0;
      source.connect(highPass); highPass.connect(lowPass); lowPass.connect(windGain); windGain.connect(this.ambientBus);
      source.start();
      windGain.gain.setTargetAtTime(.34, context.currentTime, .8);
      this.windSource = source;
      this.windGain = windGain;
    } catch { /* If buffers or nodes fail, keep the rest of the game available. */ }
  }

  playTone({ frequency, endFrequency = frequency, start = 0, duration = .14, volume = .035, wave = 'sine' }) {
    if (!this.sfxEnabled) return;
    const context = this.ensureContext();
    if (!context || !this.sfxBus) return;
    try {
      if (context.state === 'suspended') context.resume().catch(() => {});
      const now = context.currentTime + start;
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
      envelope.gain.setValueAtTime(.0001, now);
      envelope.gain.exponentialRampToValueAtTime(volume, now + .018);
      envelope.gain.exponentialRampToValueAtTime(.0001, now + duration);
      oscillator.connect(envelope); envelope.connect(this.sfxBus);
      oscillator.start(now); oscillator.stop(now + duration + .025);
      oscillator.onended = () => { oscillator.disconnect(); envelope.disconnect(); };
    } catch { /* Sound synthesis must never interrupt a game interaction. */ }
  }

  playGrab() {
    this.playTone({ frequency: 340, endFrequency: 265, duration: .095, volume: .075, wave: 'triangle' });
  }

  playRelease() {
    this.playTone({ frequency: 235, endFrequency: 185, duration: .12, volume: .06, wave: 'sine' });
  }

  playMemory() {
    this.playTone({ frequency: 392, endFrequency: 388, duration: .34, volume: .065, wave: 'sine' });
    this.playTone({ frequency: 494, endFrequency: 490, start: .075, duration: .38, volume: .05, wave: 'sine' });
    this.playTone({ frequency: 587, endFrequency: 582, start: .15, duration: .42, volume: .04, wave: 'sine' });
  }

  playEnding() {
    if (!this.sfxEnabled) return;
    // A single, slowly voiced chord replaces the ordinary level cue on level five.
    this.playTone({ frequency: 196, endFrequency: 195, duration: 1.25, volume: .055, wave: 'sine' });
    this.playTone({ frequency: 293.66, endFrequency: 293, start: .08, duration: 1.18, volume: .042, wave: 'sine' });
    this.playTone({ frequency: 392, endFrequency: 391, start: .16, duration: 1.1, volume: .032, wave: 'sine' });
    this.playTone({ frequency: 587.33, endFrequency: 586, start: .24, duration: .95, volume: .018, wave: 'sine' });
  }
}
