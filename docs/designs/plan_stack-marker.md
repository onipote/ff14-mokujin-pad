# Plan: 右パネルギミックを「頭割りマーカー」ビジュアルに変更

## Context

右スティックのギミック（探検アイコン捕獲）のビジュアルを、FFXIV の「頭割り（stack）」マーカーデザインに刷新する。
ゲームロジック（スポーン位置・成功判定・タイミング）は一切変更しない。変更するのは見た目のみ。

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|----------|----------|
| `index.html` | `gaze-eye-R` を SVG 入りの `stk-marker-R` に置換。`gaze-frame-R`（四角枠）はそのまま維持 |
| `styles/main.css` | スタックマーカー用スタイル・アニメーション追加、右パネルの overflow 変更 |
| `src/ui.js` | `_gazeEye` 参照を `_stkMarker` に置換。`_gazeFrame`（四角枠）の参照・色状態ロジックは維持 |

`src/aoe.js` / `src/game.js` / `src/constants.js` は変更なし。

---

## 視覚デザイン

```
       ∨∨∨  ← 中央 chevron 3枚（∨向き）が上下振動（stk-bob 1.4s）
        ↓↓↓  ← N グループ（↓向き）がパルス

←←←   [CENTER]   →→→

        ↑↑↑  ← S グループ（↑向き）がパルス

全体色: #FFE566(dim) → #FFB800(mid) → #FF7700(bright) の黄橙グラデ
内側ほど明るい・中心底が最輝
マーカー自体は常に黄橙（成功/失敗で色変化しない）
```

四角枠（gaze-frame）は従来どおり：
- 中心が枠外 → 赤ボーダー（`gaze-frame--out`）
- 中心が枠内 → 緑ボーダー（`gaze-frame--in`）
- 判定後 → hit / dodge クラスで色維持

---

## SVG 構成（viewBox="-50 -50 100 100"）

| グループ | 内容 | アニメーション |
|---------|------|--------------|
| `stk-grp-center` | ∨ × 3（頂点 y=-17/-9/-1） | `stk-bob` 上下 5px |
| `stk-grp-n` | ∨ × 3（頂点 y=-37/-29/-21） | `stk-pulse-n` 上 8px |
| `stk-grp-s` | ∧ × 3（頂点 y=7/15/23） | `stk-pulse-s` 下 8px |
| `stk-grp-w` | > × 3（頂点 x=-37/-29/-21） | `stk-pulse-w` 左 8px |
| `stk-grp-e` | < × 3（頂点 x=21/29/37） | `stk-pulse-e` 右 8px |

---

## ui.js の変更箇所

| メソッド | 変更内容 |
|---------|---------|
| `init()` | `_gazeEye → _stkMarker`、`_gazeFrame` は維持 |
| `showGazeWarning()` | `_stkMarker` を spawn 座標に配置・表示 |
| `showGazeResult()` | `_stkMarker` の色変化なし、`_gazeFrame` hit/dodge クラスのみ更新 |
| `_moveFrameCursor()` | 枠移動ロジック維持、枠の in/out 色更新維持、`_stkMarker` 色変化なし |
| `clearGaze()` | `_stkMarker` 非表示 + `_gazeFrame` リセット |
