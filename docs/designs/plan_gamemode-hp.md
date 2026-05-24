# ゲームモード別HP挙動の変更

## Context

現在の実装はフリーモード（`'default'`）のみHP管理を行い、HP=0でゲームオーバーになる。
スコアアタック（`'score_attack'`）ではHPが減らない。

ユーザー要件：
- **フリーモード**: HP=0 → 回復して続行（ゲームオーバーにしない）
- **スコアアタック**: HP=0 → ゲームオーバー（HP管理を追加）

## 変更ファイル

`src/game.js` の3ヶ所を修正する。

---

## 変更1: `_processMiss()` のHP減少（行339-341）

HP減少を両モード共通にする（`default`限定ガードを削除）。

```js
// Before
if (this.mode === 'default') {
  this.playerHp = Math.max(0, this.playerHp - 1);
}

// After
this.playerHp = Math.max(0, this.playerHp - 1);
```

## 変更2: `_processMiss()` のHP=0判定（行352-359）

フィードバックタイムアウト内でモード別に分岐。

```js
// Before
this._feedbackId = setTimeout(() => {
  if (this.state === 'gameover') return;
  if (this.mode === 'default' && this.playerHp <= 0) {
    this._endGame('hp_zero');
  } else {
    this._nextSlot();
  }
}, FEEDBACK_FAIL_MS);

// After
this._feedbackId = setTimeout(() => {
  if (this.state === 'gameover') return;
  if (this.playerHp <= 0) {
    if (this.mode === 'score_attack') {
      this._endGame('hp_zero');
    } else {
      this.playerHp = PLAYER_MAX_HP;
      this.ui.updateAll(this);
      this._nextSlot();
    }
  } else {
    this._nextSlot();
  }
}, FEEDBACK_FAIL_MS);
```

## 変更3: `_onAoeHit()` のHP減少（行366-368）

同様にガードを削除して両モード共通化。

```js
// Before
if (this.mode === 'default') {
  this.playerHp = Math.max(0, this.playerHp - 1);
}

// After
this.playerHp = Math.max(0, this.playerHp - 1);
```

## 変更4: `_onAoeHit()` のHP=0判定（行374-378）

```js
// Before
if (this.mode === 'default' && this.playerHp <= 0) {
  setTimeout(() => {
    if (this.state !== 'gameover') this._endGame('hp_zero');
  }, 50);
}

// After
if (this.playerHp <= 0) {
  setTimeout(() => {
    if (this.state === 'gameover') return;
    if (this.mode === 'score_attack') {
      this._endGame('hp_zero');
    } else {
      this.playerHp = PLAYER_MAX_HP;
      this.ui.updateAll(this);
    }
  }, 50);
}
```

## 変更5: `resume()` のHP=0判定（行177-179）

ポーズ再開時も同じモード別分岐に変更。

```js
// Before
if (this.mode === 'default' && this.playerHp <= 0) {
  this._endGame('hp_zero');
} else {

// After
if (this.playerHp <= 0 && this.mode === 'score_attack') {
  this._endGame('hp_zero');
} else {
```

---

## 検証方法

1. `npm start` 等でローカルサーバーを起動してブラウザで確認
2. **フリーモード**: ミスを繰り返してHP=0 → HPが満タンに回復してゲームが続行されることを確認
3. **スコアアタック**: ミスを繰り返してHP=0 → ゲームオーバー画面が表示されることを確認
4. スコアアタックの時間切れ（60秒）は従来通り `TIME UP` で終了することを確認
