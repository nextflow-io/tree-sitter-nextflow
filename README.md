
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

## Future Enhancements

### AST-grep Integration
This grammar is designed to support [ast-grep](https://ast-grep.github.io/) for advanced Nextflow code analysis and transformation.

**Setup Steps**:
1. **Build Dynamic Library**:
   ```bash
   # Compile grammar as shared library for ast-grep
   tree-sitter build --output nextflow.so
   ```

2. **Configure AST-grep** (`sgconfig.yml`):
   ```yaml
   customLanguages:
     nextflow:
       libraryPath: ./nextflow.so
       extensions: [nf, nextflow]
       expandoChar: "$"  # For Nextflow string interpolation
   ```

3. **Usage Examples**:
   ```bash
   # Search for process definitions
   ast-grep --lang nextflow 'process $NAME { $$$ }'
   
   # Find channel operations
   ast-grep --lang nextflow 'Channel.from($$$)'
   
   # Refactor variable declarations  
   ast-grep --lang nextflow 'def $VAR = $VALUE' --replace 'val $VAR = $VALUE'
   ```

**Benefits**:
- **Code Analysis**: Search patterns across large Nextflow codebases
- **Refactoring**: Automated code transformations and migrations
- **Quality Tools**: Custom linting rules for Nextflow best practices
- **IDE Features**: Enhanced editor support and IntelliSense

## References
- [Nextflow ANTLR grammar](https://github.com/nextflow-io/nextflow/tree/master/modules/nf-lang/src/main/antlr)
- [Nextflow TextMate grammar](https://github.com/nextflow-io/vscode-language-nextflow/tree/main/syntaxes)
- [AST-grep Custom Languages](https://ast-grep.github.io/advanced/custom-language.html)
