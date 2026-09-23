# ast-grep for Nextflow

This grammar ships a ready-to-use [ast-grep](https://ast-grep.github.io/) distribution so you can search, lint, refactor, and outline Nextflow code structurally (by AST, not text).

- [Setup](#setup) — install ast-grep and the Nextflow distribution
- [patterns.md](patterns.md) — pattern syntax and a Nextflow pattern library
- [outline.md](outline.md) — `ast-grep outline` for `.nf` files
- [testing-results.md](testing-results.md) — verified-pattern notes

## What's in the distribution

| Path                         | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `sgconfig.yml`               | Registers `nextflow` as an ast-grep custom language            |
| `lib/<platform>/libnextflow.*` | Parser library, downloaded by the installer                  |
| `rules/`                     | Starter `scan` rules (linting / deprecations)                  |
| `outline/nextflow.yml`       | `ast-grep outline` extractor rules                             |
| `scripts/install-ast-grep.sh` | Installer that wires the above into your project or `~/.config` |

Each GitHub release has prebuilt parser libraries for macOS (arm64, x64) and Linux (x64, arm64), built and verified by `.github/workflows/ast-grep-distribution.yml`.

## Setup

### 1. Install ast-grep

```bash
brew install ast-grep         # macOS
cargo install ast-grep --locked
npm install -g @ast-grep/cli  # cross-platform
```

`ast-grep outline` requires **ast-grep >= 0.44.0**; `scan` and pattern search work on older releases. Check with `ast-grep --version`.

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

The installer detects your platform, downloads the matching parser library from the GitHub release for the checked-out version into `lib/`, and copies `sgconfig.yml` into place. If no prebuilt library exists, it builds one with the pinned tree-sitter CLI (needs Node.js and a C compiler).

**Manual:**

```bash
cp path/to/tree-sitter-nextflow/sgconfig.yml .
# Download libnextflow-<platform>.<ext> from the GitHub release into lib/<platform>/.
# For a global install, edit sgconfig.yml so libraryPath uses absolute paths.
```

### 3. Other platforms

If no prebuilt library matches your platform, build one yourself:

```bash
npm ci
npx tree-sitter build --output libnextflow.so   # or .dylib on macOS
```

Then point `sgconfig.yml`'s `libraryPath` at the result.

## Quick start

Run from a directory where `sgconfig.yml` is discoverable (the project root, or anywhere if installed `--global`):

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

> Metavariables are written `$NAME` / `$$$`, the same as any ast-grep language. `sgconfig.yml` sets `expandoChar: _` so the parser can tokenize patterns (Nextflow uses `$` for string interpolation); ast-grep maps `$`↔`_` internally, so you do **not** write `_NAME` yourself. See [patterns.md](patterns.md).
