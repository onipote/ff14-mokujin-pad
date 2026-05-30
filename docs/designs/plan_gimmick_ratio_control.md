# 設計: ギミック出現比率制御

## 問題

`AoeEngine._spawn()` では左（L: AoE回避）・右（R: 頭割りギミック）の出現が `Math.random() < 0.5` による  
完全ランダムで決定される。そのため、同じ側のギミックが長時間連続出現することがあり単調になる。

## 解決方針

「連続出現回数（ストリーク）」を追跡し、超えたら強制的に反対側を選ぶルールを追加する。

| 条件 | 挙動 |
|------|------|
| L が3連続 | 次は強制的に R |
| R が2連続 | 次は強制的に L |
| それ以外 | 50/50 ランダム |

L より R のストリーク上限を低く設定する（R は操作が難しく連続は避けたい）。

## 変更ファイル

- `src/aoe.js`

## 変更内容

### コンストラクタ: ストリーク変数を追加

```javascript
this._leftStreak  = 0;
this._rightStreak = 0;
```

### `stop()`: リセット処理を追加

```javascript
this._leftStreak  = 0;
this._rightStreak = 0;
```

### `_spawn()`: side 選択ロジックを置き換え

```javascript
// 変更前
this._side = Math.random() < 0.5 ? 'L' : 'R';

// 変更後
let side;
if (this._leftStreak >= 3)       side = 'R';
else if (this._rightStreak >= 2) side = 'L';
else                              side = Math.random() < 0.5 ? 'L' : 'R';
this._side = side;
if (side === 'L') { this._leftStreak++; this._rightStreak = 0; }
else              { this._rightStreak++; this._leftStreak = 0; }
```

## ルールの詳細

- L ストリーク上限 = 3（L, L, L のとき次は必ず R）
- R ストリーク上限 = 2（R, R のとき次は必ず L）
- ランダム選択の確率は 50/50 を維持（偏りを「ストリーク上限」でキャップするのみ）
- ゲーム開始時（`stop()` → `start()` → `_scheduleNext()`）でストリークはリセットされる

## 検証方法

1. ゲームをプレイしてギミックの出現順を観察する
2. 同じ側が3回（L）/ 2回（R）続いた後に、必ず反対側が出現することを確認する
3. 正常なランダム性（一方のみに偏らない）を確認する
