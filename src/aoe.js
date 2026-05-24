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
    this._type    = null; // 'left' | 'right' | 'top' | 'bottom'
    this._gazeEyeX = 0;
    this._gazeEyeY = 0;
  }

  start() {
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

    const types = ['left', 'right', 'top', 'bottom'];
    this._type = types[Math.floor(Math.random() * 4)];
    this.ui.showAoeWarning(this._side, this._type);

    this._fireId = setTimeout(() => {
      if (!this._active) return;
      const isHit = this._checkHit(this.input.stickL.x, this.input.stickL.y, this._type);
      this.ui.showAoeResult(this._side, this._type, isHit);
      if (isHit) { if (this.onHit)   this.onHit();   }
      else        { if (this.onDodge) this.onDodge(); }
      this._clearId = setTimeout(() => {
        if (!this._active) return;
        this.ui.clearAoe(this._side);
        this._side = this._type = null;
        this._scheduleNext();
      }, AOE_FIRE_MS);
    }, AOE_WARNING_MS);
  }

  _spawnGaze() {
    this._gazeEyeX = (Math.random() * 2 - 1) * GAZE_EYE_RANGE;
    this._gazeEyeY = (Math.random() * 2 - 1) * GAZE_EYE_RANGE;
    this.ui.showGazeWarning(this._gazeEyeX, this._gazeEyeY);

    this._fireId = setTimeout(() => {
      if (!this._active) return;
      const isHit = this._checkGazeHit(
        this.input.stickR.x, this.input.stickR.y,
        this._gazeEyeX, this._gazeEyeY
      );
      this.ui.showGazeResult(isHit);
      if (isHit) { if (this.onHit)   this.onHit();   }
      else        { if (this.onDodge) this.onDodge(); }
      this._clearId = setTimeout(() => {
        if (!this._active) return;
        this.ui.clearGaze();
        this._side = null;
        this._gazeEyeX = this._gazeEyeY = 0;
        this._scheduleNext();
      }, AOE_FIRE_MS);
    }, AOE_WARNING_MS);
  }

  // カーソルがAOEゾーン内にいるか判定（左パネル用）
  _checkHit(x, y, type) {
    switch (type) {
      case 'left':   return x < 0;
      case 'right':  return x > 0;
      case 'top':    return y < 0;
      case 'bottom': return y > 0;
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
