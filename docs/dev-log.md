# PAD-MOKUJIN 開発ログ

---

## refine: AoEパターン出現率調整・small-circles改善

**日付**: 2026-05-31

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/aoe.js` | left/right/top/bottom を1カテゴリとして出現率調整 |
| `src/aoe.js` | small-circles の最低スポーン数を3に変更・重なり防止追加 |
| `src/constants.js` | `AOE_SIZE_SCALE_BASE` / `AOE_SIZE_SCALE_RANGE` 調整 |

### 詳細

**方向系 AoE 出現率**

8種を等確率で選ぶ従来方式では left/right/top/bottom が合計50%を占めて偏りが目立った。5カテゴリ（directional / large-circle / small-circles / fan / band）から等確率で選び、directional 当選時に4方向をランダム選択する方式に変更。

| 変更前 | 変更後 |
|-------|-------|
| 4方向それぞれ 12.5%、合計 50% | 方向系カテゴリ合計 20% |

**small-circles スポーン数・重なり防止**

| 項目 | 変更前 | 変更後 |
|------|-------|-------|
| スポーン数 | 2〜4個 | 3〜4個（最低3保証） |
| 重なり防止 | なし | 中心間距離 < r の場合リトライ（最大20回） |

**AoE サイズスケール**

| 定数 | 変更前 | 変更後 |
|------|-------|-------|
| `AOE_SIZE_SCALE_BASE` | 0.85 | 1.00 |
| `AOE_SIZE_SCALE_RANGE` | 0.30 | 0.20 |
| 実効範囲 | 0.85〜1.15 | 1.00〜1.20 |

方向系 AoE はパネルの50%〜60%幅に固定され、より明確な危険ゾーンを提示する。

---

## refine: 左右スティック移動速度を約20%低下

**日付**: 2026-05-31

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/constants.js` | `STICK_SPEED_L` / `STICK_SPEED_R` をそれぞれ `STICK_SPEED * 0.65` に変更 |

### 詳細

AoE回避（左スティック）・宝探しマップ移動（右スティック）どちらも操作感を調整するため移動速度を約20%低下させた。

| 定数 | 変更前 | 変更後 |
|------|-------|-------|
| `STICK_SPEED_L` | `STICK_SPEED * 0.68`（旧0.85）| `STICK_SPEED * 0.65` |
| `STICK_SPEED_R` | `STICK_SPEED * 0.80` | `STICK_SPEED * 0.65` |

`STICK_SPEED`（基底値 1.275）は L・R 両定数の計算基準として存続。

---

## fix: リザルト画面でゲームUIが透過表示される問題を修正

**日付**: 2026-05-31

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/ui.js` | `showGameOver()` でゲームUI要素を非表示化 |
| `src/main.js` | `startGame()` でゲームUI要素を再表示 |

### 修正詳細

リザルト画面（`#screen-gameover`）は `.screen` クラスの `background: transparent` を継承しており、背後のゲームUI要素（ヘッダー・情報バー・スティックエリア・XHB）がはみ出して見える状態だった。

オーバーレイで隠す方式ではなく、`showGameOver()` 呼び出し時に `#header` / `#info-bar` / `#game-area` / `#xhb-wrap` へ `hidden` クラスを付与して非表示にし、次のゲーム開始（`startGame()`）時に `hidden` を解除する方式で修正。リザルト画面の背景はトップ画面と同様のパーティクルアニメーションのみが表示される。

---

## fix: 宝箱ギミック 見た目修正（アイコン・格子線）

**日付**: 2026-05-31

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/ui.js` | 開いた宝箱SVGを全面リデザイン |
| `src/ui.js` | `showStack()` の `stk-overlay` 生成コードを削除 |
| `src/ui.js` | `clearStack()` の `stk-overlay` 削除処理を削除 |
| `styles/main.css` | `.stk-overlay` CSSルールを削除 |

### 修正詳細

#### Bug 1：開いた宝箱アイコンの上部が見切れる
- **原因**: `_STK_CHEST_OPEN_SVG` の蓋が `transform="rotate(-45 -14 -3.5)"` で回転しており、蓋の上端コーナーが SVG viewBox（`-20 -20 40 40`）を大きく超過（y≈-31）。SVGデフォルトのoverflow:hiddenによりクリップされていた
- **修正**: 回転付き`<rect>`を廃止し、台形`<polygon>`で蓋を表現。遠近感のある形状（下辺=ヒンジ幅、上辺=奥側で狭い）に変更

#### Bug 2：格子線がアクティブ時に黒くなる
- **原因**: `showStack()` でギミック開始時に `.stk-overlay`（`background: rgba(0,0,0,0.45)` の黒オーバーレイ）を右スティックフィールドへ追加していた。このdivが格子線を覆い黒く見せていた
- **修正**: `stk-overlay` の生成・追加・削除コードとCSSルールをすべて削除

### 開いた宝箱SVGの最終デザイン

```
overflow="visible"で飛び出しを実現（viewBox外に描画）

        ✦              ← スパークル（y=-39）
    ◆              ← 宝石ひし形（y=-37, 黄色）
  ○       ○       ← コイン左右（y=-27〜-29）
    ○              ← コイン中央（y=-24）
 ┌──────────┐    ← 開いた蓋（台形、y=-4〜-17）
 └──────────┘    ← 胴体（y=-4〜10）
   ● ●          ← 内側のコイン（透過可視）
```

- `overflow="visible"` を SVG に付与し、アイテムを viewBox 外（y < -20）まで描画
- 胴体内コイン2つ、飛び出しコイン3つ＋宝石、全て同じ黄色で統一
- スパークルラインも蓋の外側に配置

---

## fix: 一時停止復帰時の3つのバグ修正

**日付**: 2026-05-31

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/sound.js` | `resumeRhythm(isBurst, savedBeat)` メソッドを追加 |
| `src/game.js` | `pause()` にリズム拍位置・ペンディングタイマー残り時間の保存を追加、`resume()` を3バグ対応に修正、`_processHit/Miss` に `_feedbackMs` 保存を追加 |

### 修正バグ詳細

#### Bug 1：復帰時にゲーム開始音が鳴る
- **原因**: `resume()` が `sound.startRhythm()` を呼んでいたが、この関数は最初のビートを即座に発火（`fire()` を `setInterval` 前に呼ぶ）するためゲーム開始音と同じ音が鳴っていた
- **修正**: `resumeRhythm(isBurst, savedBeat)` を追加。`fire()` の即時呼び出しなし、かつポーズ時の拍位置（`_pausedRhythmBeat`）から再開

#### Bug 2：フィードバック中にポーズすると復帰時にリキャスト表示が突変する
- **原因**: `_pausedFromState === 'feedback'` のとき `_nextSlot()` が即座に呼ばれ、`xhb.clearAllStates()` によりリキャスト表示がリセットされていた
- **修正**: `_processHit/Miss` で `_feedbackMs` に使用タイムアウトを保存。復帰時は `state = 'feedback'` を復元し `_feedbackMs` 後に `_nextSlot()` を呼ぶ

#### Bug 3：2スロットアクティブ状態でポーズするとペンディングスロットのゲージが固定
- **原因**: `pause()` で `_pendingSlotId = null` と無条件クリアしており、RAF も停止したまま復帰後に `_startPendingTimer()` が呼ばれなかった
- **修正**: `pause()` で `_pendingSlotId` を保持しつつペンディングタイマー残り時間を `_pausedPendingTimerRemaining` に保存。復帰時に `_pendingTimerStart` をポーズ時間分補正して `_startPendingTimer()` を再起動

---

## refine: 宝探しギミック — 内側フレーム縮小・近接スポーン抑制

**日付**: 2026-05-31

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/constants.js` | `STK_FRAME_W/H_PCT` を 36.656→32.990（×0.9）に縮小、`STK_FRAME_HALF_W/H` を 0.36656→0.32990 に更新、`STK_CHEST_SPAWN_EXCLUDE_HALF ≈ 0.66495` を追加 |
| `styles/main.css` | `.stk-frame` の width/height を 36.656%→32.990% に縮小 |
| `src/aoe.js` | `_spawnStack` のスポーン除外条件を `STK_FRAME_HALF_W/H` から `STK_CHEST_SPAWN_EXCLUDE_HALF` に変更 |

### 変更仕様

- **中央フレーム**: フィールド幅の約32.99%（従来比90%）
- **スポーン除外ゾーン**: 内枠(±0.32990)〜外枠(±1.0)の中間点 = ±0.66495 より内側は出現不可
  - 旧: フレーム内（±0.367）のみ除外
  - 新: ±0.665 のボックス内を除外 → スポーン可能範囲は 0.665〜0.85 のリング状エリアに限定
- **目的**: 宝箱が中央付近に出現して簡単すぎるケースを抑制

---

## refine: 宝探しギミック調整（外観・サウンド・スポーン）

**日付**: 2026-05-30

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/ui.js` | 宝箱SVGサイズを 60→30px に縮小、`onChestOpen` コールバック追加、方向インジケーターを幅広シェブロン（`<` 形）に変更 |
| `src/constants.js` | `STK_FRAME_W/H_PCT`・`STK_FRAME_HALF_W/H` を 48.875→36.656（×0.75）に縮小 |
| `src/sound.js` | `playChestOpen()` メソッド追加（宝箱開封時の短い音） |
| `src/game.js` | `_onChestOpen()` 追加・start/resume で `ui.onChestOpen` を接続 |
| `src/aoe.js` | 宝箱スポーンをオンスクリーン（`±0.85`）のみに変更（オフスクリーンスポーン廃止） |
| `src/main.js` | `resetStickCursors()` を FATE JOINED オーバーレイ表示前に移動 |
| `styles/main.css` | 宝箱CSSサイズ 60→30px、フレームサイズ 48.875→36.656%、グリッド線 opacity 0.08→0.22、方向インジケーター明滅アニメーション追加（1.4s） |

### 変更仕様

- **宝箱サイズ**: 従来の半分（30×30px）に縮小
- **中央フレーム**: 従来の75%サイズ（フィールド幅の約36.7%）
- **グリッド線**: `rgba(100,180,255,0.22)`（従来の約2.75倍の濃度）
- **宝箱開封音**: 枠内に収めた瞬間に A5→E6 の短い2音（`playChestOpen()`）
- **方向インジケーター**: 三角形▲から幅広シェブロン（`viewBox="0 0 24 14"`）に変更、1.4s周期でゆっくり明滅
- **スポーン範囲**: ミニマップ内（`±0.85`）のみ。移動で画面外に出ることはある
- **マップ初期化**: FATE JOINED アニメーション開始前に背景グリッド位置を (0,0) にリセット

---

## feat: 右スティックギミック「宝探し」— ミニマップスクロール宝箱キャプチャ

**日付**: 2026-05-30

### 変更概要

右スティックギミックを「フレーム移動でマーカーを捕まえる」から「背景スクロールで宝箱を枠内に収める」方式に全面刷新。ゲーム難易度・タイミング・速度は据え置き（数学的に等価な設計）。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/constants.js` | `STK_MARKER_RANGE/STK_CENTER_EXCLUDE_R` を削除、`STK_CHEST_SPAWN_ONSCREEN_MAX=0.85` / `STK_CHEST_SPAWN_OFFSCREEN_MAX=1.4` を追加 |
| `index.html` | `stk-marker`（N/S/E/W矢印SVG）を削除 → `stk-chest`（宝箱）/ `stk-direction`（▲インジケーター）を追加 |
| `styles/main.css` | `stk-marker`関連スタイル・アニメーション全削除、Rパネルフィールドにグリッド背景追加（`background-image: repeating-gradient`）、`.stk-chest` / `.stk-direction` スタイル追加 |
| `src/ui.js` | `_moveFrameCursor` を `_moveWorldCursor` に置き換え（フレーム固定・背景スクロール実装）、方向インジケーター `_updateDirectionIndicator` 追加、`showStackWarning` / `clearStack` 更新、宝箱SVG定数 `_STK_CHEST_CLOSED_SVG` / `_STK_CHEST_OPEN_SVG` 追加 |
| `src/aoe.js` | `_spawnStack` でスポーン範囲拡張・stickRリセット追加、`_checkStackHit` を `!ui._stkChestOpened` に簡略化 |

### ゲームメカニクス仕様

- **フレーム**: 常にミニマップ中央に固定（`left:50%; top:50%`）
- **背景**: 薄いグリッド（`rgba(100,180,255,0.08)`）がスティック入力に応じてスクロール
- **宝箱スポーン**: 50%の確率でミニマップ内（`±0.85`）、50%でミニマップ外（`±1.4`）
- **方向インジケーター**: 宝箱がミニマップ外の場合、枠の端に ▲ が宝箱方向を指して表示
- **キャプチャ**: 毎フレーム連続判定。宝箱が中央フレーム内に入ると閉→開に変化（一度開いたら維持）
- **成功条件**: `AOE_WARNING_MS=3000ms` 以内に宝箱を開けること（開いた状態で時間切れ → 成功）
- **座標系**: ワールド座標 = `stickR.x/y`（`±1`クランプ）、スクリーン座標 = `chestWorldX - worldOffsetX`

### 設計ドキュメント

`docs/designs/plan_chest_gimmick_2026-05-30.md` を参照。

---

## refine: 頭割りギミック中央マーカーを円盤に変更

**日付**: 2026-05-30

### 変更内容

| ファイル | 内容 |
|---------|------|
| `index.html` | `stk-grp-center` 内の∨形矢印2本を `<circle r="6">` に置き換え |
| `styles/main.css` | `.stk-center-disc` クラス追加（fill: #FFFAE8、stroke: #FF9900、opacity: 0.3、グロー） |

### デザイン仕様

- **形状**: 半径6の円盤（SVG viewBox -50〜50 基準）、中心がギミック中心点(0,0)と一致
- **外観**: 白いコア（`fill: #FFFAE8`）＋オレンジのアウトライン（`stroke: #FF9900`）＋黄金色グロー
- **透明度**: `opacity: 0.3`（控えめな存在感）
- **アニメーション**: 従来の `stk-bob`（上下ふわふわ）をそのまま継承

---

## fix: バースト終了後にスロット速度が通常速度へ戻らない問題を修正

**日付**: 2026-05-30

### 概要

LIMIT BREAK バースト（10秒）が終了した後も、スロットが 1.4倍速のバースト速度のまま回り続ける問題を修正。

### 根本原因

前回の「LBゲージ0タイミングでの速度急低下修正」で `_onGaugeFull()` が `_getTimeMs()`（動的）ではなく `_slotTimeMs`（スナップショット）を参照するよう変更した。これは急変回避のための意図的な修正だが、バースト速度が pending スロットチェーン経由で永続的に伝播し続ける副作用が残っていた。

```
スロットA（バースト速度）→ pending B（バースト速度引き継ぎ）→ pending C（同）→ 永続…
```

### 修正内容

