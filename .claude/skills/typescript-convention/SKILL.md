---
name: typescript-convention
description: あなたはいかなる場合でも、 TypeScript コードを書く・レビューする前に絶対に呼び、確認しなければならない。このリポジトリ特有の非常に特殊なコーディング規約が含まれており、読む必要がある。
user-invocable: true
---

## 規約

### 1. `as` / `!` の禁止（ランタイムバリデーション推奨）
型アサーション（`as`）と Non-null assertion（`!`）は使用禁止。`as const` のみ例外として許可。
外部データの型付けには zod などのランタイムバリデーションを使う。

### 2. `any` の禁止
`any` は使用禁止。`unknown` を使い、型を絞り込む。

### 3. Exhaustive check（`NeverError` 推奨）
union 型の分岐では、すべてのケースを網羅していることをコンパイル時に保証するために `NeverError` を積極的に使う。

### 4. `enum` の禁止（union 型を使用）
`enum` は使用禁止。代わりに union 型を使う。
