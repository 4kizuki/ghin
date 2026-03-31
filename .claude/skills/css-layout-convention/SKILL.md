---
name: css-layout-convention
description: 縦方向のレイアウト（header + scrollable content 等）を実装する際に必ず読むこと
user-invocable: true
---

## 規約

### 1. Header + scrollable content は flex レイアウトで分割する
固定高さの `calc()` (例: `height: calc(100% - 80px)`) を使わず、親を `display: flex; flex-direction: column` にして header を `flex: 0 0 auto`、content を `flex: 1 1 0` で分割する。

```tsx
// NG: ヘッダ高さのハードコード
body: { height: 'calc(100% - 80px)' }

// OK: flex で自動分割
content: { display: 'flex', flexDirection: 'column', overflow: 'hidden' }
header:  { flex: '0 0 auto' }
body:    { flex: '1 1 0', overflow: 'hidden' }
```

**理由:** ヘッダの高さが内容やフォントサイズにより変動すると、`calc()` の固定値とズレて意図しない overflow やスクロールが発生する。

### 2. スクロールコンテナには `overscrollBehavior: 'none'` を設定する
スクロール可能な要素（Virtuoso, `overflow: auto` の Box 等）には `overscrollBehavior: 'none'` を設定し、スクロール端でのバウンスや親へのスクロール伝播を防ぐ。

```tsx
// OK
<Virtuoso style={{ height: '100%', overscrollBehavior: 'none' }} />
```
