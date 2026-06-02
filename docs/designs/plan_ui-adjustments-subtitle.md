# UI改善・テキスト変更まとめ（サブタイトル変更・弱点マップL/Rラベル削除・難易度表記・ボタンフォーカス改善・リザルトL/R誤操作防止）

## Context

UI改善・テキスト変更のまとめ。ゲームとしての完成度向上（ブランド感・操作ミス防止・視認性）を目的とした5点の修正。

---

# 変更一覧

## 1. サブタイトル変更

**ファイル**: `index.html:22`

- 「覚醒のクロスホットバー」→「指酷のクロスホットバー」

```html
<p class="game-sub">指酷のクロスホットバー</p>
```

---

## 2. 弱点マップの「L」「R」ラベル削除

**ファイル**: `src/ui.js`

`buildHalf()` 関数内の `label` 生成と `${side === 'L' ? label : ''}` / `${side === 'R' ? label : ''}` の挿入を除去する。

Before:
```javascript
const label = `<div class="xhb-label">${side}</div>`;
return `<div class="heatmap-half">
  ${side === 'L' ? label : ''}
  <div class="heatmap-groups">...</div>
  ${side === 'R' ? label : ''}
</div>`;
```

After:
```javascript
return `<div class="heatmap-half">
  <div class="heatmap-groups">
    <div class="heatmap-cross">${buildSlots(dpad)}</div>
    <div class="heatmap-cross">${buildSlots(face)}</div>
  </div>
</div>`;
```

---

## 3. 難易度名・GCD表記変更

### constants.js

| キー    | label 変更前 | label 変更後 | sublabel 変更前 | sublabel 変更後 |
|--------|------------|------------|--------------|--------------|
| slow   | 遅い        | わかば       | 3.5秒         | GCS 3.5s     |
| normal | 普通        | チョコボ      | 2.5秒         | GCS 2.5s     |
| fast   | 速い        | 零式         | 1.5秒         | GCS 1.5s     |

### index.html

```html
<button class="btn btn--sm" data-value="slow">わかば<br><small>GCS 3.5s</small></button>
<button class="btn btn--sm btn--sel" data-value="normal">チョコボ<br><small>GCS 2.5s</small></button>
<button class="btn btn--sm" data-value="fast">零式<br><small>GCS 1.5s</small></button>
```

---

## 4. メニューボタンのフォーカス視認性改善

**ファイル**: `styles/main.css`

**`.btn--primary` のベース背景を `.btn` と同レベルまで下げる:**
- `background: rgba(200, 164, 80, 0.14)` → `background: rgba(255, 255, 255, 0.03)`
- ボーダー色・文字色は維持（ゴールド系のまま）

**`.btn--focused` をより目立つ状態に強化:**
- background: 0.18 → 0.32
- box-shadow を強化（0.35 → 0.55）

```css
/* After */
.btn--primary {
  background: rgba(255, 255, 255, 0.03);  /* ← 抑制 */
  border-color: var(--gold);
  color: var(--gold-bright);
  ...
}

.btn--focused {
  background: rgba(200, 164, 80, 0.32);   /* ← 強化 */
  border-color: var(--gold-bright);
  color: var(--gold-bright);
  box-shadow: 0 0 18px rgba(200, 164, 80, 0.55);  /* ← 強化 */
}
```

---

## 5. リザルト画面でL/Rボタン押下中はメニュー選択無効

**ファイル**: `src/main.js`

ゲームオーバー状態のメニューループで、✕ボタン確定前にL1/L2/R1/R2が押されていないかチェックする。

Before:
```javascript
} else if (appState === 'gameover') {
  if (navUp   && menuSelIdx > 0)                      { menuSelIdx--; updateMenuFocus(); }
  if (navDown && menuSelIdx < menuButtons.length - 1) { menuSelIdx++; updateMenuFocus(); }
  if (crossFresh) menuButtons[menuSelIdx].action();
}
```

After:
```javascript
} else if (appState === 'gameover') {
  const lrHeld = !!(
    gp.buttons[4]?.pressed || gp.buttons[5]?.pressed ||
    gp.buttons[6]?.pressed || gp.buttons[7]?.pressed
  );
  if (navUp   && menuSelIdx > 0)                      { menuSelIdx--; updateMenuFocus(); }
  if (navDown && menuSelIdx < menuButtons.length - 1) { menuSelIdx++; updateMenuFocus(); }
  if (crossFresh && !lrHeld) menuButtons[menuSelIdx].action();
}
```

`gp` はループ内で既に `const gp = getPad()` として取得済みのため、追加のAPI呼び出しは不要。

---

# 検証方法

1. `npm start` でサーブ起動
2. スタート画面で「指酷のクロスホットバー」が表示されることを確認
3. 難易度ボタンが「わかば / チョコボ / 零式」、GCS表記になっていることを確認
4. スタート画面でフォーカスが当たっているボタンが、外れているボタンより明らかに目立つことを確認
5. ゲームをプレイしてゲームオーバーにする。最後にL1/R1を押したままにして✕連打し、リトライが誤発火しないことを確認
6. ゲームオーバー後にリザルト画面の弱点マップに「L」「R」ラベルが表示されないことを確認
