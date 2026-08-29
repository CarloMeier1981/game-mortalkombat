import { WORLD } from '../core/World.js';

function drawForge(ctx, w, h, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.floorY);
  sky.addColorStop(0, '#1a0806');
  sky.addColorStop(0.55, '#2c0e08');
  sky.addColorStop(1, '#4a1806');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, WORLD.floorY);

  const glow = ctx.createRadialGradient(w * 0.5, WORLD.floorY, 30, w * 0.5, WORLD.floorY, 480);
  glow.addColorStop(0, '#ff7b0055');
  glow.addColorStop(1, '#ff7b0000');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, WORLD.floorY);

  ctx.fillStyle = '#0d0503';
  for (let i = 0; i < 6; i++) {
    const bx = 40 + i * (w / 6);
    ctx.fillRect(bx, 60, 46, WORLD.floorY - 60);
  }

  ctx.fillStyle = '#1a0d08';
  ctx.beginPath();
  ctx.moveTo(0, WORLD.floorY);
  for (let x = 0; x <= w; x += 40) {
    ctx.lineTo(x, WORLD.floorY - 14 - Math.sin(x * 0.02 + t * 0.4) * 4);
  }
  ctx.lineTo(w, WORLD.floorY);
  ctx.closePath();
  ctx.fill();

  const ground = ctx.createLinearGradient(0, WORLD.floorY, 0, h);
  ground.addColorStop(0, '#3a1206');
  ground.addColorStop(1, '#120503');
  ctx.fillStyle = ground;
  ctx.fillRect(0, WORLD.floorY, w, h - WORLD.floorY);

  ctx.strokeStyle = '#ff8a3d55';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.floorY);
  ctx.lineTo(w, WORLD.floorY);
  ctx.stroke();
}

function drawRuins(ctx, w, h, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.floorY);
  sky.addColorStop(0, '#0a0d12');
  sky.addColorStop(0.6, '#151a22');
  sky.addColorStop(1, '#20242c');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, WORLD.floorY);

  if (Math.sin(t * 0.7) > 0.985) {
    ctx.fillStyle = '#ffffff22';
    ctx.fillRect(0, 0, w, WORLD.floorY);
  }

  ctx.fillStyle = '#05060888';
  ctx.fillRect(0, 0, w, WORLD.floorY);

  ctx.fillStyle = '#0c0e12';
  const pillars = [0.08, 0.22, 0.78, 0.92];
  pillars.forEach((p, i) => {
    const px = w * p;
    const ph = 220 + (i % 2) * 60;
    ctx.fillRect(px - 22, WORLD.floorY - ph, 44, ph);
    ctx.fillRect(px - 34, WORLD.floorY - ph - 14, 68, 16);
  });

  ctx.fillStyle = '#ff9c4488';
  const torchX = [w * 0.15, w * 0.85];
  torchX.forEach((tx) => {
    const flick = 8 + Math.sin(t * 12 + tx) * 3;
    const grad = ctx.createRadialGradient(tx, WORLD.floorY - 210, 2, tx, WORLD.floorY - 210, 60 + flick);
    grad.addColorStop(0, '#ffcf6bcc');
    grad.addColorStop(1, '#ffcf6b00');
    ctx.fillStyle = grad;
    ctx.fillRect(tx - 70, WORLD.floorY - 280, 140, 140);
  });

  const ground = ctx.createLinearGradient(0, WORLD.floorY, 0, h);
  ground.addColorStop(0, '#23262c');
  ground.addColorStop(1, '#0a0b0d');
  ctx.fillStyle = ground;
  ctx.fillRect(0, WORLD.floorY, w, h - WORLD.floorY);
  ctx.strokeStyle = '#7fd8ff33';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.floorY);
  ctx.lineTo(w, WORLD.floorY);
  ctx.stroke();
}

function drawVoid(ctx, w, h, t) {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.floorY);
  sky.addColorStop(0, '#07040f');
  sky.addColorStop(0.6, '#120a24');
  sky.addColorStop(1, '#1c0f30');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, WORLD.floorY);

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 40; i++) {
    const sx = (i * 137.5) % w;
    const sy = (i * 71.3) % WORLD.floorY;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i));
    ctx.globalAlpha = tw * 0.5;
    ctx.fillRect(sx, sy, 2, 2);
  }
  ctx.globalAlpha = 1;

  const nebula = ctx.createRadialGradient(w * 0.5, WORLD.floorY * 0.4, 20, w * 0.5, WORLD.floorY * 0.4, 500);
  nebula.addColorStop(0, '#8b5cf655');
  nebula.addColorStop(1, '#8b5cf600');
  ctx.fillStyle = nebula;
  ctx.fillRect(0, 0, w, WORLD.floorY);

  ctx.fillStyle = '#1a0f2e';
  for (let i = 0; i < 3; i++) {
    const px = w * (0.2 + i * 0.3);
    const py = WORLD.floorY - 60 - Math.sin(t * 0.6 + i * 2) * 10;
    ctx.fillRect(px - 60, py, 120, 18);
  }

  const ground = ctx.createLinearGradient(0, WORLD.floorY, 0, h);
  ground.addColorStop(0, '#150a26');
  ground.addColorStop(1, '#05030a');
  ctx.fillStyle = ground;
  ctx.fillRect(0, WORLD.floorY, w, h - WORLD.floorY);
  ctx.strokeStyle = '#b98bff55';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.floorY);
  ctx.lineTo(w, WORLD.floorY);
  ctx.stroke();
}

export const ARENAS = [
  {
    id: 'forge',
    name: 'THE FORGE',
    description: 'Eine gigantische industrielle Schmiede voller Feuer und Metall.',
    accent: '#ff7b00',
    ambientParticle: 'ember',
    drawBackground: drawForge,
  },
  {
    id: 'ruins',
    name: 'THE RUINS',
    description: 'Eine zerstörte antike Festung im Regen, erhellt von Fackeln.',
    accent: '#7fd8ff',
    ambientParticle: 'rain',
    drawBackground: drawRuins,
  },
  {
    id: 'void',
    name: 'THE VOID',
    description: 'Eine mystische Arena in einer dunklen Dimension.',
    accent: '#b98bff',
    ambientParticle: 'energy',
    drawBackground: drawVoid,
  },
];

export function getArena(id) {
  return ARENAS.find((a) => a.id === id) || ARENAS[0];
}
