# Plan: 右スティックギミック刷新 — ミニマップスクロール宝箱キャプチャ

## Context

現在の「頭割りギミック」はフレーム（枠）をスティックで動かして固定マーカーを捕まえる仕組み。  
これを**フレーム固定・背景スクロール**に反転する。プレイヤーは背景をスクロールして宝箱アイコンを枠の中に収める。  
難易度・タイミング・フレームサイズ・速度はすべて据え置き（数学的に等価）。

---

## 変更概要

### コアロジックの対比

| 項目 | 現在 | 新設計 |
|------|------|--------|
| フレームの動き | stickR.x/y に追従して移動 | 常に中央固定 (left:50%, top:50%) |
| マーカーの位置 | 固定 | 宝箱がスクロールで動いて見える |
| ワールドオフセット | なし | `_worldOffsetX/Y = stickR.x/y` |
| 捕捉判定 | 発火時のみ | 毎フレーム連続（一度開いたら維持） |
| 成功条件 | 発火時に枠内 | 発火前にいつでも枠内に入った |

数学的等価性：  
旧 `|markerX - frameCursorX| ≤ HALF_W`  
新 `|chestWorldX - worldOffsetX| ≤ HALF_W` （worldOffsetX = stickR.x）

---

## ファイル別変更内容

### 1. `src/constants.js`
- `STK_MARKER_RANGE` の役割を変更（スポーン範囲を拡張）
- 定数追加：
  ```javascript
  const STK_CHEST_SPAWN_ONSCREEN_MAX  = 0.85; // 画面内スポーン（方向表示不要）
  const STK_CHEST_SPAWN_OFFSCREEN_MAX = 1.4;  // 画面外スポーン（方向表示あり）
  // 1.4 の根拠: stickR上限 1.0 + HALF_W(0.48875) - マージン = 1.4 で必ず到達可能
  ```
- `STK_CENTER_EXCLUDE_R` は削除（未使用）

### 2. `index.html`（`#stick-field-R` 内部）
- 削除：`<div class="stk-marker" id="stk-marker-R">` （N/S/E/W 矢印SVG丸ごと）
- 残す：`<div class="stk-frame" id="stk-frame-R"></div>`（常に中央固定）
- 追加：
  ```html
  <div class="stk-chest" id="stk-chest-R"></div>
  <div class="stk-direction" id="stk-direction-R"></div>
  ```

### 3. `styles/main.css`

**削除：**
- `.stk-marker`, `.stk-marker--active`, `.stk-svg` 全スタイル
- `.stk-shape`, `.stk-dim`, `.stk-mid`, `.stk-bright`, `.stk-center-disc`
- `.stk-grp-n/s/e/w/center` + `@keyframes stk-pulse-*`, `@keyframes stk-bob`
- `#stick-panel-R .stick-field { overflow: visible; }` の override

**変更：**
- `#stick-panel-R .stick-field`：スクロールグリッド背景を追加
  ```css
  background-image:
    linear-gradient(rgba(100,180,255,0.08) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100,180,255,0.08) 1px, transparent 1px);
  background-size: 20% 30%; /* 3:2フィールドで視覚的に正方形のセル */
  background-position: 0 0; /* JSで毎フレーム更新 */
  overflow: hidden;
  ```
- `.stk-frame`：`left:50%; top:50%;` を固定値にする（JSで変更しない）

**追加：**
```css
/* 宝箱アイコン */
.stk-chest {
  position: absolute;
  width: 60px; height: 60px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
  display: none;
  filter: drop-shadow(0 0 6px rgba(160,220,255,0.6));
}
.stk-chest--active { display: block; }
.stk-chest--opened { filter: drop-shadow(0 0 10px rgba(255,215,0,0.9)); }

/* 方向インジケーター（▲） */
.stk-direction {
  position: absolute;
  width: 0; height: 0;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 4;
  display: none;
  /* 三角形はJS側でinline SVGを使う（回転が必要なため） */
}
.stk-direction--active { display: block; }
```

### 4. `src/ui.js`

**コンストラクタ変更：**
```javascript
// 削除
this._stkMarker = document.getElementById('stk-marker-R');

// 追加
this._stkChest     = document.getElementById('stk-chest-R');
this._stkDirection = document.getElementById('stk-direction-R');
this._worldOffsetX = 0;
this._worldOffsetY = 0;
this._stkChestOpened = false;
```

**定数（ファイル先頭に追加）：**
```javascript
// 宝箱SVG文字列（closed: 青白, opened: 金）
const _STK_CHEST_CLOSED_SVG = `<svg viewBox="-20 -20 40 40" ...>`; // 閉じた宝箱
const _STK_CHEST_OPEN_SVG   = `<svg viewBox="-20 -20 40 40" ...>`; // 開いた宝箱＋スパークル
```

