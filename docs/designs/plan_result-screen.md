# リザルト画面レイアウト変更プラン（result2.png 対応）

## Context
result2.png の位置関係に合わせてリザルト画面を再構成する。
- 左：大きなランク文字 ＋ 小さな "rank" ラベル（下）
- 右：DPS% → 区切り線 → GREAT/GOOD/MISS の縦リスト
- 下段中央：スコア・ベストスコア（最大コンボは削除）
- その下：弱点マップ

---

## 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `src/ui.js` | `showGameOver()` の HTML 構造を全面再構成 |
| `styles/main.css` | 対応する CSS クラスを追加・修正 |

---

## 1. `src/ui.js` — 新しい HTML 構造

```html
<div class="result-top">
  <!-- 左：ランク -->
  <div class="rank-display">
    <span class="rank-letter" style="color:COLOR;text-shadow:...">S</span>
    <span class="rank-label">rank</span>
  </div>

  <!-- 右：DPS + 判定リスト -->
  <div class="result-right">
    <div class="rank-pct" style="color:COLOR">DPS 97%</div>
    <div class="rank-divider"></div>
    <div class="judgment-list">
      <span class="judgment-lbl judgment-great">GREAT</span>
      <span class="judgment-cnt judgment-great">20</span>
      <span class="judgment-lbl judgment-good">GOOD</span>
      <span class="judgment-cnt judgment-good">3</span>
      <span class="judgment-lbl judgment-miss">MISS</span>
      <span class="judgment-cnt judgment-miss">5</span>
    </div>
  </div>
</div>

<!-- 中央：スコア行 -->
<div class="result-scores">
  <div class="score-row">
    <span class="score-lbl">スコア：</span>
    <span class="score-val">XXXXXX</span>
  </div>
  <div class="score-row">
    <span class="score-lbl">${bestLabel}：</span>
    <span class="score-val">XXXXXXX</span>
  </div>
</div>

<!-- 弱点マップ -->
${heatmap}
```

削除: `judgments-panel`（3カラムボックス）、最大コンボ行

---

## 2. `styles/main.css` — 新規・変更クラス

```css
/* result-top: 左右2カラム */
.result-top { display: flex; align-items: center; gap: 32px; justify-content: center; }

/* 左カラム: ランク文字 + rank ラベル（縦積み・中央寄せ） */
.rank-display { display: flex; flex-direction: column; align-items: center; }
.rank-label   { font-size: 12px; letter-spacing: 0.22em; color: var(--gold-dim);
                font-family: 'Cinzel', serif; font-weight: 700; margin-top: 2px; }
/* rank-letter は変更なし（80px Cinzel） */

/* 右カラム: DPS% / 区切り線 / 判定リスト */
.result-right { display: flex; flex-direction: column; gap: 6px; min-width: 120px; }
.rank-pct     { font-size: 18px; font-weight: 700; letter-spacing: 0.14em; }
.rank-divider { height: 1px; background: rgba(200,164,80,0.35); margin: 2px 0; }
.judgment-list {
  display: grid;
  grid-template-columns: auto auto;
  gap: 3px 14px;
  align-items: center;
}
.judgment-lbl { font-size: 11px; font-weight: 700; letter-spacing: 0.14em; }
.judgment-cnt { font-size: 18px; font-weight: 700; font-family: 'Cinzel', serif;
                text-align: right; line-height: 1; }

/* スコア行（中央） */
.result-scores { text-align: center; display: flex; flex-direction: column; gap: 2px; }
.score-row  { display: flex; justify-content: center; align-items: baseline; gap: 8px; }
.score-lbl  { font-size: 13px; color: var(--text); }
.score-val  { font-size: 22px; font-weight: 700; font-family: 'Cinzel', serif;
              color: var(--gold-bright); }

/* 削除（不要になったクラス） */
/* .judgments-panel, .judgment-col → 使用されなくなる（CSSは残して問題なし） */
/* .result-stats → 不要（.result-scores に置換） */
/* .combo-diamond → 不要 */
```

---

## 検証

1. ゲームを1ゲーム完了させリザルト画面を確認
2. 左：ランク文字大＋rank ラベル、右：DPS%＋区切り＋判定リスト が横並びになっていること
3. 下段：スコア・ベストスコアが中央に縦並びになっていること
4. 最大コンボ行が表示されないこと
5. 弱点マップが最下部に表示されること
