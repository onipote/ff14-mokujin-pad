# Plan: ゲームモード統合リファクタリング

## Context

フリーモードとスコアアタックモードを廃止し、「90秒カウントダウン・ミスで-5s・GREAT/GOOD/MISS判定・コンボ→バーストタイム」という単一ルールに統合する。HPゲージを削除し、コンボゲージ・残り時間・フローティング判定テキストを追加する。

---

## 実装順序

### 1. `src/constants.js`

**削除:**
- `PLAYER_MAX_HP`, `ENEMY_MAX_HP`, `BASE_SCORE_PER_HIT`, `MAX_COMBO_MULTIPLIER`, `SCORE_ATTACK_MS`

**追加:**
```js
const GAME_DURATION_MS       = 90_000;
const MISS_PENALTY_MS        = 5_000;
const COMBO_BONUS_THRESHOLD  = 10;   // combo 10 → +2s
const COMBO_BONUS_MS         = 2_000;
const BURST_THRESHOLD        = 20;   // combo 20 → burst
const BURST_DURATION_MS      = 10_000;
const BURST_GCD_MULTIPLIER   = 1.2;  // GCD速度倍率（時間を割る）
const BURST_SCORE_MULTIPLIER = 2;
const GREAT_RATIO_MIN        = 0.75; // GREAT窓開始
// GOOD窓: elapsedRatio > 1.0 (pendingスロット期間)
// スコア: Math.round(timeMs / 10) pts/hit、最小単位10
```

---

### 2. `index.html`

**スタート画面 — MODEセクション削除:**
```html
<!-- 削除 -->
<div class="setting-row">
  <div class="setting-label">MODE</div>
  <div class="btn-group" id="mode-btns">...</div>
</div>
```
ヒントテキストも `↑↓: セクション移動` → `←→: 選択変更 ✕: 決定` に修正。

**Info Bar — 全面置き換え:**
```html
<div id="info-bar">
  <!-- 左: コンボゲージ -->
  <div class="info-section">
    <div class="label-sm">COMBO</div>
    <div id="combo-gauge-wrap" class="combo-gauge-wrap">
      <div id="combo-gauge-fill" class="combo-gauge-fill"></div>
    </div>
    <div id="combo-val"></div>
  </div>
  <!-- 中央: スコア + フローティング判定テキスト -->
  <div class="info-section info-section--center">
    <div id="score-val">0</div>
    <div id="judgment-float" class="judgment-float-container"></div>
  </div>
  <!-- 右: カウントダウン -->
  <div class="info-section info-section--right">
    <div class="label-sm">残り時間</div>
    <div id="countdown-val" class="countdown-val">90</div>
  </div>
</div>
```

---

### 3. `styles/main.css`

**削除:** `.hp-bar`, `.hp-bar-wrap`, `.hp-bar--player`, `.hp-bar--enemy`, `--hp-player`, `--hp-enemy`, `#score-atk-timer` 関連ルール

