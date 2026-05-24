# 右AOEパネル → 視線ギミック変更計画

## Context

右パネルのAOEドッジ（半面ハイライトを避ける）を、カメラ移動イメージの「視線ギミック」に変更する。
- Rスティックで長方形フレームを動かし、フィールド内にランダム出現する「目アイコン」を枠外に保つ
- 枠内に目の中心が入った時点で被弾（見てしまった）
- 左パネルのAOEは一切変更しない

---

## 数値設計

| 変数 | 値 | 意味 |
|------|-----|------|
| GAZE_FRAME_W_PCT | 34 | フレーム幅（フィールドwidth比%） |
| GAZE_FRAME_H_PCT | 50 | フレーム高さ（フィールドheight比%） |
| GAZE_FRAME_HALF_W | 0.34 | 正規化半幅 = 17/50 |
| GAZE_FRAME_HALF_H | 0.50 | 正規化半高 = 25/50 |
| GAZE_EYE_RANGE | 0.8 | 目スポーン範囲 ±0.8（正規化） |

面積 = 34% × 50% = 17% ≈ 1/6 ✓（フィールド3:2比率で自然な縦横比）

フレーム移動制約（フレームがはみ出ない）：
- CSS: `left ∈ [17%, 83%]`, `top ∈ [25%, 75%]`
- 正規化: `x ∈ [-0.66, 0.66]`, `y ∈ [-0.50, 0.50]`

ヒット判定（正規化）：
```
cx = clamp(stickR.x, -(1-GAZE_FRAME_HALF_W), 1-GAZE_FRAME_HALF_W)
cy = clamp(stickR.y, -(1-GAZE_FRAME_HALF_H), 1-GAZE_FRAME_HALF_H)
hit = |eyeX - cx| <= GAZE_FRAME_HALF_W && |eyeY - cy| <= GAZE_FRAME_HALF_H
```

---

## 変更ファイルと変更内容

### 1. `src/constants.js` — 末尾に追加

```javascript
// 視線ギミック（右パネル）
const GAZE_FRAME_W_PCT  = 34;
const GAZE_FRAME_H_PCT  = 50;
const GAZE_FRAME_HALF_W = 0.34;  // = (GAZE_FRAME_W_PCT/2) / 50
const GAZE_FRAME_HALF_H = 0.50;  // = (GAZE_FRAME_H_PCT/2) / 50
const GAZE_EYE_RANGE    = 0.8;
```

---

### 2. `index.html` — 右パネルのDOM置き換え

```html
<!-- R パネル（変更後） -->
<div class="stick-panel" id="stick-panel-R">
  <div class="stick-field" id="stick-field-R">
    <div class="gaze-eye" id="gaze-eye-R"></div>
    <div class="gaze-frame" id="gaze-frame-R"></div>
  </div>
  <div class="stick-side-label">R</div>
</div>
```

削除：`aoe-zone-R`、`stick-cursor-R`（`cursor-icon`スパン含む）

---

### 3. `styles/main.css` — 末尾に追加

