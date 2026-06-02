# 音ゲー風ボタン成功エフェクト（スロットパンチ＋バーストリング）

## Context

ボタン入力成功時の視覚的な爽快感が不足している。現状は成功クラス（`xhb-slot--success`）の静的なグロー変化と、敵キャラのシェイク＋判定テキスト浮上のみ。音ゲーらしい「ぶわっと広がる」エフェクトを追加し、入力への即時フィードバックを強化する。

## 実装アプローチ

### エフェクト設計

**1. スケールパンチ（スロット本体）**  
成功クラス付与と同時に、スロットが一瞬 1.14倍に膨らんで元に戻る（0.22秒）。タップ感・物理的フィードバックを演出。

**2. バーストリング（拡散リング）**  
スロット内に `div.slot-burst-ring` を動的に生成。スロットサイズから 2.5倍に拡大しながらフェードアウト（0.42秒）。`animationend` で自動削除。
- GREAT: ゴールド（`#ffd700`）
- GOOD: シアン（`#4ae8ff`）
- GREATのみ: 90ms遅延の2本目リングを追加（二重波紋）

### 変更ファイル

#### `styles/main.css`

① `.xhb-slot--success` ルールに追加:
```css
animation: slot-hit-punch 0.22s ease-out forwards;
```

② `.xhb-slot--success-good` ルールに追加:
```css
animation: slot-hit-punch 0.22s ease-out forwards;
```

③ 新規追加:
```css
@keyframes slot-hit-punch {
  0%   { transform: scale(1.0); }
  35%  { transform: scale(1.14); }
  100% { transform: scale(1.0); }
}

@keyframes slot-burst-ring {
  0%   { transform: scale(1.0); opacity: 1; }
  100% { transform: scale(2.5); opacity: 0; }
}

.slot-burst-ring {
  position: absolute;
  inset: -2px;
  border-radius: 5px;
  border: 2px solid;
  pointer-events: none;
  z-index: 20;
  animation: slot-burst-ring 0.42s ease-out forwards;
}
.slot-burst-ring--great {
  border-color: rgba(255, 215, 0, 0.9);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.6), inset 0 0 6px rgba(255, 215, 0, 0.3);
}
.slot-burst-ring--good {
  border-color: rgba(74, 232, 255, 0.9);
  box-shadow: 0 0 10px rgba(74, 232, 255, 0.6), inset 0 0 6px rgba(74, 232, 255, 0.3);
}
```

④ pause停止ルールに追加:
```css
body.is-paused .slot-burst-ring {
  animation-play-state: paused;
}
```

#### `src/xhb.js`

`setSlotFlash` の直後に新メソッド追加:
```javascript
setSlotBurst(slotId, type) {
  const el = this.slots[slotId];
  if (!el) return;
  const addRing = delay => {
    const ring = document.createElement('div');
    ring.className = `slot-burst-ring slot-burst-ring--${type}`;
    if (delay) ring.style.animationDelay = `${delay}ms`;
    el.appendChild(ring);
    ring.addEventListener('animationend', () => ring.remove(), { once: true });
  };
  addRing(0);
  if (type === 'great') addRing(90);
}
```

`clearAllStates` 内に残留リング削除を追加:
```javascript
el.querySelectorAll('.slot-burst-ring').forEach(r => r.remove());
```

#### `src/game.js`

`_processHit` 内の `setSlotState` 呼び出し直後に追加:
```javascript
this.xhb.setSlotBurst(this.activeSlotId, judgment);
```

## 確認事項（技術的）

- `.xhb-cross` に `overflow: hidden` がないため、リングがスロット境界外に広がる表示は問題なし
- `setSlotState` は `el.className` を書き換えるが、バーストリングは子 `div` なので影響を受けない
- バースト中にゲームオーバーになっても `clearAllStates()` のクリーンアップで残留なし

## 検証方法

1. `npm start` でサーブ開始（localhost）
2. ゲームを開始し、GREATタイミングで入力 → ゴールドの二重リングが広がることを確認
3. GOODタイミング（少し遅め）で入力 → シアンの単発リングを確認
4. スロットのパンチ（一瞬膨らむ感覚）が感じられることを確認
5. 高速連打中（バースト中含む）にリングが残留しないことを確認
6. ポーズ中にアニメーションが停止することを確認
