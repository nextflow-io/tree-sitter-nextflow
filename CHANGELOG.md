# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

The grammar is rewritten from scratch to mirror the official Nextflow grammar (`ScriptParser.g4` in nextflow-io/nextflow). Most node names change, so queries, ast-grep rules and anything else that matches on the tree need updating.

### Changed

- **Breaking:** expressions follow the ANTLR grammar: one postfix chain (`member_expression`, `call_expression`, `index_expression`) over any primary, and `binary_expression` with ANTLR's precedence levels. `1 + 2 * 3` used to parse as `(1 + 2) * 3`.
- **Breaking:** Nextflow semantics are no longer baked into the syntax. `Channel.of(...)`, `FOO(x)`, `FOO.out.bam` and `ch | map { }` are ordinary calls, member accesses and `|` binary expressions. The `channel_*`, `process_invocation`, `process_output`, `pipe_expression`, `map_operation`, `env_function`, `dotted_identifier` and `method_call` nodes are gone.
- **Breaking:** one `string` node covers `'...'`, `"..."`, `'''...'''` and `"""..."""`, with `string_content`, `escape_sequence` and `interpolation` children. Single-quoted script bodies now inject bash without their quotes.
- **Breaking:** process and workflow bodies contain section nodes (`input_section`, `script_section`, `take_section`, `emit_section`, ...) that own their entries. Statements before the first section (directives, or an implicit script or main body) are direct children of the definition.
- **Breaking:** statements must be separated by a newline or `;`. Two statements on one line used to parse silently as separate statements (`log.info "x"` became `log.info` and `"x"`).
- Calls without parentheses (`println "x"`, `log.info "x"`, `path x, emit: y`) are `command_expression`, only as a statement, as in Nextflow.
- Definitions, parameters and declarations have `name`, `type`, `body` and similar fields.
- The scanner decides whether a newline ends a statement from where the ANTLR grammar allows a line break, so `+` or `-` at the start of a line begins a new statement, while `.`, `?`, `:`, `|`, `&&`, `else`, `catch` and similar continue the previous one.

### Added

- Strict-syntax declarations: `params { }` blocks, `record` and `enum` definitions, the `output { }` block, `import`, `agent` definitions, and typed functions (`def f(x: Path) -> List<Path>`).
- Typed process inputs and outputs, `record(...)` and `tuple(...)` inputs, and the `stage:` and `topic:` sections.
- Typed `take:` and `emit:` entries, and the `publish:`, `onComplete:` and `onError:` workflow sections.
- Types with qualified names, generics, nullable `?` and legacy `[]`.
- `throw`, braceless `if`/`else`/`try`/`catch` bodies, `catch (e: A | B)`, legacy Java-style declarations (`String x = ...`, `String f() { }`), and destructuring (`def (a, b) = ...`).
- Closures as values, typed and defaulted closure parameters, `null`, `>>` / `>>>` operators, hex, binary and octal numbers with `_` separators and type suffixes, multi-line slashy strings, and `"$a.b.c"` GString paths.
- Corpus tests derived from `ScriptParser.g4` in `test/corpus/spec/`.
- The Rust and Python bindings export `HIGHLIGHTS_QUERY`, `INJECTIONS_QUERY` and `TAGS_QUERY`.

### Fixed

