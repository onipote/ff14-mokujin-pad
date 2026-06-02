# プラン: タイトル画面に難易度別ベストスコアを表示

## Context

ベストスコアの localStorage 保存は既に難易度別（JSON形式 `{slow, normal, fast}`）で実装済み。
リザルト画面も難易度別スコアを正しく表示している。
しかしタイトル画面（`#screen-start`）にはベストスコア表示が一切なく、難易度を切り替えても自分の記録を確認できない。
→ タイトル画面の各難易度ボタンにベストスコアを追加表示する。

## 変更内容

### 1. `index.html` — 各難易度ボタンに `diff-best` 要素を追加

```html
<!-- 変更前 -->
<button class="btn btn--sm" data-value="slow">やさしい<br><small>GCD 3.5s</small></button>
<button class="btn btn--sm btn--sel" data-value="normal">ふつう<br><small>GCD 2.5s</small></button>
<button class="btn btn--sm" data-value="fast">むずかしい<br><small>GCD 1.5s</small></button>

<!-- 変更後（各ボタンに3行目を追加） -->
<button class="btn btn--sm" data-value="slow">やさしい<br><small>GCD 3.5s</small><br><small class="diff-best">---</small></button>
<button class="btn btn--sm btn--sel" data-value="normal">ふつう<br><small>GCD 2.5s</small><br><small class="diff-best">---</small></button>
<button class="btn btn--sm" data-value="fast">むずかしい<br><small>GCD 1.5s</small><br><small class="diff-best">---</small></button>
```

### 2. `src/main.js` — `refreshBestScores()` 関数を追加・呼び出し

```javascript
// 追加する関数
function refreshBestScores() {
  ['slow', 'normal', 'fast'].forEach(diff => {
    const btn = document.querySelector(`#diff-btns [data-value="${diff}"]`);
    if (!btn) return;
    const best = engine.getBestScore(diff);
    const el = btn.querySelector('.diff-best');
    if (el) el.textContent = best > 0 ? best.toLocaleString() : '---';
  });
}
```

呼び出し箇所：
- `DOMContentLoaded` 末尾（初期表示）
- `showMenu()` 末尾（ゲーム後にタイトルへ戻った際に更新）

### 3. `styles/main.css` — `.diff-best` のスタイル追加

```css
.diff-best {
  color: var(--gold-bright);   /* または var(--text-dim) */
  font-size: 11px;
  display: block;
  margin-top: 2px;
  letter-spacing: 0.03em;
}
```

## 修正ファイル一覧

| ファイル | 変更種別 |
|---|---|
| `index.html` | 各 `.btn[data-value]` に `<small class="diff-best">---</small>` 追加（3箇所） |
| `src/main.js` | `refreshBestScores()` 追加、初期化と `showMenu()` で呼び出し |
| `styles/main.css` | `.diff-best` スタイル追加 |

## 再利用する既存関数

- `engine.getBestScore(difficulty)` — `game.js` — 難易度を渡すだけでベストスコアを返す

## 検証方法

1. `npm start` でサーブ → ブラウザで localhost を開く
2. タイトル画面で各難易度ボタン下部に `---` が表示されることを確認
3. ゲームをプレイしてスコアを出す → タイトルに戻る → プレイした難易度のボタンにスコアが表示されることを確認
4. 別の難易度でプレイ → それぞれ独立したスコアが表示されることを確認
5. ページリロード後もスコアが残ること（localStorage 永続化）を確認
