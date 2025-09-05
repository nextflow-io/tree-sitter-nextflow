# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a tree-sitter grammar for the Nextflow workflow language. Tree-sitter is an incremental parsing library that enables syntax highlighting, code folding, and other language features in editors. The grammar defines how to parse Nextflow scripts (.nf files), configuration files (.config), and test files (.nf.test).

## Key Commands

### Development and Testing
- `npm test` - Run Node.js bindings tests
- `npm start` - Launch tree-sitter playground for interactive testing
- `tree-sitter test` - Run grammar tests against corpus files
- `tree-sitter parse <file.nf>` - Parse a specific Nextflow file
- `tree-sitter generate` - Regenerate parser from grammar.js

### Building
- `tree-sitter build` - Generate C parser from grammar
- `tree-sitter build --wasm` - Build WebAssembly version
- `make` - Build C library using Makefile
- `cargo build` - Build Rust bindings

### Platform-specific builds
- Node.js: Uses `node-gyp-build` and `prebuildify`
- Rust: Standard cargo build process
- C: Makefile-based build system

## Architecture

### Core Components

**grammar.js** - The main grammar definition file that defines Nextflow language syntax rules. This uses tree-sitter's JavaScript DSL to specify:
- Nextflow-specific constructs (processes, workflows, includes)
- Groovy-based expressions and control structures  
- String interpolation patterns
- Channel operations and DSL2 features

**src/parser.c** - Generated C parser code (do not edit manually)

**test/corpus/** - Grammar test files in tree-sitter format:
- Each `.txt` file contains test cases with expected parse trees
- Tests cover all major Nextflow language features
- Format: test name, input code, expected AST output

### Language Bindings

**bindings/node/** - Node.js bindings for npm package
**bindings/rust/** - Rust crate bindings  
**bindings/c/** - C library headers

### Generated Files
- `src/grammar.json` - JSON representation of grammar
- `src/node-types.json` - Node type definitions
- Various compiled artifacts in src/

## Grammar Development Workflow

1. Modify `grammar.js` to add/change language rules
2. Run `tree-sitter generate` to regenerate parser
3. Add test cases to appropriate `test/corpus/*.txt` files
4. Run `tree-sitter test` to verify tests pass
5. Use `tree-sitter playground` for interactive debugging

## Nextflow Language Coverage

The grammar covers these major Nextflow features:
- Script declarations (process, workflow, function definitions)
- DSL2 syntax and features
- Channel operations and factories
- Configuration directives
- Include/import statements
- Parameter declarations
- Control structures (if/else, try/catch)
- String interpolation with GString syntax
- Groovy expressions and data structures

## Testing Strategy

Test files in `test/corpus/` are organized by feature:
- `basic_declarations.txt` - Core language constructs
- `process_definition.txt` - Process syntax
- `workflow_definition.txt` - Workflow syntax  
- `string_interpolation.txt` - GString features
- `channel_operations.txt` - Channel DSL
- `control_structures.txt` - Control flow

Each test follows tree-sitter format:
```
==================
Test Name
==================

input code here

---

(expected_ast_structure)
```

### Efficient Testing for LLM Agents

To minimize token usage and maintain tight context when working as an LLM agent:

**1. Quick Status Overview**
```bash
# Get concise failing test summary (saves ~8000 tokens vs full output)
tree-sitter test 2>/dev/null | grep -E "✗|✓|⌀|failures:" | head -20

# Count status by type
tree-sitter test 2>/dev/null | grep -E "✗|✓|⌀" | cut -c7-9 | sort | uniq -c
```

**2. Test Specific Files**  
```bash
# Test only specific corpus files (much faster iteration)
tree-sitter test --file-name variable_declarations.txt
tree-sitter test --file-name process_definition.txt
tree-sitter test --file-name binary_expressions.txt

# Update test expectations for specific file after grammar changes
tree-sitter test --file-name variable_declarations.txt --update
tree-sitter test --file-name variable_declarations.txt -u  # shorthand
```

**3. Focus on Single Test**
```bash
# When debugging specific failing tests, view minimal context
tree-sitter test --file-name binary_expressions.txt | head -30
```

**4. Parser Generation Status**
```bash
# Check if generation succeeds without running tests
tree-sitter generate >/dev/null 2>&1 && echo "✓ Generation OK" || echo "✗ Generation failed"
```

**5. Test Development Workflow**
1. **Enable single test**: Remove `:skip` from one test case
2. **Target test**: `tree-sitter test --file-name <specific_file.txt>`  
3. **Fix grammar**: Edit `grammar.js` based on error output
4. **Regenerate**: `tree-sitter generate`
5. **Retest**: Repeat step 2
6. **Update expectations**: Use `tree-sitter test --update` to automatically update expected AST structures

**Important**: The `--update` flag automatically updates test expectations to match current parser output. Tests containing ERROR or MISSING nodes will not be updated and require manual grammar fixes first.

**6. Progress Tracking Pattern**
```bash
# Track progression over time
tree-sitter test 2>/dev/null | grep -c "✓.*32m" # Count passing
tree-sitter test 2>/dev/null | grep -c "✗.*31m" # Count failing  
tree-sitter test 2>/dev/null | grep -c "⌀.*33m" # Count skipped
```

**Note**: First-time compilation after `tree-sitter generate` takes longer due to automatic C compilation. Subsequent runs are much faster.

## References

The grammar is based on:
- [Nextflow ANTLR grammar](https://github.com/nextflow-io/nextflow/tree/master/modules/nf-lang/src/main/antlr) - Official language specification
- [Nextflow TextMate grammar](https://github.com/nextflow-io/vscode-language-nextflow/tree/main/syntaxes) - VSCode syntax highlighting rules