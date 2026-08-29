import { GameStates } from './GameState.js';
import { Storage, DEFAULT_SETTINGS } from './Storage.js';
import { InputManager } from './InputManager.js';
import { AudioManager } from './AudioManager.js';
import { Renderer } from './Renderer.js';
import { Renderer3D } from './Renderer3D.js';
import { WORLD } from './World.js';
import { getCharacter, CHARACTERS } from '../characters/CharacterData.js';
import { Fighter } from '../characters/Fighter.js';
import { preloadSkeletal } from '../characters/SkeletalRig3D.js';
import { CombatSystem } from '../combat/CombatSystem.js';
import { ComboSystem } from '../combat/ComboSystem.js';
import { AISystem } from '../ai/AISystem.js';
import { getArena } from '../arenas/ArenaData.js';
import { ParticleSystem } from '../fx/ParticleSystem.js';
import { CameraFX } from '../fx/CameraFX.js';
import { UIManager } from '../ui/UIManager.js';
import { TouchControls } from '../ui/TouchControls.js';
import { Modes, getArcadeLadder, randomOpponent, randomArena } from '../modes/GameModes.js';

const ROUND_TIME = 60;
const ROUNDS_TO_WIN = 2;
const SOUND_FOR_TYPE = { light: 'light', heavy: 'heavy', special: 'special', grab: 'grab' };

const TUTORIAL_STEPS = [
  'BEWEGUNG: Nutze ◀ / ▶ (oder A/D), um dich in der Arena zu bewegen.',
  'SPRUNG & DUCKEN: ▲ (W) zum Springen, ▼ (S) zum Ducken unter hohen Angriffen.',
  'ANGRIFF: ● für leichte, ◆ für schwere Angriffe. Kombiniere sie zu Combos!',
  'BLOCK: Halte ■ gedrückt, um Schaden zu reduzieren. Grabs (Wurf) durchbrechen Blocks!',
  'SPEZIALANGRIFF: Ist die ★-Leiste voll, löst ★ eine verheerende Spezialfähigkeit aus.',
  'COMBOS: Treffer in kurzem Abstand zählen als Combo — mehr Treffer, mehr Schaden!',
  'SIEG: Wer zuerst 2 Runden gewinnt, gewinnt den Kampf. Reduziere die Lebensenergie deines Gegners auf 0!',
];

export class Game {
  constructor(canvas, touchRoot, canvas3d) {
    this.canvas = canvas;
    this.touchRoot = touchRoot;
    this.settings = { ...DEFAULT_SETTINGS, ...Storage.loadSettings() };
    this.progress = Storage.loadProgress();

    this.renderer = new Renderer(canvas);
    this.renderer3d = new Renderer3D(canvas3d);
    this.input = new InputManager();
    this.audio = new AudioManager();
    this.particles = new ParticleSystem();
    this.cameraFX = new CameraFX();
    this.combat = new CombatSystem((type, data) => this._onCombatEvent(type, data));
    this.ui = new UIManager(this);
    this.touchControls = new TouchControls(this.touchRoot, this.input);

    this.audio.setMusicVolume(this.settings.musicVolume);
    this.audio.setSfxVolume(this.settings.sfxVolume);

    this.state = GameStates.BOOT;
    this.selection = { mode: null, slot: 'p1', p1: null, p2: null, arena: null };
    this.fighters = null;
    this.projectiles = [];
    this.arcade = null;
    this.isTraining = false;
    this.roundWins = [0, 0];
    this.currentRound = 1;
    this.roundTimer = ROUND_TIME;
    this._roundEndTimer = 0;
    this._pendingWinner = null;
    this._lastKO = false;
    this.phaseTimer = 0;
    this.phaseCallback = null;
    this._time = 0;
    this.tutorialIndex = 0;
    this.trainingStats = { damage: 0, hits: 0, elapsed: 0 };
    this.currentArena = null;
    this.menuArena = getArena('blackmountains');
    this.previousState = GameStates.MENU;

    window.addEventListener('resize', () => this._syncRenderers());
    window.addEventListener('blur', () => {
      if (this.state === GameStates.FIGHT || this.state === GameStates.TRAINING) this.togglePause();
    });
    const unlock = () => { this.audio.unlock(); window.removeEventListener('pointerdown', unlock); };
    window.addEventListener('pointerdown', unlock);

    this._syncRenderers();

    for (const c of CHARACTERS) {
      if (c.rigKind === 'skeletal') preloadSkeletal(c.model3d);
    }
  }