```css
/* ===== 視線ギミック（右パネル）===== */
.gaze-frame {
  position: absolute;
  width: 34%;
  height: 50%;
  transform: translate(-50%, -50%);
  left: 50%;
  top: 50%;
  pointer-events: none;
  z-index: 2;
  border: 2px solid rgba(160, 232, 248, 0.70);
  border-radius: 3px;
  background: rgba(160, 232, 248, 0.04);
  box-shadow: 0 0 8px rgba(160, 232, 248, 0.4), inset 0 0 6px rgba(160, 232, 248, 0.08);
}
.gaze-frame--active {
  border-color: rgba(255, 85, 0, 0.85);
  box-shadow: 0 0 14px rgba(255, 69, 0, 0.6), inset 0 0 10px rgba(255, 60, 0, 0.15);
}
.gaze-frame--hit {
  border-color: rgba(230, 60, 60, 0.9);
  box-shadow: 0 0 18px rgba(210, 40, 40, 0.7), inset 0 0 12px rgba(210, 40, 40, 0.3);
}
.gaze-frame--dodge {
  border-color: rgba(55, 200, 85, 0.75);
  box-shadow: 0 0 16px rgba(35, 185, 75, 0.5), inset 0 0 10px rgba(35, 185, 75, 0.2);
}

.gaze-eye {
  position: absolute;
  width: 28px;
  height: 20px;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 1;
  display: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 28 20'%3E%3Cellipse cx='14' cy='10' rx='13' ry='9' fill='%23180000' stroke='%23cc1111' stroke-width='1.5'/%3E%3Ccircle cx='14' cy='10' r='5.5' fill='%238b0000'/%3E%3Ccircle cx='14' cy='10' r='3.2' fill='%23000000'/%3E%3Ccircle cx='16' cy='8' r='1.4' fill='%23ffffff' opacity='0.95'/%3E%3Cpath d='M4 7 Q14 1 24 7' stroke='%23990000' stroke-width='1' fill='none' opacity='0.6'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  filter: drop-shadow(0 0 4px rgba(200, 0, 0, 0.8));
}
.gaze-eye--visible {
  display: block;
  animation: gaze-eye-pulse 0.6s ease-in-out infinite alternate;
}
.gaze-eye--hit   { display: block; filter: drop-shadow(0 0 8px rgba(255, 50, 50, 1)); }
.gaze-eye--dodge { display: block; filter: drop-shadow(0 0 4px rgba(50, 200, 80, 0.8)); opacity: 0.5; }

@keyframes gaze-eye-pulse {
  from { filter: drop-shadow(0 0 3px rgba(200, 0, 0, 0.7)); transform: translate(-50%, -50%) scale(0.95); }
  to   { filter: drop-shadow(0 0 8px rgba(255, 30, 30, 1)); transform: translate(-50%, -50%) scale(1.10); }
}
```

既存の `#stick-cursor-R { left: 50%; top: 50%; }` 行を削除する。

---

### 4. `src/aoe.js` — 変更内容

**コンストラクタ**: `_gazeEyeX = 0`, `_gazeEyeY = 0` を追加

**`stop()`**: `this.ui.clearAoe('R')` → `this.ui.clearGaze()` に変更

**`_spawn()`**: L/R分岐を追加（右はgaze、左はAOE）
```javascript
_spawn() {
  if (!this._active) return;
  this._side = Math.random() < 0.5 ? 'L' : 'R';
  if (this._side === 'R') { this._spawnGaze(); return; }
  // 左パネル: 従来のAOEロジック（types分岐含め変更なし）
  const types = ['left', 'right', 'top', 'bottom'];
  this._type = types[Math.floor(Math.random() * 4)];
  this.ui.showAoeWarning(this._side, this._type);
  this._fireId = setTimeout(() => {
    if (!this._active) return;
    const isHit = this._checkHit(this.input.stickL.x, this.input.stickL.y, this._type);
    this.ui.showAoeResult(this._side, this._type, isHit);
    if (isHit) { if (this.onHit) this.onHit(); } else { if (this.onDodge) this.onDodge(); }
    this._clearId = setTimeout(() => {
      if (!this._active) return;
      this.ui.clearAoe(this._side);
      this._side = this._type = null;
      this._scheduleNext();
    }, AOE_FIRE_MS);
  }, AOE_WARNING_MS);
}
```

**追加: `_spawnGaze()`**
```javascript
_spawnGaze() {
  this._gazeEyeX = (Math.random() * 2 - 1) * GAZE_EYE_RANGE;
  this._gazeEyeY = (Math.random() * 2 - 1) * GAZE_EYE_RANGE;
  this.ui.showGazeWarning(this._gazeEyeX, this._gazeEyeY);
  this._fireId = setTimeout(() => {
    if (!this._active) return;
    const isHit = this._checkGazeHit(
      this.input.stickR.x, this.input.stickR.y,
      this._gazeEyeX, this._gazeEyeY
    );
    this.ui.showGazeResult(isHit);
    if (isHit) { if (this.onHit) this.onHit(); } else { if (this.onDodge) this.onDodge(); }
    this._clearId = setTimeout(() => {
      if (!this._active) return;
      this.ui.clearGaze();
      this._side = null;
      this._gazeEyeX = this._gazeEyeY = 0;
      this._scheduleNext();
    }, AOE_FIRE_MS);
  }, AOE_WARNING_MS);
}
```

