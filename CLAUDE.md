# Project Instructions

This project ships AI features (LLM integrations, chatbots, SaaS APIs) that handle sensitive
user data. See @.claude/skills/ai-app-security.md for mandatory security rules.

## Stack
- Runtime: Node.js 20
- Framework: SvelteKit 5 (Svelte 5 runes, routes at `src/app/`)
- LLM provider: Anthropic (Claude Haiku via `@anthropic-ai/sdk`)
- Database: PostgreSQL via Drizzle ORM + postgres.js
- Auth: Lucia v3 with DrizzlePostgreSQLAdapter
- Deployment: Railway (Nixpacks, adapter-node)

## Key commands
- Dev server: `npm run dev`
- Type check: `npm run check`
- Build: `npm run build`
- DB push: `npm run db:push`
- DB studio: `npm run db:studio`

## Code style
- TypeScript strict mode; no `any` types without justification
- ES modules (`import/export`), not CommonJS (`require`)
- Svelte 5 runes (`$state`, `$effect`, `$props`) — no Svelte 4 syntax
- Run typecheck after any series of file changes

## Architecture: Zero-Knowledge Vault
- Master password and vault key NEVER leave the browser
- All encryption/decryption happens client-side via Web Crypto API (AES-256-GCM)
- Server stores only ciphertext + IV — never plaintext values
- AI search receives only item names/categories, never field values
- Vault key held in memory only; wiped on lock or tab close

## Workflow
- IMPORTANT: Never commit secrets, API keys, or credentials to source code
- `.env` is gitignored; `.env.example` contains only placeholders
- Run the security checklist in @.claude/skills/ai-app-security.md before
  marking any LLM, API, auth, or data-storage task complete
- When uncertain on a security decision, stop and ask
