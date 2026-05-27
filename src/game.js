const HS_KEY = 'pad-mokujin-hs';

function hsLoad() {
  try { return JSON.parse(localStorage.getItem(HS_KEY)) || {}; } catch(_) { return {}; }
}
function hsSave(data) {
  try { localStorage.setItem(HS_KEY, JSON.stringify(data)); } catch(_) {}
}

class GameEngine {
  constructor(xhb, ui, input, sound) {
    this.xhb   = xhb;
    this.ui    = ui;
    this.input = input;
    this.sound = sound;
    this.aoe   = new AoeEngine(input, ui);

    this.onGameOver = null;

    this.difficulty = 'normal';
    this.state      = 'idle'; // 'idle' | 'showing' | 'feedback' | 'paused' | 'gameover'

    this.remainingMs  = GAME_DURATION_MS;
    this.isBurst      = false;
    this.gaugeLevel   = 0;
    this.gaugeProgress = 0;
    this.score        = 0;
    this.combo        = 0;
    this.maxCombo     = 0;
    this.hits         = 0;
    this.total        = 0;

    this.greatCount    = 0;
    this.goodCount     = 0;
    this.missCount     = 0;
    this.pureStreak    = 0;
    this.maxPureStreak = 0;
    this.slotStats     = Object.fromEntries(SLOT_IDS.map(id => [id, { greats: 0, goods: 0, total: 0 }]));

    this.activeSlotId   = null;
    this._timeoutId     = null;
    this._feedbackId    = null;
    this._timerRaf      = null;
    this._timerStart    = 0;

    this._burstEndTime   = 0;
    this._burstRaf       = null;
    this._countdownRaf   = null;
    this._countdownStart = 0;
    this._countdownBase  = 0;

    this._pausedFromState    = null;
    this._pausedTimerRemaining = 0;
    this._pausedCountdownMs  = 0;
    this._pausedBurstMs      = 0;

    this._pendingSlotId     = null;
    this._pendingTimerStart = 0;
    this._pendingTimerRaf   = null;
    this._halfTimeId        = null;
    this._burstSoundId      = null;
    this._aoeEndId          = null;
  }

  getBestScore(difficulty) {
    return hsLoad()[difficulty] || 0;
  }

  start(difficulty) {
    this.state = 'gameover';
    clearTimeout(this._timeoutId);
    clearTimeout(this._feedbackId);
    clearTimeout(this._halfTimeId);
    clearTimeout(this._burstSoundId);
    clearTimeout(this._aoeEndId);
    if (this._timerRaf)       { cancelAnimationFrame(this._timerRaf);       this._timerRaf       = null; }
    if (this._pendingTimerRaf){ cancelAnimationFrame(this._pendingTimerRaf); this._pendingTimerRaf = null; }
    if (this._burstRaf)       { cancelAnimationFrame(this._burstRaf);        this._burstRaf       = null; }
    if (this._countdownRaf)   { cancelAnimationFrame(this._countdownRaf);    this._countdownRaf   = null; }
    this.input.stop();

    this.difficulty   = difficulty;
    this.remainingMs  = GAME_DURATION_MS;
    this.isBurst      = false;
    this.gaugeLevel   = 0;
    this.gaugeProgress = 0;
    this.score        = 0;
    this.combo        = 0;
    this.maxCombo     = 0;
    this.hits         = 0;
    this.total        = 0;
    this.greatCount    = 0;
    this.goodCount     = 0;
    this.missCount     = 0;
    this.pureStreak    = 0;
    this.maxPureStreak = 0;
    this.slotStats     = Object.fromEntries(SLOT_IDS.map(id => [id, { greats: 0, goods: 0, total: 0 }]));
    this.activeSlotId       = null;
    this._pendingSlotId     = null;
    this._pendingTimerStart = 0;
    this._halfTimeId        = null;

    this.input.onInput         = (slotId) => this._onInput(slotId);
    this.input.onStickUpdate   = (l, r)   => this.ui.updateStickCursors(l, r);
    this.input.onTriggerChange = (side)   => this.xhb.setHalfActive(side);
    this.input.start();

    this.aoe.onHit   = () => this._onAoeHit();
    this.aoe.onDodge = (side) => this._onAoeDodge(side);
    this.aoe.start();

    this.ui.updateAll(this);
    this.ui.setTimerFill(0);
    this.ui.setBurstState(false);
    this._tickCountdown();

    this._nextSlot();
    this.sound.startRhythm(false);
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
    clearTimeout(this._burstSoundId);
    clearTimeout(this._aoeEndId);
    this._halfTimeId   = null;
    this._burstSoundId = null;
    this._aoeEndId     = null;
    if (this._timerRaf)       { cancelAnimationFrame(this._timerRaf);       this._timerRaf       = null; }
    if (this._pendingTimerRaf){ cancelAnimationFrame(this._pendingTimerRaf); this._pendingTimerRaf = null; }
    if (this._burstRaf)       { cancelAnimationFrame(this._burstRaf);        this._burstRaf       = null; }
    if (this._countdownRaf)   { cancelAnimationFrame(this._countdownRaf);    this._countdownRaf   = null; }
    this._pendingSlotId = null;
    this.isBurst = false;
    this.xhb.clearAllStates();
    this.ui.clearEffects();
    this.sound.stopRhythm();
  }

