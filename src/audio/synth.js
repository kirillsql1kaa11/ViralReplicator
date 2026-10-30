/**
 * Procedural Web Audio API sound generator for memory writes, mutations, and spawns.
 */

export class CyberAudioSynth {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.2;
    this.masterGain = null;
    this.lastMutationSoundTime = 0;
    this.lastWriteSoundTime = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playWriteClick() {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastWriteSoundTime < 30) return; // rate limit
    this.lastWriteSoundTime = now;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(400 + Math.random() * 400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.02);

    gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.02);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.02);
  }

  playMutationChime() {
    if (!this.enabled || !this.ctx) return;
    const now = performance.now();
    if (now - this.lastMutationSoundTime < 150) return; // rate limit chimes
    this.lastMutationSoundTime = now;

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    // Ethereal two-tone chord
    const baseFreq = 520 + Math.floor(Math.random() * 6) * 65;
    [baseFreq, baseFreq * 1.5].forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.04);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, this.ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.12, this.ctx.currentTime + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(this.ctx.currentTime + idx * 0.04);
      osc.stop(this.ctx.currentTime + 0.35);
    });
  }
}
