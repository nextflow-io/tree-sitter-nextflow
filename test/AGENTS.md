# test/ — one directory per testing layer

- `corpus/` — **parsing** tests (grammar.js changes). One file per area (declarations, process, workflow, statements, expressions, literals, config); add each test to the file for the `ScriptParser.g4` rule it exercises. tree-sitter's own format: name, input, expected S-expression, separated by `===`/`---`. Docs: https://tree-sitter.github.io/tree-sitter/creating-parsers/5-writing-tests.html Run: `npx tree-sitter test` (or `--file-name X.txt`). Update expectations after intended grammar changes: `npx tree-sitter test -u` (refuses trees containing ERROR/MISSING).

- `highlight/` — **highlights.scm** tests. Normal `.nf` files with assertion comments: `// ^ capture.name` checks the column above, `// <- capture.name` checks the comment's own column, `!name` negates. Docs: https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#unit-testing LIMITATION: assertions see only host-language captures — never assert injected-bash captures here (see `../injection/`).

- `tags/` — **tags.scm** tests. Same assertion-comment format as highlight, asserting `definition.*` / `reference.*` roles. Docs: https://tree-sitter.github.io/tree-sitter/4-code-navigation.html#unit-testing

- `injection/` — **injections.scm** golden test (fixture + pinned `tree-sitter query` output). Run `scripts/check-injections.sh`; re-pin intended changes with `--update`.
