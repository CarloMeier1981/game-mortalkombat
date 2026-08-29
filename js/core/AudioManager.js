export class AudioManager {
  constructor() {
    this.ctx = null;
    this.musicVolume = 0.5;
    this.sfxVolume = 0.8;
    this.musicNodes = [];
    this.musicTimer = null;
    this.currentArenaId = null;
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = this.sfxVolume;
    this.sfxGain.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = this.musicVolume;
    this.musicGain.connect(this.ctx.destination);
  }

  setSfxVolume(v) {
    this.sfxVolume = v;
    if (this.sfxGain) this.sfxGain.gain.value = v;
  }

  setMusicVolume(v) {
    this.musicVolume = v;
    if (this.musicGain) this.musicGain.gain.value = v;
  }

  _noiseBuffer(duration) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _tone(freq, duration, type, gainStart, opts = {}) {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (opts.freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(opts.freqEnd, 1), ctx.currentTime + duration);
    }
    gain.gain.setValueAtTime(gainStart, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  _burst(duration, gainStart, filterFreq) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(duration);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainStart, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start();
  }

  play(name) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    switch (name) {
      case 'light': this._burst(0.08, 0.5, 1800); break;
      case 'heavy': this._burst(0.16, 0.8, 900); this._tone(120, 0.18, 'sine', 0.6, { freqEnd: 60 }); break;
      case 'block': this._tone(500, 0.1, 'square', 0.35, { freqEnd: 300 }); break;
      case 'hit': this._burst(0.12, 0.6, 1200); break;
      case 'special': this._tone(220, 0.5, 'sawtooth', 0.4, { freqEnd: 880 }); this._burst(0.3, 0.3, 4000); break;
      case 'dash': this._burst(0.1, 0.25, 3000); break;
      case 'jump': this._tone(300, 0.12, 'sine', 0.25, { freqEnd: 500 }); break;
      case 'land': this._burst(0.08, 0.35, 600); break;
      case 'ui': this._tone(700, 0.06, 'square', 0.2, { freqEnd: 900 }); break;
      case 'victory': this._playJingle([440, 550, 660, 880], 0.14); break;
      case 'defeat': this._playJingle([440, 380, 300, 220], 0.2); break;
      case 'grab': this._burst(0.14, 0.5, 700); break;
      case 'ko': this._tone(90, 0.6, 'sawtooth', 0.7, { freqEnd: 30 }); this._burst(0.5, 0.5, 2000); break;
      default: break;
    }
  }

  _playJingle(freqs, step) {
    freqs.forEach((f, i) => {
      setTimeout(() => this._tone(f, step * 1.4, 'triangle', 0.35, { freqEnd: f }), i * step * 1000);
    });
  }

  playMusicForArena(arenaId) {
    if (!this.ctx) return;
    if (this.currentArenaId === arenaId && this.musicTimer) return;
    this.stopMusic();
    this.currentArenaId = arenaId;
    const baseFreqs = { forge: [55, 82.4, 98], ruins: [49, 73.4, 87.3], void: [43.6, 65.4, 77.8] };
    const freqs = baseFreqs[arenaId] || baseFreqs.forge;
    const drones = freqs.map((f) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.value = f;
      gain.gain.value = 0.05;
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      return { osc, gain };
    });
    this.musicNodes = drones;
    const pulse = () => {
      if (!this.ctx || this.currentArenaId !== arenaId) return;
      this._burst(0.06, 0.12, 200);
      this.musicTimer = setTimeout(pulse, 700 + Math.random() * 400);
    };
    this.musicTimer = setTimeout(pulse, 500);
  }

  stopMusic() {
    this.musicNodes.forEach(({ osc, gain }) => {
      try {
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.3);
        osc.stop(this.ctx.currentTime + 0.35);
      } catch (e) { /* already stopped */ }
    });
    this.musicNodes = [];
    if (this.musicTimer) clearTimeout(this.musicTimer);
    this.musicTimer = null;
    this.currentArenaId = null;
  }
}
