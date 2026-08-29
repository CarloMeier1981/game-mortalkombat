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

  _rand(base, spread) {
    return base + (Math.random() * 2 - 1) * spread;
  }

  _noiseBuffer(duration) {
    const ctx = this.ctx;
    const buffer = ctx.createBuffer(1, Math.max(1, ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  _distortionCurve(amount) {
    const n = 256;
    const curve = new Float32Array(n);
    const k = Math.max(0.0001, amount);
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * k) / Math.tanh(k);
    }
    return curve;
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

  // Low-end "body" layer — this is what gives an impact real weight instead of sounding thin.
  _thump(freqStart, freqEnd, duration, gainStart, type = 'sine') {
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), ctx.currentTime + duration);
    gain.gain.setValueAtTime(gainStart, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  _burst(duration, gainStart, filterFreq, opts = {}) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this._noiseBuffer(duration);
    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType || 'lowpass';
    filter.frequency.value = filterFreq;
    filter.Q.value = opts.Q || 0.7;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainStart, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    src.connect(filter);
    if (opts.distortion) {
      const shaper = ctx.createWaveShaper();
      shaper.curve = this._distortionCurve(opts.distortion);
      filter.connect(shaper);
      shaper.connect(gain);
    } else {
      filter.connect(gain);
    }
    gain.connect(this.sfxGain);
    src.start();
  }

  // Very short high-passed noise transient — the "crack" that sits on top of a punch's body.
  _click(duration, gainStart) {
    this._burst(duration, gainStart, 4200, { filterType: 'highpass', Q: 0.6 });
  }

  play(name) {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    switch (name) {
      case 'light':
        this._click(0.03, 0.42);
        this._burst(0.06, 0.42, this._rand(2500, 400), { filterType: 'bandpass', Q: 1.1 });
        this._thump(this._rand(210, 20), 85, 0.08, 0.48);
        break;
      case 'heavy':
        this._click(0.02, 0.3);
        this._burst(0.15, 0.65, 650, { filterType: 'lowpass', distortion: 5 });
        this._thump(this._rand(150, 10), 42, 0.22, 0.8, 'triangle');
        break;
      case 'block':
        this._tone(this._rand(820, 40), 0.08, 'square', 0.3, { freqEnd: 1500 });
        this._tone(this._rand(1240, 50), 0.1, 'triangle', 0.2, { freqEnd: 640 });
        this._burst(0.045, 0.22, 5200, { filterType: 'highpass' });
        break;
      case 'hit':
        this._burst(0.1, 0.55, 1300, { filterType: 'bandpass', Q: 1 });
        this._thump(170, 70, 0.1, 0.42);
        break;
      case 'special':
        this._tone(220, 0.5, 'sawtooth', 0.4, { freqEnd: 880 });
        this._burst(0.3, 0.3, 4000);
        this._thump(150, 55, 0.35, 0.5, 'triangle');
        break;
      case 'dash':
        this._burst(0.1, 0.25, 3000);
        break;
      case 'jump':
        this._tone(300, 0.12, 'sine', 0.25, { freqEnd: 500 });
        break;
      case 'land':
        this._burst(0.08, 0.35, 600);
        this._thump(120, 55, 0.08, 0.3);
        break;
      case 'ui':
        this._tone(700, 0.06, 'square', 0.2, { freqEnd: 900 });
        break;
      case 'victory':
        this._playJingle([440, 550, 660, 880], 0.14);
        break;
      case 'defeat':
        this._playJingle([440, 380, 300, 220], 0.2);
        break;
      case 'grab':
        this._click(0.02, 0.25);
        this._burst(0.18, 0.55, 380, { filterType: 'lowpass' });
        this._thump(105, 38, 0.24, 0.62, 'triangle');
        break;
      case 'ko':
        this._tone(90, 0.6, 'sawtooth', 0.7, { freqEnd: 30 });
        this._burst(0.5, 0.5, 1800, { distortion: 4 });
        this._thump(135, 32, 0.42, 0.65, 'triangle');
        break;
      default:
        break;
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
    const baseFreqs = {
      chinatown: [55, 82.4, 98],
      beach: [49, 73.4, 92.5],
      futurecity: [43.6, 65.4, 77.8],
      blackmountains: [41.2, 61.7, 87.3],
    };
    const freqs = baseFreqs[arenaId] || baseFreqs.chinatown;
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
