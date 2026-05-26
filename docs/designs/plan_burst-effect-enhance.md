# 演出強化：ジャッジメントスコア表示・バーストゲージ視覚強化・効果音2段階化

**日付**: 2026-05-27

## Context

ゲーム演出を全体的に強化する。
- ボタン入力成功/失敗時のジャッジメント表示は**バースト中・通常時を問わず**常時表示されるため、スコア加算値や時間ペナルティを文字に含めることでプレイヤーが結果をひと目で把握できるようにする。
- バースト中のLIMITゲージ明滅の視覚インパクトを高める。
- ゲージ最大時・バースト開始時の効果音を独立した2段階演出にする。

---

## 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/ui.js` | `showJudgment(type, value?)` にスコア/ペナルティ値を渡せるよう拡張 |
| `src/game.js` | `showJudgment` 呼び出しに値を渡す／効果音2本に分離 |
| `src/sound.js` | `playGaugeMax()` / `playBurstStart()` を追加 |
| `styles/main.css` | フォント2倍・発光強化・ゲージ明滅輝度アップ |

---

## 実装詳細

### `src/ui.js` — `showJudgment(type, value?)`

- `great` / `good`: 末尾に ` +{value}` を付加（例: `◎ GREAT +250`）
- `miss`: 末尾に ` -{value.toFixed(1)}s` を付加（例: `✕ MISS -5.0s`）
- `bonus1` / `bonus2`: 変更なし

### `styles/main.css` — ジャッジメントフロート

| プロパティ | 変更前 | 変更後 |
|----------|------|------|
| font-size | 16px | 32px |
| color | 色付き（#ffe080 等） | #fff（白） |
| text-stroke | 2px #000 | 削除 |
| text-shadow | なし | カラーグロー 3層（8px / 18px / 32px） |
| opacity（0%キーフレーム） | 1.0 | 0.8 |

グロー色:
- GREAT: `#ffe080`（ゴールド）
- GOOD: `#80e8ff`（シアン）
- MISS: `#ff6060`（レッド）
- BONUS: `#80ff90`（グリーン）

### `styles/main.css` — burst-glow

`brightness(1.55)` → `brightness(2.5)` に変更（白フェーズをより眩しく）

### `src/sound.js` — 新規メソッド

```
playGaugeMax():
  G5-C6-E6-G6 アルペジオ（0.03s間隔） + G6 持続音
  → 「満タン！」の達成感を演出

playBurstStart():
  110Hz + 220Hz 低域衝撃（triangle） + C5-G5-C6-G6-C7 上昇スウィープ
  → 「バースト発動！」の爆発的な立ち上がりを演出
```

### `src/game.js` — ゲージ満タン時の処理

```js
// before
this._startBurst();
this.sound.playCombo('burst');

// after
this.sound.playGaugeMax();        // 即座にゲージ満タン音
this._startBurst();
setTimeout(() => this.sound.playBurstStart(), 350); // 350ms後にバースト発動音
```
