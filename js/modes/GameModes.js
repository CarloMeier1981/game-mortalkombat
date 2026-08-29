import { CHARACTERS } from '../characters/CharacterData.js';
import { ARENAS } from '../arenas/ArenaData.js';

export const Modes = Object.freeze({
  QUICK: 'quick',
  ARCADE: 'arcade',
  VERSUS: 'versus',
  TRAINING: 'training',
});

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getArcadeLadder(playerCharId) {
  const opponents = shuffle(CHARACTERS.filter((c) => c.id !== playerCharId).map((c) => c.id));
  const arenas = shuffle(ARENAS.map((a) => a.id));
  const difficulties = ['easy', 'normal', 'hard'];
  return opponents.map((id, i) => ({
    opponentId: id,
    arenaId: arenas[i % arenas.length],
    difficulty: difficulties[Math.min(i, difficulties.length - 1)],
  }));
}

export function randomOpponent(excludeId) {
  const pool = CHARACTERS.filter((c) => c.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

export function randomArena() {
  return ARENAS[Math.floor(Math.random() * ARENAS.length)].id;
}