  pause() {
    if (this.state === 'gameover' || this.state === 'paused' || this.state === 'idle') return;

    this._pausedFromState = this.state;
    this.state = 'paused';

    clearTimeout(this._timeoutId);
    clearTimeout(this._feedbackId);
    clearTimeout(this._halfTimeId);
    clearTimeout(this._burstSoundId);
    this._halfTimeId   = null;
    this._burstSoundId = null;
    if (this._timerRaf)       { cancelAnimationFrame(this._timerRaf);       this._timerRaf       = null; }
    if (this._pendingTimerRaf){ cancelAnimationFrame(this._pendingTimerRaf); this._pendingTimerRaf = null; }
    this._pendingSlotId = null;

    const totalMs = this._getTimeMs();
    this._pausedTimerRemaining = this._pausedFromState === 'showing'
      ? Math.max(0, totalMs - (Date.now() - this._timerStart))
      : 0;

    if (this._countdownRaf) { cancelAnimationFrame(this._countdownRaf); this._countdownRaf = null; }
    this._pausedCountdownMs = Math.max(0, this._countdownBase - (Date.now() - this._countdownStart));

    if (this._burstRaf) { cancelAnimationFrame(this._burstRaf); this._burstRaf = null; }
    this._pausedBurstMs = this.isBurst ? Math.max(0, this._burstEndTime - Date.now()) : 0;

    this.input.onStickUpdate   = null;
    this.input.onTriggerChange = null;
    this.input.stop();
    this.xhb.setHalfActive(null);
    this.aoe.stop();
    this.sound.stopRhythm();
  }

  resume() {
    if (this.state !== 'paused') return;

    this.input.onInput         = (slotId) => this._onInput(slotId);
    this.input.onStickUpdate   = (l, r)   => this.ui.updateStickCursors(l, r);
    this.input.onTriggerChange = (side)   => this.xhb.setHalfActive(side);
    this.input.start();

    this.aoe.onHit   = () => this._onAoeHit();
    this.aoe.onDodge = (side) => this._onAoeDodge(side);
    this.aoe.start();
    this.sound.startRhythm(this.isBurst);

    this.remainingMs = this._pausedCountdownMs;
    this._tickCountdown();

    if (this.isBurst) {
      this._burstEndTime = Date.now() + this._pausedBurstMs;
      this._resumeBurstRaf();
    }

    if (this._pausedFromState === 'showing') {
      this.state = 'showing';
      const remaining = this._pausedTimerRemaining;
      const totalMs   = this._getTimeMs();
      this._timerStart = Date.now() - (totalMs - remaining);
      this._runTimer(totalMs);
      this._halfTimeId = setTimeout(() => this._onGaugeFull(), remaining);
      this._timeoutId  = setTimeout(() => this._onTimeout(), remaining + totalMs);
    } else {
      this.total--;
      this._nextSlot();
    }
  }

  _getTimeMs() {
    const base = DIFFICULTIES[this.difficulty].timeMs;
    return this.isBurst ? Math.round(base / BURST_GCD_MULTIPLIER) : base;
  }

