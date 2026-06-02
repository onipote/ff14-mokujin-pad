# AoE修正計画（出現頻度調整・small-circles改善）

## Context

現状の `_spawn()` では 8 種のパターンを等確率（各 12.5%）で選ぶため、
left / right / top / bottom の 4 方向が合計 50% を占めて出すぎている。
また `small-circles` は 2〜4 個スポーンで、円同士が重なる場合がある。

## 変更ファイル

`src/aoe.js` のみ

---

## 変更 1: left/right/top/bottom を「1種類」扱いにする

**対象: `_spawn()` 内**

```js
// 変更前
const types = ['left', 'right', 'top', 'bottom',
               'large-circle', 'small-circles', 'fan', 'band'];
this._type = types[Math.floor(Math.random() * types.length)];

// 変更後
const categories = ['directional', 'large-circle', 'small-circles', 'fan', 'band'];
const cat = categories[Math.floor(Math.random() * categories.length)];
const dirTypes = ['left', 'right', 'top', 'bottom'];
this._type = cat === 'directional'
  ? dirTypes[Math.floor(Math.random() * dirTypes.length)]
  : cat;
```

効果: 方向系が合計 1/5 = 20%（従来 50%）に低下。

---

## 変更 2: small-circles の最低数を 3 に、重なり防止を追加

**対象: `_buildAoeData()` 内 `'small-circles'` case**

```js
case 'small-circles': {
  const r = 0.25 * sizeScale;
  const count = 3 + Math.floor(Math.random() * 2); // 3 or 4
  const circles = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      circles.push({ cx: this.input.stickL.x, cy: this.input.stickL.y });
    } else {
      let cx, cy, attempts = 0;
      do {
        cx = (Math.random() * 2 - 1) * (1 - r);
        cy = (Math.random() * 2 - 1) * (1 - r);
        attempts++;
      } while (attempts < 20 && circles.some(c => {
        const dx = cx - c.cx, dy = cy - c.cy;
        return dx * dx + dy * dy < r * r;
      }));
      circles.push({ cx, cy });
    }
  }
  return { type, r, circles };
}
```

変更点:
- `2 + random(0-2)` → `3 + random(0-1)` （3〜4個に）
- `Array.from` を `for` ループに置き換え、重なりチェックを追加
- 重なり条件: `dist(center_A, center_B) < r`（中心が他の円内に入らない）
- 最大 20 回リトライ、置けなければそのまま配置（フォールバック）

---

## 検証方法

1. `npm start` でサーブ
2. ブラウザでゲームを開き左パネルを観察
   - 方向系 AoE（矢印半分塗りつぶし）の出現頻度が減ったことを確認
   - `small-circles` 出現時に常に 3〜4 個スポーンし、重なりがないことを確認
