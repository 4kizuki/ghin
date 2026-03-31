# ghin

Local Git client built with Next.js. Manage repositories, view diffs, browse commit history, and switch branches — all from your browser.

## Setup

```bash
pnpm install
pnpm db:push
pnpm dev:frontend
```

Open [http://localhost:3000](http://localhost:3000).

## Commands

```bash
pnpm dev:frontend    # Dev server
pnpm build           # Build all packages
pnpm checks          # Lint, typecheck, format check, test
pnpm db:studio       # Prisma Studio
```

## Tech Stack

- **Framework**: Next.js 16 / React 19
- **UI**: Mantine 8
- **DB**: SQLite (Prisma)
- **Monorepo**: pnpm + Turborepo

## Security

### Dependency Version Pinning

All dependencies are pinned to exact versions (no `^` or `~` prefix) to prevent unintended version changes during `pnpm install`.

`.npmrc` に `save-exact=true` を設定しているため、`pnpm add` で新規追加する依存も自動的に固定バージョンになる。

### Dependabot

GitHub Dependabot を利用して以下を自動化:

- **Security updates** - 脆弱性が検出された依存に対して修正 PR を自動作成
- **Version updates** - weekly で依存の最新化 PR を自動作成

設定: [`.github/dependabot.yml`](.github/dependabot.yml)

## License

[MIT](LICENSE)
