# PAD-MOKUJIN プロジェクト ルール

## 基本ルール

- GitHubへの自動pushを禁止 — ユーザーの明示的な指示があるまで `git push` しない
- READMEを必ず最新状態に保つこと
- コミットを作成する際にはドキュメントの更新を含めること（README・dev-log）
- PLANの実行結果・設計ドキュメントは `docs/designs/` ディレクトリに保存すること

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
- **ESモジュール不使用** — `<script>` タグ順次読み込み（file://対応のため）
- **Gamepad API** — localhost/HTTPS 必須のため `npm start` でサーブ
- **描画** — requestAnimationFrame ループによるポーリング
- **効果音** — Web Audio API（外部ファイル不要）
- **ハイスコア** — localStorage に保存（キー: `pad-mokujin-hs`）

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
- **右パネル（視線ギミック）**: Rスティックでフレームを動かし目を枠外に出す

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
