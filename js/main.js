import { Game } from './core/Game.js';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('service-worker.js').catch(() => { /* offline support is best-effort */ });
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const canvas3d = document.getElementById('game-canvas-3d');
  const touchRoot = document.getElementById('touch-root');
  const game = new Game(canvas, touchRoot, canvas3d);
  window.__game = game;
  game.init();
});
