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

| Wildcard | Meaning            | Example                 |
| -------- | ------------------ | ----------------------- |
| `$NAME`  | Single named node  | `process $NAME { $$$ }` |
| `$_`     | Single node (any)  | `$_.into { $$$ }`       |
| `$$$`    | Zero or more nodes | `Channel.from($$$)`     |

**Metavariables use the standard `$NAME` / `$$$` syntax**, the same as every
other ast-grep language. `sgconfig.yml` sets `expandoChar: _` only so the parser
can tokenize patterns (Nextflow uses `$` for string interpolation); ast-grep
maps `$`↔`_` internally, so you write `$NAME`, not `_NAME`. In
`constraints`/`fix`/`name`, reference a captured metavariable by its bare name
(`$NAME` → key `NAME`).

> Verified against ast-grep 0.43+/0.44. Older releases (<= 0.40.x) failed to
> parse some Nextflow block patterns.

## Pattern Syntax

### Variable Matching

Match and capture parts of code:

```bash
# Match process name
ast-grep -l nextflow -p 'process $NAME { $$$ }'

# Match workflow with name
ast-grep -l nextflow -p 'workflow $WORKFLOW { $$$ }'

# Match variable assignment
ast-grep -l nextflow -p 'def $VAR = $VALUE'
```

### Multiple Nodes

Use `$$$` to match multiple sibling nodes:

```bash
# Match any channel operation arguments
ast-grep -l nextflow -p 'Channel.from($$$)'

# Match any function call
ast-grep -l nextflow -p '$FUNC($$$)'

# Match any list contents
ast-grep -l nextflow -p '[$$$]'
```

### Statement Wildcards

Use `$$$` to match multiple statements inside a block:

```bash
# Match process with any body
ast-grep -l nextflow -p 'process $NAME { $$$ }'

# Match workflow with any content
ast-grep -l nextflow -p 'workflow { $$$ }'

# Match script block with any commands
ast-grep -l nextflow -p 'script: """ $$$ """'
```

## Common Patterns

### Process Patterns

```bash
# Find all process definitions
ast-grep -l nextflow -p 'process $NAME { $$$ }'

# Find processes with specific directive
ast-grep -l nextflow -p 'process $NAME { publishDir $$$ $$$ }'

# Find process inputs
ast-grep -l nextflow -p 'input: $$$'

# Find process outputs
ast-grep -l nextflow -p 'output: $$$'

# Find process script blocks
ast-grep -l nextflow -p 'script: """ $$$ """'

# Find tuple inputs
ast-grep -l nextflow -p 'tuple val($ID), path($FILE)'
```

### Workflow Patterns

```bash
# Find workflow definitions
ast-grep -l nextflow -p 'workflow $NAME { $$$ }'

# Find workflows with take block
ast-grep -l nextflow -p 'workflow $NAME { take: $$$ }'

# Find workflows with emit block
ast-grep -l nextflow -p 'workflow { $$$ emit: $$$ }'

# Find workflow calls
ast-grep -l nextflow -p '$WORKFLOW($$$)'
```

### Channel Patterns

```bash
# Find Channel.from() (deprecated)
ast-grep -l nextflow -p 'Channel.from($$$)'

# Find Channel.of()
ast-grep -l nextflow -p 'Channel.of($$$)'

# Find Channel.fromPath()
ast-grep -l nextflow -p 'Channel.fromPath($$$)'

# Find channel operations with map
ast-grep -l nextflow -p '$CH.map { $$$ }'

# Find channel operations with filter
ast-grep -l nextflow -p '$CH.filter { $$$ }'

# Find into operator (deprecated)
ast-grep -l nextflow -p '$CH.into { $$$ }'
```

### Variable and Parameter Patterns

```bash
# Find parameter declarations
ast-grep -l nextflow -p 'params.$NAME = $$$'

# Find variable declarations with def
ast-grep -l nextflow -p 'def $VAR = $$$'

# Find variable declarations with type
ast-grep -l nextflow -p 'def $VAR: $TYPE = $$$'

# Find assignments
ast-grep -l nextflow -p '$VAR = $VALUE'
```

### String and Interpolation Patterns

```bash
# Find string interpolation
ast-grep -l nextflow -p '"$$$"'

# Find strings with variables
ast-grep -l nextflow -p '"${$VAR}"'

# Find single-quoted strings
ast-grep -l nextflow -p "'$$$'"

# Find multiline strings
ast-grep -l nextflow -p '"""$$$"""'

# Find GString usage
ast-grep -l nextflow -p '"${$VAR}"'
```

### Control Flow Patterns

