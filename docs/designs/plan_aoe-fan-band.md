# AoE追加・帯修正 実装計画

## Context

左パネルのAoEパターンに2つの変更を加える。
1. **新パターン「扇形（fan）」** — 中心から放射状に広がる扇形を4本同時表示
2. **帯パターンの修正** — 現在1本のみの帯を2本同時表示に変更し、同方向の場合は重ならないよう配置

---

## 変更対象ファイル

- `src/aoe.js` — パターン選択・データ生成・当たり判定
- `src/ui.js` — 描画要素生成・リアルタイム判定

---

## 1. 扇形パターン（`'fan'`）の追加

### データ構造

```js
{ type: 'fan', halfAngle: number, baseAngle: number }
// halfAngle: 15〜30度（中心角の半分）= 中心角30〜60度
// baseAngle: 0〜360度（基準方向）
```

### `_buildAoeData()` 追加ケース（aoe.js）

```js
case 'fan': {
  const halfAngle = 15 + Math.random() * 15; // 30〜60度の半角
  const baseAngle = Math.random() * 360;
  return { type: 'fan', halfAngle, baseAngle };
}
```

### `_checkHit()` 追加ケース（aoe.js）

```js
case 'fan': {
  if (x === 0 && y === 0) return true;
  const deg = Math.atan2(y, x) * 180 / Math.PI;
  for (let i = 0; i < 4; i++) {
    const base = d.baseAngle + i * 90;
    let diff = ((deg - base) % 360 + 360) % 360;
    if (diff > 180) diff -= 360;
    if (Math.abs(diff) <= d.halfAngle) return true;
  }
  return false;
}
```

### `_buildShapeEls()` 追加ケース（ui.js）

4つの div 要素を生成し、各要素に `clip-path: polygon(...)` で扇形を表現。

```js
case 'fan': {
  return Array.from({ length: 4 }, (_, i) => {
    const baseDeg = aoeData.baseAngle + i * 90;
    const clip = _buildFanClipPath(baseDeg, aoeData.halfAngle);
    return mk(`position:absolute;left:0;top:0;width:100%;height:100%;clip-path:${clip};border-radius:0`);
  });
}
```

### ヘルパー関数 `_buildFanClipPath(baseDeg, halfDeg)`（ui.js内に追加）

```js
function _buildFanClipPath(baseDeg, halfDeg) {
  const startDeg = baseDeg - halfDeg;
  const endDeg   = baseDeg + halfDeg;
  const steps    = Math.max(6, Math.ceil(halfDeg * 2 / 5)); // 約5度ごとに1点
  const pts      = ['50% 50%'];
  for (let i = 0; i <= steps; i++) {
    const a = (startDeg + (endDeg - startDeg) * i / steps) * Math.PI / 180;
    pts.push(`${(50 + 150 * Math.cos(a)).toFixed(1)}% ${(50 + 150 * Math.sin(a)).toFixed(1)}%`);
  }
  return `polygon(${pts.join(', ')})`;
}
```

半径150%は、パネルのどの角からも中心を超えて十分に届く値（最大距離≈70.7%）。

---

## 2. 帯パターン（`'band'`）の修正

### 現状の問題点

- `band-h` と `band-v` が別々のパターンとして1本ずつ表示
- 要求仕様は「2本同時表示・同方向なら重ならない・縦横混在もあり」

### 新データ構造

```js
{
  type: 'band',
  halfThick: number,    // 帯の半幅（旧band-h/vと同じ計算）
  bands: [
    { dir: 'h' | 'v', pos: number },  // h: cy, v: cx
    { dir: 'h' | 'v', pos: number }
  ]
}
```

### `_buildAoeData()` 新 `'band'` ケース（aoe.js）

```js
case 'band': {
  const halfThick = 0.20 * sizeScale;
  const available = 1 - halfThick; // 中心位置の最大絶対値
  const roll = Math.random();
  let bands;
  if (roll < 0.33) {
    // 2本とも水平、重ならないよう上下ゾーンに分けて配置
    const a = -available + Math.random() * (available - halfThick);
    const b =  halfThick + Math.random() * (available - halfThick);
    bands = [{ dir: 'h', pos: a }, { dir: 'h', pos: b }];
  } else if (roll < 0.67) {
    // 2本とも垂直、同様
    const a = -available + Math.random() * (available - halfThick);
    const b =  halfThick + Math.random() * (available - halfThick);
    bands = [{ dir: 'v', pos: a }, { dir: 'v', pos: b }];
  } else {
    // 縦横1本ずつ
    bands = [
      { dir: 'h', pos: (Math.random() * 2 - 1) * available },
      { dir: 'v', pos: (Math.random() * 2 - 1) * available }
    ];
  }
  return { type: 'band', halfThick, bands };
}
```

重ならない保証：同方向の場合、pos_a ∈ [-available, -halfThick]、pos_b ∈ [halfThick, available] とするため、|pos_b - pos_a| >= 2*halfThick が保証される。

### `_checkHit()` 新 `'band'` ケース（aoe.js）

```js
case 'band':
  return d.bands.some(b =>
    b.dir === 'h' ? Math.abs(y - b.pos) < d.halfThick
                  : Math.abs(x - b.pos) < d.halfThick
  );
```

### `_buildShapeEls()` 新 `'band'` ケース（ui.js）

```js
case 'band': {
  return aoeData.bands.map(b => {
    const thick = aoeData.halfThick * 100;
    if (b.dir === 'h')
      return mk(`position:absolute;left:0;width:100%;top:${pct(b.pos)}%;height:${thick}%;transform:translateY(-50%);border-radius:0`);
    else
      return mk(`position:absolute;top:0;height:100%;left:${pct(b.pos)}%;width:${thick}%;transform:translateX(-50%);border-radius:0`);
  });
}
```

---

## 変更サマリー

### src/aoe.js

| 変更箇所 | 内容 |
|---|---|
| `types` 配列（行58-59） | `'band-h'`, `'band-v'` を削除し `'fan'`, `'band'` を追加 |
| `_buildAoeData()` | `'fan'` と `'band'` のケースを追加、`'band-h'`/`'band-v'` を削除 |
| `_checkHit()` | 同上 |

### src/ui.js

| 変更箇所 | 内容 |
|---|---|
| ファイル先頭付近 | `_buildFanClipPath(baseDeg, halfDeg)` 関数を追加 |
| `_buildShapeEls()` | `'fan'` と `'band'` のケースを追加、`'band-h'`/`'band-v'` を削除 |
| `_isInAoe()` | `'fan'` と `'band'` のケースを追加、`'band-h'`/`'band-v'` を削除 |

---

## 検証方法

1. `npm start` でサーバー起動
2. ゲーム開始し、左パネルのAoEを観察
3. **扇形確認**: 4本の扇形が90度ずつ回転して同時表示されること、中心角が毎回変わること
4. **帯確認**: 帯が必ず2本表示されること、同方向の場合は重ならないこと、縦横混在があること
5. 危険ゾーン内外でカーソルの色が正しく変わること（リアルタイム判定）
6. `tests/aoe-verify.js` があれば当たり判定テストを実行
