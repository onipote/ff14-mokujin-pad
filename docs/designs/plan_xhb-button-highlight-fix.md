# Plan: XHBボタン発光の連打追従改善

## Context

ボタンを連打したとき、XHBのボタン発光エフェクト（白フラッシュ・アクティブグロー）が視覚的に追いつかない。
原因はCSSアニメーションの再起動メカニズムにある。

## 根本原因

**CSSアニメーションはクラスが「すでに付いている状態で再度 add しても再起動しない」**

### 問題1: `setSlotFlash` (src/xhb.js:111-117)

```js
clearTimeout(this._flashTimers[slotId]);
el.classList.add('xhb-slot--flash');  // ← クラスが既にある場合、animationは再起動されない
```

連打シナリオ:
1. 押す → `xhb-slot--flash` 追加、アニメ開始（0.3秒）
2. 100ms後に再押し → `clearTimeout` + `classList.add`（すでに付いている → 効果なし）
3. アニメは100ms時点から継続 → フラッシュが視覚的に発火しない

### 問題2: `setSlotState` (src/xhb.js:65-73)

```js
el.className = 'xhb-slot xhb-slot--active';  // 同じ文字列を再代入しても変化なし → 再起動なし
```

`_onGaugeFull()` で pending スロットに `active` を付け、その後 `_nextSlot()` で同じスロットに再度 `active` を付けると再起動しない。

## 修正内容

**対象ファイル: `src/xhb.js` のみ**

### Fix 1: `setSlotFlash` — アニメーション強制再起動

```js
setSlotFlash(slotId) {
  const el = this.slots[slotId];
  if (!el) return;
  clearTimeout(this._flashTimers[slotId]);
  el.classList.remove('xhb-slot--flash');
  void el.offsetWidth;                         // ← reflow強制でアニメ完全リセット
  el.classList.add('xhb-slot--flash');
  this._flashTimers[slotId] = setTimeout(() => el.classList.remove('xhb-slot--flash'), 300);
}
```

### Fix 2: `setSlotState` — 状態変更時も強制再起動

```js
setSlotState(slotId, state) {
  const el = this.slots[slotId];
  if (!el) return;
  el.className = 'xhb-slot';                   // ← 一度ベースクラスのみにリセット
  void el.offsetWidth;                         // ← reflow強制
  if (state && state !== 'default') el.classList.add(`xhb-slot--${state}`);
  // ... 以下のrecast/sector初期化は既存のまま
}
```

`void el.offsetWidth` はブラウザに同期レイアウト計算を強制し、クラス変更の「前後」を明確に分離する標準的な手法。スロット数（最大16個）での呼び出しなのでパフォーマンス問題なし。

## 検証方法

1. `npm start` でサーバー起動
2. ゲーム中、正解ボタンを素早く連打して発光が毎回きちんと光るか確認
3. 早押し・誤ボタンを連打して白フラッシュが毎回発火するか確認
4. 高速モード（光の戦士）でも追従するか確認
