# 左スティックAoEパターン追加

## Context

左スティック向けAoEは現在 `left/right/top/bottom` の4種のみ。これを8種に拡張し、視覚的・操作的なバリエーションを増やす。また全タイプにサイズのランダム振れ幅を追加して毎回の挙動を変化させる。

## 追加するタイプ

| タイプ名 | 内容 |
|---|---|
| `large-circle` | 大きな円（直径〜70%）、中心ランダム |
| `small-circles` | 小さな円 2〜4個、全て同サイズ、重なりあり |
| `band-h` | 横帯（全幅、縦位置ランダム） |
| `band-v` | 縦帯（全高、横位置ランダム） |

## アーキテクチャ変更

### 現在
`#aoe-zone-L` 単一divにCSSクラスで形状・状態制御

### 変更後
`#aoe-zone-L` を透明な100%×100%コンテナとし、子要素を動的生成で形状制御

```
#aoe-zone-L.aoe-zone.aoe-zone--container.aoe-zone--warning-out.aoe-zone--{type}
  └─ div.aoe-zone.aoe-zone--warning-out  (形状div、インラインstyle)
  └─ div.aoe-zone.aoe-zone--warning-out  (small-circles の場合2〜4個)
```

コンテナ自身にも型クラス・状態クラスを付与する（既存テストとの後方互換のため）。

## aoeData オブジェクト（型定義）

```javascript
// 既存タイプ
{ type: 'left'|'right'|'top'|'bottom', sizeScale: 0.85〜1.15 }

// 大きな円
{ type: 'large-circle', cx: number, cy: number, r: number }
// 中心: cx,cy ∈ [-1+r, 1-r]、r = 0.35 * sizeScale

// 小さな複数円
{ type: 'small-circles', r: number, circles: [{cx, cy}, ...] }
// r = 0.18 * sizeScale、count ∈ [2, 4]

// 横帯
{ type: 'band-h', cy: number, halfThick: number }
// halfThick = 0.20 * sizeScale、cy ∈ [-(1-halfThick), 1-halfThick]

// 縦帯
{ type: 'band-v', cx: number, halfThick: number }
```

## 変更ファイルと内容

### 1. `src/constants.js`

末尾に追加：
```javascript
const AOE_SIZE_SCALE_BASE  = 0.85;
const AOE_SIZE_SCALE_RANGE = 0.30; // 0.85〜1.15
```

### 2. `src/aoe.js`

**コンストラクタ**: `this._aoeData = null` 追加

**`_spawn()`**:
- types配列を8種に拡張
- `_buildAoeData(type)` でaoeDataオブジェクト生成
- UIメソッドに型文字列の代わり `this._aoeData` を渡す
- stop/clearコールバックで `this._aoeData = null`

**`_buildAoeData(type)` 追加**:
```javascript
_buildAoeData(type) {
  const sizeScale = AOE_SIZE_SCALE_BASE + Math.random() * AOE_SIZE_SCALE_RANGE;
  switch (type) {
    case 'left': case 'right': case 'top': case 'bottom':
      return { type, sizeScale };
    case 'large-circle': {
      const r = 0.35 * sizeScale;
      return { type, cx: (Math.random()*2-1)*(1-r), cy: (Math.random()*2-1)*(1-r), r };
    }
    case 'small-circles': {
      const r = 0.18 * sizeScale;
      const count = 2 + Math.floor(Math.random() * 3);
      const circles = Array.from({ length: count }, () => ({
        cx: (Math.random()*2-1)*(1-r), cy: (Math.random()*2-1)*(1-r)
      }));
      return { type, r, circles };
    }
    case 'band-h': {
      const halfThick = 0.20 * sizeScale;
      return { type, cy: (Math.random()*2-1)*(1-halfThick), halfThick };
    }
    case 'band-v': {
      const halfThick = 0.20 * sizeScale;
      return { type, cx: (Math.random()*2-1)*(1-halfThick), halfThick };
    }
  }
}
```

**`_checkHit(x, y, aoeData)` 変更** (第3引数をオブジェクトに):
```javascript
_checkHit(x, y, d) {
  switch (d.type) {
    case 'left':         return x < d.sizeScale - 1;
    case 'right':        return x > 1 - d.sizeScale;
    case 'top':          return y < d.sizeScale - 1;
    case 'bottom':       return y > 1 - d.sizeScale;
    case 'large-circle': return (x-d.cx)**2 + (y-d.cy)**2 < d.r**2;
    case 'small-circles':return d.circles.some(c => (x-c.cx)**2+(y-c.cy)**2 < d.r**2);
    case 'band-h':       return Math.abs(y - d.cy) < d.halfThick;
    case 'band-v':       return Math.abs(x - d.cx) < d.halfThick;
  }
  return false;
}
```

