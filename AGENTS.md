---
purpose: Development workflow and testing map for agents working on the grammar
applies_to: whole repository
entrypoint: follow "Grammar change workflow" for any grammar.js or scanner.c edit
verification: npm test
update_when: the workflow, test layers, or toolchain change
---
# tree-sitter-nextflow — agent guide

Tree-sitter grammar for the Nextflow strict syntax (`.nf`, `.config`). Non-strict constructs (`while`, `switch`, classes) are out of scope; see `ROADMAP.md` for the scope guard and remaining work.

## Toolchain

Run `npm ci` once, then always invoke the CLI as `npx tree-sitter`. It runs the version pinned in `package.json`. A global `tree-sitter` at a different version rewrites `src/tree_sitter/*` and the parser metadata, which shows up as unrelated churn in the diff.

## Grammar change workflow

1. Edit `grammar.js`. Newline-sensitive statement termination lives in the external scanner `src/scanner.c`; its header comment explains when a newline ends a statement.
2. Run `npx tree-sitter generate`. Everything else under `src/` is generated output.
3. Add or update corpus tests in `test/corpus/<area>/`. `npx tree-sitter test -u` rewrites expectations to the current output (it refuses trees with ERROR or MISSING); review that diff as carefully as the grammar diff.
4. Done when `npm test` passes and the commit contains `grammar.js`, the regenerated `src/`, and the tests together. CI regenerates the parser and fails if the committed `src/` differs.

For changes that could affect real-world parsing, also check the parse rate over nf-core/modules with `scripts/parse_rate.py` (instructions in `ROADMAP.md`, "The metric"). It loads a compiled library; build one with `npx tree-sitter build --output lib/<platform>/libnextflow.<ext>`. A quicker check is `npx tree-sitter parse --paths <file-list> -q -s`.

## Grammar design

`grammar.js` mirrors `ScriptParser.g4`: rule names, precedence levels, and where a newline may continue a statement (ANTLR's `nls`, implemented by the scanner's `continues_statement`). When changing a rule, read the matching ANTLR rule first.

`nextflow lint <dir>` is the oracle for whether code is valid. A parse failure is a bug only if Nextflow accepts the input; ignore its semantic errors ("is not defined") and look for syntax errors ("Unexpected input", "Invalid process definition").

Where tree-sitter cannot decide with one token of lookahead, the grammar declares a conflict and lets GLR keep both readings, then `prec.dynamic` picks one:

- **Command vs call:** `path("x"), emit: y` is a command whose first argument is parenthesized; `path("x")` alone is a call. `command_expression` has dynamic precedence -1.
- **Section vs entry:** section keywords are also names (`CONTEXTUAL_KEYWORDS`), so `output:` after an input could be a typed input `output: <type>`. Sections have dynamic precedence 1, so the reading with more sections wins.
- **Declaration vs command:** `String x = "a"` is a declaration, but `path reads` must stay a command. ANTLR checks for a capitalized class name; here a declaration without `def` or an initializer loses (dynamic precedence -2).

Static `prec` resolves a conflict at generate time, before GLR can run, so adding static precedence to these rules breaks them.

## Debugging

```bash
echo 'x = [1, 2]' | npx tree-sitter parse          # inspect a tree
npx tree-sitter parse file.nf | grep -E 'ERROR|MISSING'
npx tree-sitter test --file-name process_definition.txt
npx tree-sitter playground                        # interactive, needs `npx tree-sitter build --wasm`
```

When a construct is ambiguous, check how the official grammar handles it: the [Nextflow ANTLR grammar](https://github.com/nextflow-io/nextflow/tree/master/modules/nf-lang/src/main/antlr) is the language spec, and the [TextMate grammar](https://github.com/nextflow-io/vscode-language-nextflow/tree/main/syntaxes) shows what editors highlight today.

## Testing layers

`npm test` runs every layer below except end-to-end fontification. Details for each live in `test/AGENTS.md`; query-specific rules live in `queries/AGENTS.md`.

| Layer | What it verifies | Where |
|---|---|---|
| Parsing | `grammar.js` produces the right tree | `test/corpus/**/*.txt` |
| Highlighting | `queries/highlights.scm` captures | `test/highlight/*.nf` |
| Tags | `queries/tags.scm` captures | `test/tags/*.nf` |
| Injection | `queries/injections.scm` capture ranges | `scripts/check_injections.sh` (golden file in `test/injection/`) |
| End-to-end fontification | bash highlighted inside script bodies | consumer editors, e.g. the ERT tests in `nextflow-mode` |

## Bindings and distribution

- Bindings: Rust (`cargo test`), Python (`pytest bindings/python/tests` after `pip install ".[core]"`), and C (`make`). There is no Node binding; `package.json` only pins the CLI. Nothing is published to a package registry.
- ast-grep support is `sgconfig.yml`, `rules/`, `outline/`, and `docs/ast-grep/`. The parser libraries it loads are not committed: `lib/` is ignored, `scripts/install-ast-grep.sh` downloads them from the GitHub release, and a `v*` tag builds and attaches them. Release steps are in `CONTRIBUTING.md`.
