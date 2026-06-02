# Plan: 上部ステータスバー デザイン修正

## Context
ゲーム中の `#info-bar` （上部ステータスバー）の以下2点を修正する：
1. **残り時間**：時計アイコン追加・白＋水色グロー・小数点1桁表示
2. **コンボゲージ → LIMITゲージ**：ラベル変更＋FF14風デザイン（金メタリック枠・青グラデ）

参考：`talklog/v1/status2.png`（配置）・`talklog/sample/limit_gauge.png`（ゲージデザイン）

---

## 変更ファイル一覧

| ファイル | 変更内容 |
|---|---|
| `index.html` | Font Awesome CDN追加・ラベル変更・タイマー構造変更 |
| `src/ui.js` | `setCountdown`の表示形式変更・`_countdownRowEl`追加 |
| `styles/main.css` | ゲージ・タイマー・ラベルのスタイル全面更新 |

---

## 詳細実装

### 1. index.html

**追加（`<head>`）：**
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.1/css/all.min.css">
```

**変更（LIMITゲージラベル）：**
```html
<!-- Before -->
<div class="label-sm">COMBO</div>

<!-- After -->
<div class="label-sm limit-break-label">LIMIT BREAK</div>
```

**変更（タイマーセクション）：**
```html
<!-- Before -->
<div class="info-section info-section--right">
  <div class="label-sm">残り時間</div>
  <div id="countdown-val" class="countdown-val">60</div>
</div>

<!-- After -->
<div class="info-section info-section--right">
  <div class="label-sm">残り時間</div>
  <div id="countdown-row" class="countdown-row">
    <i class="fa-regular fa-clock countdown-icon"></i>
    <span id="countdown-val" class="countdown-val">60.0s</span>
  </div>
</div>
```

---

### 2. src/ui.js

**constructor に追加：**
```javascript
this._countdownRowEl = document.getElementById('countdown-row');
```

**`setCountdown(ms)` 変更：**
```javascript
setCountdown(ms) {
  this._countdownEl.textContent = (ms / 1000).toFixed(1) + 's';
  this._countdownRowEl.classList.toggle('countdown--urgent', ms < 10_000);
}
```
（`Math.ceil` 削除・`countdown--urgent` の対象を `_countdownRowEl` に変更）

---

### 3. styles/main.css

**LIMIT BREAKラベル追加：**
```css
.limit-break-label {
  font-size: 10px;
  letter-spacing: 0.18em;
  font-weight: 700;
  color: var(--gold-bright);
  text-shadow: 0 0 8px rgba(220, 192, 80, 0.5);
}
```

**ゲージ枠（金メタリック・高さ拡大）：**
```css
.combo-gauge-wrap {
  width: 160px;
  height: 13px;
  background: linear-gradient(180deg, #08100f 0%, #111a19 100%);
  border-radius: 2px;
  overflow: hidden;
  border: 2px solid #c8a040;
  box-shadow: 0 0 0 1px rgba(100, 70, 10, 0.5),
              inset 0 1px 0 rgba(255, 220, 100, 0.2),
              inset 0 -1px 0 rgba(80, 55, 5, 0.4);
  position: relative;
}
```

**ゲージ塗り（青グラデ）：**
```css
.combo-gauge-fill {
  height: 100%;
  background: linear-gradient(90deg, #1a7ab8 0%, #3db8e8 65%, #a0e4ff 100%);
  border-radius: 1px;
  transition: width 0.1s ease;
  box-shadow: 0 0 6px rgba(80, 180, 230, 0.5);
}
```

**バースト状態（既存のまま・微調整）：**
変更なし（gold gradient + pulse animation は現状維持）

**タイマー行レイアウト：**
```css
.countdown-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.countdown-row .countdown-icon,
.countdown-row .countdown-val {
  color: #ffffff;
  text-shadow: 0 0 10px rgba(80, 200, 230, 0.85),
               0 0 22px rgba(80, 200, 230, 0.4);
  transition: color 0.3s, text-shadow 0.3s;
}
.countdown-icon { font-size: 26px; }
.countdown-val {
  font-size: 32px;
  font-weight: 700;
  font-family: 'Cinzel', serif;
  line-height: 1;
}
.countdown-row.countdown--urgent .countdown-icon,
.countdown-row.countdown--urgent .countdown-val {
  color: var(--timer-low);
  text-shadow: 0 0 12px rgba(185, 85, 32, 0.6);
  animation: record-pulse 0.5s ease-in-out infinite alternate;
}
```

既存の `.countdown-val` ブロックと `.countdown-val.countdown--urgent` ブロックは**削除**して上記に置き換える。

---

## 検証方法

1. `npm start` でサーブ → ブラウザで `localhost:3000` を開く
2. ゲーム開始後、以下を確認：
   - 時計アイコン（輪郭・3時方向）が表示されている
   - タイマーが白文字＋水色グローで `60.0s` から小数点付きでカウントダウンされる
   - 残り10秒未満でタイマー（アイコン含む）がオレンジに変わり点滅する
   - ゲージラベルが「LIMIT BREAK」（金色）になっている
   - ゲージ枠が金メタリック、塗りが青グラデになっている
   - バースト時にゲージが金グラデに変わる
