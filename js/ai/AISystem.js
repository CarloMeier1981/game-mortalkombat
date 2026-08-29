const DIFFICULTY = {
  easy: { reaction: 40, jitter: 20, attackChance: 0.35, blockChance: 0.28, specialChance: 0.3, mistakeChance: 0.3, approachRange: 260, closeRange: 100 },
  normal: { reaction: 22, jitter: 12, attackChance: 0.55, blockChance: 0.5, specialChance: 0.5, mistakeChance: 0.12, approachRange: 270, closeRange: 100 },
  hard: { reaction: 10, jitter: 6, attackChance: 0.75, blockChance: 0.72, specialChance: 0.7, mistakeChance: 0.03, approachRange: 280, closeRange: 105 },
};

const LOCKED_STATES = new Set(['attack', 'hitstun', 'blockstun', 'dodge', 'grabbed', 'defeated', 'victory']);

function emptyIntent() {
  return { left: false, right: false, up: false, down: false, light: false, heavy: false, special: false, block: false, dodge: false, grab: false };
}

export class AISystem {
  constructor(difficulty = 'normal') {
    this.setDifficulty(difficulty);
    this.behavior = 'idle';
    this.stateTimer = 0;
    this.recentOpponentAttacks = [];
    this.recentOpponentBlocks = 0;
    this._lastOpponentState = null;
    this.time = 0;
  }

  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.params = DIFFICULTY[difficulty] || DIFFICULTY.normal;
  }

  _trackOpponent(opponent) {
    if (opponent.state === 'attack' && this._lastOpponentState !== 'attack') {
      this.recentOpponentAttacks.push(this.time);
    }
    if (opponent.state === 'block') this.recentOpponentBlocks += 0.02;
    else this.recentOpponentBlocks = Math.max(0, this.recentOpponentBlocks - 0.01);
    this._lastOpponentState = opponent.state;
    this.recentOpponentAttacks = this.recentOpponentAttacks.filter((t) => this.time - t < 3);
  }

  decide(self, opponent, dt) {
    this.time += dt;
    this._trackOpponent(opponent);

    if (LOCKED_STATES.has(self.state)) {
      return emptyIntent();
    }

    this.stateTimer -= dt * 60;
    const dx = opponent.x - self.x;
    const dist = Math.abs(dx);
    const dir = dx >= 0 ? 1 : -1;
    const p = this.params;
    const aggression = 1 - opponent.health / opponent.maxHealth;
    const opponentThreat = opponent.state === 'attack' && opponent.attackPhase !== 'recovery';

    if (opponentThreat && this.stateTimer <= 0) {
      this.behavior = Math.random() < p.blockChance + aggression * 0.1 ? 'block' : (Math.random() < 0.35 ? 'dodge' : 'block');
      this.stateTimer = 6 + Math.random() * 6;
    } else if (this.stateTimer <= 0) {
      if (dist > p.approachRange) {
        this.behavior = self.attacksDef.special.projectile && self.special >= self.maxSpecial && Math.random() < p.specialChance
          ? 'special' : 'approach';
      } else if (dist < p.closeRange) {
        const wantsGrab = this.recentOpponentBlocks > 0.5 && Math.random() < 0.4;
        if (wantsGrab) this.behavior = 'grab';
        else if (Math.random() < p.attackChance + aggression * 0.15) this.behavior = Math.random() < 0.35 ? 'heavy' : 'light';
        else this.behavior = Math.random() < 0.25 ? 'retreat' : 'approach';
      } else {
        this.behavior = Math.random() < 0.12 ? 'jump' : 'approach';
      }
      if (Math.random() < p.mistakeChance) {
        const pool = ['approach', 'retreat', 'block', 'light'];
        this.behavior = pool[Math.floor(Math.random() * pool.length)];
      }
      this.stateTimer = p.reaction + Math.random() * p.jitter;
    }

    const intent = emptyIntent();
    switch (this.behavior) {
      case 'approach':
        if (dir > 0) intent.right = true; else intent.left = true;
        break;
      case 'retreat':
        if (dir > 0) intent.left = true; else intent.right = true;
        break;
      case 'block':
        intent.block = true;
        break;
      case 'dodge':
        intent.dodgePressed = true;
        if (dir > 0) intent.left = true; else intent.right = true;
        this.behavior = 'idle';
        break;
      case 'light':
        intent.lightPressed = true;
        this.behavior = 'idle';
        break;
      case 'heavy':
        intent.heavyPressed = true;
        this.behavior = 'idle';
        break;
      case 'grab':
        intent.grabPressed = true;
        this.behavior = 'idle';
        break;
      case 'special':
        intent.specialPressed = true;
        this.behavior = 'idle';
        break;
      case 'jump':
        intent.upPressed = true;
        this.behavior = 'idle';
        break;
      default:
        break;
    }
    return intent;
  }
}