```bash
# Find if statements
ast-grep -l nextflow -p 'if ($COND) { $$$ }'

# Find if-else statements
ast-grep -l nextflow -p 'if ($COND) { $$$ } else { $$$ }'

# Find each loops
ast-grep -l nextflow -p '$LIST.each { $$$ }'

# Find closures
ast-grep -l nextflow -p '{ $PARAMS -> $$$ }'
```

### Include and Import Patterns

```bash
# Find include statements
ast-grep -l nextflow -p 'include { $$$ } from $$$'

# Find specific module includes
ast-grep -l nextflow -p 'include { $MODULE } from $PATH'

# Find wildcard includes
ast-grep -l nextflow -p 'include $MODULE from $$$'
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
    process $NAME {
      $$$
    }
  not:
    has:
      pattern: cache $$$
```

### Contextual Matching

Match patterns within specific contexts:

```yaml
# Find variables used in string interpolation
id: string-var-usage
language: nextflow
rule:
  pattern: $VAR
  inside:
    pattern: '"$$$"'
```

### Combining Patterns

```yaml
# Find deprecated patterns with alternatives
id: channel-from-to-of
language: nextflow
message: Replace Channel.from() with Channel.of()
rule:
  pattern: Channel.from($$$)
fix: Channel.of($$$)
```

### Field Matching

Match specific fields in structures:

```yaml
# Find publishDir with specific mode
id: publishdir-mode
language: nextflow
rule:
  pattern: publishDir $PATH, mode: '$MODE'
  follows:
    pattern: $MODE
    regex: 'copy|move|link'
```

## Troubleshooting

### Common Issues

#### 1. Pattern Not Matching

**Problem**: Pattern doesn't match expected code.

**Solution**: Use `--debug-query` to see the AST structure:

```bash
echo 'process TEST { script: "echo hello" }' | ast-grep -l nextflow --debug-query 'process $NAME { $$$ }'
```

Compare the pattern with the actual AST structure.

#### 2. Metavariables and the `$` sign

Write metavariables with the standard `$NAME` / `$$$` syntax:

```bash
ast-grep -l nextflow -p 'process $NAME { $$$ }'
```

`sgconfig.yml` sets `expandoChar: _` so the parser can tokenize patterns
(Nextflow uses `$` for string interpolation), but ast-grep maps `$`↔`_`
internally — you should **not** write `_NAME`. In `constraints`, `fix`, and
`name`, reference a captured metavariable by its bare name (`$NAME` → `NAME`).

If a pattern fails to parse, upgrade ast-grep: releases <= 0.40.x mishandled
some Nextflow block patterns. These examples are verified against 0.43+/0.44.

#### 3. String Interpolation

**Problem**: Matching strings with variable interpolation.

**Solution**: Be careful with quotes and escaping:

```bash
# Match any interpolated string
ast-grep -l nextflow -p '"$$$"'

# Match specific variable interpolation
ast-grep -l nextflow -p '"${$VAR}"'
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
        $$$
      main:
        $$$
      emit:
        $$$
    }
```

### Debugging Tips

1. **Start Simple**: Begin with simple patterns and gradually add complexity

2. **Use Test Files**: Create small test files to validate patterns:

   ```bash
   echo 'process TEST { script: "echo hello" }' > test.nf
   ast-grep -l nextflow -p 'process $NAME { $$$ }' test.nf
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
ast-grep -l nextflow -p 'Channel.from($$$)' -r 'Channel.of($$$)'

# Find into operators
ast-grep -l nextflow -p '$CH.into { $$$ }' .
```

### Code Quality Checks

Enforce standards across codebase:

```bash
# Find processes without publishDir
ast-grep scan --rule rules/dsl2-best-practices.yml

# Find hardcoded paths
ast-grep -l nextflow -p 'path("/$$$")' .

# Find single quotes with interpolation (error)
ast-grep scan --rule rules/string-interpolation.yml
```

### Refactoring

Automated code transformations:

```bash
# Update container directive
ast-grep -l nextflow -p 'container "old-image:$$$"' -r 'container "new-image:$$$"'

# Update parameter names
ast-grep -l nextflow -p 'params.old_name' -r 'params.new_name'
```

## Resources

- [AST-grep Documentation](https://ast-grep.github.io/)
- [AST-grep Rule Config](https://ast-grep.github.io/guide/rule-config.html)
- [Tree-sitter Nextflow Grammar](../../grammar.js)
- [Example Rules](../../rules/)

## Contributing Patterns

Found a useful pattern? Consider adding it to the rules directory:

1. Create a new rule file in `rules/`
2. Test with `ast-grep scan`
3. Document in this guide
4. Submit a pull request

---

**Note**: This is a living document. As the Nextflow grammar evolves, patterns may need updates.
