# Plan: 難易度表記を EASY/NORMAL/HARD に変更 + 視覚的強調

## Context
タイトル画面の難易度ボタンに表示されている日本語ラベル（わかば/チョコボ/光の戦士）を英語表記（EASY/NORMAL/HARD）に変更する。
あわせて、難易度名が GCD 時間テキストより視覚的に目立つよう、階層を明確にする。

---

## 変更ファイル

### 1. `index.html` (line 28–30)
ボタン内のラベルテキストを変更し、難易度名を `<span class="diff-name">` でラップする。

**変更前:**
```html
<button class="btn btn--sm" data-value="slow">わかば<br><small>GCD 3.5s</small></button>
<button class="btn btn--sm btn--sel" data-value="normal">チョコボ<br><small>GCD 2.5s</small></button>
<button class="btn btn--sm" data-value="fast">光の戦士<br><small>GCD 1.5s</small></button>
```

**変更後:**
```html
<button class="btn btn--sm" data-value="slow"><span class="diff-name">EASY</span><br><small>GCD 3.5s</small></button>
<button class="btn btn--sm btn--sel" data-value="normal"><span class="diff-name">NORMAL</span><br><small>GCD 2.5s</small></button>
<button class="btn btn--sm" data-value="fast"><span class="diff-name">HARD</span><br><small>GCD 1.5s</small></button>
```

---

### 2. `src/constants.js` (line 39–41)
`label` 値を英語に更新。

```js
slow:   { timeMs: 3500, label: "EASY",   sublabel: "GCD 3.5s", baseScore: 150 },
normal: { timeMs: 2500, label: "NORMAL", sublabel: "GCD 2.5s", baseScore: 250 },
fast:   { timeMs: 1500, label: "HARD",   sublabel: "GCD 1.5s", baseScore: 350 },
```

---

### 3. `styles/main.css`
`.btn--sm` ブロック付近に以下を追加。

```css
/* 難易度ボタン内のラベル強調 */
.btn--sm .diff-name {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 0.1em;
  display: block;
}
.btn--sm small {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 0.05em;
}
```

- `diff-name` を `display: block` にすることで `<br>` は不要になるが、HTML は現状維持でも問題なし
- `small` のフォントサイズを縮小＋色を暗くして難易度名との差を明確化

---

## 確認方法
`npm start` でサーバーを起動し、ブラウザでタイトル画面を表示。
- ボタンに EASY / NORMAL / HARD と表示されること
- 各ボタン内で難易度名が GCD 時間より大きく・太く見えること
- 選択時のゴールドハイライト（`.btn--sel`）が正常に機能すること
