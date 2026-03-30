---
name: usecase-convention
description: Usecase（DB 操作の単位）を書く・レビューする際の規約チェック
user-invocable: true
---

## 規約

### 1. Usecase の定義
Usecase は **トランザクションを自身では開始しない DB 操作の単位関数**。
Prisma の Transaction Client を引数で受け取り、1 つの論理的操作を行う。

### 2. Query と Mutation の分離
Usecase は **Query（読み取り）** または **Mutation（書き込み）** のいずれか一方のみ。1 つの Usecase に Query と Mutation を混在させない。

ただし、Mutation 内での存在チェック・権限チェックのための読み取り（例: `findUniqueOrThrow` で対象の存在確認後に `update`）は Mutation に含めてよい。

### 3. 認可・権限チェックは Usecase 内で行う
Usecase は必要に応じて認可情報を引数で受け取り、認可チェックを Usecase 内で行う。

### 4. `Prisma.TransactionClient` を第 1 引数で受け取る
Usecase はグローバルな `prisma` をインポートせず、第 1 引数で `Prisma.TransactionClient` を受け取る。

### 5. 配置場所
Usecase は `apps/*/usecases/` ディレクトリに配置する。

### 6. 呼び出し側（Action / Server Component）の責務
Server Actions や Server Components は以下のいずれかのパターンで Usecase を呼ぶ。
