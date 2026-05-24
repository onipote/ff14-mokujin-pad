# 計画：リキャストゲージの連鎖開始＋延長猶予ウィンドウ

## Context

現在の動作：
- ボタンのゲージが100%（`timeMs`経過）になると即座に失敗（`_onTimeout()` → `_processMiss()`）
- フィードバック（550ms）後に次のボタンが表示されてゲージが開始

ユーザーの要件（2つ）：
1. ゲージ100%到達時点で**次のボタンのゲージを即座に開始**して表示する
2. 失敗判定は「ゲージ200%相当」（= ゲージ100%到達からさらに`timeMs`後）まで延長する

**タイムライン（例：timeMs=2500ms）：**
- t=0ms: ボタンAを表示、ゲージ0%→100%開始
- t=2500ms: ゲージ100%到達 → **ボタンBを表示してゲージ0%開始**。ボタンAはまだ押せる
- t=2500ms〜5000ms: ボタンAとBが同時に表示（Aはまだ有効、Bのゲージが進む）
- ボタンAを押す → 成功、BはゲージがN%進んだ状態で次のアクティブスロットに
- t=5000ms: ボタンAを押さなかったら失敗

## 変更対象

**`src/game.js` のみ**

## 実装詳細

### 1. 新しいプロパティを `constructor` に追加

```javascript
this._pendingSlotId     = null;  // ゲージ100%後の「次のスロット」
this._pendingTimerStart = 0;
this._pendingTimerRaf   = null;
this._halfTimeId        = null;  // ゲージ100%到達時タイマー
```

### 2. `_pickNextSlotId()` ヘルパーを追加（既存 `_nextSlot()` から抽出）

```javascript
_pickNextSlotId() {
  let slotId;
  do {
    slotId = SLOT_IDS[Math.floor(Math.random() * SLOT_IDS.length)];
  } while (slotId === this.activeSlotId && SLOT_IDS.length > 1);
  return slotId;
}
```

### 3. `_startPendingTimer(totalMs)` を追加（次スロットのゲージRAFループ）

```javascript
_startPendingTimer(totalMs) {
  if (this._pendingTimerRaf) { cancelAnimationFrame(this._pendingTimerRaf); this._pendingTimerRaf = null; }
  const tick = () => {
    if (this.state === 'idle' || this.state === 'paused' || this.state === 'gameover') return;
    const elapsed = Date.now() - this._pendingTimerStart;
    const ratio = Math.max(0, 1 - elapsed / totalMs);
    const elapsedRatio = 1 - ratio;
    const remainingMs = Math.max(0, totalMs - elapsed);
    this.xhb.setSlotRecast(this._pendingSlotId, elapsedRatio, remainingMs);
    if (ratio > 0) this._pendingTimerRaf = requestAnimationFrame(tick);
  };
  this._pendingTimerRaf = requestAnimationFrame(tick);
}
```

### 4. `_onGaugeFull()` を追加（ゲージ100%到達時の処理）

```javascript
_onGaugeFull() {
  if (this.state !== 'showing') return;
  if (this._pendingSlotId) return; // 二重発火防止
  
  const timeMs = DIFFICULTIES[this.difficulty].timeMs;
  this._pendingSlotId = this._pickNextSlotId();
  this._pendingTimerStart = Date.now();
  this._startPendingTimer(timeMs);
  
  // 次のスロットをアクティブ表示（ゲージが進み始める）
  this.xhb.setSlotState(this._pendingSlotId, 'active');
  // プロンプトは現在のスロットのまま（activeSlotId は変えない）
}
```

### 5. `_nextSlot()` を変更

- `_pendingSlotId` がある場合はそれを引き継ぐ（ゲージ進行状態を保持）
- タイムアウトを `timeMs * 2` に変更（200%相当で失敗）
- `_halfTimeId` を `gaugeRemaining` 後に設定

```javascript
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
  
  this.state = 'showing';
  this.xhb.clearAllStates();
  this.xhb.setSlotState(slotId, 'active');
  this.ui.showPrompt(SLOT_BY_ID[slotId]);
  
  const timeMs = DIFFICULTIES[this.difficulty].timeMs;
  this._runTimer(timeMs);
  
  const elapsed = Date.now() - this._timerStart;
  const gaugeRemaining = Math.max(0, timeMs - elapsed);
  this._halfTimeId = setTimeout(() => this._onGaugeFull(), gaugeRemaining);
  this._timeoutId = setTimeout(() => this._onTimeout(), gaugeRemaining + timeMs);
}
```

### 6. `_onInput()` に `clearTimeout(this._halfTimeId)` を追加

```javascript
clearTimeout(this._timeoutId);
clearTimeout(this._halfTimeId); // ← 追加
if (this._timerRaf) { cancelAnimationFrame(this._timerRaf); this._timerRaf = null; }
```

### 7. `_processHit()` に `clearTimeout(this._halfTimeId)` を追加

```javascript
clearTimeout(this._timeoutId); // 既存
clearTimeout(this._halfTimeId); // ← 追加
```

### 8. `stop()` / `pause()` にクリーンアップを追加

`stop()` と `pause()` で:
```javascript
clearTimeout(this._halfTimeId);
if (this._pendingTimerRaf) { cancelAnimationFrame(this._pendingTimerRaf); this._pendingTimerRaf = null; }
this._pendingSlotId = null;
```

`pause()` の `_pausedTimerRemaining` 計算：`state === 'showing'` のみだが変更不要（feedback中のpauseは既存の「次スロット再開」で対応）。

### 9. `start()` にプロパティリセットを追加

```javascript
this._pendingSlotId = null;
this._pendingTimerStart = 0;
this._pendingTimerRaf = null;
this._halfTimeId = null;
```

### `_onTimeout()` は変更不要

現在の失敗処理（`_processMiss()`）はそのまま。`_processMiss()` が `_nextSlot()` を呼ぶと、`_pendingSlotId` が設定済みなのでゲージ引き継ぎが自動で行われる。

## 変更なしのファイル

- `src/xhb.js` — 複数スロットを `active` 状態にすることは既存コードで対応可能
- `src/ui.js`
- `styles/main.css`

## 検証方法

1. ブラウザでゲームを起動
2. ボタンを押さずに待つ → ゲージ100%到達時に別のボタンが表示されてゲージが始まることを確認
3. ゲージ100%〜200%の間にボタンを押す → 成功処理が行われ、次のボタンが進んだゲージ状態で表示されることを確認
4. ゲージ200%まで何も押さない → 失敗処理が行われることを確認
5. 正常押し（ゲージ75%〜100%前）も従来通り動くことを確認
