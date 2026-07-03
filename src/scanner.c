#include "tree_sitter/parser.h"

// External scanner for newline-sensitive statement termination.
//
// The parser only asks for TERMINATOR when its current state accepts one
// (valid_symbols[TERMINATOR]), so newlines inside (...)/[...]/function args
// and mid-expression are never terminators — they fall through to `extras`
// as ordinary whitespace, giving line continuations for free.
//
// The one case valid_symbols cannot resolve is a *complete* expression whose
// statement could either end or continue onto the next line (multi-line
// ternaries, Elvis, method chains):
//
//     extension = args.contains("x")
//         ? "sam"
//         : "bam"
//
// Here TERMINATOR is valid after `args.contains("x")`, but the statement
// actually continues. We disambiguate with a one-character lookahead: if the
// next non-whitespace character begins a continuation (`.`, `?`, `:`, `,`,
// or a closing bracket), we do NOT emit a terminator. Trailing-operator
// continuations (`a +` \n `b`) need no handling here — the parser is still
// mid-expression there, so TERMINATOR is not valid and we are never called.

enum TokenType {
  TERMINATOR,
};

void *tree_sitter_nextflow_external_scanner_create(void) { return NULL; }
void tree_sitter_nextflow_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_nextflow_external_scanner_serialize(void *payload, char *buffer) { return 0; }
void tree_sitter_nextflow_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {}

static bool is_continuation(int32_t c) {
  // A next line beginning with one of these continues the current statement.
  // '|' covers multi-line channel pipes: ch \n | combine(x) \n | map { }.
  return c == '.' || c == '?' || c == ':' || c == ',' ||
         c == ')' || c == ']' || c == '}' || c == '|';
}

bool tree_sitter_nextflow_external_scanner_scan(void *payload, TSLexer *lexer,
                                                const bool *valid_symbols) {
  if (!valid_symbols[TERMINATOR]) {
    return false;
  }

  // Skip inline whitespace before the terminator (not part of the token).
  while (lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
         lexer->lookahead == '\r' || lexer->lookahead == '\f') {
    lexer->advance(lexer, true);
  }

  // A terminator must start with a newline or ';'.
  if (lexer->lookahead != '\n' && lexer->lookahead != ';') {
    return false;
  }

  // Consume the run of newlines/';'/whitespace as the token extent. Comments
  // are NOT folded in — they must survive as nodes for comment-based tooling
  // (e.g. TODO linting). A comment between two statements therefore yields two
  // terminators around it; the grammar's `_terminators` rule (repeat1) absorbs
  // the pair so it still reads as a single separator.
  while (lexer->lookahead == '\n' || lexer->lookahead == ';' ||
         lexer->lookahead == ' ' || lexer->lookahead == '\t' ||
         lexer->lookahead == '\r' || lexer->lookahead == '\f') {
    lexer->advance(lexer, false);
  }
  lexer->mark_end(lexer);

  // If a comment follows the newline run, do not emit a terminator here: let
  // the comment be lexed as an ordinary extra and emit the terminator on the
  // next line instead. This keeps comment nodes in the tree (needed for
  // comment-based tooling like TODO linting) while still yielding exactly one
  // terminator between two statements separated by a comment.
  if (lexer->lookahead == '/') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '/' || lexer->lookahead == '*') {
      return false;
    }
    // A lone '/' at a statement boundary cannot start a valid token; treating
    // the run as a terminator is safe. Fall through.
  }

  // Lookahead: if the next real character continues the statement, suppress
  // the terminator so the expression parses across the line break.
  if (is_continuation(lexer->lookahead)) {
    return false;
  }

  // A line beginning with `else`/`catch`/`finally` continues the preceding
  // if/try across the line break (`} \n else ...`, `} \n catch (e) {`).
  // Match a keyword then a non-word boundary. Characters consumed on a
  // non-match are still covered by the terminator token whose end we marked.
  int32_t first = lexer->lookahead;
  if (first == 'e' || first == 'c' || first == 'f') {
    const char *kw = first == 'e' ? "else" : (first == 'c' ? "catch" : "finally");
    int i = 0;
    while (kw[i] != '\0' && lexer->lookahead == (int32_t)kw[i]) {
      lexer->advance(lexer, false);
      i++;
    }
    if (kw[i] == '\0') {
      int32_t after = lexer->lookahead;
      bool is_word = (after >= 'a' && after <= 'z') || (after >= 'A' && after <= 'Z') ||
                     (after >= '0' && after <= '9') || after == '_';
      if (!is_word) {
        return false;  // keyword continues the statement
      }
    }
  }

  lexer->result_symbol = TERMINATOR;
  return true;
}
