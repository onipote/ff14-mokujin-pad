# 視線ギミック改善計画

## Context

右スティック視線ギミックの2つの問題を修正する：
1. 視線アイコンが枠の中央付近に出現すると「どこに避けるべきか」が直感的にわからない
2. 視線アイコンが常にランダム位置のため、枠内出現（即失敗リスク）のバリエーションが不足

---

## 変更ファイル

- `src/constants.js` — 除外半径定数を追加
- `src/aoe.js` — `_spawnGaze()` のロジック修正

---

## 実装詳細

### 1. `src/constants.js` に定数追加

```js
const GAZE_CENTER_EXCLUDE_R = GAZE_FRAME_HALF_W * 0.1; // ≈ 0.049（辺の1/10相当）
```

枠の辺長（`GAZE_FRAME_HALF_W * 2 ≈ 0.977`）の1/10の半分 ≈ 0.049。
中心から±0.049 の正方形領域がスポーン禁止ゾーンになる。

### 2. `src/aoe.js` の `_spawnGaze()` を修正

現在（行 80–81）：
```js
this._gazeEyeX = (Math.random() * 2 - 1) * GAZE_EYE_RANGE;
this._gazeEyeY = (Math.random() * 2 - 1) * GAZE_EYE_RANGE;
```

修正後：
```js
// 1/3 の確率で枠内強制スポーン
const forceInside = Math.random() < 1 / 3;

let eyeX, eyeY;
do {
  if (forceInside) {
    eyeX = (Math.random() * 2 - 1) * GAZE_FRAME_HALF_W;
    eyeY = (Math.random() * 2 - 1) * GAZE_FRAME_HALF_H;
  } else {
    eyeX = (Math.random() * 2 - 1) * GAZE_EYE_RANGE;
    eyeY = (Math.random() * 2 - 1) * GAZE_EYE_RANGE;
  }
} while (Math.abs(eyeX) < GAZE_CENTER_EXCLUDE_R && Math.abs(eyeY) < GAZE_CENTER_EXCLUDE_R);

this._gazeEyeX = eyeX;
this._gazeEyeY = eyeY;
```

**ロジック説明：**
- `forceInside = true`（1/3）：座標を `±GAZE_FRAME_HALF_W/H` 内（枠内）でランダム生成
- `forceInside = false`（2/3）：従来通り `±GAZE_EYE_RANGE` でランダム生成（偶然枠内になることもある）
- do-while：生成座標が中心除外ゾーン（`|x| < 0.049 && |y| < 0.049`）に入った場合は再試行

---

## 検証方法

1. `npm start` でサーブ
2. ゲームを開始し右スティック（またはキーボードの右スティック操作）で視線ギミックを数回発生させる
3. 確認事項：
   - 視線アイコンが枠の中心付近（ほぼ真ん中）に出現しないこと
   - 視線アイコンが枠内（白枠に重なっている）状態で出現するケースが存在すること（約1/3の頻度）
   - 判定ロジック（`_checkGazeHit`）は変更なしのため、枠内スポーン時は回避操作が必要なことを確認