`_onGaugeFull()` に `burstLapsed` フラグを追加。現在スロットがバーストスロット (`_slotIsBurst=true`) でかつバーストが既に終了している (`!this.isBurst`) 場合、次の pending スロットに通常速度を割り当てる。

| # | 変更箇所 | 内容 |
|---|---------|------|
| 1 | `_onGaugeFull()` | `burstLapsed = _slotIsBurst && !isBurst` を判定し、true の場合は pending スロットに `_getTimeMs()`（通常速度）を使用 |
| 2 | `_pendingSlotIsBurst` | `burstLapsed` のとき `false` にセット（スコア倍率・コンボ保護・サウンドを通常状態に） |

### 効果

- バースト中のスロット・既にキューされた pending スロット：速度急変なし（既存修正を維持）
- バースト終了後の新規 pending スロット：通常速度へ自然移行
- 1〜2スロットのグレースピリオド後、完全に通常速度へ復帰

設計詳細: [docs/designs/plan_lb_steady_wall.md](designs/plan_lb_steady_wall.md)

---

## revert: スクロールバー抑制を撤回・ゲームオーバー画面のスクロール方式を変更

**日付**: 2026-05-30

### 概要

`cf79302` で追加した「スクロールバー抑制」を撤回し、スクロールの主体を変更した。  
変更前：パネル内部がスクロールし、ウインドウはスクロールしない  
変更後：パネル内部はスクロールせず、ゲームオーバー画面（オーバーレイ）自体がスクロールする

### 変更内容

| # | 変更内容 | ファイル |
|---|---------|---------|
| 1 | `html { overflow: hidden; }` を削除（スクロールバー抑制を撤回） | `styles/main.css` |
| 2 | `#screen-gameover .screen-panel` の `overflow-y: auto` / `max-height` を削除（パネル内部スクロール解除） | `styles/main.css` |
| 3 | `#screen-gameover` に `overflow-y: auto; align-items: flex-start; padding: 16px 8px` を追加（オーバーレイ自体をスクロール可能に） | `styles/main.css` |

設計詳細: [docs/designs/plan_scrollbar_revert.md](designs/plan_scrollbar_revert.md)

---

## fix: LBゲージ終了タイミングでのリキャスト速度急低下を修正

**日付**: 2026-05-30

### 概要

バーストモード（LIMIT BREAK）中に表示されたスロットは 1.4倍速の GCD で回転を開始するが、LBゲージが 0 になった瞬間に `isBurst = false` に即時切り替わるため、同じスロットのライフサイクル内（入力判定・pendingスロット生成・スコア計算）で通常 GCD 時間が適用されてしまい、「速度が急低下したように見える」問題があった。

### 根本原因

`_onInput()` / `_onGaugeFull()` / `_processHit()` / `_processMiss()` がいずれも呼び出し時点の `this._getTimeMs()` や `this.isBurst` を参照していたため、スロット開始後にバーストが終了するとその場で挙動が切り替わっていた。

### 修正方針：スロット開始時に GCD 状態をスナップショット保存

各スロットが「回り始めた」瞬間の `timeMs` と `isBurst` を新規フィールドに記録し、そのスロットのライフサイクル全体でその値を使用する。pending スロットも生成時の値を引き継ぐ。

### 変更内容

| # | 変更箇所 | 内容 |
|---|---------|------|
| 1 | `constructor` / `start()` | `_slotTimeMs` / `_slotIsBurst` / `_pendingSlotTimeMs` / `_pendingSlotIsBurst` を追加・初期化 |
| 2 | `_nextSlot()` | スロット開始時に上記4フィールドをキャプチャ |
| 3 | `_onGaugeFull()` | `_getTimeMs()` → `_slotTimeMs`・`_slotIsBurst` を pending に引き継ぐ |
| 4 | `_onInput()` | `_getTimeMs()` → `_slotTimeMs`（入力判定タイミングのズレ解消） |
| 5 | `_processHit()` | `this.isBurst` → `this._slotIsBurst`（スコア倍率・サウンド） |
| 6 | `_processMiss()` | `this.isBurst` → `this._slotIsBurst`（コンボ保護） |
| 7 | `pause()` / `resume()` | `_getTimeMs()` → `_slotTimeMs`（一時停止中にバーストが終了しても速度を保持） |

### 効果

- LBゲージ 0 直後も回転速度が変わらない（バースト GCD を最後まで維持）
- LBゲージ 0 直後のスコアもバースト倍率（×2）を維持
- pending スロット（次スロットの先読み表示）も同じ速度・倍率を引き継ぐ
- 次の「新規スロット」から通常速度へ自然に移行

**変更ファイル**: `src/game.js` のみ

---

## UXポリッシュ・バランス調整（スクロールバー・カーソル・ギミック比率・AoEグラデーション）

**日付**: 2026-05-30

### 概要

4つの改善を一括実施。設計ドキュメントは `docs/designs/` に保存。

### 変更内容

| # | 内容 | 変更ファイル |
|---|------|-------------|
| 1 | ウィンドウが狭い場合のスクロールバーを抑制 | `styles/main.css` |
| 2 | Gate Joined 表示タイミングでカーソルを中央にリセット | `src/ui.js`, `src/main.js` |
| 3 | ギミック出現比率制御（L 3連続→強制R、R 2連続→強制L） | `src/aoe.js` |
| 4 | AoEゾーン内グラデーションの最暗部を明るく調整 | `styles/main.css` |

### 詳細

**実装1: スクロールバー抑制**  
`html { overflow: hidden; }` を追加。ゲームパッド専用の固定レイアウトのため、ページ全体のスクロールは不要。ゲームオーバー画面の内部スクロール（`overflow-y: auto`）は引き続き機能する。

**実装2: Gate Joined 表示時カーソルリセット**  
`UIManager.resetStickCursors()` を追加。Gate Joined オーバーレイ表示の瞬間（アニメーション開始時）に左スティックカーソルと右スティックフレームを中央（50%, 50%）にリセットする。従来はアニメーション終了後の `engine.start()` 内でリセットされていた。

**実装3: ギミック出現比率制御**  
`AoeEngine` に `_leftStreak` / `_rightStreak` を追加。`_spawn()` で L が3連続した場合は強制的に R を、R が2連続した場合は強制的に L を選択する。それ以外は 50/50 ランダムを維持。

**実装4: AoEグラデーション明度調整**  
- 矩形・円・帯ゾーン: ベース色 `rgba(255, 100, 0, 0.06)` → `0.14` に引き上げ
- ファンゾーン: 中心を `transparent` → `rgba(255, 100, 0, 0.07)` に、35%地点も `0.10` → `0.13` に調整

---

## 左スティック AoE 表示のビジュアル刷新

**日付**: 2026-05-30

### 概要

左スティックの AoE ゾーン表示を以下の方針で刷新した。  
JS 側の変更はなく、`styles/main.css` のみ変更。

### 変更内容

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 成功（dodge）カラー | 緑 | オレンジ統一 |
| 失敗（hit）カラー | 赤 | オレンジ統一 |
| カーソル位置による色変化 | `warning-in`（橙赤）/ `warning-out`（緑）で異なる | 同一スタイルに統一 |
| 枠線色 | 緑・赤・橙系が混在 | `#FFA850`（赤寄りオレンジ）に統一 |
| 領域内背景 | 均一な単色塗り | 中心ほど透明・外縁ほど不透明のグラデーション |
| ファンゾーンのグラデーション | なし | `radial-gradient`（clip-path のため inset 代替） |
| コンテナ div の発光 | あり（状態クラスが波及） | 2クラス複合セレクタで抑制 |

### グラデーション実装詳細

- **矩形・円ゾーン**: 4段階の `inset` box-shadow を重ねることで外縁急勾配・中心緩勾配を再現
  - `inset 0 0 4px 0.72` / `12px 0.44` / `28px 0.22` / `50px 0.10`
- **ファンゾーン**: `clip-path` で inset shadow がクリップされるため `radial-gradient(ellipse at 50% 50%, transparent → rgba(255,115,0,0.68))` で代替
- コンテナ div（フィールド全体を覆う wrapper）に状態クラスが付与されても発光しないよう、`.aoe-zone--container.aoe-zone--{state}` の複合セレクタで `background/border/box-shadow/animation` をリセット

### 変更ファイル

| ファイル | 内容 |
|---------|------|
| `styles/main.css` | AoE ゾーン色・グラデーション・コンテナ抑制ルール |

---

## 頭割りマーカーSVGデザイン微調整（矢印位置・中央矢印サイズ）

**日付**: 2026-05-30

### 概要

頭割りマーカーSVGのデザインをさらに調整。四方矢印を中央に寄せ、中央矢印を小さく・細く、上下矢印の隙間を解消した。

### 変更内容

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| N/S/W/E 矢印の位置 | 最内先端 ±28 | 最内先端 ±18（10単位中央寄せ） |
| 中央矢印 stroke-width | 3.5 | 2.0（`.stk-grp-center .stk-shape` で上書き） |
| 中央矢印サイズ（上） | `-3,-16 0,-10 3,-16` | `-2.5,-10 0,-5 2.5,-10`（縮小） |
| 中央矢印サイズ（下） | `-5,-9 0,-3 5,-9` | `-4,-5 0,0 4,-5`（縮小・上矢印tipと接続） |
| 中央上下の隙間 | 1単位 | 0（上tip y=-5 と下wings y=-5 が一致） |

### 変更ファイル

| ファイル | 内容 |
|---------|------|
| `index.html` | N/S/W/E 全矢印座標を10単位中央シフト、中央矢印座標を縮小・接続 |
| `styles/main.css` | `.stk-grp-center .stk-shape { stroke-width: 2; }` を追加 |

---

## 頭割りマーカーSVGデザインの精度向上

**日付**: 2026-05-30

### 概要

前回追加した頭割りマーカーSVGを、実際のFF14のマーカーデザインに近づけるために複数回の調整を行った。

### 変更内容

#### チェブロン形状・配置

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| 四方矢印の横幅 | ±5 | ±8 |
| 四方矢印間スキマ | 約3単位 | -2単位（2単位重なり） |
| 線の太さ (stroke-width) | 2.5 | 3.5 |
| 中央矢印の数 | 3枚 | 2枚 |
| 中央・上の幅 | ±5〜7 | ±3（下の±5より狭い） |

#### 色・透過度

| クラス | 旧 stroke | 新 stroke | opacity |
|--------|-----------|-----------|---------|
| `stk-dim`（外側） | #FFE566 | #FFB844 | 0.30（より透過） |
| `stk-mid`（中間） | #FFB800 | #FF9900 | 0.65（オレンジ） |
| `stk-bright`（内側） | #FF7700 | #FFFAE8 | 1.0（ほぼ白） |

- 外側ほど透過率が高く、内側ほど明るく白い炎のグラデーション
- 中央矢印：上=stk-mid（橙）、下=stk-bright（白）

#### アニメーション同期

- `stk-grp-center` のアニメーション周期を 1.4s → **1.6s** に変更し、四方パルスと同期

#### 幾何学的レイアウト

各矢印の内側先端座標を以下に統一し、「左右先端を結ぶ水平線が上下先端の中点を通る」制約を満たした。

| 方向 | 先端座標 |
|------|---------|
| N | (0, −28) |
| S | (0, +28)（旧: y=7 → 対称化） |
| W | (−28, 0) |
| E | (+28, 0) |
| 中央∨下先端 | (0, −3)（幾何学的中心 y=0 の3単位上） |

### 変更ファイル

| ファイル | 内容 |
|---------|------|
| `index.html` | 全5グループ（center/N/S/W/E）のSVG座標・クラスを更新 |
| `styles/main.css` | `stroke-width`・`stk-dim/mid/bright` の色・opacity・glow更新、`stk-bob` 周期変更 |

---

## 右パネルギミックを「探検アイコン捕獲」→「頭割りマーカー」ビジュアルに変更

**日付**: 2026-05-30

### 概要

右スティックパネルのギミックのビジュアルを、FFXIV の「頭割り（stack）」マーカーデザインに刷新した。
ゲームロジック（スポーン・判定・タイミング）は変更なし。

### ビジュアル変更内容

| 項目 | 旧（探検アイコン） | 新（頭割りマーカー） |
|------|------|------|
| ターゲット表示 | 丸い光球アイコン（CSS円＋オーラリング） | 黄橙 SVG チェブロン（中心3枚 ＋ N/S/W/E 各3枚） |
| ターゲットの色変化 | 赤（枠外）→ 緑（枠内） | 常に黄橙（変化なし） |
| アニメーション | 回転スピン＋呼吸脈動 | 中心：上下振動（1.4s）、4方向：外向きパルス（1.6s） |
| プレイヤー枠 | 四角枠（変更なし） | 四角枠（変更なし） |
| 枠の色変化 | 赤（未捕獲）→ 緑（捕獲） | 赤（未捕獲）→ 緑（捕獲）（変更なし） |

### 変更ファイル

| ファイル | 内容 |
|---------|------|
| `index.html` | `gaze-eye-R` を `stk-marker-R`（SVG）に置換 |
| `styles/main.css` | `.stk-marker` / `.stk-svg` / `.stk-shape` / `.stk-dim` / `.stk-mid` / `.stk-bright` スタイル追加、アニメーション（`stk-bob`・`stk-pulse-n/s/w/e`）追加、`#stick-panel-R .stick-field { overflow: visible }` 追加 |
| `src/ui.js` | `_gazeEye` → `_stkMarker`、枠ロジック・色状態は維持 |

設計詳細: [docs/designs/plan_stack-marker.md](designs/plan_stack-marker.md)

---

## 右パネルギミックを「視線回避」→「探検アイコン捕獲」に変更

**日付**: 2026-05-30

### 概要

右スティックパネルのギミックを、「目アイコンを枠の外に追い出す」ルールから「探検アイコン（光球）を枠の中に取り込む」ルールへ全面変更した。

### ルール変更

