# Code Review 2 – maxzilla-async-gen (2025-02-14)

## Summary

Regression detected in the latest implementation: `$ref` handling now emits invalid TypeScript for top-level payload/header aliases. No other blockers were observed in this pass. Address before release.

## Findings

- **[High] Top-level `$ref` generates stray identifier instead of alias** – In `src/generator/typescript-generator.ts:164-185`, when `schemaToTypeScript` resolves a `$ref` with `isTopLevel === true`, the function returns only the resolved name (e.g. `UserProfile`). The caller then appends that bare identifier to the output, producing code like `UserProfile` on its own line and never defining `EventPayload`, so the generated module is invalid. Repro: run the generator against any message whose payload is `#/components/schemas/user-profile`. Expected output is `export type EventPayload = UserProfile;`. Suggested fix: when `isTopLevel` is true, emit an explicit alias (`export type ${safeName} = ${pascalRefName};`) instead of returning the identifier directly.

## Verification Notes

- `npm test` currently passes (Jest suites green), but the scenario above is not covered yet—add a unit test exercising a `$ref` payload/header at the top level and assert the alias form.
