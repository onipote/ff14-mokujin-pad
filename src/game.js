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

    this.mode        = 'default';
    this.difficulty  = 'normal';
    this.state       = 'idle'; // 'idle' | 'showing' | 'feedback' | 'gameover'

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
  }

  getBestScore(mode, difficulty) {
    return hsLoad()[hsKey(mode, difficulty)] || 0;
  }

  start(mode, difficulty) {
    // Cancel any leftovers from a previous run before resetting state
    this.state = 'gameover';
    clearTimeout(this._timeoutId);
    clearTimeout(this._feedbackId);
    if (this._timerRaf)    { cancelAnimationFrame(this._timerRaf);    this._timerRaf    = null; }
    if (this._scoreAtkRaf) { cancelAnimationFrame(this._scoreAtkRaf); this._scoreAtkRaf = null; }
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
    this.activeSlotId = null;

    this.input.onInput       = (slotId) => this._onInput(slotId);
    this.input.onStickUpdate = (l, r)   => this.ui.updateStickCursors(l, r);
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
    this.input.onStickUpdate = null;
    this.input.stop();
    clearTimeout(this._timeoutId);
    clearTimeout(this._feedbackId);
    if (this._timerRaf)    { cancelAnimationFrame(this._timerRaf);    this._timerRaf    = null; }
    if (this._scoreAtkRaf) { cancelAnimationFrame(this._scoreAtkRaf); this._scoreAtkRaf = null; }
    this.xhb.clearAllStates();
  }

  _nextSlot() {
    this.total++;

    // Pick a random slot, avoiding the same one twice in a row
    let slotId;
    do {
      slotId = SLOT_IDS[Math.floor(Math.random() * SLOT_IDS.length)];
    } while (slotId === this.activeSlotId && SLOT_IDS.length > 1);
    this.activeSlotId = slotId;

    this.state = 'showing';
    this.xhb.clearAllStates();
    this.xhb.setSlotState(slotId, 'active');
    this.ui.showPrompt(SLOT_BY_ID[slotId]);

    const timeMs = DIFFICULTIES[this.difficulty].timeMs;
    this._timerStart = Date.now();
    this._runTimer(timeMs);
    this._timeoutId = setTimeout(() => this._onTimeout(), timeMs);
  }

  _runTimer(totalMs) {
    const tick = () => {
      if (this.state !== 'showing') return;
      const ratio = Math.max(0, 1 - (Date.now() - this._timerStart) / totalMs);
      this.ui.setTimerFill(ratio);
      if (ratio > 0) this._timerRaf = requestAnimationFrame(tick);
    };
    this._timerRaf = requestAnimationFrame(tick);
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
    clearTimeout(this._timeoutId);
    if (this._timerRaf) { cancelAnimationFrame(this._timerRaf); this._timerRaf = null; }

    if (slotId === this.activeSlotId) {
      this._processHit();
    } else {
      this._processMiss();
    }
  }

  _onTimeout() {
    if (this.state !== 'showing') return;
    if (this._timerRaf) { cancelAnimationFrame(this._timerRaf); this._timerRaf = null; }
    this._processMiss();
  }

  _processHit() {
    this.combo++;
    this.hits++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    const mult = Math.min(this.combo, MAX_COMBO_MULTIPLIER);
    this.score += BASE_SCORE_PER_HIT * mult;
    this.enemyHp = Math.max(0, this.enemyHp - 1);

    this.state = 'feedback';
    this.xhb.setSlotState(this.activeSlotId, 'success');
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
  }
}
