# Roadmap: parity with the Nextflow strict syntax (26.04)

Goal: tree-sitter-nextflow parses everything the official Nextflow compiler's
strict syntax accepts, so downstream tooling (ast-grep lint rules in
nf-core/tools, editors, outlines) can rely on the AST instead of regex.

**Scope guard:** strict syntax only. `while` loops, `switch`, classes, and
top-level arbitrary statements are *not* goals — the strict syntax removes them.
Exceptions parsed because real-world nf-core code still ships them:
`try`/`catch`/`finally` and `for`-in loops (both deprecated by the 26.04 strict
syntax, but present in the corpus).

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
| 2026-07-02 | 66.4% (1374/2070)             | Phase 1 lexer items (floats, escapes, …)   |
| 2026-07-03 | 76.1% (1575/2070)             | newline-terminator external scanner        |
| 2026-07-03 | 77.2% (1598/2070)             | " inside triple-quoted GStrings            |
| 2026-07-03 | 78.5% (1625/2070)             | slashy-string regex operands (==~ /re/)    |
| 2026-07-03 | 79.4% (1643/2070)             | // inside double-quoted strings            |
| 2026-07-03 | 84.1% (1740/2070)             | named args in function calls (stageAs:)    |
| 2026-07-03 | 86.5% (1791/2070)             | compound assign, !in, unary ~, <<          |
| 2026-07-03 | 88.2% (1825/2070)             | directive closures, property access, cast, new |
| 2026-07-03 | 90.2% (1868/2070)             | template directive, function defs, return  |
| 2026-07-03 | 91.3% (1890/2070)             | method named args, ?./*., call receivers   |
| 2026-07-03 | 92.4% (1913/2070)             | assert in closures, bare tuple parts, & ^, labels |
| 2026-07-03 | 93.8% (1942/2070)             | terminator-separated block statements      |
| 2026-07-03 | 96.1% (1990/2070)             | terminator-separated workflow statements   |
| 2026-07-03 | 96.5% (1998/2070)             | quote abutting interpolation in """        |
| 2026-07-03 | 97.1% (2011/2070)             | exit statement, env emit, bare ternary     |
| 2026-07-03 | 97.8% (2024/2070)             | full-expression process-invocation args    |
| 2026-07-03 | 98.1% (2030/2070)             | trailing closures, cast/process_output operands, ?. |
| 2026-07-03 | 98.6% (2041/2070)             | script string followed by a template call  |
| 2026-07-03 | 98.7% (2044/2070)             | try/catch/finally, catch-on-newline, chained pipes |
| 2026-07-03 | 98.9% (2047/2070)             | destructuring assignment, bare << statements |
| 2026-07-03 | 99.1% (2052/2070)             | index on paren/interp, pipe-op closures, error """…""", typed closure params |
| 2026-07-03 | 99.3% (2056/2070)             | method calls on triple strings ("""…""".stripIndent()); """ unified to one rule |
| 2026-07-03 | 99.4% (2058/2070)             | lenient string escapes (\\ + any char)     |
| 2026-07-03 | 99.5% (2059/2070)             | whitespace in section markers (stub :)      |
| 2026-07-03 | **99.6% (2062/2070)**         | ; terminates before } / after comment; typed function defs (String f(String a){}) |

## Remaining failures (8 files, 0.4%) — categorised

Each was attempted and reverted with the measured cost; these are genuine
LR/lexer limits or non-idiomatic source:

- **`|` as boolean-or in conditions** (4): `if (a == b | c == d)`. Adding `|`
  as a binary operator reaches 99.7% but deterministically reparses every
  channel pipe `ch | map` as a `binary_expression` instead of
  `pipe_expression` (2 corpus tests fail) — `binary_expression`'s static
  precedence wins and `prec.dynamic` does not apply (no real GLR conflict).
  Breaking the core channel-op node that lint rules read is not worth 4 files
  whose source should use `||`.
- **exotic / conflict-prone single-file syntax** (4):
  - `( cond ? """a""" : "" ) << """b"""` as a process script body — a binary
    expression *producing* the script string (rungx).
  - IIFE `{ … }()` — adding a closure-call rule introduces an unresolved
    grammar conflict for one file (scan).
  - `stdout emit: x` without a comma — comma-optional `emit_declaration`
    conflicts with `input_declaration` (download).
  - `log.debug "msg"` — a dotted-receiver no-paren command; a dedicated rule
    regressed other files (subsample).

**Resolved since the prior 12/18**: `"""…""".stripIndent()` cluster (~7 files,
via one `"""` rule + `string_method_call`); try/catch/finally; chained pipes;
destructuring assignment; index on parenthesized/interpolated expressions;
lenient escapes; `;` terminating before `}` and after an inline comment; typed
function definitions (`String f(String a){}`); `stub :` whitespace.

Known structural (error-free, not counted as failures): with terminators in
workflow sections, an LALR reduction can place a trailing `take:` identifier
or a second `main:` statement at `workflow_body` level rather than nested in
the section. All leaf nodes are present; a section-greedy restructure would
fix the nesting.

A file counts only if it has **zero** ERROR nodes — that is the bar
nf-core/tools uses to trust structural matching over regex fallback
(`nf_core/astgrep.py::find_matches`).

## Phase 1 — burn down the measured failures (ordered by impact)

**Done (commit 300cfc6, 50.0% → 66.4%):** float literals; single/double-quoted
string escapes incl. `\$` and `\'`; `assert cond : message` (incl. in script
preludes); `==~`; interpolated map keys; braceless `if` bodies; chained
subscripts; single-qualifier outputs with named options (`path "x", emit: y`);
`option_entry`/`option_value` so option values don't include `command_expression`.

**Done — newline-sensitive statement termination (external scanner).**
`src/scanner.c` emits a `_terminator` token at newlines/`;` where the parser
state allows a statement to end (`valid_symbols`), so continuations inside
`(...)`/`[...]` and mid-expression fall through as whitespace for free. A
one-character lookahead suppresses the terminator when the next line begins a
continuation (`.`, `?`, `:`, `,`, closing bracket, or the `else` keyword), and
comment lines are folded into the terminator run so a comment between two
statements yields one terminator, not two. Process bodies are now parsed in
three ordered phases (directives → input/output/when → script/stub) and each
declaration self-terminates, which removes the directive-vs-input and
directive-vs-prelude-assignment ambiguities the terminator exposed. This took
66.4% → 76.1% and unblocked multi-line inputs, multi-statement script preludes,
and processes with both `script:` and `stub:` sections.

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
- **Highlight/tags cleanup**: done — all `test/highlight/*.nf` and
  `test/tags/*.nf` assertions pass. Remaining: add field-based queries once
  Phase 2 lands fields.

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
