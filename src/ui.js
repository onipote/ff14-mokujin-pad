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
    this._timerLabel.textContent = `${trigger} + ${slotDef.sym}  (${slotDef.keyLabel})`;
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

  flashEnemy(type) {
    this._enemyEl.classList.remove('hit', 'miss');
    void this._enemyEl.offsetWidth; // force reflow to restart CSS transition
    this._enemyEl.classList.add(type === 'hit' ? 'hit' : 'miss');
    const dur = type === 'hit' ? 300 : 500;
    setTimeout(() => this._enemyEl.classList.remove('hit', 'miss'), dur);
  }

  setPadStatus(connected, id) {
    const el = this._padStatusEl;
    el.className = connected ? 'pad-status pad-status--on' : 'pad-status pad-status--off';
    el.textContent = connected ? `PAD: ${id.slice(0, 22)}` : 'PAD: 未接続';
  }

  showGameOver(engine, reason) {
    const heading = document.getElementById('gameover-heading');
    heading.textContent = reason === 'time_up' ? 'TIME UP!' : 'GAME OVER';
    heading.className = 'gameover-title ' + (reason === 'time_up' ? 'clear' : 'over');

    const acc = engine.total > 0 ? Math.round(engine.hits / engine.total * 100) : 0;
    document.getElementById('gameover-stats').innerHTML = `
      <div class="stat-row"><span>スコア</span><span class="stat-val"><b class="stat-big">${engine.score}</b></span></div>
      <div class="stat-row"><span>正解数</span><span class="stat-val">${engine.hits} / ${engine.total}</span></div>
      <div class="stat-row"><span>正確率</span><span class="stat-val">${acc}%</span></div>
      <div class="stat-row"><span>最大コンボ</span><span class="stat-val">${engine.maxCombo}</span></div>
    `;
    document.getElementById('screen-gameover').classList.remove('hidden');
  }

  hideGameOver() {
    document.getElementById('screen-gameover').classList.add('hidden');
  }
}
