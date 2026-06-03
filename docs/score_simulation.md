# 理論最高得点のシミュレーション計算

## 目的

リザルト画面の DPS% とランク評価を、固定の「理論最高得点」に基づいて算出する。  
理論最高得点とは「GCD 75% 押下・**実効ゲーム時間 58,000ms**・全 GREAT・全リミット時間ボーナス・全バースト得点ボーナス取得」を前提とした最大スコアのこと。

実効ゲーム時間を 58,000ms とする理由：入力ポーリング遅延（16ms/frame）や状態遷移オーバーヘッドにより、60 秒の枠内で使える実質的な時間は約 2 秒少なくなるため。  
このオフセット値（`SIMULATION_TIME_OFFSET_MS`）を変えることで将来の難易度調整に対応できる。

---

## 定数（参照ファイル: `src/constants.js`）

| 定数 | 値 | 説明 |
|---|---|---|
| `GAME_DURATION_MS` | 60,000ms | 実際のゲーム時間 |
| `SIMULATION_TIME_OFFSET_MS` | 2,000ms | 理論値計算用の差し引き時間 |
| `FEEDBACK_SUCCESS_MS` | 350ms | GREAT 後のフィードバック待機時間 |
| `BURST_GCD_MULTIPLIER` | 1.4 | バースト中の GCD 加速倍率 |
| `BURST_DURATION_MS` | 10,000ms | バースト持続時間 |
| `BURST_SCORE_MULTIPLIER` | 2 | バースト中の得点倍率 |
| `LIMIT_GAUGE_COUNT` | 3 | ゲージ最大レベル数 |
| `LIMIT_GAUGE_BONUS_MS` | [1000, 2000, 3000] | ゲージ Lv1/2/3 完成時の時間ボーナス（ms）|
| `LIMIT_GAUGE_THRESHOLDS` | slow:3, normal:5, fast:6 | 1 ゲージを貯めるのに必要な GREAT 数 |

---

## シミュレーション条件

1. **1 ターンの実効時間** = `floor(GCD × 0.75) + 350ms`  
   → GCD の 75% 時点で押下（GREAT 窓の最早）＋ フィードバック待機

2. **バーストターンの実効時間** = `floor(burstGCD × 0.75) + 350ms`  
   → `burstGCD = floor(GCD / 1.4)`

3. **GREAT 停止条件** = `残り時間 >= floor(GCD × 0.75)`

4. **バースト発動タイミング**: ゲージが Lv3（満タン）になった**次の GREAT** でバースト開始

5. **バースト hit 条件** = `burstElapsed + floor(burstGCD × 0.75) <= burstDuration`

---

## 疑似コード

```
SIMULATION_TIME_OFFSET_MS = 2000   # 猶予オフセット（調整はここを変える）

function simulate(difficulty):
  gcd           = DIFFICULTIES[difficulty].timeMs
  greatScore    = DIFFICULTIES[difficulty].baseScore + 200
  minPress      = floor(gcd × 0.75)
  effectiveTurn = minPress + 350
  burstGcd      = floor(gcd / 1.4)
  minBurstPress = floor(burstGcd × 0.75)
  effectiveBurstTurn = minBurstPress + 350
  threshold     = LIMIT_GAUGE_THRESHOLDS[difficulty]

  timeMs = GAME_DURATION_MS - SIMULATION_TIME_OFFSET_MS   # = 58,000ms
  score  = 0, level = 0, progress = 0

  while timeMs >= minPress:
    timeMs -= effectiveTurn
    score  += greatScore

    if level == 3:                         # バーストトリガー GREAT
      level = 0, progress = 0
      burstDuration = min(BURST_DURATION_MS, max(0, timeMs))
      burstElapsed  = 0
      while burstElapsed + minBurstPress <= burstDuration:
        burstElapsed += effectiveBurstTurn
        score        += greatScore × BURST_SCORE_MULTIPLIER
      timeMs -= burstDuration
    else:
      progress += 1
      if progress >= threshold:
        progress = 0, level += 1
        timeMs = min(GAME_DURATION_MS, timeMs + LIMIT_GAUGE_BONUS_MS[level - 1])

  return score
```

---

## 各難易度の計算結果（実効ゲーム時間 58,000ms）

### わかば（Slow / GCD 3.5s）