**追加:**
```css
/* コンボゲージ */
.combo-gauge-wrap { width: 140px; height: 8px; background: #0d1a1a;
  border-radius: 2px; overflow: hidden; border: 1px solid rgba(53,175,192,0.35); }
.combo-gauge-fill { height: 100%; background: var(--teal); border-radius: 2px;
  transition: width 0.1s ease; }
.combo-gauge-wrap.combo-gauge--burst .combo-gauge-fill {
  background: linear-gradient(90deg, var(--gold), #ffe080);
  box-shadow: 0 0 10px rgba(220,190,70,0.7);
  animation: burst-pulse 0.5s ease-in-out infinite alternate; }
@keyframes burst-pulse {
  from { box-shadow: 0 0 6px rgba(220,190,70,0.5); }
  to   { box-shadow: 0 0 18px rgba(220,190,70,0.9); } }

/* カウントダウン */
.countdown-val { font-size: 36px; font-weight: 700; font-family: 'Cinzel',serif;
  color: var(--gold-bright); line-height: 1; min-width: 60px; text-align: center; }
.countdown-val.countdown--urgent { color: var(--timer-low);
  animation: record-pulse 0.5s ease-in-out infinite alternate; }

/* フローティング判定テキスト */
.judgment-float-container { position: relative; height: 0; overflow: visible;
  pointer-events: none; }
.judgment-float { position: absolute; left: 50%; transform: translateX(-50%);
  white-space: nowrap; font-size: 16px; font-weight: 700; letter-spacing: 0.1em;
  -webkit-text-stroke: 2px #000; paint-order: stroke fill;
  animation: judgment-rise 0.9s ease-out forwards; pointer-events: none; }
.judgment-float--great { color: #ffe080; }
.judgment-float--good  { color: #80e8ff; }
.judgment-float--miss  { color: #ff6060; }
.judgment-float--bonus { color: #80ff90; font-size: 14px; }
@keyframes judgment-rise {
  0%   { opacity: 1; transform: translateX(-50%) translateY(0); }
  60%  { opacity: 1; transform: translateX(-50%) translateY(-28px); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-48px); } }

/* GOOD スロット状態 (xhb) */
.xhb-slot--success-good { background: rgba(45,120,185,0.15);
  border: 2px solid #3590cc; box-shadow: 0 0 18px rgba(53,145,205,0.6); }
.xhb-slot--success-good .slot-sym { color: #70c8e8; }
```

---

### 4. `src/ui.js`

**コンストラクタ — 変更:**
- 削除: `this._playerHpBar`, `this._enemyHpBar`, `this._scoreAtkEl`
- 追加:
```js
this._comboGaugeWrap = document.getElementById('combo-gauge-wrap');
this._comboGaugeFill = document.getElementById('combo-gauge-fill');
this._countdownEl    = document.getElementById('countdown-val');
this._judgmentEl     = document.getElementById('judgment-float');
```

**`updateAll(engine)` — 書き換え:**
```js
updateAll(engine) {
  this._scoreEl.textContent = engine.score;
  const ratio = Math.min(1, engine.combo / BURST_THRESHOLD);
  this._comboGaugeFill.style.width = (ratio * 100) + '%';
  this._comboEl.textContent = engine.combo >= 1 ? `COMBO ${engine.combo}` : '';
}
```

**削除メソッド:** `setScoreAtkTimer()`, `showScoreAtkTimer()`

**新規メソッド:**
```js
setCountdown(ms) {
  this._countdownEl.textContent = Math.ceil(ms / 1000);
  this._countdownEl.classList.toggle('countdown--urgent', ms < 10_000);
}

setBurstState(active) {
  this._comboGaugeWrap.classList.toggle('combo-gauge--burst', active);
}

setBurstGauge(ratio) {  // ratio: 1.0→0.0 (バースト中ドレイン)
  this._comboGaugeFill.style.width = (ratio * 100) + '%';
}

showJudgment(type) {  // 'great' | 'good' | 'miss' | 'bonus'
  const labels = { great: '◎ GREAT', good: '○ GOOD', miss: '✕ MISS' };
  const el = document.createElement('div');
  el.className = `judgment-float judgment-float--${type}`;
  el.textContent = type === 'bonus' ? '+2s' : labels[type];
  this._judgmentEl.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
```

**`flashEnemy()` — `MAX_COMBO_MULTIPLIER` 参照を削除:**
```js
// (combo > 0 && combo % MAX_COMBO_MULTIPLIER === 0) → (combo === BURST_THRESHOLD || combo === COMBO_BONUS_THRESHOLD)
const anim = (combo === BURST_THRESHOLD || combo === COMBO_BONUS_THRESHOLD) ? 'enemy-bounce' : 'enemy-shake';
```

**`showGameOver()` — HPゼロ分岐を削除、`time_up`のみ `TIME UP!`:**
```js
heading.textContent = 'TIME UP!';  // 常にTIME UP (HPゼロ終了なし)
```

---

### 5. `src/xhb.js`

`setSlotState()` は既存コードのまま動作する（クラス名を文字列連結しているため `success-good` はそのまま通る）。CSSに `.xhb-slot--success-good` を追加するだけで対応可能。

---

### 6. `src/game.js`

