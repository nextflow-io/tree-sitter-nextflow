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

1. [ ] PLAN.md (this file).
2. [ ] Rewrite `grammar.js` and `src/scanner.c` for the script grammar: declarations, statements, expressions, strings, literals, types.
3. [ ] Turn the audit probes into corpus tests and rewrite the existing corpus. Check each corpus input with `nextflow lint`; drop or fix inputs Nextflow rejects.
4. [ ] Rewrite `queries/` (highlights, tags, injections, locals if cheap) and their tests.
5. [ ] Update `rules/`, `outline/`, `docs/ast-grep/` for the new node names.
6. [ ] Parse rate over nf-core/modules and a few pipelines (rnaseq, sarek, methylseq). Triage failures against `nextflow lint`.
7. [ ] Config dialect: a second grammar (`nextflow_config`) in this repo mirroring `ConfigParser.g4`, and drop `config` from the script grammar's file types.
8. [ ] Docs: CHANGELOG (0.4.0, breaking), ROADMAP, README, AGENTS.md, queries/AGENTS.md, test/AGENTS.md.
9. [ ] Delete PLAN.md, open the PR.

## Known limits

Record them here as they come up.
