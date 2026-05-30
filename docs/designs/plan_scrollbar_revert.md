# Plan: スクロールバー抑制の撤回

## Context

コミット `cf79302` で「スクロールバー抑制」として追加された変更を撤回する。
現状は「パネル内部でスクロールし、ウインドウでスクロールしない」になっており、
ユーザーの意図は「パネル内部ではスクロールせず、ウインドウでスクロールする」である。

## 変更ファイル

`styles/main.css` のみ。3か所修正。

---

### 変更 1 — `html { overflow: hidden; }` を削除

スクロールバー抑制の本体。削除することで html/body のスクロールが許可される。

```css
/* 削除前 */
html {
  overflow: hidden;
}
```

---

### 変更 2 — `#screen-gameover .screen-panel` の内部スクロール設定を削除

```css
/* 削除前 */
#screen-gameover .screen-panel {
  overflow-y: auto;
  max-height: calc(100vh - 32px);
}
```

パネル自体がスクロールしなくなる。

---

### 変更 3 — `#screen-gameover` にウインドウスクロール設定を追加

`.screen` は `position: fixed; inset: 0; align-items: center;` のため、
パネルが viewport を超えると見切れる。
ゲームオーバー画面のオーバーレイ自体をスクロール可能にすることで、
ウインドウスクロールと同等の操作感を提供する。

```css
/* 追加 */
#screen-gameover {
  overflow-y: auto;
  align-items: flex-start;
  padding: 16px 8px;
}
```

---

## 実装結果

`styles/main.css` に上記3変更を適用済み。
