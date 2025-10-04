# Contributing

Thanks for taking the time to contribute! 🎉

Please take a moment to review this document before submitting a pull request.

## Getting Started

1. Fork the repository and clone your fork.
2. Install dependencies with `npm ci`.
3. Run the test suite with `npm test` and ensure everything passes.
4. If you make type changes, run `npm run build` to confirm the TypeScript compiler stays happy.

## Development Workflow

- Create a feature branch from `main` with a descriptive name (`feat/generate-headers`).
- Keep commits focused and meaningful. The project uses [Conventional Commits](https://www.conventionalcommits.org/) so automated releases can determine version bumps correctly.
- Include or update unit tests alongside code changes whenever possible.
- Run `npm run test:coverage` before submitting to make sure the coverage report stays healthy.

## Pull Requests

- Provide a clear summary of the change and why it is needed.
- Reference any related issues (e.g. `Closes #123`).
- Ensure CI passes. Pull requests will not be merged if CI is red.
- When adding new features or breaking changes, update the docs (`README.md`, `GETTING_STARTED.md`) accordingly.

## Releasing

Releases are handled automatically via [semantic-release](https://semantic-release.gitbook.io/semantic-release/). To trigger a release, merge a pull request with a Conventional Commit message into `main`. Semantic-release will:

- Determine the next semantic version.
- Publish the package to npm (requires `NPM_TOKEN` secret).
- Create a GitHub release with changelog notes.

## Code of Conduct

Please review and abide by our [Code of Conduct](./CODE_OF_CONDUCT.md). If you witness or experience unacceptable behavior, report it to the maintainers at the contact listed in the conduct file.

## Questions?

Open a [GitHub Discussion](https://github.com/maxzillabong/maxzilla-async-gen/discussions) or create an issue. We're happy to help you get started.
