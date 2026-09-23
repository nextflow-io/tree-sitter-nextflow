# Plan: parity with the Nextflow grammar

Temporary working doc for the `grammar-parity` branch. Delete it before merging.

The reference is the ANTLR grammar on nextflow master (`modules/nf-lang/src/main/antlr`): `ScriptParser.g4` for `.nf` and `ConfigParser.g4` for `.config`. The oracle for "is this valid?" is `nextflow lint` (26.04.6 installed locally). Records and agents are newer than 26.04, so for those the `.g4` files are the only reference.

## Why a rewrite

The audit found four structural problems behind most gaps:

1. All binary operators share one precedence, so `1 + 2 * 3` parses as `(1 + 2) * 3`.
2. Statement separators are optional, so `def String x = "a"` or `log.info "x"` silently split into two statements.
3. Each rule allowlists which node kinds may be its operand, where ANTLR has one postfix chain (`primary pathElement*`). Every missing pair is a hole (`'a'.size()`, `files*.name`, `a?.b()?.c`).
4. Closures are not expressions (`x = { it }` fails).

Fixing these renames most nodes anyway, so the grammar is rewritten from scratch to mirror `ScriptParser.g4`. This is a breaking release (0.4.0): queries, ast-grep rules, outline rules, and the corpus change with it.

## Design

- **Expressions** follow ANTLR: primaries, then postfix `member_expression` / `call_expression` / `index_expression`, then `unary_expression`, `binary_expression` (with ANTLR's 14 precedence levels), `cast_expression`, `instanceof_expression`, `ternary_expression`, `elvis_expression`. Closures are primaries.
- **Nextflow semantics stay out of the syntax.** `Channel.of(...)`, `FOO(x)`, `FOO.out.bam` and `ch | map { }` are ordinary calls, member accesses, and `|` binary expressions, as in ANTLR. The old `channel_*`, `process_invocation`, `process_output`, `pipe_expression`, `map_operation` and `env_function` nodes go away.
- **Command calls** (`println "x"`, `log.info "x"`, `path x, emit: y`) are `command_expression`, allowed only as a statement, and only when the head is an identifier or member access (ANTLR's `isValidDirective`).
- **Separators are required** between statements. The external scanner emits `_terminator` at a newline or `;` only when the next line cannot continue the statement. The continuation set comes from where ANTLR allows `nls`: `.`, `?.`, `*.`, `?`, `:`, `*`, `/`, `%`, `<`, `>`, `=`, `&`, `^`, `|`, `,`, `!=`, `!in`, `!instanceof`, `+=`, `-=`, closing brackets, and the words `as`, `in`, `instanceof`, `else`, `catch`, `finally`. A line starting with `+`, `-`, `!`, `(`, `[` or `{` starts a new statement, as in ANTLR.
- **Sections** (`input:`, `main:`, ...) are nodes that contain their entries. Section keywords are contextual, so they cannot start a statement inside the body that owns them (`main = 1` inside a workflow body is an error; elsewhere it is fine).
- **Strings** are one `string` node for `'`, `"`, `'''` and `"""`, with `string_content`, `escape_sequence` and `interpolation` children. That gives every script body a content child to inject bash into. Slashy strings stay a single `slashy_string` token (ANTLR does not interpolate them either).
- **Types**: `type` supports qualified names, generics, nullable `?` and legacy `[]`.
- **Leniency kept on purpose**: section order is not enforced; `for`-in and `finally` stay (ROADMAP scope guard); trailing commas where Groovy allows them.

## Steps

1. [x] PLAN.md (this file).
2. [x] Rewrite `grammar.js` and `src/scanner.c` for the script grammar.
3. [x] Corpus: the old corpus is regenerated (its 28 skipped tests now pass), and `test/corpus/spec/` adds 51 tests from the audit probes. `nextflow lint` and the new parser agree on every old corpus input except deliberate leniencies (processes without a script, `finally`).
4. [x] Queries rewritten for the new node names; injections now capture content for every string kind.
5. [x] ast-grep rules, outline and docs updated. Two rules were broken before the rewrite and are fixed.
6. [x] Parse rate: nf-core/modules 2208/2208, pipeline `.nf` files 143/144 (the failure is an untracked scratch file with invalid syntax), nf-core `.config` files 618/618.
7. [ ] Config dialect: **moved to a follow-up PR.** The script grammar already parses every nf-core config file error-free, so a config grammar changes tree shape, not coverage, and it adds a second parser to every binding and a second ast-grep library.
8. [x] Docs: CHANGELOG, ROADMAP, README, AGENTS.md, queries/AGENTS.md, test/AGENTS.md.
9. [ ] Delete PLAN.md before merging.

## Known limits

- `String x` and `path reads` are both command calls; ANTLR tells them apart by capitalization, which tree-sitter cannot check. With an initializer (`String x = "a"`) it is a declaration.
- A statement inside a section cannot start with that body's section keyword *and* a colon (`output: Path` right after `input:` entries reads as the next section). Plain names work: `input = ...` in a script prelude parses.
- Names cannot contain `$` after the first character.
- The parser is about the same size as before (3.9 MB `parser.c`), with GLR at the points listed in AGENTS.md.
