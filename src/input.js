class InputHandler {
  constructor() {
    this.onInput = null;
    this.onPadStatus = null;
    this._active = false;
    this._padIndex = null;
    this._padPrevBtns = {};
    this._padRaf = null;
    this._boundKeydown = this._onKeydown.bind(this);
    this._boundPadOn  = this._onPadConnected.bind(this);
    this._boundPadOff = this._onPadDisconnected.bind(this);
  }

  start() {
    this._active = true;
    document.addEventListener('keydown', this._boundKeydown);
    window.addEventListener('gamepadconnected',    this._boundPadOn);
    window.addEventListener('gamepaddisconnected', this._boundPadOff);

    // Pick up already-connected gamepads (Chrome doesn't fire connected for pre-existing ones)
    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gps) {
      if (gp) {
        this._padIndex = gp.index;
        this._startPadLoop();
        if (this.onPadStatus) this.onPadStatus(true, gp.id);
        break;
      }
    }
  }

  stop() {
    this._active = false;
    document.removeEventListener('keydown', this._boundKeydown);
    window.removeEventListener('gamepadconnected',    this._boundPadOn);
    window.removeEventListener('gamepaddisconnected', this._boundPadOff);
    if (this._padRaf) { cancelAnimationFrame(this._padRaf); this._padRaf = null; }
  }

  _onKeydown(e) {
    if (!this._active) return;
    const slotId = KEY_TO_SLOT[e.code];
    if (slotId) {
      e.preventDefault();
      if (this.onInput) this.onInput(slotId);
    }
  }

  _onPadConnected(e) {
    this._padIndex = e.gamepad.index;
    this._padPrevBtns = {};
    this._startPadLoop();
    if (this.onPadStatus) this.onPadStatus(true, e.gamepad.id);
  }

  _onPadDisconnected(e) {
    if (e.gamepad.index !== this._padIndex) return;
    this._padIndex = null;
    if (this._padRaf) { cancelAnimationFrame(this._padRaf); this._padRaf = null; }
    if (this.onPadStatus) this.onPadStatus(false, null);
  }

  _startPadLoop() {
    if (this._padRaf) cancelAnimationFrame(this._padRaf);
    const ACTION_BTNS = [0, 1, 2, 3, 12, 13, 14, 15];
    const loop = () => {
      if (this._padIndex === null) return;
      const gps = navigator.getGamepads();
      const gp  = gps[this._padIndex];
      if (gp) {
        const l2 = gp.buttons[6] && gp.buttons[6].value > 0.5;
        const r2 = gp.buttons[7] && gp.buttons[7].value > 0.5;
        const trigger = l2 ? 6 : r2 ? 7 : null;

        for (const idx of ACTION_BTNS) {
          const btn     = gp.buttons[idx];
          const pressed = btn && btn.pressed;
          if (pressed && !this._padPrevBtns[idx]) {
            if (trigger !== null && this._active) {
              const slot = SLOT_DEFS.find(s => s.padTrigger === trigger && s.padBtn === idx);
              if (slot && this.onInput) this.onInput(slot.id);
            }
          }
          this._padPrevBtns[idx] = pressed;
        }
      }
      this._padRaf = requestAnimationFrame(loop);
    };
    this._padRaf = requestAnimationFrame(loop);
  }
}
