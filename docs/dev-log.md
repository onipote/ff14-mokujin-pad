# PAD-MOKUJIN 開発ログ

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
