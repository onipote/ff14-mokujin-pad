# 設計: Gate Joined 表示タイミングでのカーソルリセット

## 問題

ゲーム開始時に表示される「G.A.T.E JOINED」オーバーレイが表示されている間、  
左右スティックのカーソル位置が前のゲーム終了時の位置のまま残る。

### 現状の処理フロー

```
startGame() 呼び出し
  → overlay.classList.remove('hidden')   ← Gate Joined 表示
  → アニメーション再生（約2秒）
  → animationend イベント
    → engine.start() 呼び出し
      → input.stickL = { x: 0, y: 0 }   ← ここで入力値リセット
      → input.onStickUpdate を登録
        → ui.updateStickCursors() 経由でDOM反映（次の入力まで変化なし）
```

カーソルのDOM位置が更新されるのは `onStickUpdate` が呼ばれたとき（= 実際にスティックを動かしたとき）。  
Gate Joined 表示中はプレイヤーがスティックを動かさない限りカーソルが前の位置に留まる。

## 解決方針

Gate Joined を表示するタイミング（`overlay.classList.remove('hidden')` 直後）で、  
カーソルのDOM位置を中央にリセットする専用メソッド `resetStickCursors()` を追加する。

## 変更ファイル

- `src/ui.js` — `resetStickCursors()` メソッドを追加
- `src/main.js` — `startGame()` 内で呼び出し

## 変更内容

### ui.js: `resetStickCursors()` を追加

`resetHUDForStart()` の直後に追記:

```javascript
resetStickCursors() {
  if (this._stickCur.L) {
    this._stickCur.L.style.left = '50%';
    this._stickCur.L.style.top  = '50%';
    this._stickCur.L.className  = 'stick-cursor';
  }
  if (this._stkFrame) {
    this._stkFrame.style.left = '50%';
    this._stkFrame.style.top  = '50%';
    this._stkFrame.className  = 'stk-frame';
  }
}
```

- `_stickCur.L`: 左スティックのカーソル要素（`#stick-cursor-L`）
- `_stkFrame`: 右スティックのフレーム要素（`#stk-frame-R`）
- クラスを `stick-cursor` / `stk-frame` にリセットすることで色状態（--in/--out）も解除する

### main.js: `startGame()` 内での呼び出し

```javascript
const overlay = document.getElementById('gate-joined-overlay');
overlay.classList.remove('hidden');
ui.resetStickCursors();   // ← 追加
sound.playGateJoined();
```

## 検証方法

1. ゲームを開始してカーソルを端に移動させる
2. ゲーム終了後、スタート画面でスティックを動かさない
3. STARTを押して Gate Joined が表示された瞬間、カーソルが中央に戻っていることを確認
