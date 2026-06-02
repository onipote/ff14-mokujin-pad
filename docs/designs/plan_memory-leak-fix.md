# メモリリーク修正プラン

## Context

プレイやリトライを繰り返すと徐々に動作が重くなる現象が発生している。原因はタイマー・RAF・AudioNodeの解放漏れによるメモリリークと孤立したコールバックの蓄積。5ファイルに対して外科的修正を加え、既存の動作は維持する。

---

## 修正対象ファイル一覧

| ファイル | 深刻度 | 問題の種類 |
|---------|--------|-----------|
| src/sound.js | **CRITICAL** | AudioNode（オシレータ・ゲイン）が disconnect されずグラフに残存 |
| src/aoe.js | **CRITICAL** | `start()` が先行タイマーをクリアせず二重チェーンが発生 |
| src/game.js | **HIGH** | 3つの untracked setTimeout（バースト音・AoE終了・フィードバック） |
| src/ui.js | **MEDIUM** | judgment float タイムアウトが追跡されず、一括キャンセル不能 |
| src/xhb.js | **LOW** | スロットフラッシュタイマーが積み重なる |

---

## 各ファイルの修正内容

### 1. `src/sound.js` — AudioNode リーク

`_beep()` 内でオシレータ・ゲインノードを生成後、`osc.stop()` しても `disconnect()` していない。  
ゲーム1回で数十〜百個の参照済みノードが AudioGraph に残存し続ける。

**修正:** `osc.stop()` の直後に `onended` ハンドラを追加する。

```js
// osc.stop(...) の直後に追加
osc.onended = () => { osc.disconnect(); gain.disconnect(); };
```

---

### 2. `src/aoe.js` — 二重タイマーチェーン

`start()` 冒頭で `stop()` を呼ばないため、前のゲームの `_schedId`/`_fireId`/`_clearId` が残っていると新ゲーム中にゴーストAoEが発生する。

**修正:** `start()` の先頭に1行追加。

```js
start() {
  this.stop();   // ← 追加
  this._active = true;
  this._scheduleNext();
}
```

---

### 3. `src/game.js` — 3つの untracked setTimeout

#### 3a. バースト音タイムアウト
```js
// 変更前
setTimeout(() => this.sound.playBurstStart(), 350);
// 変更後
this._burstSoundId = setTimeout(() => this.sound.playBurstStart(), 350);
```
- constructor に `this._burstSoundId = null;` を追加
- `stop()` と `start()` の clearTimeout ブロックに追加

#### 3b. AoE 終了タイムアウト
```js
// 変更前
setTimeout(() => { if (this.state !== 'gameover') this._endGame('time_up'); }, 50);
// 変更後
this._aoeEndId = setTimeout(() => { if (this.state !== 'gameover') this._endGame('time_up'); }, 50);
```
- constructor に `this._aoeEndId = null;` を追加
- `stop()` と `start()` の clearTimeout ブロックに追加

#### 3c. `pause()` で `_feedbackId` が未クリア
ポーズ中にフィードバック遅延が発火して `_nextSlot()` が呼ばれる問題。
```js
// pause() の clearTimeout ブロックに追加
clearTimeout(this._feedbackId);
```

#### `stop()` に ui.clearEffects() 追加
```js
this.xhb.clearAllStates();
this.ui.clearEffects();   // ← 追加
```

---

### 4. `src/ui.js` — judgment float タイマー追跡

`showJudgment()` が毎回タイマーIDを捨てており、ゲーム終了時に一括キャンセルできない。

**修正手順:**
1. constructor に `this._judgmentTimers = [];` を追加
2. `showJudgment()` のタイムアウトをトラッキング
   ```js
   const tid = setTimeout(() => el.remove(), 1000);
   this._judgmentTimers.push(tid);
   ```
3. `clearEffects()` メソッドを新規追加
   ```js
   clearEffects() {
     this._judgmentTimers.forEach(id => clearTimeout(id));
     this._judgmentTimers = [];
     if (this._judgmentEl) this._judgmentEl.innerHTML = '';
     if (this._enemyFlashId) { clearTimeout(this._enemyFlashId); this._enemyFlashId = null; }
     if (this._enemyAnimId)  { clearTimeout(this._enemyAnimId);  this._enemyAnimId  = null; }
     this._enemyEl.classList.remove('hit', 'miss', 'enemy-shake', 'enemy-bounce');
   }
   ```

---

### 5. `src/xhb.js` — スロットフラッシュタイマー

同一スロットが連打されると複数の `classList.remove` タイマーが積み重なる。

**修正:**
- constructor に `this._flashTimers = {};` を追加
- `setSlotFlash()` を修正
  ```js
  setSlotFlash(slotId) {
    const el = this.slots[slotId];
    if (!el) return;
    clearTimeout(this._flashTimers[slotId]);   // ← 追加
    el.classList.add('xhb-slot--flash');
    this._flashTimers[slotId] = setTimeout(() => el.classList.remove('xhb-slot--flash'), 300);
  }
  ```

---

## リトライ時のクリーンアップフロー（修正後）

```
startGame() → engine.start(diff)
  └─ clearTimeout(_burstSoundId, _aoeEndId, _timeoutId, _feedbackId, _halfTimeId)
  └─ aoe.start() → aoe.stop() で旧タイマーを全クリア → 新チェーン開始
  └─ (前ゲームの stop()) → ui.clearEffects() で float・flash を全解除
```

---

## 変更しないもの

- `src/background.js`: RAFループの `paused` フラグによる停止は許容範囲内（低優先度）
- アーキテクチャの変更なし・動作変更なし

---

## 検証方法

1. `npm start` でサーブ → ブラウザの DevTools → Performance タブ
2. ゲームを10回以上リトライしながら Memory タブで JS Heap を監視
3. `playBurstStart` が呼ばれた後、AudioNode が増加し続けないことを確認
4. AoEのゴーストスポーン（ゲーム開始直後に突然 AoE 警告が出る）がないことを確認
5. ポーズ→リジューム→ゲームオーバー時に判定テキストが残留しないことを確認
