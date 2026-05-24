# デザイン修正計画

## Context
ユーザーがFF14風デザインに合わせた複数のUI改修を要求。現在のデザインはシンプルなダークテーマだが、FF14らしいフォント・枠線・発光エフェクトへの強化が目的。

---

## 変更対象ファイル
- `index.html` — フォントimport、HTML構造変更
- `styles/main.css` — 全スタイル変更
- `src/ui.js` — HPバーロジック、スティック強調ロジック
- `src/main.js` — buildHearts → buildPlayerHpBar 呼び出し変更

---

## 実装ステップ

### 1. フォント変更（Cinzel）
**index.html `<head>` に追加：**
```html
<link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&display=swap" rel="stylesheet">
```

**styles/main.css で対象セレクタに `font-family: 'Cinzel', serif` を追加：**
- `.game-title` (line 90)
- `.header-title` (line 178)
- `.gameover-title` (line 104)
- `.pause-title` (line 672)
- `#score-val` (line 239)

---

### 2. 中央「木人」テキスト削除
**index.html line 121 変更：**
```html
<!-- 前 -->
<div id="enemy-figure">木人</div>
<!-- 後（要素は残しアニメーション維持・テキストのみ空に） -->
<div id="enemy-figure"></div>
```

---

### 3. 木人HPバーラベル変更
**index.html line 98 変更：**
```html
<!-- 前 -->
<div class="label-sm">木人 HP</div>
<!-- 後 -->
<div class="label-sm">Lv.100 Striking Dummy</div>
```

---

### 4. プレイヤーHP：ハート → バー
**index.html line 88-91 変更：**
```html
<!-- 前 -->
<div class="info-section">
  <div class="label-sm">HP</div>
  <div id="player-hearts"></div>
</div>
<!-- 後 -->
<div class="info-section">
  <div class="label-sm">HP</div>
  <div class="hp-bar-wrap">
    <div id="player-hp-bar" class="hp-bar hp-bar--player"></div>
  </div>
</div>
```

**styles/main.css：**
- `.heart` / `#player-hearts` スタイルを削除
- `.hp-bar--player { background: var(--hp-player); width: 100%; }` を追加

**src/ui.js：**
- コンストラクタ: `this._heartsEl` / `this._heartEls` を削除、`this._playerHpBar = document.getElementById('player-hp-bar')` を追加
- `buildHearts()` メソッドを削除（no-opにする or 完全削除）
- `updateAll()` 内のハート更新ロジックを削除し、代わりに:
  ```js
  const playerRatio = engine.playerHp / PLAYER_MAX_HP;
  this._playerHpBar.style.width = (playerRatio * 100) + '%';
  ```

**src/main.js line 9 変更：**
```js
// 前
ui.buildHearts(PLAYER_MAX_HP);
// 後（buildHeartsを削除するので呼び出し自体を削除）
// 行ごと削除
```

---

### 5. XHBホールド時ネオン発光強化
**styles/main.css の `.xhb-half--active`（line 427）を強化：**
```css
.xhb-half--active {
  background: rgba(255, 215, 50, 0.10);
  border-radius: 3px;
  border: 1px solid rgba(255, 215, 50, 0.55);
  box-shadow:
    inset 0 0 60px rgba(255, 215, 50, 0.25),
    inset 0 0 20px rgba(255, 215, 50, 0.15),
    0 0 30px rgba(255, 200, 0, 0.35),
    0 0 60px rgba(255, 180, 0, 0.15);
  animation: xhb-neon-pulse 0.8s ease-in-out infinite alternate;
}

@keyframes xhb-neon-pulse {
  from {
    box-shadow:
      inset 0 0 40px rgba(255, 215, 50, 0.20),
      0 0 20px rgba(255, 200, 0, 0.25);
  }
  to {
    box-shadow:
      inset 0 0 80px rgba(255, 215, 50, 0.35),
      inset 0 0 30px rgba(255, 215, 50, 0.20),
      0 0 50px rgba(255, 200, 0, 0.45),
      0 0 100px rgba(255, 180, 0, 0.20);
  }
}
```

---

### 6. FF14風2重ゴールド枠線

