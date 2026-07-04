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
| 2026-07-04 | **99.7% (2070/2077)**         | stdout emit option without comma (`stdout emit: log`) |
| 2026-07-04 | **99.7% (2071/2077)**         | expression-producing script body (`(cond ? """a""" : "") << """b"""`) |
| 2026-07-04 | **99.8% (2072/2077)**         | dotted no-paren log command (`log.debug "msg"`) |
| 2026-07-04 | **99.8% (2073/2077)**         | immediately-invoked closure (`def x = { … }()`) |
| 2026-07-04 | **100.0% (2077/2077)**       | `|` as boolean/bitwise-or in conditions (`if (a == b | c == d)`) |
| 2026-07-04 | **100.0% (2077/2077)**       | bare-identifier `|` as boolean-or in conditions (`if (a | b)`, #29) — no rate change; condition-scoped fix, pipes preserved |

## Remaining failures (0 files, 0.0%)

All 8 previously-failing files in the pinned nf-core/modules corpus
(`af65387`, denominator 2077) now parse error-free.

The `|`-as-boolean-or case (#24) — `if (a == b | c == d)` across bamcmp,
glimpse2/phase, gstama/polyacleanup, hicexplorer/hicpca — was the hard one.
The naive fix (adding `|` to `binary_expression`) reaches ~99.7% but
deterministically reparses every channel pipe `ch | map` as a
`binary_expression` because `binary_expression`'s static precedence (3) beats
`pipe_expression` (2), so no GLR fork occurs and `prec.dynamic` never fires
(2 corpus pipe tests regress). The landed fix introduces a `_bitor_expression`
rule at the SAME static precedence as `pipe_expression` (`prec.left(2)`, aliased
into `binary_expression`), raises the bare `identifier`/`function_call`
`pipe_operation` branches to `prec.left(2)` so the reduce-reduce decision
actually forks, declares the conflict pairs
(`[pipe_expression, _bitor_expression]`,
`[_bitor_expression, pipe_operation]`,
`[simple_expression, _bitor_expression, pipe_operation]`,
`[_bitor_expression, pipe_operation, operator_closure, command_expression]`),
and uses `prec.dynamic` on `pipe_expression` (with `operator_closure` bumped to
`prec.left(3)` so `multiMap { }` still shifts its closure). Net result: `ch |
map {}` stays a `pipe_expression` (busco_plot canary unchanged at 21
`pipe_expression` nodes, node shape byte-identical) while `x == 'b' | y == 'c'`
— whose RHS does not match `pipe_operation` — parses as a `binary_expression`.

The `#24` fix left one known limitation: a bare `|` between two BARE
identifiers inside a condition (`if (a | b)`) still read as a
`pipe_expression`, because that RHS *does* match `pipe_operation` so
`pipe_expression`'s `prec.dynamic(1)` beat `_bitor_expression`'s
`prec.dynamic(-1)` in the GLR fork. **#29** closes this by CONTEXT: the
`if`/`else if` condition slot is now a hidden `_condition` rule that offers a
condition-scoped `_condition_bitor_expression` (same `prec.left(2)` shape,
aliased to `binary_expression`, wrapped in `simple_expression`) carrying a
HIGHER `prec.dynamic(2)`. Only inside a condition does that reading win the
fork, so `if (a | b)` becomes a `binary_expression` while workflow-body pipes
(`ch | map {}`, statement-position `a | b`) are untouched. Declared the exact
named conflict pairs `[_bitor_expression, _condition_bitor_expression]` and
`[_bitor_expression, _condition_bitor_expression, pipe_operation]`. Parse rate
unchanged at 2077/2077, busco_plot canary still 21 `pipe_expression` nodes,
pipe node shape byte-identical, corpus 96 pass / 0 fail / 35 skip.

**Resolved since the prior 12/18**: immediately-invoked closures like
`def is_head = { command == 'head' }()` (via a `closure_call` rule reachable
from `simple_expression`, declaring the exact GLR conflict pairs tree-sitter
named — `[pipe_operation, operator_closure]`, `[method_call]`,
`[block, closure_block]` — so the parser forks on `(` / `{` after `}` and the
existing trailing-closure and pipe shapes stay byte-identical);
expression-producing script bodies like
`( cond ? """a""" : "" ) << """b"""`; `stdout emit: x` without a comma (via an
output-only no-comma emit form); dotted no-paren log commands like
`log.debug "msg"`; `"""…""".stripIndent()` cluster (~7 files, via one `"""`
rule + `string_method_call`); try/catch/finally; chained pipes; destructuring
assignment; index on parenthesized/interpolated expressions; lenient escapes;
`;` terminating before `}` and after an inline comment; typed function
definitions (`String f(String a){}`); `stub :` whitespace.

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
