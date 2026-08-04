---
purpose: Route agents to the right test layer under test/
applies_to: test/ subtree
entrypoint: pick the subdirectory matching the layer you changed
verification: npx tree-sitter-cli test && scripts/check_injections.sh
update_when: a test directory is added, removed, or changes semantics
---
# test/ — one directory per testing layer

- `corpus/` — **parsing** tests (grammar.js changes). tree-sitter's own
  format: name, input, expected S-expression, separated by `===`/`---`.
  Docs: https://tree-sitter.github.io/tree-sitter/creating-parsers/5-writing-tests.html
  Run: `npx tree-sitter-cli test` (or `--file-name X.txt`).
  Update expectations after intended grammar changes: `tree-sitter test -u`
  (refuses trees containing ERROR/MISSING).

- `highlight/` — **highlights.scm** tests. Normal `.nf` files with
  assertion comments: `// ^ capture.name` checks the column above,
  `// <- capture.name` checks the comment's own column, `!name` negates.
  Docs: https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#unit-testing
  LIMITATION: assertions see only host-language captures — never assert
  injected-bash captures here (see `../injection/`).

- `tags/` — **tags.scm** tests. Same assertion-comment format as
  highlight, asserting `definition.*` / `reference.*` roles.
  Docs: https://tree-sitter.github.io/tree-sitter/4-code-navigation.html#unit-testing

- `injection/` — **injections.scm** golden test (fixture + pinned
  `tree-sitter query` output). Run `scripts/check_injections.sh`;
  re-pin intended changes with `--update`.
