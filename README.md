# tree-sitter-nextflow

Nextflow grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

Targets Nextflow's [strict syntax](https://nextflow.io/docs/latest/strict-syntax.html) (`NXF_SYNTAX_PARSER=v2`). Non-strict constructs (`while`, `switch`, classes) are out of scope.

## Status

- **Parse rate:** 100% error-free over the pinned nf-core/modules corpus (2077/2077 files), measured by `scripts/parse_rate.py`.
- **Bindings:** Rust, Python, and C, built from source. Nothing is published to a package registry yet.

See [`ROADMAP.md`](ROADMAP.md) for the parity roadmap and remaining work, and [`CHANGELOG.md`](CHANGELOG.md) for release history.

## Features

- **Core Nextflow syntax:** process, workflow, and function definitions, variable declarations, includes, and parameters.
- **DSL2:** channel factories and operators, chained/piped channel operations, `take:`/`main:`/`emit:` workflow sections.
- **Process bodies:** directives, `input:`/`output:`/`when:` sections, and `script:`/`shell:`/`exec:`/`stub:` blocks.
- **Expressions:** binary/unary operators, casts, ranges, lists, maps, closures (including typed parameters), safe navigation (`?.`), and spread (`*.`).
- **Strings:** single/double/triple-quoted strings, GString interpolation, and slashy-string regexes.
- **Control flow:** `if`/`else`, `for`-in loops, `try`/`catch`/`finally`, `assert`, and `workflow.onComplete`/`onError` event handlers.
- **Language injection:** Bash/shell highlighting inside script blocks.

## Installation

The Rust, Python, and C bindings are built from source:

```bash
git clone https://github.com/nextflow-io/tree-sitter-nextflow.git
```

- **Python:** `pip install .`
- **Rust:** add a path or git dependency on this repo in `Cargo.toml`.
- **C:** `make` builds the shared library.

## ast-grep

The repo includes an [ast-grep](https://ast-grep.github.io/) setup for searching, linting, and outlining Nextflow code by syntax tree:

```bash
ast-grep -l nextflow -p 'Channel.from($$$)' .
```

See [`docs/ast-grep/`](docs/ast-grep/) for setup, the bundled lint rules, and the pattern library.

## References

- [Nextflow ANTLR grammar](https://github.com/nextflow-io/nextflow/tree/master/modules/nf-lang/src/main/antlr)
- [Nextflow TextMate grammar](https://github.com/nextflow-io/vscode-language-nextflow/tree/main/syntaxes)
- [AST-grep Custom Languages](https://ast-grep.github.io/advanced/custom-language.html)
