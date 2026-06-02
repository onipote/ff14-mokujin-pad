# Plan: 放射状AoE中心をランダムオフセット（内側1/4エリア）

## Context
放射状（fan）AoEの中心が常に移動範囲の中央(0,0)に固定されている。
これをずらし、移動可能エリアの面積的に中心1/4の領域内ランダム位置に出現させる。

「面積的に中心1/4」: 移動エリア全体は座標 [-1,1]×[-1,1]（面積4）。
その1/4 = 面積1 → 中心の正方形 [-0.5, 0.5]×[-0.5, 0.5] にランダム配置。

---

## 変更箇所

### 1. `src/aoe.js` — `_buildAoeData` の `'fan'` ケース

`cx` / `cy` プロパティを追加する：

```js
case 'fan': {
  const halfAngle = 15 + Math.random() * 15;
  const baseAngle = Math.random() * 360;
  const cx = (Math.random() * 2 - 1) * 0.5;  // [-0.5, 0.5]
  const cy = (Math.random() * 2 - 1) * 0.5;
  return { type, halfAngle, baseAngle, cx, cy };
}
```

### 2. `src/aoe.js` — `_checkHit` の `'fan'` ケース

角度計算をオフセット中心からの相対座標で行う：

```js
case 'fan': {
  const dx = x - d.cx;
  const dy = y - d.cy;
  if (dx === 0 && dy === 0) return true;
  const deg = Math.atan2(dy, dx) * 180 / Math.PI;
  // ... (角度判定ループは変更なし)
}
```

### 3. `src/ui.js` — `_buildFanClipPath` 関数

`cx`, `cy` パラメータを追加（デフォルト0）。
中心点とアーク点の計算をオフセット対応にする：

```js
function _buildFanClipPath(baseDeg, halfDeg, cx = 0, cy = 0) {
  const cxPct = (cx + 1) / 2 * 100;
  const cyPct = (cy + 1) / 2 * 100;
  const pts   = [`${cxPct.toFixed(1)}% ${cyPct.toFixed(1)}%`];
  for (let i = 0; i <= steps; i++) {
    const a = ...;
    pts.push(`${(cxPct + 150 * Math.cos(a)).toFixed(1)}% ${(cyPct + 150 * Math.sin(a)).toFixed(1)}%`);
  }
}
```
※ 150%半径はcx,cy ∈ [-0.5,0.5]（＝25%〜75%）の範囲では常にコンテナ外に届く（最大対角距離 ≈ 106%）ので十分。

### 4. `src/ui.js` — fan シェイプ生成

`_buildFanClipPath` 呼び出しに `aoeData.cx, aoeData.cy` を渡す：

```js
const clip = _buildFanClipPath(aoeData.baseAngle + i * 90, aoeData.halfAngle, aoeData.cx, aoeData.cy);
```

### 5. `src/ui.js` — fan 放射線

- `left` と `top` をオフセット中心に合わせる
- `height` を `200%` に増やし、どの位置からでもコンテナ端に届くようにする

```js
const cxPct = (aoeData.cx + 1) / 2 * 100;
const cyPct = (aoeData.cy + 1) / 2 * 100;
lineEl.style.cssText =
  `position:absolute;left:calc(${cxPct}% - 1px);top:${cyPct}%;width:2px;height:200%;` +
  `transform-origin:top center;transform:rotate(${(scrDeg - 90).toFixed(2)}deg);border-radius:0`;
```

### 6. `src/ui.js` — `_isInAoe` の `'fan'` ケース

`_checkHit` と同様に `d.cx` / `d.cy` 基準に変更する（カーソル色の更新に使われる）。

---

## 検証方法

1. `npm start` でサーブ → ブラウザで起動
2. ゲームをプレイし、放射状AoEが出現したとき中心が画面中央以外の位置にあることを確認
3. 中心の位置が移動範囲の内側1/4エリア（大体中央の正方形領域）に収まっていることを目視確認
4. カーソルをAoE内に置いたときに赤色になること、外側では青色になることを確認（ヒット判定が正しく機能しているか）
