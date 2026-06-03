> **⚠ このファイルは古い版です。**  
> 現行の理論最高得点・計算方法は [`docs/score_simulation.md`](../score_simulation.md) を参照してください。  
> 設計経緯は [`docs/designs/plan_theoretical_max_2026-06-04.md`](plan_theoretical_max_2026-06-04.md) を参照してください。

---

# 理論最高得点の計算方法（旧版：GCD 75% 押下・ゲーム時間 60s 基準）

## 目的

リザルト画面のDPS%・ランク評価を、固定の「理論最高得点」に基づいて算出する。  
理論最高得点とは「全GREAT・全リミット時間ボーナス・全バースト得点ボーナス取得」を前提とした最大スコアのこと。

## 定数（参照ファイル: `src/constants.js`）

| 定数 | 値 | 説明 |
|---|---|---|
| `GAME_DURATION_MS` | 60,000ms | ゲーム時間 |
| `FEEDBACK_SUCCESS_MS` | 350ms | GREAT後のフィードバック待機時間 |
| `GREAT_RATIO_MIN` | 0.75 | GREAT判定ウィンドウの開始タイミング（GCDの75%） |
| `BURST_GCD_MULTIPLIER` | 1.4 | バースト中のGCD加速倍率 |
| `BURST_DURATION_MS` | 10,000ms | バースト持続時間 |
| `BURST_SCORE_MULTIPLIER` | 2 | バースト中の得点倍率 |
| `LIMIT_GAUGE_COUNT` | 3 | ゲージ最大レベル数 |
| `LIMIT_GAUGE_BONUS_MS` | [1000, 2000, 3000] | ゲージLv1/2/3完成時の時間ボーナス（ms） |
| `LIMIT_GAUGE_THRESHOLDS` | slow:3, normal:5, fast:6 | 1ゲージを貯めるのに必要なGREAT数 |

## シミュレーション条件

1. **1ターンの実効時間** = `floor(GCD × 0.75) + 350ms`  
   → GCDの75%時点（GREAT窓の最早）で押下 + フィードバック待機  
   → これが理論的に最短の連打間隔

2. **バーストターンの実効時間** = `floor(burstGCD × 0.75) + 350ms`  
   → `burstGCD = floor(GCD / 1.4)`

3. **GREAT判定条件** = `残り時間 >= floor(GCD × 0.75)`

4. **バースト発動タイミング**: ゲームコードの仕様に合わせ、ゲージがLv3（満タン）になった**次のGREAT**でバースト開始

5. **バーストhit条件** = `burstElapsed + floor(burstGCD × 0.75) <= burstDuration`

## 疑似コード

```
function simulate(difficulty):
  gcd           = DIFFICULTIES[difficulty].timeMs
  greatScore    = DIFFICULTIES[difficulty].baseScore + 200
  minPress      = floor(gcd × 0.75)
  effectiveTurn = minPress + 350
  burstGcd      = floor(gcd / 1.4)
  minBurstPress = floor(burstGcd × 0.75)
  effectiveBurstTurn = minBurstPress + 350
  threshold     = LIMIT_GAUGE_THRESHOLDS[difficulty]

  timeMs = 60000, score = 0, level = 0, progress = 0

  while timeMs >= minPress:
    timeMs -= effectiveTurn
    score  += greatScore

    if level == 3:                         # バーストトリガーGREAT
      level = 0, progress = 0
      burstDuration = min(10000, max(0, timeMs))
      burstElapsed  = 0
      while burstElapsed + minBurstPress <= burstDuration:
        burstElapsed += effectiveBurstTurn
        score        += greatScore × 2
      timeMs -= burstDuration
    else:
      progress += 1
      if progress >= threshold:
        progress = 0, level += 1
        timeMs = min(60000, timeMs + LIMIT_GAUGE_BONUS_MS[level - 1])

  return score
```

## 各難易度の計算結果

### わかば（Slow / GCD 3.5s）

| パラメータ | 値 |
|---|---|
| GCD | 3,500ms |
| GREAT得点 | 350pt（baseScore=150 + 200） |
| minPress | 2,625ms |
| 実効ターン | 2,975ms |
| burstGCD | 2,500ms |
| burstMinPress | 1,875ms |
| 実効バーストターン | 2,225ms |
| ゲージ閾値 | 3 GREAT/レベル |

**シミュレーション結果**:

