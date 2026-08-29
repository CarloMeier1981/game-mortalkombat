import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const canvas3d = document.getElementById('game-canvas-3d');
  const touchRoot = document.getElementById('touch-root');
  const game = new Game(canvas, touchRoot, canvas3d);
  window.__game = game;
  game.init();
});