**styles/main.css の CSS変数（line 2）変更：**
```css
--panel: #141420;  /* 深い鉄色 */
--bg: #09090f;
--panel-border: rgba(200, 164, 80, 0.55);
```

**2重枠を適用するセレクタ（`border` + `box-shadow: inset 0 0 0 1px`）：**
- `.screen-panel` (line 68)
- `#header` (line 169)
- `#info-bar` (line 195)
- `#game-area` (line 271)
- `#xhb-wrap` (line 408)

各セレクタに以下を適用：
```css
border: 1px solid rgba(200, 164, 80, 0.65);
box-shadow: inset 0 0 0 1px rgba(200, 164, 80, 0.20), [既存の他shadow];
```

---

### 7. スティック移動時の枠強調

AOE警告が発生した側の `stick-field` を強調する。

**styles/main.css に追加：**
```css
.stick-field--active {
  border: 1px solid rgba(255, 85, 0, 0.85) !important;
  box-shadow:
    0 0 16px rgba(255, 69, 0, 0.5),
    inset 0 0 20px rgba(255, 60, 0, 0.12);
}
```

**src/ui.js のコンストラクタに追加：**
```js
this._stickField = {
  L: document.getElementById('stick-field-L'),
  R: document.getElementById('stick-field-R')
};
```

**`showAoeWarning()` メソッドに追加：**
```js
if (this._stickField[side]) this._stickField[side].classList.add('stick-field--active');
```

**`clearAoe()` メソッドに追加：**
```js
if (this._stickField[side]) this._stickField[side].classList.remove('stick-field--active');
```

---

### 8. スティックカーソルアイコン変更（L/R円囲み）

**index.html line 114, 128 変更：**
```html
<!-- 前 -->
<div class="stick-cursor" id="stick-cursor-L">◆</div>
<div class="stick-cursor" id="stick-cursor-R">◆</div>
<!-- 後 -->
<div class="stick-cursor" id="stick-cursor-L"><span class="cursor-icon">L</span></div>
<div class="stick-cursor" id="stick-cursor-R"><span class="cursor-icon">R</span></div>
```

**styles/main.css の `.stick-cursor` と `#stick-cursor-L/R` を変更：**
```css
.stick-cursor {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: none;
  z-index: 2;
  user-select: none;
}

.cursor-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 1.5px solid #a0e8f8;
  color: #c8f4ff;
  font-size: 10px;
  font-weight: 700;
  font-family: 'Cinzel', sans-serif;
  background: rgba(160, 232, 248, 0.10);
  text-shadow: 0 0 8px rgba(160, 230, 248, 1);
  box-shadow: 0 0 10px rgba(160, 230, 248, 0.7), inset 0 0 6px rgba(160, 230, 248, 0.15);
}

/* L/R 個別の filter glow を削除 → cursor-icon に統一 */
#stick-cursor-L { color: inherit; left: 50%; top: 50%; filter: none; }
#stick-cursor-R { color: inherit; left: 50%; top: 50%; filter: none; }
```

---

### 9. AOE色変更

**styles/main.css の `.aoe-zone--warning`（line 358）を変更：**
```css
.aoe-zone--warning {
  background: rgba(255, 110, 0, 0.25);
  border: 2px solid #FF5500;
  box-shadow:
    0 0 12px rgba(255, 69, 0, 0.6),
    inset 0 0 8px rgba(255, 69, 0, 0.25);
  animation: aoe-pulse 0.5s ease-in-out infinite alternate;
}
```

---

## 検証方法
1. ブラウザで `index.html` を開く
2. Cinzelフォントが `PAD-MOKUJIN` タイトル・スコアに適用されているか確認
3. 中央「木人」テキストが非表示か確認
4. 敵HPバーラベルが「Lv.100 Striking Dummy」か確認
5. プレイヤーHPがバー表示か確認、ダメージで減少するか確認
6. L2/R2ホールド時にXHBが明るいネオン発光するか確認
7. 各パネル（ヘッダー・スコア枠・ゲームエリア・XHB）に2重ゴールド枠が見えるか確認
8. AOE警告発生時に対応するスティックパネルの枠が赤橙色に強調されるか確認
9. スティックカーソルがL/R円囲み（水色発光）になっているか確認
10. AOE警告が赤橙色（#FF5500系）で表示されるか確認
