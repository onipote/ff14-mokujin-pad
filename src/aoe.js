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
    this._stkMarkerX = 0;
    this._stkMarkerY = 0;

    // ポーズ/復帰のためのタイマー追跡
    this._phase = 'idle';       // 'idle' | 'warning' | 'result'
    this._schedSetAt = 0;
    this._schedDelay = 0;
    this._fireSetAt  = 0;
    this._clearSetAt = 0;
    this._pausedPhase     = null;
    this._pausedRemaining = 0;

    this._leftStreak  = 0;
    this._rightStreak = 0;
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
      this.ui.clearStack();
    }
    this._side = null;
    this._type = null;
    this._aoeData = null;
    this._stkMarkerX = 0;
    this._stkMarkerY = 0;
    this._phase = 'idle';
    this._leftStreak  = 0;
    this._rightStreak = 0;
  }

  // ポーズ：タイマーのみ停止。UIと状態変数は保持する
  pauseTimers() {
    if (!this._active) return;
    const now = Date.now();
    this._pausedPhase = this._phase;

    // _phase を基準にどのタイマーが有効かを判断する
    // (_fireId は発火後も古いIDが残るため truthy チェックでは判断できない)
    switch (this._phase) {
      case 'idle':
        this._pausedRemaining = Math.max(0, this._schedDelay - (now - this._schedSetAt));
        clearTimeout(this._schedId);
        this._schedId = null;
        break;
      case 'warning':
        this._pausedRemaining = Math.max(0, AOE_WARNING_MS - (now - this._fireSetAt));
        clearTimeout(this._fireId);
        this._fireId = null;
        break;
      case 'result':
        this._pausedRemaining = Math.max(0, AOE_FIRE_MS - (now - this._clearSetAt));
        clearTimeout(this._clearId);
        this._clearId = null;
        break;
      default:
        this._pausedRemaining = 0;
        this._pausedPhase = 'idle';
    }

    this._active = false;
  }

  // 復帰：保存した残り時間でタイマーを再始動。UIは触らない
  resumeTimers() {
    this._active = true;
    const remaining = this._pausedRemaining;

    switch (this._pausedPhase) {
      case 'idle':
        this._schedSetAt = Date.now();
        this._schedDelay = remaining;
        this._schedId = setTimeout(() => this._spawn(), remaining);
        break;
      case 'warning':
        this._fireSetAt = Date.now();
        this._fireId = this._side === 'R'
          ? setTimeout(() => this._fireStack(), remaining)
          : setTimeout(() => this._fireAoe(),   remaining);
        break;
      case 'result':
        this._clearSetAt = Date.now();
        this._clearId = this._side === 'R'
          ? setTimeout(() => this._clearStack(), remaining)
          : setTimeout(() => this._clearAoe(),   remaining);
        break;
    }
  }

  _scheduleNext() {
    if (!this._active) return;
    const delay = AOE_MIN_DELAY_MS + Math.random() * (AOE_MAX_DELAY_MS - AOE_MIN_DELAY_MS);
    this._phase = 'idle';
    this._schedSetAt = Date.now();
    this._schedDelay = delay;
    this._schedId = setTimeout(() => this._spawn(), delay);
  }

  _spawn() {
    if (!this._active) return;
    let side;
    if (this._leftStreak >= 3)       side = 'R';
    else if (this._rightStreak >= 2) side = 'L';
    else                              side = Math.random() < 0.5 ? 'L' : 'R';
    this._side = side;
    if (side === 'L') { this._leftStreak++; this._rightStreak = 0; }
    else              { this._rightStreak++; this._leftStreak = 0; }

    if (this._side === 'R') {
      this._spawnStack();
      return;
    }

    const types = ['left', 'right', 'top', 'bottom',
                   'large-circle', 'small-circles', 'fan', 'band'];
    this._type    = types[Math.floor(Math.random() * types.length)];
    this._aoeData = this._buildAoeData(this._type);
    this.ui.showAoeWarning(this._side, this._aoeData);

    this._phase = 'warning';
    this._fireSetAt = Date.now();
    this._fireId = setTimeout(() => this._fireAoe(), AOE_WARNING_MS);
  }

  _fireAoe() {
    if (!this._active) return;
    const isHit = this._checkHit(this.input.stickL.x, this.input.stickL.y, this._aoeData);
    this.ui.showAoeResult(this._side, this._aoeData, isHit);
    if (isHit) { if (this.onHit)   this.onHit();      }
    else        { if (this.onDodge) this.onDodge('L'); }

    this._phase = 'result';
    this._clearSetAt = Date.now();
    this._clearId = setTimeout(() => this._clearAoe(), AOE_FIRE_MS);
  }

  _clearAoe() {
    if (!this._active) return;
    this.ui.clearAoe(this._side);
    this._side = this._type = this._aoeData = null;
    this._scheduleNext();
  }

  _spawnStack() {
    // ワールドオフセットを必ず (0,0) から開始するため stickR をリセット
    this.input.stickR.x = 0;
    this.input.stickR.y = 0;

    let markerX, markerY;
    do {
      markerX = (Math.random() * 2 - 1) * STK_CHEST_SPAWN_ONSCREEN_MAX;
      markerY = (Math.random() * 2 - 1) * STK_CHEST_SPAWN_ONSCREEN_MAX;
    } while (Math.abs(markerX) <= STK_CHEST_SPAWN_EXCLUDE_HALF && Math.abs(markerY) <= STK_CHEST_SPAWN_EXCLUDE_HALF);
    this._stkMarkerX = markerX;
    this._stkMarkerY = markerY;
    this.ui.showStackWarning(this._stkMarkerX, this._stkMarkerY);

    this._phase = 'warning';
    this._fireSetAt = Date.now();
    this._fireId = setTimeout(() => this._fireStack(), AOE_WARNING_MS);
  }

  _fireStack() {
    if (!this._active) return;
    const isHit = this._checkStackHit();
    this.ui.showStackResult(isHit);
    if (isHit) { if (this.onHit)   this.onHit();      }
    else        { if (this.onDodge) this.onDodge('R'); }

    this._phase = 'result';
    this._clearSetAt = Date.now();
    this._clearId = setTimeout(() => this._clearStack(), AOE_FIRE_MS);
  }

  _clearStack() {
    if (!this._active) return;
    this.ui.clearStack();
    this._side = null;
    this._stkMarkerX = this._stkMarkerY = 0;
    this._scheduleNext();
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
        const cx = (Math.random() * 2 - 1) * 0.5;
        const cy = (Math.random() * 2 - 1) * 0.5;
        return { type, halfAngle, baseAngle, cx, cy };
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
        const dx = x - d.cx;
        const dy = y - d.cy;
        if (dx === 0 && dy === 0) return true;
        const deg = Math.atan2(dy, dx) * 180 / Math.PI;
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

  // 宝箱ギミック判定（右パネル用）。ヒット = 一度も枠内に収まらなかった
  _checkStackHit() {
    return !this.ui._stkChestOpened;
  }
}
