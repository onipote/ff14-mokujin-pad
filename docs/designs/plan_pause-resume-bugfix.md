# 一時停止復帰バグ修正プラン（追加修正）

## Context

一時停止（pause）から復帰（resume）する際に3つの問題が発生している：

1. **ゲーム開始音が鳴る**：`resume()` が `sound.startRhythm()` を呼ぶと、その関数内で最初のビートが即座に発火する（`fire()` が `setInterval` の前に呼ばれる）。これがゲーム開始時と同じ音に聞こえる。
2. **リキャスト状態が変わる**：フィードバック状態（ボタン押下直後の GREAT/MISS 表示中）でポーズした場合、`resume()` の `else` ブランチで `_nextSlot()` が即座に呼ばれる。これにより `xhb.clearAllStates()` が実行され、リキャスト表示が唐突に変わる。
3. **ペンディングスロットのリキャストゲージが固定される**：2つのボタンがアクティブな状態でポーズ→復帰すると、ペンディングスロットのリキャストゲージが動かなくなる。

---

## 修正方針

### Bug 1：リズム音の即時発火

**原因**：`sound.js` の `startRhythm()` は `fire()` を即座に呼んでから `setInterval` を始める。これを `resume()` から呼ぶと、ビート0が即座に鳴る。

**修正**：`sound.js` に `resumeRhythm(isBurst, savedBeat)` メソッドを追加する。
- `startRhythm` とほぼ同じだが、`fire()` を最初に呼ばない
- `_rhythmBeat` をポーズ時に保存した値から再開する

`game.js` 側：
- `pause()` に `this._pausedRhythmBeat = this.sound._rhythmBeat;` を追加
- `resume()` の `this.sound.startRhythm(...)` を `this.sound.resumeRhythm(...)` に変更

### Bug 2：フィードバック中ポーズからの復帰

**原因**：`_pausedFromState === 'feedback'` のとき `else` ブランチで `_nextSlot()` が即座に呼ばれ、リキャスト表示がリセットされる。

**修正**：フィードバック状態を復元し、適切な遅延後に `_nextSlot()` を呼ぶ。
- `_processHit()` と `_processMiss()` で `_feedbackId` をセットする際に `this._feedbackMs` に使用したタイムアウト値を保存する
- `resume()` の `else` ブランチで、即座に `_nextSlot()` を呼ぶ代わりに `state = 'feedback'` を復元し、`_feedbackMs` の遅延後に `_nextSlot()` を呼ぶ

---

## 変更ファイルと内容

### `src/sound.js`

`stopRhythm()` の後に `resumeRhythm(isBurst, savedBeat)` メソッドを追加：

```javascript
resumeRhythm(isBurst, savedBeat) {
  this.stopRhythm();
  const stepMs = Math.round(60000 / ((isBurst ? 175 : 140) * 2));
  this._rhythmBeat  = savedBeat || 0;
  this._rhythmBurst = isBurst;
  // (normPattern / burstPattern は startRhythm と同じ)
  const pattern = isBurst ? burstPattern : normPattern;
  const fire = () => { ... };
  // fire() を即座に呼ばない
  this._rhythmId = setInterval(fire, stepMs);
}
```

### `src/game.js`

1. **`pause()`** に追加：
   ```javascript
   this._pausedRhythmBeat = this.sound._rhythmBeat;
   ```

2. **`_processHit()`**（`_feedbackId` セット前）に追加：
   ```javascript
   this._feedbackMs = FEEDBACK_SUCCESS_MS;
   ```

3. **`_processMiss()`**（`_feedbackId` セット前）に追加：
   ```javascript
   this._feedbackMs = FEEDBACK_FAIL_MS;
   ```

4. **`resume()`** を変更：
   ```javascript
   // Before:
   this.sound.startRhythm(this.isBurst);
   // After:
   this.sound.resumeRhythm(this.isBurst, this._pausedRhythmBeat);
   ```

5. **`resume()`** の `else` ブランチを変更：
   ```javascript
   // Before:
   } else {
     this.total--;
     this._nextSlot();
   }
   // After:
   } else {
     this.state = 'feedback';
     this.total--;
     this._feedbackId = setTimeout(() => {
       if (this.state !== 'gameover') this._nextSlot();
     }, this._feedbackMs || FEEDBACK_SUCCESS_MS);
   }
   ```

---

## Bug 3：ペンディングスロットのリキャストゲージが固定される

### 症状

2つのボタンがアクティブ（現在のスロット＋次のペンディングスロット）の状態でポーズ→復帰すると、ペンディングスロットのリキャストゲージが動かなくなる。

### 原因

`pause()` で `this._pendingSlotId = null` と無条件クリアされる。それに伴い `_pendingTimerStart`、`_pendingSlotTimeMs`、`_pendingSlotIsBurst` の保存もない。`resume()` の 'showing' ブランチでは `_startPendingTimer()` が一切呼ばれないため、復帰後もペンディングスロットの RAF アニメーションが再開しない。

### 修正（`src/game.js`）

1. **`pause()`** — `_pendingSlotId = null` の行を削除し、代わりにペンディングタイマーの残り時間を保存：
   ```javascript
   // 削除: this._pendingSlotId = null;
   this._pausedPendingTimerRemaining = this._pendingSlotId
     ? Math.max(0, this._pendingSlotTimeMs - (Date.now() - this._pendingTimerStart))
     : 0;
   ```

2. **`resume()`** の `_pausedFromState === 'showing'` ブランチ末尾に追加：
   ```javascript
   if (this._pendingSlotId) {
     this._pendingTimerStart = Date.now() - (this._pendingSlotTimeMs - this._pausedPendingTimerRemaining);
     this._startPendingTimer(this._pendingSlotTimeMs);
   }
   ```

---

## 検証手順

1. `npm start` でサーバー起動
2. ゲーム開始 → ポーズ → 復帰：ゲーム開始音（ビート0）が鳴らないことを確認
3. ボタン押下直後（GREAT/MISS フィードバック表示中）にポーズ → 復帰：リキャスト表示が唐突に変わらず、フィードバック表示が自然に終わってから次のスロットに遷移することを確認
4. ゲージが0になりペンディングスロット（2つ目のボタン）が点灯した状態でポーズ → 復帰：両方のリキャストゲージが正常にアニメーションを再開することを確認
5. バースト中にポーズ → 復帰：リズムがバーストパターンで正常に継続することを確認
