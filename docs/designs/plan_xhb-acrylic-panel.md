# Plan: XHBボタン アクリルパネル風デザイン改修

## Context

現在のXHBボタン（`.xhb-slot`）はベース色が `#0e1118`（極めて暗い）で、フラットな見た目になっている。
要求：
- ボタン全体を明るくする
- 上部約20%にテカテカした光沢（アクリルパネル風）を加える
- 立体感を出す

参考画像（`talklog/sample/xhb_design1.png`）にFF14ゲーム内のXHBが写っており、
ボタンが青灰色系のベースで上端にハイライトがある立体的なデザインになっている。

---

## 変更ファイル

`styles/main.css` のみ

---

## 実装内容

### 1. CSS変数の更新（`:root`）

| 変数 | 変更前 | 変更後 | 理由 |
|------|--------|--------|------|
| `--slot-bg` | `#0e1118` | `#1a2035` | ベース明度を上げる（変数はfallback用に残す） |
| `--slot-border` | `#252a3a` | `#3a4568` | 枠を可視化 |
| `--slot-text` | `#3a4060` | `#6878a8` | テキストを明るく |

### 2. `.xhb-slot` ベーススタイルの変更

```css
.xhb-slot {
  /* 既存 position/width/height/border-radius/display 等はそのまま */

  /* グラデーション背景で立体感 */
  background: linear-gradient(
    to bottom,
    #252d48 0%,
    #1a2038 45%,
    #111828 100%
  );

  /* 上辺ハイライト + 下辺シャドウで押し出し感 */
  border: 1px solid #3a4568;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.13),
    inset 0 -1px 0 rgba(0, 0, 0, 0.40),
    0 2px 4px rgba(0, 0, 0, 0.45);
}
```

### 3. アクリル光沢オーバーレイの追加（新規 `.xhb-slot::after`）

`.xhb-slot--active::before`（マーチングアンツ枠線）が `::before` を使用済みなので、
光沢には `::after` を使用する。

```css
.xhb-slot::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 45%;              /* 上部〜45%のエリアに光源を投影 */
  border-radius: 4px 4px 0 0;
  background: linear-gradient(
    to bottom,
    rgba(255, 255, 255, 0.22) 0%,
    rgba(255, 255, 255, 0.09) 55%,
    rgba(255, 255, 255, 0.00) 100%
  );
  pointer-events: none;
  z-index: 1;               /* recast(z-index:2)・marching ants(z-index:4)の下 */
}
```

---

## z-index スタック（変更後）

| レイヤー | z-index | 説明 |
|----------|---------|------|
| `::after` (光沢) | 1 | アクリルシーン（装飾） |
| `.slot-recast` | 2 | リキャストタイマー |
| `.xhb-slot--active::before` | 4 | マーチングアンツ枠線 |

---

## 各状態への影響

- **active**: 独自の `background` を上書きするがグラデーションの3D感は弱まる。`::after` 光沢は残るので問題なし。
- **success / fail**: 同上。光沢が重なり視覚的リッチ感が増す。
- **flash**: 白オーバーレイで一時的に覆われるが `::after` は背景として機能し、アニメーション後は元に戻る。

---

## 検証方法

1. `npm start` でサーブ → ブラウザで http://localhost:3000 を開く
2. ゲーム開始前のXHBボタンの見た目を確認
   - 明るい青灰色のグラデーション背景
   - 上端に白い光沢ハイライト
   - 下端がわずかに暗い（立体感）
3. アクティブ・SUCCESS・FAIL 各状態でもレイアウト崩れがないことを確認
4. ゲームプレイして視認性が改善していることを確認
