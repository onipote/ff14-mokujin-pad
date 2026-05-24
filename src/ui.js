class UIManager {
  constructor() {
    this._scoreEl        = document.getElementById('score-val');
    this._comboEl        = document.getElementById('combo-val');
    this._timerFill      = document.getElementById('timer-fill');
    this._timerLabel     = document.getElementById('timer-label');
    this._padStatusEl    = document.getElementById('pad-status');
    this._enemyEl        = document.getElementById('enemy-figure');
    this._comboGaugeWrap = document.getElementById('combo-gauge-wrap');
    this._comboGaugeFill = document.getElementById('combo-gauge-fill');
    this._countdownEl    = document.getElementById('countdown-val');
    this._judgmentEl     = document.getElementById('judgment-float');
    this._enemyFlashId = null;
    this._enemyAnimId  = null;

    this._pauseEl    = document.getElementById('screen-pause');

    // AOE / stick panels
    this._aoeZone   = { L: document.getElementById('aoe-zone-L') };
    this._stickCur  = { L: document.getElementById('stick-cursor-L') };
    this._stickField = { L: document.getElementById('stick-field-L'), R: document.getElementById('stick-field-R') };
    // 視線ギミック（右パネル）
    this._gazeEye    = document.getElementById('gaze-eye-R');
    this._gazeFrame  = document.getElementById('gaze-frame-R');
    this._gazeActive  = false;
    this._gazeEyeX    = 0;
    this._gazeEyeY    = 0;
    this._gazeOverlay = null;
    // AOEカーソル色（左パネル）
    this._aoeActive  = false;
    this._aoeData    = null;
  }

  updateAll(engine) {
    this._scoreEl.textContent = engine.score;
    const gaugeRatio = Math.min(1, engine.combo / BURST_THRESHOLDS[engine.difficulty]);
    this._comboGaugeFill.style.width = (gaugeRatio * 100) + '%';
    this._comboEl.textContent = engine.combo >= 1 ? `COMBO ${engine.combo}` : '';
  }

  showPrompt(slotDef) {
    const trigger = slotDef.side === 'L' ? 'L2' : 'R2';
    this._timerLabel.textContent = `${trigger} + ${slotDef.sym}`;
  }

  setStartable(canStart) {
    const btn = document.getElementById('btn-start');
    const msg = document.getElementById('pad-required-msg');
    btn.disabled = !canStart;
    if (msg) msg.classList.toggle('hidden', canStart);
  }

  setTimerFill(ratio) {
    if (!this._timerFill) return;
    this._timerFill.style.width = (ratio * 100) + '%';
    this._timerFill.classList.toggle('low', ratio < 0.3 && ratio > 0);
  }

  setCountdown(ms) {
    this._countdownEl.textContent = Math.ceil(ms / 1000);
    this._countdownEl.classList.toggle('countdown--urgent', ms < 10_000);
  }

  setBurstState(active) {
    this._comboGaugeWrap.classList.toggle('combo-gauge--burst', active);
  }

  setBurstGauge(ratio) {
    this._comboGaugeFill.style.width = (ratio * 100) + '%';
  }

  showJudgment(type) {
    const labels = { great: '◎ GREAT', good: '○ GOOD', miss: '✕ MISS' };
    const el = document.createElement('div');
    el.className = `judgment-float judgment-float--${type}`;
    el.textContent = type === 'bonus' ? '+2s' : (labels[type] || '');
    this._judgmentEl.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  // type: 'hit' | 'miss', combo: number
  flashEnemy(type, combo) {
    if (this._enemyFlashId) clearTimeout(this._enemyFlashId);
    if (this._enemyAnimId)  clearTimeout(this._enemyAnimId);

    this._enemyEl.classList.remove('hit', 'miss', 'enemy-shake', 'enemy-bounce');
    void this._enemyEl.offsetWidth; // reflow to restart animations

    if (type === 'hit') {
      this._enemyEl.classList.add('hit');
      const anim = (combo === COMBO_BONUS_THRESHOLD || Object.values(BURST_THRESHOLDS).includes(combo)) ? 'enemy-bounce' : 'enemy-shake';
      this._enemyEl.classList.add(anim);
      this._enemyFlashId = setTimeout(() => this._enemyEl.classList.remove('hit'), 300);
      this._enemyAnimId  = setTimeout(() => this._enemyEl.classList.remove(anim), 400);
    } else {
      this._enemyEl.classList.add('miss', 'enemy-shake');
      this._enemyFlashId = setTimeout(() => this._enemyEl.classList.remove('miss'), 500);
      this._enemyAnimId  = setTimeout(() => this._enemyEl.classList.remove('enemy-shake'), 500);
    }
  }

  setPadStatus(connected, id) {
    const el = this._padStatusEl;
    el.className = connected ? 'pad-status pad-status--on' : 'pad-status pad-status--off';
    el.textContent = connected ? `PAD: ${id.slice(0, 22)}` : 'PAD: 未接続';
  }

  showGameOver(engine, reason, prevBest, isNewRecord) {
    const heading = document.getElementById('gameover-heading');
    heading.textContent = 'TIME UP!';
    heading.className = 'gameover-title clear';

    const acc = engine.total > 0 ? Math.round(engine.hits / engine.total * 100) : 0;
    const bestLine = isNewRecord
      ? `<div class="stat-row"><span>前回ベスト</span><span class="stat-val">${prevBest}</span></div>`
      : `<div class="stat-row"><span>ベストスコア</span><span class="stat-val">${Math.max(engine.score, prevBest)}</span></div>`;

    document.getElementById('gameover-stats').innerHTML = `
      <div class="stat-row"><span>スコア</span><span class="stat-val"><b class="stat-big">${engine.score}</b></span></div>
      ${bestLine}
      <div class="stat-row"><span>正解数</span><span class="stat-val">${engine.hits} / ${engine.total}</span></div>
      <div class="stat-row"><span>正確率</span><span class="stat-val">${acc}%</span></div>
      <div class="stat-row"><span>最大コンボ</span><span class="stat-val">${engine.maxCombo}</span></div>
    `;

    const badge = document.getElementById('new-record-badge');
    badge.classList.toggle('hidden', !isNewRecord);

    document.getElementById('screen-gameover').classList.remove('hidden');
  }

  // ── AOE / スティックパネル ──

  showAoeWarning(side, aoeData) {
    const el = this._aoeZone[side];
    if (el) {
      el.className = `aoe-zone aoe-zone--container aoe-zone--warning-out aoe-zone--${aoeData.type}`;
      el.innerHTML = '';
      // ① AoE外を暗転するオーバーレイ（shape要素より前に追加 → DOM順で後ろに描画）
      const overlay = document.createElement('div');
      overlay.className = 'aoe-overlay';
      el.appendChild(overlay);
      this._buildShapeEls(aoeData).forEach(child => {
        child.classList.add('aoe-zone--warning-out');
        el.appendChild(child);
      });
    }
    if (this._stickField[side]) this._stickField[side].classList.add('stick-field--active');
    this._aoeActive = true;
    this._aoeData   = aoeData;
  }

  showAoeResult(side, aoeData, isHit) {
    this._aoeActive = false;
    const state = isHit ? 'aoe-zone--hit' : 'aoe-zone--dodge';
    const el = this._aoeZone[side];
    if (el) {
      el.className = `aoe-zone aoe-zone--container ${state} aoe-zone--${aoeData.type}`;
      this._setAoeChildState(side, state);
    }
    if (this._stickCur.L) this._stickCur.L.className = 'stick-cursor';
  }

  clearAoe(side) {
    this._aoeActive = false;
    this._aoeData   = null;
    const el = this._aoeZone[side];
    if (el) { el.className = 'aoe-zone'; el.innerHTML = ''; }
    if (this._stickField[side]) this._stickField[side].classList.remove('stick-field--active');
    if (this._stickCur.L) this._stickCur.L.className = 'stick-cursor';
  }

  updateStickCursors(stickL, stickR) {
    this._moveCursor(this._stickCur.L, stickL.x, stickL.y);
    this._moveFrameCursor(stickR.x, stickR.y);
  }

  _moveCursor(el, x, y) {
    if (!el) return;
    el.style.left = ((x + 1) / 2 * 100) + '%';
    el.style.top  = ((y + 1) / 2 * 100) + '%';
    if (this._aoeActive && this._aoeData) {
      const inside = this._isInAoe(x, y, this._aoeData);
      el.className = 'stick-cursor ' + (inside ? 'stick-cursor--in' : 'stick-cursor--out');
      const state = inside ? 'aoe-zone--warning-in' : 'aoe-zone--warning-out';
      const zone = this._aoeZone.L;
      if (zone) {
        zone.className = `aoe-zone aoe-zone--container ${state} aoe-zone--${this._aoeData.type}`;
        this._setAoeChildState('L', state);
      }
    }
  }

  _moveFrameCursor(x, y) {
    if (!this._gazeFrame) return;
    const halfW = GAZE_FRAME_W_PCT / 2;
    const halfH = GAZE_FRAME_H_PCT / 2;
    const leftPct = Math.max(halfW, Math.min(100 - halfW, (x + 1) / 2 * 100));
    const topPct  = Math.max(halfH, Math.min(100 - halfH, (y + 1) / 2 * 100));
    this._gazeFrame.style.left = leftPct + '%';
    this._gazeFrame.style.top  = topPct  + '%';

    if (this._gazeActive) {
      const cx = Math.max(-(1 - GAZE_FRAME_HALF_W), Math.min(1 - GAZE_FRAME_HALF_W, x));
      const cy = Math.max(-(1 - GAZE_FRAME_HALF_H), Math.min(1 - GAZE_FRAME_HALF_H, y));
      const inside = Math.abs(this._gazeEyeX - cx) <= GAZE_FRAME_HALF_W &&
                     Math.abs(this._gazeEyeY - cy) <= GAZE_FRAME_HALF_H;
      this._gazeFrame.className = 'gaze-frame ' + (inside ? 'gaze-frame--in' : 'gaze-frame--out');
    }
  }

  _buildShapeEls(aoeData) {
    const pct = v => ((v + 1) / 2 * 100);
    const mk = style => {
      const el = document.createElement('div');
      el.className = 'aoe-zone';
      el.style.cssText = style;
      return el;
    };
    switch (aoeData.type) {
      case 'left': {
        const w = 50 * aoeData.sizeScale;
        return [mk(`position:absolute;left:0;top:0;width:${w}%;height:100%;border-radius:0`)];
      }
      case 'right': {
        const w = 50 * aoeData.sizeScale;
        return [mk(`position:absolute;left:${100-w}%;top:0;width:${w}%;height:100%;border-radius:0`)];
      }
      case 'top': {
        const h = 50 * aoeData.sizeScale;
        return [mk(`position:absolute;left:0;top:0;width:100%;height:${h}%;border-radius:0`)];
      }
      case 'bottom': {
        const h = 50 * aoeData.sizeScale;
        return [mk(`position:absolute;left:0;top:${100-h}%;width:100%;height:${h}%;border-radius:0`)];
      }
      case 'large-circle': {
        const size = aoeData.r * 100;
        return [mk(`position:absolute;left:${pct(aoeData.cx)}%;top:${pct(aoeData.cy)}%;width:${size}%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%`)];
      }
      case 'small-circles':
        return aoeData.circles.map(c => {
          const size = aoeData.r * 100;
          return mk(`position:absolute;left:${pct(c.cx)}%;top:${pct(c.cy)}%;width:${size}%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%`);
        });
      case 'band-h': {
        const h = aoeData.halfThick * 100;
        return [mk(`position:absolute;left:0;width:100%;top:${pct(aoeData.cy)}%;height:${h}%;transform:translateY(-50%);border-radius:0`)];
      }
      case 'band-v': {
        const w = aoeData.halfThick * 100;
        return [mk(`position:absolute;top:0;height:100%;left:${pct(aoeData.cx)}%;width:${w}%;transform:translateX(-50%);border-radius:0`)];
      }
    }
    return [];
  }

  _setAoeChildState(side, stateClass) {
    const container = this._aoeZone[side];
    if (!container) return;
    const states = ['aoe-zone--warning-out','aoe-zone--warning-in','aoe-zone--hit','aoe-zone--dodge'];
    container.querySelectorAll('.aoe-zone').forEach(el => {
      states.forEach(s => el.classList.remove(s));
      el.classList.add(stateClass);
    });
  }

  _isInAoe(x, y, d) {
    switch (d.type) {
      case 'left':         return x < d.sizeScale - 1;
      case 'right':        return x > 1 - d.sizeScale;
      case 'top':          return y < d.sizeScale - 1;
      case 'bottom':       return y > 1 - d.sizeScale;
      case 'large-circle': { const dx=x-d.cx, dy=y-d.cy; return dx*dx + dy*dy/2.25 < d.r*d.r; }
      case 'small-circles':return d.circles.some(c => { const dx=x-c.cx, dy=y-c.cy; return dx*dx + dy*dy/2.25 < d.r*d.r; });
      case 'band-h':       return Math.abs(y - d.cy) < d.halfThick;
      case 'band-v':       return Math.abs(x - d.cx) < d.halfThick;
    }
    return false;
  }

  showGazeWarning(eyeX, eyeY) {
    this._gazeActive = true;
    this._gazeEyeX   = eyeX;
    this._gazeEyeY   = eyeY;
    if (this._gazeEye) {
      this._gazeEye.style.left = ((eyeX + 1) / 2 * 100) + '%';
      this._gazeEye.style.top  = ((eyeY + 1) / 2 * 100) + '%';
      this._gazeEye.className  = 'gaze-eye gaze-eye--visible';
    }
    if (this._stickField.R) {
      this._stickField.R.classList.add('stick-field--active');
      if (!this._gazeOverlay) {
        this._gazeOverlay = document.createElement('div');
        this._gazeOverlay.className = 'gaze-overlay';
        this._stickField.R.appendChild(this._gazeOverlay);
      }
    }
  }

  showGazeResult(isHit) {
    this._gazeActive = false;
    if (this._gazeEye) {
      this._gazeEye.className = 'gaze-eye ' + (isHit ? 'gaze-eye--hit' : 'gaze-eye--dodge');
    }
    if (this._gazeFrame) {
      this._gazeFrame.className = 'gaze-frame ' + (isHit ? 'gaze-frame--hit' : 'gaze-frame--dodge');
    }
  }

  clearGaze() {
    this._gazeActive = false;
    if (this._gazeEye)   this._gazeEye.className  = 'gaze-eye';
    if (this._gazeFrame) this._gazeFrame.className = 'gaze-frame';
    if (this._stickField.R) this._stickField.R.classList.remove('stick-field--active');
    if (this._gazeOverlay) { this._gazeOverlay.remove(); this._gazeOverlay = null; }
  }

  hideGameOver() {
    document.getElementById('screen-gameover').classList.add('hidden');
    document.getElementById('new-record-badge').classList.add('hidden');
  }

  showPause() {
    this._pauseEl.classList.remove('hidden');
  }

  hidePause() {
    this._pauseEl.classList.add('hidden');
  }
}
