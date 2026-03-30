---
name: env-convention
description: 環境変数の利用パターンに関する規約チェック
user-invocable: true
---

環境変数を扱うコードを書く・修正・レビューする際は、以下の規約に従うこと。

## 規約

### 1. `process.env` の直接アクセス禁止
`process.env` への直接アクセスは禁止。`@repo/env-picker` の `EnvRequirementCollector` を使う。

### 2. `apps/*` でのランタイムインジェクションパターン
`apps/*` で環境変数を利用する場合は、`runtimeInjection.ts` に一元化し IIFE で即時実行する。`server-only` で Server Component / Route Handler 以外からのインポートを防ぐ。

### 3. `shared/*` での環境変数は原則禁止
`shared/*` パッケージでは環境変数の利用を原則禁止する。環境固有の値は `apps/*` 側から引数やコンストラクタで注入する。
