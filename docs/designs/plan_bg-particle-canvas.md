# バックグラウンドパーティクル（Canvasアニメーション）

## Context

ゲームのすべての画面（タイトル・ゲームオーバー・ポーズ）の背景を、`talklog/v1/background1.html` のビジュアルスタイル（深いネイビー〜インディゴのグラデーション＋浮遊パーティクル）に刷新する。現在は SVG スターパターン（静的）＋ほぼ黒の gradient だが、background1.html はキャンバスで浮遊する水色パーティクルとアニメーションするグラデーションを使用している。ポーズ画面のオーバーレイは同スタイルを維持しつつ透明度を上げる（黒すぎる）。

---

# 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `index.html` | bg要素の置換、不要SVG div削除、新スクリプト追加 |
| `styles/main.css` | body背景・アニメーション・スクリーン透明度更新、旧SVGブロック削除 |
| `src/background.js` | **新規作成**: キャンバスパーティクルシステム |

---

# 実装ステップ

## 1. `src/background.js` — 新規作成

background1.html のパーティクルロジックを IIFE でラップして移植。

```js
(function () {
  var canvas = document.getElementById('bg-canvas');
  var ctx = canvas.getContext('2d');
  var width, height;
  var particles = [];
  var COUNT = 80;

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }

  function Particle() { this.reset(true); }
  Particle.prototype.reset = function (initial) {
    this.x = Math.random() * width;
    this.y = initial ? Math.random() * height : height + Math.random() * 50;
    this.r = Math.random() * 2 + 0.5;
    this.op = Math.random() * 0.5 + 0.1;
    this.vy = Math.random() * 0.8 + 0.2;
    this.vx = (Math.random() - 0.5) * 0.3;
  };
  Particle.prototype.update = function () {
    this.y -= this.vy;
    this.x += this.vx;
    if (this.y < -10) this.reset(false);
  };
  Particle.prototype.draw = function () {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180,230,255,' + this.op + ')';
    ctx.fill();
  };

  function init() {
    resize();
    window.addEventListener('resize', resize);
    for (var i = 0; i < COUNT; i++) particles.push(new Particle());
    tick();
  }

  function tick() {
    ctx.clearRect(0, 0, width, height);
    for (var i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }
    requestAnimationFrame(tick);
  }

  init();
})();
```

## 2. `index.html` — 3箇所変更

### 2a. `<div class="bg-particles">` → `<canvas id="bg-canvas">`（12行目）

```html
<!-- 変更前 -->
<div class="bg-particles"></div>

<!-- 変更後 -->
<canvas id="bg-canvas"></canvas>
```

### 2b. `.start-particles` div を2箇所削除

- `#screen-start` 内の `<div class="start-particles"></div>` を削除
- `#screen-gameover` 内の `<div class="start-particles"></div>` を削除

### 2c. 最初のスクリプトタグの前に background.js を追加

```html
<script src="src/background.js"></script>  <!-- 追加（constants.jsより前） -->
<script src="src/constants.js"></script>
```

## 3. `styles/main.css` — 4箇所変更

### 3a. `body` の背景を background1.html スタイルに更新

```css
body {
  background: #000814;
  background-image: radial-gradient(
    ellipse 110% 90% at 50% 60%,
    #001044 0%,
    #002244 38%,
    #001090 80%,
    #000814 100%
  );
  background-size: 100% 200%;
  background-position: 50% 0%;
  animation: bgDrift 15s ease-in-out infinite alternate;
}

@keyframes bgDrift {
  0%   { background-position: 50% 0%; }
  100% { background-position: 50% 100%; }
}
```

### 3b. `.bg-particles` ブロック → `#bg-canvas` に置換

```css
#bg-canvas {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
  pointer-events: none;
}
```

### 3c. `#screen-start, #screen-gameover` オーバーライドブロックを削除

body に動くグラデーション＋canvas パーティクルが入るので不要。削除後は `.screen` のスタイル（blur＋半透明）が適用される。

### 3d. `.start-particles` ブロックを削除

HTML からも div を削除するため CSS も合わせて削除。

### 3e. `.screen` の背景透明度調整 + `#screen-pause` 個別設定

```css
/* 変更前 */
background: rgba(4, 6, 12, 0.88);

/* 変更後（タイトル・ゲームオーバーは少し透明に） */
background: rgba(4, 6, 12, 0.80);
```

`.screen.hidden {}` の直後に以下を追加：

```css
#screen-pause {
  background: rgba(4, 6, 12, 0.55);
}
```

---

# z-index 最終構成

| 要素 | z-index | 備考 |
|---|---|---|
| `#bg-canvas` (canvas) | -1 / fixed | 最背面・全画面パーティクル |
| `body` background | — | グラデーション（body 自体） |
| `#app` コンテンツ | auto | 通常フロー |
| `.screen` オーバーレイ | 100 / fixed | blur＋半透明 |
| `.screen-panel` | 1 (relative) | パネル前面 |

---

# 検証方法

1. `npm start` でローカルサーブ
2. ブラウザで `http://localhost:3000` を開く
3. **タイトル画面**: 背景がネイビー〜インディゴのグラデーションになっており、水色の浮遊パーティクルが動いているか確認
4. **ゲーム中**: 画面端（`#app` 外側）にもパーティクルが見えるか確認
5. **ポーズ画面**: START ボタンを押してゲーム開始後、OPTIONS ボタンでポーズ → 背景がぼんやり透けてゲーム画面が見えるか、以前より透明感があるか確認
6. **ゲームオーバー**: 正常にリザルトが表示されるか確認（オーバーレイが消えていないか）
7. コンソールエラーなし
