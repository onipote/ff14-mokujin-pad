# Context

現在の README.md は開発者向けの情報（起動方法・技術仕様）とゲームルールが混在している。
GitHub Pages で一般ユーザーに公開するにあたり、README をユーザー向けに整理する。
ユーザーが作成した試作品 `talklog/v1/readme.md` をベースとし、開発者向け情報は `docs/` に移す。

---

# 変更ファイル一覧

| ファイル | 操作 | 内容 |
|---------|------|------|
| `README.md` | 上書き | ユーザー向け内容に全面差し替え |
| `docs/for-developers.md` | 新規作成 | ローカル開発環境のセットアップ（npm start・動作要件） |

---

# README.md の変更方針

`talklog/v1/readme.md` をほぼそのまま採用し、以下の点だけ修正する：

1. **誤字修正**: ライセンスセクションの「固慢禁止いたします」→「固く禁止いたします」
2. **開発者向けリンク追記**: 末尾（ライセンス前）に `docs/for-developers.md` への案内を1行追加

---

# docs/for-developers.md の内容

現 README.md から以下を移植：

```
## ローカルで動かす（開発者向け）

### 起動方法
npm start
ブラウザで http://localhost:3000 を開く

### 動作要件
- コントローラー入力は localhost または HTTPS 環境が必要
- ESモジュール不使用のため file:// では動かない（npm start 必須）
```

---

# 検証方法

- README.md をブラウザのMarkdownビューア（GitHub等）で確認し、ゲームルール・操作方法・ギミック説明が読みやすく揃っているか確認
- docs/for-developers.md に npm start の手順が残っていることを確認
- 元の README.md に存在した開発者向け情報（起動方法）が README.md から消えていることを確認
