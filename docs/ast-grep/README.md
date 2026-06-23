# ast-grep for Nextflow

This grammar ships a ready-to-use [ast-grep](https://ast-grep.github.io/)
distribution so you can search, lint, refactor, and outline Nextflow code
structurally (by AST, not text).

- [Setup](#setup) — install ast-grep and the Nextflow distribution
- [patterns.md](patterns.md) — pattern syntax and a Nextflow pattern library
- [outline.md](outline.md) — `ast-grep outline` for `.nf` files
- [testing-results.md](testing-results.md) — verified-pattern notes

## What's in the distribution

| Path                         | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `sgconfig.yml`               | Registers `nextflow` as an ast-grep custom language            |
| `lib/<platform>/libnextflow.*` | Prebuilt tree-sitter parser libraries                        |
| `rules/`                     | Starter `scan` rules (linting / deprecations)                  |
| `outline/nextflow.yml`       | `ast-grep outline` extractor rules                             |
| `scripts/install-ast-grep.sh` | Installer that wires the above into your project or `~/.config` |

Prebuilt parser libraries are provided for **macOS arm64**
(`lib/macos-arm64/libnextflow.dylib`) and **Linux x64**
(`lib/linux-x64/libnextflow.so`) and are built/verified in CI
(`.github/workflows/ast-grep-distribution.yml`).

## Setup

### 1. Install ast-grep

```bash
brew install ast-grep         # macOS
cargo install ast-grep --locked
npm install -g @ast-grep/cli  # cross-platform
```

`ast-grep outline` requires **ast-grep >= 0.44.0**; `scan` and pattern search
work on older releases. Check with `ast-grep --version`.

### 2. Install the Nextflow distribution

**Quick install** (downloads and runs the installer):

```bash
# into the current project
curl -fsSL https://raw.githubusercontent.com/nextflow-io/tree-sitter-nextflow/main/scripts/install-ast-grep.sh | bash

# or system-wide (~/.config/ast-grep/)
curl -fsSL https://raw.githubusercontent.com/nextflow-io/tree-sitter-nextflow/main/scripts/install-ast-grep.sh | bash -s -- --global
```

**From a clone:**

```bash
git clone https://github.com/nextflow-io/tree-sitter-nextflow.git
cd tree-sitter-nextflow
./scripts/install-ast-grep.sh            # local
./scripts/install-ast-grep.sh --global   # ~/.config/ast-grep/
```

The installer detects your platform, verifies the matching prebuilt parser
library in `lib/`, and copies `sgconfig.yml` into place.

**Manual:**

```bash
cp path/to/tree-sitter-nextflow/sgconfig.yml .
# For a global install, edit sgconfig.yml so libraryPath points at absolute
# paths under the cloned lib/ directory.
```

### 3. Other platforms

If no prebuilt library matches your platform, build one yourself:

```bash
npm install -g tree-sitter-cli
tree-sitter generate
tree-sitter build --output libnextflow.so   # or .dylib on macOS
```

Then point `sgconfig.yml`'s `libraryPath` at the result.

## Quick start

Run from a directory where `sgconfig.yml` is discoverable (the project root, or
anywhere if installed `--global`):

```bash
# Search by pattern (see patterns.md for syntax)
ast-grep -l nextflow -p 'process $NAME { $$$ }' .
ast-grep -l nextflow -p 'Channel.from($$$)' .

# Run the bundled lint rules
ast-grep scan

# Outline a file's structure (ast-grep >= 0.44.0)
ast-grep outline --lang nextflow \
  --outline-rules outline/nextflow.yml --no-default-outline-rules main.nf
```

> Metavariables are written `$NAME` / `$$$`, the same as any ast-grep language.
> `sgconfig.yml` sets `expandoChar: _` so the parser can tokenize patterns
> (Nextflow uses `$` for string interpolation); ast-grep maps `$`↔`_`
> internally, so you do **not** write `_NAME` yourself. See
> [patterns.md](patterns.md).
