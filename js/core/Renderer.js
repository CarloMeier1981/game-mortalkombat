import { WORLD } from './World.js';

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.resize();
  }

  resize() {
    const parent = this.canvas.parentElement;
    const cw = parent.clientWidth;
    const ch = parent.clientHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.scale = Math.min(cw / WORLD.width, ch / WORLD.height);
    const drawW = WORLD.width * this.scale;
    const drawH = WORLD.height * this.scale;
    this.offsetX = (cw - drawW) / 2;
    this.offsetY = (ch - drawH) / 2;
    this.canvas.width = Math.round(cw * dpr);
    this.canvas.height = Math.round(ch * dpr);
    this.canvas.style.width = cw + 'px';
    this.canvas.style.height = ch + 'px';
    this.dpr = dpr;
  }

  _begin(shake) {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(
      this.dpr * this.scale, 0, 0, this.dpr * this.scale,
      this.dpr * (this.offsetX + (shake ? shake.x : 0)),
      this.dpr * (this.offsetY + (shake ? shake.y : 0))
    );
  }

  renderFight({ arena, time, fighters, projectiles, particles, shake }) {
    this._begin(shake);
    const ctx = this.ctx;
    arena.drawBackground(ctx, WORLD.width, WORLD.height, time);
    particles.draw(ctx);
    for (const f of fighters) this.drawFighter(f);
    this.drawProjectiles(projectiles);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  renderIdleBackground(arena, time) {
    this._begin(null);
    if (arena) arena.drawBackground(this.ctx, WORLD.width, WORLD.height, time);
    else {
      this.ctx.fillStyle = '#0a0808';
      this.ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    }
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  drawProjectiles(list) {
    const ctx = this.ctx;
    for (const p of list) {
      ctx.save();
      ctx.translate(p.x, p.y);
      const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, p.width / 2 + 8);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.5, p.color);
      grad.addColorStop(1, p.color + '00');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(0, 0, p.width / 2 + 8, p.height / 2 + 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  drawFighter(f) {
    const ctx = this.ctx;
    const { build, color } = f;
    const facing = f.facing;

    if (f.state === 'dodge') {
      for (let i = 1; i <= 2; i++) {
        ctx.save();
        ctx.globalAlpha = 0.15 * (3 - i);
        ctx.translate(f.x - f.vx * i * 0.6, f.y);
        this._drawBody(f, facing, 0);
        ctx.restore();
      }
    }

    ctx.save();
    ctx.translate(f.x, f.y);
    if (f.state === 'hitstun' && Math.floor(f.animTime * 30) % 2 === 0) {
      ctx.globalAlpha = 0.6;
    }
    this._drawBody(f, facing, f.invincible ? 0.4 : 0);
    ctx.restore();
  }

  _drawBody(f, facing, glowBoost) {
    const ctx = this.ctx;
    const { build, color } = f;
    const t = f.animTime;
    let bob = 0;
    let legSpread = 0.15;
    let armAngle = 0.15;
    let bodyLean = 0;
    let heightScale = 1;

    if (f.state === 'idle') bob = Math.sin(t * 3.2) * 2;
    if (f.state === 'walk') { bob = Math.abs(Math.sin(t * 9)) * 3; legSpread = 0.4 + Math.sin(t * 9) * 0.3; }
    if (f.state === 'jump') { legSpread = 0.05; armAngle = 0.5; }
    if (f.state === 'crouch') { heightScale = 0.62; armAngle = 0.3; }
    if (f.state === 'block') { armAngle = -0.9; bodyLean = -facing * 0.05; }
    if (f.state === 'hitstun') { bodyLean = -facing * 0.18; }
    if (f.state === 'blockstun') { bodyLean = -facing * 0.1; armAngle = -0.7; }
    if (f.state === 'defeated') { bodyLean = facing * 1.3; heightScale = 0.35; }
    if (f.state === 'victory') { armAngle = -1.4; bob = Math.abs(Math.sin(t * 4)) * 4; }

    let attackReach = 0;
    if (f.state === 'attack' && f.attackDef) {
      const def = f.attackDef;
      if (f.attackPhase === 'startup') attackReach = -0.3 * (1 - f.attackTimer / def.startup);
      else if (f.attackPhase === 'active') attackReach = 1;
      else attackReach = 1 - f.attackTimer / def.recovery;
    }

    const w = build.width * heightScale ** 0.3;
    const h = build.height * heightScale;
    const headR = build.headR;

    ctx.rotate(bodyLean);
    ctx.translate(0, -bob);

    // legs
    ctx.fillStyle = color.secondary;
    const legW = w * 0.24;
    const legH = h * 0.42;
    ctx.fillRect(-w * legSpread - legW / 2, -legH, legW, legH);
    ctx.fillRect(w * legSpread - legW / 2, -legH, legW, legH);

    // torso
    const torsoH = h * 0.42;
    const torsoY = -legH - torsoH;
    ctx.fillStyle = color.primary;
    roundRect(ctx, -w * 0.34, torsoY, w * 0.68, torsoH, 6);
    ctx.fill();

    // chest accent
    ctx.fillStyle = color.accent + '55';
    ctx.fillRect(-w * 0.1, torsoY + torsoH * 0.15, w * 0.2, torsoH * 0.5);

    // arms
    ctx.fillStyle = color.secondary;
    const armW = w * 0.2;
    const armLen = h * 0.36;
    const shoulderY = torsoY + torsoH * 0.15;

    // back arm
    ctx.save();
    ctx.translate(-facing * w * 0.28, shoulderY);
    ctx.rotate(-facing * (armAngle * 0.6));
    ctx.fillRect(-armW / 2, 0, armW, armLen * 0.8);
    ctx.restore();

    // front arm (attacking arm)
    ctx.save();
    ctx.translate(facing * w * 0.28, shoulderY);
    const swing = f.state === 'attack' ? lerp(-0.4, 1.3, clamp(attackReach, 0, 1)) : armAngle;
    ctx.rotate(facing * swing);
    ctx.fillStyle = f.state === 'attack' && f.attackPhase === 'active' ? color.accent : color.secondary;
    const reach = f.state === 'attack' ? armLen * (1 + clamp(attackReach, 0, 1) * 0.6) : armLen;
    ctx.fillRect(-armW / 2, 0, armW, reach);
    ctx.restore();

    // head
    ctx.fillStyle = color.primary;
    ctx.beginPath();
    ctx.arc(facing * 2, torsoY - headR * 0.7, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color.accent;
    ctx.beginPath();
    ctx.arc(facing * (2 + headR * 0.4), torsoY - headR * 0.7, headR * 0.25, 0, Math.PI * 2);
    ctx.fill();

    if (glowBoost > 0) {
      ctx.globalAlpha = glowBoost;
      ctx.strokeStyle = color.accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(-w * 0.4, torsoY - headR * 1.8, w * 0.8, legH + torsoH + headR * 1.8);
      ctx.globalAlpha = 1;
    }
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
