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
- `echo 'code' | tree-sitter parse` - Parse code directly from stdin
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

Test files in `test/corpus/` are organized by feature and complexity level in subdirectories:

### `basic/` - Core Language Features (High Priority)
- `basic_declarations.txt` - Core language constructs
- `variable_declarations.txt` - Variable syntax and assignments
- `control_structures.txt` - if/else, loops
- `binary_expressions.txt` - Operators and expressions
- `comments.txt` - Comment syntax
- `data_structures.txt` - Lists, maps, basic data types

### `strict_syntax_v2/` - Modern Nextflow Features (Priority Focus)
- `strict_syntax_v2.txt` - Complete modern syntax test suite (9 tests, 100% passing)
  - Variable type annotations: `def x: Integer = 1`
  - String interpolation with escape sequences: `"${id}\\.f(?:ast)?q"`
  - Collection iteration: `['a','b'].each { item -> ... }`
  - Assert statements, environment functions, and more

### `dsl2/` - DSL2 Specific Features
- `process_definition.txt` - Process syntax with input/output/script blocks
- `workflow_definition.txt` - Workflow syntax with take/main/emit
- `channel_operations.txt` - Channel operations and factories
- `dsl2_features.txt` - DSL2-specific language constructs

### `string_interpolation/` - String Processing
- `string_interpolation.txt` - GString features and interpolation patterns
- `string_interpolation_debug.txt` - Edge cases and debugging scenarios

### `advanced/` - Complex Features (Can be `:skip`)
- `advanced_channels.txt`, `advanced_process.txt`, `advanced_strings.txt` - Complex variations
- `closures.txt` - Closure syntax and functional programming
- `error_handling.txt` - try/catch and error scenarios
- `functions_and_methods.txt` - Function definitions and calls
- `operators_and_functions.txt` - Advanced operator usage
- `configuration.txt` - Configuration file parsing
- `script_injection.txt` - Script security features

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

**1. Quick Code Testing with Pipes**
```bash
# Test simple expressions directly
echo '"hello"' | tree-sitter parse
echo 'process foo { "echo hello" }' | tree-sitter parse
echo '$var = "test"' | tree-sitter parse

# Test string interpolation patterns
echo '"${var}"' | tree-sitter parse
echo '"$var.field"' | tree-sitter parse
echo '"!\$var"' | tree-sitter parse  # Testing escape sequences

# Combine with grep to check for specific nodes or errors
echo 'if (x > 1) { println "yes" }' | tree-sitter parse | grep -E "ERROR|MISSING"
```

**2. Quick Status Overview**
```bash
# Get concise failing test summary (saves ~8000 tokens vs full output)
tree-sitter test 2>/dev/null | grep -E "✗|✓|⌀|failures:" | head -20

# Count status by type
tree-sitter test 2>/dev/null | grep -E "✗|✓|⌀" | cut -c7-9 | sort | uniq -c
```

**3. Test Specific Files and Directories**
```bash
# Test only specific corpus files (much faster iteration)
tree-sitter test --file-name variable_declarations.txt
tree-sitter test --file-name process_definition.txt
tree-sitter test --file-name strict_syntax_v2.txt      # Focus on modern features

# Update test expectations for specific file after grammar changes
tree-sitter test --file-name variable_declarations.txt --update
tree-sitter test --file-name strict_syntax_v2.txt -u  # Update modern syntax tests

# All tests automatically include subdirectories - TreeSitter finds them
# Tests are shown with directory prefix: "strict_syntax_v2: String interpolation..."
```

**3b. Focus Development by Feature Area**
```bash
# Priority development order for new agents:
tree-sitter test --file-name strict_syntax_v2.txt          # 1. Modern features (100% passing)
tree-sitter test --file-name process_definition.txt        # 2. Core DSL2 features
tree-sitter test --file-name workflow_definition.txt       # 3. Workflow syntax
tree-sitter test --file-name string_interpolation.txt      # 4. String processing

# Skip advanced features initially (they contain :skip tests)
```

**4. Focus on Single Test**
```bash
# When debugging specific failing tests, view minimal context
tree-sitter test --file-name binary_expressions.txt | head -30
```

**5. Parser Generation Status**
```bash
# Check if generation succeeds without running tests
tree-sitter generate >/dev/null 2>&1 && echo "✓ Generation OK" || echo "✗ Generation failed"
```

**6. Test Development Workflow**
1. **Enable single test**: Remove `:skip` from one test case
2. **Target test**: `tree-sitter test --file-name <specific_file.txt>`
3. **Fix grammar**: Edit `grammar.js` based on error output
4. **Regenerate**: `tree-sitter generate`
5. **Retest**: Repeat step 2
6. **Update expectations**: Use `tree-sitter test --update` to automatically update expected AST structures

**Important**: The `--update` flag automatically updates test expectations to match current parser output. Tests containing ERROR or MISSING nodes will not be updated and require manual grammar fixes first.

**7. Progress Tracking Pattern**
```bash
# Track progression over time
tree-sitter test 2>/dev/null | grep -c "✓.*32m" # Count passing
tree-sitter test 2>/dev/null | grep -c "✗.*31m" # Count failing
tree-sitter test 2>/dev/null | grep -c "⌀.*33m" # Count skipped
```

**Note**: First-time compilation after `tree-sitter generate` takes longer due to automatic C compilation. Subsequent runs are much faster.

## TreeSitter Grammar Development

For comprehensive TreeSitter grammar development patterns, debugging techniques, and solutions to common issues, see: `~/.claude/notes/treesitter-grammar-development.md`

Key insights include:
- Precedence conflict resolution strategies
- Binary expression extension patterns
- String interpolation architecture
- Method call and closure implementation
- AST node aliasing techniques
- Testing and debugging workflows

## References

The grammar is based on:
- [Nextflow ANTLR grammar](https://github.com/nextflow-io/nextflow/tree/master/modules/nf-lang/src/main/antlr) - Official language specification
- [Nextflow TextMate grammar](https://github.com/nextflow-io/vscode-language-nextflow/tree/main/syntaxes) - VSCode syntax highlighting rules