  _syncRenderers() {
    this.renderer.resize();
    const r = this.renderer;
    this.renderer3d.resize(r.cw, r.ch, r.dpr, r.scale, r.offsetX, r.offsetY);
  }

  init() {
    this.state = GameStates.MENU;
    this.ui.showScreen('menu');
    requestAnimationFrame((t) => this._loop(t));
  }

  _loop(now) {
    if (!this._lastTime) this._lastTime = now;
    let deltaMs = now - this._lastTime;
    this._lastTime = now;
    if (deltaMs > 250) deltaMs = 250;
    this._accumulator = (this._accumulator || 0) + deltaMs / 1000;
    const STEP = 1 / 60;
    while (this._accumulator >= STEP) {
      this._tick(STEP);
      this._accumulator -= STEP;
    }
    this._render();
    requestAnimationFrame((t) => this._loop(t));
  }

  _tick(dt) {
    this.input.update();

    if ([GameStates.FIGHT, GameStates.TRAINING, GameStates.PAUSED].includes(this.state) && this.input.isPausePressed()) {
      this.togglePause();
    }

    if (this.state === GameStates.PAUSED) {
      this.input.endFrame();
      return;
    }

    this._time += dt;

    if (this.phaseTimer > 0) {
      this.phaseTimer -= 1;
      if (this.phaseTimer <= 0) {
        const fn = this.phaseCallback;
        this.phaseCallback = null;
        if (fn) fn();
      }
    }

    if (this.state === GameStates.FIGHT || this.state === GameStates.TRAINING) {
      this._updateFight(dt);
    } else {
      this.cameraFX.update(dt);
      this.particles.ambient(this.currentArena ? this.currentArena.id : 'blackmountains', dt);
      this.particles.update(dt);
    }

    this.input.endFrame();
  }

  _updateFight(dt) {
    const wasFrozen = this.cameraFX.hitStopFrames > 0;
    this.cameraFX.update(dt);
    this.particles.ambient(this.currentArena.id, dt);
    this.particles.update(dt);
    if (wasFrozen) return;

    const ending = this._roundEndTimer > 0;
    const intentP1 = ending ? {} : this.input.getIntent('p1');
    let intentP2 = {};
    if (!ending) {
      if (this.selection.mode === Modes.VERSUS) intentP2 = this.input.getIntent('p2');
      else if (this.isTraining) intentP2 = {};
      else intentP2 = this.ai.decide(this.fighters[1], this.fighters[0], dt);
    }

    this.fighters[0].handleInput(intentP1);
    this.fighters[1].handleInput(intentP2);
    this.combat.update(dt, this.fighters, this.projectiles);

    if (!ending && !this.isTraining) {
      this.roundTimer -= dt;
      if (this.roundTimer <= 0) { this.roundTimer = 0; this._onTimeOut(); }
    }
    if (this.isTraining) this._trainingTick(dt);

    if (this._roundEndTimer > 0) {
      this._roundEndTimer -= 1;
      if (this._roundEndTimer <= 0) this._finishRound(this._pendingWinner);
    }
  }

  _trainingTick(dt) {
    for (const f of this.fighters) {
      if (f.health <= 0) {
        f.health = 1;
        if (f.state === 'defeated') { f.state = 'hitstun'; f.hitstunTimer = 20; }
      } else if (f.comboTimer <= 0 && f.health < f.maxHealth) {
        f.health = Math.min(f.maxHealth, f.health + f.maxHealth * 0.01);
      }
    }
    this.trainingStats.elapsed += dt;
  }

