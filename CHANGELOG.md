---
purpose: Record user-visible changes by tree-sitter-nextflow release
applies_to: released grammar, query, binding, and tooling changes
entrypoint: Unreleased for pending work; latest version for release notes
verification: version links and metadata match the release version
update_when: user-visible behavior changes or a release is prepared
---

# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-08-04

### Added

- `for (x in expr) { }` loops at top level, in blocks, closures, and workflow
  bodies/`main:` sections.
- Workflow event handlers: `workflow.onComplete { }` / `workflow.onError { }`
  and the `workflow.onComplete = { }` assignment form.
- `emit:` sections accept bare `PROCESS.out` / `PROCESS.out.ch`.
- `'''...'''` triple-quoted strings as expression values (assignment RHS).
- Tags queries for function definitions, process invocations/outputs, channel
  factories, method calls, and include module paths.

### Fixed

- `queries/highlights.scm` referenced invalid node types (`"script:"`, `"shell:"`,
  `"exec:"`, `"stub:"`), which made `tree-sitter test` abort while loading the
  query. These sections are bare word tokens in the grammar (the trailing `:` is
  a separate token so `stub :` is tolerated), so they are now matched as
  `"script"` / `"shell"` / `"exec"` / `"stub"`.
- `//` inside `"""..."""` strings lexed as a line comment, corrupting the rest
  of the file's highlighting.
- Highlight queries now distinguish method names from property-navigation
  segments in flat `method_call` nodes, capture string delimiters/content
  explicitly, and mark `input:`/`output:` qualifiers (`val`, `path`, `stdout`)
  as `@type.builtin`.
- All `test/highlight/*.nf` and `test/tags/*.nf` assertions now pass
  (misaligned caret columns fixed; assertions updated to actual captures).

## [0.1.0] - 2026-07-04

First public release. The grammar parses the Nextflow strict syntax (the v2
parser, `NXF_SYNTAX_PARSER=v2`) with a **100% error-free parse rate** over the
pinned nf-core/modules corpus (2077/2077 files), measured by
`scripts/parse_rate.py`.

### Added

- **Grammar rewritten against the official Nextflow ANTLR grammar** (#13),
  covering processes, workflows, functions, DSL2 channel operations, directives,
  and Groovy expressions for the strict syntax.
- **Newline-sensitive statement termination** via an external scanner
  (`src/scanner.c`), enabling multi-line inputs, multi-statement script preludes,
  and processes with both `script:` and `stub:` sections.
- **Python bindings** (#14) and a cibuildwheel-based PyPI release workflow.
- **ast-grep distribution** (#16, #20, #21): `sgconfig.yml`, prebuilt parser
  libraries for macOS arm64 and Linux x64, starter lint rules under `rules/`, an
  installer (`scripts/install-ast-grep.sh`), and documentation under
  `docs/ast-grep/`.
- **ast-grep outline extractor** rules for Nextflow (#18, `outline/nextflow.yml`).
- Extensive expression, string-interpolation, control-flow, and channel-operation
  support driven to full corpus coverage. Highlights of the grammar burn-down:
  - Float literals, lenient string escapes, and interpolated map keys.
  - Slashy-string regex operands (`==~ /re/`) and `//` inside strings.
  - Named arguments in calls, compound assignment, `!in`, unary `~`, `<<`.
  - Directive closures, property access, casts, `new`, `template`, function defs,
    and `return`.
  - Safe navigation (`?.`), spread (`*.`), trailing closures, and call receivers.
  - `try`/`catch`/`finally`, chained pipes, destructuring assignment.
  - Typed closure parameters, `"""…""".stripIndent()` method chains, and
    immediately-invoked closures (`def x = { … }()`) (#26).
  - Expression-producing script bodies (#25), dotted no-paren commands like
    `log.debug "msg"` (#27), and `stdout emit:` without a comma (#28).
  - `|` parsed as boolean/bitwise-or inside conditions (`if (a == b | c == d)`)
    while channel pipes are preserved (#24, #29).

### Fixed

- Keyword tokens no longer match identifier prefixes, fixing mis-parses such as
  `Channel.fromPath` (#22).

### Changed

- Bumped `tree-sitter-cli` to `^0.26.10` (#23).
- Restructured the repository layout (#15).

[Unreleased]: https://github.com/nextflow-io/tree-sitter-nextflow/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/nextflow-io/tree-sitter-nextflow/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nextflow-io/tree-sitter-nextflow/releases/tag/v0.1.0
