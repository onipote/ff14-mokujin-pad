# パフォーマンス改善プラン

## Context

XHBボタンのアクリルパネル風デザイン強化 + 背景パーティクル追加後に動作が重くなった。
主な原因は複数のrAFループの並行実行と、ゲーム中も止まらないパーティクルループ。
ユーザーの提案「ゲーム中はパーティクルを表示しない」が最も効果的な対策。

---

## 調査で判明したボトルネック（優先度順）

| # | 問題 | 重大度 | 説明 |
|---|------|--------|------|
| 1 | **パーティクルが常時実行** | 高 | ゲーム中も30fps × Canvas clearRect + arc×45が走り続ける |
| 2 | **rAFループが最大5本同時** | 中 | background + timerRaf + pendingTimerRaf + countdownRaf + burstRaf |
| 3 | **conic-gradient毎フレーム更新** | 中 | `.slot-recast` のCSS変数 `--recast-pct` をrAFで毎フレーム書き換え |
| 4 | **無限CSSアニメーション** | 低中 | `xhb-neon-pulse`（ゲーム中の全アクティブスロット）`burst-glow`（バースト時） |
| 5 | **重ねbox-shadow** | 低 | カーソル・AoEゾーンなどで2〜3重のbox-shadow |

---

## 対策方針（今回実装するもの）

### Step 1 — パーティクルを一時停止するAPIを追加（最重要）

**対象ファイル**: `src/background.js`

`tick()` のループ冒頭に `paused` フラグを追加し、グローバル `BackgroundParticles` オブジェクトを公開する。

```js
var paused = false;

function tick(ts) {
  requestAnimationFrame(tick);
  if (paused) return;               // ← 追加
  if (ts - lastTime < INTERVAL) return;
  // ...既存の描画処理
}

window.BackgroundParticles = {
  pause:  function() { paused = true;  ctx.clearRect(0, 0, width, height); },
  resume: function() { paused = false; lastTime = 0; },
};
```

Canvas を `clearRect` してから止めることで、最後のフレームが残像として残らないようにする。

---

### Step 2 — ゲーム開始/終了時にパーティクルを制御

**対象ファイル**: `src/main.js`

game.js の `start()` に相当するコールバックチェーン構造を利用し、main.js 側のワイヤリング箇所で制御する。

main.js の該当箇所（ゲーム開始・タイトル復帰の呼び出しポイント）に以下を挿入：

```js
// ゲーム開始時
BackgroundParticles.pause();

// ゲーム終了・タイトル復帰時
BackgroundParticles.resume();
```

---

### Step 3 — XHBネオンパルスアニメーションをゲーム中は軽量化（任意）

**対象ファイル**: `styles/main.css`

現状の `xhb-neon-pulse` は box-shadow を interpolate しているため GPU 負荷が高い。
opacity のみをアニメーションする軽量版に差し替える。

```css
/* 変更前 */
@keyframes xhb-neon-pulse {
  from { box-shadow: 0 0 6px ..., 0 0 18px ..., inset 0 0 12px ...; }
  to   { box-shadow: 0 0 12px ..., 0 0 32px ..., inset 0 0 20px ...; }
}

/* 変更後 — opacityのみで合成レイヤー化、box-shadowを静的に */
@keyframes xhb-neon-pulse {
  from { opacity: 0.85; }
  to   { opacity: 1.0; }
}
.xhb-half--active {
  box-shadow: 0 0 10px rgba(200,220,255,0.6), inset 0 0 14px rgba(180,200,255,0.15);
  /* will-change で合成レイヤーに昇格 */
  will-change: opacity;
}
```

---

## 変更対象ファイル

| ファイル | 変更内容 |
|----------|----------|
| `src/background.js` | `paused` フラグ追加・`BackgroundParticles` グローバル公開 |
| `src/main.js` | ゲーム開始/終了時に `BackgroundParticles.pause/resume` 呼び出し |
| `styles/main.css` | `xhb-neon-pulse` を opacity アニメーションに軽量化（Step 3） |

---

## 検証方法

1. `npm start` でサーブ → ブラウザの DevTools > Performance タブを開く
2. タイトル画面でパーティクルが動作していることを確認
3. ゲーム開始 → パーティクルが消え、Canvas が空白になることを確認
4. ゲーム終了（タイムアップ or タイトルへ戻る）→ パーティクルが再開することを確認
5. DevTools の FPS メーターで改善前後を比較

---

## 今回スコープ外（将来の対策候補）

- `conic-gradient` のCanvas置き換え（大きめの改修）
- game.js の複数rAFループを単一ループに統合（ロジック影響大）
- box-shadow の整理（視覚品質とのトレードオフ要検討）
