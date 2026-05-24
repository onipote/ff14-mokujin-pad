# Plan: XHB R/L ハイライト遅延修正 + クラスタスケーリング

## Context
XHBのR/Lトリガー押下時のビジュアルフィードバックに2つの問題がある。
1. 長押しすると~0.2s後に色が濃くなる（即座に明るくあるべき）
2. 対応サイドのクラスタが拡大、逆サイドが縮小する機能が未実装

## 問題の根本原因

### 問題1：ハイライト遅延
`xhb-neon-pulse` アニメーションの `from` キーフレームが、`.xhb-half--active` の静的 `box-shadow` より大幅に暗い。

- アクティブクラス付与と同時にアニメーションが `from`（暗い）状態で上書き
- 0.8s かけて `to`（明るい）へ遷移するため、~0.2s 付近で急激に明るくなる

**修正**: `from` キーフレームを「すぐに見せたい明るさ」に設定し、`to` をさらに明るい状態にする（明→より明のパルス）。また `.xhb-half--active` の静的 `box-shadow` 定義は不要になるので削除し、アニメーションのみで制御する。

### 問題2：クラスタスケーリング未実装
現在、R/L押下でサイドのハイライトはあるが、ボタンサイズの変化はない。

## 変更ファイル

`styles/main.css` のみ変更。JS変更不要（アクティブクラスはすでに正しく付与されている）。

---

## 実装詳細

### 修正1：`xhb-neon-pulse` の `from` キーフレームを明るく

```css
/* 現在 */
@keyframes xhb-neon-pulse {
  from {
    box-shadow:
      inset 0 0 40px rgba(255, 215, 50, 0.20),  /* 暗い */
      0 0 20px rgba(255, 200, 0, 0.25);
  }
  to { ... }
}

/* 修正後: from を現在の静的box-shadowと同等の明るさに */
@keyframes xhb-neon-pulse {
  from {
    box-shadow:
      inset 0 0 60px rgba(255, 215, 50, 0.25),
      inset 0 0 20px rgba(255, 215, 50, 0.15),
      0 0 30px rgba(255, 200, 0, 0.35),
      0 0 60px rgba(255, 180, 0, 0.15);
  }
  to { /* 現状維持（より明るい状態）*/ }
}
```

### 修正2：`.xhb-half--active` から `box-shadow` を除去（アニメーション重複）

```css
.xhb-half--active {
  background: rgba(255, 215, 50, 0.10);
  border: 1px solid rgba(255, 215, 50, 0.55);
  border-radius: 3px;
  /* box-shadow は削除 — アニメーションが即座にfromから制御 */
  animation: xhb-neon-pulse 0.8s ease-in-out infinite alternate;
}
```

### 修正3：クラスタスケーリングのCSS追加

`.xhb-cross` にトランジションを追加し、`:has()` セレクタで active側/inactive側を制御する。

```css
.xhb-cross {
  /* 既存プロパティに追加 */
  transition: transform 0.12s ease;
  /* transform-origin はデフォルト 50% 50% = クラスタの中心 */
}

/* アクティブ側のクラスタを10%拡大 */
.xhb-half--active .xhb-cross {
  transform: scale(1.10);
}

/* 非アクティブ側のクラスタを縮小（片側がアクティブな場合のみ） */
#xhb:has(.xhb-half--active) .xhb-half:not(.xhb-half--active) .xhb-cross {
  transform: scale(0.92);
}
```

**ポイント**:
- `transform: scale()` はレイアウトに影響しない（スロットの `position: absolute` を維持）
- `transform-origin: 50% 50%`（デフォルト）= `.xhb-cross` コンテナの中心点が固定
- `#xhb:has(...)` により、何も押していない時は両側とも `scale(1.0)` のまま

---

## 変更箇所まとめ

| 場所 | 変更内容 |
|------|---------|
| `styles/main.css` L435-439 | `.xhb-half--active` から `box-shadow` 定義を削除 |
| `styles/main.css` L467-471 | `.xhb-cross` に `transition: transform 0.12s ease` を追加 |
| `styles/main.css` L471後 | クラスタスケーリングのCSSルールを追加 |
| `styles/main.css` L563-566 | `xhb-neon-pulse` の `from` を明るく更新 |

---

## 検証方法

1. ブラウザで index.html を開く
2. パッドのLトリガーを押す → L側が即座に明るくハイライト、0.2s遅延なし、L側クラスタが拡大、R側クラスタが縮小
3. Lを離してRトリガーを押す → 逆方向で同じ挙動
4. 両トリガーを離す → 両側がscale(1.0)に戻る
5. 短押し・長押しで遅延がないことを確認