| 項目 | 旧（視線ギミック） | 新（探検ギミック） |
|------|------|------|
| 目標 | 目アイコンを枠の**外**に保つ | 探検アイコンを枠の**内**に取り込む |
| スポーン位置 | 枠内外ランダム（1/3確率で枠内） | 常に枠の**外** |
| アイコン色 | 赤一色（固定） | **赤**（枠外）→ **緑**（枠内）にリアルタイム変化 |
| 成功条件 | 目が枠外にある状態で時間切れ | アイコンが枠内にある状態で時間切れ |

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/aoe.js` | `_spawnGaze()`: `forceInside` ロジック削除。do-while 条件を「枠内ならリトライ」に変更し常に枠外スポーン |
| `src/aoe.js` | `_checkGazeHit()`: `!captured` を返すよう反転（ヒット = キャプチャ失敗） |
| `src/ui.js` | `showGazeWarning()`: 初期クラスに `gaze-eye--danger`（赤）を付与 |
| `src/ui.js` | `_moveFrameCursor()`: フレームクラス更新に加え、アイコンクラスも同期（inside→`--captured`、outside→`--danger`） |
| `styles/main.css` | `.gaze-frame--in`/`--out` の色を反転（inside=緑・成功、outside=赤・未捕獲） |
| `styles/main.css` | `.gaze-eye` を目の SVG から純 CSS 円形光球に全面再設計 |

### 探検アイコンのビジュアル仕様

- **核（12px → 15px 円形）**: 中心が明るく外縁が透明になる放射グラデーション。球面ハイライトなし
- **オーラリング（`::before`）**: conic-gradient による明暗2箇所ずつのリング。`tanken-spin`（5s 回転）＋ `tanken-aura-breathe`（3s 呼吸脈動）でアニメーション
- **色状態**: 赤（枠外・danger）/ 緑（枠内・captured）/ 赤強調（結果・hit）/ 緑強調（結果・dodge）
- 判定結果時もオーラが消えないよう `--hit::before` / `--dodge::before` に conic-gradient を定義

---

## ゲーム開始時のリミットゲージ残留表示を修正

**日付**: 2026-05-30

### 概要

ゲーム開始時（「GATE JOINED」表示中および開始直後）に、前のゲームのリミットゲージ残量が見えていた問題を修正した。

### 原因

2つのタイミング問題が重なっていた。

1. **CSSトランジションによるアニメーション**: `engine.start()` 内で `updateAll()` がゲージ幅を0%にセットする際、`.limit-segment-fill` の `transition: width 0.1s ease` が働き、前の値から0%へのフェードアウトアニメーションが発生していた。
2. **表示タイミングのずれ**: `engine.start()` の呼び出しは「GATE JOINED」アニメーション終了後のため、オーバーレイ表示中はゲージリセットが行われていなかった。

### 修正内容

| ファイル | 内容 |
|---------|------|
| `src/ui.js` | `resetLimitGaugeInstant()` を追加。`transition: none` で幅を即座に0%にリセット後、`getBoundingClientRect()` でリフローを強制してからトランジションを復元 |
| `src/ui.js` | `resetHUDForStart()` を追加。スコア・コンボ・GCDタイマーバー・カウントダウン数値・リミットゲージをまとめてリセット |
| `src/game.js` | `start()` 内の `updateAll()` 呼び出し前に `resetLimitGaugeInstant()` を追加 |
| `src/main.js` | `startGame()` の「GATE JOINED」オーバーレイ表示直前に `resetHUDForStart()` を呼び出し、オーバーレイ表示中のHUD残留を全て解消 |

---

## XHBボタン発光の連打追従改善

**日付**: 2026-05-29

### 概要

ボタンを連打したとき、XHBの発光エフェクト（白フラッシュ・アクティブグロー）が視覚的に追いつかない問題を修正した。

### 原因

CSSアニメーションは「すでにクラスが付いている要素に同じクラスを再度 add しても再起動しない」という仕様がある。

- **setSlotFlash**: 連打時に `xhb-slot--flash` が既に付いた状態で `classList.add` しても効果なし → フラッシュが発火しているように見えない
- **setSlotState**: `el.className = 'xhb-slot xhb-slot--active'` の再代入は DOM 変化なしとみなされ、`slot-glow-pulse` が再起動しない（pending スロットが `_onGaugeFull` と `_nextSlot` で二重に active 化される場合など）

### 修正内容

| ファイル | 内容 |
|---------|------|
| `src/xhb.js` | `setSlotFlash`: `classList.remove` → `void el.offsetWidth`（reflow強制）→ `classList.add` の順に変更 |
| `src/xhb.js` | `setSlotState`: `el.className` 一括代入を、ベースクラスリセット → `void el.offsetWidth` → `classList.add` に変更 |

`void el.offsetWidth` はブラウザに同期レイアウト計算を強制し、クラスの除去と追加の「間」を確実に分離することでアニメーションを毎回最初から再起動させる標準的な手法。

---

## UI文字の視認性改善・難易度ボタン表示変更

**日付**: 2026-05-29

### 概要

小サイズ・暗色のラベル文字が読みにくかった問題を修正した。
あわせて、難易度ボタンの表示文言とレイアウトを変更した。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `styles/main.css` | `--text-dim` を `#5a5040` → `#9a8868`、`--gold-dim` を `#6a5525` → `#967840` に変更 |
| `styles/main.css` | `.setting-label` / `.info-label` / `.label-sm` / `.pad-hint` のフォントサイズを 10px → 11px に拡大 |
| `styles/main.css` | `.ornament` 11px → 12px、`.rank-label` 12px → 13px、`.heatmap-title` 10px → 11px |
| `styles/main.css` | `.slot-key` のフォントサイズを 9px → 10px、文字色を `#22253a`（ほぼ不可視）→ `#5c6282` に変更 |
| `styles/main.css` | `#diff-btns .btn` に `flex: 1; min-width: 100px` を追加し、ボタン3つを等幅化 |
| `index.html` | 難易度ボタンの表示文言を「わかば / チョコボ / 光の戦士」→「やさしい / ふつう / むずかしい」に変更 |

### 変更詳細

**CSS変数の明度調整**

`--text-dim` はインフォバーのラベル（SCORE・残り時間）・DIFFICULTYラベル・操作ヒント等の小文字全般に使われていた。元値 `#5a5040` はコントラスト比が低くゲーム画面の暗背景では判読しにくかったため `#9a8868` に引き上げた。`--gold-dim` も同様に `#967840` に明るくし、装飾記号（◆）やRANKラベルの視認性を改善。

**スロットキーラベル（`.slot-key`）**

XHBスロット下部に表示されるキー名の色が `#22253a` とほぼ背景色と同化していたため、`#5c6282`（スロットボーダーと同系統の明るい青灰色）に変更し、フォントサイズも 9px → 10px に拡大。

**難易度ボタン等幅化**

ボタン3つがフレキシブルコンテナ内で自然幅のままだったため横幅が不揃いだった。`flex: 1` で均等化し、`min-width: 100px` で「むずかしい」テキストの改行を防止した。

---

## 放射状AoE中心をランダムオフセット（内側1/4エリア）

**日付**: 2026-05-29

### 概要

放射状（fan）AoEの中心が常に左スティック移動範囲の中央(0,0)に固定されていた。これを移動可能エリアの面積的に中心1/4の領域内（座標 [-0.5, 0.5]×[-0.5, 0.5]）のランダム位置に出現するよう変更した。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/aoe.js` | `_buildAoeData` の `'fan'` ケースに `cx`, `cy` プロパティを追加（一様乱数 [-0.5, 0.5]） |
| `src/aoe.js` | `_checkHit` の `'fan'` ケースをオフセット中心 `(d.cx, d.cy)` 基準に変更 |
| `src/ui.js` | `_buildFanClipPath` に `cx`, `cy` パラメータを追加し、中心点とアーク計算をオフセット対応 |
| `src/ui.js` | fan シェイプ生成で `_buildFanClipPath` にオフセットを渡すよう変更 |
| `src/ui.js` | fan 放射線の `left`/`top` をオフセット中心に変更、`height` を `200%` に拡大 |
| `src/ui.js` | `_isInAoe` の `'fan'` ケースをオフセット中心基準に変更（カーソル色更新） |

### 設計メモ

- 「面積的に中心1/4」: 全体 [-1,1]×[-1,1]（面積4）の1/4 = 面積1 → 内側正方形 [-0.5, 0.5]×[-0.5, 0.5]
- 放射線の `height: 200%` は中心がずれても線がコンテナ外に必ず届くための余裕（最大対角距離 ≈ 106%）

---

## バーストリングが隣ボタンの裏に隠れる問題を修正

**日付**: 2026-05-28

### 概要

左右両方の「→」ボタン押下時に発生するバーストリングが、その右隣の「←」ボタンの背後に入り込む視覚バグを修正した。

### 原因

`.xhb-cross` が `position: relative` だが `z-index` 未指定のため、DOMの後方に現れる兄弟 `.xhb-cross`（例：`#xhb-L-face`）がデフォルトの重ね順で前面に来ていた。バーストリングは `z-index: 30` で `.xhb-cross` 内に絶対配置されているが、それが所属する `.xhb-cross` 自体が隣のコンテナに負けていた。

### 修正内容

| ファイル | 内容 |
|---------|------|
| `styles/main.css` | `.xhb-cross:has(.slot-burst-ring)` に `z-index: 10` を追加 |

CSS `:has()` を活用し、リング保持中の `.xhb-cross` のみ自動的に z-index を上げる。リングが消えると条件が外れ z-index も元に戻るため、JS 変更なしでクリーンに解決。

---

## ギミック成功フィードバック追加（チェックマーク＋成功音）

**日付**: 2026-05-28

### 概要

左スティック（AoE回避）・右スティック（視線ギミック）のドッジ成功時に、各操作領域中央へ大きな緑のチェックマーク（丸フチのみ）を表示し、短い上昇アルペジオを再生するフィードバックを追加した。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/aoe.js` | `onDodge()` 呼び出し時にサイド `'L'` / `'R'` を引数として渡すよう変更 |
| `src/game.js` | `onDodge = null` をコールバック接続に変更、`_onAoeDodge(side)` メソッド追加 |
| `src/sound.js` | `playGimmickSuccess()` 追加（C5→E5→G5 のアルペジオ） |
| `src/ui.js` | `showGimmickSuccess(side)` 追加（SVG チェックマークを動的生成、1.5秒後に自動削除） |
| `styles/main.css` | `.gimmick-success` アニメーション CSS 追加 |

### 仕様詳細

**チェックマーク表示（`showGimmickSuccess(side)`）**

- `#stick-field-L` または `#stick-field-R` の中央に `div.gimmick-success` を動的追加
- SVG で丸（塗りつぶしなし、緑フチのみ）とチェックマークを描画
- `drop-shadow` を二重掛けして発光感を演出（近距離シャープ + 遠距離拡散）
- アニメーション: 即時表示 → 0.9秒間ホールド → フェードアウト（計1.5秒）
- `pointer-events: none` でゲーム操作を妨げない

**成功音（`playGimmickSuccess()`）**

C5（523Hz）→ E5（659Hz）→ G5（784Hz）の短いサイン波アルペジオ（約0.36秒）。

---

## 音ゲー風ボタン成功エフェクト追加

**日付**: 2026-05-27

### 概要

ボタン入力成功時の視覚的な爽快感を向上させるため、音ゲー風のエフェクトを追加した。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `styles/main.css` | `slot-hit-punch` / `slot-burst-ring` アニメーション追加、成功クラスにパンチアニメーション適用、ポーズ停止対応 |
| `src/xhb.js` | `setSlotBurst(slotId, type)` メソッド追加、`clearAllStates()` にバーストリング削除処理追加 |
| `src/game.js` | `_processHit()` 内で `xhb.setSlotBurst()` を呼び出し |

### エフェクト仕様

**スケールパンチ（`slot-hit-punch`）**

成功クラス（`xhb-slot--success` / `xhb-slot--success-good`）付与と同時に発動。0.22秒で 1.0 → 1.14 → 1.0 のスケール変化を行い、タップ感・物理的フィードバックを演出する。

**バーストリング（`slot-burst-ring`）**

スロットと同じ位置・サイズの `div` を `.xhb-cross` 内の兄弟要素として動的生成し、スロットの上に重ねる。0.42秒で scale 1.0 → 2.5 に拡大しながら opacity 1 → 0 にフェードアウト後、`animationend` で自動削除。

| 判定 | リング色 | リング数 |
|------|---------|---------|
| GREAT | ゴールド（`rgba(255,215,0,0.9)`） | 2本（90ms差の二重波紋） |
| GOOD  | シアン（`rgba(74,232,255,0.9)`）   | 1本 |

**実装上の注意点**

リングをスロットの子要素にすると DOM のスタッキングコンテキストにより見た目がボタンの後ろに隠れるため、スロットの親要素（`.xhb-cross`）に追加し `z-index: 30` で確実にボタンの前面に表示する方式を採用した。

---

## BGMリズム・TIMEUPジングル追加

**日付**: 2026-05-27

### 概要

ゲームプレイ中の没入感向上を目的に、BGMリズムループとゲーム終了ジングルを追加した。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/sound.js` | `startRhythm()` / `stopRhythm()` / `playTimeUpJingle()` を追加 |
| `src/game.js` | ゲーム開始・終了・ポーズ・再開・バースト切り替え時にリズム制御を追加 |

### 仕様詳細

#### BGMリズム（`startRhythm(isBurst)`）

8分音符単位の8ステップループ。`setInterval` で駆動する。

| モード | テンポ | ステップ間隔 |
|--------|--------|-------------|
| 通常   | 140 BPM | 214ms |
| LIMIT BREAK | 175 BPM | 171ms |

**通常パターン**: C2+C3キック（1,3拍）+ triangle波アクセント（2,4拍）+ G3/F3/Bb3のウォーキングベース + ハイハット裏打ち

**バーストパターン**: D2+D3キック（1,3拍）+ triangle波アクセント（2,4拍）+ C3/G3/A3ベース + A3フィル

アクセント音には sawtooth（鋸波）でなく triangle（三角波）を採用し、トゲのない丸みのある音色とした。

#### TIMEUPジングル（`playTimeUpJingle()`）

ファンファーレ構成（約1.4秒）：

1. タタタ — G4 × 3（短い連打）
2. 上昇フレーズ — C5 → E5 → G5
3. フィナーレ — C6（高音メロディ）＋ C5/E5/G5/C4 の全コード一斉

既存の `playClear()` に替わり `_endGame()` から呼ばれる。

#### リズム制御タイミング

| タイミング | 処理 |
|-----------|------|
| `start()` | `startRhythm(false)` |
| `stop()` | `stopRhythm()` |
| `pause()` | `stopRhythm()` |
| `resume()` | `startRhythm(this.isBurst)` |
| `_startBurst()` | `startRhythm(true)` |
| `_endBurst()` | `startRhythm(false)` |
| `_endGame()` | `stop()` 内で停止 → `playTimeUpJingle()` |

---

## メモリリーク修正・パフォーマンス改善

**日付**: 2026-05-27

### 概要

プレイやリトライを繰り返すと徐々に動作が重くなる現象の原因を調査し、5ファイルのメモリリーク・孤立タイマーを修正した。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/sound.js` | `_beep()` で生成したオシレータ・ゲインノードを `onended` で `disconnect()` |
| `src/aoe.js` | `start()` 冒頭で `stop()` を呼び、先行タイマーを必ずクリア |
| `src/game.js` | `_burstSoundId` / `_aoeEndId` を追加してトラッキング・`stop()` / `start()` / `pause()` でクリア |
| `src/ui.js` | `_judgmentTimers` 配列を追加・`clearEffects()` メソッドを新設 |
| `src/xhb.js` | `_flashTimers` マップを追加し、同スロットの旧タイマーをキャンセルしてから再登録 |

### 修正内容の詳細

#### `src/sound.js` — AudioNode リーク（CRITICAL）