> 境界確認: `sizeScale=1.0` のとき `left` → `x < 0`（既存と同一）

### 3. `src/ui.js`

**コンストラクタ**: `_aoeType` → `_aoeData` に名称変更

**`showAoeWarning(side, aoeData)`**:
```javascript
showAoeWarning(side, aoeData) {
  const el = this._aoeZone[side];
  if (el) {
    // コンテナ自身にも型・状態クラスを付ける（テスト後方互換）
    el.className = `aoe-zone aoe-zone--container aoe-zone--warning-out aoe-zone--${aoeData.type}`;
    el.innerHTML = '';
    this._buildShapeEls(aoeData).forEach(child => {
      child.classList.add('aoe-zone--warning-out');
      el.appendChild(child);
    });
  }
  if (this._stickField[side]) this._stickField[side].classList.add('stick-field--active');
  this._aoeActive = true;
  this._aoeData   = aoeData;
}
```

**`showAoeResult(side, aoeData, isHit)`**:
```javascript
showAoeResult(side, aoeData, isHit) {
  this._aoeActive = false;
  const state = isHit ? 'aoe-zone--hit' : 'aoe-zone--dodge';
  const el = this._aoeZone[side];
  if (el) {
    el.className = `aoe-zone aoe-zone--container ${state} aoe-zone--${aoeData.type}`;
    this._setAoeChildState(side, state);
  }
  if (this._stickCur.L) this._stickCur.L.className = 'stick-cursor';
}
```

**`clearAoe(side)`**:
```javascript
clearAoe(side) {
  this._aoeActive = false;
  this._aoeData   = null;
  const el = this._aoeZone[side];
  if (el) { el.className = 'aoe-zone'; el.innerHTML = ''; }
  if (this._stickField[side]) this._stickField[side].classList.remove('stick-field--active');
  if (this._stickCur.L) this._stickCur.L.className = 'stick-cursor';
}
```

**`_moveCursor()` の変更**: switch文を `_isInAoe()` に置き換え:
```javascript
if (this._aoeActive && this._aoeData) {
  const inside = this._isInAoe(x, y, this._aoeData);
  el.className = 'stick-cursor ' + (inside ? 'stick-cursor--in' : 'stick-cursor--out');
  const state = inside ? 'aoe-zone--warning-in' : 'aoe-zone--warning-out';
  const zone = this._aoeZone.L;
  if (zone) {
    zone.className = `aoe-zone aoe-zone--container ${state} aoe-zone--${this._aoeData.type}`;
    this._setAoeChildState('L', state);
  }
}
```

**追加メソッド `_buildShapeEls(aoeData)`**:
- 各タイプに応じた `<div>` をインラインスタイル付きで生成して配列で返す
- 座標変換: `pct(v) = (v + 1) / 2 * 100`
- left: `left:0;top:0;width:${50*scale}%;height:100%;border-radius:0`
- right: `left:${100-50*scale}%;top:0;width:${50*scale}%;height:100%;border-radius:0`
- top: `left:0;top:0;width:100%;height:${50*scale}%;border-radius:0`
- bottom: `left:0;top:${100-50*scale}%;width:100%;height:${50*scale}%;border-radius:0`
- circle: `left:${pct(cx)}%;top:${pct(cy)}%;width:${r*100}%;height:${r*100}%;transform:translate(-50%,-50%);border-radius:50%`
- band-h: `left:0;width:100%;top:${pct(cy)}%;height:${halfThick*100}%;transform:translateY(-50%)`
- band-v: `top:0;height:100%;left:${pct(cx)}%;width:${halfThick*100}%;transform:translateX(-50%)`

> 注: フィールドは `aspect-ratio:3/2` のため円は視覚的に縦長楕円になるが、ヒット判定は正規化座標で正円。実用上問題なし。

**追加メソッド `_setAoeChildState(side, stateClass)`**:
```javascript
_setAoeChildState(side, stateClass) {
  const container = this._aoeZone[side];
  if (!container) return;
  const states = ['aoe-zone--warning-out','aoe-zone--warning-in','aoe-zone--hit','aoe-zone--dodge'];
  container.querySelectorAll('.aoe-zone').forEach(el => {
    states.forEach(s => el.classList.remove(s));
    el.classList.add(stateClass);
  });
}
```

