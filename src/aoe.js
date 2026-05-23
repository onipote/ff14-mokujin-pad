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
      this.ui.clearAoe('R');
    }
    this._side = null;
    this._type = null;
  }

  _scheduleNext() {
    if (!this._active) return;
    const delay = AOE_MIN_DELAY_MS + Math.random() * (AOE_MAX_DELAY_MS - AOE_MIN_DELAY_MS);
    this._schedId = setTimeout(() => this._spawn(), delay);
  }

  _spawn() {
    if (!this._active) return;
    const sides = ['L', 'R'];
    const types = ['left', 'right', 'top', 'bottom'];
    this._side = sides[Math.floor(Math.random() * 2)];
    this._type = types[Math.floor(Math.random() * 4)];

    this.ui.showAoeWarning(this._side, this._type);

    this._fireId = setTimeout(() => {
      if (!this._active) return;
      const stick = this._side === 'L' ? this.input.stickL : this.input.stickR;
      const isHit = this._checkHit(stick.x, stick.y, this._type);

      this.ui.showAoeResult(this._side, this._type, isHit);

      if (isHit) { if (this.onHit)   this.onHit();   }
      else        { if (this.onDodge) this.onDodge(); }

      this._clearId = setTimeout(() => {
        if (!this._active) return;
        this.ui.clearAoe(this._side);
        this._side = null;
        this._type = null;
        this._scheduleNext();
      }, AOE_FIRE_MS);
    }, AOE_WARNING_MS);
  }

  // カーソルがAOEゾーン内にいるか判定
  _checkHit(x, y, type) {
    switch (type) {
      case 'left':   return x < 0;
      case 'right':  return x > 0;
      case 'top':    return y < 0;
      case 'bottom': return y > 0;
    }
    return false;
  }
}
