# Efficient Tree-sitter Testing Strategies for LLM Agents

## Token-Efficient Commands

### Quick Status Overview (Saves ~8000 tokens vs full output)
```bash
# Concise test summary
tree-sitter test 2>/dev/null | grep -E "✗|✓|⌀|failures:" | head -20

# Count by status type  
tree-sitter test 2>/dev/null | grep "✓" | wc -l  # Passing
tree-sitter test 2>/dev/null | grep "✗" | wc -l  # Failing
tree-sitter test 2>/dev/null | grep "⌀" | wc -l  # Skipped
```

### Targeted File Testing (Fast iteration)
```bash
# Test specific corpus files only
tree-sitter test --file-name variable_declarations.txt
tree-sitter test --file-name process_definition.txt
tree-sitter test --file-name string_interpolation.txt

# Quick generation check
tree-sitter generate >/dev/null 2>&1 && echo "✓ Generation OK" || echo "✗ Generation failed"
```

### Debug Specific Parsing Issues
```bash
# Test individual expressions
echo 'def x = 1 + 2' | tree-sitter parse
echo '"Hello ${name}!"' | tree-sitter parse

# With debug logging (verbose)
echo 'if (x > 0) { println "yes" }' | tree-sitter parse --debug

# Check field structure
tree-sitter parse --show-fields < test.nf
```

## Development Workflow Pattern

### 1. Enable Single Test
Remove `:skip` from one test case at a time

### 2. Target Test  
```bash
tree-sitter test --file-name <specific_file.txt>
```

### 3. Fix Grammar
Edit `grammar.js` based on error output

### 4. Regenerate & Test
```bash
tree-sitter generate && tree-sitter test --file-name <file.txt>
```

### 5. Update Test Expectations
Modify AST expectations in test files if needed

## Common Patterns

### Test File Structure
```
==================
Test Name
:skip                    # Remove to enable
==================

nextflow code here

---

(expected_ast_structure) # Update to match grammar output
```

### Grammar Development
```javascript
// Always include in simple_expression choices
simple_expression: $ => choice(
  $.new_feature,        // Add new features here
  $.existing_features,
  // ...
),

// Use precedence to resolve conflicts
new_rule: $ => prec(N, seq(/* rule definition */))
```

## Test Categories by Priority

### High Impact (Core Language)
- `string_interpolation.txt` - 6 tests, fundamental feature
- `closures.txt` - 4 tests, essential for Nextflow DSL
- `control_structures.txt` - 6 tests, program logic

### Medium Impact (DSL Features) 
- `channel_operations.txt` - 7 tests, Nextflow-specific
- `workflow_definition.txt` - 4 tests, core construct
- `data_structures.txt` - 3 tests, collections

### Lower Priority (Advanced)
- `configuration.txt` - 3 tests, config files
- `error_handling.txt` - 3 tests, exception handling
- `dsl2_features.txt` - 3 tests, advanced DSL

## Performance Notes

### Compilation Timing
- **First generation**: Slower due to C compilation
- **Subsequent generations**: Much faster
- **Test-specific**: Faster than full test suite

### Token Management
- Use `--file-name` to avoid parsing all corpus files
- Use `2>/dev/null` to suppress verbose error output
- Use `head -N` to limit output length for large failures

## Grammar Debugging Tools

### Tree-sitter CLI Options
- `--debug`: Verbose parsing/lexing logs
- `--debug-graph`: Visual parse tree graphs
- `--debug-build`: Debug symbols for gdb/lldb
- `--stat`: Parsing performance statistics

### Custom Debug Scripts
```bash
# Quick parse check
parse_test() { echo "$1" | tree-sitter parse; }

# Compare expected vs actual
diff_test() {
  tree-sitter test --file-name "$1.txt" > actual.out 2>&1
  # Compare with expected patterns
}
```

## Anti-patterns to Avoid

### Don't Do These (Token Waste)
- `tree-sitter test` without `--file-name` (parses everything)
- Full error output without `head` limits  
- Reading entire corpus files when debugging single tests
- Regenerating parser without checking generation success first

### Do These Instead
- Target specific failing tests with `--file-name`
- Use `grep` patterns to extract relevant error sections
- Test individual expressions with `echo | tree-sitter parse`  
- Check generation success before running tests