`_beep()` は呼ばれるたびに `OscillatorNode` と `GainNode` を生成し Audio Graph に接続していたが、`osc.stop()` 後も `disconnect()` しておらず、ノードが永続参照され続けていた。難易度「チョコボ」で60秒プレイすると100個超のノードが蓄積しうる状態だった。

`osc.stop()` の直後に `osc.onended` ハンドラを追加し、再生終了後に両ノードを切断するよう修正した。

#### `src/aoe.js` — ゴーストAoEスポーン（CRITICAL）

`start()` が `_schedId` / `_fireId` / `_clearId` をクリアせず再入していたため、直前ゲームのタイマーが残存した状態で新ゲームの `_active = true` が設定され、旧タイマーのコールバックがそのまま発火してゴーストAoEが出現することがあった。

`start()` の先頭で `this.stop()` を呼ぶ1行を追加した。

#### `src/game.js` — 3つの未追跡 setTimeout（HIGH）

- `_checkGaugeProgress()` の `setTimeout(() => this.sound.playBurstStart(), 350)` が変数に格納されておらず、ゲームオーバー後にも発火していた。`this._burstSoundId` に格納し、`start()` / `stop()` / `pause()` でクリアするよう修正。
- `_onAoeHit()` の残時間ゼロ判定の `setTimeout` も同様に `this._aoeEndId` に格納してクリアするよう修正。
- `pause()` で `_feedbackId` がクリアされておらず、ポーズ中にフィードバック遅延が発火して `_nextSlot()` が呼ばれることがあった。`pause()` の clearTimeout ブロックに追加。
- `stop()` の末尾に `this.ui.clearEffects()` を追加。

#### `src/ui.js` — 判定テキスト残留（MEDIUM）

`showJudgment()` が毎回 `setTimeout(() => el.remove(), 1000)` を発行しタイマーIDを捨てていたため、ゲーム終了時に一括キャンセルできなかった。

`_judgmentTimers` 配列でIDを管理し、新設した `clearEffects()` で全タイマーのキャンセルと `innerHTML` の一括クリアを行うよう変更。

#### `src/xhb.js` — フラッシュタイマー積み重なり（LOW）

`setSlotFlash()` が同スロットへの連打で複数の `classList.remove` タイマーを蓄積していた。`_flashTimers` マップで同スロットの旧タイマーをキャンセル後に再登録するよう修正。

---

## バースト中効果音の強化・クリッピング防止

**日付**: 2026-05-27

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/sound.js` | マスターリミッター（DynamicsCompressorNode）追加・バースト効果音を全面刷新 |
| `src/game.js` | `playHit()` にバーストフラグを渡す・`_endBurst()` で終了音を再生 |
| `CLAUDE.md` | ドキュメントに秘匿情報を含めないルールを追記 |
| `README.md` | ゲーム概要・テーブル整形を更新 |

### 変更詳細

#### マスターリミッター追加（`src/sound.js`）

複数オシレーターの同時再生による合計音量がクリッピングし、「ズザっ」というノイズが発生していた問題を修正。
全音声を `DynamicsCompressorNode` 経由で出力するよう変更（threshold: -3dB, ratio: 20）。

#### バースト効果音刷新（`src/sound.js`）

- **`playHit(combo, judgment, burst)`**: バースト中は低音オクターブ・高音オクターブ・3倍音ハーモニクスを重ねてリッチな音に変更
- **`playBurstStart()`**: ノイズ源だった低音インパクト（55/110/220Hz）・sawtoothコードを削除。sine波7音の上昇アルペジオのみに整理
- **`playBurstEnd()`**: 新規追加。バースト終了時に2093→523Hz の下降ファンファーレを再生

#### `src/game.js`

- `playHit()` 呼び出しに `this.isBurst` を追加
- `_endBurst()` の先頭で `this.sound.playBurstEnd()` を呼び出し

---

## GitHub Pages 公開前チェック・著作権表示追加

**日付**: 2026-05-27

### 変更内容

| ファイル | 内容 |
|---------|------|
| `docs/designs/plan_xhb-recast-input.md` | 「変更ファイル一覧」のWindowsローカルパス（`c:\dev\projects\...`）を相対パスに修正 |
| `README.md` | 末尾に著作権セクションを追記（All Rights Reserved・無断転載/改変/再配布/商業利用禁止） |
| `index.html` | タイトル画面（`#screen-start`）右下に著作権表示要素を追加 |
| `styles/main.css` | `.copyright-notice` スタイルを追加（絶対配置・右下・10px・透過ゴールド・操作不可） |

### セキュリティ／ライセンス確認結果

- **秘匿情報**: `docs/designs/plan_xhb-recast-input.md` のローカルパスのみ修正。その他ファイルはクリーン
- **フォント**: Cinzel・Share Tech Mono（OFL）、Font Awesome Free（CC BY 4.0 / OFL）― 公開リポジトリで問題なし

---

## G.A.T.E JOINED 演出・ポーズ中GCPアニメーション修正・難易度ラベル変更

**日付**: 2026-05-27

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/constants.js` | `fast` 難易度ラベルを「零式」→「光の戦士」に変更 |
| `index.html` | G.A.T.E JOINED オーバーレイdiv追加・難易度ボタンテキスト変更 |
| `src/sound.js` | `playGateJoined()` メソッド追加（440Hz sine・三連符リズム） |
| `src/main.js` | `startGame()` にオーバーレイ演出（`animationend` でGCD開始）を追加・`pauseGame/resumeGame/showMenu` に `is-paused` クラス制御追加 |
| `styles/main.css` | G.A.T.E JOINED オーバーレイのスタイル・アニメーション追加、`body.is-paused` によるXHBアニメーション停止CSS追加 |

### 変更詳細

**G.A.T.E JOINED 演出**  
ゲーム開始時（リトライ含む）に、画面中央に金色の大テキスト「G.A.T.E JOINED」をCinzelフォントで表示。  
オーバーレイ全体（暗い背景含む）が2秒かけてフェードイン→ホールド→フェードアウトし、`animationend` で即座にGCDが開始する。  
効果音は 440Hz sine の三連符リズム（1・2音目を鳴らし3音目は休符）× 3グループ。ボタン入力音と同程度の高さでまろやかな音色。

**ポーズ中 GCP アニメーション停止**  
ポーズ中に `.xhb-slot--active` の `slot-glow-pulse`（box-shadow脈動）と `march-ants`（破線ボーダー行進）のCSSアニメーションが継続していたバグを修正。  
`pauseGame()` で `document.body.classList.add('is-paused')` を追加し、CSS側で `animation-play-state: paused` を適用する方式で対応。`resumeGame()` および `showMenu()` でクラスを除去。

**難易度ラベル変更**  
最高難易度の名称を「零式」から「光の戦士」に変更（constants.js・index.html）。

---

## 得点評価の理論最高得点化・MISS時ゲージ全リセット

**日付**: 2026-05-27

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/constants.js` | `THEORETICAL_MAX_SCORE` 定数追加（各難易度の理論最高得点） |
| `src/game.js` | `_processMiss()` で `gaugeLevel = 0` を追加（MISS時にゲージを完全リセット） |
| `src/ui.js` | `showGameOver()` の maxScore を `THEORETICAL_MAX_SCORE` に変更 |
| `docs/designs/plan_score_rating.md` | 理論最高得点の計算方法を文書化 |

### 変更詳細

**理論最高得点の定数化**  
リザルトのDPS%は従来 `セッション中の総スロット数 × GREAT得点` を上限にしていたが、これはバーストボーナス（2倍）を考慮していなかった。  
全GREAT・全リミット時間ボーナス・全バースト得点ボーナスを取得した理想プレイのスコアを各難易度で事前計算し、固定定数として持つ方式に変更。

| 難易度 | 理論最高得点 |
|---|---|
| わかば（Slow） | 10,500 |
| チョコボ（Normal） | 16,650 |
| 零式（Fast） | 35,200 |

**MISS時のゲージリセット**  
従来はMISSで `gaugeProgress`（現レベルの進捗）のみリセットされていたが、`gaugeLevel`（何本目か）は維持されていた。  
仕様変更：MISSでゲージを完全にゼロに戻す（バースト中は除く）。

---

## スコア数字にカンマ区切りを追加

**日付**: 2026-05-27

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/ui.js` | `_fmtNum()` ヘルパーを追加し、スコア関連4箇所に適用 |

### 適用箇所

| 箇所 | 例 |
|------|----|
| ゲーム中 HUD スコア（`updateAll`） | `12,345` |
| GREAT/GOOD 判定ポップアップ（`showJudgment`） | `+1,200` |
| リザルト画面スコア（`showGameOver`） | `12,345` |
| リザルト画面ベストスコア（`showGameOver`） | `12,345` |

`Number(n).toLocaleString()` を使用。

---

## XHB L/R 長押し時のハーフ状態消失バグ修正

**日付**: 2026-05-27

### 問題

L または R を押しっぱなしにしていると、数秒後（次のスロットが表示されるタイミング）にボタンのハイライトとクラスタ拡大が消えてしまう。

### 原因

`_nextSlot()` → `xhb.clearAllStates()` → `setHalfActive(null)` の順でハーフ状態がリセットされる。  
`InputHandler` は「トリガーの状態が変化したとき」しか `onTriggerChange` を発火しないため、押しっぱなし中はコールバックが呼ばれず復元されなかった。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/input.js` | `this.triggerSide = null` をコンストラクタと `stop()` に追加。ループ内で毎フレーム `this.triggerSide = triggerSide` を更新 |
| `src/game.js` | `_nextSlot()` 内の `clearAllStates()` 直後に `this.xhb.setHalfActive(this.input.triggerSide)` を追加 |

---

## XHB ハーフハイライトのガタつき・重なり修正

**日付**: 2026-05-27

### 問題

L/R を押したとき：
1. XHB 上のテキストが上下に一瞬ガタつく
2. ハイライト（黄色背景グロー）がボタンの上に重なって見える

### 原因

パフォーマンス改善の際に `xhb-neon-pulse` を `opacity` アニメーションに変更し `will-change: opacity` を設定したことで：  
1. 親要素の `opacity` アニメーションが子のテキストレンダリングに波及し、サブピクセル単位のズレが発生
2. `will-change: opacity` が新しい合成レイヤー兼スタッキングコンテキストを生成し、描画順が変わった

### 変更内容

| ファイル | 内容 |
|---------|------|
| `styles/main.css` | `.xhb-half--active` から `will-change: opacity` と静的 `box-shadow` を削除 |
| `styles/main.css` | `@keyframes xhb-neon-pulse` を `opacity` → 元の `box-shadow` パルス（0.08→0.12）に戻した |

---

## パフォーマンス改善：ゲーム中のパーティクル停止・XHBアニメーション軽量化

**日付**: 2026-05-27

### 背景

XHBボタンのアクリルパネル風デザイン強化 + 背景パーティクル追加後に動作が重くなった。  
主なボトルネックはゲーム中も止まらない Canvas パーティクルループ（30fps × 45粒子の `clearRect` + `arc`）。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/background.js` | `paused` フラグを追加。`window.BackgroundParticles = { pause, resume }` をグローバル公開 |
| `src/main.js` | `startGame()` で `BackgroundParticles.pause()`、`onGameOver` と `showMenu()` で `BackgroundParticles.resume()` を呼び出し |
| `styles/main.css` | `xhb-neon-pulse` を `box-shadow` 補間から `opacity`（0.82→1.0）アニメーションに変更し `will-change: opacity` を追加（※後の修正で `box-shadow` に戻す） |

### `BackgroundParticles` API

| メソッド | 動作 |
|---------|------|
| `pause()` | `paused = true` にセットし `clearRect` で残像を消去 |
| `resume()` | `paused = false`、`lastTime = 0` でリセットしてスムーズに再開 |

---

## UIテキスト・操作ガード改善（5件）

**日付**: 2026-05-27

### 変更内容

| ファイル | 変更 |
|---------|------|
| `index.html` | サブタイトルを「覚醒のクロスホットバー」→「指酷のクロスホットバー」に変更 |
| `index.html` | 難易度ボタンのテキストを「わかば / チョコボ / 零式」に変更、GCD表記を「GCD 3.5s」形式に統一 |
| `src/constants.js` | `DIFFICULTIES` の `label` / `sublabel` を同様に更新 |
| `src/ui.js` | 弱点マップの `buildHalf()` から「L」「R」ラベル生成を削除 |
| `styles/main.css` | `.btn--primary` のベース背景を抑制（0.14→0.03）、`.btn--focused` を強化（0.18→0.32、glow強化） |
| `src/main.js` | ゲームオーバー状態でL1/L2/R1/R2押下中は✕ボタン確定を無効化 |
| `README.md` | タイトル・難易度テーブルを新表記に更新 |

### 各変更の詳細

**1. サブタイトル変更**（「しっこく」と読む）

**2. 難易度名**

| キー    | 旧 label | 新 label | 旧 sublabel | 新 sublabel |
|--------|---------|---------|------------|------------|
| slow   | 遅い     | わかば   | 3.5秒       | GCD 3.5s   |
| normal | 普通     | チョコボ  | 2.5秒       | GCD 2.5s   |
| fast   | 速い     | 零式     | 1.5秒       | GCD 1.5s   |

**3. 弱点マップ L/R ラベル削除**

`_buildHeatmapHtml()` の `buildHalf()` 内で `const label = ...` と `${side === 'L' ? label : ''}` / `${side === 'R' ? label : ''}` の挿入を除去。

**4. ボタンフォーカス視認性改善**

`.btn--primary` の常時ゴールド背景（`rgba(200,164,80,0.14)`）を `.btn` と同水準（`rgba(255,255,255,0.03)`）まで下げ、フォーカス時の `.btn--focused` を強調（background 0.18→0.32、box-shadow blur 14→18px、alpha 0.35→0.55）。難易度選択の `.btn--sel` は変更しない。

**5. リザルト画面 L/R ボタンガード**

`appState === 'gameover'` のメニューループで `gp.buttons[4〜7]` （L1/R1/L2/R2）のいずれかが押されている間は `crossFresh` による確定を無効化。ゲーム終了時の☓連打による誤リトライを防止する。

---

## XHBボタン：アクリルパネル風デザイン改修

**日付**: 2026-05-27

### 変更内容

| ファイル | 変更 |
|---------|------|
| `styles/main.css` | `:root` の `--slot-bg` / `--slot-border` / `--slot-text` を明るい値に更新 |
| `styles/main.css` | `.xhb-slot` の `background` をグレードアップ、`box-shadow` を追加 |
| `styles/main.css` | `.xhb-slot::after` を新規追加（アクリル光沢オーバーレイ） |

### デザイン仕様

**Before / After**

| 項目 | 変更前 | 変更後 |
|------|--------|--------|
| `--slot-bg` | `#0e1118`（極暗） | `#1a2035` |
| `--slot-border` | `#252a3a` | `#3a4568` |
| `--slot-text` | `#3a4060` | `#6878a8` |
| `.xhb-slot` background | フラット `#0e1118` | フラット `#1c2040`（明るい） |
| `box-shadow` | なし | `0 2px 4px rgba(0,0,0,0.45)` |
| `::after` | なし | 全面グラデーション（上部グロス＋下部シャドウ） |

