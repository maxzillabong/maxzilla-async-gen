# Maxzilla AsyncAPI TypeScript Generator

![CI](https://github.com/maxzillabong/maxzilla-async-gen/actions/workflows/ci.yml/badge.svg)
![Coverage](https://codecov.io/gh/maxzillabong/maxzilla-async-gen/branch/main/graph/badge.svg)
![Release](https://img.shields.io/github/v/release/maxzillabong/maxzilla-async-gen?logo=github)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

A powerful TypeScript type generator for AsyncAPI v3 specifications. Generate clean, type-safe TypeScript interfaces from your AsyncAPI docs with zero configuration.

## Features

- ✅ **AsyncAPI v3 Support** - Full support for AsyncAPI 3.0 specifications
- 🎯 **Type Safety** - Generate precise TypeScript types from your API schemas
- 🚀 **Zero Config** - Works out of the box with sensible defaults
- 🔧 **Customizable** - Control enum types, unknown vs any, and more
- 📦 **CI/CD Ready** - Run with npx, no installation required
- 🎨 **Clean Output** - Generates readable, well-documented TypeScript code

## Installation

### NPX (Recommended for CI/CD)

No installation needed! Run directly:

```bash
npx maxzilla-async-gen generate asyncapi.json -o types.ts
```

### Global Installation

```bash
npm install -g maxzilla-async-gen
```

### Local Installation

```bash
npm install --save-dev maxzilla-async-gen
```

## Usage

### Generate TypeScript Types

```bash
maxzilla-async-gen generate <input> [options]
```

**Arguments:**
- `<input>` - Path to AsyncAPI specification file (JSON or YAML)

**Options:**
- `-o, --output <path>` - Output file path (default: `generated-types.ts`)
- `--enum-type <type>` - Enum generation type: `enum` or `union` (default: `union`)
- `--no-use-unknown` - Use `any` instead of `unknown` for untyped values (default: uses `unknown`)

**Examples:**

```bash
# Basic usage (uses 'unknown' for untyped values)
maxzilla-async-gen generate asyncapi.json

# Custom output path
maxzilla-async-gen generate asyncapi.json -o src/types/api.ts

# Use TypeScript enums instead of unions
maxzilla-async-gen generate asyncapi.json --enum-type enum

# Use 'any' instead of 'unknown' for untyped values
maxzilla-async-gen generate asyncapi.json --no-use-unknown
```

### Validate AsyncAPI Spec

```bash
maxzilla-async-gen validate <input>
```

Validates your AsyncAPI specification and shows details about channels, messages, and schemas.

## CI/CD Integration

### GitHub Actions

```yaml
name: Generate API Types
on: [push]

jobs:
  generate-types:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Generate TypeScript types
        run: npx maxzilla-async-gen generate asyncapi.json -o src/generated/api-types.ts

      - name: Commit generated types
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add src/generated/api-types.ts
          git commit -m "chore: update generated API types" || exit 0
          git push
```

### GitLab CI

```yaml
generate-types:
  stage: build
  script:
    - npx maxzilla-async-gen generate asyncapi.json -o src/generated/api-types.ts
  artifacts:
    paths:
      - src/generated/api-types.ts
```

### Azure Pipelines

```yaml
- task: Npm@1
  inputs:
    command: 'custom'
    customCommand: 'exec maxzilla-async-gen generate asyncapi.json -o src/generated/api-types.ts'
```

### Release Automation

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) to cut releases automatically from Conventional Commit messages. When a pull request is merged into `main`, the GitHub Actions `Release` workflow:

- Runs the full test suite
- Computes the next semantic version
- Publishes the package to npm (requires `NPM_TOKEN` secret)
- Updates `CHANGELOG.md` and creates a GitHub release

Ensure `GITHUB_TOKEN` and `NPM_TOKEN` secrets are configured before enabling automated releases.

### Code Coverage Reporting

Continuous integration uploads coverage data via [Codecov](https://about.codecov.io/). For public repositories, no token is required. The coverage badge will update automatically after the first successful CI run with coverage reporting.

## Programmatic Usage

You can also use the generator programmatically:

```typescript
import { AsyncAPIParser, TypeScriptGenerator } from 'maxzilla-async-gen';
import * as fs from 'fs/promises';

const parser = new AsyncAPIParser();
const parsed = await parser.parse('asyncapi.json');

const generator = new TypeScriptGenerator({
  enumType: 'union',
  useUnknown: true,
  exportEverything: true,
});

const output = generator.generate(parsed);
await fs.writeFile('generated-types.ts', output, 'utf-8');
```

## Output Example

Given this AsyncAPI spec:

```json
{
  "asyncapi": "3.0.0",
  "info": {
    "title": "User Service",
    "version": "1.0.0"
  },
  "channels": {
    "user.created": {
      "messages": {
        "UserCreated": {
          "payload": {
            "type": "object",
            "properties": {
              "id": { "type": "string" },
              "email": { "type": "string" },
              "role": { "type": "string", "enum": ["admin", "user"] }
            },
            "required": ["id", "email"]
          }
        }
      }
    }
  }
}
```

Generates:

```typescript
/**
 * Generated from AsyncAPI spec: User Service v1.0.0
 * Generated by maxzilla-async-gen
 */

export interface UserCreatedPayload {
  id: string;
  email: string;
  role?: 'admin' | 'user';
}

export interface UserCreatedMessage {
  payload: UserCreatedPayload;
}

export type UserCreatedSendMessages = UserCreatedMessage;
```

## Contributing

- See [CONTRIBUTING.md](./CONTRIBUTING.md) for local setup, commit standards, and review expectations.
- Please review the [Code of Conduct](./CODE_OF_CONDUCT.md) before participating.
- Security disclosures should follow the guidance in [SECURITY.md](./SECURITY.md).

## Why Maxzilla AsyncAPI Gen?

- **Modern AsyncAPI Support**: Unlike other generators stuck on v2, we support AsyncAPI v3
- **No Scoped Packages**: Free to use, no npm organization fees required
- **CI/CD First**: Designed to work seamlessly in automated pipelines with npx
- **Clean Code**: Generates human-readable TypeScript that you'd write yourself
- **Active Development**: Built for real-world use cases, maintained actively

## Roadmap

- [ ] YAML support
- [ ] JSON Schema validation
- [ ] Template customization
- [ ] Multiple file output
- [ ] Schema composition support
- [ ] Watch mode for development

## Contributing

Contributions welcome! This tool was built to solve real AsyncAPI v3 TypeScript generation needs.

## License

MIT

## Credits

Created with ❤️ for the AsyncAPI community
