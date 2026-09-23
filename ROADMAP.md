# Roadmap: parity with the Nextflow strict syntax (26.04)

Goal: tree-sitter-nextflow parses everything the official Nextflow compiler's strict syntax accepts, so downstream tooling (ast-grep lint rules in nf-core/tools, editors, outlines) can rely on the AST instead of regex.

**Scope guard:** strict syntax only. `while` loops, `switch` and classes are not goals, since the strict syntax removes them. `finally` and `for`-in loops are parsed anyway because nf-core code still has them.

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
| 2026-07-03 | 99.6% (2062/2070)             | ; terminates before } / after comment; typed function defs (String f(String a){}) |
|## Status

The grammar mirrors `ScriptParser.g4` (see `grammar.js`). Every audit probe that Nextflow accepts parses, nf-core/modules parses fully, and the `.nf` files of rnaseq, sarek, methylseq and flexlmm parse fully. The script grammar also parses all 618 nf-core `.config` files error-free, as script-shaped trees.

A file counts only if it has **zero** ERROR nodes. That is the bar nf-core/tools uses to trust structural matching over regex fallback (`nf_core/astgrep.py::find_matches`).

Deliberate differences from ANTLR:

- Accepted though Nextflow rejects them: `for`-in loops and `finally` (nf-core code still has them), out-of-order sections, and processes without a script section (useful while editing).
- ANTLR requires a capitalized class name in `Type name` declarations. Tree-sitter cannot check that, so without an initializer `path reads` is read as a command call, and `String x` is too.
- Section keywords are also valid names (`input = ...` in a script prelude). GLR resolves the ambiguity, preferring the reading with more sections.
- Names cannot contain `$` after the first character, since that would break GString lexing.

## Remaining work

- **Config dialect**: a second grammar mirroring `ConfigParser.g4`, so `.config` files get config nodes (assignments, blocks, selectors, `includeConfig`) instead of calls and closures. Unlocks migrating `nextflow_config`, the largest regex-based lint check in nf-core/tools.
- **Official test corpus import**: mirror the nf-lang parser tests as tree-sitter corpus tests.
- **CI parse-rate job**: run `scripts/parse_rate.py` against a pinned nf-core/modules SHA and fail on regressions.
- **Publish the Python wheel to PyPI** so nf-core/tools can depend on it properly.
