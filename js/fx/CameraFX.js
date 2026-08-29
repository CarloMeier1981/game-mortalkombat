const SHAKE_PROFILES = {
  light: { amount: 4, decay: 10 },
  heavy: { amount: 9, decay: 7 },
  special: { amount: 15, decay: 5 },
  ko: { amount: 20, decay: 3 },
};

const HITSTOP_PROFILES = {
  light: 3,
  heavy: 6,
  special: 10,
  ko: 16,
};

export class CameraFX {
  constructor() {
    this.shake = 0;
    this.shakeDecay = 8;
    this.hitStopFrames = 0;
  }

  trigger(type) {
    const shakeProfile = SHAKE_PROFILES[type] || SHAKE_PROFILES.light;
    this.shake = Math.max(this.shake, shakeProfile.amount);
    this.shakeDecay = shakeProfile.decay;
    this.hitStopFrames = Math.max(this.hitStopFrames, HITSTOP_PROFILES[type] || 0);
  }

  isFrozen() {
    return this.hitStopFrames > 0;
  }

  update(dt) {
    if (this.hitStopFrames > 0) {
      this.hitStopFrames -= 1;
      return;
    }
    if (this.shake > 0) {
      this.shake -= this.shakeDecay * dt * 60 * 0.1;
      if (this.shake < 0) this.shake = 0;
    }
  }

  getShakeOffset() {
    if (this.shake <= 0) return { x: 0, y: 0 };
    return {
      x: (Math.random() - 0.5) * this.shake,
      y: (Math.random() - 0.5) * this.shake,
    };
  }
}
