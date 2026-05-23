const HS_KEY = 'pad-mokujin-hs';

function hsLoad() {
  try { return JSON.parse(localStorage.getItem(HS_KEY)) || {}; } catch(_) { return {}; }
}
function hsSave(data) {
  try { localStorage.setItem(HS_KEY, JSON.stringify(data)); } catch(_) {}
}
function hsKey(mode, difficulty) {
  return `${mode}__${difficulty}`;
}

class GameEngine {
  constructor(xhb, ui, input, sound) {
    this.xhb   = xhb;
    this.ui    = ui;
    this.input = input;
    this.sound = sound;
    this.aoe   = new AoeEngine(input, ui);

    this.onGameOver  = null;

    this.mode        = 'default';
    this.difficulty  = 'normal';
    this.state       = 'idle'; // 'idle' | 'showing' | 'feedback' | 'paused' | 'gameover'

    this.playerHp  = PLAYER_MAX_HP;
    this.enemyHp   = ENEMY_MAX_HP;
    this.score     = 0;
    this.combo     = 0;
    this.maxCombo  = 0;
    this.hits      = 0;
    this.total     = 0;

    this.activeSlotId   = null;
    this._timeoutId     = null;
    this._feedbackId    = null;
    this._timerRaf      = null;
    this._timerStart    = 0;
    this._scoreAtkRaf   = null;
    this._scoreAtkStart = 0;

    this._pausedFromState          = null;
    this._pausedTimerRemaining     = 0;
    this._pausedScoreAtkRemaining  = 0;

    this._pendingSlotId     = null;
    this._pendingTimerStart = 0;
    this._pendingTimerRaf   = null;
    this._halfTimeId        = null;
  }

  getBestScore(mode, difficulty) {
    return hsLoad()[hsKey(mode, difficulty)] || 0;
  }

  start(mode, difficulty) {
    // Cancel any leftovers from a previous run before resetting state
    this.state = 'gameover';
    clearTimeout(this._timeoutId);
    clearTimeout(this._feedbackId);
    clearTimeout(this._halfTimeId);
    if (this._timerRaf)       { cancelAnimationFrame(this._timerRaf);       this._timerRaf       = null; }
    if (this._scoreAtkRaf)    { cancelAnimationFrame(this._scoreAtkRaf);    this._scoreAtkRaf    = null; }
    if (this._pendingTimerRaf){ cancelAnimationFrame(this._pendingTimerRaf); this._pendingTimerRaf = null; }
    this.input.stop();

    this.mode       = mode;
    this.difficulty = difficulty;
    this.playerHp   = PLAYER_MAX_HP;
    this.enemyHp    = ENEMY_MAX_HP;
    this.score      = 0;
    this.combo      = 0;
    this.maxCombo   = 0;
    this.hits       = 0;
    this.total      = 0;
    this.activeSlotId       = null;
    this._pendingSlotId     = null;
    this._pendingTimerStart = 0;
    this._pendingTimerRaf   = null;
    this._halfTimeId        = null;

    this.input.onInput         = (slotId) => this._onInput(slotId);
    this.input.onStickUpdate   = (l, r)   => this.ui.updateStickCursors(l, r);
    this.input.onTriggerChange = (side)   => this.xhb.setHalfActive(side);
    this.input.start();

    this.aoe.onHit   = () => this._onAoeHit();
    this.aoe.onDodge = null;
    this.aoe.start();

    this.ui.updateAll(this);
    this.ui.setTimerFill(0);

    if (mode === 'score_attack') {
      this._scoreAtkStart = Date.now();
      this._tickScoreAtkTimer();
    }

    this._nextSlot();
  }

  stop() {
    this.state = 'gameover';
    this.aoe.stop();
    this.input.onStickUpdate   = null;
    this.input.onTriggerChange = null;
    this.input.stop();
    clearTimeout(this._timeoutId);
    clearTimeout(this._feedbackId);
    clearTimeout(this._halfTimeId);
    this._halfTimeId = null;
    if (this._timerRaf)       { cancelAnimationFrame(this._timerRaf);       this._timerRaf       = null; }
    if (this._scoreAtkRaf)    { cancelAnimationFrame(this._scoreAtkRaf);    this._scoreAtkRaf    = null; }
    if (this._pendingTimerRaf){ cancelAnimationFrame(this._pendingTimerRaf); this._pendingTimerRaf = null; }
    this._pendingSlotId = null;
    this.xhb.clearAllStates();
  }

