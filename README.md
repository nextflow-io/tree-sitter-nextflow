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

### Quick Start

The repository is pre-configured for ast-grep. Simply install ast-grep and start using it:

```bash
# Install ast-grep (if not already installed)
npm install --global @ast-grep/cli
# or: cargo install ast-grep

# Search for process definitions
ast-grep -l nextflow -p 'process _NAME { ___ }' .

# Run built-in rules
ast-grep scan

# Find deprecated Channel.from() usage
ast-grep -l nextflow -p 'Channel.from($___)' .
```

### Configuration

The project includes `sgconfig.yml` with:

- **Custom Language**: Nextflow parser (`libnextflow.so`)
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
