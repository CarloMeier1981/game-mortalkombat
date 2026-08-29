const ACTIONS = ['left', 'right', 'up', 'down', 'light', 'heavy', 'special', 'block', 'dodge', 'grab'];
const EDGE_ACTIONS = new Set(['light', 'heavy', 'special', 'dodge', 'grab', 'up']);

const KEYMAP_P1 = {
  KeyA: ['p1', 'left'], KeyD: ['p1', 'right'], KeyW: ['p1', 'up'], KeyS: ['p1', 'down'],
  KeyJ: ['p1', 'light'], KeyK: ['p1', 'heavy'], KeyL: ['p1', 'special'],
  KeyU: ['p1', 'block'], KeyI: ['p1', 'dodge'], KeyO: ['p1', 'grab'],
};
const KEYMAP_P2 = {
  ArrowLeft: ['p2', 'left'], ArrowRight: ['p2', 'right'], ArrowUp: ['p2', 'up'], ArrowDown: ['p2', 'down'],
  // Numpad (desktop) and letter keys (laptops without a numpad) both work for P2 attacks.
  Numpad1: ['p2', 'light'], Numpad2: ['p2', 'heavy'], Numpad3: ['p2', 'special'],
  Numpad0: ['p2', 'block'], NumpadEnter: ['p2', 'dodge'], NumpadDecimal: ['p2', 'grab'],
  KeyN: ['p2', 'light'], KeyM: ['p2', 'heavy'], KeyB: ['p2', 'special'],
  KeyV: ['p2', 'block'], KeyC: ['p2', 'dodge'], KeyX: ['p2', 'grab'],
};
const PAUSE_KEYS = new Set(['Escape', 'Enter']);

function freshState() {
  const s = {};
  for (const a of ACTIONS) s[a] = false;
  return s;
}

export class InputManager {
  constructor() {
    this.held = { p1: freshState(), p2: freshState() };
    this.touch = { p1: freshState(), p2: freshState() };
    this.gamepadHeld = { p1: freshState(), p2: freshState() };
    this.pressedEdge = { p1: new Set(), p2: new Set() };
    this.releasedSincePress = { p1: {}, p2: {} };
    for (const a of ACTIONS) {
      this.releasedSincePress.p1[a] = true;
      this.releasedSincePress.p2[a] = true;
    }
    this.pausePressed = false;
    this._pauseWasDown = false;
    this._consumed = { p1: new Set(), p2: new Set() };

    window.addEventListener('keydown', (e) => this._onKey(e, true));
    window.addEventListener('keyup', (e) => this._onKey(e, false));
    window.addEventListener('blur', () => this._resetAll());
  }

  _onKey(e, isDown) {
    const p1 = KEYMAP_P1[e.code];
    const p2 = KEYMAP_P2[e.code];
    if (p1) { this._setHeld('p1', p1[1], isDown); e.preventDefault(); }
    if (p2) { this._setHeld('p2', p2[1], isDown); e.preventDefault(); }
    if (PAUSE_KEYS.has(e.code)) {
      if (isDown && !this._pauseWasDown) this.pausePressed = true;
      this._pauseWasDown = isDown;
    }
  }

  _setHeld(player, action, isDown) {
    const wasDown = this.held[player][action];
    this.held[player][action] = isDown;
    if (isDown && !wasDown && EDGE_ACTIONS.has(action)) {
      this.pressedEdge[player].add(action);
    }
  }

  _resetAll() {
    this.held.p1 = freshState();
    this.held.p2 = freshState();
    this.touch.p1 = freshState();
    this.touch.p2 = freshState();
  }

  setTouch(player, action, isDown) {
    const wasDown = this.touch[player][action];
    this.touch[player][action] = isDown;
    if (isDown && !wasDown && EDGE_ACTIONS.has(action)) {
      this.pressedEdge[player].add(action);
    }
  }

  _pollGamepads() {
    if (!navigator.getGamepads) return;
    const pads = navigator.getGamepads();
    const mapping = [
      { player: 'p1', index: 0 },
      { player: 'p2', index: 1 },
    ];
    for (const { player, index } of mapping) {
      const pad = pads[index];
      const state = freshState();
      if (pad) {
        const [lx, ly] = [pad.axes[0] || 0, pad.axes[1] || 0];
        state.left = lx < -0.4 || !!pad.buttons[14]?.pressed;
        state.right = lx > 0.4 || !!pad.buttons[15]?.pressed;
        state.up = ly < -0.5 || !!pad.buttons[12]?.pressed;
        state.down = ly > 0.5 || !!pad.buttons[13]?.pressed;
        state.light = !!pad.buttons[0]?.pressed;
        state.heavy = !!pad.buttons[1]?.pressed;
        state.special = !!pad.buttons[3]?.pressed;
        state.block = !!pad.buttons[6]?.pressed || !!pad.buttons[4]?.pressed;
        state.dodge = !!pad.buttons[5]?.pressed;
        state.grab = !!pad.buttons[2]?.pressed;
        for (const a of EDGE_ACTIONS) {
          if (state[a] && !this.gamepadHeld[player][a]) this.pressedEdge[player].add(a);
        }
      }
      this.gamepadHeld[player] = state;
    }
  }

  update() {
    this._pollGamepads();
  }

  isDown(player, action) {
    return this.held[player][action] || this.touch[player][action] || this.gamepadHeld[player][action];
  }

  getIntent(player) {
    const intent = {};
    for (const a of ACTIONS) intent[a] = this.isDown(player, a);
    for (const a of this.pressedEdge[player]) {
      if (!this._consumed[player].has(a)) intent[a + 'Pressed'] = true;
    }
    return intent;
  }

  endFrame() {
    this.pressedEdge.p1.clear();
    this.pressedEdge.p2.clear();
    this._consumed.p1.clear();
    this._consumed.p2.clear();
    this.pausePressed = false;
  }

  isPausePressed() {
    return this.pausePressed;
  }
}
