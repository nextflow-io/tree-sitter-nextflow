# tree-sitter-nextflow

Nextflow grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

Targets Nextflow's [strict syntax](https://nextflow.io/docs/latest/strict-syntax.html) (`NXF_SYNTAX_PARSER=v2`). Non-strict constructs (`while`, `switch`, classes) are out of scope.

## Status

- **Parse rate:** 100% error-free over nf-core/modules (2208/2208 files), measured by `scripts/parse_rate.py`.
- **Bindings:** Rust, Python, and C, built from source. Nothing is published to a package registry yet.

See [`ROADMAP.md`](ROADMAP.md) for the parity roadmap and remaining work, and [`CHANGELOG.md`](CHANGELOG.md) for release history.

## Features

The grammar mirrors the official [Nextflow ANTLR grammar](https://github.com/nextflow-io/nextflow/tree/master/modules/nf-lang/src/main/antlr), including:

- **Declarations:** processes, workflows, functions, includes, `params` blocks, records, enums, the `output` block, and feature flags.
- **Process and workflow sections:** typed and legacy inputs and outputs, `stage:`, `topic:`, `when:`, `script:`/`shell:`/`exec:`/`stub:`, and `take:`/`main:`/`emit:`/`publish:`/`onComplete:`/`onError:`.
- **Types:** `name: Type` annotations, generics, nullable types, and return types.
- **Expressions:** Nextflow's operator precedence, closures, calls with and without parentheses, safe navigation (`?.`), spread (`*.`), and channel pipes.
- **Strings:** all four quote styles, GString interpolation, and slashy strings.
- **Language injection:** bash highlighting inside process scripts.

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