**`.xhb-slot::after` グラデーション（アクリルパネル効果）**

```css
background: linear-gradient(
  to bottom,
  rgba(255, 255, 255, 0.22) 0%,   /* 上端：白ハイライト */
  rgba(255, 255, 255, 0.08) 22%,
  rgba(255, 255, 255, 0.00) 45%,  /* 中央：透明 */
  rgba(0, 0, 0, 0.00) 55%,
  rgba(0, 0, 0, 0.18) 100%        /* 下端：暗くして立体感 */
);
```

- `inset: 0`（全体を覆う）/ `pointer-events: none` / `z-index: 1`
- 上部約20%が白くテカリ、下部が暗くなる → アクリルパネルの質感

### パフォーマンス考慮

当初 `background: linear-gradient` を `.xhb-slot` 自体に設定したが、`slot-glow-pulse` アニメーション（毎フレーム `box-shadow` を更新）による再ペイント時にグラデーション計算も毎フレーム走り、カクカクの原因となった。

**対策**: `.xhb-slot` 本体は **フラットカラー** に戻し、3D効果・光沢は `::after` のみで担う。
- フラット→フラットの `background` 遷移は安価（グラデーション補間が不要）
- `box-shadow` も3値 → 1値に簡略化
- 毎フレーム再ペイントのコストが大幅に削減される

---

## UI軽微調整（4件）

**日付**: 2026-05-27

### 変更内容

| ファイル | 変更 |
|---------|------|
| `index.html` | タイトルを `PAD MASTERY` → `MOKUJIN PAD` に変更（`<title>`・ゲームタイトル・ヘッダー） |
| `index.html` | 「メニューに戻る」（ゲームオーバー画面）→「タイトルに戻る」に変更 |
| `index.html` | 「メニューへ戻る」（ポーズ画面）→「タイトルに戻る」に変更 |
| `styles/main.css` | `.limit-segment` 枠色をオレンジ（`#d07030 / #904820`）→ 濁った黄色（`#b09a38 / #7a6820`）に変更 |
| `styles/main.css` | `.judgment-float-container` を `info-col--score` 基準の絶対配置に変更（エフェクト表示位置をスコア数字の中心に揃え） |

### 各修正の詳細

**1. タイトル変更**

ゲームタイトルを `PAD MASTERY` から `MOKUJIN PAD` に変更。

**2. 「タイトルに戻る」ボタン**

ゲームオーバー・ポーズ両画面のボタンテキストを「タイトルに戻る」に統一。

**3. リミットゲージ枠色**

`.limit-segment` の `background` グラデーションをオレンジ系から濁った黄色系に変更：

```css
/* 変更前 */
background: linear-gradient(180deg, #d07030 0%, #904820 100%);

/* 変更後 */
background: linear-gradient(180deg, #b09a38 0%, #7a6820 100%);
```

**4. GREAT/GOODエフェクト位置修正**

`.judgment-float-container` を `position: relative; height: 0` から `position: absolute; left: 0; right: 0; top: 50%; height: 0` に変更。  
`.info-col--score` に `position: relative` を追加して基準点とすることで、  
`left: 50%` のジャッジメントフロートがスコア数字の水平中心に揃う。

---

## 背景ビジュアル刷新：キャンバスパーティクル＋グラデーションアニメーション

**日付**: 2026-05-27

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/background.js` | 新規作成。キャンバスベースの浮遊パーティクルシステム（30fps上限・45粒子） |
| `index.html` | `<div class="bg-particles">` → `<canvas id="bg-canvas">` に置換。`.start-particles` div 2箇所削除。`background.js` をスクリプト先頭に追加 |
| `styles/main.css` | body グラデーション・アニメーション更新、`.screen` 透明化、`#screen-pause` に暗いオーバーレイ＋blur を追加、旧 SVG スター3ブロック削除、`#bg-canvas` CSS 追加 |

### デザイン仕様

**キャンバスパーティクル（`src/background.js`）**

- 45粒子が画面下から上へゆっくり浮かぶ（0.2〜1.0 px/frame、30fps）
- 色: `rgba(180,220,248, 0.08〜0.43)` ─ 水色系・控えめな透明度
- サイズ: 半径 0.5〜2.5px のランダム
- `fillStyle` 文字列はリセット時に一度だけ生成（毎フレームの GC 負荷を回避）
- `will-change: transform` で GPU 合成レイヤーに昇格

**body グラデーション**

```css
background: #000208;
background-image:
  radial-gradient(ellipse 85% 75% at 50% 52%,
    rgba(25, 80, 230, 0.5) 0%, rgba(8, 25, 90, 0.22) 50%, transparent 85%),
  radial-gradient(ellipse at 50% 55%, #050a20 0%, #000208 100%);
background-size: 100% 200%;
animation: bgDrift 15s ease-in-out infinite alternate;
```

`bgDrift` キーフレームで `background-position` を `50% 0%` ↔ `50% 100%` にアニメーション（グラデーションが静止しないことで宇宙感を演出）。

**スクリーンオーバーレイの変更**

| スクリーン | 変更前 | 変更後 |
|-----------|------|------|
| `.screen`（タイトル・リザルト） | `rgba(4,6,12,0.88)` + blur | `transparent`（canvas が透けて見える） |
| `#screen-pause` | `rgba(4,6,12,0.55)` | `rgba(2,4,12,0.68)` + `backdrop-filter: blur(4px)` |

タイトル・リザルト画面では `.screen` を透明にすることで canvas のパーティクルを全画面で表示。ポーズ画面はゲーム画面を薄く透かしながら暗くするため独自の半透明オーバーレイを維持。

### パフォーマンス最適化

| 項目 | 変更前 | 変更後 |
|------|------|------|
| 粒子数 | 80 | 45 |
| フレームレート | 60fps（無制限） | 30fps キャップ |
| `fillStyle` 生成 | 毎フレーム文字列結合 | `reset()` 時に1回だけ生成 |
| GPU 合成 | なし | `will-change: transform` |

---

## スコア体系の改修：難易度逆転・GREAT/GOOD得点差

**日付**: 2026-05-27

### 変更内容

| 項目 | 変更前 | 変更後 |
|------|------|------|
| 基本スコア計算 | `baseTimeMs / 10`（難易度高→低スコア） | `DIFFICULTIES.baseScore`（難易度高→高スコア）|
| slow 基本スコア | 350pt | 150pt |
| normal 基本スコア | 250pt | 250pt（変化なし） |
| fast 基本スコア | 150pt | 350pt |
| GREAT ボーナス | なし（GOOD と同点） | +200pt |
| GOOD ボーナス | なし（GREAT と同点） | 時間減衰：リキャスト100%→+100pt、200%→+0pt（10pt刻み） |
| ランク計算の理想スコア | `baseTimeMs / 10` × total | `(baseScore + 200)` × total（全GREAT想定） |

### スコア一覧（バーストなし）

| 難易度 | GREAT | GOOD最大 | GOOD最小 |
|--------|-------|---------|---------|
| 遅い   | 350pt | 250pt   | 150pt   |
| 普通   | 450pt | 350pt   | 250pt   |
| 速い   | 550pt | 450pt   | 350pt   |

### GOOD 減衰ロジック

```
decayBonus = Math.max(0, Math.floor((2.0 - elapsedRatio) * 10) * 10)
```

- `elapsedRatio` = 入力時点のゲージ経過率（1.0=ゲージ100%、2.0=タイムアウト）
- 1.0→100pt、1.1→90pt、...、1.9→10pt、2.0→0pt

---

## ルール追加：LIMIT BREAKゲージ3本目満タンで +3s ボーナス

**日付**: 2026-05-27

### 変更内容

| 項目 | 変更前 | 変更後 |
|------|------|------|
| `LIMIT_GAUGE_BONUS_MS` | `[1_000, 2_000]` | `[1_000, 2_000, 3_000]` |
| ゲージ3本目完成時 | ボーナスなし（次のGREATでバースト発動） | +3s ボーナス付与・`+3s` フロート表示、その後バースト発動 |
| `showJudgment` bonus判定 | `bonus1` / `bonus2` のみ対応 | `bonus1` / `bonus2` / `bonus3` 対応（`startsWith('bonus')` で汎用化） |

### 動作フロー

1. ゲージ3本目が閾値に達する → `gaugeLevel` が 3 になる
2. `LIMIT_GAUGE_BONUS_MS[2]` = 3000ms が `remainingMs` に加算（上限60s）
3. `+3s` フロートが画面に表示される
4. 次の GREAT 入力で `gaugeLevel === LIMIT_GAUGE_COUNT` を検知 → バースト発動

---

## 演出強化：ジャッジメントスコア表示・バーストゲージ視覚強化・効果音2段階化

**日付**: 2026-05-27

### 変更内容

#### ジャッジメントフロート（バースト中・通常時ともに有効）

| 項目 | 変更前 | 変更後 |
|------|------|------|
| 表示テキスト（GREAT/GOOD） | `◎ GREAT` / `○ GOOD` | `◎ GREAT +250` のようにスコア加算値を末尾に付加 |
| 表示テキスト（MISS） | `✕ MISS` | `✕ MISS -5.0s` のように時間ペナルティを末尾に付加 |
| フォントサイズ | 16px | 32px（約2倍） |
| 文字スタイル | 色付き文字 + 黒アウトライン | 白文字 + カラーグロー発光（text-shadow 3層） |
| 初期 opacity | 1.0 | 0.8 |

#### バーストゲージ明滅

| 項目 | 変更前 | 変更後 |
|------|------|------|
| burst-glow 最大輝度 | brightness(1.55) | brightness(2.5) |

#### 効果音

| タイミング | 変更前 | 変更後 |
|-----------|------|------|
| LIMITゲージ満タン | `playCombo('burst')` のみ | `playGaugeMax()`（高音アルペジオ）に変更 |
| バースト発動 | 同上 | 350ms後に `playBurstStart()`（低域衝撃+上昇スウィープ）を追加 |

### 設計ドキュメント
`docs/designs/plan_burst-effect-enhance.md` を参照。

---

## タイトル画面余白調整

**日付**: 2026-05-27

### 変更内容

| セレクタ | 変更前 | 変更後 | 目的 |
|---------|------|------|------|
| `.screen-box` | `padding: 36px 52px` | `padding: 64px 52px` | カードボックス天地の余白を拡大 |
| `.title-logo-area` | `padding: 64px 0 32px` | `margin-bottom: 48px` | ロゴエリア下の余白をmarginで制御（paddingからの意味的整理） |

---

## フェーズ1：プロジェクト初期化

**日付**: 2026-05-23  
**コミット**: `ef71d16`

### 作成したファイル

| ファイル | 内容 |
|---------|------|
| `.gitignore` | `node_modules/`、`talklog/` を除外 |
| `package.json` | `npm start` → `npx serve .` |
| `README.md` | 操作方法・ゲームルール・キーボードマッピング |

### 決定事項

- バックエンドなし。ブラウザのみで動作。
- ES Modules は使わず `<script>` タグ順次読み込みにする（file://対応のため）。
- Gamepad API はlocalhost/HTTPS必須のため `npm start` でサーブ。

---

## フェーズ2：XHB静的UI表示

**日付**: 2026-05-23  
**コミット**: `f7461de`

### 作成したファイル

| ファイル | 内容 |
|---------|------|
| `index.html` | ゲーム全体の構造（スタート画面・インフォバー・ゲームエリア・XHB・キーガイド） |
| `styles/main.css` | FF14風ダークテーマ。CSS変数、スロットグリッド、アニメーション |
| `src/constants.js` | 全16スロット定義、キーコードマッピング、難易度・HP定数 |
| `src/xhb.js` | `XHBRenderer` クラス：XHB DOM生成・スロット状態切替 |
| `src/main.js` | 初期化エントリーポイント（仮：ハート表示のみ） |
| `src/input.js` | スタブ（フェーズ3で実装） |
| `src/game.js` | スタブ（フェーズ4で実装） |
| `src/ui.js` | スタブ（フェーズ5で実装） |

### デザイン仕様

- **カラーパレット**: 濃紺背景 `#07090e`、ゴールドアクセント `#c8a450`、テキスト `#cfc0a0`
- **XHBレイアウト**: CSS Grid 3×3 でクロス形状。各スロット 44px、gap 4px
- **スロット状態**: `default` / `active`（金色グロー＋点滅）/ `success`（緑）/ `fail`（赤）
- **フォント**: システムフォント（Segoe UI / Yu Gothic UI）

### 動作確認

- `npm start` → `http://localhost:3000` でスタート画面オーバーレイ表示 ✓
- XHBクロスホットバーが画面下部に描画 ✓

---

## フェーズ3：キーボード・ゲームパッド入力

**日付**: 2026-05-23

### 実装内容

| ファイル | 内容 |
|---------|------|
| `src/input.js` | `InputHandler` クラス：キーボード `keydown` + Gamepad API ポーリング |

### 仕様

- **キーボード**: `keydown` イベントで `KEY_TO_SLOT` マップを参照し `onInput(slotId)` を呼ぶ
- **Gamepad**: `requestAnimationFrame` ループでボタン状態を毎フレームポーリング。L2/R2（index 6/7）の値 > 0.5 でトリガー検出。アクションボタン（0-3, 12-15）の立ち上がりエッジでスロット特定
- `start()` / `stop()` で接続・切断を完全制御。接続状態は `onPadStatus(connected, id)` コールバックで通知

---

## フェーズ4：ゲームロジック

**日付**: 2026-05-23

### 実装内容

| ファイル | 内容 |
|---------|------|
| `src/game.js` | `GameEngine` クラス：スロット選択・タイマー・正誤判定・スコア・HP管理 |

### 仕様

- **状態機械**: `idle` → `showing` → `feedback` → `gameover`
- **スロット選択**: 直前と同じスロットを避けてランダム選択
- **タイマー**: `requestAnimationFrame` で滑らかに減少、難易度ごとの制限時間
- **正解**: コンボ++、スコア = `BASE_SCORE_PER_HIT × min(combo, 5)`、木人HP-1
- **不正解/タイムアウト**: コンボリセット、フリーモードはプレイヤーHP-1
- **木人撃破**: HP0になったら即座にリスポーン（ゲームは継続）
- **ゲームオーバー条件**: フリーモード → HP=0 / スコアアタック → 60秒経過
- `_feedbackId` をストアして `start()` 冒頭でキャンセル（リトライ時の二重 `_nextSlot` 防止）

---

## フェーズ5：UI管理

**日付**: 2026-05-23

### 実装内容

