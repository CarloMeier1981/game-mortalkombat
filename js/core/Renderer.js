import { WORLD } from './World.js';

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
    this.cw = cw;
    this.ch = ch;
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

  renderFight({ arena, time, projectiles, particles, shake }) {
    this._begin(shake);
    const ctx = this.ctx;
    arena.drawBackground(ctx, WORLD.width, WORLD.height, time);
    particles.draw(ctx);
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
}
