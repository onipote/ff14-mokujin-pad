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
