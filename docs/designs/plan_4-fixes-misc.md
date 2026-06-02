# 4箇所の表現修正プラン

## Context

ゲームの細部品質向上のため、4つの視覚・音響表現を修正する。
- ミス音が他の効果音より大きく聴こえる
- 視線ギミックの中央スポーン除外範囲が狭すぎる
- 放射状AoEの線が他のAoEより太く見える
- リザルト画面でNEW RECORDがボタンの下に表示されている

---

## 修正1: ミス音の音量を下げる

**ファイル:** `src/sound.js` lines 49–50

**原因:** `playMiss()` は sawtooth 波形を2音重ねて鳴らす。同帯域が重なり体感音量が大きい。

**変更内容:**
```js
// Before
this._beep(160, 'sawtooth', 0.18, 0.14);
this._beep(110, 'sawtooth', 0.22, 0.10, 0.10);

// After
this._beep(160, 'sawtooth', 0.18, 0.09);
this._beep(110, 'sawtooth', 0.22, 0.07, 0.10);
```
vol を 0.14→0.09、0.10→0.07（約35%減）。

---

## 修正2: 視線ギミック中央除外範囲を 1/4 辺長に拡大

**ファイル:** `src/constants.js`

**原因:** 現在 `GAZE_FRAME_HALF_W * 0.1`（辺の1/10相当） → 「外枠の1/4の辺の長さをもつ長方形」に変更。

計算：除外ゾーンは `Math.abs(eyeX) < R && Math.abs(eyeY) < R` のボックスチェック。
フレーム幅 = `2 * GAZE_FRAME_HALF_W`、その 1/4 の辺長の半分 = `GAZE_FRAME_HALF_W * 0.25`

**変更内容:**
```js
// Before
const GAZE_CENTER_EXCLUDE_R = GAZE_FRAME_HALF_W * 0.1; // 中央除外半径 ≈ 0.049（辺の1/10相当）

// After
const GAZE_CENTER_EXCLUDE_R = GAZE_FRAME_HALF_W * 0.25; // 中央除外半径 ≈ 0.122（辺の1/4相当）
```

---

## 修正3: 放射状AoE（fan）の線の太さを他のAoEに合わせる

**ファイル:** `src/ui.js`、`styles/main.css`

**原因:** fan の放射線divは `width:2px` だが、`mk()` で `.aoe-zone` クラスが付くため CSS の `border: 2px solid` と `drop-shadow` が追加適用され、視覚幅が約6px相当になっている。

**修正方針:** 放射線div に専用クラス `aoe-fan-line` を追加し、border/filter/box-shadow を打ち消す。

### src/ui.js の変更

`mk(...)` の代わりに `aoe-fan-line` クラス付きで要素を手動生成する：

```js
// Before (lines 377–380)
lines.push(mk(
  `position:absolute;left:calc(50% - 1px);top:50%;width:2px;height:100%;` +
  `transform-origin:top center;transform:rotate(${(scrDeg - 90).toFixed(2)}deg);border-radius:0`
));

// After
const lineEl = document.createElement('div');
lineEl.className = 'aoe-zone aoe-fan-line';
lineEl.style.cssText =
  `position:absolute;left:calc(50% - 1px);top:50%;width:2px;height:100%;` +
  `transform-origin:top center;transform:rotate(${(scrDeg - 90).toFixed(2)}deg);border-radius:0`;
lines.push(lineEl);
```

### styles/main.css の変更

ファイル末尾または fan セクション付近に追記：

```css
/* fan 放射線: border/shadow を打ち消し、背景色で表示 */
.aoe-fan-line { border: none !important; box-shadow: none !important; filter: none !important; }
.aoe-fan-line.aoe-zone--warning,
.aoe-fan-line.aoe-zone--warning-in  { background: #FF5500; opacity: 0.85; }
.aoe-fan-line.aoe-zone--warning-out { background: rgba(55, 200, 85, 0.75); }
.aoe-fan-line.aoe-zone--hit         { background: rgba(230, 60, 60, 0.9); }
.aoe-fan-line.aoe-zone--dodge       { background: rgba(55, 200, 85, 0.75); }
```

---

## 修正4: リザルト画面の NEW RECORD をスコアの上に移動

**ファイル:** `index.html`

**現状の順序:**
```html
<div id="gameover-stats" ...></div>   <!-- スコア -->
<div class="btn-group ...">...</div>
<div id="new-record-badge" ...>★ NEW RECORD ★</div>  ← ボタン下
```

**変更後の順序:**
```html
<div id="new-record-badge" ...>★ NEW RECORD ★</div>  ← スコアの上
<div id="gameover-stats" ...></div>
<div class="btn-group ...">...</div>
```

`#new-record-badge` を `#gameover-stats` の直前に移動する。

---

## 検証方法

1. `npm start` でサーブ起動
2. ゲームプレイしてミスを起こし、ミス音量が他の効果音（GREAT/GOOD/ゲージ完成音）より小さくなったことを確認
3. 右パネル（視線ギミック）で目アイコンが中央に出現しないことを確認（1/4範囲が空白になる）
4. 左パネルで放射状AoEが出現したときの線の太さを他のAoE（half-side/circle/band）と比較
5. ゲームオーバー時に NEW RECORD がスコアの上に表示されることを確認
