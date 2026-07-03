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
  return c == '.' || c == '?' || c == ':' || c == ',' ||
         c == ')' || c == ']' || c == '}';
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

  // Consume the run of newlines/';'/whitespace as the token extent, folding
  // in any comment lines so that `stmt \n // note \n stmt` yields a single
  // terminator (not one before and one after the comment).
  for (;;) {
    int32_t c = lexer->lookahead;
    if (c == '\n' || c == ';' || c == ' ' || c == '\t' || c == '\r' || c == '\f') {
      lexer->advance(lexer, false);
    } else if (c == '/') {
      lexer->advance(lexer, false);
      if (lexer->lookahead == '/') {  // line comment
        while (lexer->lookahead != '\n' && lexer->lookahead != 0) {
          lexer->advance(lexer, false);
        }
      } else if (lexer->lookahead == '*') {  // block comment
        lexer->advance(lexer, false);
        int32_t prev = 0;
        while (lexer->lookahead != 0 && !(prev == '*' && lexer->lookahead == '/')) {
          prev = lexer->lookahead;
          lexer->advance(lexer, false);
        }
        if (lexer->lookahead == '/') lexer->advance(lexer, false);
      } else {
        // A lone '/' (division/slashy) does not belong to the terminator;
        // it was not preceded by whitespace we can give back, but this only
        // happens at a statement boundary where '/' cannot legally start a
        // token, so treating the run as ended here is safe.
        break;
      }
    } else {
      break;
    }
  }
  lexer->mark_end(lexer);

  // Lookahead: if the next real character continues the statement, suppress
  // the terminator so the expression parses across the line break.
  if (is_continuation(lexer->lookahead)) {
    return false;
  }

  // A line beginning with `else` continues the preceding `if` across the
  // line break: `} \n else if (...)`. Match the keyword then a boundary.
  if (lexer->lookahead == 'e') {
    const char *kw = "else";
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
        return false;  // `else` continues the statement
      }
    }
    // Not the `else` keyword (e.g. an identifier starting with 'e'): the
    // characters consumed above are still covered by the terminator token
    // whose end we marked earlier, so fall through and emit it.
  }

  lexer->result_symbol = TERMINATOR;
  return true;
}