**追加: `_checkGazeHit(rx, ry, eyeX, eyeY)`**
```javascript
_checkGazeHit(rx, ry, eyeX, eyeY) {
  const cx = Math.max(-(1 - GAZE_FRAME_HALF_W), Math.min(1 - GAZE_FRAME_HALF_W, rx));
  const cy = Math.max(-(1 - GAZE_FRAME_HALF_H), Math.min(1 - GAZE_FRAME_HALF_H, ry));
  return Math.abs(eyeX - cx) <= GAZE_FRAME_HALF_W &&
         Math.abs(eyeY - cy) <= GAZE_FRAME_HALF_H;
}
```

---

### 5. `src/ui.js` — 変更内容

**コンストラクタ**: 以下に変更
```javascript
this._aoeZone   = { L: document.getElementById('aoe-zone-L') };       // R削除
this._stickCur  = { L: document.getElementById('stick-cursor-L') };   // R削除
this._stickField = { L: document.getElementById('stick-field-L'), R: document.getElementById('stick-field-R') };
this._gazeEye   = document.getElementById('gaze-eye-R');
this._gazeFrame = document.getElementById('gaze-frame-R');
```

**`updateStickCursors()`**: Rをフレーム移動に変更
```javascript
updateStickCursors(stickL, stickR) {
  this._moveCursor(this._stickCur.L, stickL.x, stickL.y);
  this._moveFrameCursor(stickR.x, stickR.y);
}
```

**追加: `_moveFrameCursor(x, y)`**
```javascript
_moveFrameCursor(x, y) {
  if (!this._gazeFrame) return;
  const halfW = GAZE_FRAME_W_PCT / 2;
  const halfH = GAZE_FRAME_H_PCT / 2;
  const leftPct = Math.max(halfW, Math.min(100 - halfW, (x + 1) / 2 * 100));
  const topPct  = Math.max(halfH, Math.min(100 - halfH, (y + 1) / 2 * 100));
  this._gazeFrame.style.left = leftPct + '%';
  this._gazeFrame.style.top  = topPct  + '%';
}
```

**追加: `showGazeWarning(eyeX, eyeY)`**
```javascript
showGazeWarning(eyeX, eyeY) {
  if (this._gazeEye) {
    this._gazeEye.style.left = ((eyeX + 1) / 2 * 100) + '%';
    this._gazeEye.style.top  = ((eyeY + 1) / 2 * 100) + '%';
    this._gazeEye.className  = 'gaze-eye gaze-eye--visible';
  }
  if (this._gazeFrame) this._gazeFrame.classList.add('gaze-frame--active');
  if (this._stickField.R) this._stickField.R.classList.add('stick-field--active');
}
```

**追加: `showGazeResult(isHit)`**
```javascript
showGazeResult(isHit) {
  if (this._gazeEye) {
    this._gazeEye.className = 'gaze-eye ' + (isHit ? 'gaze-eye--hit' : 'gaze-eye--dodge');
  }
  if (this._gazeFrame) {
    this._gazeFrame.classList.remove('gaze-frame--active');
    this._gazeFrame.classList.add(isHit ? 'gaze-frame--hit' : 'gaze-frame--dodge');
  }
}
```

**追加: `clearGaze()`**
```javascript
clearGaze() {
  if (this._gazeEye)   this._gazeEye.className  = 'gaze-eye';
  if (this._gazeFrame) this._gazeFrame.className = 'gaze-frame';
  if (this._stickField.R) this._stickField.R.classList.remove('stick-field--active');
}
```

---

## 実装順序

1. `constants.js` → 2. `index.html` → 3. `styles/main.css` → 4. `ui.js` → 5. `aoe.js`

---

## 動作確認

1. ゲーム起動 → 右パネルに長方形フレームが中央に表示されている
2. Rスティック操作でフレームが動く、フィールド端に触れずに止まる
3. 右AOEイベント発火時：目アイコンがランダム位置に出現、フレームがオレンジ枠になる
4. 目の外にフレームを移動 → 判定時に緑枠（dodge）
5. 目をフレーム内に入れたまま → 判定時に赤枠（hit）、HP減少
6. 左パネルのAOEは従来通りに動作する
