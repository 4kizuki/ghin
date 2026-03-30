---
name: react-component
description: React Component を書く・レビューする際の規約チェック
user-invocable: true
---

## 規約

### 1. Arrow function + FunctionComponent 型
`function` 宣言ではなく arrow function を使い、`FunctionComponent` で型付けする。

### 2. Named export が基本
`default export` は Next.js の `page.tsx` / `layout.tsx` など、フレームワークが要求する場合に限定する。それ以外は `named export` を使う。

### 3. Default export する場合は const 定義 → default export
const で定義してから export default する。

### 4. Props は inline typing（YAGNI 優先）
Props 型は `FunctionComponent<{ ... }>` のジェネリクス内にインラインで書く。別途 `type MyComponentProps = { ... }` を定義するのは、その型を外部から参照する具体的な必要がある場合のみ。
