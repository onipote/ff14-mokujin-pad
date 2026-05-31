class InputHandler {
  constructor() {
    this.onInput         = null;
    this.onPadStatus     = null;
    this.onStickUpdate   = null;
    this.onSystemButton  = null; // OPTIONS/Start button
    this.onTriggerChange = null; // called with 'L' | 'R' | null when trigger state changes
    this.stickL = { x: 0, y: 0 };
    this.stickR = { x: 0, y: 0 };

    this._active      = false;
    this._padIndex    = null;
    this._padPrevBtns = {};
    this._padRaf      = null;
    this._keysHeld    = {};
    this.triggerSide  = null;

    this._boundKeydown = this._onKeydown.bind(this);
    this._boundKeyup   = this._onKeyup.bind(this);
    this._boundPadOn   = this._onPadConnected.bind(this);
    this._boundPadOff  = this._onPadDisconnected.bind(this);
  }

  start() {
    this._active = true;
    this._keysHeld = {};

    document.addEventListener('keydown', this._boundKeydown);
    document.addEventListener('keyup',   this._boundKeyup);
    window.addEventListener('gamepadconnected',    this._boundPadOn);
    window.addEventListener('gamepaddisconnected', this._boundPadOff);

    const gps = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const gp of gps) {
      if (gp) {
        this._padIndex = gp.index;
        // Pre-populate prev state to avoid spurious triggers from held buttons
        for (let i = 0; i < gp.buttons.length; i++) {
          this._padPrevBtns[i] = !!(gp.buttons[i] && gp.buttons[i].pressed);
        }
        if (this.onPadStatus) this.onPadStatus(true, gp.id);
        break;
      }
    }

    this._startMainLoop();
  }

  stop() {
    this._active = false;
    document.removeEventListener('keydown', this._boundKeydown);
    document.removeEventListener('keyup',   this._boundKeyup);
    window.removeEventListener('gamepadconnected',    this._boundPadOn);
    window.removeEventListener('gamepaddisconnected', this._boundPadOff);
    if (this._padRaf) { cancelAnimationFrame(this._padRaf); this._padRaf = null; }
    this._keysHeld   = {};
    this.triggerSide = null;
  }

  _onKeydown(e) {
    if (!this._active) return;
    this._keysHeld[e.code] = true;
    if (e.repeat) return; // key-repeat は XHB 入力に使わない
    const slotId = KEY_TO_SLOT[e.code];
    if (slotId) {
      e.preventDefault();
      if (this.onInput) this.onInput(slotId);
    }
  }

  _onKeyup(e) {
    delete this._keysHeld[e.code];
  }

  _onPadConnected(e) {
    this._padIndex    = e.gamepad.index;
    this._padPrevBtns = {};
    if (this.onPadStatus) this.onPadStatus(true, e.gamepad.id);
  }

  _onPadDisconnected(e) {
    if (e.gamepad.index !== this._padIndex) return;
    this._padIndex = null;
    if (this.onPadStatus) this.onPadStatus(false, null);
  }

  _startMainLoop() {
    if (this._padRaf) cancelAnimationFrame(this._padRaf);
    const ACTION_BTNS = [0, 1, 2, 3, 12, 13, 14, 15];
    let prevTime = performance.now();
    let prevTriggerSide = null;

    const loop = (now) => {
      if (!this._active) return;
      const dt = Math.min((now - prevTime) / 1000, 0.05);
      prevTime = now;

      // キーボードによるカーソル移動
      let lx = 0, ly = 0, rx = 0, ry = 0;
      if (this._keysHeld['KeyA'])       lx -= 1;
      if (this._keysHeld['KeyD'])       lx += 1;
      if (this._keysHeld['KeyW'])       ly -= 1;
      if (this._keysHeld['KeyS'])       ly += 1;
      if (this._keysHeld['ArrowLeft'])  rx -= 1;
      if (this._keysHeld['ArrowRight']) rx += 1;
      if (this._keysHeld['ArrowUp'])    ry -= 1;
      if (this._keysHeld['ArrowDown'])  ry += 1;

      const llen = Math.sqrt(lx * lx + ly * ly);
      if (llen > 0) { lx /= llen; ly /= llen; }
      const rlen = Math.sqrt(rx * rx + ry * ry);
      if (rlen > 0) { rx /= rlen; ry /= rlen; }

      this.stickL.x = Math.max(-1, Math.min(1, this.stickL.x + lx * STICK_SPEED_L * dt));
      this.stickL.y = Math.max(-1, Math.min(1, this.stickL.y + ly * STICK_SPEED_L * dt));
      this.stickR.x = Math.max(-1, Math.min(1, this.stickR.x + rx * STICK_SPEED_R * dt));
      this.stickR.y = Math.max(-1, Math.min(1, this.stickR.y + ry * STICK_SPEED_R * dt));

      // ゲームパッド: スティック軸 + ボタン
      if (this._padIndex !== null) {
        const gps = navigator.getGamepads();
        const gp  = gps[this._padIndex];
        if (gp) {
          // スティック軸: キーボードと同じ速度ベース移動（倒している間だけ動く、離したら停止）
          const lax = Math.abs(gp.axes[0] ?? 0) > STICK_DEADZONE ? (gp.axes[0] ?? 0) : 0;
          const lay = Math.abs(gp.axes[1] ?? 0) > STICK_DEADZONE ? (gp.axes[1] ?? 0) : 0;
          const rax = Math.abs(gp.axes[2] ?? 0) > STICK_DEADZONE ? (gp.axes[2] ?? 0) : 0;
          const ray = Math.abs(gp.axes[3] ?? 0) > STICK_DEADZONE ? (gp.axes[3] ?? 0) : 0;

          if (lax !== 0 || lay !== 0) {
            this.stickL.x = Math.max(-1, Math.min(1, this.stickL.x + lax * STICK_SPEED_L * dt));
            this.stickL.y = Math.max(-1, Math.min(1, this.stickL.y + lay * STICK_SPEED_L * dt));
          }
          if (rax !== 0 || ray !== 0) {
            this.stickR.x = Math.max(-1, Math.min(1, this.stickR.x + rax * STICK_SPEED_R * dt));
            this.stickR.y = Math.max(-1, Math.min(1, this.stickR.y + ray * STICK_SPEED_R * dt));
          }

          // システムボタン (OPTIONS = 9)
          const sysPressed = !!(gp.buttons[9] && gp.buttons[9].pressed);
          if (sysPressed && !this._padPrevBtns[9]) {
            if (this.onSystemButton) this.onSystemButton();
          }
          this._padPrevBtns[9] = sysPressed;

          // ボタン判定 (XHB入力)
          const l1 = (gp.buttons[4]?.value ?? 0) > 0.5;
          const l2 = (gp.buttons[6]?.value ?? 0) > 0.5;
          const r1 = (gp.buttons[5]?.value ?? 0) > 0.5;
          const r2 = (gp.buttons[7]?.value ?? 0) > 0.5;
          const trigger = (l1 || l2) ? 6 : (r1 || r2) ? 7 : null;

          const triggerSide = trigger === 6 ? 'L' : trigger === 7 ? 'R' : null;
          this.triggerSide = triggerSide;
          if (triggerSide !== prevTriggerSide) {
            prevTriggerSide = triggerSide;
            if (this.onTriggerChange) this.onTriggerChange(triggerSide);
          }

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
      }

      if (this.onStickUpdate) this.onStickUpdate(this.stickL, this.stickR);
      this._padRaf = requestAnimationFrame(loop);
    };

    this._padRaf = requestAnimationFrame(loop);
  }
}
