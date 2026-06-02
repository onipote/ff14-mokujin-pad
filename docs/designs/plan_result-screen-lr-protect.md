# UI調整 5件 — 計画書

## Context

リザルト画面・ゲーム画面の細部UI調整。評価ブロックの視認性向上、ボタン名表示の削除、LRパネルの配置改善、リミットゲージ幅拡大。

---

## 変更一覧

### 1. リザルト画面：評価～スコアブロックを枠で囲む

**ファイル**: `src/ui.js`（148行目〜192行目 `showGameOver`）と `styles/main.css`

**内容**: `showGameOver()` の innerHTML 内で `.result-top` と `.result-scores` を `<div class="result-block">` で包む。

```html
<!-- 変更後の構造 -->
<div class="result-block">
  <div class="result-top">…</div>
  <div class="result-scores">…</div>
</div>
```

**CSS追加**（`styles/main.css` の `.result-scores` スタイルの後あたり）:
```css
.result-block {
  border: 1px solid rgba(200, 164, 80, 0.45);
  background: rgba(200, 164, 80, 0.05);
  border-radius: 6px;
  padding: 16px 20px;
  width: 100%;
  box-sizing: border-box;
}
```

また `.result-scores` の `margin: 18px 0` を削除してブロック内の余白を `.result-block` のpaddingに委ねる（または`margin-top: 14px`程度に調整）。

---

### 2. 「MENU」ボタンを「メニューに戻る」に変更

**ファイル**: `index.html:47`

```html
<!-- 変更前 -->
<button id="btn-menu" class="btn">MENU</button>

<!-- 変更後 -->
<button id="btn-menu" class="btn">メニューに戻る</button>
```

---

### 3. 「L2+○」ボタン名表示を削除

**ファイル**: `src/ui.js:72-75`

`showPrompt()` のメソッド本体を空にする（`game.js:256` から呼ばれるので署名は残す）:
```js
showPrompt(slotDef) {
  // label display removed
}
```

**ファイル**: `styles/main.css:758-763`  
`#timer-label` を非表示に変更（要素は残す）:
```css
#timer-label {
  display: none;
}
```

---

### 4. LRスティックエリアをより中央に・上下余白を均等化

**ファイル**: `styles/main.css`

**パネル幅を縮小**（`main.css:574`）:
```css
/* 変更前 */
.stick-panel { max-width: 290px; }

/* 変更後（例: 220px） */
.stick-panel { max-width: 220px; }
```

**`#game-area` の上下パディングを均等化**（`main.css:551`）:
```css
/* 変更前 */
padding: 14px 16px 12px;

/* 変更後 */
padding: 14px 16px;
```

---

### 5. リミットブレイクゲージの幅を拡大

**ファイル**: `styles/main.css:427`

```css
/* 変更前 */
.limit-segment { width: 72px; }

/* 変更後（例: 96px、合計幅 96×3 + 4×2 = 296px） */
.limit-segment { width: 96px; }
```

---

## 変更ファイルまとめ

| ファイル | 変更箇所 |
|---|---|
| `index.html:47` | MENUボタンのテキスト変更 |
| `src/ui.js:72-75` | `showPrompt()` をno-opに |
| `src/ui.js:163-192` | `showGameOver()` のHTMLに `.result-block` ラッパー追加 |
| `styles/main.css` | `.result-block` CSS追加、`.result-scores` margin調整、`.stick-panel` max-width縮小、`#game-area` padding均等化、`.limit-segment` width拡大、`#timer-label` 非表示化 |

---

## 検証

- `npm start` でサーバ起動 → ブラウザで確認
- リザルト画面：評価ブロックに枠・背景が表示されること、「メニューに戻る」ボタンが表示されること
- ゲーム画面：「L2+○」表示が消えていること、LRパネルが中央寄りになっていること
- Info Bar：リミットゲージが広がっていること
