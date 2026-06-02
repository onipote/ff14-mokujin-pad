# バーストシステム刷新 & リミットゲージ3分割デザイン

## Context

現在のバーストは「コンボ数が閾値（難易度別）に達したら即バースト」という1ゲージ方式。  
これをFF14本来のリミットブレイク仕様に近い「3ゲージ蓄積型」に変更する。  
ゲージUIも参考画像（`talklog/sample/limit_gauge.png`）に合わせた平行四辺形3分割デザインに刷新する。

---

## 1. 定数変更 — `src/constants.js`

| 現在 | 変更後 |
|------|--------|
| `BURST_THRESHOLDS = { slow:10, normal:15, fast:20 }` | `LIMIT_GAUGE_THRESHOLDS = { slow:3, normal:5, fast:6 }` （1ゲージを貯めるのに必要な大成功数） |
| `COMBO_BONUS_THRESHOLD = 10` | 削除（ゲージ系ボーナスに統一） |
| `COMBO_BONUS_MS = 2_000` | 削除 |
| ─ | `LIMIT_GAUGE_COUNT = 3` を追加（念のため定数化） |
| ─ | `LIMIT_GAUGE_BONUS_MS = [1_000, 2_000]` を追加（ゲージ1・2個目完成時のボーナス秒数） |

`BURST_DURATION_MS`, `BURST_GCD_MULTIPLIER`, `BURST_SCORE_MULTIPLIER` は変更なし。

---

## 2. ゲームロジック変更 — `src/game.js`

### 2-a. 新しい状態変数（constructor & start() に追加）

```js
this.gaugeLevel    = 0;  // 完成済みゲージ数（0〜3）
this.gaugeProgress = 0;  // 現在のゲージ内の大成功カウント（0〜threshold-1）
```

`start()` でも同様にリセット。

### 2-b. `_checkComboMilestones()` を置き換え → `_checkGaugeProgress()`

呼び出しタイミング：`_processHit('great')` で `this.combo++` の直後（現在と同じ位置）。

```
if (isBurst) return  ← バースト中はゲージ操作不要

if (gaugeLevel === 3):
    → _startBurst()  （3ゲージ完成済みの状態で大成功 = バースト発動）
    → sound.playCombo()

else:
    gaugeProgress++
    if (gaugeProgress >= LIMIT_GAUGE_THRESHOLDS[difficulty]):
        gaugeLevel++
        gaugeProgress = 0
        if (gaugeLevel === 1): +1s ボーナス、ui.showJudgment('bonus1')
        if (gaugeLevel === 2): +2s ボーナス、ui.showJudgment('bonus2')
        // gaugeLevel === 3 の場合はボーナスなし（次の大成功でバースト待ち）
        sound.playCombo()
```

### 2-c. `_processMiss()` の変更

```js
// 変更前
if (!this.isBurst) this.combo = 0;

// 変更後
if (!this.isBurst) {
  this.combo        = 0;
  this.gaugeProgress = 0;   // 現在ゲージのカウントをリセット（gaugeLevel は維持）
}
```

### 2-d. `_endBurst()` の変更

```js
_endBurst() {
  this.isBurst      = false;
  this.combo        = 0;
  this.gaugeLevel   = 0;    // 追加
  this.gaugeProgress = 0;   // 追加
  this.ui.setBurstState(false);
  this.ui.updateAll(this);  // setBurstGauge(0) は不要になる（updateAllが代替）
}
```

---

## 3. UI変更 — `src/ui.js`

### 3-a. constructor の参照変更

```js
// 削除
this._comboGaugeWrap = document.getElementById('combo-gauge-wrap');
this._comboGaugeFill = document.getElementById('combo-gauge-fill');

// 追加
this._limitGaugeCont = document.getElementById('limit-gauge-container');
this._limitSegs      = [0, 1, 2].map(i => document.getElementById(`limit-seg-${i}`));
this._limitSegFills  = this._limitSegs.map(s => s.querySelector('.limit-segment-fill'));
```

### 3-b. `updateAll()` の変更

```js
updateAll(engine) {
  this._scoreEl.textContent = engine.score;
  const threshold = LIMIT_GAUGE_THRESHOLDS[engine.difficulty];
  this._updateLimitGauge(engine.gaugeLevel, engine.gaugeProgress, threshold);
  this._comboEl.textContent = engine.combo >= 1 ? `COMBO ${engine.combo}` : '';
}
```

### 3-c. 新メソッド `_updateLimitGauge(level, progress, threshold)`

```js
_updateLimitGauge(level, progress, threshold) {
  for (let i = 0; i < 3; i++) {
    const fill = this._limitSegFills[i];
    if (i < level) {
      fill.style.width = '100%';
      this._limitSegs[i].classList.add('full');
    } else if (i === level) {
      fill.style.width = (level < 3 ? (progress / threshold * 100) : 100) + '%';
      this._limitSegs[i].classList.toggle('full', level === 3);
    } else {
      fill.style.width = '0%';
      this._limitSegs[i].classList.remove('full');
    }
  }
}
```

### 3-d. `setBurstState(active)` の変更

```js
setBurstState(active) {
  this._limitGaugeCont.classList.toggle('burst-active', active);
}
```