| ファイル | 内容 |
|---------|------|
| `src/ui.js` | `UIManager` クラス：全DOM更新・画面遷移・エフェクト |
| `src/main.js` | 初期化・ボタングループ選択・画面遷移のワイヤリング |
| `styles/main.css` | `#enemy-figure.miss`（青フラッシュ）追加 |
| `.gitignore` | `.claude/` を除外追加 |

### 仕様

- **ハート**: `buildHearts(max)` でDOM生成、`updateAll` で `.heart--empty` クラスをトグル
- **タイマーバー**: `setTimerFill(ratio)` で幅をピクセル制御。30%未満で `.low` クラス付与（オレンジ点滅）
- **スコアアタックタイマー**: 残り10秒以下で `.urgent` クラス（赤文字）
- **敵フラッシュ**: ヒット → 赤（300ms）、ミス → 青（500ms）。`offsetWidth` でリフロー強制してアニメーション再起動
- **ゲームオーバー画面**: スコア / 正解数 / 正確率 / 最大コンボを表示
- **モード切替**: `initBtnGroup` で `.btn--sel` クラスをトグル

---

## フェーズ6：仕上げ・ポリッシュ

**日付**: 2026-05-23

### 実装内容

| ファイル | 内容 |
|---------|------|
| `src/sound.js` | `SoundManager` クラス：Web Audio API で効果音生成 |
| `src/game.js` | ハイスコア保存（localStorage）統合、効果音呼び出し |
| `src/ui.js` | NEW RECORD バッジ表示、ベストスコア行、木人アニメーション呼び出し |
| `src/main.js` | `SoundManager` 初期化、ミュートボタン接続 |
| `index.html` | ミュートボタン、NEW RECORD バッジ要素追加 |
| `styles/main.css` | 木人シェイク・バウンス keyframe、ミュートボタン、NEW RECORD アニメーション |

### 仕様

- **効果音（Web Audio API）**: バックエンド不要、JS のみで音生成
  - `playHit(combo)` コンボ数に応じて音程が上昇
  - `playMiss()` 低音サウンド
  - `playCombo(n)` コンボが5の倍数でファンファーレ
  - `playGameOver()` / `playClear()` ゲーム終了音
- **ハイスコア**: `localStorage` キー `pad-mokujin-hs` にモード×難易度の組み合わせで保存
- **NEW RECORD**: 更新時はゲームオーバー画面に金色点滅バッジを表示
- **木人アニメーション**: ヒット → `.enemy-shake`、コンボ5倍達成 → `.enemy-bounce`、ミス → `.enemy-shake`（青）
- **ミュートボタン**: ヘッダーに ♪ ボタン追加。`sound.muted = true` でオフ

---

## フェーズ7：スティック入力・AOE回避ミニゲーム

**日付**: 2026-05-23  
**コミット**: `e6f4dbf`

### 実装内容

| ファイル | 内容 |
|---------|------|
| `src/aoe.js` | `AoeEngine` クラス：AOE警告・判定・回避ロジック |
| `src/input.js` | スティック軸読み取り・`onStickUpdate` コールバック追加 |
| `src/ui.js` | `showAoeWarning` / `showAoeResult` / `clearAoe` / `updateStickCursors` 追加 |
| `src/game.js` | `AoeEngine` 統合、`_onAoeHit` 処理 |
| `index.html` | スティックパネル（L/R）・AOEゾーン要素追加 |
| `styles/main.css` | スティックフィールド・カーソル・AOEゾーン（警告/ヒット/回避）スタイル |

### 仕様

- **AOE発生タイミング**: ゲーム中ランダム（3〜7秒間隔）でL側またはR側に警告
- **警告フェーズ**: 1500ms 間オレンジ点滅。警告エリアからスティックを外せば回避
- **判定フェーズ**: 500ms 後に発火。警告エリア内 → ヒット（HP-1）、外 → 回避
- **スティックカーソル**: スティック位置をリアルタイムでスティックフィールド上に描画
- **デッドゾーン**: 0.15 以下の入力は無視

---

## フェーズ9：スティック移動の操作感改善

**日付**: 2026-05-23

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/input.js` | スティック入力を速度ベース移動に変更 |
| `src/constants.js` | `STICK_SPEED` を 2.2 → 1.5 に調整（約1/3相当） |

### 仕様

- **移動モデル変更（位置ベース → 速度ベース）**: スティックを倒している間だけカーソルが動き、離したら停止。スティックを離しても中央に戻らなくなった。
  - 旧: スティック軸の値を直接カーソル座標にマッピング → リリース時に物理スプリングで値が0付近まで戻るためカーソルも中央に引き戻されていた
  - 新: キーボードと同じ `stickL.x += axis * STICK_SPEED * dt` 式。デッドゾーン内（`|axis| ≤ 0.15`）では更新なし → カーソルがその位置でラッチ
- **移動速度**: `STICK_SPEED = 1.5`（正規化単位/秒）。フィールド端から端まで約1.3秒
- キーボードとゲームパッドで同一のロジック・速度を使用

---

## タイトル画面コントローラーナビゲーション

**日付**: 2026-05-23

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/main.js` | スタート画面の↑↓（セクション移動）・←→（選択変更）ナビゲーション実装 |
| `index.html` | スタート画面下部にコントローラー操作ヒント追加 |
| `README.md` | 画面操作テーブルにタイトル画面の操作方法を追記 |

### 仕様

- **セクション構造**: MODE（0）→ DIFFICULTY（1）→ START（2）の3セクション
- **↑↓**: セクション間を移動。カーソルは `btn--focused` クラスで視覚フィードバック
- **←→**: MODE セクションでフリーモード/スコアアタック切替、DIFFICULTY セクションで難易度切替。選択変更は即時反映（`btn--sel` も同時更新）
- **✕ / OPTIONS**: START セクションにかかわらず即ゲーム開始（コントローラー接続済みかつ START が有効な場合）
- **ポーズ・ゲームオーバー画面**: ←→ を ↑↓ と同等に扱う既存挙動を `navUp` / `navDown` 変数で維持し後退互換性を確保
- **初期フォーカス**: ページ読み込み時・メニュー復帰時ともに MODE セクションの先頭ボタンにフォーカス

---

## XHBデザイン改修：FF14スタイル対応

**日付**: 2026-05-23  
**コミット**: `081aeed`, `cf49127`, `dda3b8c`

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/constants.js` | スロット位置定義を CSS calc 文字列（`posLeft` / `posTop`）に変更 |
| `src/xhb.js` | `XHBRenderer` 全面書き直し：絶対配置・ハーフアクティブ制御 |
| `src/input.js` | `onTriggerChange` コールバックとトリガー状態追跡を追加 |
| `src/game.js` | `onTriggerChange` を start / resume / stop / pause で適切にワイヤリング |
| `index.html` | `xhb-half-L` / `xhb-half-R` に `id` 追加、セパレーター要素を整理 |
| `styles/main.css` | XHBセクション全体をFF14風デザインに刷新 |

### デザイン仕様

**レイアウト**

各クラスター（dpad・face）は `position: relative` コンテナ内の絶対配置で構成。  
ボタン中心座標は数学y-up系で以下の位置関係（1単位 = `slot-sz + slot-gap` = 48px）:

```
(-1, 0) → left   (0, +0.5) → up
(0, -0.5) → down  (1, 0) → right
```

コンテナサイズ: `width = 3×slot-sz + 2×gap = 140px`, `height = 2×slot-sz + gap = 92px`

**CSS変換式**（`--slot-sz: 44px`, `--slot-gap: 4px` 前提）:

| 位置 | left | top |
|------|------|-----|
| up | `calc(slot-sz + gap)` | `0px` |
| down | `calc(slot-sz + gap)` | `calc(slot-sz + gap)` |
| left | `0px` | `calc((slot-sz + gap) / 2)` |
| right | `calc((slot-sz + gap) * 2)` | `calc((slot-sz + gap) / 2)` |

**スタイル変更**

- アンバーのXHB外枠ボーダーを廃止
- ハーフとハーフの間にのみ縦セパレーター（グラデーション縦線）を追加
- トリガー（L1/L2 または R1/R2）を押した側ハーフが黄色く発光（`.xhb-half--active`）
- トリガーラベル（L / R）をインジケーターボックス形式で表示

**トリガーハーフ発光実装**

`InputHandler._startMainLoop` 内でトリガーの押下側（`'L'` / `'R'` / `null`）が変化したタイミングで `onTriggerChange(side)` を発火。`GameEngine` が受け取り `XHBRenderer.setHalfActive(side)` を呼び出して `.xhb-half--active` クラスをトグル。

---

## XHBリキャスト表示のFF14スタイル化

**日付**: 2026-05-24

### 変更内容

| ファイル | 内容 |
|---------|------|
| `styles/main.css` | 水平タイマーバーを削除し円形リキャストオーバーレイを追加。マーチングアンツ点線枠を実装 |
| `src/xhb.js` | `setSlotRecast()` / `setSlotFlash()` メソッドを追加 |
| `src/game.js` | `_runTimer` でリキャスト更新、`_onInput` に先行入力ガードと誤ボタン処理を実装 |
| `index.html` | `#timer-track` / `#timer-fill` を削除し `#timer-label` のみ残す |
| `src/ui.js` | `setTimerFill()` に null ガードを追加 |

### 仕様

**リキャスト円形オーバーレイ**

- スロット内側に 36px 径の円形オーバーレイ（`inset: 4px; border-radius: 50%`）
- `conic-gradient(from 0deg, ...)` を CSS カスタムプロパティ `--recast-pct` で制御
- 12時方向から時計回りに暗いオーバーレイが消えていく（0.0 = 全体暗, 1.0 = 完全クリア）
- sweep 境界に金色エッジ（5.4°幅）を描画して進行を視認しやすくする
- `elapsedRatio >= 1.0` のとき `display: none` で境界アーティファクトを消去
- スロット中央に残り秒数テキストをオーバーレイ表示

**マーチングアンツ点線枠**

- `.xhb-slot--active::before` に `repeating-linear-gradient` × 4本で各辺の破線を描画
- `@keyframes march-ants` で背景ポジションをアニメーションし縞が時計回りに流れる

**入力ルール**

| 状況 | 挙動 |
|------|------|
| 早押し（経過 < 75%） | 白フラッシュのみ、ゲーム継続 |
| 誤ボタン（経過 >= 75%） | 白フラッシュのみ、失敗扱いなし |
| 正解ボタン（経過 >= 75%） | ヒット判定 |
| 時間切れ（経過 = 100%） | 失敗判定、即次スロットへ |

**白フラッシュ（`setSlotFlash`）**

`xhb-slot--flash` クラスを 300ms 間付与。`@keyframes slot-flash` で白グロー → 透明にフェード。  
`.xhb-slot--active` より後に定義することでアクティブスロットの `slot-glow-pulse` をカスケードで上書きする。

---

## フェーズ8：コントローラー必須化・キーボードUI削除

**日付**: 2026-05-23

### 変更内容

| ファイル | 内容 |
|---------|------|
| `index.html` | キーガイドバー（`#key-guide`）削除、STARTボタンの初期 `disabled` 化、「コントローラーを接続してください」メッセージ追加 |
| `src/xhb.js` | XHBスロットのキーラベル（`.slot-key`）表示を削除 |
| `src/ui.js` | `showPrompt` からキーラベル表示を削除、`setStartable(canStart)` メソッド追加 |
| `src/main.js` | `gamepadconnected` / `gamepaddisconnected` リスナーを常時登録してSTARTボタンの有効/無効を制御 |
| `styles/main.css` | `#key-guide` スタイル削除、`.btn--primary:disabled` スタイル追加、`.pad-required-msg` スタイル追加 |

### 背景

キーボードプレイヤーはマウスを使うためXHBをほぼ使わない。コントローラー専用ツールとして整理。

### 仕様

- コントローラー未接続時: STARTボタンが無効化（グレーアウト）、「コントローラーを接続してください」を表示
- コントローラー接続時: STARTボタンが有効化、メッセージ非表示
- ページ読み込み時にすでに接続済みのコントローラーがあれば即時有効化
- キーボード入力コード（`src/input.js`）はデバッグ用として保持

---

## ゲームモード別HP挙動の変更

**日付**: 2026-05-24

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/game.js` | フリーモードのゲームオーバー条件をHP0→回復続行に変更、スコアアタックにHP管理を追加 |
| `README.md` | ゲームモード説明・ルールセクションを新仕様に合わせて更新 |

### 仕様変更

| モード | 旧挙動 | 新挙動 |
|--------|--------|--------|
| フリーモード | HP0 → ゲームオーバー | HP0 → HP全回復して続行 |
| スコアアタック | HPが減らない | HP管理あり。HP0 → ゲームオーバー |

### 実装詳細

`_processMiss()` / `_onAoeHit()` / `resume()` の3メソッドを修正。

- HP減少を両モード共通化（`'default'`限定ガードを削除）
- HP=0判定でモード別に分岐：`'score_attack'` → `_endGame('hp_zero')`、それ以外 → `playerHp = PLAYER_MAX_HP` の上で続行

---

## 左スティックAoEパターン拡張・操作感調整

**日付**: 2026-05-24

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/aoe.js` | AoEタイプを4種→8種に拡張、`_buildAoeData()` 追加、`_checkHit()` をオブジェクト受け取りに変更 |
| `src/ui.js` | `_buildShapeEls()` / `_setAoeChildState()` / `_isInAoe()` 追加、AoEゾーンの動的DOM生成に移行 |
| `src/constants.js` | `AOE_SIZE_SCALE_BASE` / `AOE_SIZE_SCALE_RANGE` / `STICK_SPEED_L` を追加 |
| `src/input.js` | 左スティックの速度を `STICK_SPEED_L`（15%減）に変更 |
| `styles/main.css` | `.aoe-zone--container` 追加、AoE内外の色対比を大幅強化 |
| `tests/aoe-verify.js` | 新タイプのハイフン付きクラス名対応・試行回数を4に拡大 |
| `README.md` | 左パネルAoEの説明を8種パターン対応に更新 |

### 新AoEタイプ

| タイプ | 内容 | サイズパラメータ |
|--------|------|----------------|
| `large-circle` | 大きな円形（直径〜35%）、中心ランダム | r = 0.35 × sizeScale |
| `small-circles` | 小さな円形 2〜4個・同サイズ | r = 0.18 × sizeScale |
| `band-h` | 横帯（全幅）、縦位置ランダム | halfThick = 0.20 × sizeScale |
| `band-v` | 縦帯（全高）、横位置ランダム | halfThick = 0.20 × sizeScale |

既存の `left/right/top/bottom` も sizeScale ±15% のランダム変化を適用。

### アーキテクチャ変更

**AoEゾーン描画を動的DOM生成に移行**

旧方式: `#aoe-zone-L` 単一divにCSSクラスで形状・位置を制御  
新方式: `#aoe-zone-L` を透明コンテナとして使い、タイプに応じた子divを `_buildShapeEls()` で動的生成。インラインスタイルで形状・位置を指定。

