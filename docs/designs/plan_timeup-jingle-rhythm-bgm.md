# Plan: TIMEUP ジングル・ゲーム中リズムBGM・LIMIT BREAK盛り上げ

## Context

現在 `SoundManager` は単発の効果音のみ（イベント駆動）。BGMループや繰り返しリズムの仕組みは存在しない。
要望：
1. ゲーム終了時（TIMEUP）に**ジングル**を流す
2. ゲーム中に**低音リズム**をループ再生（うるさくない程度）
3. LIMIT BREAK（バースト）中のみ**テンポ・音階を上げる**

## 変更ファイル

- `src/sound.js` — リズムBGMエンジン + TIMEUPジングル追加
- `src/game.js` — リズム開始・停止・切り替えの呼び出し追加

---

## 実装詳細

### 1. `src/sound.js` への追加

#### 状態変数（constructorに追加）
```js
this._rhythmId     = null;  // setInterval ID
this._rhythmBeat   = 0;     // 現在の拍カウンタ
this._rhythmBurst  = false; // burst中かどうか
```

#### リズムパターン設計（4拍ループ）

| 拍 | 通常モード | バーストモード |
|----|-----------|--------------|
| 0  | キック 68Hz, vol 0.065 | キック 90Hz, vol 0.090 |
| 0  | オクターブ倍音 136Hz, vol 0.030 | 倍音 180Hz, vol 0.045 |
| 1  | ハイハット 6400Hz, vol 0.022 | ハイハット 7200Hz, vol 0.030 |
| 2  | キック 68Hz, vol 0.048 | キック 90Hz, vol 0.065 |
| 3  | ハイハット 6400Hz, vol 0.022 | ハイハット 7200Hz, vol 0.030 |

BPM: 通常 112 → 拍間隔 536ms / バースト 140 → 拍間隔 429ms

ハイハットの波形: `'square'`（金属感）、キックは `'sine'`

#### 追加メソッド

```js
startRhythm(isBurst) {
    this.stopRhythm();
    const beatMs = Math.round(60000 / (isBurst ? 140 : 112));
    this._rhythmBeat  = 0;
    this._rhythmBurst = isBurst;
    const fire = () => {
        const b = this._rhythmBeat % 4;
        if (b === 0 || b === 2) {
            const f = isBurst ? 90 : 68;
            const v = b === 0 ? (isBurst ? 0.090 : 0.065) : (isBurst ? 0.065 : 0.048);
            this._beep(f, 'sine', 0.16, v);
            this._beep(f * 2, 'sine', 0.08, v * 0.50);
        } else {
            this._beep(isBurst ? 7200 : 6400, 'square', 0.022, isBurst ? 0.030 : 0.022);
        }
        this._rhythmBeat++;
    };
    fire();
    this._rhythmId = setInterval(fire, beatMs);
}

stopRhythm() {
    if (this._rhythmId !== null) {
        clearInterval(this._rhythmId);
        this._rhythmId = null;
    }
}
```

#### TIMEUPジングル（既存の playClear を置き換え）

構成：上昇フレーズ（4音）→ メジャーコード鳴らし → 高音フィナーレ

```
0.00s: G4(392) → 0.09s: A4(440) → 0.18s: B4(494) → 0.27s: D5(587)  ← 上昇4音
0.36s: C5(523) + E5(659) + G5(784) 同時（コード）
0.75s: C6(1047) 高音 + C5+E5+G5 コード保持
合計 ~1.3秒
```

```js
playTimeUpJingle() {
    if (this.muted) return;
    [392, 440, 494, 587].forEach((f, i) =>
        this._beep(f, 'sine', 0.10, 0.17, i * 0.09));
    [[523, 0.38], [659, 0.35], [784, 0.32]].forEach(([f, d]) =>
        this._beep(f, 'sine', d, 0.18, 0.36));
    this._beep(1047, 'sine', 0.55, 0.22, 0.75);
    [[523, 0.55], [659, 0.50], [784, 0.45]].forEach(([f, d]) =>
        this._beep(f, 'sine', d, 0.13, 0.75));
}
```

---

### 2. `src/game.js` への変更

| 箇所 | 変更内容 |
|------|---------|
| `start()` 末尾 | `this.sound.startRhythm(false)` を追加 |
| `stop()` 末尾 | `this.sound.stopRhythm()` を追加 |
| `pause()` 内（stateを'paused'にした後） | `this.sound.stopRhythm()` を追加 |
| `resume()` 内（input.start()の後あたり） | `this.sound.startRhythm(this.isBurst)` を追加 |
| `_startBurst()` 内 | `this.sound.startRhythm(true)` を追加 |
| `_endBurst()` 内 | `this.sound.startRhythm(false)` を追加 |
| `_endGame()` 内 | `this.sound.playClear()` → `this.sound.playTimeUpJingle()` に変更 |

---

## 注意点

- `_beep` はすでに `this.muted` チェック済みのため、`startRhythm` 内では別チェック不要
- `setInterval` の精度はBGM用途では十分（± 数ms のドリフトは問題なし）
- `stopRhythm` は `startRhythm` の冒頭でも呼ぶため、二重起動しない

---

## 検証方法

1. `npm start` でサーブ、ブラウザで `http://localhost:3000` を開く
2. ゲーム開始 → 低音リズムが流れること（音量が控えめであること）を確認
3. コンボを積んでLIMIT BREAKゲージを満タンにする → LB発動でテンポ・音階が上がること確認
4. LB終了後 → 通常リズムに戻ること確認
5. ポーズ → リズム停止、再開 → リズム再開 を確認
6. 時間切れ → リズム停止 → ジングルが流れること確認
7. ミュートボタン → リズムが鳴らないこと確認（ミュート解除後も問題なし）