- The Rust binding did not compile the external scanner (thanks @Sam-Sims, #31).
- The `channel-into-deprecated` ast-grep rule never matched, and `hardcoded-paths` flagged every `path("...")`.

### Removed

- The Node binding, which was never published.
- The prebuilt ast-grep parser libraries in `lib/`. `scripts/install-ast-grep.sh` downloads them from the GitHub release, which a `v*` tag now builds and attaches.

## [0.3.0] - 2026-08-04

### Added

- Standard Tree-sitter Bash injection queries for process script bodies, including content-only captures around Nextflow interpolations.
- A golden injection-query test covering all four supported string forms, plus testing-layer guides for parser, highlight, tag, injection, and editor tests.

## [0.2.0] - 2026-08-04

### Added

- `for (x in expr) { }` loops at top level, in blocks, closures, and workflow bodies/`main:` sections.
- Workflow event handlers: `workflow.onComplete { }` / `workflow.onError { }` and the `workflow.onComplete = { }` assignment form.
- `emit:` sections accept bare `PROCESS.out` / `PROCESS.out.ch`.
- `'''...'''` triple-quoted strings as expression values (assignment RHS).
- Tags queries for function definitions, process invocations/outputs, channel factories, method calls, and include module paths.

### Fixed

- `queries/highlights.scm` referenced invalid node types (`"script:"`, `"shell:"`, `"exec:"`, `"stub:"`), which made `tree-sitter test` abort while loading the query. These sections are bare word tokens in the grammar (the trailing `:` is a separate token so `stub :` is tolerated), so they are now matched as `"script"` / `"shell"` / `"exec"` / `"stub"`.
- `//` inside `"""..."""` strings lexed as a line comment, corrupting the rest of the file's highlighting.
- Highlight queries now distinguish method names from property-navigation segments in flat `method_call` nodes, capture string delimiters/content explicitly, and mark `input:`/`output:` qualifiers (`val`, `path`, `stdout`) as `@type.builtin`.
- All `test/highlight/*.nf` and `test/tags/*.nf` assertions now pass (misaligned caret columns fixed; assertions updated to actual captures).

## [0.1.0] - 2026-07-04

First public release. The grammar parses the Nextflow strict syntax (the v2 parser, `NXF_SYNTAX_PARSER=v2`) with a **100% error-free parse rate** over the pinned nf-core/modules corpus (2077/2077 files), measured by `scripts/parse_rate.py`.

### Added

- **Grammar rewritten against the official Nextflow ANTLR grammar** (#13), covering processes, workflows, functions, DSL2 channel operations, directives, and Groovy expressions for the strict syntax.
- **Newline-sensitive statement termination** via an external scanner (`src/scanner.c`), enabling multi-line inputs, multi-statement script preludes, and processes with both `script:` and `stub:` sections.
- **Python bindings** (#14) and a cibuildwheel-based PyPI release workflow.
- **ast-grep distribution** (#16, #20, #21): `sgconfig.yml`, prebuilt parser libraries for macOS arm64 and Linux x64, starter lint rules under `rules/`, an installer (`scripts/install-ast-grep.sh`), and documentation under `docs/ast-grep/`.
- **ast-grep outline extractor** rules for Nextflow (#18, `outline/nextflow.yml`).
- Extensive expression, string-interpolation, control-flow, and channel-operation support driven to full corpus coverage. Highlights of the grammar burn-down:
  - Float literals, lenient string escapes, and interpolated map keys.
  - Slashy-string regex operands (`==~ /re/`) and `//` inside strings.
  - Named arguments in calls, compound assignment, `!in`, unary `~`, `<<`.
  - Directive closures, property access, casts, `new`, `template`, function defs, and `return`.
  - Safe navigation (`?.`), spread (`*.`), trailing closures, and call receivers.
  - `try`/`catch`/`finally`, chained pipes, destructuring assignment.
  - Typed closure parameters, `"""…""".stripIndent()` method chains, and immediately-invoked closures (`def x = { … }()`) (#26).
  - Expression-producing script bodies (#25), dotted no-paren commands like `log.debug "msg"` (#27), and `stdout emit:` without a comma (#28).
  - `|` parsed as boolean/bitwise-or inside conditions (`if (a == b | c == d)`) while channel pipes are preserved (#24, #29).

### Fixed

- Keyword tokens no longer match identifier prefixes, fixing mis-parses such as `Channel.fromPath` (#22).

### Changed

- Bumped `tree-sitter-cli` to `^0.26.10` (#23).
- Restructured the repository layout (#15).

[Unreleased]: https://github.com/nextflow-io/tree-sitter-nextflow/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/nextflow-io/tree-sitter-nextflow/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/nextflow-io/tree-sitter-nextflow/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/nextflow-io/tree-sitter-nextflow/releases/tag/v0.1.0