| パラメータ | 値 |
|---|---|
| GCD | 3,500ms |
| GREAT 得点 | 350pt（baseScore=150+200）|
| minPress | 2,625ms |
| 実効ターン | 2,975ms |
| burstGCD | 2,500ms |
| burstMinPress | 1,875ms |
| 実効バーストターン | 2,225ms |
| ゲージ閾値 | 3 GREAT/レベル |

| フェーズ | GREAT数 | 得点 | 備考 |
|---|---|---|---|
| フェーズ1 ゲージ充填 | 9 | 3,150 | Lv1〜3完成（+6,000ms）|
| バーストトリガー1 | 1 | 350 | Lv3→バースト |
| バースト1（4hit）| 4 | 2,800 | 10,000ms 中 4hit（2×350）|
| フェーズ2 ゲージ充填 | 9 | 3,150 | Lv1〜3完成（+6,000ms）|
| バーストトリガー2 | 1 | 350 | 残り 500ms→ 0hit |
| **合計** | **24hit** | **9,800** | |

---

### チョコボ（Normal / GCD 2.5s）

| パラメータ | 値 |
|---|---|
| GCD | 2,500ms |
| GREAT 得点 | 450pt（baseScore=250+200）|
| minPress | 1,875ms |
| 実効ターン | 2,225ms |
| burstGCD | 1,785ms |
| burstMinPress | 1,338ms |
| 実効バーストターン | 1,688ms |
| ゲージ閾値 | 5 GREAT/レベル |

| フェーズ | GREAT数 | 得点 | 備考 |
|---|---|---|---|
| フェーズ1 ゲージ充填 | 15 | 6,750 | Lv1〜3完成（+6,000ms）|
| バーストトリガー | 1 | 450 | Lv3→バースト |
| バースト（6hit）| 6 | 5,400 | 10,000ms 中 6hit（2×450）|
| フェーズ2 後半 | 8 | 3,600 | Lv1 まで充填＋残り |
| **合計** | **30hit** | **16,200** | |

---

### 零式（Fast / GCD 1.5s）

| パラメータ | 値 |
|---|---|
| GCD | 1,500ms |
| GREAT 得点 | 550pt（baseScore=350+200）|
| minPress | 1,125ms |
| 実効ターン | 1,475ms |
| burstGCD | 1,071ms |
| burstMinPress | 803ms |
| 実効バーストターン | 1,153ms |
| ゲージ閾値 | 6 GREAT/レベル |

| フェーズ | GREAT数 | 得点 | 備考 |
|---|---|---|---|
| フェーズ1 ゲージ充填 | 18 | 9,900 | Lv1〜3完成（+6,000ms）|
| バーストトリガー1 | 1 | 550 | Lv3→バースト |
| バースト1（8hit）| 8 | 8,800 | 10,000ms 中 8hit（2×550）|
| フェーズ2 ゲージ充填 | 18 | 9,900 | Lv1〜3完成（+6,000ms）|
| バーストトリガー2 | 1 | 550 | Lv3→バースト |
| バースト2（3hit）| 3 | 3,300 | 残り 3,950ms 中 3hit（2×550）|
| **合計** | **49hit** | **33,000** | |

---

## ランク評価閾値

| ランク | DPS% | カラー |
|---|---|---|
| SSS | 99%以上 | #e268a8（ピンク）|
| SS  | 95%以上 | #ff8000（オレンジ）|
| S   | 75%以上 | #a335ee（紫）|
| A   | 50%以上 | #0070ff（青）|
| B   | 25%以上 | #1eff00（緑）|
| C   | 25%未満 | #666666（グレー）|

DPS% は `Math.min(100, round(score / theoreticalMax × 100))` で計算されるため、  
理論最高得点を超えるスコアを取った場合は 100% = SSS となる。

---

## 定数更新が必要なケース

以下のゲームパラメータを変更した場合は、上記シミュレーションを再実行して `THEORETICAL_MAX_SCORE`（`src/constants.js`）を更新すること：

- `DIFFICULTIES[*].timeMs`（GCD 時間）
- `DIFFICULTIES[*].baseScore`（基礎得点）
- `LIMIT_GAUGE_THRESHOLDS`（ゲージ閾値）
- `LIMIT_GAUGE_BONUS_MS`（時間ボーナス）
- `BURST_DURATION_MS`（バースト時間）
- `BURST_GCD_MULTIPLIER`（バースト加速倍率）
- `BURST_SCORE_MULTIPLIER`（バースト得点倍率）
- `FEEDBACK_SUCCESS_MS`（フィードバック待機時間）
- `SIMULATION_TIME_OFFSET_MS`（猶予オフセット）
