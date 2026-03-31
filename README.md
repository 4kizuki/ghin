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

## License

[MIT](LICENSE)
