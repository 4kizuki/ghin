# ghin

pnpm + Turborepo モノレポ, git クライアント

## ディレクトリ構成

- `apps/` — アプリケーション
  - `frontend/` — メインフロントエンド (Next.js)
- `shared/config/` — 共有設定（ESLint, tsconfig）
- `shared/env-picker/` — 環境変数管理
- `shared/eslint-plugins/` — カスタム ESLint プラグイン
- `shared/never-error/` — Exhaustive check `NeverError`
- `shared/tamed-mantine/` — Mantine Server Component ラッパー

## コマンド

```bash
pnpm dev:web           # 開発サーバー起動
pnpm build             # 全パッケージビルド
pnpm lint              # ESLint
pnpm typecheck         # 型チェック
pnpm format            # Prettier フォーマット
pnpm format:check      # フォーマットチェック
pnpm checks            # 全チェック一括実行
```

## アーキテクチャ

- Usecase パターン: DB 操作は `apps/*/usecases/` に配置
- 環境変数: `@repo/env-picker` 経由、`process.env` 直接アクセス禁止
- Mantine: Server Component では Compound Component 記法禁止、`@repo/tamed-mantine` を使用

# 重要な指示
- 以下のようなケースで複数の有効な手段がある場合や、要件に疑問がある場合などは、実装や計画を行う前にAskUserQuestion ツールを積極的に利用し、疑問を解消してから実装せよ。ただし、以下のケースに限らない。
  - ライブラリのバージョン
  - アーキテクチャメンタルモデル
  - アルゴリズムの選択
  - データ構造の選択

# 実装前に
- 本プロジェクトでは特殊な TypeScript および React の規約を採用している。そのため、特に以下のスキルは実装前に必ず読むこと。
  - Typescript Convention
  - React Component
  - CSS Layout Convention

# 禁止事項
- pnpm 環境のため、 `npx` を禁止する。たとえば、 `npx tsc` の代わりにトップレベルの `pnpm typecheck` を用いよ
- 特に重大な理由がある場合を除き、 `bash` ツールより `find` や `read`, `grep`, `glob` ツールを積極的に使え
  - `bash` ツールの濫用はユーザに監査の手間を負わせる。つまり、ユーザにとって Helpful な態度ではなく、深刻な業務妨害である
  - サブエージェントに指示する際 (explore 等) も、**絶対にこの情報をサブエージェントへのプロンプトに渡せ**

# 実装後
- pnpm typecheck より pnpm checks を優先して行え

# Prefer Server Copmonent
- PREFER SERVER COMPONENT
- DATA FETCH in SERVER COMPONENT