**追加メソッド `_isInAoe(x, y, d)`**: `aoe.js._checkHit` と同一ロジックをコピー（グローバルスクリプト構成のため共有関数化より単純コピーが安全）

### 4. `styles/main.css`

`.aoe-zone--left/right/top/bottom` の後に追加:
```css
.aoe-zone--container {
  left: 0; top: 0; width: 100%; height: 100%;
  background: none; border: none; box-shadow: none; border-radius: 0;
}
```

### 5. `tests/aoe-verify.js`

step5の `DANGER_KEYS` を拡張し、新型の場合はキー操作をスキップして次サイクルへ:
```javascript
const DANGER_KEYS = {
  L: { left: 'A', right: 'D', top: 'W', bottom: 'S',
       'large-circle': null, 'small-circles': null, 'band-h': 'W', 'band-v': 'D' },
  // ...
};
// key が null なら危険ゾーン操作をスキップ
if (key) {
  await page.keyboard.down(key);
  await page.waitForTimeout(900);
  await page.keyboard.up(key);
}
```

> `band-h` は縦帯なのでWキー（上）で帯内に入れる可能性あり。`large-circle`/`small-circles` は位置ランダムのため確実な操作が難しいのでスキップ。

## 追加修正（フォローアップ）

### 真円化・サイズ拡大・左スティック速度調整

#### 1. `src/constants.js`

`STICK_SPEED` の後に左スティック専用速度を追加：
```javascript
const STICK_SPEED_L = STICK_SPEED * 0.85; // 左スティックのみ15%減速
```

#### 2. `src/input.js`

stickL の更新4箇所（キーボード行114-115、ゲームパッド行131-132）を `STICK_SPEED` → `STICK_SPEED_L` に変更：
```javascript
// 行114-115
this.stickL.x = Math.max(-1, Math.min(1, this.stickL.x + lx  * STICK_SPEED_L * dt));
this.stickL.y = Math.max(-1, Math.min(1, this.stickL.y + ly  * STICK_SPEED_L * dt));
// 行131-132
this.stickL.x = Math.max(-1, Math.min(1, this.stickL.x + lax * STICK_SPEED_L * dt));
this.stickL.y = Math.max(-1, Math.min(1, this.stickL.y + lay * STICK_SPEED_L * dt));
```

stickR の行116-117・134-136 は `STICK_SPEED` のまま変更しない。

#### 3. `src/aoe.js` — 円サイズ拡大・判定式修正

`_buildAoeData()` のサイズ値を変更：
```javascript
case 'large-circle': {
  const r = 0.55 * sizeScale; // 0.35→0.55（CSS直径 ~55%に拡大）
  ...
}
case 'small-circles': {
  const r = 0.25 * sizeScale; // 0.18→0.25（CSS直径 ~25%に拡大）
  ...
}
```

`_checkHit()` の円判定を楕円式に変更（フィールドが 3:2 比なので視覚的真円の当たり判定は楕円）：
```javascript
case 'large-circle':
case 'small-circles のベース':
// 旧: (x-d.cx)**2 + (y-d.cy)**2 < d.r**2
// 新: x方向semi-axis = r, y方向 = r*(3/2) → 楕円式
return (x-d.cx)**2 + (y-d.cy)**2 / 2.25 < d.r**2;
// 2.25 = (3/2)^2 = フィールドの aspect-ratio 補正
```

つまり：
```javascript
case 'large-circle': {
  const dx = x - d.cx, dy = y - d.cy;
  return dx*dx + dy*dy/2.25 < d.r*d.r;
}
case 'small-circles':
  return d.circles.some(c => {
    const dx = x - c.cx, dy = y - c.cy;
    return dx*dx + dy*dy/2.25 < d.r*d.r;
  });
```

#### 4. `src/ui.js` — 真円CSS・判定式修正

`_buildShapeEls()` の円部分：`height:${size}%` を削除し `aspect-ratio:1` を追加：
```javascript
case 'large-circle': {
  const size = aoeData.r * 100;
  // 旧: `...width:${size}%;height:${size}%;transform:translate(-50%,-50%);border-radius:50%`
  // 新: aspect-ratio:1 で高さを自動計算 → ピクセル等辺の真円
  return [mk(`position:absolute;left:${pct(aoeData.cx)}%;top:${pct(aoeData.cy)}%;width:${size}%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%`)];
}
case 'small-circles':
  return aoeData.circles.map(c => {
    const size = aoeData.r * 100;
    return mk(`position:absolute;left:${pct(c.cx)}%;top:${pct(c.cy)}%;width:${size}%;aspect-ratio:1;transform:translate(-50%,-50%);border-radius:50%`);
  });
```

