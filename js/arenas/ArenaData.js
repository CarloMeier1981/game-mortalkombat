function loadArenaImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function drawImageCover(ctx, img, w, h, verticalBias) {
  if (!img.complete || img.naturalWidth === 0) return false;
  const ir = img.naturalWidth / img.naturalHeight;
  const cr = w / h;
  let sx, sy, sw, sh;
  if (ir > cr) {
    sh = img.naturalHeight;
    sw = sh * cr;
    sx = (img.naturalWidth - sw) / 2;
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = sw / cr;
    sx = 0;
    sy = (img.naturalHeight - sh) * verticalBias;
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return true;
}

function makeBackgroundDrawer(src, fallbackColor) {
  const img = loadArenaImage(src);
  return function draw(ctx, w, h) {
    const drew = drawImageCover(ctx, img, w, h, 0.65);
    if (!drew) {
      ctx.fillStyle = fallbackColor;
      ctx.fillRect(0, 0, w, h);
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.12)';
    ctx.fillRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
  };
}

export const ARENAS = [
  {
    id: 'chinatown',
    name: 'CHINATOWN',
    description: 'Eine regennasse Nachtstadt voller Laternen, Tempel und Drachenbanner.',
    accent: '#ff3b3b',
    ambientParticle: 'ember',
    drawBackground: makeBackgroundDrawer('backgrounds/background_chinatown.png', '#1a0f10'),
  },
  {
    id: 'beach',
    name: 'BEACH',
    description: 'Ein tropischer Sonnenuntergangsstrand zwischen Klippen und Brandung.',
    accent: '#ff9d4d',
    ambientParticle: 'mist',
    drawBackground: makeBackgroundDrawer('backgrounds/background_beach.png', '#1a1208'),
  },
  {
    id: 'futurecity',
    name: 'FUTURE CITY',
    description: 'Eine regenverhangene Cyberpunk-Skyline voller Neonlicht.',
    accent: '#38e0ff',
    ambientParticle: 'rain',
    drawBackground: makeBackgroundDrawer('backgrounds/background_futurecity.png', '#080a14'),
  },
  {
    id: 'blackmountains',
    name: 'BLACK MOUNTAINS',
    description: 'Ein nebelverhangenes Hochtal vor schroffen Gipfeln.',
    accent: '#8fae7d',
    ambientParticle: 'mist',
    drawBackground: makeBackgroundDrawer('backgrounds/background_blackmountains.png', '#0e1410'),
  },
];

export function getArena(id) {
  return ARENAS.find((a) => a.id === id) || ARENAS[0];
}