  _tickCountdown() {
    if (this._countdownRaf) cancelAnimationFrame(this._countdownRaf);
    this._countdownStart = Date.now();
    this._countdownBase  = this.remainingMs;
    const tick = () => {
      if (this.state === 'gameover' || this.state === 'paused') return;
      this.remainingMs = Math.max(0, this._countdownBase - (Date.now() - this._countdownStart));
      this.ui.setCountdown(this.remainingMs);
      if (this.remainingMs > 0) {
        this._countdownRaf = requestAnimationFrame(tick);
      } else {
        this._endGame('time_up');
      }
    };
    this._countdownRaf = requestAnimationFrame(tick);
  }

  _rearmCountdown() {
    this._countdownBase  = this.remainingMs;
    this._countdownStart = Date.now();
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
    this.slotStats[slotId].total++;

    this.state = 'showing';
    this.xhb.clearAllStates();
    this.xhb.setHalfActive(this.input.triggerSide);
    this.xhb.setSlotState(slotId, 'active');
    this.ui.showPrompt(SLOT_BY_ID[slotId]);

    const timeMs = this._getTimeMs();
    this._runTimer(timeMs);

    const elapsed        = Date.now() - this._timerStart;
    const gaugeRemaining = Math.max(0, timeMs - elapsed);
    this._halfTimeId = setTimeout(() => this._onGaugeFull(), gaugeRemaining);
    this._timeoutId  = setTimeout(() => this._onTimeout(),   gaugeRemaining + timeMs);
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
    if (this._pendingSlotId) return;

    const timeMs            = this._getTimeMs();
    this._pendingSlotId     = this._pickNextSlotId();
    this._pendingTimerStart = Date.now();
    this._startPendingTimer(timeMs);

    this.xhb.setSlotState(this._pendingSlotId, 'active');
  }

  _onInput(slotId) {
    if (this.state !== 'showing') return;
    const timeMs       = this._getTimeMs();
    const elapsedRatio = (Date.now() - this._timerStart) / timeMs;

    if (elapsedRatio < GREAT_RATIO_MIN) {
      this.xhb.setSlotFlash(slotId);
      return;
    }

    if (slotId !== this.activeSlotId) {
      this.xhb.setSlotFlash(slotId);
      return;
    }

    clearTimeout(this._timeoutId);
    clearTimeout(this._halfTimeId);
    this._halfTimeId = null;
    if (this._timerRaf) { cancelAnimationFrame(this._timerRaf); this._timerRaf = null; }

    const judgment = elapsedRatio <= 1.0 ? 'great' : 'good';
    this._processHit(judgment, elapsedRatio);
  }

  _onTimeout() {
    if (this.state !== 'showing') return;
    if (this._timerRaf) { cancelAnimationFrame(this._timerRaf); this._timerRaf = null; }
    this._processMiss();
  }

  _processHit(judgment, elapsedRatio) {
    clearTimeout(this._halfTimeId);
    this._halfTimeId = null;
    this.hits++;

    if (judgment === 'great') {
      this.greatCount++;
      this.pureStreak++;
      if (this.pureStreak > this.maxPureStreak) this.maxPureStreak = this.pureStreak;
      this.slotStats[this.activeSlotId].greats++;
    } else {
      this.goodCount++;
      this.slotStats[this.activeSlotId].goods++;
    }

    const baseScore = DIFFICULTIES[this.difficulty].baseScore;
    let pts;
    if (judgment === 'great') {
      pts = baseScore + 200;
    } else {
      const decayBonus = Math.max(0, Math.floor((2.0 - elapsedRatio) * 10) * 10);
      pts = baseScore + decayBonus;
    }
    if (this.isBurst) pts *= BURST_SCORE_MULTIPLIER;
    this.score += pts;

    if (judgment === 'great') {
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
      this._checkGaugeProgress();
    }

    this.state = 'feedback';
    const slotState = judgment === 'great' ? 'success' : 'success-good';
    this.xhb.setSlotState(this.activeSlotId, slotState);
    this.xhb.setSlotBurst(this.activeSlotId, judgment);
    this.xhb.setSlotRecast(this.activeSlotId, 1.0, 0);
    this.ui.setTimerFill(1);
    this.ui.updateAll(this);
    this.ui.flashEnemy('hit', this.combo);
    this.ui.showJudgment(judgment, pts);
    this.sound.playHit(this.combo, judgment, this.isBurst);

    this._feedbackId = setTimeout(() => {
      if (this.state !== 'gameover') this._nextSlot();
    }, FEEDBACK_SUCCESS_MS);
  }

