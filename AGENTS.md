---
purpose: Map the repo's testing layers and their docs for agents
applies_to: whole repository
entrypoint: CLAUDE.md for grammar workflow; this file for test-layer routing
verification: npx tree-sitter-cli test && scripts/check_injections.sh
update_when: test layers, query files, or check scripts change
---
# tree-sitter-nextflow — agent guide

Tree-sitter grammar for Nextflow (`.nf`, `.config`). Detailed development
workflow lives in `CLAUDE.md`; this file maps the **testing layers** and where
each is documented and verified.

## Testing layers

Tree-sitter features are tested at different layers with different tools.
Know which layer you are changing before picking a test.

| Layer | What it verifies | Where | Docs |
|---|---|---|---|
| Parsing | grammar.js produces the right syntax tree | `test/corpus/*.txt` via `tree-sitter test` | [Writing Tests](https://tree-sitter.github.io/tree-sitter/creating-parsers/5-writing-tests.html) |
| Highlighting | `queries/highlights.scm` captures | `test/highlight/*.nf` assertion comments via `tree-sitter test` | [Syntax Highlighting — Unit Testing](https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#unit-testing) |
| Tags | `queries/tags.scm` captures | `test/tags/*.nf` assertion comments via `tree-sitter test` | [Code Navigation — Unit Testing](https://tree-sitter.github.io/tree-sitter/4-code-navigation.html#unit-testing) |
| Injection | `queries/injections.scm` capture ranges | `scripts/check_injections.sh` golden test | [Syntax Highlighting — Language Injection](https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#language-injection) |
| End-to-end fontification | bash actually highlighted inside script bodies | consumer editors; ERT tests in the `nextflow-mode` repo | — |

**Why injection has its own layer:** `tree-sitter test` highlight assertions
check the host-language layer only — the test subcommand loads just this
grammar, so `#set! injection.language "bash"` never resolves and injected
captures are invisible to assertions. Do NOT add `test/highlight` cases
asserting bash captures inside script bodies; they can only pass by accident.
Use `scripts/check_injections.sh` (capture ranges) plus a consumer editor
test (real fontification) instead.

## Quick commands

```bash
npx tree-sitter-cli test                     # corpus + highlight + tags
npx tree-sitter-cli test --file-name X.txt   # one corpus file
scripts/check_injections.sh                  # injection query golden test
scripts/check_injections.sh --update         # re-pin after intended change
npx tree-sitter-cli parse file.nf            # inspect a syntax tree
npx tree-sitter-cli query queries/injections.scm file.nf  # inspect captures
```

`tree-sitter highlight file.nf` resolves injections for manual inspection,
but only when a `tree-sitter-bash` checkout is discoverable via the
`parser-directories` in `~/.config/tree-sitter/config.json`
(check with `tree-sitter dump-languages`).

## Invariants

- `src/parser.c` and friends are generated — never hand-edit; run
  `tree-sitter generate` after touching `grammar.js`.
- Query files reference node names from `grammar.js`; verify with
  `tree-sitter parse` before writing captures, don't guess.
- After grammar changes: `tree-sitter test` must keep 96/96 parses and
  `scripts/check_injections.sh` must pass (or be intentionally re-pinned).
