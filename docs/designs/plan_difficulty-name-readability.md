# Plan: 難易度名変更 & 小文字の視認性改善

## Context

ユーザーより以下2点の改善要望：
1. 「DIFFICULTY」ラベルをはじめとする小さい・細い・暗いテキストが読みにくい
2. 難易度名を英語（Easy / Normal / Hard）に変更したい

---

## 変更1: 難易度名を Easy / Normal / Hard に変更

### `src/constants.js`
- `slow` の `label` を変更 → `"Easy"`、`sublabel` は `"GCD 3.5s"` のまま
- `normal` の `label` → `"Normal"`
- `fast` の `label` → `"Hard"`

### `index.html`
- ボタンのテキストを合わせて更新：
  - `わかば` → `Easy`
  - `チョコボ` → `Normal`
  - `光の戦士` → `Hard`

---

## 変更2: 小さい・暗いテキストの視認性改善

対象は `styles/main.css`。以下のクラスを修正：

| クラス | 現状 | 変更後 |
|---|---|---|
| `.setting-label` | 10px, `var(--text-dim)` (#5a5040) | 12px, `var(--text)` (#cfc0a0) |
| `.info-label` | 10px, `var(--text-dim)` | 12px, `var(--text)` |
| `.heatmap-title` | 10px, `var(--gold-dim)` (#6a5525) | 12px, `var(--gold)` (#c8a450) |
| `.ornament` | 11px, `var(--gold-dim)` | 11px → 12px, `var(--gold)` |
| `.pad-hint` | 10px, `var(--text-dim)` | 12px, `var(--text)` |
| `.label-sm` | 10px, `var(--text-dim)` | 12px, `var(--text)` |
| `.slot-key` | 9px, #22253a (暗い) | 10px, 明るめの色に調整 |
| `.copyright-notice` | opacity: 0.45 | opacity: 0.65 |
| `<small>` (ボタン内) | ブラウザデフォルト | 明示的に `font-size: 11px` を追加 |

---

## 検証方法

`npm start` でサーブ後、ブラウザで以下を確認：
1. スタート画面の難易度ボタンが Easy / Normal / Hard と表示される
2. 「DIFFICULTY」ラベルが以前より明確に読める
3. 各セクションの小ラベル・ヒント類が視認しやすくなっている
