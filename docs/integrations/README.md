# Editor and tool integrations

This repository supplies the Nextflow parser and three query files:

- [`queries/highlights.scm`](../../queries/highlights.scm) captures Nextflow syntax.
- [`queries/tags.scm`](../../queries/tags.scm) captures definitions and references.
- [`queries/injections.scm`](../../queries/injections.scm) captures Bash content in
  interpolated `script:`, `shell:`, and `stub:` strings, and in implicit process
  scripts. The query leaves quotes and Nextflow interpolations outside the Bash
  ranges. `exec:` bodies are Groovy, not Bash.

An editor must load the queries and register a Bash parser as `bash` to display
the injected highlighting. Installing this grammar alone does not do that.

The [ast-grep setup](../ast-grep/README.md) uses the parser for structural
search, lint rules, and outlines. The Tree-sitter CLI tests parsing, highlights,
and tags with `npm test`; `scripts/check-injections.sh` checks injection capture
ranges. Those checks do not prove that an editor displays embedded Bash.

[`nextflow-mode`](https://github.com/edmundmiller/nextflow-mode) provides an
Emacs `nextflow-ts-mode`, but its current Bash fontification rules refer to
`script_content` nodes from an older grammar. This repository does not verify
that integration against the current grammar. Other editors must likewise be
tested in their own runtime before claiming Bash highlighting support.