`_isInAoe()` の円判定も同じ楕円式に更新：
```javascript
case 'large-circle': {
  const dx = x - d.cx, dy = y - d.cy;
  return dx*dx + dy*dy/2.25 < d.r*d.r;
}
case 'small-circles':
  return d.circles.some(c => {
    const dx = x - c.cx, dy = y - c.cy;
    return dx*dx + dy*dy/2.25 < d.r*d.r;
  });
```

> **なぜ楕円式か:** `.stick-field` の CSS は `aspect-ratio: 3/2` で確認済み。`aspect-ratio:1` の円要素はピクセルでは正円だが、正規化座標では x方向 semi-axis = r、y方向 = r×(3/2) の楕円になる。 `2.25 = (3/2)²` で補正する。

---

## 追加修正2（フォローアップ2）

### ①AoE外背景の暗転・②小さな円にプレイヤー位置・③視線フレーム背景

#### 1. `styles/main.css`

**① `.aoe-overlay` クラスを追加**（`.aoe-zone--container` の近くに）：
```css
.aoe-overlay {
  position: absolute;
  left: 0; top: 0; width: 100%; height: 100%;
  background: rgba(0, 0, 0, 0.45);
  pointer-events: none;
}
```

**③ `.gaze-frame--in` と `.gaze-frame--out` に `background` を追加**（AoE外と同色）：
```css
.gaze-frame--in {
  background: rgba(0, 0, 0, 0.45);   /* 追加 */
  border-color: rgba(255, 85, 0, 0.85);
  box-shadow: ...;  /* 変更なし */
}
.gaze-frame--out {
  background: rgba(0, 0, 0, 0.45);   /* 追加 */
  border-color: rgba(55, 200, 85, 0.75);
  box-shadow: ...;  /* 変更なし */
}
```

#### 2. `src/ui.js` — `showAoeWarning()` にオーバーレイ追加

shape要素を追加する前に、暗転オーバーレイ div を先にコンテナへ追加する。
オーバーレイは `.aoe-zone` クラスを持たないため `_setAoeChildState` の querySelectorAll('.aoe-zone') で操作されない：

```javascript
showAoeWarning(side, aoeData) {
  const el = this._aoeZone[side];
  if (el) {
    el.className = `aoe-zone aoe-zone--container aoe-zone--warning-out aoe-zone--${aoeData.type}`;
    el.innerHTML = '';
    // ① AoE外を暗転するオーバーレイ（shape要素より先にDOMに追加 → 後ろに描画）
    const overlay = document.createElement('div');
    overlay.className = 'aoe-overlay';
    el.appendChild(overlay);
    // shape要素はオーバーレイの後に追加 → 前面に表示
    this._buildShapeEls(aoeData).forEach(child => {
      child.classList.add('aoe-zone--warning-out');
      el.appendChild(child);
    });
  }
  ...
}
```

#### 3. `src/aoe.js` — `_buildAoeData()` で `small-circles` の1つ目をプレイヤー位置に

`_buildAoeData` は `AoeEngine` のメソッドなので `this.input.stickL` へアクセス可能：

```javascript
case 'small-circles': {
  const r = 0.25 * sizeScale;
  const count = 2 + Math.floor(Math.random() * 3);
  const circles = Array.from({ length: count }, (_, i) => {
    if (i === 0) return { cx: this.input.stickL.x, cy: this.input.stickL.y }; // ② プレイヤー位置
    return { cx: (Math.random()*2-1)*(1-r), cy: (Math.random()*2-1)*(1-r) };
  });
  return { type, r, circles };
}
```

> プレイヤー位置は既に `[-1, 1]` にクランプ済みのため範囲チェック不要。

---

## 確認方法

1. ブラウザでゲーム起動 → AoEが8種ランダム出現することを確認
2. 各新タイプの視覚表示（円形、複数円、帯）を確認
3. **円が真円（楕円でない）に見えることを確認**
4. **大きな円・小さな円が以前より大きく見えることを確認**
5. **左スティックが右スティックより遅く動くことを確認**
6. **① AoE表示中、AoE外がダークオーバーレイで暗くなることを確認**
7. **② 小さな円が出たとき、必ず1つがカーソルの現在位置に重なることを確認**
8. **③ 右スティックで目が出ているとき、カーソル枠の内側が暗い背景色になることを確認**
9. カーソルをAoE内外に動かしてカーソル色（赤/緑）が変わることを確認
10. `node tests/aoe-verify.js` でテスト通過を確認
