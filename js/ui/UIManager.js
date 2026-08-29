import { CHARACTERS } from '../characters/CharacterData.js';
import { ARENAS } from '../arenas/ArenaData.js';

const SCREEN_IDS = [
  'menu', 'character-select', 'arena-select', 'settings', 'tutorial',
  'hud', 'pause', 'match-end',
];

export class UIManager {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('ui-root');
    this.screens = {};
    for (const id of SCREEN_IDS) this.screens[id] = document.getElementById('screen-' + id);
    this._cacheEls();
    this._wireEvents();
    this._bannerTimeout = null;
  }

  _cacheEls() {
    this.el = {
      charGrid: document.getElementById('char-grid'),
      charDetail: document.getElementById('char-detail'),
      detailPortrait: document.getElementById('char-detail-portrait'),
      detailName: document.getElementById('char-detail-name'),
      detailTitle: document.getElementById('char-detail-title'),
      detailDesc: document.getElementById('char-detail-desc'),
      statPower: document.getElementById('stat-power'),
      statSpeed: document.getElementById('stat-speed'),
      statDefense: document.getElementById('stat-defense'),
      charSpecial: document.getElementById('char-special'),
      selectStatus: document.getElementById('select-status'),
      confirmCharBtn: document.getElementById('btn-confirm-char'),
      arenaGrid: document.getElementById('arena-grid'),
      confirmArenaBtn: document.getElementById('btn-confirm-arena'),
      optMusic: document.getElementById('opt-music'),
      optSfx: document.getElementById('opt-sfx'),
      optVibration: document.getElementById('opt-vibration'),
      optQuality: document.getElementById('opt-quality'),
      optLanguage: document.getElementById('opt-language'),
      tutorialText: document.getElementById('tutorial-text'),
      tutorialProgress: document.getElementById('tutorial-progress'),
      tutorialNextBtn: document.getElementById('btn-tutorial-next'),
      hudNameP1: document.getElementById('hud-name-p1'),
      hudNameP2: document.getElementById('hud-name-p2'),
      healthP1: document.getElementById('health-p1'),
      healthP2: document.getElementById('health-p2'),
      specialP1: document.getElementById('special-p1'),
      specialP2: document.getElementById('special-p2'),
      roundPipsP1: document.getElementById('round-pips-p1'),
      roundPipsP2: document.getElementById('round-pips-p2'),
      timer: document.getElementById('hud-timer'),
      comboP1: document.getElementById('combo-p1'),
      comboP2: document.getElementById('combo-p2'),
      trainingStats: document.getElementById('training-stats'),
      centerBanner: document.getElementById('center-banner'),
      matchEndTitle: document.getElementById('match-end-title'),
      matchEndSub: document.getElementById('match-end-sub'),
      btnRematch: document.getElementById('btn-rematch'),
      btnNext: document.getElementById('btn-next'),
    };
  }

  _wireEvents() {
    document.body.addEventListener('click', (e) => this.game.audio.play('ui'));
    this.root.addEventListener('click', (e) => {
      const actionEl = e.target.closest('[data-action]');
      if (actionEl) this._handleAction(actionEl.dataset.action);
    });

    document.querySelectorAll('.menu-btn[data-action]').forEach((btn) => {
      const mode = btn.dataset.action;
      if (['quick', 'arcade', 'versus', 'training'].includes(mode)) {
        btn.addEventListener('click', () => this.game.startModeFlow(mode));
      }
    });
    document.querySelector('[data-action="tutorial"]').addEventListener('click', () => this.game.openTutorial());
    document.querySelector('[data-action="settings"]').addEventListener('click', () => this.game.openSettings());

    this.el.confirmCharBtn.addEventListener('click', () => this.game.confirmCharacterSelect());
    this.el.confirmArenaBtn.addEventListener('click', () => this.game.confirmArenaSelect());
    this.el.tutorialNextBtn.addEventListener('click', () => this.game.tutorialNext());

    this.el.optMusic.addEventListener('input', (e) => this.game.updateSetting('musicVolume', parseFloat(e.target.value)));
    this.el.optSfx.addEventListener('input', (e) => this.game.updateSetting('sfxVolume', parseFloat(e.target.value)));
    this.el.optVibration.addEventListener('change', (e) => this.game.updateSetting('vibration', e.target.checked));
    this.el.optQuality.addEventListener('change', (e) => this.game.updateSetting('quality', e.target.value));
    this.el.optLanguage.addEventListener('change', (e) => this.game.updateSetting('language', e.target.value));

    this.el.btnRematch.addEventListener('click', () => this.game.rematch());
    this.el.btnNext.addEventListener('click', () => this.game.nextArcadeOpponent());
  }

  _handleAction(action) {
    switch (action) {
      case 'back': this.game.goBack(); break;
      case 'pause': this.game.togglePause(); break;
      case 'resume': this.game.togglePause(); break;
      case 'restart': this.game.restartFight(); break;
      case 'quit': this.game.quitToMenu(); break;
      default: break;
    }
  }

  showScreen(name) {
    for (const id of SCREEN_IDS) {
      this.screens[id].classList.toggle('active', id === name);
    }
  }

  buildCharacterSelect(selection) {
    this.el.charGrid.innerHTML = '';
    CHARACTERS.forEach((c) => {
      const card = document.createElement('div');
      card.className = 'char-card';
      if (selection.p1 === c.id || selection.p2 === c.id) card.classList.add('selected');
      card.innerHTML = `<div class="char-swatch" style="background:linear-gradient(160deg, ${c.color.primary}, ${c.color.secondary})"></div><div class="char-card-name">${c.name}</div>`;
      card.addEventListener('click', () => this.game.pickCharacter(c.id));
      this.el.charGrid.appendChild(card);
    });
    this.updateCharacterDetail(selection);
  }

  updateCharacterDetail(selection) {
    const currentId = selection.slot === 'p2' ? selection.p2 : selection.p1;
    const c = CHARACTERS.find((ch) => ch.id === currentId);
    if (!c) {
      this.el.confirmCharBtn.disabled = true;
      this.el.selectStatus.textContent = selection.slot === 'p2' ? 'PLAYER 2: CHOOSE A FIGHTER' : 'PLAYER 1: CHOOSE A FIGHTER';
      this.el.detailPortrait.style.background = 'transparent';
      this.el.detailName.textContent = '—';
      this.el.detailTitle.textContent = '—';
      this.el.detailDesc.textContent = '—';
      this.el.statPower.style.width = '0';
      this.el.statSpeed.style.width = '0';
      this.el.statDefense.style.width = '0';
      this.el.charSpecial.textContent = '—';
      return;
    }
    this.el.detailPortrait.style.background = `linear-gradient(160deg, ${c.color.primary}, ${c.color.secondary})`;
    this.el.detailName.textContent = c.name;
    this.el.detailTitle.textContent = c.title;
    this.el.detailDesc.textContent = c.description;
    this.el.statPower.style.width = (c.stats.power * 10) + '%';
    this.el.statSpeed.style.width = (c.stats.speed * 10) + '%';
    this.el.statDefense.style.width = (c.stats.defense * 10) + '%';
    this.el.charSpecial.textContent = `${c.specialName} — ${c.specialDescription}`;
    this.el.confirmCharBtn.disabled = false;
    this.el.selectStatus.textContent = selection.slot === 'p2' ? 'PLAYER 2: CONFIRM?' : 'PLAYER 1: CONFIRM?';
  }

  buildArenaSelect(selection) {
    this.el.arenaGrid.innerHTML = '';
    ARENAS.forEach((a) => {
      const card = document.createElement('div');
      card.className = 'arena-card';
      if (selection.arena === a.id) card.classList.add('selected');
      card.innerHTML = `<div class="arena-thumb" style="background:radial-gradient(circle at 50% 30%, ${a.accent}44, #05040688)"></div><div class="arena-card-body"><div class="arena-card-name">${a.name}</div><div class="arena-card-desc">${a.description}</div></div>`;
      card.addEventListener('click', () => this.game.pickArena(a.id));
      this.el.arenaGrid.appendChild(card);
    });
    this.el.confirmArenaBtn.disabled = !selection.arena;
  }

  applySettingsToForm(settings) {
    this.el.optMusic.value = settings.musicVolume;
    this.el.optSfx.value = settings.sfxVolume;
    this.el.optVibration.checked = settings.vibration;
    this.el.optQuality.value = settings.quality;
    this.el.optLanguage.value = settings.language;
  }

  setTutorialStep(text, index, total) {
    this.el.tutorialText.textContent = text;
    this.el.tutorialProgress.textContent = `${index + 1} / ${total}`;
    this.el.tutorialNextBtn.textContent = index >= total - 1 ? 'FERTIG' : 'WEITER';
  }

  setupHUD(fighters, isTraining) {
    this.el.hudNameP1.textContent = fighters[0].name;
    this.el.hudNameP2.textContent = fighters[1].name;
    this.el.trainingStats.classList.toggle('show', !!isTraining);
    this.el.timer.textContent = isTraining ? '∞' : '60';
    this.el.comboP1.classList.remove('show');
    this.el.comboP2.classList.remove('show');
  }

  buildRoundPips(container, wins, total) {
    container.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const pip = document.createElement('div');
      if (i < wins) pip.classList.add('won');
      container.appendChild(pip);
    }
  }

  updateHUD({ fighters, timer, comboDisplays, trainingText }) {
    const [p1, p2] = fighters;
    this.el.healthP1.style.width = Math.max(0, (p1.health / p1.maxHealth) * 100) + '%';
    this.el.healthP2.style.width = Math.max(0, (p2.health / p2.maxHealth) * 100) + '%';
    this.el.specialP1.style.width = (p1.special / p1.maxSpecial) * 100 + '%';
    this.el.specialP2.style.width = (p2.special / p2.maxSpecial) * 100 + '%';
    if (timer !== null) this.el.timer.textContent = Math.ceil(timer);

    this._renderCombo(this.el.comboP1, comboDisplays[0]);
    this._renderCombo(this.el.comboP2, comboDisplays[1]);

    if (trainingText) {
      this.el.trainingStats.textContent = trainingText;
    }
  }

  _renderCombo(el, combo) {
    if (combo && combo.active && combo.count > 1) {
      el.classList.add('show');
      el.innerHTML = `COMBO x${combo.count}<span class="dmg">${combo.damage} DAMAGE</span>`;
    } else {
      el.classList.remove('show');
    }
  }

  showBanner(text, duration = 1000) {
    const el = this.el.centerBanner;
    el.textContent = text;
    el.classList.add('show');
    if (this._bannerTimeout) clearTimeout(this._bannerTimeout);
    if (duration > 0) {
      this._bannerTimeout = setTimeout(() => el.classList.remove('show'), duration);
    }
  }

  hideBanner() {
    this.el.centerBanner.classList.remove('show');
  }

  showMatchEnd(title, sub, showNext) {
    this.el.matchEndTitle.textContent = title;
    this.el.matchEndSub.textContent = sub;
    this.el.btnNext.style.display = showNext ? 'block' : 'none';
  }
}
