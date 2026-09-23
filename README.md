# tree-sitter-nextflow

Nextflow grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter). Mirrors the official [Nextflow ANTLR grammar](https://github.com/nextflow-io/nextflow/tree/master/modules/nf-lang/src/main/antlr).

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
