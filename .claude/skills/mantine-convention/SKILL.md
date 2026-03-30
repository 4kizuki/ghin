---
name: mantine-convention
description: Mantine を利用したコードを書く・レビューする際の規約チェック
user-invocable: true
---

## 規約

### 1. Server Component では Compound Component 記法を使わない
Mantine の `Table.Thead`, `Menu.Item` のような Compound Component（ドット記法）は Client Component でのみ使用可能。Server Component では個別インポート形式（`TableThead`, `MenuItem` など）を使う。

### 2. Server Component では Polymorphic Component を使わない
Mantine の `component` prop（Polymorphic Component）は関数を渡す仕組みのため、Server Component では使用できない。代わりに `@repo/tamed-mantine` で提供されるラッパーコンポーネントを使う。

### 3. Polymorphic ラッパーは `@repo/tamed-mantine` に定義する
Polymorphic Component のラッパーは `shared/tamed-mantine` パッケージに Client Component として定義し、モノレポ全体で再利用可能にする。

### 4. ダイアログは Mantine の modals を使う（JS ネイティブ禁止）
`window.confirm()`, `window.alert()`, `window.prompt()` などの JS ネイティブダイアログは使わない。代わりに Mantine の `@mantine/modals`（`modals.openConfirmModal` など）を使用する。
