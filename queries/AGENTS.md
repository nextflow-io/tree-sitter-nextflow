---
purpose: Explain each query file, its consumer, and its test layer
applies_to: queries/ directory
entrypoint: match the file you are editing to its row below
verification: npx tree-sitter test && scripts/check_injections.sh
update_when: query files are added or their test coverage moves
---
# queries/ — tree queries consumed by editors and the CLI

| File | Purpose | Tested by | Docs |
|---|---|---|---|
| `highlights.scm` | syntax highlighting captures | `test/highlight/*.nf` | [Highlights](https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#highlights) |
| `injections.scm` | bash injection into `script:`/`shell:`/`stub:` bodies | `scripts/check_injections.sh` + `test/injection/` | [Language Injection](https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#language-injection) |
| `tags.scm` | code-navigation definitions/references | `test/tags/*.nf` | [Code Navigation](https://tree-sitter.github.io/tree-sitter/4-code-navigation.html) |

Rules of thumb:

- Node names and fields must exist in `src/node-types.json`; verify with `npx tree-sitter parse` on a snippet before writing a pattern. Prefer fields (`name:`, `function:`) over child position.
- `tags.scm` only allows `@name`, `@definition.*`, `@reference.*` and `@doc` captures, so predicates cannot use helper captures there.
- `injections.scm` captures the `string_content` children of the string that ends a script section, so quote delimiters and `${...}` interpolations stay Nextflow.
- `tree-sitter test` cannot verify injections (host-layer assertions only); use the golden script, and the nextflow-mode ERT suite for end-to-end fontification.