  _onCombatEvent(type, data) {
    switch (type) {
      case 'hit': {
        this.audio.play(SOUND_FOR_TYPE[data.attackType] || 'hit');
        const heavy = data.attackType === 'heavy' || data.attackType === 'special' || data.attackType === 'grab';
        this.particles.emit('spark', data.x, data.y, { count: heavy ? 22 : 10, color: '#ffcf6b' });
        this.particles.emit('impact', data.x, data.y, { count: 6 });
        this.cameraFX.trigger(data.attackType === 'special' ? 'special' : heavy ? 'heavy' : 'light');
        if (this.settings.vibration && navigator.vibrate) navigator.vibrate(heavy ? 40 : 15);
        if (this.isTraining && data.attackerIndex === 0) {
          this.trainingStats.damage += data.damage;
          this.trainingStats.hits += 1;
        }
        break;
      }
      case 'block':
        this.audio.play('block');
        this.particles.emit('impact', data.x, data.y, { count: 5, color: '#7fd8ff' });
        this.cameraFX.trigger('light');
        break;
      case 'special':
        this.audio.play('special');
        break;
      case 'jump':
        this.audio.play('jump');
        break;
      case 'land':
        this.audio.play('land');
        break;
      case 'dash':
        this.audio.play('dash');
        break;
      case 'ko':
        if (this.isTraining) return;
        this.audio.play('ko');
        this.cameraFX.trigger('ko');
        this.particles.emit('spark', data.x, data.y, { count: 40, color: '#ff6b3d' });
        if (this._roundEndTimer <= 0) {
          const loserIdx = data.loserIndex;
          const otherIdx = loserIdx === 0 ? 1 : 0;
          this._pendingWinner = this.fighters[otherIdx].health <= 0 ? null : otherIdx;
          this._lastKO = true;
          this._roundEndTimer = 50;
        }
        break;
      default:
        break;
    }
  }

  _onTimeOut() {
    if (this._roundEndTimer > 0) return;
    const [p1, p2] = this.fighters;
    this._pendingWinner = p1.health === p2.health ? null : (p1.health > p2.health ? 0 : 1);
    this._lastKO = false;
    this._roundEndTimer = 30;
    this.ui.showBanner('TIME UP', 1200);
  }

  _render() {
    if (this.fighters) {
      this.renderer.renderFight({
        arena: this.currentArena,
        time: this._time,
        projectiles: this.projectiles,
        particles: this.particles,
        shake: this.cameraFX.getShakeOffset(),
      });
      this.renderer3d.renderFighters(this.fighters);
    } else {
      this.renderer.renderIdleBackground(this.menuArena, this._time);
      this.renderer3d.renderer.clear();
    }

    if (this.state === GameStates.FIGHT || this.state === GameStates.TRAINING) {
      const dps = this.trainingStats.elapsed > 0.3 ? (this.trainingStats.damage / this.trainingStats.elapsed).toFixed(1) : '0.0';
      this.ui.updateHUD({
        fighters: this.fighters,
        timer: this.isTraining ? null : this.roundTimer,
        comboDisplays: [ComboSystem.getDisplay(this.fighters[0]), ComboSystem.getDisplay(this.fighters[1])],
        trainingText: this.isTraining
          ? `TREFFER: ${this.trainingStats.hits}  |  SCHADEN: ${Math.round(this.trainingStats.damage)}  |  DPS: ${dps}  |  COMBO: ${this.fighters[0].comboCount}`
          : null,
      });
    }
  }

  schedulePhase(ticks, fn) {
    this.phaseTimer = ticks;
    this.phaseCallback = fn;
  }

  // ---------- Navigation ----------

  startModeFlow(modeKey) {
    this.selection = { mode: modeKey, slot: 'p1', p1: null, p2: null, arena: null };
    this.isTraining = modeKey === Modes.TRAINING;
    this.state = GameStates.CHARACTER_SELECT;
    this.ui.buildCharacterSelect(this.selection);
    this.ui.showScreen('character-select');
  }

  pickCharacter(id) {
    if (this.selection.slot === 'p2') this.selection.p2 = id;
    else this.selection.p1 = id;
    this.ui.buildCharacterSelect(this.selection);
  }

  confirmCharacterSelect() {
    const sel = this.selection;
    if (!sel.p1) return;
    if (sel.mode === Modes.VERSUS && sel.slot === 'p1') {
      sel.slot = 'p2';
      this.ui.buildCharacterSelect(sel);
      return;
    }
    if (sel.mode === Modes.VERSUS && !sel.p2) return;

    if (sel.mode === Modes.QUICK || sel.mode === Modes.TRAINING) {
      sel.p2 = randomOpponent(sel.p1);
    }
    if (sel.mode === Modes.ARCADE) {
      this.arcade = { ladder: getArcadeLadder(sel.p1), index: 0 };
      sel.p2 = this.arcade.ladder[0].opponentId;
      sel.arena = this.arcade.ladder[0].arenaId;
      this._beginMatch();
      return;
    }

    this.state = GameStates.ARENA_SELECT;
    this.ui.buildArenaSelect(sel);
    this.ui.showScreen('arena-select');
  }

