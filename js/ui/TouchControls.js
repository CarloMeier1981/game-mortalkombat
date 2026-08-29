const BUTTONS = [
  { cluster: 'dpad', cls: 'dpad-left', label: '◀', action: 'left' },
  { cluster: 'dpad', cls: 'dpad-right', label: '▶', action: 'right' },
  { cluster: 'dpad', cls: 'dpad-up', label: '▲', action: 'up' },
  { cluster: 'dpad', cls: 'dpad-down', label: '▼', action: 'down' },
  { cluster: 'actions', cls: 'act-light', label: '●', action: 'light' },
  { cluster: 'actions', cls: 'act-heavy', label: '◆', action: 'heavy' },
  { cluster: 'actions', cls: 'act-block', label: '■', action: 'block' },
  { cluster: 'actions', cls: 'act-special', label: '★', action: 'special' },
  { cluster: 'actions', cls: 'act-dodge', label: '⤸', action: 'dodge' },
  { cluster: 'actions', cls: 'act-grab', label: 'GRAB', action: 'grab' },
];

export class TouchControls {
  constructor(container, inputManager) {
    this.container = container;
    this.input = inputManager;
    this._build();
  }

  _build() {
    const left = document.createElement('div');
    left.className = 'touch-side left';
    const dpad = document.createElement('div');
    dpad.className = 'touch-dpad';
    left.appendChild(dpad);

    const right = document.createElement('div');
    right.className = 'touch-side right';
    const actions = document.createElement('div');
    actions.className = 'touch-actions';
    right.appendChild(actions);

    for (const b of BUTTONS) {
      const btn = document.createElement('div');
      btn.className = `touch-btn ${b.cls}`;
      btn.textContent = b.label;
      this._bind(btn, b.action);
      (b.cluster === 'dpad' ? dpad : actions).appendChild(btn);
    }

    this.container.appendChild(left);
    this.container.appendChild(right);
  }

  _bind(el, action) {
    const setState = (isDown) => {
      el.classList.toggle('active-touch', isDown);
      this.input.setTouch('p1', action, isDown);
    };
    el.addEventListener('pointerdown', (e) => { e.preventDefault(); el.setPointerCapture(e.pointerId); setState(true); }, { passive: false });
    el.addEventListener('pointerup', (e) => { e.preventDefault(); setState(false); }, { passive: false });
    el.addEventListener('pointercancel', () => setState(false));
    el.addEventListener('pointerleave', () => setState(false));
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  show() {
    this.container.classList.add('active');
  }

  hide() {
    this.container.classList.remove('active');
    for (const b of BUTTONS) this.input.setTouch('p1', b.action, false);
  }
}