宝箱SVGデザイン（閉）:
- 本体 rect(-14,-4, 28, 14)、蓋 rect(-14,-14, 28, 10)、留め金 rect(-3,-6, 6, 5)
- stroke: `#a0e8f8`（teal/cyan）、fill: 薄い半透明
- drop-shadow でぼんやり発光

宝箱SVGデザイン（開）:
- 本体 同じ、蓋を transform="rotate(-50 -14 -9)" で開いた形
- 内部に薄い金色 circle、4本のスパークルライン
- stroke: `#ffe080`（ゴールド）

**`_moveFrameCursor` → `_moveWorldCursor` に置き換え：**
```javascript
_moveWorldCursor(x, y) {
  if (!this._stkFrame) return;
  this._worldOffsetX = x;
  this._worldOffsetY = y;

  // ① グリッド背景をスクロール
  const field = this._stickField.R;
  if (field) {
    const W = field.offsetWidth, H = field.offsetHeight;
    const cellW = W * 0.20, cellH = H * 0.30;
    const bpx = ((-x * W / 2) % cellW + cellW) % cellW;
    const bpy = ((-y * H / 2) % cellH + cellH) % cellH;
    field.style.backgroundPosition = `${bpx}px ${bpy}px`;
  }

  // ② 宝箱のスクリーン位置を更新
  const sx = this._stkMarkerX - x; // スクリーン正規化座標 [-1..1]
  const sy = this._stkMarkerY - y;
  if (this._stkChest) {
    this._stkChest.style.left = ((sx + 1) / 2 * 100) + '%';
    this._stkChest.style.top  = ((sy + 1) / 2 * 100) + '%';
  }

  // ③ 連続キャプチャ判定（一度開いたら維持）
  if (this._stkActive && !this._stkChestOpened) {
    const captured = Math.abs(sx) <= STK_FRAME_HALF_W &&
                     Math.abs(sy) <= STK_FRAME_HALF_H;
    if (captured) {
      this._stkChestOpened = true;
      if (this._stkChest) {
        this._stkChest.innerHTML = _STK_CHEST_OPEN_SVG;
        this._stkChest.classList.add('stk-chest--opened');
      }
      if (this._stkFrame) {
        this._stkFrame.className = 'stk-frame stk-frame--in';
      }
    }
  }

  // ④ 方向インジケーター更新
  this._updateDirectionIndicator(sx, sy);
}
```

**`_updateDirectionIndicator(sx, sy)`（新規）：**
```javascript
_updateDirectionIndicator(sx, sy) {
  const el = this._stkDirection;
  if (!el) return;
  const onScreen = Math.abs(sx) <= 1 && Math.abs(sy) <= 1;
  if (onScreen || !this._stkActive || this._stkChestOpened) {
    el.classList.remove('stk-direction--active');
    return;
  }
  el.classList.add('stk-direction--active');
  // エッジ位置（PADDING=4%）
  const scale = Math.max(Math.abs(sx), Math.abs(sy));
  const PADDING = 0.08;
  const ex = Math.max(-1+PADDING, Math.min(1-PADDING, sx / scale));
  const ey = Math.max(-1+PADDING, Math.min(1-PADDING, sy / scale));
  el.style.left = ((ex + 1) / 2 * 100) + '%';
  el.style.top  = ((ey + 1) / 2 * 100) + '%';
  // 回転（▲が宝箱方向を指す）
  const angleDeg = Math.atan2(sy, sx) * 180 / Math.PI + 90;
  el.style.transform = `translate(-50%, -50%) rotate(${angleDeg}deg)`;
  // 三角形SVG（初回のみ設定でよい）
  if (!el.innerHTML) {
    el.innerHTML = `<svg width="14" height="14" viewBox="0 0 14 14">
      <polygon points="7,0 14,14 0,14" fill="rgba(255,215,0,0.9)"
        filter="drop-shadow(0 0 4px #FFD700)"/>
    </svg>`;
  }
}
```

**`updateStickCursors` の変更：**
```javascript
// 変更前: this._moveFrameCursor(stickR.x, stickR.y);
// 変更後:
this._moveWorldCursor(stickR.x, stickR.y);
```

