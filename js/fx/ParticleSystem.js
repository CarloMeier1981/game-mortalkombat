import { WORLD } from '../core/World.js';

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this._ambientTimer = 0;
  }

  emit(type, x, y, opts = {}) {
    const count = opts.count || 10;
    for (let i = 0; i < count; i++) {
      const p = { type, x, y, life: 0, maxLife: opts.life || 0.5 };
      switch (type) {
        case 'spark':
          p.vx = (Math.random() - 0.5) * 9;
          p.vy = (Math.random() - 0.5) * 9 - 2;
          p.size = 2 + Math.random() * 3;
          p.color = opts.color || '#ffcf6b';
          p.gravity = 0.3;
          break;
        case 'impact':
          p.vx = (Math.random() - 0.5) * 5;
          p.vy = -Math.random() * 3;
          p.size = 3 + Math.random() * 4;
          p.color = opts.color || '#ffffff';
          p.gravity = 0.1;
          break;
        case 'dust':
          p.vx = (opts.dir || 1) * (1 + Math.random() * 3);
          p.vy = -Math.random() * 1.5;
          p.size = 4 + Math.random() * 6;
          p.color = '#5a4a3a';
          p.gravity = 0.02;
          p.maxLife = 0.7;
          break;
        case 'ember':
          p.vx = (Math.random() - 0.5) * 0.6;
          p.vy = -1 - Math.random() * 1.5;
          p.size = 1.5 + Math.random() * 2;
          p.color = '#ff8a3d';
          p.gravity = -0.01;
          p.maxLife = 2.5;
          break;
        case 'rain':
          p.vx = -1;
          p.vy = 12 + Math.random() * 6;
          p.size = 1;
          p.length = 14;
          p.color = '#7fd8ff88';
          p.gravity = 0;
          p.maxLife = 1.2;
          break;
        case 'energy':
          p.vx = (Math.random() - 0.5) * 0.4;
          p.vy = (Math.random() - 0.5) * 0.4 - 0.3;
          p.size = 1 + Math.random() * 2;
          p.color = '#b98bff';
          p.gravity = 0;
          p.maxLife = 3;
          break;
        case 'mist':
          p.vx = (Math.random() - 0.5) * 0.3;
          p.vy = (Math.random() - 0.5) * 0.08;
          p.size = 40 + Math.random() * 70;
          p.color = opts.color || '#ffffff';
          p.gravity = 0;
          p.maxLife = 7;
          p.alphaScale = 0.1;
          break;
        default:
          p.vx = 0; p.vy = 0; p.size = 3; p.color = '#fff'; p.gravity = 0;
      }
      this.particles.push(p);
    }
  }

  ambient(arenaId, dt) {
    this._ambientTimer -= dt;
    if (this._ambientTimer > 0) return;
    this._ambientTimer = arenaId === 'futurecity' ? 0.015 : 0.12;
    const x = WORLD.left + Math.random() * (WORLD.right - WORLD.left);
    if (arenaId === 'chinatown') this.emit('ember', x, WORLD.floorY + 20, { count: 1 });
    else if (arenaId === 'futurecity') this.emit('rain', Math.random() * WORLD.width, -10, { count: 2 });
    else if (arenaId === 'beach' || arenaId === 'blackmountains') {
      this.emit('mist', x, WORLD.floorY - 60 - Math.random() * 220, { count: 1 });
    }
  }

  update(dt) {
    const scale = dt * 60;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;
      if (p.life >= p.maxLife) { this.particles.splice(i, 1); continue; }
      p.x += p.vx * scale;
      p.y += p.vy * scale;
      p.vy += p.gravity * scale;
    }
    if (this.particles.length > 400) this.particles.splice(0, this.particles.length - 400);
  }

  draw(ctx) {
    for (const p of this.particles) {
      const alpha = 1 - p.life / p.maxLife;
      ctx.globalAlpha = Math.max(0, alpha) * (p.alphaScale || 1);
      ctx.fillStyle = p.color;
      if (p.type === 'rain') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 1.2, p.y - p.length);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles = [];
  }
}
