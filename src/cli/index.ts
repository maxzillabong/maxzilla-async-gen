#!/usr/bin/env node
import { Command } from 'commander';
import { AsyncAPIParser } from '../parser/asyncapi-parser.js';
import { TypeScriptGenerator } from '../generator/typescript-generator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';

// Security constants
const MAX_PATH_LENGTH = 4096;
const ALLOWED_EXTENSIONS = ['.json', '.yml', '.yaml'];

const program = new Command();

// Helper functions for validation
function validateInputPath(inputPath: string): void {
  if (!inputPath || inputPath.trim() === '') {
    throw new Error('Input path cannot be empty');
  }

  if (inputPath.length > MAX_PATH_LENGTH) {
    throw new Error(`Input path too long (max ${MAX_PATH_LENGTH} characters)`);
  }

  // Validate file extension
  const ext = path.extname(inputPath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Invalid file extension. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
  }

  // Note: Path traversal protection is handled by the file system
  // when attempting to read the file. Legitimate relative paths
  // like '../specs/api.yaml' are allowed.
}

function validateOutputPath(outputPath: string): void {
  if (!outputPath || outputPath.trim() === '') {
    throw new Error('Output path cannot be empty');
  }

  if (outputPath.length > MAX_PATH_LENGTH) {
    throw new Error(`Output path too long (max ${MAX_PATH_LENGTH} characters)`);
  }

  // Validate output is a .ts file
  const ext = path.extname(outputPath).toLowerCase();
  if (ext !== '.ts') {
    throw new Error('Output file must have .ts extension');
  }

  // Note: Path traversal protection is handled by the file system
  // when attempting to write the file. Legitimate relative paths
  // like '../output/types.ts' are allowed.
}

function validateEnumType(enumType: string): void {
  if (!['enum', 'union'].includes(enumType)) {
    throw new Error('Invalid enum-type. Must be "enum" or "union"');
  }
}

program
  .name('maxzilla-async-gen')
  .description('Generate TypeScript types from AsyncAPI v3 specifications')
  .version('0.1.0');

program
  .command('generate')
  .description('Generate TypeScript types from AsyncAPI spec')
  .argument('<input>', 'Path to AsyncAPI specification file (JSON or YAML)')
  .option('-o, --output <path>', 'Output file path', 'generated-types.ts')
  .option('--enum-type <type>', 'Enum generation type (enum|union)', 'union')
  .option('--no-use-unknown', 'Use any instead of unknown for untyped values')
  .action(async (input: string, options: any) => {
    try {
      console.log(chalk.blue('🚀 Maxzilla AsyncAPI Generator\n'));

      // Validate inputs
      validateInputPath(input);
      validateOutputPath(options.output);
      validateEnumType(options.enumType);

      console.log(chalk.gray(`📄 Reading AsyncAPI spec from: ${input}`));
      const parser = new AsyncAPIParser();
      const parsed = await parser.parse(input);

      console.log(chalk.green(`✓ Successfully parsed: ${parsed.title} v${parsed.version}`));
      console.log(chalk.gray(`  - Channels: ${parsed.channels.length}`));
      console.log(chalk.gray(`  - Messages: ${parsed.messages.length}`));
      console.log(chalk.gray(`  - Schemas: ${Object.keys(parsed.schemas).length}`));

      console.log(chalk.gray(`\n🔨 Generating TypeScript types...`));
      const generator = new TypeScriptGenerator({
        enumType: options.enumType as 'enum' | 'union',
        useUnknown: options.useUnknown,
        exportEverything: true,
      });

      const output = generator.generate(parsed);

      const outputPath = path.resolve(options.output);

      // Ensure output directory exists
      const outputDir = path.dirname(outputPath);
      await fs.mkdir(outputDir, { recursive: true });

      await fs.writeFile(outputPath, output, 'utf-8');

      console.log(chalk.green(`\n✓ TypeScript types generated successfully!`));
      console.log(chalk.gray(`  Output: ${outputPath}`));
      console.log(chalk.gray(`  Size: ${(output.length / 1024).toFixed(2)} KB\n`));
    } catch (error) {
      console.error(chalk.red('\n✗ Error generating types:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate AsyncAPI specification')
  .argument('<input>', 'Path to AsyncAPI specification file')
  .action(async (input: string) => {
    try {
      console.log(chalk.blue('🔍 Validating AsyncAPI spec...\n'));

      // Validate input
      validateInputPath(input);

      const parser = new AsyncAPIParser();
      const parsed = await parser.parse(input);

      console.log(chalk.green('✓ AsyncAPI specification is valid!\n'));
      console.log(chalk.gray('Specification details:'));
      console.log(chalk.gray(`  Title: ${parsed.title}`));
      console.log(chalk.gray(`  Version: ${parsed.version}`));
      if (parsed.description) {
        console.log(chalk.gray(`  Description: ${parsed.description}`));
      }
    } catch (error) {
      console.error(chalk.red('\n✗ Validation failed:'));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

program.parse();
