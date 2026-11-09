# Contributing

Contributions are welcome. See [`AGENTS.md`](AGENTS.md) for the full development workflow, grammar design, and test layers.

## Making a grammar change

1. Run `npm ci` once to install the pinned tree-sitter CLI, and run it as `npx tree-sitter` from then on.
2. Edit `grammar.js`, then run `npx tree-sitter generate`.
3. Add corpus tests under `test/corpus/`.
4. Run `npm test`.

Commit the regenerated `src/` in the same commit as the grammar change. CI regenerates the parser and fails if they drift apart.

If your PR conflicts with `main` only in `src/` or `CHANGELOG.md`, the **Resolve conflicts** workflow merges `main` into it for you, so pull before pushing again. To do it yourself, run `scripts/merge-main.sh`. It regenerates the parser, combines the changelog entries, runs `npm test`, and commits a merge. It stops and leaves the branch unchanged if anything else conflicts.

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
It also builds and tests Python wheels and a source distribution, then publishes them to PyPI.
The tag must match the version in `pyproject.toml`. Pull requests test Python packages
without publishing. A manual **Python distribution** run builds and tests only.

### Configure PyPI publishing

Before the first tag with Python publishing enabled, a PyPI project owner must configure
a Trusted Publisher for `tree-sitter-nextflow` with these values:

- GitHub owner: `nextflow-io`
- Repository: `tree-sitter-nextflow`
- Workflow filename: `pypi-release.yml`
- Environment: `pypi`

If the project does not exist, register a pending publisher with those values in your
PyPI account's publishing settings. No API token is required.
A GitHub repository administrator must configure the `pypi` environment and any required reviewers
before pushing a release tag. Approve the publishing job if the environment requires it.

To publish the current version when its tag predates this workflow, create a new release version
with the steps above. Do not move an existing release tag.

### Test Python packages locally

```bash
python -m build
python -m venv /tmp/nextflow-wheel-test
/tmp/nextflow-wheel-test/bin/python -m pip install dist/*.whl 'tree-sitter~=0.25'
(cd /tmp && /tmp/nextflow-wheel-test/bin/python -m unittest discover -s "$OLDPWD/bindings/python/tests" -v)
```

Repeat in a fresh environment with `dist/*.tar.gz` instead of the wheel to test the source distribution.
