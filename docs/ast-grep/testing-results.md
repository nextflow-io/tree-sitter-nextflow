# AST-Grep Integration Notes

Known limitations, usage recommendations, and CI/CD integration for the ast-grep Nextflow integration.

## Known Limitations

### 1. Grammar Parsing Issues

Some valid Nextflow constructs parse with ERROR nodes:

```groovy
process TEST {
    script:
    "echo hello"  # Simple script blocks may parse as ERROR
}
```

**Impact**: ast-grep may not match incomplete or simple process definitions.
**Workaround**: Use full process structure with input/output/script blocks.

### 2. String Interpolation Patterns

Single-quoted strings with interpolation are hard to detect via simple patterns:

```groovy
'Value: $var'  # Hard to detect without complex rules
```

### 3. Metavariable syntax

Write metavariables with the standard `$NAME` / `$$$` syntax:

```bash
ast-grep -l nextflow -p 'process $NAME { $$$ }'
```

`sgconfig.yml` sets `expandoChar: _` only so the parser can tokenize patterns
(Nextflow uses `$` for string interpolation); ast-grep maps `$`↔`_` internally,
so you do **not** write `_NAME`. Earlier docs advised `_NAME`/`___` — that was a
misreading of expandoChar. Verified against ast-grep 0.43+/0.44; releases
<= 0.40.x mishandled some block patterns.

### 4. Auto-fix Metavariable Capture

Pattern replacement may not reliably capture multi-argument lists:

```bash
ast-grep -l nextflow -p 'Channel.from($$$ARGS)' -r 'Channel.of($$$ARGS)'
```

**Workaround**: Use ast-grep to identify patterns, then refactor manually if a
rewrite drops arguments.

**Workaround**: Use ast-grep to identify patterns, then refactor manually.

## Usage Recommendations

### For Code Search

```bash
# Find all processes
ast-grep -l nextflow -p 'process $NAME { $$$ }' .

# Find deprecated patterns
ast-grep -l nextflow -p 'Channel.from($$$)' .

# Find workflows
ast-grep -l nextflow -p 'workflow $NAME { $$$ }' .
```

### For Linting

```bash
# Scan with all rules
ast-grep scan

# Scan with specific rule
ast-grep scan --rule rules/deprecated-channel-from.yml

# JSON output for CI/CD
ast-grep scan --json
```

### For Refactoring

```bash
# Step 1: Identify patterns
ast-grep -l nextflow -p 'PATTERN' . > matches.txt

# Step 2: Review matches
cat matches.txt

# Step 3: Manual refactoring (auto-fix not reliable)
```

## CI/CD Integration Example

```yaml
# .github/workflows/lint.yml
name: Nextflow Linting

on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install ast-grep
        run: |
          cargo install ast-grep

      - name: Run ast-grep linting
        run: |
          ast-grep scan --json > lint-results.json

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: lint-results
          path: lint-results.json
```

## Resources

- [AST-grep Documentation](https://ast-grep.github.io/)
- [Pattern Guide](./ast-grep-patterns.md)
- [Configuration File](../../sgconfig.yml)
- [Rule Examples](../../rules/)
