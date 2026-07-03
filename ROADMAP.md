# Roadmap: parity with the Nextflow strict syntax (26.04)

Goal: tree-sitter-nextflow parses everything the official Nextflow compiler's
strict syntax accepts, so downstream tooling (ast-grep lint rules in
nf-core/tools, editors, outlines) can rely on the AST instead of regex.

**Scope guard:** strict syntax only. `for`/`while` loops, `try`/`catch`,
`switch`, classes, and top-level arbitrary statements are *not* goals — the
strict syntax removes them. Corpus/highlight tests exercising those should be
deleted, not fixed.

## The metric

Parse rate over real-world code, measured by `scripts/parse_rate.py`:

```bash
git clone --depth 1 https://github.com/nf-core/modules /tmp/nf-core-modules
NEXTFLOW_TS_LIB=lib/<platform>/libnextflow.<ext> \
  python scripts/parse_rate.py /tmp/nf-core-modules/modules /tmp/nf-core-modules/subworkflows
```

| date       | parse rate (error-free files) | note                                   |
| ---------- | ----------------------------- | -------------------------------------- |
| 2026-07-02 | 0% (effectively)              | before directive/expression support    |
| 2026-07-02 | **50.0% (1035/2070)**         | after PR #22 (directives, ternary, …)  |

A file counts only if it has **zero** ERROR nodes — that is the bar
nf-core/tools uses to trust structural matching over regex fallback
(`nf_core/astgrep.py::find_matches`).

## Phase 1 — burn down the measured failures (ordered by impact)

Counts are error-signature occurrences from the 2026-07-02 baseline run:

1. **Float literals + numeric methods** (~110): `(task.memory.mega * 0.8).intValue()`
   — no float literal rule; also confirm property/method chains on
   parenthesized receivers cover this shape.
2. **Bare qualifier outputs with options** (~130 aggregate):
   `path "versions.yml", emit: versions, topic: versions` — the tuple form is
   supported, the single-qualifier form with trailing named options is not.
3. **String escapes** (~130 aggregate): `\$` in double-quoted/heredoc strings
   (`echo \$(mktemp)`), `\'` inside single-quoted strings
   (`eval('sed -n \'s/...\'')`). `escape_sequence` and `string_literal` need
   the full strict-syntax escape set.
4. **`assert cond : message`** (52): assert statement with message clause.
5. **`==~` (exact-match regex) operator** (~35), plus slashy-string edge cases.
6. **Interpolated map keys / emit blocks** (~50): `"${task.process}":` as a
   map key; subworkflow `emit:` sections with named entries.
7. **Braceless conditionals** (~40): `if (cond) error "msg"` single-statement
   form (strict syntax allows expression statements without braces?
   verify against the spec — if not, these become expected failures).
8. **Map/expression polish** (~30): maps as binary operands
   (`meta + [k: v]`), chained subscripts (`m[0][2]`), safe navigation `?.`,
   spread `*.`.

Re-run the harness after each item; the table above gets a new row per PR.

## Phase 2 — strict-syntax constructs not yet in the grammar

Driven by the [Nextflow syntax reference](https://nextflow.io/docs/latest/reference/syntax.html)
and the nf-core lint checks that need them:

- **Function definitions**: top-level `def name(args) { ... }` (needed by
  subworkflow/module lint on lib code; old queries referenced a
  `function_declaration` node that never existed).
- **Workflow output block**: `output { ... }` with publish targets (25.04+),
  `publish:` section in workflows.
- **Params block with types**: `params { input: Path ... }` (25.10+ static
  types preview; 26.04 target), typed `take:` declarations.
- **Enum declarations**.
- **Type annotations**: `def foo(x: Path) -> Path` per the static-types work.
- **nextflow.config as a first-class dialect**: profiles/scoped blocks,
  `includeConfig`, dynamic directives with closures. Unlocks migrating
  `nextflow_config` — the largest regex-based lint check in nf-core/tools.
- **Named fields** on process/workflow/definition nodes (`name:`, `body:`) so
  queries and outline rules stop matching by position (tags.scm/highlights.scm
  currently note this gap).

## Phase 3 — conformance + infrastructure

- **Official test corpus import**: mirror the parser test cases from
  `nextflow-io/nextflow` (nf-lang) / the language-server as tree-sitter corpus
  tests, so parity is tested against the reference implementation, not
  anecdotes.
- **CI parse-rate job**: run `scripts/parse_rate.py` against a pinned
  nf-core/modules SHA; fail the build if the rate regresses; badge in README.
- **Publish the Python wheel to PyPI** (cibuildwheel workflow exists in a
  branch) so nf-core/tools can depend on it properly.
- **Highlight/tags cleanup**: rewrite `test/highlight/*.nf` for strict syntax
  only (drop `for`/`try` cases), add field-based queries once Phase 2 lands
  fields.

## Consumer pipeline (nf-core/tools lint rules waiting on grammar)

| lint check                     | needs                                    |
| ------------------------------ | ---------------------------------------- |
| module `main_nf` when/sections | nothing — ready now                      |
| module `main_nf` input/output  | Phase 1 item 2 (bare qualifier options)  |
| subworkflow `main_nf` structure| Phase 2 emit/take polish                 |
| `nextflow_config`              | Phase 2 config dialect                   |
| `pipeline_todos` (done)        | shipped                                  |
| `system_exit` (done)           | shipped                                  |
| `pipeline_if_empty_null` (done)| shipped                                  |
