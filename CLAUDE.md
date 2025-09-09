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

## TreeSitter Grammar Development Insights

Based on achieving 100% pass rate on Nextflow strict syntax v2 features, here are critical patterns and solutions for TreeSitter grammar development:

### Precedence Conflict Resolution

**Issue**: When multiple rules can match the same input, TreeSitter chooses based on precedence and order.

**Solutions**:
```javascript
// Use different precedence levels to resolve conflicts
binary_expression: $ => prec.left(3, seq(...))      // Higher precedence
command_expression: $ => prec(1, seq(...))          // Lower precedence

// Use prec.left/prec.right for associativity in recursive rules  
binary_expression: $ => prec.left(3, seq(
  $.binary_expression,  // Left-associative: a + b + c = (a + b) + c
  '+',
  $.binary_expression
))
```

**Key Learning**: When `assert 'string' =~ "other"` was parsed incorrectly, the issue was equal precedence (3) between `binary_expression` and `command_expression`. Reducing command expression precedence to 1 resolved the conflict.

### Choice Order and Grammar Structure

**Rule**: In `choice()`, TreeSitter tries options in order. Put specific patterns before general ones.

```javascript
simple_expression: $ => choice(
  $.binary_expression,                    // Specific: requires operator
  $.parenthesized_expression,             // Specific: requires ()
  $.command_expression,                   // General: just identifier + args
  $.identifier                            // Most general: single token
)
```

### Binary Expression Extension Pattern

To support new expression types in binary operators:

```javascript
binary_expression: $ => prec.left(3, seq(
  field('left', choice(
    $.identifier,
    $.string_literal,
    $.interpolated_string,        // ADD: New expression type
    $.parenthesized_expression,
    $.binary_expression
  )),
  field('operator', choice('=~', '+', '-', /* ... */)),
  field('right', choice(
    $.identifier,
    $.string_literal,
    $.interpolated_string,        // ADD: Same type on right side
    $.parenthesized_expression,
    $.binary_expression
  ))
))
```

### String Interpolation Architecture

**Problem**: Conflicts between `string_literal` and `interpolated_string` when both match double quotes.

**Solution**: Separate by quote type:
```javascript
string_literal: $ => seq("'", /[^']*/, "'"),           // Single quotes only
interpolated_string: $ => seq('"', repeat(choice(      // Double quotes only
  $.string_content,
  $.interpolation,
  $.escape_sequence
)), '"')
```

### Method Call Extensions

To enable method calls on complex expressions (e.g., `[1,2,3].each { }`):

```javascript
method_call: $ => prec(7, seq(
  choice(
    $.identifier,                // obj.method()
    $.list,                      // [1,2,3].method()
    $.interpolated_string,       // "str".method()
    $.parenthesized_expression   // (expr).method()
  ),
  '.', $.identifier,
  choice(
    seq('(', commaSep($.simple_expression), ')'),
    $.closure
  )
))
```

### Closure and Block Structure

**Challenge**: Closures provide their own braces, so inner blocks can't have braces.

**Solution**: Separate rules for closure context:
```javascript
closure: $ => seq('{', $.closure_block, '}'),
closure_block: $ => alias(repeat1(choice(
  $.expression_statement,
  $.if_statement,
  // ... no extra braces needed
)), 'block')
```

### AST Node Aliasing

Control AST node names without changing grammar structure:
```javascript
closure_parameter: $ => alias($.identifier, 'parameter'),
closure_block: $ => alias(repeat1(...), 'block')
```

### Statement vs Function Disambiguation

**Language Rule**: In Groovy/Java, `assert` is a statement keyword, not a function.

**Implementation**:
```javascript
// Add to top-level choices
source_file: $ => repeat(choice(
  $.assert_statement,           // Before expression_statement
  $.expression_statement,
  // ...
)),

assert_statement: $ => seq('assert', $.simple_expression)
```

## Grammar Testing Best Practices

### Isolated Feature Testing
```bash
# Create temporary test files to avoid shell escaping issues
echo 'def x: Integer = 1' > /tmp/test.nf
tree-sitter parse /tmp/test.nf

# Test complex expressions step by step
echo 'x =~ y' | tree-sitter parse                    # Test binary op
echo '"${var}"' | tree-sitter parse                  # Test interpolation  
echo 'assert x =~ y' | tree-sitter parse            # Test combined
```

### Test Expectation Management
```bash
# Update test expectations after grammar fixes
tree-sitter test --file-name specific_test.txt --update

# Tests with ERROR nodes must be fixed manually first
tree-sitter test --file-name test.txt | grep ERROR  # Check for errors
# Fix grammar, then --update will work
```

### Precedence Debugging Process
1. **Start simple**: Test individual components work
2. **Add complexity**: Combine features gradually  
3. **Check conflicts**: Look for unexpected ERROR nodes
4. **Adjust precedence**: Use different precedence levels
5. **Verify**: Test edge cases and combinations

### Progress Tracking
```bash
# Monitor test improvement over time
tree-sitter test 2>/dev/null | grep -c "✓.*32m"     # Passing count
tree-sitter test 2>/dev/null | grep -c "✗.*31m"     # Failing count

# Focus on specific feature areas
tree-sitter test --file-name strict_syntax_v2.txt   # Target specific files
```

## Common Grammar Issues & Solutions

### Issue: "Multiple extension points" Error
**Cause**: Registering parent and child extension classes
**Solution**: Only register the leaf extension class

### Issue: String interpolation not working
**Cause**: Conflicts between string literal types
**Solution**: Separate single-quote and double-quote string rules

### Issue: Method calls failing on expressions
**Cause**: Method call only accepts simple identifiers  
**Solution**: Extend method call choice to include complex expressions

### Issue: Binary operators not working with new expression types
**Cause**: New expression type not in binary expression field choices
**Solution**: Add new type to both `left` and `right` field choices

### Issue: Precedence conflicts causing unexpected parsing
**Cause**: Multiple rules with same precedence
**Solution**: Use different precedence levels and test incrementally

## References

The grammar is based on:
- [Nextflow ANTLR grammar](https://github.com/nextflow-io/nextflow/tree/master/modules/nf-lang/src/main/antlr) - Official language specification
- [Nextflow TextMate grammar](https://github.com/nextflow-io/vscode-language-nextflow/tree/main/syntaxes) - VSCode syntax highlighting rules