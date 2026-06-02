# Plan: G.A.T.E JOINED アナウンス・GCPポーズ修正・難易度ラベル変更

## Context
4つの独立した改修を同時に行う。
1. ゲーム開始演出（G.A.T.E JOINED オーバーレイ＋効果音）
2. ポーズ中にXHBスロットのCSSアニメーションが動き続けるバグの修正
3. 最高難易度ラベルを「零式」→「光の戦士」に変更

---

## 変更内容

### 1. "G.A.T.E JOINED" オーバーレイ

**index.html** — `</div><!-- #app -->` の直前にオーバーレイdivを追加：
```html
<div id="gate-joined-overlay" class="hidden">
  <span class="gate-joined-text">G.A.T.E JOINED</span>
</div>
```

**styles/main.css** — 末尾にスタイルを追加：
- `#gate-joined-overlay`: `position:fixed; inset:0; display:flex; align-items/justify-content:center; z-index:9999; background:rgba(0,0,0,0.55); pointer-events:none`
- `.gate-joined-text`: `font-family:'Cinzel'; font-size:clamp(28px,6vw,80px); font-weight:900; color:var(--gold-bright); text-shadow`でゴールド発光
- `@keyframes gate-joined-appear`: 0%→opacity:0 scale:0.85 / 15%→opacity:1 scale:1.05 / 30%→scale:1.0 / 80%→opacity:1 / 100%→opacity:0

**src/main.js** の `startGame()` を修正：
- 既存の `BackgroundParticles.pause()` と `engine.start()` 呼び出しを **3秒後に遅延**
- オーバーレイ表示と `sound.playGateJoined()` を即時実行
- setTimeout(3000) 後にオーバーレイ非表示・engine.start()・appState='playing' を実行

```javascript
function startGame() {
  stopMenuLoop();
  document.getElementById('screen-start').classList.add('hidden');
  ui.hidePause();
  ui.hideGameOver();

  const overlay = document.getElementById('gate-joined-overlay');
  overlay.classList.remove('hidden');
  sound.playGateJoined();

  setTimeout(() => {
    overlay.classList.add('hidden');
    appState = 'playing';
    BackgroundParticles.pause();
    engine.start(selectedDiff);
  }, 3000);
}
```

---

### 2. "デ・・デ・・デ" 効果音

**src/sound.js** に `playGateJoined()` メソッドを追加：
- 3回の低音パルス（t=0, 0.65, 1.30 秒）
- 各パルス = triangle波 70Hz（胴体音） + sine波 200Hz（倍音）で太鼓的なインパクト

```javascript
playGateJoined() {
  [0, 0.65, 1.30].forEach(d => {
    this._beep(70,  'triangle', 0.28, 0.50, d);
    this._beep(200, 'sine',     0.18, 0.22, d);
  });
}
```

---

### 3. ポーズ中 GCP アニメーション停止

**原因**: `.xhb-slot--active` に掛かる `slot-glow-pulse`（0.65s infinite）と `.xhb-slot--active::before` の `march-ants`（0.5s infinite）はCSSアニメーションのため、JS停止後も動き続ける。

**修正方法**:

**src/main.js**:
- `pauseGame()` に `document.body.classList.add('is-paused')` を追加
- `resumeGame()` に `document.body.classList.remove('is-paused')` を追加
- `showMenu()` にも `document.body.classList.remove('is-paused')` を追加（quitToMenu経由のケースをカバー）

**styles/main.css** — 末尾に追記：
```css
body.is-paused .xhb-slot--active,
body.is-paused .xhb-slot--active::before,
body.is-paused .xhb-half--active {
  animation-play-state: paused;
}
```

---

### 4. 難易度ラベル変更「零式」→「光の戦士」

**src/constants.js** line 41:
```javascript
fast: { timeMs: 1500, label: "光の戦士", sublabel: "GCD 1.5s", baseScore: 350 },
```

**index.html** line 30:
```html
<button class="btn btn--sm" data-value="fast">光の戦士<br><small>GCD 1.5s</small></button>
```

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `index.html` | オーバーレイdiv追加、難易度ボタンテキスト変更 |
| `styles/main.css` | オーバーレイスタイル・アニメーション追加、is-paused CSS追加 |
| `src/sound.js` | `playGateJoined()` 追加 |
| `src/main.js` | startGame()遅延、pauseGame/resumeGame/showMenuにクラス制御追加 |
| `src/constants.js` | `fast` 難易度ラベル変更 |
| `docs/dev-log.md` | 変更内容を追記 |

---

## 確認方法

1. `npm start` でサーバー起動
2. コントローラー接続後「START」押下 → 「G.A.T.E JOINED」が金色で中央表示、低音3打が鳴ることを確認
3. 3秒後にオーバーレイが消えてゲーム開始されることを確認
4. ゲーム中にOPTIONSでポーズ → XHBの光るエフェクト（march-ants / glow-pulse）が停止していることを確認
5. ポーズ解除後、アニメーションが再開することを確認
6. タイトル画面で難易度ボタン「光の戦士」と表示されていることを確認
