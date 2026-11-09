# tree-sitter-nextflow

[![Parse rate](https://github.com/nextflow-io/tree-sitter-nextflow/actions/workflows/parse-rate.yml/badge.svg?branch=main)](https://github.com/nextflow-io/tree-sitter-nextflow/actions/workflows/parse-rate.yml)

Nextflow grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter). Mirrors the official [Nextflow ANTLR grammar](https://github.com/nextflow-io/nextflow/tree/master/modules/nf-lang/src/main/antlr).

## Installation

Install the Python binding and tree-sitter runtime from PyPI after the first release:

```bash
pip install "tree-sitter-nextflow[core]"
```

Use the grammar in Python tools:

```python
from tree_sitter import Language, Parser
import tree_sitter_nextflow

parser = Parser(Language(tree_sitter_nextflow.language()))
tree = parser.parse(b'workflow {\n  println "Hello"\n}\n')
assert not tree.root_node.has_error
```

The parser produces a syntax tree for your lint rules. It does not run Nextflow's semantic checks.
Python 3.10 or later is required. Releases provide wheels for Linux and macOS on x86-64 and ARM64,
plus a source distribution for platforms with a C compiler.

To build the Python, Rust, or C binding from source:

```bash
git clone https://github.com/nextflow-io/tree-sitter-nextflow.git
```

- **Python:** `pip install .`
- **Rust:** add a path or git dependency on this repo in `Cargo.toml`.
- **C:** `make` builds the shared library.

See [editor and tool integrations](docs/integrations/README.md) for the query files
and the requirements for Bash highlighting inside process scripts.

## ast-grep

The repo includes an [ast-grep](https://ast-grep.github.io/) setup for searching, linting, and outlining Nextflow code by syntax tree:

```bash
ast-grep -l nextflow -p 'Channel.from($$$)' .
```

See [`docs/ast-grep/`](docs/ast-grep/) for setup, the bundled lint rules, and the pattern library.
