# タイトルロゴ・背景リデザイン計画（星空背景版）

## Context
FF14タイトルロゴ風の縦引き伸ばしタイトル・サブタイトル右寄せ・全画面の青みがかった星空背景への変更。サンプルは `talklog/sample/title_sample.html`。

---

## 変更ファイル

- `index.html` — bg-particles div追加
- `styles/main.css` — body背景・星屑・game-title・game-sub・header-title のスタイル変更

---

## 変更内容詳細

### 1. index.html: グローバル星屑レイヤー追加

`<body>` 直下（`<div id="app">` の前）に追加:
```html
<div class="bg-particles"></div>
```

### 2. main.css: body背景をサンプル準拠の青みがかった星空に変更

現在:
```css
body {
  background: var(--bg);  /* #09090f */
  background-image: radial-gradient(ellipse at 50% 25%, #0e1630 0%, #060810 70%);
```

変更後:
```css
body {
  background: #050a15;
  background-image: radial-gradient(ellipse at 50% 40%, #0d2244 0%, #050a15 100%);
```

### 3. main.css: .bg-particles（全画面固定の星屑）追加

body::before の代わりに div を使い z-index 管理をシンプルに:
```css
.bg-particles {
  position: fixed;
  inset: 0;
  z-index: -1;
  pointer-events: none;
  background-image:
    radial-gradient(1.5px 1.5px at 60px 80px, rgba(255,255,255,0.6), transparent),
    radial-gradient(1px 1px at 200px 140px, rgba(255,255,255,0.45), transparent),
    radial-gradient(2px 2px at 120px 260px, rgba(200,230,255,0.7), transparent),
    radial-gradient(1px 1px at 380px 100px, rgba(255,255,255,0.5), transparent),
    radial-gradient(1.5px 1.5px at 500px 200px, rgba(200,220,255,0.4), transparent),
    radial-gradient(1px 1px at 640px 320px, rgba(255,255,255,0.55), transparent),
    radial-gradient(1px 1px at 760px 60px, rgba(200,240,255,0.5), transparent),
    radial-gradient(2px 2px at 300px 380px, rgba(180,210,255,0.35), transparent),
    radial-gradient(1px 1px at 900px 180px, rgba(255,255,255,0.4), transparent),
    radial-gradient(1.5px 1.5px at 1050px 90px, rgba(220,240,255,0.5), transparent),
    radial-gradient(1px 1px at 150px 350px, rgba(255,255,255,0.3), transparent),
    radial-gradient(2px 2px at 850px 420px, rgba(200,220,255,0.45), transparent),
    radial-gradient(1px 1px at 450px 50px, rgba(255,255,255,0.5), transparent),
    radial-gradient(1.5px 1.5px at 700px 250px, rgba(180,200,255,0.4), transparent);
  background-repeat: repeat;
  background-size: 1100px 500px;
}
```

タイトル画面の `.start-particles` は二重になるが不要なので削除（`.bg-particles` に統合）。

### 4. main.css: .game-title の縦引き伸ばし＋字間詰め

```css
.game-title {
  font-size: 42px;
  font-weight: 700;
  font-family: "Cinzel", serif;
  letter-spacing: 0.06em;   /* 0.28em → 0.06em に詰める */
  margin: 0;
  display: inline-block;
  transform: scaleY(2);
  transform-origin: top center;
  margin-bottom: 48px;      /* scaleYで下に食い込む分をオフセット */
  /* gradient・filter は現状維持 */
}
```

### 5. main.css: .game-sub を右寄せ

`.logo-container` は `align-items: center` のまま維持し、`.game-sub` だけ右に寄せる:
```css
.game-sub {
  align-self: flex-end;
  /* 既存スタイルに追加 */
}
```

### 6. main.css: .header-title の字間を詰める

現在 `letter-spacing: 0.22em` → `0.06em` に統一:
```css
.header-title {
  letter-spacing: 0.06em;
}
```

---

## 変更箇所サマリー

| ファイル | 箇所 | 変更 |
|---------|------|------|
| index.html | `<body>` 直下 | `.bg-particles` div 追加 |
| main.css | `body` | 背景色を `#050a15` + 青みグラデに変更 |
| main.css | `.start-particles` | 削除（`.bg-particles` に統合） |
| main.css | `.bg-particles` | 新規追加（全画面固定星屑） |
| main.css | `.game-title` | `scaleY(2)` + `letter-spacing: 0.06em` + `margin-bottom: 48px` |
| main.css | `.game-sub` | `align-self: flex-end` 追加 |
| main.css | `.header-title` | `letter-spacing: 0.06em` に変更 |

---

## 検証方法

1. `npm start` でサーブ
2. タイトル画面: PAD MASTERYが縦に引き伸ばされ字間が詰まっていること / サブタイトルが右寄せになっていること
3. 全画面（タイトル・ゲーム中・リザルト）で青みがかった星空背景が表示されること
4. ゲーム中のヘッダー左上に「PAD MASTERY」が字間詰めで表示されること
