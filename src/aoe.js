// AOE 回避ミニゲーム
// warning → fire → clear のサイクルをランダム間隔で繰り返す
class AoeEngine {
  constructor(input, ui) {
    this.input   = input;
    this.ui      = ui;
    this.onHit   = null; // AOE に当たったとき
    this.onDodge = null; // AOE を回避したとき

    this._active  = false;
    this._schedId = null;
    this._fireId  = null;
    this._clearId = null;
    this._side    = null; // 'L' | 'R'
    this._type    = null;
    this._aoeData = null; // 幾何データ
    this._gazeEyeX = 0;
    this._gazeEyeY = 0;
  }

  start() {
    this.stop();
    this._active = true;
    this._scheduleNext();
  }

  stop() {
    this._active = false;
    clearTimeout(this._schedId);
    clearTimeout(this._fireId);
    clearTimeout(this._clearId);
    this._schedId = this._fireId = this._clearId = null;
    if (this.ui) {
      this.ui.clearAoe('L');
      this.ui.clearGaze();
    }
    this._side = null;
    this._type = null;
    this._aoeData = null;
    this._gazeEyeX = 0;
    this._gazeEyeY = 0;
  }

  _scheduleNext() {
    if (!this._active) return;
    const delay = AOE_MIN_DELAY_MS + Math.random() * (AOE_MAX_DELAY_MS - AOE_MIN_DELAY_MS);
    this._schedId = setTimeout(() => this._spawn(), delay);
  }

  _spawn() {
    if (!this._active) return;
    this._side = Math.random() < 0.5 ? 'L' : 'R';

    if (this._side === 'R') {
      this._spawnGaze();
      return;
    }

    const types = ['left', 'right', 'top', 'bottom',
                   'large-circle', 'small-circles', 'fan', 'band'];
    this._type    = types[Math.floor(Math.random() * types.length)];
    this._aoeData = this._buildAoeData(this._type);
    this.ui.showAoeWarning(this._side, this._aoeData);

    this._fireId = setTimeout(() => {
      if (!this._active) return;
      const isHit = this._checkHit(this.input.stickL.x, this.input.stickL.y, this._aoeData);
      this.ui.showAoeResult(this._side, this._aoeData, isHit);
      if (isHit) { if (this.onHit)   this.onHit();      }
      else        { if (this.onDodge) this.onDodge('L'); }
      this._clearId = setTimeout(() => {
        if (!this._active) return;
        this.ui.clearAoe(this._side);
        this._side = this._type = this._aoeData = null;
        this._scheduleNext();
      }, AOE_FIRE_MS);
    }, AOE_WARNING_MS);
  }

  _spawnGaze() {
    const forceInside = Math.random() < 1 / 3;
    let eyeX, eyeY;
    do {
      if (forceInside) {
        eyeX = (Math.random() * 2 - 1) * GAZE_FRAME_HALF_W;
        eyeY = (Math.random() * 2 - 1) * GAZE_FRAME_HALF_H;
      } else {
        eyeX = (Math.random() * 2 - 1) * GAZE_EYE_RANGE;
        eyeY = (Math.random() * 2 - 1) * GAZE_EYE_RANGE;
      }
    } while (Math.abs(eyeX) < GAZE_CENTER_EXCLUDE_R && Math.abs(eyeY) < GAZE_CENTER_EXCLUDE_R);
    this._gazeEyeX = eyeX;
    this._gazeEyeY = eyeY;
    this.ui.showGazeWarning(this._gazeEyeX, this._gazeEyeY);

    this._fireId = setTimeout(() => {
      if (!this._active) return;
      const isHit = this._checkGazeHit(
        this.input.stickR.x, this.input.stickR.y,
        this._gazeEyeX, this._gazeEyeY
      );
      this.ui.showGazeResult(isHit);
      if (isHit) { if (this.onHit)   this.onHit();      }
      else        { if (this.onDodge) this.onDodge('R'); }
      this._clearId = setTimeout(() => {
        if (!this._active) return;
        this.ui.clearGaze();
        this._side = null;
        this._gazeEyeX = this._gazeEyeY = 0;
        this._scheduleNext();
      }, AOE_FIRE_MS);
    }, AOE_WARNING_MS);
  }

