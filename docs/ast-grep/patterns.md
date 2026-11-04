# ast-grep patterns for Nextflow

Every pattern on this page is checked against the current grammar. Metavariables use the usual `$NAME` / `$$$` syntax; `sgconfig.yml` sets `expandoChar: _` so the parser can read them, and ast-grep maps `$` to `_` for you.

## Patterns

A pattern is Nextflow code with metavariables in it. It has to parse on its own, the way a top-level statement would.

```bash
# Definitions
ast-grep -l nextflow -p 'process $NAME { $$$ }'
ast-grep -l nextflow -p 'workflow $NAME { $$$ }'
ast-grep -l nextflow -p 'def $NAME($$$) -> $TYPE { $$$ }'
ast-grep -l nextflow -p 'include { $$$ } from $PATH'

# Declarations and assignments
ast-grep -l nextflow -p 'params.$NAME = $VALUE'
ast-grep -l nextflow -p 'def $VAR = $VALUE'
ast-grep -l nextflow -p '$A ?: $B'

# Calls, channels and outputs
ast-grep -l nextflow -p 'Channel.from($$$)'
ast-grep -l nextflow -p '$CH.map { $$$ }'
ast-grep -l nextflow -p '$PROC.out.$NAME'

# Directives and legacy qualifiers (calls without parentheses)
ast-grep -l nextflow -p 'publishDir $PATH, mode: $MODE'
ast-grep -l nextflow -p 'container $IMAGE'
ast-grep -l nextflow -p 'tuple val($META), path($FILE)'

# Control flow and closures
ast-grep -l nextflow -p 'if ($COND) { $$$ } else { $$$ }'
ast-grep -l nextflow -p '{ $$$PARAMS -> $$$ }'
```

Rewrites keep multi-node captures:

```bash
ast-grep -l nextflow -p 'Channel.from($$$ARGS)' -r 'channel.of($$$ARGS)'
```

## Rules by node kind

Some things cannot be written as a pattern:

- **Sections** (`input:`, `emit:`, ...) are only valid inside a process or workflow body, so `input: $$$` does not parse as a pattern.
- **Anything inside a string.** The expando character turns `$` into `_`, so `"${$EXPR}"` or `path("/$$$")` match literal text.

Use a YAML rule on the node kind instead. Node kinds and field names are listed in `src/node-types.json`; `ast-grep run --debug-query=ast -p '<code>'` prints the tree for a snippet.

```yaml
# Processes without a container directive
id: no-container
language: nextflow
severity: warning
message: Process has no container directive
rule:
  kind: process_definition
  not:
    has:
      kind: expression_statement
      has:
        kind: command_expression
        has:
          field: function
          regex: ^container$
```

```yaml
# Named workflow outputs
rule:
  kind: workflow_emit
  inside:
    kind: emit_section
```

```yaml
# task.ext used inside a string
rule:
  kind: interpolation
  has:
    stopBy: end
    pattern: task.ext.$NAME
```

```yaml
# Absolute paths in path(...) or file(...) (rules/hardcoded-paths.yml)
rule:
  any:
    - pattern: path($PATH)
    - pattern: file($PATH)
constraints:
  PATH:
    kind: string
    regex: ^["']/
```

Useful kinds: `process_definition`, `workflow_definition`, `function_definition`, `include_item`, `input_section`, `output_section`, `script_section`, `take_section`, `main_section`, `emit_section`, `workflow_take`, `workflow_emit`, `command_expression`, `call_expression`, `member_expression`, `closure`, `string`, `interpolation`.

## Troubleshooting

- **A pattern matches nothing.** Compare the trees: `ast-grep run -l nextflow --debug-query=ast -p '<pattern>'` for the pattern, and `npx tree-sitter parse file.nf` for the code.
- **`Cannot parse query as a valid pattern`.** The snippet is not a valid statement on its own; see [Rules by node kind](#rules-by-node-kind).
- **`$_` matches nothing.** With `expandoChar: _` the anonymous metavariable does not work; use a named one such as `$X`.