#### コンストラクタ変更
削除: `this.mode`, `this.playerHp`, `this.enemyHp`, `this._scoreAtkRaf`, `this._scoreAtkStart`, `this._pausedScoreAtkRemaining`

追加:
```js
this.remainingMs           = GAME_DURATION_MS;
this.isBurst               = false;
this._burstEndTime         = 0;
this._burstRaf             = null;
this._countdownRaf         = null;
this._countdownStart       = 0;
this._countdownBase        = 0;
this._pausedCountdownMs    = 0;
this._pausedBurstMs        = 0;
```

#### `getBestScore(difficulty)` → キーをdifficultyのみに変更
```js
getBestScore(difficulty) { return hsLoad()[difficulty] || 0; }
```
`hsKey()` 関数削除。

#### `start(difficulty)` — modeパラメータ削除
```js
start(difficulty) {
  // ... 既存のクリーンアップ処理 ...
  // 新規: burstRAFもキャンセル
  if (this._burstRaf)    { cancelAnimationFrame(this._burstRaf);    this._burstRaf    = null; }
  if (this._countdownRaf){ cancelAnimationFrame(this._countdownRaf); this._countdownRaf = null; }
  this.isBurst = false;

  this.difficulty  = difficulty;
  this.remainingMs = GAME_DURATION_MS;
  this.score = this.combo = this.maxCombo = this.hits = this.total = 0;
  // playerHp, enemyHp の初期化を削除

  // ... input/aoe セットアップ（既存のまま） ...
  this._tickCountdown();
  this._nextSlot();
}
```

#### 新規メソッド `_tickCountdown()`
```js
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
```

#### `stop()` — burst/countdown追加
```js
if (this._burstRaf)    { cancelAnimationFrame(this._burstRaf);    this._burstRaf    = null; }
if (this._countdownRaf){ cancelAnimationFrame(this._countdownRaf); this._countdownRaf = null; }
this.isBurst = false;
// _scoreAtkRaf のキャンセルを削除
```

#### `pause()` — score attackタイマー → countdownに変更
```js
// 削除: _scoreAtkRaf のキャンセル
// 削除: _pausedScoreAtkRemaining の計算
// 追加:
if (this._countdownRaf){ cancelAnimationFrame(this._countdownRaf); this._countdownRaf = null; }
this._pausedCountdownMs = Math.max(0, this._countdownBase - (Date.now() - this._countdownStart));
if (this._burstRaf) { cancelAnimationFrame(this._burstRaf); this._burstRaf = null; }
this._pausedBurstMs = this.isBurst ? Math.max(0, this._burstEndTime - Date.now()) : 0;
```

#### `resume()` — score attack分岐削除、countdown/burst復元
```js
// 削除: if (this.mode === 'score_attack') { ... } ブロック全体
// 削除: if (this.playerHp <= 0 && this.mode === 'score_attack') チェック
// 追加:
this.remainingMs = this._pausedCountdownMs;
this._tickCountdown();
if (this.isBurst) {
  this._burstEndTime = Date.now() + this._pausedBurstMs;
  this._resumeBurstRaf();
}
// feedback状態から復帰の場合:
if (this._pausedFromState === 'feedback') {
  this.total--;
  this._nextSlot();
}
```

#### `_nextSlot()` — burstでGCD速度変更
```js
_nextSlot() {
  this.total++;
  // ... pendingスロット引き継ぎ処理（既存のまま） ...

  const baseTimeMs = DIFFICULTIES[this.difficulty].timeMs;
  const timeMs = this.isBurst ? Math.round(baseTimeMs / BURST_GCD_MULTIPLIER) : baseTimeMs;
  this._runTimer(timeMs);

  const elapsed        = Date.now() - this._timerStart;
  const gaugeRemaining = Math.max(0, timeMs - elapsed);
  this._halfTimeId = setTimeout(() => this._onGaugeFull(), gaugeRemaining);
  this._timeoutId  = setTimeout(() => this._onTimeout(),   gaugeRemaining + timeMs);
}
```