  _buildAoeData(type) {
    const sizeScale = AOE_SIZE_SCALE_BASE + Math.random() * AOE_SIZE_SCALE_RANGE;
    switch (type) {
      case 'left': case 'right': case 'top': case 'bottom':
        return { type, sizeScale };
      case 'large-circle': {
        const r = 0.55 * sizeScale;
        return { type, cx: (Math.random()*2-1)*(1-r), cy: (Math.random()*2-1)*(1-r), r };
      }
      case 'small-circles': {
        const r = 0.25 * sizeScale;
        const count = 2 + Math.floor(Math.random() * 3);
        const circles = Array.from({ length: count }, (_, i) => {
          // ② 1つ目は必ずプレイヤーの現在位置
          if (i === 0) return { cx: this.input.stickL.x, cy: this.input.stickL.y };
          return { cx: (Math.random()*2-1)*(1-r), cy: (Math.random()*2-1)*(1-r) };
        });
        return { type, r, circles };
      }
      case 'fan': {
        const halfAngle = 15 + Math.random() * 15;
        const baseAngle = Math.random() * 360;
        return { type, halfAngle, baseAngle };
      }
      case 'band': {
        const halfThick = 0.20 * sizeScale;
        const available = 1 - halfThick;
        const roll = Math.random();
        let bands;
        if (roll < 0.33) {
          const a = -available + Math.random() * (available - halfThick);
          const b =  halfThick + Math.random() * (available - halfThick);
          bands = [{ dir: 'h', pos: a }, { dir: 'h', pos: b }];
        } else if (roll < 0.67) {
          const a = -available + Math.random() * (available - halfThick);
          const b =  halfThick + Math.random() * (available - halfThick);
          bands = [{ dir: 'v', pos: a }, { dir: 'v', pos: b }];
        } else {
          bands = [
            { dir: 'h', pos: (Math.random() * 2 - 1) * available },
            { dir: 'v', pos: (Math.random() * 2 - 1) * available }
          ];
        }
        return { type, halfThick, bands };
      }
    }
    return { type: 'left', sizeScale: 1.0 };
  }

  // カーソルがAOEゾーン内にいるか判定（左パネル用）
  _checkHit(x, y, d) {
    switch (d.type) {
      case 'left':         return x < d.sizeScale - 1;
      case 'right':        return x > 1 - d.sizeScale;
      case 'top':          return y < d.sizeScale - 1;
      case 'bottom':       return y > 1 - d.sizeScale;
      case 'large-circle': { const dx=x-d.cx, dy=y-d.cy; return dx*dx + dy*dy/2.25 < d.r*d.r; }
      case 'small-circles':return d.circles.some(c => { const dx=x-c.cx, dy=y-c.cy; return dx*dx + dy*dy/2.25 < d.r*d.r; });
      case 'fan': {
        if (x === 0 && y === 0) return true;
        const deg = Math.atan2(y, x) * 180 / Math.PI;
        for (let i = 0; i < 4; i++) {
          const base = d.baseAngle + i * 90;
          let diff = ((deg - base) % 360 + 360) % 360;
          if (diff > 180) diff -= 360;
          if (Math.abs(diff) <= d.halfAngle) return true;
        }
        return false;
      }
      case 'band':
        return d.bands.some(b =>
          b.dir === 'h' ? Math.abs(y - b.pos) < d.halfThick
                        : Math.abs(x - b.pos) < d.halfThick
        );
    }
    return false;
  }

  // フレーム内に目の中心が入っているか判定（右パネル用）
  _checkGazeHit(rx, ry, eyeX, eyeY) {
    const cx = Math.max(-(1 - GAZE_FRAME_HALF_W), Math.min(1 - GAZE_FRAME_HALF_W, rx));
    const cy = Math.max(-(1 - GAZE_FRAME_HALF_H), Math.min(1 - GAZE_FRAME_HALF_H, ry));
    return Math.abs(eyeX - cx) <= GAZE_FRAME_HALF_W &&
           Math.abs(eyeY - cy) <= GAZE_FRAME_HALF_H;
  }
}