**`showStackWarning` の変更：**
```javascript
showStackWarning(markerX, markerY) {
  this._stkActive      = true;
  this._stkMarkerX     = markerX;
  this._stkMarkerY     = markerY;
  this._worldOffsetX   = 0;
  this._worldOffsetY   = 0;
  this._stkChestOpened = false;

  if (this._stkChest) {
    this._stkChest.innerHTML = _STK_CHEST_CLOSED_SVG;
    this._stkChest.className = 'stk-chest stk-chest--active';
    // 初期位置はmarkerX/Yがそのままスクリーン座標（offset=0のため）
    this._stkChest.style.left = ((markerX + 1) / 2 * 100) + '%';
    this._stkChest.style.top  = ((markerY + 1) / 2 * 100) + '%';
  }
  if (this._stkFrame) {
    this._stkFrame.className = 'stk-frame'; // 中央固定、初期はニュートラル
  }
  // 既存: フィールドアクティブ化 + overlay追加（変更なし）
  if (this._stickField.R) {
    this._stickField.R.classList.add('stick-field--active');
    if (!this._stkOverlay) {
      this._stkOverlay = document.createElement('div');
      this._stkOverlay.className = 'stk-overlay';
      this._stickField.R.appendChild(this._stkOverlay);
    }
  }
}
```

**`clearStack` の変更：**
```javascript
clearStack() {
  this._stkActive      = false;
  this._stkChestOpened = false;
  if (this._stkChest)     { this._stkChest.className = 'stk-chest'; }
  if (this._stkDirection) { this._stkDirection.classList.remove('stk-direction--active'); }
  if (this._stkFrame)     { this._stkFrame.className = 'stk-frame'; }
  if (this._stickField.R) { this._stickField.R.classList.remove('stick-field--active'); }
  if (this._stkOverlay)   { this._stkOverlay.remove(); this._stkOverlay = null; }
}
```

**`showStackResult` は変更なし**（`stk-frame--hit` / `stk-frame--dodge` はそのまま流用）

### 5. `src/aoe.js`

**`_spawnStack` の変更：**
```javascript
_spawnStack() {
  // ① stickR を (0,0) にリセット（ワールドオフセットを必ず0から開始）
  this.input.stickR.x = 0;
  this.input.stickR.y = 0;

  // ② スポーン範囲：50%でオフスクリーン、50%でオンスクリーン
  const offscreen = Math.random() < 0.5;
  const maxRange  = offscreen ? STK_CHEST_SPAWN_OFFSCREEN_MAX : STK_CHEST_SPAWN_ONSCREEN_MAX;
  let markerX, markerY;
  do {
    markerX = (Math.random() * 2 - 1) * maxRange;
    markerY = (Math.random() * 2 - 1) * maxRange;
  } while (Math.abs(markerX) <= STK_FRAME_HALF_W && Math.abs(markerY) <= STK_FRAME_HALF_H);

  this._stkMarkerX = markerX;
  this._stkMarkerY = markerY;
  this.ui.showStackWarning(markerX, markerY);
  // ... 以下変更なし
}
```

**`_checkStackHit` の置き換え：**
```javascript
_checkStackHit() {
  // 宝箱が一度も開かれなければヒット（失敗）
  return !this.ui._stkChestOpened;
}
```

**`_fireStack` の変更：**
```javascript
_fireStack() {
  if (!this._active) return;
  const isHit = this._checkStackHit(); // 引数不要
  // ... 以下変更なし
}
```

---

## 座標系まとめ

```
ワールド座標   stickR.x/y（±1.4まで、input.jsが±1でクランプ）
スクリーン座標  sx = chestWorldX - worldOffsetX  （±1 = フィールド端）
CSS%        left = (sx + 1) / 2 * 100 %
```

フレームハーフサイズ（STK_FRAME_HALF_W = 0.48875）はスクリーン座標で計算済み。  
stickR.x 最大±1 でワールドを最大±1 スクロールできるため、  
最大オフスクリーン ±1.4 は必ず到達可能（1.4 - 1.0 = 0.4 < 0.48875）。

---

## 検証方法

1. `npm start` でサーブ後、ブラウザで開く
2. ゲーム開始 → 右パネルを観察：
   - グリッド背景が薄く表示されること
   - ギミック開始時、黄橙の閉じた宝箱が（時には画面外に）出現すること
   - 画面外の場合、枠の端に ▲ が宝箱方向を指すこと
   - 矢印キーで枠に宝箱を入れると宝箱が開いて金色に光ること
   - 宝箱が一度開いたら枠を外しても維持されること
   - 成功（開いた状態で時間切れ）→ dodge判定（緑glow）
   - 失敗（開けずに時間切れ）→ hit判定（赤glow、時間-5s）
3. 左パネルのAoEギミックが影響を受けていないことを確認
4. ポーズ/再開が正常に動作することを確認
