# Repository Guidelines

## Project Structure & Module Organization
- `src/` houses all TypeScript sources: CLI entry points in `src/cli/`, parsing logic in `src/parser/`, generators in `src/generator/`, and shared types in `src/types/`.
- Jest specs live in `src/__tests__/`, mirroring the runtime directories for quick discovery.
- Compiled artifacts are emitted to `dist/` via the TypeScript compiler; do not edit generated files directly.
- Documentation and configuration live at the repo root (`README.md`, `CHANGELOG.md`, `.github/`).

## Build, Test, and Development Commands
- `npm run build` — transpile TypeScript to JavaScript in `dist/` using `tsc`.
- `npm test` — execute the Jest suite under `node --experimental-vm-modules` (required for ES modules).
- `npm run test:coverage` — collect Jest coverage and emit `coverage/lcov.info` for Codecov.
- `npm run dev -- <cli-args>` — run the CLI in watch mode via `tsx` for rapid iteration.

## Coding Style & Naming Conventions
- TypeScript sources use 2-space indentation and ES module syntax.
- Prefer PascalCase for exported types/interfaces, camelCase for variables/functions, and kebab-case for filenames.
- When generating new schema helpers, reuse existing sanitization utilities (`sanitizeIdentifier`, `toPascalCase`) located in `src/generator/typescript-generator.ts`.

## Testing Guidelines
- Jest is the primary framework; tests should mirror the module under test (`foo.ts` → `foo.test.ts`).
- Add assertions covering both parser extraction and generator output, especially around `$ref` resolution.
- Keep coverage healthy by running `npm run test:coverage` before submitting changes.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`) so semantic-release can compute versions.
- Each PR should include a concise description, test evidence (command output or screenshots), and linked issues when applicable.
- Avoid committing compiled assets; semantic-release handles packaging during the release workflow.

## Security & Configuration Tips
- Never hard-code credentials. CI expects `NPM_TOKEN` and `CODECOV_TOKEN` secrets for release and coverage.
- Validate AsyncAPI documents locally with `maxzilla-async-gen validate <file>` before raising PRs that alter parsing rules.

## AI Attribution Policy
- Do not add files, badges, or comments that disclose or imply AI authorship (e.g., `agents.md`, `claude.md`, generated summaries).
- Keep commit messages and docs focused on human contributors; scrub automated attributions before submitting work.
