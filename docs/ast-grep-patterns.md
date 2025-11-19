# AST-Grep Pattern Guide for Nextflow

This guide provides comprehensive patterns and examples for using ast-grep with Nextflow code.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Pattern Syntax](#pattern-syntax)
- [Common Patterns](#common-patterns)
- [Advanced Patterns](#advanced-patterns)
- [Troubleshooting](#troubleshooting)

## Quick Reference

### Basic Commands

```bash
# Search with pattern
ast-grep -l nextflow -p 'PATTERN' FILE_OR_DIR

# Scan with rules
ast-grep scan

# Interactive mode
ast-grep -l nextflow -i

# Show AST structure (debug)
ast-grep -l nextflow --debug-query 'PATTERN' FILE

# Replace pattern
ast-grep -l nextflow -p 'OLD_PATTERN' -r 'NEW_PATTERN' FILE
```

### Pattern Wildcards

| Wildcard | Meaning              | Example                 |
| -------- | -------------------- | ----------------------- |
| `_`      | Single node          | `process _NAME { ___ }` |
| `___`    | Multiple nodes (any) | `Channel.from(___)`     |
| `$$$`    | Multiple statements  | `workflow { $$$ }`      |

**Important**: Due to `expandoChar: _` configuration, use `_` instead of `$` in patterns.

## Pattern Syntax

### Variable Matching

Match and capture parts of code:

```bash
# Match process name
ast-grep -l nextflow -p 'process _NAME { ___ }'

# Match workflow with name
ast-grep -l nextflow -p 'workflow _WORKFLOW { ___ }'

# Match variable assignment
ast-grep -l nextflow -p 'def _VAR = _VALUE'
```

### Multiple Nodes

Use `___` (three underscores) for multiple nodes:

```bash
# Match any channel operation arguments
ast-grep -l nextflow -p 'Channel.from(___)'

# Match any function call
ast-grep -l nextflow -p '_FUNC(___)'

# Match any list contents
ast-grep -l nextflow -p '[___]'
```

### Statement Wildcards

Use `$$$` for multiple statements (converted to `___` due to expandoChar):

```bash
# Match process with any body
ast-grep -l nextflow -p 'process _NAME { $$$ }'

# Match workflow with any content
ast-grep -l nextflow -p 'workflow { $$$ }'

# Match script block with any commands
ast-grep -l nextflow -p 'script: """ $$$ """'
```

## Common Patterns

### Process Patterns

```bash
# Find all process definitions
ast-grep -l nextflow -p 'process _NAME { ___ }'

# Find processes with specific directive
ast-grep -l nextflow -p 'process _NAME { publishDir ___ $$$ }'

# Find process inputs
ast-grep -l nextflow -p 'input: ___'

# Find process outputs
ast-grep -l nextflow -p 'output: ___'

# Find process script blocks
ast-grep -l nextflow -p 'script: """ $$$ """'

# Find tuple inputs
ast-grep -l nextflow -p 'tuple val(_ID), path(_FILE)'
```

### Workflow Patterns

```bash
# Find workflow definitions
ast-grep -l nextflow -p 'workflow _NAME { ___ }'

# Find workflows with take block
ast-grep -l nextflow -p 'workflow _NAME { take: ___ }'

# Find workflows with emit block
ast-grep -l nextflow -p 'workflow { $$$ emit: ___ }'

# Find workflow calls
ast-grep -l nextflow -p '_WORKFLOW(___)'
```

### Channel Patterns

```bash
# Find Channel.from() (deprecated)
ast-grep -l nextflow -p 'Channel.from(___)'

# Find Channel.of()
ast-grep -l nextflow -p 'Channel.of(___)'

# Find Channel.fromPath()
ast-grep -l nextflow -p 'Channel.fromPath(___)'

# Find channel operations with map
ast-grep -l nextflow -p '_CH.map { ___ }'

# Find channel operations with filter
ast-grep -l nextflow -p '_CH.filter { ___ }'

# Find into operator (deprecated)
ast-grep -l nextflow -p '_CH.into { ___ }'
```

### Variable and Parameter Patterns

```bash
# Find parameter declarations
ast-grep -l nextflow -p 'params._NAME = ___'

# Find variable declarations with def
ast-grep -l nextflow -p 'def _VAR = ___'

# Find variable declarations with type
ast-grep -l nextflow -p 'def _VAR: _TYPE = ___'

# Find assignments
ast-grep -l nextflow -p '_VAR = _VALUE'
```

### String and Interpolation Patterns

```bash
# Find string interpolation
ast-grep -l nextflow -p '"$___"'

# Find strings with variables
ast-grep -l nextflow -p '"${_VAR}"'

# Find single-quoted strings
ast-grep -l nextflow -p "'___'"

# Find multiline strings
ast-grep -l nextflow -p '"""___"""'

# Find GString usage
ast-grep -l nextflow -p '"_TEXT${_VAR}_TEXT"'
```

### Control Flow Patterns

```bash
# Find if statements
ast-grep -l nextflow -p 'if (_COND) { $$$ }'

# Find if-else statements
ast-grep -l nextflow -p 'if (_COND) { $$$ } else { $$$ }'

# Find each loops
ast-grep -l nextflow -p '_LIST.each { ___ }'

# Find closures
ast-grep -l nextflow -p '{ _PARAMS -> $$$ }'
```

### Include and Import Patterns

```bash
# Find include statements
ast-grep -l nextflow -p 'include { ___ } from ___'

# Find specific module includes
ast-grep -l nextflow -p 'include { _MODULE } from _PATH'

# Find wildcard includes
ast-grep -l nextflow -p 'include _MODULE from ___'
```

## Advanced Patterns

### Using Rules for Complex Matching

Create a rule file for more complex patterns:

```yaml
# rules/custom-pattern.yml
id: find-uncached-processes
language: nextflow
message: Process should have cache directive
severity: hint
rule:
  pattern: |
    process _NAME {
      $$$
    }
  not:
    has:
      pattern: cache ___
```

### Contextual Matching

Match patterns within specific contexts:

```yaml
# Find variables used in string interpolation
id: string-var-usage
language: nextflow
rule:
  pattern: $_VAR
  inside:
    pattern: '"$___"'
```

### Combining Patterns

```yaml
# Find deprecated patterns with alternatives
id: channel-from-to-of
language: nextflow
message: Replace Channel.from() with Channel.of()
rule:
  pattern: Channel.from($___)
fix: Channel.of($___)
```

### Field Matching

Match specific fields in structures:

```yaml
# Find publishDir with specific mode
id: publishdir-mode
language: nextflow
rule:
  pattern: publishDir $_PATH, mode: '$_MODE'
  follows:
    pattern: $_MODE
    regex: 'copy|move|link'
```

## Troubleshooting

### Common Issues

#### 1. Pattern Not Matching

**Problem**: Pattern doesn't match expected code.

**Solution**: Use `--debug-query` to see the AST structure:

```bash
echo 'process TEST { script: "echo hello" }' | ast-grep -l nextflow --debug-query 'process _NAME { ___ }'
```

Compare the pattern with the actual AST structure.

#### 2. Dollar Sign in Patterns

**Problem**: Pattern with `$` doesn't work.

**Solution**: Use `_` instead of `$` due to `expandoChar: _` configuration:

```bash
# Wrong
ast-grep -l nextflow -p 'process $NAME { $$$ }'

# Correct
ast-grep -l nextflow -p 'process _NAME { ___ }'
```

#### 3. String Interpolation

**Problem**: Matching strings with variable interpolation.

**Solution**: Be careful with quotes and escaping:

```bash
# Match any interpolated string
ast-grep -l nextflow -p '"$___"'

# Match specific variable interpolation
ast-grep -l nextflow -p '"${_VAR}"'
```

#### 4. Parser Not Found

**Problem**: `ast-grep` can't find the Nextflow parser.

**Solution**: Verify the library path in `sgconfig.yml`:

```bash
# Check if library exists
ls -lh libnextflow.so

# Rebuild if needed
tree-sitter build --output libnextflow.so

# Verify symbol
nm -g libnextflow.so | grep tree_sitter
```

#### 5. Multi-line Patterns

**Problem**: Pattern spans multiple lines.

**Solution**: Use YAML multi-line strings in rule files:

```yaml
rule:
  pattern: |
    workflow {
      take:
        ___
      main:
        ___
      emit:
        ___
    }
```

### Debugging Tips

1. **Start Simple**: Begin with simple patterns and gradually add complexity

2. **Use Test Files**: Create small test files to validate patterns:

   ```bash
   echo 'process TEST { script: "echo hello" }' > test.nf
   ast-grep -l nextflow -p 'process _NAME { ___ }' test.nf
   ```

3. **Check AST Structure**: Use tree-sitter to see how code is parsed:

   ```bash
   echo 'YOUR_CODE' | tree-sitter parse --scope source.nextflow
   ```

4. **Validate Rules**: Test rules before committing:

   ```bash
   ast-grep scan --rule rules/your-rule.yml
   ```

5. **Use Interactive Mode**: Experiment with patterns interactively:
   ```bash
   ast-grep -l nextflow -i
   ```

## Real-World Examples

### Migration: DSL1 to DSL2

Find and replace deprecated patterns:

```bash
# Find Channel.from() usage
ast-grep -l nextflow -p 'Channel.from(___)' -r 'Channel.of(___)'

# Find into operators
ast-grep -l nextflow -p '_CH.into { ___ }' .
```

### Code Quality Checks

Enforce standards across codebase:

```bash
# Find processes without publishDir
ast-grep scan --rule rules/dsl2-best-practices.yml

# Find hardcoded paths
ast-grep -l nextflow -p 'path("/___")' .

# Find single quotes with interpolation (error)
ast-grep scan --rule rules/string-interpolation.yml
```

### Refactoring

Automated code transformations:

```bash
# Rename process directive
ast-grep -l nextflow -p 'container ___' -r 'container ___'

# Update parameter names
ast-grep -l nextflow -p 'params.old_name' -r 'params.new_name'
```

## Resources

- [AST-grep Documentation](https://ast-grep.github.io/)
- [AST-grep Rule Config](https://ast-grep.github.io/guide/rule-config.html)
- [Tree-sitter Nextflow Grammar](../grammar.js)
- [Example Rules](../rules/)

## Contributing Patterns

Found a useful pattern? Consider adding it to the rules directory:

1. Create a new rule file in `rules/`
2. Test with `ast-grep scan`
3. Document in this guide
4. Submit a pull request

---

**Note**: This is a living document. As the Nextflow grammar evolves, patterns may need updates.
