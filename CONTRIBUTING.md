# Contributing

Contributions are welcome. See [`AGENTS.md`](AGENTS.md) for the full development workflow, grammar design, and test layers.

## Making a grammar change

1. Run `npm ci` once to install the pinned tree-sitter CLI, and run it as `npx tree-sitter` from then on.
2. Edit `grammar.js`, then run `npx tree-sitter generate`.
3. Add corpus tests under `test/corpus/`.
4. Run `npm test`.

Commit the regenerated `src/` in the same commit as the grammar change. CI regenerates the parser and fails if they drift apart.

For changes that could affect real-world code, run the **Parse rate** workflow from the Actions tab (it also runs on every push to `main`). It parses every `.nf` file in nf-core/modules at a pinned commit and fails if any file has a syntax error.

## Pre-commit hooks (optional)

[pre-commit](https://pre-commit.com/) can run the same checks as CI on each commit, so a stale `src/` or a failing test shows up before you push:

```bash
pip install pre-commit
pre-commit install
```

When `grammar.js`, `queries/` or `test/` changes, the hooks regenerate and build the parser and run `npm test`. On every commit they also fix trailing whitespace and missing final newlines and check YAML syntax. If a hook changes a file, the commit stops; stage the changes and commit again. `pre-commit run --all-files` runs every hook by hand.

## Releasing

1. `npx tree-sitter version X.Y.Z` bumps the version in every manifest.
2. `npx tree-sitter generate`, since the parser embeds the version.
3. Update `CHANGELOG.md`, commit, then tag and push `vX.Y.Z`.

The tag push builds the ast-grep parser libraries and attaches them to the GitHub release.