  pause() {
    if (this.state === 'gameover' || this.state === 'paused' || this.state === 'idle') return;

    this._pausedFromState = this.state;
    this.state = 'paused';

    clearTimeout(this._timeoutId);
    clearTimeout(this._feedbackId);
    clearTimeout(this._halfTimeId);
    this._halfTimeId = null;
    if (this._timerRaf)       { cancelAnimationFrame(this._timerRaf);       this._timerRaf       = null; }
    if (this._scoreAtkRaf)    { cancelAnimationFrame(this._scoreAtkRaf);    this._scoreAtkRaf    = null; }
    if (this._pendingTimerRaf){ cancelAnimationFrame(this._pendingTimerRaf); this._pendingTimerRaf = null; }
    this._pendingSlotId = null;

    const totalMs = DIFFICULTIES[this.difficulty].timeMs;
    this._pausedTimerRemaining = this._pausedFromState === 'showing'
      ? Math.max(0, totalMs - (Date.now() - this._timerStart))
      : 0;
    this._pausedScoreAtkRemaining = this.mode === 'score_attack'
      ? Math.max(0, SCORE_ATTACK_MS - (Date.now() - this._scoreAtkStart))
      : 0;

    this.input.onStickUpdate   = null;
    this.input.onTriggerChange = null;
    this.input.stop();
    this.xhb.setHalfActive(null);
    this.aoe.stop();
  }

  resume() {
    if (this.state !== 'paused') return;

    this.input.onInput         = (slotId) => this._onInput(slotId);
    this.input.onStickUpdate   = (l, r)   => this.ui.updateStickCursors(l, r);
    this.input.onTriggerChange = (side)   => this.xhb.setHalfActive(side);
    this.input.start();

    this.aoe.onHit   = () => this._onAoeHit();
    this.aoe.onDodge = null;
    this.aoe.start();

    if (this.mode === 'score_attack') {
      this._scoreAtkStart = Date.now() - (SCORE_ATTACK_MS - this._pausedScoreAtkRemaining);
      this._tickScoreAtkTimer();
    }

    if (this._pausedFromState === 'showing') {
      this.state = 'showing';
      const remaining = this._pausedTimerRemaining;
      const totalMs   = DIFFICULTIES[this.difficulty].timeMs;
      this._timerStart = Date.now() - (totalMs - remaining);
      this._runTimer(totalMs);
      this._halfTimeId = setTimeout(() => this._onGaugeFull(), remaining);
      this._timeoutId  = setTimeout(() => this._onTimeout(), remaining + totalMs);
    } else {
      // Was in feedback; go to next slot (total will increment, which is acceptable)
      if (this.mode === 'default' && this.playerHp <= 0) {
        this._endGame('hp_zero');
      } else {
        this.total--;
        this._nextSlot();
      }
    }
  }

  _pickNextSlotId() {
    let slotId;
    do {
      slotId = SLOT_IDS[Math.floor(Math.random() * SLOT_IDS.length)];
    } while (slotId === this.activeSlotId && SLOT_IDS.length > 1);
    return slotId;
  }

  _nextSlot() {
    this.total++;

    let slotId;
    if (this._pendingSlotId) {
      // pending スロットを引き継ぐ（ゲージはすでに進んでいる）
      slotId = this._pendingSlotId;
      this._timerStart = this._pendingTimerStart;
      this._pendingSlotId = null;
      this._pendingTimerStart = 0;
      if (this._pendingTimerRaf) { cancelAnimationFrame(this._pendingTimerRaf); this._pendingTimerRaf = null; }
    } else {
      slotId = this._pickNextSlotId();
      this._timerStart = Date.now();
    }
    this.activeSlotId = slotId;

    this.state = 'showing';
    this.xhb.clearAllStates();
    this.xhb.setSlotState(slotId, 'active');
    this.ui.showPrompt(SLOT_BY_ID[slotId]);

    const timeMs = DIFFICULTIES[this.difficulty].timeMs;
    this._runTimer(timeMs);

    const elapsed       = Date.now() - this._timerStart;
    const gaugeRemaining = Math.max(0, timeMs - elapsed);
    this._halfTimeId = setTimeout(() => this._onGaugeFull(), gaugeRemaining);
    this._timeoutId  = setTimeout(() => this._onTimeout(), gaugeRemaining + timeMs);
  }

  _runTimer(totalMs) {
    if (this._timerRaf) { cancelAnimationFrame(this._timerRaf); this._timerRaf = null; }
    const tick = () => {
      if (this.state !== 'showing') return;
      const elapsed      = Date.now() - this._timerStart;
      const ratio        = Math.max(0, 1 - elapsed / totalMs);
      const elapsedRatio = 1 - ratio;
      const remainingMs  = Math.max(0, totalMs - elapsed);
      this.ui.setTimerFill(ratio);
      this.xhb.setSlotRecast(this.activeSlotId, elapsedRatio, remainingMs);
      if (ratio > 0) this._timerRaf = requestAnimationFrame(tick);
    };
    this._timerRaf = requestAnimationFrame(tick);
  }

  _startPendingTimer(totalMs) {
    if (this._pendingTimerRaf) { cancelAnimationFrame(this._pendingTimerRaf); this._pendingTimerRaf = null; }
    const tick = () => {
      if (this.state === 'idle' || this.state === 'paused' || this.state === 'gameover') return;
      const elapsed      = Date.now() - this._pendingTimerStart;
      const ratio        = Math.max(0, 1 - elapsed / totalMs);
      const elapsedRatio = 1 - ratio;
      const remainingMs  = Math.max(0, totalMs - elapsed);
      this.xhb.setSlotRecast(this._pendingSlotId, elapsedRatio, remainingMs);
      if (ratio > 0) this._pendingTimerRaf = requestAnimationFrame(tick);
    };
    this._pendingTimerRaf = requestAnimationFrame(tick);
  }