`_onGaugeFull()` 内の `timeMs` 取得も同様にburst考慮:
```js
const baseTimeMs = DIFFICULTIES[this.difficulty].timeMs;
const timeMs = this.isBurst ? Math.round(baseTimeMs / BURST_GCD_MULTIPLIER) : baseTimeMs;
```

#### `_onInput()` — GREAT/GOOD判定追加
```js
_onInput(slotId) {
  if (this.state !== 'showing') return;
  const baseTimeMs   = DIFFICULTIES[this.difficulty].timeMs;
  const timeMs       = this.isBurst ? Math.round(baseTimeMs / BURST_GCD_MULTIPLIER) : baseTimeMs;
  const elapsedRatio = (Date.now() - this._timerStart) / timeMs; // ← Math.min(1,...) を削除

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
  this._processHit(judgment);
}
```

#### `_processHit(judgment)` — 全面書き換え
```js
_processHit(judgment) {
  clearTimeout(this._halfTimeId);
  this._halfTimeId = null;
  this.hits++;

  const baseTimeMs = DIFFICULTIES[this.difficulty].timeMs;
  let pts = Math.round(baseTimeMs / 10);
  if (this.isBurst) pts *= BURST_SCORE_MULTIPLIER;
  this.score += pts;

  if (judgment === 'great') {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this._checkComboMilestones();
  }
  // GOOD: combo変化なし

  this.state = 'feedback';
  const slotState = judgment === 'great' ? 'success' : 'success-good';
  this.xhb.setSlotState(this.activeSlotId, slotState);
  this.xhb.setSlotRecast(this.activeSlotId, 1.0, 0);
  this.ui.setTimerFill(1);
  this.ui.updateAll(this);
  this.ui.flashEnemy('hit', this.combo);
  this.ui.showJudgment(judgment);
  this.sound.playHit(this.combo, judgment);

  this._feedbackId = setTimeout(() => {
    if (this.state !== 'gameover') this._nextSlot();
  }, FEEDBACK_SUCCESS_MS);
}
```

#### 新規メソッド `_checkComboMilestones()`
```js
_checkComboMilestones() {
  if (this.combo === COMBO_BONUS_THRESHOLD) {
    this.remainingMs = Math.min(GAME_DURATION_MS, this.remainingMs + COMBO_BONUS_MS);
    this._rearmCountdown();
    this.ui.showJudgment('bonus');
    this.sound.playCombo(this.combo);
  }
  if (this.combo === BURST_THRESHOLD && !this.isBurst) {
    this._startBurst();
    this.sound.playCombo(this.combo);
  }
}
```

#### 新規メソッド `_startBurst()`, `_resumeBurstRaf()`, `_endBurst()`
```js
_startBurst() {
  this.isBurst = true;
  this._burstEndTime = Date.now() + BURST_DURATION_MS;
  this.ui.setBurstState(true);
  this._resumeBurstRaf();
}

_resumeBurstRaf() {
  if (this._burstRaf) cancelAnimationFrame(this._burstRaf);
  const totalMs = BURST_DURATION_MS;
  const tick = () => {
    if (!this.isBurst || this.state === 'gameover' || this.state === 'paused') return;
    const remaining = Math.max(0, this._burstEndTime - Date.now());
    this.ui.setBurstGauge(remaining / totalMs);
    if (remaining > 0) {
      this._burstRaf = requestAnimationFrame(tick);
    } else {
      this._endBurst();
    }
  };
  this._burstRaf = requestAnimationFrame(tick);
}

_endBurst() {
  this.isBurst = false;
  this.combo   = 0;
  this.ui.setBurstState(false);
  this.ui.setBurstGauge(0);
  this.ui.updateAll(this);
}
```

#### `_processMiss()` — HP → 時間ペナルティに変更
```js
_processMiss() {
  if (!this.isBurst) this.combo = 0;
  this.remainingMs = Math.max(0, this.remainingMs - MISS_PENALTY_MS);
  this._rearmCountdown();

  this.state = 'feedback';
  this.xhb.setSlotState(this.activeSlotId, 'fail');
  this.xhb.setSlotRecast(this.activeSlotId, 1.0, 0);
  this.ui.setTimerFill(0);
  this.ui.updateAll(this);
  this.ui.flashEnemy('miss', 0);
  this.ui.showJudgment('miss');
  this.sound.playMiss();

  this._feedbackId = setTimeout(() => {
    if (this.state === 'gameover') return;
    if (this.remainingMs <= 0) { this._endGame('time_up'); return; }
    this._nextSlot();
  }, FEEDBACK_FAIL_MS);
}
```

