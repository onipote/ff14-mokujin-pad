# バースト終了後のスロット速度復帰修正

## Context

バースト（LIMIT BREAK）終了後も、スロットが高速（バースト速度）のまま回り続けるバグがある。

原因は `_onGaugeFull()` が常に `this._slotTimeMs`（現在スロットの速度）をペンディングスロットへ引き継ぐため、バースト速度が永続的に伝播してしまうこと。

前回修正「LBゲージ0タイミングでの速度急低下修正」では、「回転中スロットの速度を変えない」ために意図的にスナップショット速度を引き継いだが、その引き継ぎがバースト終了後も連鎖し続ける問題が残っていた。

### 速度伝播チェーンの問題

```
スロットA（バースト速度）
 → _onGaugeFull() → ペンディングB（バースト速度を引き継ぐ）
 → _nextSlot()でBがアクティブ化 → _slotTimeMs = バースト速度
 → _onGaugeFull() → ペンディングC（バースト速度を引き継ぐ）← バースト終了後でも！
 → 永遠に繰り返し…
```

### 目標挙動

- **現在回転中のスロット**：速度変化なし（急変回避、既存修正を維持）
- **バースト終了後に生成される新規ペンディングスロット**：通常速度に戻る
- グレースピリオド：バースト中に既に生成されたペンディングスロット（`_slotIsBurst=true`）はそのまま完走させてよい。その次のペンディングから通常速度。

## 変更箇所

### `src/game.js` — `_onGaugeFull()` （line 331〜343）

**変更の意味:**

| `_slotIsBurst` | `this.isBurst` | `burstLapsed` | 結果 |
|---|---|---|---|
| true（バーストスロット） | true（バースト継続） | false | バースト速度を引き継ぐ（既存通り） |
| true（バーストスロット） | false（バースト終了） | **true** | **通常速度を使用（修正箇所）** |
| false（通常スロット） | どちらでも | false | `_slotTimeMs`を引き継ぐ（既存通り） |

`burstLapsed = true` のとき:
- `timeMs = this._getTimeMs()` → 現在の通常速度（`DIFFICULTIES[difficulty].timeMs`）
- `_pendingSlotIsBurst = false` → スコア倍率なし・ミス時コンボリセット・通常ヒット音（すべて正しい）

## 伝播チェーンが切れる仕組み

1. バーストスロットAが回転中にバースト終了 → `this.isBurst = false`
2. Aが完走 or プレイヤーが入力 → `_nextSlot()` でペンディングBがアクティブ化
3. BがTimerStopで `_onGaugeFull()` を呼ぶ:
   - `_slotIsBurst = true`（Bはバースト中に予約された）
   - `this.isBurst = false` → `burstLapsed = true`
   - ペンディングCは **通常速度** で生成、`_pendingSlotIsBurst = false`
4. CのActiveSlot化後: `_slotIsBurst = false` → 以降すべて通常速度 ✓
