# XHBリキャスト 入力ルール・視覚フィードバック改善

## Context
前回実装した円形リキャストの入力ルール・フィードバックを以下3点変更する。

## 変更一覧

| # | 要件 | 変更箇所 |
|---|---|---|
| 1 | 誤ったボタンを押しても失敗扱いにしない | `game.js:_onInput` |
| 2 | 入力を受け付けないボタン押下時に白く光らせる | `xhb.js:setSlotFlash`, `main.css` |
| 3 | リキャスト100%になったら即座に次のスロットへ（猶予廃止） | `game.js` 複数箇所 |

---

## 1. styles/main.css の変更

`.xhb-slot--fail` ブロックの直後に追加：

```css
/* ── Flash (early/wrong press) ── */
.xhb-slot--flash {
  animation: slot-flash 0.3s ease-out forwards;
}
@keyframes slot-flash {
  0%   { background: rgba(255, 255, 255, 0.30); box-shadow: 0 0 16px rgba(255, 255, 255, 0.65); }
  100% { background: transparent; box-shadow: none; }
}
```

`.xhb-slot--flash` は `.xhb-slot--active` の後に定義することで、アクティブスロットの
`slot-glow-pulse` アニメーションをカスケードで上書きする。
アニメーション終了後にクラスを JS で除去すると、`transition: background 0.12s` が
フェードバックを滑らかに処理する。

---

## 2. src/xhb.js の変更

`clearAllStates()` の前に `setSlotFlash()` を追加：

```javascript
// 入力拒否時の白フラッシュ（早押し・誤ボタン共通）
setSlotFlash(slotId) {
  const el = this.slots[slotId];
  if (!el) return;
  el.classList.add('xhb-slot--flash');
  setTimeout(() => el.classList.remove('xhb-slot--flash'), 300);
}
```

---

## 3. src/game.js の変更

### 3-a. `RECAST_GRACE_MS` 定数を削除（2行目）

削除:
```javascript
const RECAST_GRACE_MS = 1500; // リキャスト完了後、ボタンを押せる猶予時間
```

### 3-b. constructor から `_pausedTimeoutRemaining` を削除（46行目）

削除:
```javascript
this._pausedTimeoutRemaining   = 0;
```

### 3-c. `_nextSlot()` のタイムアウトを `timeMs` のみに戻す

```javascript
this._timeoutId = setTimeout(() => this._onTimeout(), timeMs);
// 変更前: timeMs + RECAST_GRACE_MS
```

### 3-d. `pause()` を簡略化

`_pausedTimeoutRemaining` の計算行を削除し、`elapsed` 変数を元の 1 行計算に戻す:

```javascript
const totalMs = DIFFICULTIES[this.difficulty].timeMs;
this._pausedTimerRemaining = this._pausedFromState === 'showing'
  ? Math.max(0, totalMs - (Date.now() - this._timerStart))
  : 0;
// 削除: const elapsed = ... と _pausedTimeoutRemaining = ...
```

### 3-e. `resume()` の setTimeout を `_pausedTimerRemaining` に戻す

```javascript
const remaining = this._pausedTimerRemaining;
// 削除: const timeoutRemaining = this._pausedTimeoutRemaining;
...
this._timeoutId = setTimeout(() => this._onTimeout(), remaining);
// 変更前: timeoutRemaining
```

### 3-f. `_onInput()` を全面改修

```javascript
_onInput(slotId) {
  if (this.state !== 'showing') return;
  const totalMs      = DIFFICULTIES[this.difficulty].timeMs;
  const elapsedRatio = Math.min(1, (Date.now() - this._timerStart) / totalMs);

  if (elapsedRatio < 0.75) {
    // 早押し: 白フラッシュのみ（タイムアウト継続）
    this.xhb.setSlotFlash(slotId);
    return;
  }

  if (slotId !== this.activeSlotId) {
    // 誤ボタン: 白フラッシュのみ（失敗扱いなし）
    this.xhb.setSlotFlash(slotId);
    return;
  }

  // 正解: 通常の成功処理
  clearTimeout(this._timeoutId);
  if (this._timerRaf) { cancelAnimationFrame(this._timerRaf); this._timerRaf = null; }
  this._processHit();
}
```

---

## 変更ファイル一覧

- `styles/main.css` — `.xhb-slot--flash` + `@keyframes slot-flash` 追加
- `src/xhb.js` — `setSlotFlash()` 追加
- `src/game.js` — `RECAST_GRACE_MS` 削除、`_onInput` 改修、pause/resume 簡略化

## 検証

1. ゲーム開始 → スロット光る → 75%前に正解ボタン押下 → 白フラッシュ、タイマー継続
2. 75%後に誤ボタン → 押したボタンが白く光る、失敗にならない
3. 75%後に正解ボタン → 成功（緑）
4. 時間切れ（リキャスト100%） → 即失敗、次のスロット開始（猶予なし）
5. ポーズ → 再開 でタイマーが正しく継続する
