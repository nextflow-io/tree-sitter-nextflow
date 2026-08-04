---
purpose: Explain each query file, its consumer, and its test layer
applies_to: queries/ directory
entrypoint: match the file you are editing to its row below
verification: npx tree-sitter-cli test && scripts/check_injections.sh
update_when: query files are added or their test coverage moves
---
# queries/ — tree queries consumed by editors and the CLI

| File | Purpose | Tested by | Docs |
|---|---|---|---|
| `highlights.scm` | syntax highlighting captures | `test/highlight/*.nf` | [Highlights](https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#highlights) |
| `injections.scm` | bash injection into `script:`/`shell:`/`stub:` bodies | `scripts/check_injections.sh` + `test/injection/` | [Language Injection](https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#language-injection) |
| `tags.scm` | code-navigation definitions/references | `test/tags/*.nf` | [Code Navigation](https://tree-sitter.github.io/tree-sitter/4-code-navigation.html) |

Rules of thumb:

- Node names must exist in `grammar.js` / `src/node-types.json`; verify with
  `npx tree-sitter-cli parse` on a snippet before writing a pattern.
- `injections.scm` captures *content* nodes (`string_content`,
  `triple_string_content`) for interpolated strings so quote delimiters and
  `${...}` interpolations stay Nextflow. `string_literal` /
  `triple_quoted_string` are single tokens (no content child), so those
  injections include the quotes — a known, accepted tradeoff.
- `tree-sitter test` cannot verify injections (host-layer assertions only);
  use the golden script, and the nextflow-mode ERT suite for end-to-end
  fontification.