| フェーズ | GREATs | 得点 | 備考 |
|---|---|---|---|
| フェーズ1 前半（ゲージ充填） | 9 | 3,150 | レベル1〜3完成（+6,000ms） |
| フェーズ1 バーストトリガー | 1 | 350 | ゲージLv3→バースト開始 |
| フェーズ1 バースト（4hit） | 4 | 2,800 | 10,000ms中4hit（2×350） |
| フェーズ2 前半（ゲージ充填） | 9 | 3,150 | レベル1〜3完成（+6,000ms） |
| フェーズ2 バーストトリガー | 1 | 350 | ゲージLv3→バースト開始 |
| フェーズ2 バースト（1hit） | 1 | 700 | 残り2,500ms中1hit（2×350） |
| **合計** | **25hit** | **10,500** | |

### チョコボ（Normal / GCD 2.5s）

| パラメータ | 値 |
|---|---|
| GCD | 2,500ms |
| GREAT得点 | 450pt（baseScore=250 + 200） |
| minPress | 1,875ms |
| 実効ターン | 2,225ms |
| burstGCD | 1,785ms |
| burstMinPress | 1,338ms |
| 実効バーストターン | 1,688ms |
| ゲージ閾値 | 5 GREAT/レベル |

**シミュレーション結果**:

| フェーズ | GREATs | 得点 | 備考 |
|---|---|---|---|
| フェーズ1 前半（ゲージ充填） | 15 | 6,750 | レベル1〜3完成（+6,000ms） |
| フェーズ1 バーストトリガー | 1 | 450 | ゲージLv3→バースト開始 |
| フェーズ1 バースト（6hit） | 6 | 5,400 | 10,000ms中6hit（2×450） |
| フェーズ2 後半 | 9 | 4,050 | レベル1完成まで＋残り |
| **合計** | **31hit** | **16,650** | |

### 零式（Fast / GCD 1.5s）

| パラメータ | 値 |
|---|---|
| GCD | 1,500ms |
| GREAT得点 | 550pt（baseScore=350 + 200） |
| minPress | 1,125ms |
| 実効ターン | 1,475ms |
| burstGCD | 1,071ms |
| burstMinPress | 803ms |
| 実効バーストターン | 1,153ms |
| ゲージ閾値 | 6 GREAT/レベル |

**シミュレーション結果**:

| フェーズ | GREATs | 得点 | 備考 |
|---|---|---|---|
| フェーズ1 前半（ゲージ充填） | 18 | 9,900 | レベル1〜3完成（+6,000ms） |
| フェーズ1 バーストトリガー | 1 | 550 | ゲージLv3→バースト開始 |
| フェーズ1 バースト（8hit） | 8 | 8,800 | 10,000ms中8hit（2×550） |
| フェーズ2 前半（ゲージ充填） | 18 | 9,900 | レベル1〜3完成（+6,000ms） |
| フェーズ2 バーストトリガー | 1 | 550 | ゲージLv3→バースト開始 |
| フェーズ2 バースト（5hit） | 5 | 5,500 | 残り5,950ms中5hit（2×550） |
| **合計** | **51hit** | **35,200** | |

## ランク評価閾値（変更なし）

| ランク | DPS% | カラー |
|---|---|---|
| SSS | 99%以上 | #e268a8（ピンク） |
| SS | 95%以上 | #ff8000（オレンジ） |
| S | 75%以上 | #a335ee（紫） |
| A | 50%以上 | #0070ff（青） |
| B | 25%以上 | #1eff00（緑） |
| C | 25%未満 | #666666（グレー） |

## 定数更新が必要なケース

以下のゲームパラメータを変更した場合は、上記シミュレーションを再実行して `THEORETICAL_MAX_SCORE` を更新すること：

- `DIFFICULTIES[*].timeMs`（GCD時間）
- `DIFFICULTIES[*].baseScore`（基礎得点）
- `LIMIT_GAUGE_THRESHOLDS`（ゲージ閾値）
- `LIMIT_GAUGE_BONUS_MS`（時間ボーナス）
- `BURST_DURATION_MS`（バースト時間）
- `BURST_GCD_MULTIPLIER`（バースト加速倍率）
- `BURST_SCORE_MULTIPLIER`（バースト得点倍率）
- `FEEDBACK_SUCCESS_MS`（フィードバック待機時間）
