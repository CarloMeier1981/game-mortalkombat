import { Game } from './core/Game.js';

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  const touchRoot = document.getElementById('touch-root');
  const game = new Game(canvas, touchRoot);
  window.__game = game;
  game.init();
});
