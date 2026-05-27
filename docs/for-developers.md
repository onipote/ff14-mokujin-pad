# 開発者向けセットアップ

## ローカルで動かす

### 起動方法

```bash
npm start
```

ブラウザで `http://localhost:3000` を開いてください。

### 動作要件

- コントローラー入力（Gamepad API）には **localhost または HTTPS 環境** が必要です
- ESモジュール未使用のため、`file://` で直接 `index.html` を開いても動作しません（`npm start` 必須）

---

## アーキテクチャ概要

- **バックエンドなし** — ブラウザのみで完結
- **ESモジュール不使用** — `<script>` タグ順次読み込み（file://対応外）
- **描画** — `requestAnimationFrame` ループによるポーリング
- **効果音** — Web Audio API（外部ファイル不要）
- **ハイスコア** — `localStorage` に保存（キー: `pad-mokujin-hs`）

## ファイル構成

```
ff14-pad-mokujin/
├── index.html              # ゲーム本体のHTMLエントリーポイント
├── package.json            # npm設定（npm start → npx serve .）
├── src/
│   ├── constants.js        # 全定数定義
│   ├── xhb.js              # XHBRenderer
│   ├── input.js            # InputHandler
│   ├── aoe.js              # AoeEngine
│   ├── sound.js            # SoundManager
│   ├── game.js             # GameEngine
│   ├── ui.js               # UIManager
│   └── main.js             # エントリーポイント
├── styles/
│   └── main.css
├── docs/
│   ├── dev-log.md          # 開発ログ
│   └── designs/            # 設計ドキュメント
└── tests/                  # 単体テスト（Node.jsで実行）
```

詳細な仕様・アーキテクチャは [CLAUDE.md](../CLAUDE.md) および [docs/dev-log.md](dev-log.md) を参照してください。
