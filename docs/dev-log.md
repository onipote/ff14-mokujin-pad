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
