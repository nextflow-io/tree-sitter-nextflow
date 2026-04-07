# tree-sitter-nextflow

Nextflow grammar for [tree-sitter](https://github.com/tree-sitter/tree-sitter).

> **Target**: Nextflow Strict Syntax (v2 Parser) - `NXF_SYNTAX_PARSER=v2`
>
> This grammar is designed to support Nextflow's [strict syntax mode](https://nextflow.io/docs/latest/strict-syntax.html), focusing on the cleaner, more consistent v2 parser syntax patterns.

## Features

- **Core Nextflow Syntax**: Process definitions, workflows, variable declarations
- **Language Injection**: Bash/shell syntax highlighting in script blocks
- **Expressions**: Binary operators, lists, maps, function calls
- **Control Flow**: If/else statements, blocks
- **Channel Operations**: `Channel.from()`, `Channel.value()`, `Channel.of()` with pipe operations

## Development Status

**Current Test Coverage**: 28/80 tests passing (35%)

- ✅ **Core Features**: Variable declarations, process definitions, script injection
- ✅ **Expressions**: Binary operations, lists, maps, channel operations
- ✅ **Control Flow**: If/else statements, function calls
- 🚧 **In Progress**: String interpolation, advanced workflows, closures
- ⏳ **Future**: Configuration files, error handling, advanced channel operators

## AST-grep Integration

This grammar includes full [ast-grep](https://ast-grep.github.io/) support for advanced Nextflow code analysis, linting, and refactoring.

### Quick Install

Install ast-grep support with a single command:

```bash
curl -fsSL https://raw.githubusercontent.com/nextflow-io/tree-sitter-nextflow/main/scripts/install-ast-grep.sh | bash
```

For global installation:

```bash
curl -fsSL https://raw.githubusercontent.com/nextflow-io/tree-sitter-nextflow/main/scripts/install-ast-grep.sh | bash -s -- --global
```

### Installation

#### Option 1: Automated Installation (Recommended)

Use the installation script to set up ast-grep for your project:

```bash
# Clone or download the repository
git clone https://github.com/nextflow-io/tree-sitter-nextflow.git
cd tree-sitter-nextflow

# Run the installation script
./scripts/install-ast-grep.sh

# Or install globally
./scripts/install-ast-grep.sh --global
```

The script will:

- Detect your platform (macOS, Linux)
- Verify the appropriate parser library exists
- Copy `sgconfig.yml` to your project or `~/.config/ast-grep/`

#### Option 2: Manual Installation

If you prefer manual setup or need a custom configuration:

```bash
# 1. Copy sgconfig.yml to your Nextflow project
cp path/to/tree-sitter-nextflow/sgconfig.yml .

# 2. Update libraryPath if needed (for global install)
# Edit sgconfig.yml and use absolute paths to lib/ directory
```

#### Platform Support

Pre-built parser libraries are included for:

- ✅ macOS ARM64 (Apple Silicon) - `lib/macos-arm64/libnextflow.dylib`
- ✅ Linux x64 - `lib/linux-x64/libnextflow.so`

For other platforms, you can build the library yourself:

```bash
tree-sitter build --output libnextflow.so
```

### Quick Start

Once installed, ast-grep works seamlessly with Nextflow files:

```bash
# Search for process definitions
ast-grep -l nextflow -p 'process _NAME { ___ }' .

# Run built-in rules
ast-grep scan

# Find deprecated Channel.from() usage
ast-grep -l nextflow -p 'Channel.from($___)' .
```

### Configuration

The project includes `sgconfig.yml` with platform-specific parser libraries:

- **Custom Language**: Nextflow with platform detection
- **File Extensions**: `.nf`, `.config`
- **expandoChar**: `_` (use `_VAR` instead of `$VAR` in patterns, since Nextflow uses `$` for string interpolation)

### Built-in Rules

The `rules/` directory includes linting rules for:

- **Process naming conventions**: Enforce UPPERCASE or camelCase naming
- **Channel operations**: Detect deprecated patterns (Channel.from, into, separate)
- **DSL2 best practices**: Workflow structure, tuple inputs, named emits
- **String interpolation**: Single vs double quotes, GString usage

### Pattern Examples

```bash
# Find all process definitions
ast-grep -l nextflow -p 'process _NAME { ___ }'

# Find workflows with take/main/emit structure
ast-grep -l nextflow -p 'workflow _NAME { take: ___ main: ___ emit: ___ }'

# Find deprecated Channel.from() (flagged by rules)
ast-grep -l nextflow -p 'Channel.from($$$)'

# Search for hardcoded paths
ast-grep -l nextflow -p 'path("/___")'

# Find string interpolation
ast-grep -l nextflow -p '"$___"'
```

**Note**: Use `_` instead of `$` in patterns due to expandoChar configuration.

### Custom Rules

Create YAML files in `rules/` directory:

```yaml
id: my-custom-rule
language: nextflow
message: Custom rule message
severity: warning
rule:
  pattern: process _NAME { ___ }
```

See [ast-grep rule documentation](https://ast-grep.github.io/guide/rule-config.html) for details.

### Benefits

- **Code Search**: Fast semantic search across Nextflow codebases
- **Refactoring**: Automated migrations (e.g., DSL1 → DSL2)
- **Linting**: Enforce coding standards and best practices
- **CI/CD**: Integrate rules into continuous integration pipelines

## References

- [Nextflow ANTLR grammar](https://github.com/nextflow-io/nextflow/tree/master/modules/nf-lang/src/main/antlr)
- [Nextflow TextMate grammar](https://github.com/nextflow-io/vscode-language-nextflow/tree/main/syntaxes)
- [AST-grep Custom Languages](https://ast-grep.github.io/advanced/custom-language.html)