  _checkGaugeProgress() {
    if (this.isBurst) return;

    if (this.gaugeLevel === LIMIT_GAUGE_COUNT) {
      this.sound.playGaugeMax();
      this._startBurst();
      this._burstSoundId = setTimeout(() => this.sound.playBurstStart(), 350);
      return;
    }

    this.gaugeProgress++;
    const threshold = LIMIT_GAUGE_THRESHOLDS[this.difficulty];
    if (this.gaugeProgress >= threshold) {
      this.gaugeLevel++;
      this.gaugeProgress = 0;
      if (this.gaugeLevel <= LIMIT_GAUGE_BONUS_MS.length) {
        const bonusMs = LIMIT_GAUGE_BONUS_MS[this.gaugeLevel - 1];
        this.remainingMs = Math.min(GAME_DURATION_MS, this.remainingMs + bonusMs);
        this._rearmCountdown();
        this.ui.showJudgment(`bonus${this.gaugeLevel}`);
      }
      this.sound.playCombo('gauge');
    }
  }

  _startBurst() {
    this.isBurst = true;
    this._burstEndTime = Date.now() + BURST_DURATION_MS;
    this.ui.setBurstState(true);
    this.sound.startRhythm(true);
    this._resumeBurstRaf();
  }

  _resumeBurstRaf() {
    if (this._burstRaf) cancelAnimationFrame(this._burstRaf);
    const tick = () => {
      if (!this.isBurst || this.state === 'gameover' || this.state === 'paused') return;
      const remaining = Math.max(0, this._burstEndTime - Date.now());
      this.ui.setBurstGauge(remaining / BURST_DURATION_MS);
      if (remaining > 0) {
        this._burstRaf = requestAnimationFrame(tick);
      } else {
        this._endBurst();
      }
    };
    this._burstRaf = requestAnimationFrame(tick);
  }

  _endBurst() {
    this.sound.playBurstEnd();
    this.sound.startRhythm(false);
    this.isBurst       = false;
    this.combo         = 0;
    this.gaugeLevel    = 0;
    this.gaugeProgress = 0;
    this.ui.setBurstState(false);
    this.ui.updateAll(this);
  }

  _processMiss() {
    if (!this.isBurst) {
      this.combo         = 0;
      this.gaugeLevel    = 0;
      this.gaugeProgress = 0;
    }
    this.missCount++;
    this.pureStreak = 0;
    this.remainingMs = Math.max(0, this.remainingMs - MISS_PENALTY_MS);
    this._rearmCountdown();

    this.state = 'feedback';
    this.xhb.setSlotState(this.activeSlotId, 'fail');
    this.xhb.setSlotRecast(this.activeSlotId, 1.0, 0);
    this.ui.setTimerFill(0);
    this.ui.updateAll(this);
    this.ui.flashEnemy('miss', 0);
    this.ui.showJudgment('miss', MISS_PENALTY_MS / 1000);
    this.sound.playMiss();

    this._feedbackId = setTimeout(() => {
      if (this.state === 'gameover') return;
      if (this.remainingMs <= 0) { this._endGame('time_up'); return; }
      this._nextSlot();
    }, FEEDBACK_FAIL_MS);
  }

  _onAoeDodge(side) {
    this.sound.playGimmickSuccess();
    this.ui.showGimmickSuccess(side);
  }

  _onAoeHit() {
    if (this.state === 'gameover') return;
    if (!this.isBurst) this.combo = 0;
    this.remainingMs = Math.max(0, this.remainingMs - MISS_PENALTY_MS);
    this._rearmCountdown();
    this.ui.updateAll(this);
    this.ui.flashEnemy('miss', 0);
    this.ui.showJudgment('miss', MISS_PENALTY_MS / 1000);
    this.sound.playMiss();
    if (this.remainingMs <= 0) {
      this._aoeEndId = setTimeout(() => { if (this.state !== 'gameover') this._endGame('time_up'); }, 50);
    }
  }

  _endGame(reason) {
    const hs    = hsLoad();
    const key   = this.difficulty;
    const prev  = hs[key] || 0;
    const isNew = this.score > prev;
    if (isNew) { hs[key] = this.score; hsSave(hs); }

    this.stop();
    this.sound.playTimeUpJingle();
    this.ui.showGameOver(this, reason, prev, isNew);
    if (this.onGameOver) this.onGameOver(reason);
  }
}
