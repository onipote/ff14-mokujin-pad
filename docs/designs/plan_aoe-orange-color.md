# Plan: 左スティック AoE 表示のオレンジ統一

## Context

左スティックの AoE ゾーンは現在、カーソル位置・結果に応じて緑（安全/成功）・赤（失敗）を使い分けていた。  
これをオレンジ一色に統一し、`.stk-bright`／`.stk-mid` のカラーパレットと統一感を持たせる。  
「R」カーソルおよび L カーソル自体のスタイルは変更しない。

---

## 変更対象ファイル

`styles/main.css` のみ。JS 側の変更なし。

---

## 現状の色と変更方針

| CSS クラス | 現状 | 変更後 |
|-----------|------|--------|
| `.aoe-zone--warning-out` | 緑背景 + 緑枠線 | オレンジ背景 + オレンジ枠線 + スロー明滅 |
| `.aoe-zone--hit` | 赤背景 + 赤枠線 | オレンジ背景 + オレンジ枠線 + スロー明滅 |
| `.aoe-zone--dodge` | 緑背景 + 緑枠線 | オレンジ背景 + オレンジ枠線 + スロー明滅 |
| `.aoe-zone--fan > .aoe-zone--warning-out` | 緑 drop-shadow | オレンジ drop-shadow |
| `.aoe-zone--fan > .aoe-zone--hit` | 赤 drop-shadow | オレンジ drop-shadow |
| `.aoe-zone--fan > .aoe-zone--dodge` | 緑 drop-shadow | オレンジ drop-shadow |
| `.aoe-fan-line.aoe-zone--warning-out` | 緑背景 | オレンジ背景 |
| `.aoe-fan-line.aoe-zone--hit` | 赤背景 | オレンジ背景 |
| `.aoe-fan-line.aoe-zone--dodge` | 緑背景 | オレンジ背景 |

**変更しない**: `.aoe-zone--warning`、`.aoe-zone--warning-in`（既にオレンジ/赤系）

---

## 使用する色値

```
枠線:   #FFD880  （stk-bright の #FFFAE8 よりオレンジに寄せた明るい金橙）
box-shadow 外:   rgba(255, 180, 60, 0.45)
box-shadow inset: rgba(255, 140, 0, 0.20)
背景（fill）:    rgba(255, 153, 0, 0.18)   ← stk-mid の #FF9900 に対応
fan drop-shadow: rgba(255, 180, 60, 0.9) / rgba(255, 140, 0, 0.5)
fan-line 背景:   rgba(255, 153, 0, 0.80)
```

---

## 新規アニメーション

現行の `aoe-pulse`（0.4〜0.5s）は速い明滅。スロー版を追加する。

```css
@keyframes aoe-pulse-orange {
  from { opacity: 0.50; }
  to   { opacity: 1.00; }
}
```

duration: `1.8s ease-in-out infinite alternate`  
適用先: `warning-out`、`hit`、`dodge`

---

## 具体的な CSS 変更

### `.aoe-zone--warning-out`
```css
.aoe-zone--warning-out {
  background: rgba(255, 153, 0, 0.18);
  border: 2px solid #FFD880;
  box-shadow:
    0 0 12px rgba(255, 180, 60, 0.45),
    inset 0 0 8px rgba(255, 140, 0, 0.20);
  animation: aoe-pulse-orange 1.8s ease-in-out infinite alternate;
}
```

### `.aoe-zone--hit`
```css
.aoe-zone--hit {
  background: rgba(255, 153, 0, 0.20);
  border: 2px solid #FFD880;
  box-shadow:
    0 0 12px rgba(255, 180, 60, 0.45),
    inset 0 0 8px rgba(255, 140, 0, 0.20);
  animation: aoe-pulse-orange 1.8s ease-in-out infinite alternate;
}
```

### `.aoe-zone--dodge`
```css
.aoe-zone--dodge {
  background: rgba(255, 153, 0, 0.18);
  border: 2px solid #FFD880;
  box-shadow:
    0 0 12px rgba(255, 180, 60, 0.45),
    inset 0 0 8px rgba(255, 140, 0, 0.20);
  animation: aoe-pulse-orange 1.8s ease-in-out infinite alternate;
}
```

### ファン drop-shadow（緑・赤 → オレンジ）
```css
.aoe-zone--fan > .aoe-zone--warning-out {
  filter: drop-shadow(0 0 1px rgba(255, 180, 60, 0.9))
          drop-shadow(0 0 3px rgba(255, 140, 0, 0.5));
}
.aoe-zone--fan > .aoe-zone--hit {
  filter: drop-shadow(0 0 1px rgba(255, 180, 60, 0.9))
          drop-shadow(0 0 3px rgba(255, 140, 0, 0.5));
}
.aoe-zone--fan > .aoe-zone--dodge {
  filter: drop-shadow(0 0 1px rgba(255, 180, 60, 0.9))
          drop-shadow(0 0 3px rgba(255, 140, 0, 0.5));
}
```

### ファン放射線
```css
.aoe-fan-line.aoe-zone--warning-out { background: rgba(255, 153, 0, 0.80); }
.aoe-fan-line.aoe-zone--hit         { background: rgba(255, 153, 0, 0.80); }
.aoe-fan-line.aoe-zone--dodge       { background: rgba(255, 153, 0, 0.80); }
```

---

## 検証方法

1. `npm start` でローカルサーバー起動
2. ゲームを開始し、左スティックの AoE ギミックを発生させる
3. カーソルをゾーン外に保つ → `warning-out` 状態でオレンジ + スロー明滅を確認
4. カーソルをゾーン内に入れる → `warning-in` 状態（既存の速い橙）で区別できることを確認
5. ギミック終了後（成功）→ `dodge` 状態でオレンジ明滅を確認
6. ギミック終了後（失敗）→ `hit` 状態でオレンジ明滅を確認
7. ファン型パターンでも同様に確認
