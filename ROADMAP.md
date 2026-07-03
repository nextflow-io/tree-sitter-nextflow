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

| date       | parse rate (error-free files) | note                                       |
| ---------- | ----------------------------- | ------------------------------------------ |
| 2026-07-02 | 0% (effectively)              | before directive/expression support        |
| 2026-07-02 | 50.0% (1035/2070)             | after PR #22 (directives, ternary, …)      |
| 2026-07-02 | **66.4% (1374/2070)**         | Phase 1 lexer items (floats, escapes, …)   |

A file counts only if it has **zero** ERROR nodes — that is the bar
nf-core/tools uses to trust structural matching over regex fallback
(`nf_core/astgrep.py::find_matches`).

## Phase 1 — burn down the measured failures (ordered by impact)

**Done (commit 300cfc6, 50.0% → 66.4%):** float literals; single/double-quoted
string escapes incl. `\$` and `\'`; `assert cond : message` (incl. in script
preludes); `==~`; interpolated map keys; braceless `if` bodies; chained
subscripts; single-qualifier outputs with named options (`path "x", emit: y`);
`option_entry`/`option_value` so option values don't include `command_expression`.

**Next — the highest-leverage remaining item:**

0. **Newline-sensitive statement termination (external scanner).** This is the
   single biggest remaining blocker. A newline-blind parser cannot disambiguate
   consecutive declarations that abut across a line break — e.g.

   ```
   output:
   tuple val(meta), path("*.tsv"), emit: embedding
   path "versions.yml", emit: versions
   ```

   `emit: embedding` followed by `path` on the next line is genuinely ambiguous
   without a statement terminator: the GLR parser greedily tries to extend the
   value across the newline (`command_expression(embedding, path)`) and then
   errors. The same greediness hits directive lists, `input:`/`output:` blocks,
   workflow bodies, and script preludes.

   Fix: add `externals: [$._terminator]` + a `src/scanner.c` that emits a token
   at a newline (and `;`), suppressed inside `(...)`/`[...]`/`{...}` and inside
   strings so line continuations still work. Then thread `$._terminator` as the
   separator in the `repeat1` of declaration/statement/directive/prelude rules,
   and drop the `prec.right` band-aids those rules currently carry. Validate
   against `scripts/parse_rate.py` — this should clear the bulk of the remaining
   ~700 failures. Do it as its own PR; it touches many rules and carries the
   most regression risk.

**After the scanner, remaining measured failures:**

1. **Numeric method chains**: confirm `(task.memory.mega * 0.8).intValue()` and
   property/method chains on parenthesized receivers all parse.
2. **Slashy-string edge cases**: `==~ /.+\.fa|.../` alternation patterns.
3. **Subworkflow `emit:` with named entries** (verify post-scanner).
4. **Map/expression polish**: maps as binary operands (`meta + [k: v]` — done
   for binary operands, verify in all positions), safe navigation `?.`, spread
   `*.`.

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
