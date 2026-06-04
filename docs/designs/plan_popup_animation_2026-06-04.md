# Plan: ジャッジメントポップアップの動きを一定速度・方向で統一

## Context

現状のポップアップアニメーション (`judgment-rise`) は `ease-out` イージングで動いており、速度が変化する。
また MISS（デメリット）もGREAT/GOOD（メリット）と同じく上方向に浮かぶ。

要件：
- すべてのポップアップを **一定速度（linear）** で動かす
- **デメリット（MISS）は下向き** に落ちるように変更

## 変更対象ファイル

- `styles/main.css` のみ（JSは変更なし）

## 変更内容

### 1. `judgment-rise` の easing を `ease-out` → `linear` に変更

```css
animation: judgment-rise 0.9s linear forwards;
```

### 2. `.judgment-float--miss` に `animation-name: judgment-fall` を追加

```css
.judgment-float--miss {
  color: #fff;
  text-shadow: 0 0 8px #ff6060, 0 0 18px #ff6060, 0 0 32px #ff6060;
  animation-name: judgment-fall;
}
```

### 3. `judgment-fall` キーフレームを追加

`judgment-rise` と対称に、Y軸を正方向（下）へ動かす：

```css
@keyframes judgment-fall {
  0% {
    opacity: 0.8;
    transform: translateX(-50%) translateY(0);
  }
  60% {
    opacity: 0.8;
    transform: translateX(-50%) translateY(28px);
  }
  100% {
    opacity: 0;
    transform: translateX(-50%) translateY(48px);
  }
}
```

duration / opacity のフェードタイミングは `judgment-rise` と揃える。

## デメリットの対象

| type | 判定 | 方向 |
|------|------|------|
| great | メリット | ↑ 上（変更なし） |
| good | メリット | ↑ 上（変更なし） |
| bonus1/2/3 | メリット | ↑ 上（変更なし） |
| miss | **デメリット** | ↓ 下（変更） |

## 検証

1. `npm start` でサーバー起動
2. ゲームプレイしてGREAT/GOOD/MISSを出す
3. GREAT/GOOD/bonus が一定速度で上昇すること
4. MISS が一定速度で下方向に落ちることを目視確認
