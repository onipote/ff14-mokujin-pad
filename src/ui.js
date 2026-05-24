class UIManager {
  constructor() {
    this._playerHpBar = document.getElementById('player-hp-bar');
    this._scoreEl     = document.getElementById('score-val');
    this._comboEl     = document.getElementById('combo-val');
    this._timerFill   = document.getElementById('timer-fill');
    this._timerLabel  = document.getElementById('timer-label');
    this._enemyHpBar  = document.getElementById('enemy-hp-bar');
    this._scoreAtkEl  = document.getElementById('score-atk-timer');
    this._padStatusEl = document.getElementById('pad-status');
    this._enemyEl     = document.getElementById('enemy-figure');
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
    this._gazeActive = false;
    this._gazeEyeX   = 0;
    this._gazeEyeY   = 0;
    // AOEカーソル色（左パネル）
    this._aoeActive  = false;
    this._aoeType    = null;
  }

  updateAll(engine) {
    const playerRatio = engine.playerHp / PLAYER_MAX_HP;
    this._playerHpBar.style.width = (playerRatio * 100) + '%';

    this._scoreEl.textContent = engine.score;

    if (engine.combo >= 2) {
      const mult = Math.min(engine.combo, MAX_COMBO_MULTIPLIER);
      this._comboEl.textContent = `× ${mult} COMBO`;
    } else {
      this._comboEl.textContent = '';
    }

    const ratio = engine.enemyHp / ENEMY_MAX_HP;
    this._enemyHpBar.style.width = (ratio * 100) + '%';
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

  setScoreAtkTimer(ms) {
    const secs = Math.ceil(ms / 1000);
    this._scoreAtkEl.textContent = `残り ${secs}s`;
    this._scoreAtkEl.classList.toggle('urgent', secs <= 10);
  }

  showScoreAtkTimer(show) {
    this._scoreAtkEl.classList.toggle('hidden', !show);
  }

  // type: 'hit' | 'miss', combo: number
  flashEnemy(type, combo) {
    if (this._enemyFlashId) clearTimeout(this._enemyFlashId);
    if (this._enemyAnimId)  clearTimeout(this._enemyAnimId);

    this._enemyEl.classList.remove('hit', 'miss', 'enemy-shake', 'enemy-bounce');
    void this._enemyEl.offsetWidth; // reflow to restart animations

    if (type === 'hit') {
      this._enemyEl.classList.add('hit');
      // Big combo = bounce, otherwise shake
      const anim = (combo > 0 && combo % MAX_COMBO_MULTIPLIER === 0) ? 'enemy-bounce' : 'enemy-shake';
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
    heading.textContent = reason === 'time_up' ? 'TIME UP!' : 'GAME OVER';
    heading.className = 'gameover-title ' + (reason === 'time_up' ? 'clear' : 'over');

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

  showAoeWarning(side, type) {
    const el = this._aoeZone[side];
    if (el) el.className = `aoe-zone aoe-zone--warning-out aoe-zone--${type}`;
    if (this._stickField[side]) this._stickField[side].classList.add('stick-field--active');
    this._aoeActive = true;
    this._aoeType   = type;
  }

  showAoeResult(side, type, isHit) {
    this._aoeActive = false;
    const el = this._aoeZone[side];
    if (el) el.className = `aoe-zone aoe-zone--${isHit ? 'hit' : 'dodge'} aoe-zone--${type}`;
    if (this._stickCur.L) this._stickCur.L.className = 'stick-cursor';
  }

  clearAoe(side) {
    this._aoeActive = false;
    this._aoeType   = null;
    const el = this._aoeZone[side];
    if (el) el.className = 'aoe-zone';
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
    if (this._aoeActive) {
      let inside = false;
      switch (this._aoeType) {
        case 'left':   inside = x < 0; break;
        case 'right':  inside = x > 0; break;
        case 'top':    inside = y < 0; break;
        case 'bottom': inside = y > 0; break;
      }
      el.className = 'stick-cursor ' + (inside ? 'stick-cursor--in' : 'stick-cursor--out');
      const zone = this._aoeZone.L;
      if (zone) zone.className = `aoe-zone aoe-zone--${inside ? 'warning-in' : 'warning-out'} aoe-zone--${this._aoeType}`;
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

  showGazeWarning(eyeX, eyeY) {
    this._gazeActive = true;
    this._gazeEyeX   = eyeX;
    this._gazeEyeY   = eyeY;
    if (this._gazeEye) {
      this._gazeEye.style.left = ((eyeX + 1) / 2 * 100) + '%';
      this._gazeEye.style.top  = ((eyeY + 1) / 2 * 100) + '%';
      this._gazeEye.className  = 'gaze-eye gaze-eye--visible';
    }
    if (this._stickField.R) this._stickField.R.classList.add('stick-field--active');
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