  _onGaugeFull() {
    if (this.state !== 'showing') return;
    if (this._pendingSlotId) return; // 二重発火防止

    const timeMs           = DIFFICULTIES[this.difficulty].timeMs;
    this._pendingSlotId    = this._pickNextSlotId();
    this._pendingTimerStart = Date.now();
    this._startPendingTimer(timeMs);

    // 次のスロットをゲージ付きで表示（現在のスロットはまだ押せる）
    this.xhb.setSlotState(this._pendingSlotId, 'active');
  }

  _tickScoreAtkTimer() {
    const tick = () => {
      if (this.state === 'gameover') return;
      const remaining = Math.max(0, SCORE_ATTACK_MS - (Date.now() - this._scoreAtkStart));
      this.ui.setScoreAtkTimer(remaining);
      if (remaining > 0) {
        this._scoreAtkRaf = requestAnimationFrame(tick);
      } else {
        this._endGame('time_up');
      }
    };
    this._scoreAtkRaf = requestAnimationFrame(tick);
  }

  _onInput(slotId) {
    if (this.state !== 'showing') return;
    const totalMs      = DIFFICULTIES[this.difficulty].timeMs;
    const elapsedRatio = Math.min(1, (Date.now() - this._timerStart) / totalMs);

    if (elapsedRatio < 0.75) {
      this.xhb.setSlotFlash(slotId); // 早押し: 白フラッシュのみ
      return;
    }

    if (slotId !== this.activeSlotId) {
      this.xhb.setSlotFlash(slotId); // 誤ボタン: 白フラッシュのみ（失敗扱いなし）
      return;
    }

    clearTimeout(this._timeoutId);
    clearTimeout(this._halfTimeId);
    this._halfTimeId = null;
    if (this._timerRaf) { cancelAnimationFrame(this._timerRaf); this._timerRaf = null; }
    this._processHit();
  }

  _onTimeout() {
    if (this.state !== 'showing') return;
    if (this._timerRaf) { cancelAnimationFrame(this._timerRaf); this._timerRaf = null; }
    this._processMiss();
  }

  _processHit() {
    clearTimeout(this._halfTimeId);
    this._halfTimeId = null;
    this.combo++;
    this.hits++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    const mult = Math.min(this.combo, MAX_COMBO_MULTIPLIER);
    this.score += BASE_SCORE_PER_HIT * mult;
    this.enemyHp = Math.max(0, this.enemyHp - 1);

    this.state = 'feedback';
    this.xhb.setSlotState(this.activeSlotId, 'success');
    this.xhb.setSlotRecast(this.activeSlotId, 1.0, 0);
    this.ui.setTimerFill(1);
    this.ui.updateAll(this);
    this.ui.flashEnemy('hit', this.combo);

    this.sound.playHit(this.combo);
    this.sound.playCombo(this.combo);

    if (this.enemyHp <= 0) this.enemyHp = ENEMY_MAX_HP;

    this._feedbackId = setTimeout(() => {
      if (this.state !== 'gameover') this._nextSlot();
    }, FEEDBACK_SUCCESS_MS);
  }

  _processMiss() {
    this.combo = 0;

    if (this.mode === 'default') {
      this.playerHp = Math.max(0, this.playerHp - 1);
    }

    this.state = 'feedback';
    this.xhb.setSlotState(this.activeSlotId, 'fail');
    this.xhb.setSlotRecast(this.activeSlotId, 1.0, 0);
    this.ui.setTimerFill(0);
    this.ui.updateAll(this);
    this.ui.flashEnemy('miss', 0);

    this.sound.playMiss();

    this._feedbackId = setTimeout(() => {
      if (this.state === 'gameover') return;
      if (this.mode === 'default' && this.playerHp <= 0) {
        this._endGame('hp_zero');
      } else {
        this._nextSlot();
      }
    }, FEEDBACK_FAIL_MS);
  }

  _onAoeHit() {
    if (this.state === 'gameover') return;
    this.combo = 0;

    if (this.mode === 'default') {
      this.playerHp = Math.max(0, this.playerHp - 1);
    }

    this.ui.updateAll(this);
    this.ui.flashEnemy('miss', 0);
    this.sound.playMiss();

    if (this.mode === 'default' && this.playerHp <= 0) {
      setTimeout(() => {
        if (this.state !== 'gameover') this._endGame('hp_zero');
      }, 50);
    }
  }

  _endGame(reason) {
    // Check and save highscore
    const hs    = hsLoad();
    const key   = hsKey(this.mode, this.difficulty);
    const prev  = hs[key] || 0;
    const isNew = this.score > prev;
    if (isNew) { hs[key] = this.score; hsSave(hs); }

    this.stop();

    if (reason === 'time_up') {
      this.sound.playClear();
    } else {
      this.sound.playGameOver();
    }

    this.ui.showGameOver(this, reason, prev, isNew);
    if (this.onGameOver) this.onGameOver(reason);
  }
}