  pickArena(id) {
    this.selection.arena = id;
    this.ui.buildArenaSelect(this.selection);
  }

  confirmArenaSelect() {
    if (!this.selection.arena) return;
    this._beginMatch();
  }

  goBack() {
    if (this.state === GameStates.CHARACTER_SELECT) {
      if (this.selection.mode === Modes.VERSUS && this.selection.slot === 'p2') {
        this.selection.slot = 'p1';
        this.selection.p2 = null;
        this.ui.buildCharacterSelect(this.selection);
        return;
      }
      this.quitToMenu();
    } else if (this.state === GameStates.ARENA_SELECT) {
      this.state = GameStates.CHARACTER_SELECT;
      this.selection.slot = this.selection.mode === Modes.VERSUS ? 'p2' : 'p1';
      this.ui.buildCharacterSelect(this.selection);
      this.ui.showScreen('character-select');
    } else {
      this.quitToMenu();
    }
  }

  openTutorial() {
    this.state = GameStates.TUTORIAL;
    this.tutorialIndex = 0;
    this.ui.setTutorialStep(TUTORIAL_STEPS[0], 0, TUTORIAL_STEPS.length);
    this.ui.showScreen('tutorial');
  }

  tutorialNext() {
    this.tutorialIndex += 1;
    if (this.tutorialIndex >= TUTORIAL_STEPS.length) {
      this.quitToMenu();
      return;
    }
    this.ui.setTutorialStep(TUTORIAL_STEPS[this.tutorialIndex], this.tutorialIndex, TUTORIAL_STEPS.length);
  }

  openSettings() {
    this.state = GameStates.SETTINGS;
    this.ui.applySettingsToForm(this.settings);
    this.ui.showScreen('settings');
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    Storage.saveSettings(this.settings);
    if (key === 'musicVolume') this.audio.setMusicVolume(value);
    if (key === 'sfxVolume') this.audio.setSfxVolume(value);
  }

  // ---------- Match flow ----------

  _beginMatch() {
    const sel = this.selection;
    const p1Char = getCharacter(sel.p1);
    const p2Char = getCharacter(sel.p2);
    this.currentArena = getArena(sel.arena || randomArena());
    this.renderer3d.clearFighters();
    this.renderer3d.setArenaTint(this.currentArena.accent);
    this.fighters = [
      new Fighter(p1Char, 0, 340, 1),
      new Fighter(p2Char, 1, WORLD.width - 340, -1),
    ];
    this.projectiles = [];
    this.roundWins = [0, 0];
    this.currentRound = 1;
    this.trainingStats = { damage: 0, hits: 0, elapsed: 0 };

    if (sel.mode !== Modes.VERSUS && !this.isTraining) {
      const difficulty = this.arcade ? this.arcade.ladder[this.arcade.index].difficulty : 'normal';
      this.ai = new AISystem(difficulty);
    }

    this.ui.setupHUD(this.fighters, this.isTraining);
    this.touchControls.show();
    this.audio.playMusicForArena(this.currentArena.id);
    this._startCountdownSequence();
  }

  _startCountdownSequence() {
    this.fighters[0].reset(340, 1);
    this.fighters[1].reset(WORLD.width - 340, -1);
    this.projectiles = [];
    this._roundEndTimer = 0;
    this._pendingWinner = null;
    this.state = GameStates.COUNTDOWN;
    this.ui.showScreen('hud');
    this.ui.buildRoundPips(this.ui.el.roundPipsP1, this.roundWins[0], ROUNDS_TO_WIN);
    this.ui.buildRoundPips(this.ui.el.roundPipsP2, this.roundWins[1], ROUNDS_TO_WIN);
    this.ui.showBanner(this.isTraining ? 'TRAINING' : `ROUND ${this.currentRound}`, 900);
    this.schedulePhase(54, () => {
      this.ui.showBanner('FIGHT!', 450);
      this.audio.play('ui');
      this.schedulePhase(28, () => {
        this.ui.hideBanner();
        this.roundTimer = ROUND_TIME;
        this.state = this.isTraining ? GameStates.TRAINING : GameStates.FIGHT;
      });
    });
  }