#### `_onAoeHit()` — HP → 時間ペナルティに変更
```js
_onAoeHit() {
  if (this.state === 'gameover') return;
  if (!this.isBurst) this.combo = 0;
  this.remainingMs = Math.max(0, this.remainingMs - MISS_PENALTY_MS);
  this._rearmCountdown();
  this.ui.updateAll(this);
  this.ui.flashEnemy('miss', 0);
  this.ui.showJudgment('miss');
  this.sound.playMiss();
  if (this.remainingMs <= 0) {
    setTimeout(() => { if (this.state !== 'gameover') this._endGame('time_up'); }, 50);
  }
}
```

#### `_endGame()` — モードキー削除
```js
_endGame(reason) {
  const hs   = hsLoad();
  const key  = this.difficulty;  // mode prefix削除
  const prev = hs[key] || 0;
  const isNew = this.score > prev;
  if (isNew) { hs[key] = this.score; hsSave(hs); }
  this.stop();
  this.sound.playClear(); // 常にclear音 (time_up のみのため)
  this.ui.showGameOver(this, reason, prev, isNew);
  if (this.onGameOver) this.onGameOver(reason);
}
```

---

### 7. `src/sound.js`

`playHit(combo, judgment = 'great')`:
- GREAT: 既存の音（高めのsine beep）
- GOOD: やや低い音量・ピッチで区別

`playCombo(n)`:
- combo 10: タイムボーナスファンファーレ
- combo 20: バースト発動ファンファーレ（より派手）
- 既存の5の倍数ファンファーレロジックを削除

---

### 8. `src/main.js`

- `selectedMode` 変数削除
- `startModeIdx`, `applyModeSelection()`, `initBtnGroup('mode-btns', ...)` 削除
- `startSectionIdx` の最大値を `2 → 1`（diff=0, start=1）に変更
- `updateStartFocus()` から `mode-btns` 分岐削除
- メニューループの `startSectionIdx === 0` ブロック（mode選択）削除、diffが0番
- `startGame()` を `engine.start(selectedDiff)` に変更（`selectedMode` 引数削除）
- `ui.showScoreAtkTimer(...)` 呼び出し削除
- `resume()` 内の `hp_zero` チェック関連は game.js 側で削除済みなので不要

---

## 注意点

- `_onInput` の `elapsedRatio` は **`Math.min(1, ...)`を外す**ことでGOOD窓(>1.0)を正しく判定できる
- burstGCDでは `_nextSlot`, `_onGaugeFull`, `_runTimer` すべてで burst調整後の `timeMs` を使う
- バースト中にポーズした場合、再開時に `_pausedBurstMs` から `_burstEndTime` を再計算する
- ハイスコアのlocalStorageキーが `default__normal` → `normal` に変わるため既存データは引き継がれない（許容）
- `flashEnemy` の bounce条件を `combo % MAX_COMBO_MULTIPLIER` から `combo === COMBO_BONUS_THRESHOLD` に変更

---

## 検証

1. ブラウザでゲームを起動し、スタート画面にMODEセクションがないことを確認
2. ゲーム開始後:
   - 残り時間カウントダウン（90→0）が表示される
   - ミス時に -5s されること
   - GCD 75%-100%で押してGREAT表示（◎ GREAT）
   - GCD 100%+で押してGOOD表示（○ GOOD）
   - GREAT連続10回でコンボ10 → +2s表示・残り時間が増える
   - コンボ20でバーストタイム発動 → コンボゲージが光って10秒でドレイン
   - バースト中のミスでコンボが維持されること
   - バースト終了後コンボ0リセット
   - AOEミスでも時間-5s・コンボ0（バースト中は0にならない）
3. TIME UPでゲームオーバー表示、スコア記録・ベストスコア表示
