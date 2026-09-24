# ast-grep for Nextflow

This grammar ships a ready-to-use [ast-grep](https://ast-grep.github.io/) distribution so you can search, lint, refactor, and outline Nextflow code structurally (by AST, not text).

- [Setup](#setup) — install ast-grep and the Nextflow distribution
- [patterns.md](patterns.md) — pattern syntax and a Nextflow pattern library
- [outline.md](outline.md) — `ast-grep outline` for `.nf` files

## What's in the distribution

| Path                         | Purpose                                                        |
| ---------------------------- | -------------------------------------------------------------- |
| `sgconfig.yml`               | Registers `nextflow` as an ast-grep custom language            |
| `lib/<platform>/libnextflow.*` | Parser library, downloaded by the installer                  |
| `rules/`                     | Starter `scan` rules (linting / deprecations)                  |
| `outline/nextflow.yml`       | `ast-grep outline` extractor rules                             |
| `scripts/install-ast-grep.sh` | Installer that copies the above into your project or `~/.config/ast-grep` |

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

# or into ~/.config/ast-grep/, used with `ast-grep -c ~/.config/ast-grep/sgconfig.yml`
curl -fsSL https://raw.githubusercontent.com/nextflow-io/tree-sitter-nextflow/main/scripts/install-ast-grep.sh | bash -s -- --global
```

**From a clone:**

```bash
git clone https://github.com/nextflow-io/tree-sitter-nextflow.git
cd path/to/your/project
path/to/tree-sitter-nextflow/scripts/install-ast-grep.sh            # current directory
path/to/tree-sitter-nextflow/scripts/install-ast-grep.sh --global   # ~/.config/ast-grep/
```

The installer copies `sgconfig.yml`, `rules/`, and `outline/` into the target directory, and puts the parser library for your platform in `lib/<platform>/` next to them. ast-grep resolves the paths in `sgconfig.yml` relative to the file, so they have to sit side by side. Piped from curl, it installs the latest release. From a clone, it installs the checked-out version and downloads that version's library, or builds it with the pinned tree-sitter CLI if there's no prebuilt one (needs Node.js and a C compiler).

ast-grep only finds `sgconfig.yml` in the project directory or its parents, so a `--global` install needs `-c ~/.config/ast-grep/sgconfig.yml` on each command.

**Manual:**

```bash
cp -r path/to/tree-sitter-nextflow/{sgconfig.yml,rules,outline} .
# Download libnextflow-<platform>.<ext> from the GitHub release to lib/<platform>/libnextflow.<ext>.
```

### 3. Other platforms

If no prebuilt library matches your platform, build one yourself:

```bash
npm ci
npx tree-sitter build --output libnextflow.so   # or .dylib on macOS
```

Then add your platform's target triple to `libraryPath` in `sgconfig.yml`, pointing at the result.

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