  _finishRound(winnerIdx) {
    this.state = GameStates.ROUND_END;
    if (winnerIdx !== null) this.roundWins[winnerIdx] += 1;
    this.ui.buildRoundPips(this.ui.el.roundPipsP1, this.roundWins[0], ROUNDS_TO_WIN);
    this.ui.buildRoundPips(this.ui.el.roundPipsP2, this.roundWins[1], ROUNDS_TO_WIN);

    const matchDeciding = winnerIdx !== null && this.roundWins[winnerIdx] >= ROUNDS_TO_WIN;

    if (matchDeciding && this._lastKO) {
      const winner = this.fighters[winnerIdx];
      this.particles.emit('spark', this.fighters[1 - winnerIdx].x, this.fighters[1 - winnerIdx].y - 100, { count: 80, color: winner.color.accent, life: 1.2 });
      this.cameraFX.trigger('special');
      this.audio.play('special');
      this.ui.showBanner(`${winner.name}: ${winner.charData.specialName}!`, 1800);
      this.schedulePhase(108, () => this._afterRoundBanner(winnerIdx, matchDeciding));
      return;
    }

    const text = winnerIdx === null ? 'DRAW' : `${this.fighters[winnerIdx].name} WINS ROUND`;
    this.ui.showBanner(text, 1300);
    this.audio.play(winnerIdx === 0 ? 'victory' : winnerIdx === 1 ? 'defeat' : 'ui');
    this.schedulePhase(80, () => this._afterRoundBanner(winnerIdx, matchDeciding));
  }

  _afterRoundBanner(winnerIdx, matchDeciding) {
    this.ui.hideBanner();
    if (matchDeciding) this._finishMatch(winnerIdx);
    else {
      this.currentRound += 1;
      this._startCountdownSequence();
    }
  }

  _finishMatch(winnerIdx) {
    this.state = GameStates.MATCH_END;
    this.audio.stopMusic();
    const isVersus = this.selection.mode === Modes.VERSUS;
    const isArcade = this.selection.mode === Modes.ARCADE;
    const p1Won = winnerIdx === 0;

    let title = isVersus ? `PLAYER ${winnerIdx + 1} WINS` : (p1Won ? 'VICTORY' : 'DEFEAT');
    const sub = `${this.fighters[0].name} ${this.roundWins[0]} : ${this.roundWins[1]} ${this.fighters[1].name}`;
    let showNext = false;

    if (isArcade) {
      if (p1Won) {
        this.arcade.index += 1;
        if (this.arcade.index >= this.arcade.ladder.length) {
          title = 'ARCADE CLEARED!';
          this.progress.arcadeCleared = true;
          this.progress.arcadeBestStreak = Math.max(this.progress.arcadeBestStreak, this.arcade.ladder.length);
          showNext = false;
        } else {
          this.progress.arcadeBestStreak = Math.max(this.progress.arcadeBestStreak, this.arcade.index);
          showNext = true;
        }
      } else {
        this.progress.arcadeBestStreak = Math.max(this.progress.arcadeBestStreak, this.arcade.index);
      }
      Storage.saveProgress(this.progress);
    }

    this.ui.showMatchEnd(title, sub, showNext);
    this.ui.showScreen('match-end');
    this.touchControls.hide();
  }

  rematch() {
    this.touchControls.show();
    this._beginMatch();
  }

  nextArcadeOpponent() {
    const stage = this.arcade.ladder[this.arcade.index];
    this.selection.p2 = stage.opponentId;
    this.selection.arena = stage.arenaId;
    this.touchControls.show();
    this._beginMatch();
  }

  togglePause() {
    if (this.state === GameStates.PAUSED) {
      this.state = this.previousState;
      this.ui.showScreen('hud');
    } else if (this.state === GameStates.FIGHT || this.state === GameStates.TRAINING) {
      this.previousState = this.state;
      this.state = GameStates.PAUSED;
      this.ui.showScreen('pause');
    }
  }

  restartFight() {
    this.ui.showScreen('hud');
    this._beginMatch();
  }

  quitToMenu() {
    this.audio.stopMusic();
    this.touchControls.hide();
    this.fighters = null;
    this.currentArena = null;
    this.state = GameStates.MENU;
    this.ui.showScreen('menu');
  }
}
