# Getting Started with Maxzilla AsyncAPI Gen

## Quick Start

### 1. Test Locally

```bash
# Generate types from the example spec
npm run dev -- generate example-asyncapi.json -o my-types.ts

# Or use the built version
npm run build
node dist/cli/index.js generate example-asyncapi.json -o my-types.ts
```

### 2. Use in CI/CD

No installation required! Just use npx:

```bash
npx maxzilla-async-gen generate asyncapi.json -o src/types/api.ts
```

### 3. Publish to npm (Optional)

```bash
# Login to npm
npm login

# Publish (will auto-build via prepublishOnly)
npm publish
```

## Project Structure

```
maxzilla-async-gen/
├── src/
│   ├── cli/           # CLI interface
│   │   └── index.ts   # Command definitions
│   ├── parser/        # AsyncAPI parsing
│   │   └── asyncapi-parser.ts
│   ├── generator/     # TypeScript generation
│   │   └── typescript-generator.ts
│   └── types/         # TypeScript definitions
│       └── index.ts
├── dist/              # Compiled JavaScript (gitignored)
├── example-asyncapi.json  # Test AsyncAPI v3 spec
├── example-output.ts      # Example generated types
└── README.md
```

## How It Works

### 1. Parser (`src/parser/asyncapi-parser.ts`)

- Uses `@asyncapi/parser` to read AsyncAPI v3 specs
- Extracts channels, messages, operations, and schemas
- Converts AsyncAPI objects to plain JavaScript objects
- Handles both function-based and object-based schema access

### 2. Generator (`src/generator/typescript-generator.ts`)

- Converts schemas to TypeScript interfaces
- Generates message types with payload and headers
- Creates union types for channel operations
- Supports nested objects, enums, arrays, and references

### 3. CLI (`src/cli/index.ts`)

- Provides `generate` and `validate` commands
- Pretty console output with colors
- Error handling with helpful messages

## Usage Examples

### Basic Generation

```bash
maxzilla-async-gen generate asyncapi.json
```

### Custom Output Path

```bash
maxzilla-async-gen generate asyncapi.json -o src/generated/api-types.ts
```

### TypeScript Enums

```bash
maxzilla-async-gen generate asyncapi.json --enum-type enum
```

### Validation Only

```bash
maxzilla-async-gen validate asyncapi.json
```

## Programmatic API

```typescript
import { AsyncAPIParser, TypeScriptGenerator } from 'maxzilla-async-gen';

const parser = new AsyncAPIParser();
const parsed = await parser.parse('asyncapi.json');

const generator = new TypeScriptGenerator({
  enumType: 'union',      // or 'enum'
  useUnknown: true,       // use 'unknown' instead of 'any'
  exportEverything: true, // export all types
});

const output = generator.generate(parsed);
console.log(output);
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Generate API Types
  run: npx maxzilla-async-gen generate asyncapi.json -o src/types/api.ts
```

### GitLab CI

```yaml
generate-types:
  script:
    - npx maxzilla-async-gen generate asyncapi.json -o src/types/api.ts
```

### npm Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "generate:types": "maxzilla-async-gen generate asyncapi.json -o src/types/api.ts",
    "prebuild": "npm run generate:types"
  }
}
```

## Features

✅ **AsyncAPI v3 Support** - Full support for AsyncAPI 3.0 specifications
✅ **Type Safety** - Generates precise TypeScript interfaces
✅ **Zero Config** - Works out of the box
✅ **CI/CD Ready** - Run with npx, no installation needed
✅ **Nested Objects** - Handles complex nested schemas
✅ **Enums & Unions** - Generate TypeScript enums or union types
✅ **References** - Resolves `$ref` references
✅ **Documentation** - Preserves descriptions from AsyncAPI

## Troubleshooting

### AsyncAPI Parsing Errors

If you see errors like `'#/components/schemas/X' does not exist`:
- Verify your AsyncAPI spec is valid
- Check that all `$ref` references point to existing schemas
- Use `maxzilla-async-gen validate` to check your spec

### Generated Types Look Wrong

- Check the schema structure in your AsyncAPI spec
- Nested objects are automatically extracted to separate interfaces
- Use `--enum-type enum` if you prefer TypeScript enums over unions

### Module Resolution Issues

Make sure your `package.json` has:
```json
{
  "type": "module"
}
```

## Next Steps

1. Test with your own AsyncAPI spec
2. Integrate into your CI/CD pipeline
3. Customize generator options as needed
4. Contribute improvements on GitHub!

## Support

- 📖 [Full Documentation](README.md)
- 🐛 [Report Issues](https://github.com/maxzillabong/maxzilla-async-gen/issues)
- 💡 [Request Features](https://github.com/maxzillabong/maxzilla-async-gen/issues/new?template=feature_request.md)
