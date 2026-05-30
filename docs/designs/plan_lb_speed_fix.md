# Plan: LBゲージ0タイミングでの速度急低下修正

## Context

バーストモード（LIMIT BREAK）中に現れたスロットは、バーストGCD速度（1.4倍速）で回転し始める。しかし、LBゲージが0になった瞬間に `isBurst = false` へ即時切り替わるため、同一スロットのライフサイクル内（入力判定・pendingスロット生成・スコア計算）でも通常GCD時間が使われてしまい、「速度が急低下したように見える」問題が発生している。

## 根本原因（2箇所）

| 箇所 | ファイル・行 | 問題 |
|------|------------|------|
| `_onInput()` | game.js:329 | `this._getTimeMs()` でelapsedRatioを計算 → バースト終了後は通常speed基準になり、バーストタイミングで押した入力が「早押し」として弾かれる |
| `_onGaugeFull()` | game.js:319 | `this._getTimeMs()` でpendingスロットのタイマー生成 → バースト終了後は遅いタイマーで生成され、次スロット表示時に視覚的速度が急落 |
| `_processHit()` | game.js:380 | `this.isBurst` でスコア倍率判定 → バースト終了直後は倍率が外れる |
| `_processMiss()` | game.js:465 | `this.isBurst` でコンボ保護判定 → バースト終了直後はコンボリセットされる |
| `pause()` / `resume()` | game.js:165,208,210,212 | `_getTimeMs()` でタイマー残時間計算 → 一時停止中にバーストが終了するとresume後の速度がズレる |

## 修正方針：スロット開始時にGCD状態をスナップショット保存

各スロットが「回り始めた」瞬間の `timeMs` と `isBurst` を記録し、そのスロットのライフサイクル全体でその値を使う。pendingスロットも同様に生成時の値を保存する。

### 新規フィールド（constructor / start で初期化）

```
this._slotTimeMs          = 0;     // アクティブスロット開始時のGCD時間
this._slotIsBurst         = false; // アクティブスロット開始時のバースト状態
this._pendingSlotTimeMs   = 0;     // pendingスロット生成時のGCD時間
this._pendingSlotIsBurst  = false; // pendingスロット生成時のバースト状態
```

### 変更箇所

#### `_nextSlot()` — スロット開始時に状態をキャプチャ
- pendingスロットを引き継ぐ場合: `timeMs = this._pendingSlotTimeMs`, `_slotIsBurst = this._pendingSlotIsBurst`
- 新規スロットの場合: `timeMs = this._getTimeMs()`, `_slotIsBurst = this.isBurst`
- 両ケース後: `this._slotTimeMs = timeMs` を保存
- `_runTimer / _halfTimeId / _timeoutId` は `timeMs`（固定値）を使う ← 現状と同じ

#### `_onGaugeFull()` — pendingスロット生成時の値を保存
```javascript
const timeMs = this._slotTimeMs;            // アクティブスロットと同じ速度
this._pendingSlotTimeMs  = timeMs;
this._pendingSlotIsBurst = this._slotIsBurst; // バースト状態を引き継ぐ
this._startPendingTimer(timeMs);
```
→ pendingスロットはアクティブスロットと同じ速度・バースト状態を継承する。バーストが終了した後でも、アクティブスロット（＋それに重なるpendingスロット）は1サイクル分グレースピリオドを得る。

#### `_onInput()` — 入力判定をスロット開始時の速度で行う
```javascript
const timeMs = this._slotTimeMs;            // ← _getTimeMs() から変更
const elapsedRatio = (Date.now() - this._timerStart) / timeMs;
```

#### `_processHit()` — スコア・サウンドをスロット開始時のバースト状態で判定
```javascript
if (this._slotIsBurst) pts *= BURST_SCORE_MULTIPLIER;   // ← this.isBurst から変更
...
this.sound.playHit(this.combo, judgment, this._slotIsBurst); // ← this.isBurst から変更
```

#### `_processMiss()` — コンボ保護をスロット開始時のバースト状態で判定
```javascript
if (!this._slotIsBurst) {  // ← !this.isBurst から変更
  this.combo = 0;
  this.gaugeLevel = 0;
  this.gaugeProgress = 0;
}
```

#### `pause()` — 一時停止時のタイマー残時間をスロット速度で保存
```javascript
const totalMs = this._slotTimeMs;           // ← _getTimeMs() から変更
```

#### `resume()` — 再開時にスロット速度でタイマーを復元
```javascript
const totalMs = this._slotTimeMs;           // ← _getTimeMs() から変更
this._timerStart = Date.now() - (totalMs - remaining);
this._runTimer(totalMs);
this._halfTimeId = setTimeout(() => this._onGaugeFull(), remaining);
this._timeoutId  = setTimeout(() => this._onTimeout(), remaining + totalMs);
```

## 効果まとめ

| 状況 | 修正前 | 修正後 |
|------|--------|--------|
| LBゲージが0になった直後の入力 | 通常speed基準で弾かれる | バーストspeed基準で正常判定 |
| LBゲージが0になった直後のpendingスロット | 遅いタイマーで生成 → 視覚速度が急落 | アクティブスロットと同じ速度を継承 |
| LBゲージが0になった直後のGREAT/GOODスコア | 通常倍率（×1） | バースト倍率（×2）を維持 |
| LBゲージが0になった直後のMISS | コンボリセット発生 | コンボ保護が継続 |
| 次の「新規スロット」（pendingの次） | — | 正常に通常speed・通常倍率へ移行 |

## 変更ファイル

- `src/game.js` のみ（他ファイル変更なし）
