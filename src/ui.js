class UIManager {
  constructor() {
    this._heartsEl    = document.getElementById('player-hearts');
    this._scoreEl     = document.getElementById('score-val');
    this._comboEl     = document.getElementById('combo-val');
    this._timerFill   = document.getElementById('timer-fill');
    this._timerLabel  = document.getElementById('timer-label');
    this._enemyHpBar  = document.getElementById('enemy-hp-bar');
    this._scoreAtkEl  = document.getElementById('score-atk-timer');
    this._padStatusEl = document.getElementById('pad-status');
    this._enemyEl     = document.getElementById('enemy-figure');
    this._heartEls    = [];
    this._enemyFlashId = null;
    this._enemyAnimId  = null;

    this._pauseEl    = document.getElementById('screen-pause');

    // AOE / stick panels
    this._aoeZone   = { L: document.getElementById('aoe-zone-L'),     R: document.getElementById('aoe-zone-R') };
    this._stickCur  = { L: document.getElementById('stick-cursor-L'), R: document.getElementById('stick-cursor-R') };
  }

  buildHearts(max) {
    this._heartsEl.innerHTML = '';
    this._heartEls = [];
    for (let i = 0; i < max; i++) {
      const h = document.createElement('div');
      h.className = 'heart';
      this._heartsEl.appendChild(h);
      this._heartEls.push(h);
    }
  }

  updateAll(engine) {
    this._heartEls.forEach((h, i) => {
      h.className = 'heart' + (i < engine.playerHp ? '' : ' heart--empty');
    });

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
    if (el) el.className = `aoe-zone aoe-zone--warning aoe-zone--${type}`;
  }

  showAoeResult(side, type, isHit) {
    const el = this._aoeZone[side];
    if (el) el.className = `aoe-zone aoe-zone--${isHit ? 'hit' : 'dodge'} aoe-zone--${type}`;
  }

  clearAoe(side) {
    const el = this._aoeZone[side];
    if (el) el.className = 'aoe-zone';
  }

  updateStickCursors(stickL, stickR) {
    this._moveCursor(this._stickCur.L, stickL.x, stickL.y);
    this._moveCursor(this._stickCur.R, stickR.x, stickR.y);
  }

  _moveCursor(el, x, y) {
    if (!el) return;
    el.style.left = ((x + 1) / 2 * 100) + '%';
    el.style.top  = ((y + 1) / 2 * 100) + '%';
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
