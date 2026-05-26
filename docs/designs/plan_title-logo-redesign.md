# タイトル・ロゴ リデザイン

**日付**: 2026-05-26  
**実施**: PLANなしで即実施（事後記録）

---

## 目的

スタート画面のタイトルロゴを FF14 タイトル画面のデザイン言語に寄せる。  
参考デザイン: `talklog/sample/title_sample.html`

---

## 変更内容

### タイトル名変更

| 変更前 | 変更後 |
|--------|--------|
| PAD-MOKUJIN | PAD MASTERY |
| XHB 操作練習ツール（サブタイトル） | 覚醒のクロスホットバー |

変更箇所:
- `<title>` タグ
- スタート画面 `<h1>`
- ヘッダー `.header-title`

---

## ロゴデザイン仕様

### メインタイトル（`.game-title`）

Cinzel フォント、42px、letter-spacing 0.28em。  
**メタリックグラデーション**（上→下）:

```
#ffffff → #b0c4e0 → #506080 → #8aa4c8 → #e8f0ff
```

`-webkit-background-clip: text` でグラデーションをテキスト形状にクリップ。  
`filter: drop-shadow` で輪郭の立体感と青白い発光を付与。

### 発光区切りライン（`.glow-line`）

高さ 2px の水平ライン。  
`linear-gradient(90deg, transparent → rgba(120,200,255,0.9) → transparent)` で中央に輝きが集中する形状。  
`box-shadow` で青白い外側グローを追加。

### サブタイトル（`.game-sub`）

カラー `#c8dfff`（青みがかった白）、letter-spacing 0.22em。  
`text-shadow` で発光感を演出。

---

## 双葉アイコン（`.logo-seedling`）

Font Awesome `fa-solid fa-seedling` をロゴコンテナ内に絶対配置。

| プロパティ | 値 |
|-----------|-----|
| font-size | 160px |
| color | rgba(100, 160, 255, 0.18) |
| filter | drop-shadow(0 0 28px rgba(100,160,255,0.5)) |
| z-index | -1（テキストの奥に） |
| transform | translate(-50%, -55%) |

`.logo-container` に `isolation: isolate` を設定し、`z-index: -1` の有効範囲をコンテナ内に限定。

---

## 星屑パーティクル（`.start-particles`）

スタート画面（`.screen`）の背景全体に点状の星を散布。  
`radial-gradient` を10個組み合わせ、`background-size: 1100px 450px` でリピート表示。  
`pointer-events: none` でインタラクション非干渉。

---

## HTMLの構造変化

### 変更前

```html
<div class="ornament">◆ ─────── ◆</div>
<h1 class="game-title">PAD-MOKUJIN</h1>
<p class="game-sub">XHB 操作練習ツール</p>
<div class="ornament">◆ ─────── ◆</div>
```

### 変更後

```html
<div class="start-particles"></div>
<div class="screen-panel">
  <div class="logo-container">
    <i class="fa-solid fa-seedling logo-seedling"></i>
    <h1 class="game-title">PAD MASTERY</h1>
    <div class="glow-line"></div>
    <p class="game-sub">覚醒のクロスホットバー</p>
  </div>
  ...
```

タイトル上下の `◆ ─────── ◆` オーナメントを削除。  
代わりに `.logo-container` の `padding` で余白を確保。

---

## 動作確認

スクリーンショットで以下を確認:

- メタリックグラデーションタイトル表示 ✓
- 発光ラインとサブタイトル表示 ✓
- 双葉アイコンがタイトル背後に半透明で表示 ✓
- 星屑パーティクルが背景に散布 ✓
- 既存の難易度選択・STARTボタン等に影響なし ✓