これにより `small-circles` のように複数要素が必要なタイプに対応できる。テスト後方互換のため、コンテナ自身にも状態クラスを付与。

**当たり判定の楕円化（真円表示対応）**

フィールドは `aspect-ratio:3/2` のため、円の CSS height を `width × 1.5` で補正して視覚的な真円を実現。対応する当たり判定も楕円式 `(x-cx)² + (y-cy)²×(4/9) < r²` に変更。

### 操作感調整

- **左カーソル速度 -15%**: 左スティック専用の `STICK_SPEED_L = 1.275 × 0.85 ≈ 1.084` を追加。右スティックは変更なし。
- **AoE色対比強化**: `warning-in`（危険）を深い赤（opacity 0.60）に、`warning-out`（安全）を明るい緑（opacity 0.38）に。カーソルのグロー半径も拡大。

---

## ゲームモード統合リファクタリング

**日付**: 2026-05-24

### 概要

フリーモード・スコアアタックの2モードを廃止し、単一ルールに統合。HPゲージを削除してコンボゲージ・カウントダウン・GREAT/GOOD/MISS判定テキストを追加。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/constants.js` | HP/旧スコア定数削除、90s/コンボ/バースト定数追加 |
| `src/game.js` | 全面書き換え：GREAT/GOOD判定・コンボマイルストーン・バーストタイム・カウントダウン |
| `src/ui.js` | HP参照削除、`setCountdown` / `setBurstState` / `setBurstGauge` / `showJudgment` 追加 |
| `src/sound.js` | `playHit(judgment)` でGREAT/GOOD音差別化、`playCombo` をコンボ10/20に対応 |
| `src/main.js` | MODEセクション削除、`engine.start(diff)` に単純化 |
| `index.html` | MODEセクション削除、Info Barをコンボゲージ・スコア・カウントダウンに置き換え |
| `styles/main.css` | HPバースタイル削除、コンボゲージ・カウントダウン・フローティングテキスト・GOODスロット追加 |

### ゲームルール仕様

**タイマー**

- 開始時90秒のカウントダウン。ミスするたびに -5s
- コンボ10でタイムボーナス +2s（一度だけ）
- 残り10秒未満で赤文字点滅（`countdown--urgent`）

**判定（3段階）**

| 判定 | 条件 | 効果 |
|------|------|------|
| ◎ GREAT | リキャスト 75%〜100% で入力 | コンボ++ / スコア加算 |
| ○ GOOD  | リキャスト 100%〜 で入力 | コンボ維持 / スコア加算 |
| ✕ MISS  | タイムアウト | コンボ0リセット / 時間-5s |

**コンボ・バーストタイム**

- コンボ BURST_THRESHOLDS[難易度] に達するとバーストタイム（10秒）発動
  - 遅い: 10、普通: 15、速い: 20
- バースト中: GCD速度 ×1.4、獲得スコア ×2、ミスでもコンボ維持
- バースト終了後: コンボ0リセット、ゲージ通常表示に戻る

**スコア計算**

- 1ヒットあたり `timeMs / 10` ポイント（遅い=350pt、普通=250pt、速い=150pt）
- バースト中は2倍

**LRスティックギミック**

- 回避成功はコンボに寄与しない
- 被弾は MISS 扱い（コンボ0・時間-5s）、バースト中はコンボ維持

### 難易度設定変更

| 難易度 | GCD時間 |
|--------|--------|
| 遅い   | 3500ms（旧 4000ms） |
| 普通   | 2500ms（変更なし） |
| 速い   | 1500ms（変更なし） |

### アーキテクチャ変更

- `this.mode` 廃止。モード分岐のすべてを削除
- `this.playerHp` / `this.enemyHp` 廃止
- `_tickScoreAtkTimer()` → `_tickCountdown()` に置き換え（`_rearmCountdown()` でミス後に再アーム）
- バーストタイム: 独立した RAF ループ（`_resumeBurstRaf`）でコンボゲージをドレイン
- `_getTimeMs()`: バースト中かどうかを考慮したGCD時間を返すヘルパー
- `_onInput` の `elapsedRatio` から `Math.min(1, ...)` を外し GOOD 窓（>1.0）を正しく判定
- ハイスコアキーが `mode__difficulty` → `difficulty` のみに変更（既存データは引き継がれない）

---

## XHBデザイン改修：R/Lハイライト＋クラスタスケーリング

**日付**: 2026-05-24

### 変更内容

| ファイル | 内容 |
|---------|------|
| `styles/main.css` | L/R押下ハイライトの即時点灯・クラスタスケーリング・発光スタイル改修 |

### ハイライト遅延の修正

`xhb-neon-pulse` の `from` キーフレームが静的な `.xhb-half--active` の `box-shadow` より暗く、アニメーション開始直後に `from`（暗い）で上書きされ、約0.2秒後に明るくなる問題があった。

- `from` を「押下直後に見せたい明るさ」と同等の値に変更（明→より明のパルスに）
- `.xhb-half--active` から重複していた静的 `box-shadow` を削除

### クラスタスケーリング

L/R押下時に対応サイドの各クラスタ（4ボタン単位の `.xhb-cross`）を拡縮：

```css
/* アクティブ側: 10%拡大 */
.xhb-half--active .xhb-cross { transform: scale(1.10); }

/* 非アクティブ側: 縮小（片側がアクティブな場合のみ） */
#xhb:has(.xhb-half--active) .xhb-half:not(.xhb-half--active) .xhb-cross {
  transform: scale(0.92);
}
```

**重要設計原則：クラスタ中心点をずらさない**

`transform: scale()` はレイアウトボックスを変えず視覚的にのみ拡縮するため、クラスタ間の `gap` を動的に変更すると中心点が移動してしまう。

これを避けるため、`.xhb-groups` の `gap` を **常時20px** に固定した。  
`scale(1.10)` 時の視覚はみ出しは片側7px（140px × 10% ÷ 2）なので、20px gap で余裕を持って吸収できる。  
`transform-origin` はデフォルト `50% 50%`（コンテナ中心）のため、L/R押下前後でクラスタ中心点は動かない。

### 発光スタイル改修

| 項目 | 変更 |
|------|------|
| 縁取り | `border: 1px solid` を削除 |
| 上下余白 | padding `6px` → `12px` |
| 角丸 | `border-radius: 3px` → `14px` |
| 内側グラデーション | `inset` box-shadow を全廃 |
| 外側グロー | 背景色（`rgba(255,215,50,0.10)`）と同色・同程度以下のopacityで自然にフェード |

---

## Info Bar 全面リデザイン

**日付**: 2026-05-26

### 変更内容

| ファイル | 内容 |
|---------|------|
| `index.html` | Font Awesome CDN追加・info-barをinfo-col/info-divider構造に変更・「SCORE」見出し追加 |
| `src/ui.js` | `setCountdown` の整数部ゼロ埋め（常に5文字固定）・`_countdownRowEl` 追加 |
| `styles/main.css` | info-bar全面リデザイン・Roboto Mono フォント追加 |

### 仕様

**レイアウト**

- info-bar を3カラム構成に変更（`info-col--limit` / `info-col--score` / `info-col--timer`）
- カラム間に縦仕切り線（`info-divider`: 1px、金色 `rgba(200,164,80,0.35)`）
- 各セクションの中身は水平・垂直ともに中央揃え（`align-items: center` / `justify-content: center`）
- LIMIT BREAKセクションは将来の3分割対応のため `flex: 1.8`（他2セクションは `flex: 1`）

**LIMIT BREAKゲージ**

- ラベル名を「COMBO」→「LIMIT BREAK」に変更（金色・発光付き）
- ゲージ幅を160px → 240px に拡大
- ゲージ枠: 金メタリック（`border: 2px solid #c8a040`）+ 内側シャドウ
- ゲージ塗り: 青グラデ（`#1a7ab8 → #3db8e8 → #a0e4ff`）
- バースト時: 金グラデ + パルスアニメーション（変更なし）

**タイマー表示**

- Font Awesome `fa-regular fa-clock`（輪郭・3時方向）アイコンを追加
- 文字色: 白 + 水色グロー（`text-shadow: 0 0 10px rgba(80,200,230,0.85)`）
- 残り10秒未満でアイコン・数値ともにオレンジ点滅（`countdown--urgent` をラッパーに付与）
- 表示フォーマット: `MM.Ds`（整数部を `padStart(2, '0')` でゼロ埋め → 常に5文字固定）
  - 例: `60.0s` → `59.9s` → `09.9s` → `00.1s`
- フォント: Cinzel → **Roboto Mono**（全グリフ等幅）に変更し数字の幅ガタつきをゼロに
- 幅: `width: 5ch`（Roboto Mono では `ch` = 全文字の幅と一致するため完全固定）

---

## フェーズ7: バースト3ゲージ化 & LIMITゲージUIリデザイン

### 変更概要

バーストシステムをFF14のリミットブレイク仕様に近い「3ゲージ蓄積型」に変更。
ゲージUIも平行四辺形3分割デザインに刷新。

### バーストルール（新）

- LIMIT BREAKゲージが3分割。**GREAT** を連続で決めることで段階的に蓄積
- 1ゲージを貯めるのに必要な大成功数: 遅い=3、普通=5、速い=6
- ゲージ1個完成 → 残り時間 **+1秒**
- ゲージ2個完成 → 残り時間 **+2秒**
- ゲージ3個完成済みの状態でさらに **GREAT** → **バーストタイム**（10秒）発動
- ミス時: 現ゲージの進捗（gaugeProgress）のみリセット、完成済みゲージ（gaugeLevel）は維持
- バースト終了後: ゲージ全リセット（gaugeLevel=0、gaugeProgress=0）

### LIMITゲージデザイン（新）

- 3つの平行四辺形セグメントを横並び（gap: 4px）
- 外枠: `clip-path: polygon(7px 0%, 100% 0%, calc(100%-7px) 100%, 0% 100%)` + 地味オレンジグラデ（`#d07030 → #904820`）
- 内枠: `inset: 2px 9px`（水平方向はスキュー量7px＋2px確保）、dark背景、`border-radius: 3px`
  - 水平インセットを9pxにしないと角の枠が0pxになる（内枠の端がclip-pathの斜辺の外に出るため）
- 通常塗り: 青→白グラデ（`#1a5fc0 → #90d8f8 → #ffffff`）
- 最大時（`.full`）: 中央明るい黄色グラデ（`#b08010 → #ffe878 → #b08010`）
- バースト中（`.burst-active`）: 赤グラデ（`#800808 → #e03020`）+ `filter: brightness` アニメ 1.0s
  - アニメを `.limit-segment-fill` でなく `.limit-segment-inner` に置く
    （fill に filter を置くと overflow:hidden をブラウザが回避して1px上下にはみ出すため）
- バースト中の残時間ドレイン: 右セグメントから左に向かって減少
  - 式: `fill[i] = clamp(ratio*3 - i, 0, 1)`

### レイアウト調整

- ラベル「LIMIT BREAK」をゲージの上・左寄せに配置
  - ラベル＋ゲージを `.limit-block` でラップし、`align-items: flex-start`
  - `.info-col--limit` は `align-items: center`（デフォルト）でブロック全体を水平中央に
  - `justify-content: center` + `.limit-block { margin-top: 6px }` で垂直方向やや下寄せ
  - `margin-left: 1em` でラベルを1文字分右にインデント

### 変更ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/constants.js` | `BURST_THRESHOLDS` / `COMBO_BONUS_*` 削除 → `LIMIT_GAUGE_THRESHOLDS` / `LIMIT_GAUGE_COUNT` / `LIMIT_GAUGE_BONUS_MS` 追加 |
| `src/game.js` | `gaugeLevel`/`gaugeProgress` 追加、`_checkComboMilestones` → `_checkGaugeProgress` 置換、miss/endBurst 更新 |
| `src/ui.js` | `_updateLimitGauge` 追加、DOM参照・各メソッド更新、`showJudgment` に `bonus1`/`bonus2` 対応 |
| `index.html` | 単一ゲージ → 3分割ゲージ HTML 差し替え |
| `styles/main.css` | 旧 `.combo-gauge-*` 削除 → 新 `.limit-gauge-container` / `.limit-segment` CSS 追加 |

**SCORE セクション**

- 「SCORE」見出しラベルを追加（従来は数値のみ）
- ラベル高さ（14px固定）を LIMIT BREAK・残り時間と統一し、見出し行を水平に揃える

---

## AoEパターン追加・帯パターン修正

