# Code Review 3 – maxzilla-async-gen (2025-02-14)

## Summary

Two regressions remain after the latest round of changes:

1. Nested `$ref` relationships are still flattened, so generated TypeScript drops references to shared component schemas.
2. CLI docs describe a `--use-unknown false` flag usage that Commander does not accept.

The first item is a correctness bug (high severity); the second is a medium severity doc/API mismatch.

## Findings

- **[High] Nested `$ref` metadata lost during parse** – When `convertSchemaToObject` recurses into `properties` and `items`, the AsyncAPI parser has already resolved references to full schema objects. Because the raw `$ref` string is never reattached, the generator sees plain objects and emits inline interfaces such as `interface ItemsItem { … }` inside arrays, even though the specification points to `#/components/schemas/OrderItem`. The same issue causes enums like `OrderStatus` to collapse back to string unions instead of referencing the exported `OrderStatus` type. Confirmed by running the compiled CLI against the end-to-end test spec and observing `items: ItemsItem[];` with a duplicate `interface ItemsItem` block. To fix: while building the intermediate schema tree, detect when the original raw spec used `$ref` for array items/properties and carry that pointer forward so `schemaToTypeScript` can generate `OrderItem[]` / `OrderStatus` aliases instead of anonymized types.

- **[Medium] CLI boolean option usage inconsistent with docs** – The README recommends `--use-unknown false` to fall back to `any`, but Commander treats `--use-unknown` as a flag with no argument (`src/cli/index.ts:70`). Passing `false` triggers a "too many arguments" error. Either switch the option to accept an explicit boolean value (e.g. `.option('--use-unknown <boolean>', ...)`) or change the documentation to use `--no-use-unknown`, which is Commander’s idiomatic toggler.

## Verification Notes

- Re-run the integration test after restoring nested `$ref` preservation; the resulting output should contain `items: OrderItem[];` and `status: OrderStatus;` without extra anonymous interfaces.
- Update the README (and any other docs) after settling on the CLI behaviour, then smoke-test the CLI invocation you document (`maxzilla-async-gen generate … --no-use-unknown`).
