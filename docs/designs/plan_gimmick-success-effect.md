# Plan: ギミック成功時の視覚・音響フィードバック

## Context

左スティック（AoE回避）と右スティック（視線ギミック）のドッジ成功時、現在は CSS クラスが変わるだけで目立つフィードバックがない。プレイヤーがギミックをクリアしたことを明確に伝えるため、各操作領域に大きな緑のチェックマーク（丸囲み）を表示し、成功音を鳴らす。

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---------|---------|
| `src/aoe.js` | `onDodge()` 呼び出し時にサイド `'L'` / `'R'` を引数で渡す |
| `src/game.js` | `onDodge` を `null` → コールバック関数に変更、`_onAoeDodge(side)` メソッド追加 |
| `src/sound.js` | `playGimmickSuccess()` メソッド追加 |
| `src/ui.js` | `showGimmickSuccess(side)` メソッド追加 |
| `styles/main.css` | `.gimmick-success` アニメーション CSS 追加 |

---

## 詳細実装

### 1. `src/aoe.js` — サイド情報を onDodge に渡す

`_spawn()` と `_spawnGaze()` の `this.onDodge()` 呼び出しをそれぞれ変更：

```js
// _spawn() 内（左パネル AoE）
else { if (this.onDodge) this.onDodge('L'); }

// _spawnGaze() 内（右パネル視線）
else { if (this.onDodge) this.onDodge('R'); }
```

---

### 2. `src/game.js` — onDodge を接続、ハンドラー追加

`start()` と `resume()` の両方：

```js
this.aoe.onDodge = (side) => this._onAoeDodge(side);
```

`_onAoeHit()` の近くに追加するメソッド：

```js
_onAoeDodge(side) {
  this.sound.playGimmickSuccess();
  this.ui.showGimmickSuccess(side);
}
```

---

### 3. `src/sound.js` — 成功音を追加

```js
playGimmickSuccess() {
  this._beep(523, 'sine', 0.15, 0.20, 0.00);  // C5
  this._beep(659, 'sine', 0.15, 0.20, 0.08);  // E5
  this._beep(784, 'sine', 0.20, 0.22, 0.16);  // G5
}
```

---

### 4. `src/ui.js` — 視覚フィードバックを追加

```js
showGimmickSuccess(side) {
  const field = this._stickField[side];
  if (!field) return;
  const el = document.createElement('div');
  el.className = 'gimmick-success';
  el.innerHTML = `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="45" fill="rgba(0,200,100,0.85)" stroke="rgba(0,255,130,0.9)" stroke-width="4"/>
    <polyline points="25,52 42,68 75,32" fill="none" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
  field.appendChild(el);
  setTimeout(() => { if (el.parentNode) el.parentNode.removeChild(el); }, 1500);
}
```

- `this._stickField` は既に `{ L: ..., R: ... }` として `ui.js` 内に定義済み

---

### 5. `styles/main.css` — アニメーション CSS を追加

```css
@keyframes gimmick-success-anim {
  0%   { transform: scale(0);    opacity: 1; }
  20%  { transform: scale(1.15); opacity: 1; }
  35%  { transform: scale(1);    opacity: 1; }
  70%  { transform: scale(1);    opacity: 1; }
  100% { transform: scale(0.9);  opacity: 0; }
}

.gimmick-success {
  position: absolute;
  top: 50%; left: 50%;
  width: 60%; height: 60%;
  transform: translate(-50%, -50%) scale(0);
  pointer-events: none;
  z-index: 30;
  animation: gimmick-success-anim 1.5s ease-out forwards;
}

.gimmick-success svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 12px rgba(0, 255, 100, 0.8));
}
```

---

## 検証方法

1. `npm start` でサーバー起動
2. ゲームを開始（ゲームパッドまたはキーボード）
3. 左スティック：AoE 警告エリア外にカーソルを保持 → 成功時に左パネル中央に緑チェックマーク + 音
4. 右スティック：視線フレームを目の外に移動 → 成功時に右パネル中央に緑チェックマーク + 音
5. ミス時（ヒット時）にはチェックマークが出ないこと、音が鳴らないことを確認