**日付**: 2026-05-25

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/aoe.js` | `band-h` / `band-v` を廃止し `fan` / `band` を追加。`_buildAoeData()` / `_checkHit()` 更新 |
| `src/ui.js` | `_buildFanClipPath()` ヘルパー追加。`_buildShapeEls()` / `_isInAoe()` に `fan` / `band` ケース追加 |
| `styles/main.css` | 扇形用 `filter: drop-shadow()` ルール追加（`clip-path` で消える border/box-shadow の代替） |
| `README.md` | 左パネルAoEパターン一覧を新2種対応に更新 |

### 新AoEパターン

**扇形（`fan`）**

- 中心から放射状に広がる扇形を4本同時表示
- 中心角: 30〜60度（halfAngle 15〜30度）ランダム。4本すべて同じ角度
- 基準方向: 0〜360度ランダム。4本は基準から90度ずつ等間隔
- 描画: `clip-path: polygon()` で扇形を近似（半径150%、5度ごとに1頂点）
- 放射線（中心→外縁の直線辺）は 2px 幅の div を aspect-ratio 補正済みの角度で回転して描画
- 枠線: `filter: drop-shadow()` で clip-path 輪郭に沿ったグロー（通常の `border` は clip-path でクリップされるため使用不可）
- 当たり判定: `atan2(y, x)` で角度を求め、4扇のいずれかの `±halfAngle` 範囲内なら HIT。中心点 (0,0) は常に HIT

**帯（`band`）**

- 2本の帯を同時表示。旧 `band-h` / `band-v` を統合
- バリエーション（各1/3確率）:
  - 横×2: 上下ゾーンに分けて配置（重複ゼロ保証）
  - 縦×2: 左右ゾーンに分けて配置（重複ゼロ保証）
  - 横+縦: 1本ずつ独立配置
- 太さは同一（`halfThick = 0.20 × sizeScale`）
- 重複禁止の実装: 同方向の場合、1本目を `[-available, -halfThick]`、2本目を `[halfThick, available]` の範囲からそれぞれ選択。`|pos2 - pos1| ≥ 2 × halfThick` を保証

### 技術メモ

**扇形の放射線描画とアスペクト比補正**

`stick-field` は `aspect-ratio: 3/2` のため、角度の数学的な値と CSS 上の視覚的な角度が一致しない。  
`_buildFanClipPath` の % 座標での方向ベクトル `(cos θ, sin θ)` は、ピクセル空間では `(cos θ × W, sin θ × H)` になるため、  
CSS 回転角は `atan2(sin θ × H/W, cos θ) = atan2(sin θ × 2/3, cos θ)` で補正する。

---

## 視線ギミック改善：中央除外・枠内強制スポーン

**日付**: 2026-05-26

### 変更内容

| ファイル | 内容 |
|---------|------|
| `src/constants.js` | `GAZE_CENTER_EXCLUDE_R` 定数追加（中央除外半径 ≈ 0.049） |
| `src/aoe.js` | `_spawnGaze()` に中央除外ロジックと枠内強制スポーン（1/3確率）を追加 |
| `README.md` | 視線ギミックのスポーン仕様を更新 |

### 仕様

**中央除外ゾーン**

- `|x| < GAZE_CENTER_EXCLUDE_R && |y| < GAZE_CENTER_EXCLUDE_R` に一致する座標は再試行
- `GAZE_CENTER_EXCLUDE_R = GAZE_FRAME_HALF_W * 0.1 ≈ 0.049`（枠の辺の1/10相当）
- 中央付近はどちらに避けるべきか不明瞭になるため除外

**枠内強制スポーン（1/3確率）**

- `Math.random() < 1/3` のとき座標を `±GAZE_FRAME_HALF_W` 内（スティック中立時の枠内）で生成
- 残り 2/3 は従来通り `±GAZE_EYE_RANGE`（±0.8）のランダム範囲（偶然枠内になることもある）
- do-while ループで中央除外と枠内強制スポーンを組み合わせて適用

---

## 細部表現の調整（4件）

**日付**: 2026-05-26

### 変更内容

| ファイル | 変更 |
|---------|------|
| `src/sound.js` | `playMiss()` の音量を約35%低減（0.14→0.09、0.10→0.07） |
| `src/constants.js` | `GAZE_CENTER_EXCLUDE_R` を `GAZE_FRAME_HALF_W * 0.1` → `* 0.25`（辺の1/4相当）に拡大 |
| `src/ui.js` | fan AoE の放射線 div に専用クラス `aoe-fan-line` を追加 |
| `styles/main.css` | fan AoE のスタイル改善（放射線・塗りつぶし濃度の統一） |
| `index.html` | `#new-record-badge` をスコア表示の上に移動 |
| `tests/verify-fan-aoe.mjs` | Playwright による fan AoE 検証スクリプト |
| `tests/compare-aoe-types.mjs` | AoE タイプ間の外観比較スクリーンショット取得スクリプト |

### 各修正の詳細

**1. ミス音の音量低減**

- `playMiss()` は sawtooth 波形を2音重ねて鳴らすため、他の sine 波音より体感音量が大きかった
- `_beep(160, 'sawtooth', 0.18, 0.14)` → 第4引数 `0.09` に変更
- `_beep(110, 'sawtooth', 0.22, 0.10, 0.10)` → 第4引数 `0.07` に変更

**2. 視線ギミック中央除外ゾーン拡大**

- 「外枠の1/4の辺の長さをもつ長方形」に変更
- `GAZE_CENTER_EXCLUDE_R = GAZE_FRAME_HALF_W * 0.1` → `* 0.25`（≈ 0.122）
- 除外範囲が4倍になり、目が真中に出にくくなった

**3. 放射状 AoE の枠線・塗りつぶし修正**

- fan の放射線 div は `width:2px` だが `.aoe-zone` クラスによる `border:2px solid` が重なり視覚幅が過大だった
- 専用クラス `aoe-fan-line` を追加し、`border/box-shadow/filter` を `!important` で打ち消してbg色のみで表示
- fan セクター形状の `box-shadow`（inset 含む）も `none` に打ち消し、`drop-shadow` blur を 10-14px → 3px に縮小
  - 小さなウェッジ形状で `inset box-shadow` と大きな `drop-shadow` が過剰に広がり塗りが濃く見えていた問題を解消

**4. リザルト画面 NEW RECORD 位置変更**

- `#new-record-badge` を `#gameover-stats`（スコア表示）の下から上に移動（`index.html` の DOM 順変更のみ）

---

## UI細部調整（7件）

**日付**: 2026-05-26

### 変更内容

| ファイル | 変更 |
|---------|------|
| `index.html` | 「MENU」ボタンのテキストを「メニューに戻る」に変更 |
| `src/ui.js` | `showPrompt()` を空にしてボタン名（「L2+○」など）の表示を削除 |
| `src/ui.js` | `showGameOver()` の評価ブロック・スコアブロックを `<div class="result-block">` でラップ |
| `styles/main.css` | `.result-block` を新規追加（金色枠線・青系背景・padding 16px 64px） |
| `styles/main.css` | `.stick-side-label`（「L」「R」ラベル）を非表示化 |
| `styles/main.css` | `#timer-label` を非表示化 |
| `styles/main.css` | `.stick-panel` の `max-width: 290px → 220px`（LRパネルを中央寄り） |
| `styles/main.css` | `#game-area` のパディングを `14px 16px 12px` → `36px 16px`（上下均等・余白拡大） |
| `styles/main.css` | `.limit-segment` の幅を `72px → 96px`（ゲージ合計幅 296px） |
| `styles/main.css` | `.rank-display` の `padding-top: 10px → 20px`（ランク文字を少し下げる） |
| `styles/main.css` | `.gameover-heatmap` に `margin-top: 20px` 追加（弱点マップ上の余白確保） |

### 各修正の詳細

**1. 「メニューに戻る」ボタン**

`index.html:47` の `MENU` テキストを日本語化。

**2. ボタン名（「L2+○」）の表示削除**

`showPrompt()` の本体を空にして `_timerLabel.textContent` への書き込みをなくした。`#timer-label` 要素は DOM に残したまま CSS で `display: none`。

**3. 評価～スコアブロックに枠を追加**

`showGameOver()` の innerHTML で `.result-top`（ランク＋判定数）と `.result-scores`（スコア）を `<div class="result-block">` で包んだ。
- 枠線: `rgba(200, 164, 80, 0.45)`（金色）
- 背景: `rgba(30, 60, 120, 0.18)`（暗い青）
- サイズ: `width: fit-content; margin: 0 auto`（内容幅に合わせて中央配置）

**4. LRスティックエリアのレイアウト調整**

- 「L」「R」のサイドラベル（`.stick-side-label`）を非表示化
- パネル `max-width: 290px → 220px` で中央の木人との距離を縮める
- `#game-area` の上下パディングを `36px` に統一

**5. リミットブレイクゲージ幅拡大**

各セグメント `72px → 96px`。合計幅: 96×3 + 4×2 = **296px**（旧: 224px）。

**6. リザルト画面 ランク表示・弱点マップ位置調整**

- `.rank-display` の `padding-top: 10px → 20px`（ランク文字を下方向にずらす）
- `.gameover-heatmap` に `margin-top: 20px` を追加

---

## タイトル・ロゴ リデザイン

**日付**: 2026-05-26  
**設計ドキュメント**: [`docs/designs/plan_title-logo-redesign.md`](designs/plan_title-logo-redesign.md)

### 変更内容

| ファイル | 内容 |
|---------|------|
| `index.html` | タイトルを `PAD-MOKUJIN` → `PAD MASTERY` に変更（`<title>`・ヘッダー・スタート画面） |
| `index.html` | サブタイトルを `XHB 操作練習ツール` → `覚醒のクロスホットバー` に変更 |
| `index.html` | タイトル上下の `◆ ─────── ◆` オーナメントを削除 |
| `index.html` | `.logo-container` / `.logo-seedling` / `.glow-line` / `.start-particles` を追加 |
| `styles/main.css` | `.game-title` をメタリックグラデーション＋青白発光に刷新 |
| `styles/main.css` | `.glow-line`（発光区切りライン）スタイル追加 |
| `styles/main.css` | `.game-sub` を青みがかった白・発光テキストシャドウに変更 |
| `styles/main.css` | `.logo-seedling`（双葉背景アイコン）スタイル追加 |
| `styles/main.css` | `.start-particles`（星屑パーティクル背景）スタイル追加 |
| `README.md` | タイトルを `PAD MASTERY ─ 覚醒のクロスホットバー` に更新 |

### デザイン仕様

- **メインタイトル**: Cinzel 42px、白→スチールブルー→明るいシルバーのメタリックグラデーション
- **発光ライン**: タイトル〜サブタイトル間に青白く光る 2px ライン
- **双葉アイコン**: Font Awesome `fa-seedling` を 160px・不透明度 0.18 でロゴ背後に配置（`z-index: -1`）
- **星屑パーティクル**: `radial-gradient` 10個で全画面に星を散布

---

## タイトルロゴ・背景リデザイン（星空・縦引き伸ばし）

**日付**: 2026-05-26

### 変更内容

| ファイル | 内容 |
|---------|------|
| `index.html` | `<body>` 直下に `.bg-particles` div を追加（全画面固定の星屑レイヤー） |
| `index.html` | `.start-particles` div を削除（`.bg-particles` に統合） |
| `styles/main.css` | `body` 背景色を `#050a15` + `radial-gradient(ellipse, #0d2244 → #050a15)` に変更 |
| `styles/main.css` | `.start-particles` スタイルを削除し `.bg-particles`（`position: fixed; z-index: -1`）に置換 |
| `styles/main.css` | `.game-title` に `transform: scaleY(3)` + `letter-spacing: 0.16em` + `margin-bottom: 84px` を適用 |
| `styles/main.css` | `.game-sub` に `align-self: flex-end` を追加（右寄せ） |
| `styles/main.css` | `.header-title` の `letter-spacing` を `0.22em` → `0.06em` に変更 |

### デザイン仕様

- **全画面背景**: `body` の青みがかったグラデーション＋固定レイヤー `.bg-particles` で全画面どの画面でも星空が見える
- **タイトル縦引き伸ばし**: `scaleY(3)`（FF14タイトル風）+ `transform-origin: top center` で上から下方向に伸張。`margin-bottom: 84px` で後続要素のレイアウトを補正
- **字間**: `0.16em`（適度に開いた状態）
- **サブタイトル右寄せ**: `align-self: flex-end` のみで対応
- **星屑**: `radial-gradient` 14個、`background-size: 1100px 500px` でリピート

---

## タイトル画面背景修正（星空オーバーレイ問題の解消）

**日付**: 2026-05-26

### 問題

`.screen` オーバーレイ（`background: rgba(4,6,12,0.88)`）が `z-index: 100` で表示されるため、`body` の `.bg-particles`（`z-index: -1`）が完全に隠れていた。

### 変更内容

| ファイル | 内容 |
|---------|------|
| `index.html` | `#screen-start` 内に `.start-particles` div を再追加 |
| `styles/main.css` | `#screen-start` に独立した空背景（`radial-gradient #0d2244 → #050a15`）を設定し `backdrop-filter` を無効化 |
| `styles/main.css` | `.start-particles` スタイルを再追加（`position: absolute` で画面全体に星を散布） |

### 設計

- タイトル画面は「ゲームをぼかして暗くするオーバーレイ」ではなく独立した全画面背景として扱う
- ポーズ・リザルト画面は引き続き `.screen` の暗いオーバーレイを使用

---

## UI統一・タイトル画面レイアウト調整

**日付**: 2026-05-27

### 変更内容

| ファイル | 内容 |
|---------|------|
| `styles/main.css` | `body` の `align-items: flex-start` → `center`（ページ縦中央寄せ） |
| `styles/main.css` | `#screen-start .screen-panel` を新規追加：`width: 760px; max-width: calc(100% - 16px)`（ゲーム画面と幅を統一） |
| `styles/main.css` | `#screen-gameover .screen-panel` の `min-width: 520px; max-width: 680px` → `width: 760px; max-width: calc(100% - 16px)`（同様に統一） |
| `index.html` | `#btn-start` の初期テキストを「コントローラーを接続してください」に変更。`#pad-required-msg` 段落を削除 |
| `src/ui.js` | `setStartable()` でボタンテキストを切り替え（未接続: メッセージ / 接続済: ▶ START）。`btn--pad-required` クラスの付与で色を制御 |
| `styles/main.css` | `.btn--pad-required:disabled` スタイルを追加（ティール色 + `record-pulse` アニメーション） |
| `styles/main.css` | `#btn-start { transition: none }` を追加（切り替え時の色フラッシュ防止） |
| `styles/main.css` | `.game-title` の `margin-bottom: 84px` → `86px`（バーをタイトル文字下端に近づける） |
| `styles/main.css` | `.glow-line` の `margin-top: 8px` → `0`（バーとタイトルの間隔をさらに詰める） |
| `styles/main.css` | `.game-sub` に `margin-right: 22%` を追加（サブタイトル右端をタイトル右端より少し中央寄りに） |
| `styles/main.css` | `.logo-seedling` に `padding-right: 180px` を追加（双葉の位置微調整） |

### デザイン仕様

- **画面幅の統一**: スタート・ゲームオーバー・ゲーム画面がすべて 760px 幅で揃う。ポーズ画面のみ `min-width: 360px` の小ウィンドウを維持
- **縦中央寄せ**: `body` の `align-items: center` によりコンテンツがビューポート縦中央に配置される
- **コントローラー未接続表示**: 独立した段落ではなくボタン自体のテキストをティール色でパルス表示。接続後はゴールドの「▶ START」に即時切替（`transition: none`）
- **タイトルバー位置**: `scaleY(3)` の視覚的下端に合わせて `margin-bottom: 86px` + glow-line `margin-top: 0` で調整済み
- **サブタイトル位置**: `margin-right: 22%` でタイトル文字右端より約 140px 内側に右端が来るよう調整

---

## 星の増量・背景色調の調整（ethereal_space 参照）

**日付**: 2026-05-26

### 変更内容

| ファイル | 内容 |
|---------|------|
| `styles/main.css` | `.bg-particles` / `.start-particles` の星を 30 → 90 個に増量、輝度微増 |
| `styles/main.css` | `body` / `#screen-start` の背景を `#000208` ベース＋中央電気ブルーグローに変更（`ethereal_space.png` 参照） |
| `styles/main.css` | 中央グローの楕円半径を `60% 55%` → `85% 75%` に拡大（将来のウィンドウ拡張に備え） |

### デザイン仕様

- **星数**: 各レイヤー 90 個（`background-size: 1100px 500px` でタイル）
- **背景ベース色**: `#000208`（ほぼ黒）+ `radial-gradient(ellipse at 55%, #050a20 → #000208)`
- **中央グロー**: `radial-gradient(ellipse 85% 75%, rgba(25,80,230,0.60) → transparent 85%)` — 暗闇の中に集中する電気ブルー
- **グロー半径の意図**: ウィンドウ拡大時にパネル周辺まで青みが届くよう広めに設定
- **リザルト画面**: `#screen-gameover` にも同様の星空背景を適用（`.start-particles` div 追加 + CSS セレクタを `#screen-start, #screen-gameover` に拡張）

---

