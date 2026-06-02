# 計画: 画面サイズの統一と中央寄せ

## Context
各画面（スタート・ゲームオーバー・ポーズ）のメインウィンドウ幅がゲーム画面（760px）と不一致で、
見た目が統一されていない。またページ全体が上寄せになっている。

---

## 変更対象ファイル
`styles/main.css` のみ

---

## 変更内容

### 1. 縦方向の中央寄せ（body）
```
body {
  align-items: flex-start;  →  align-items: center;
}
```

### 2. スタート画面のパネル幅を760pxに統一（新規ルール追加）
`.screen-panel` の `min-width: 360px` はポーズ画面に流用されるため、
スタート画面には個別ルールで上書きする。

```css
/* 新規追加 */
#screen-start .screen-panel {
  width: 760px;
  max-width: calc(100% - 16px);
}
```

### 3. ゲームオーバー画面のパネル幅を760pxに統一（既存ルール変更）
```
/* 変更前 */
#screen-gameover .screen-panel {
  min-width: 520px;
  max-width: 680px;
  width: calc(100% - 32px);
  ...
}

/* 変更後 */
#screen-gameover .screen-panel {
  width: 760px;
  max-width: calc(100% - 16px);
  ...  (padding/overflow/max-height はそのまま維持)
}
```

### 4. ポーズ画面（変更なし）
既存の `.screen-panel { min-width: 360px }` がそのまま適用される → コンテンツ幅に応じた小さいウィンドウを維持。

---

## 検証方法
`npm start` でサーブし、ブラウザで以下を確認：
- タイトル画面のパネル幅がゲーム画面と揃っている
- ゲームオーバー画面のパネル幅が揃っている
- ポーズ画面は小さいままである
- ページ全体が画面中央（縦横）に寄っている
