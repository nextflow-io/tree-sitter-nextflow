# ast-grep outline for Nextflow

[`ast-grep outline`](https://ast-grep.github.io/blog/ast-grep-outline.html)
prints a compact structural summary of a file or directory — declarations and
imports with their source ranges — by parsing on demand, with no persistent
index. This grammar ships outline extractor rules for Nextflow so the command
works against `.nf` files.

## Requirements

- `ast-grep` **>= 0.44.0** (the release that added the `outline` command).
  Check with `ast-grep --version`. The custom-language outline path is
  data-driven, so it works with the Nextflow parser shipped here.
- The `nextflow` custom language registered via `sgconfig.yml` (already in this
  repo). Run the command from the project root so the config is discovered.

## Usage

```bash
ast-grep outline \
  --lang nextflow \
  --outline-rules outline/nextflow.yml \
  --no-default-outline-rules \
  main.nf
```

- `--lang nextflow` selects the custom language (required for stdin; inferred
  from the `.nf` extension for path input).
- `--outline-rules outline/nextflow.yml` loads the Nextflow extractors. The flag
  is repeatable.
- `--no-default-outline-rules` skips the bundled rules for Rust/TS/Python/etc.,
  which are irrelevant here. Omit it if you also outline other languages.

Useful flags: `--json` for machine-readable output, `--items imports|exports|all`
to filter top-level items, `--type function,module` to filter by symbol type,
and `--match <regex>` to filter by name.

## What it extracts

| Nextflow construct                | AST node              | `symbolType` | Notes                          |
| --------------------------------- | --------------------- | ------------ | ------------------------------ |
| `process FOO { ... }`             | `process_definition`  | `function`   | name = process name            |
| `workflow FOO { ... }`            | `workflow_definition` | `function`   | named / reusable subworkflow   |
| `workflow { ... }`                | `workflow_definition` | `function`   | entry workflow, named `main`   |
| `include { FOO } from './m'`      | `include_item`        | `module`     | one per symbol, `isImport`     |

Process and workflow definitions share `symbolType: function`; they are
distinguished by the `astKind` field in the output (`process_definition` vs
`workflow_definition`).

The `symbolType` values come from a fixed LSP-derived enum, so they are
approximations of Nextflow concepts rather than exact names. The rules are
data-driven — edit `outline/nextflow.yml` to adjust the mapping.

## Scope and limitations

`ast-grep outline` stays local: it extracts per-file syntax structure and does
**not** resolve includes across files, follow aliases to their targets, or build
a call graph. For the resolved project-level call graph (workflow →
subworkflow → module nesting, alias resolution, unresolved-reference warnings)
see the [`nextflow tree` ADR](https://github.com/nextflow-io/nextflow/pull/7196),
which uses the Nextflow strict parser and include resolution.

Grammar-specific notes:

- Include lists must be comma-separated (`include { A, B as C }`). The grammar
  does not yet parse semicolon-separated include lists.
- For aliased imports (`FOO as BAR`), the extracted name is the original name
  (`FOO`). The grammar exposes no name field and cannot match the `as` clause as
  a standalone pattern, so the alias is not surfaced separately.
- A process or workflow whose body fails to parse will not be extracted. Outline
  reflects whatever the grammar parses successfully.
- There is no Nextflow function-declaration node in this grammar, so top-level
  `def fn() { ... }` is not extracted.