### 3-e. `setBurstGauge(ratio)` の変更

バースト残り時間を右から左に向かってドレインする（右セグメントから先に減る）：

```js
setBurstGauge(ratio) {
  for (let i = 0; i < 3; i++) {
    const fill = Math.min(1, Math.max(0, ratio * 3 - (2 - i)));
    this._limitSegFills[i].style.width = (fill * 100) + '%';
  }
}
```

### 3-f. `showJudgment()` の変更

```js
showJudgment(type) {
  const labels = {
    great: '◎ GREAT', good: '○ GOOD', miss: '✕ MISS',
    bonus1: '+1s', bonus2: '+2s',   // ← 追加
  };
  const el = document.createElement('div');
  el.className = `judgment-float judgment-float--${type === 'bonus1' || type === 'bonus2' ? 'bonus' : type}`;
  el.textContent = labels[type] || '';
  this._judgmentEl.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}
```

---

## 4. HTML変更 — `index.html`

```html
<!-- 削除 -->
<div id="combo-gauge-wrap" class="combo-gauge-wrap">
  <div id="combo-gauge-fill" class="combo-gauge-fill"></div>
</div>

<!-- 差し替え -->
<div id="limit-gauge-container" class="limit-gauge-container">
  <div class="limit-segment" id="limit-seg-0">
    <div class="limit-segment-inner">
      <div class="limit-segment-fill"></div>
    </div>
  </div>
  <div class="limit-segment" id="limit-seg-1">
    <div class="limit-segment-inner">
      <div class="limit-segment-fill"></div>
    </div>
  </div>
  <div class="limit-segment" id="limit-seg-2">
    <div class="limit-segment-inner">
      <div class="limit-segment-fill"></div>
    </div>
  </div>
</div>
```

---

## 5. CSS変更 — `styles/main.css`

既存の `.combo-gauge-wrap` / `.combo-gauge-fill` / `.combo-gauge--burst` ブロックを**全て削除**し、以下に差し替え：

```css
/* ─── Limit Gauge (3-segment parallelogram) ─── */
.limit-gauge-container {
  display: flex;
  gap: 4px;
  align-items: center;
}

.limit-segment {
  position: relative;
  width: 72px;
  height: 16px;
  background: linear-gradient(180deg, #d07030 0%, #904820 100%); /* 地味オレンジ外枠 */
  clip-path: polygon(7px 0%, 100% 0%, calc(100% - 7px) 100%, 0% 100%);
}

.limit-segment-inner {
  position: absolute;
  inset: 2px;
  background: #0a1a18;
  border-radius: 3px;
  overflow: hidden;
}

.limit-segment-fill {
  height: 100%;
  width: 0%;
  border-radius: 3px;
  background: linear-gradient(90deg, #1a5fc0 0%, #90d8f8 65%, #ffffff 100%); /* 青→白 */
  box-shadow: 0 0 6px rgba(80, 180, 230, 0.5);
  transition: width 0.1s ease;
}

/* ゲージ最大（full）: 中央やや明るい黄色 */
.limit-segment.full .limit-segment-fill {
  width: 100%;
  background: linear-gradient(90deg, #b08010 0%, #ffe878 50%, #b08010 100%);
  box-shadow: 0 0 8px rgba(255, 220, 80, 0.6);
}

/* バースト中: 赤っぽく（full より後に記述して優先） */
.limit-gauge-container.burst-active .limit-segment-fill {
  background: linear-gradient(90deg, #800808 0%, #e03020 50%, #800808 100%);
  animation: burst-pulse 0.5s ease-in-out infinite alternate;
}

@keyframes burst-pulse {
  from { box-shadow: 0 0 6px rgba(200, 50, 20, 0.5); }
  to   { box-shadow: 0 0 18px rgba(200, 50, 20, 0.9); }
}
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/constants.js` | `BURST_THRESHOLDS` → `LIMIT_GAUGE_THRESHOLDS`、combo bonus 定数削除、新定数追加 |
| `src/game.js` | 新状態変数追加、`_checkComboMilestones` → `_checkGaugeProgress` 置換、miss/burst end 更新 |
| `src/ui.js` | 要素参照変更、`updateAll`・`setBurstState`・`setBurstGauge`・`showJudgment` 更新、`_updateLimitGauge` 追加 |
| `index.html` | 単一ゲージ → 3分割ゲージ HTML 差し替え |
| `styles/main.css` | 旧 combo-gauge CSS 削除 → 新 limit-segment CSS 追加 |

---

## 検証手順

1. `npm start` でサーブ起動
2. 難易度「遅い」で開始 → 大成功3回ごとにゲージが1段ずつ埋まることを確認
3. ゲージ1個完成で画面に `+1s`、2個完成で `+2s` が表示され残り時間が増えることを確認
4. 3ゲージ全部満タンの状態でさらに大成功するとバーストが開始されることを確認
5. バースト中：ゲージが赤くなり右から左にドレインされることを確認
6. バースト終了後：ゲージが 0 にリセットされ青→白の通常色に戻ることを確認
7. ミス時：gaugeProgress のみリセット（gaugeLevel は維持）されることを確認
8. 難易度「普通」「速い」でも閾値（5・6）が正しく動作することを確認
