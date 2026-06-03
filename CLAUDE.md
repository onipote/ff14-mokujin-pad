# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# PAD-MOKUJIN プロジェクト ルール

## コマンド

```bash
# 開発サーバー起動（Gamepad APIに必要）
npm start          # npx serve . → http://localhost:3000

# テスト（Playwrightを使用。先にサーバーを起動しておく必要あり）
npx serve . --listen 3399 &   # テスト用サーバー
npm run test:aoe              # AoEパターン・当たり判定
npm run test:gauge            # リキャストゲージ連鎖

# テストURLを変える場合
TEST_URL=http://localhost:3000 node tests/aoe-verify.js
```

Playwrightは `npm install` で `devDependencies` としてインストール済み。

---

## 基本ルール

- GitHubへの自動pushを禁止 — ユーザーの明示的な指示があるまで `git push` しない
- READMEを必ず最新状態に保つこと
- コミットを作成する際にはドキュメントの更新を含めること（README・dev-log）
- PLANの実行結果・設計ドキュメントは `docs/designs/` ディレクトリに保存すること
- ドキュメントに秘匿すべき情報（ファイルのフルパスなど）を含めないこと
- テスト時のスクリーンショットは必ず `talklog/tests/screenshots/` に保存すること（`tests/screenshots/` は使わない）

---

## ファイル構成

```
ff14-pad-mokujin/
├── index.html              # ゲーム本体のHTMLエントリーポイント
├── package.json            # npm設定（npm start → npx serve .）
├── package-lock.json
├── .gitignore              # node_modules/ / talklog/ / .claude/ を除外
├── README.md               # 操作方法・ゲームルール・キーボードマッピング
├── CLAUDE.md               # 本ファイル：AIへの指示・プロジェクト仕様
│
├── src/                    # JavaScriptソースコード（ESモジュールなし、<script>順次読み込み）
│   ├── constants.js        # 全定数定義（スロット・キーマップ・難易度・コンボ・バースト設定）
│   ├── xhb.js              # XHBRenderer：XHBのDOM生成・スロット状態管理・リキャスト表示
│   ├── input.js            # InputHandler：キーボード＋Gamepad API入力管理
│   ├── aoe.js              # AoeEngine：AoE警告・ヒット判定・8種パターン管理
│   ├── sound.js            # SoundManager：Web Audio APIによる効果音生成
│   ├── game.js             # GameEngine：ゲームロジック全体（GREAT/GOOD/MISS判定・コンボ・バースト・タイマー）
│   ├── ui.js               # UIManager：全DOM更新・画面遷移・エフェクト・弱点マップ
│   └── main.js             # エントリーポイント：初期化・各モジュール間のワイヤリング
│
├── styles/
│   └── main.css            # FF14風ダークテーマ・全スタイル定義
│
├── docs/                   # ドキュメント類（git管理対象）
│   ├── dev-log.md          # 開発ログ（フェーズごとの変更内容・仕様詳細）
│   └── designs/            # 設計ドキュメント・PLANの出力先
│       └── plan_v0_initial.md  # 初期計画書（v0）
│
├── tests/                  # テストスクリプト（Node.jsで単体実行）
│   ├── aoe-verify.js       # AoEパターン・当たり判定の検証
│   └── gauge-chaining-verify.js  # リキャストゲージ連鎖の検証
│
└── talklog/                # 作業ログ・参考画像（.gitignore対象・公開しない）
    ├── sample/             # デザイン参考画像
    ├── v0/                 # 初期バージョンの成果物・PLAN
    └── v1/                 # ワイヤーフレーム・検証スクリーンショット
```

---

## アーキテクチャ概要

- **バックエンドなし** — ブラウザのみで完結
- **ESモジュール不使用** — `<script>` タグ順次読み込み（`constants.js` を必ず最初にロード）
- **Gamepad API** — localhost/HTTPS 必須のため `npm start` でサーブ
- **描画** — requestAnimationFrame ループによるポーリング（メニュー・タイマー・バースト・カウントダウン用に複数のRAFが並行動作）
- **効果音** — Web Audio API（外部ファイル不要）
- **ハイスコア** — localStorage に保存（キー: `pad-mokujin-hs`）

### モジュール依存関係とワイヤリング

`main.js` がすべてのモジュールをコンストラクタインジェクションで接続する：

```
constants.js（全モジュールが参照）
  ↓
XHBRenderer / UIManager / InputHandler / SoundManager
  ↓ (コンストラクタ引数として渡される)
GameEngine(xhb, ui, input, sound)
  └─ AoeEngine(input, ui)  ← GameEngine内部で生成
```

モジュール間の通知は `onXxx` コールバックプロパティで行う（イベントエミッターは使用しない）：
- `engine.onGameOver` — ゲームオーバー時に `main.js` が設定
- `aoe.onHit` / `aoe.onDodge` — `GameEngine` が設定してHP/時間に反映
- `input.onSystemButton` — OPTIONSボタンでポーズ
- `input.onPadStatus` — コントローラー接続状態変化

### アプリケーション状態機械（main.js）

`appState`: `'start'` → `'playing'` ⇄ `'paused'` → `'gameover'` → `'start'`

画面遷移中はメニューRAFループ（`startMenuLoop`/`stopMenuLoop`）がコントローラーナビを管理。ゲームプレイ中はRAFを停止して `GameEngine` に制御を渡す。

### CSS変数とJS連携

`--slot-sz` / `--slot-gap` は `styles/main.css` で定義され、`constants.js` の `_POS` オブジェクトで `calc(var(--slot-sz) + var(--slot-gap))` として参照される。スロット位置変更時は両方を確認する。

### スコア・レーティング

難易度ごとの理論最高点は `constants.js` の `THEORETICAL_MAX_SCORE` に定義。計算方法は `docs/score_simulation.md` 参照。

---

## ゲーム仕様サマリー

### ルール

- 制限時間60秒。ミスするたびに -5秒
- GREAT（75〜100%でボタン押下）でコンボ加算
- GOOD（100%以降の猶予内）でコンボ維持
- MISS（タイムアウト）でコンボリセット＋時間-5s

### 難易度

| 難易度 | GCD時間 | バースト閾値 |
| ------ | ------- | ------------ |
| 遅い   | 3500ms  | コンボ10     |
| 普通   | 2500ms  | コンボ15     |
| 速い   | 1500ms  | コンボ20     |

### スティックギミック

- **左パネル（AoE回避）**: 8種パターン。カーソルを危険エリア外に保つ
- **右パネル（宝探し）**: 宝箱がミニマップのどこか（画面外含む）にスポーン。Rスティックで背景をスクロールして宝箱を中央固定の枠に収める（宝箱：閉じた状態→枠内で開いた状態に変化・成功確定、画面外時は枠端に▲インジケーター表示）

---

## 設計ドキュメントの保存ルール

PLANコマンドや設計検討の結果ファイルは以下の命名規則で `docs/designs/` に保存する：

```
docs/designs/plan_<テーマ>_<バージョンor日付>.md
```

例:

- `docs/designs/plan_v0_initial.md` — 初期計画書
- `docs/designs/plan_result_screen.md` — リザルト画面の設計

同一セッション内で。PLAN後に追加で要望があり修正した場合は、PLAN結果に内容を追記する。
コミット前にドキュメントの更新を行う。
