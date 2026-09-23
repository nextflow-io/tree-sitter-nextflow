#include "tree_sitter/parser.h"

// External scanner for newline-sensitive statement termination.
//
// The parser only asks for TERMINATOR when its current state accepts one, so
// a newline inside (...) / [...] or after a trailing operator (`a +` \n `b`)
// is never a terminator; it falls through to `extras` as whitespace.
//
// The case valid_symbols cannot resolve is a complete statement that could
// also continue onto the next line:
//
//     x = cond
//         ? a
//         : b
//
// Here we look at the start of the next line. It continues the statement if
// it begins with a token the ANTLR grammar (ScriptParser.g4) accepts after a
// newline (`nls`): `.`, `?.`, `*.`, `?`, `?:`, `:`, `*`, `/`, `%`, `<`, `>`,
// `=`, `&`, `^`, `|`, `,`, `!=`, `!in`, `!instanceof`, `+=`, `-=`, `->`, a
// closing bracket, or one of the words `as`, `in`, `instanceof`, `else`,
// `catch`, `finally`. A line starting with `+`, `-`, `!`, `(`, `[` or `{`
// starts a new statement, as in ANTLR.

enum TokenType {
  TERMINATOR,
  GSTRING_PATH_DOT,
};

void *tree_sitter_nextflow_external_scanner_create(void) { return NULL; }
void tree_sitter_nextflow_external_scanner_destroy(void *payload) {}
unsigned tree_sitter_nextflow_external_scanner_serialize(void *payload, char *buffer) { return 0; }
void tree_sitter_nextflow_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {}

static bool is_word_start(int32_t c) {
  return (c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z') || c == '_' || c > 0x7F;
}

static bool is_word_char(int32_t c) {
  return is_word_start(c) || (c >= '0' && c <= '9');
}

static bool is_inline_space(int32_t c) {
  return c == ' ' || c == '\t' || c == '\r' || c == '\f';
}

// Reads a word from the lookahead (consuming it) into buf, truncated to size-1.
static void read_word(TSLexer *lexer, char *buf, int size) {
  int n = 0;
  while (is_word_char(lexer->lookahead)) {
    if (n < size - 1) buf[n++] = (char)lexer->lookahead;
    lexer->advance(lexer, false);
  }
  buf[n] = '\0';
}

static bool streq(const char *a, const char *b) {
  while (*a && *a == *b) { a++; b++; }
  return *a == *b;
}

// Whether the next line (at the lookahead) continues the current statement.
// Consumes characters, which is fine: the token end is already marked.
static bool continues_statement(TSLexer *lexer) {
  int32_t c = lexer->lookahead;
  switch (c) {
    case '.': case '?': case ':': case ',': case '*': case '/': case '%':
    case '<': case '>': case '=': case '&': case '^': case '|':
    case ')': case ']': case '}':
      return true;
    case '!':
      lexer->advance(lexer, false);
      if (lexer->lookahead == '=') return true;
      if (lexer->lookahead == 'i') {
        char word[16];
        read_word(lexer, word, sizeof word);
        return streq(word, "in") || streq(word, "instanceof");
      }
      return false;
    case '+':
      lexer->advance(lexer, false);
      return lexer->lookahead == '=';
    case '-':
      lexer->advance(lexer, false);
      return lexer->lookahead == '=' || lexer->lookahead == '>';
  }
  if (is_word_start(c)) {
    char word[16];
    read_word(lexer, word, sizeof word);
    return streq(word, "as") || streq(word, "in") || streq(word, "instanceof") ||
           streq(word, "else") || streq(word, "catch") || streq(word, "finally");
  }
  return false;
}

static bool scan_terminator(TSLexer *lexer) {
  while (is_inline_space(lexer->lookahead)) {
    lexer->advance(lexer, true);
  }

  if (lexer->lookahead != '\n' && lexer->lookahead != ';') {
    return false;
  }

  bool saw_semicolon = false;
  while (lexer->lookahead == '\n' || lexer->lookahead == ';' || is_inline_space(lexer->lookahead)) {
    if (lexer->lookahead == ';') saw_semicolon = true;
    lexer->advance(lexer, false);
  }
  lexer->mark_end(lexer);

  // After an explicit ';', fold a trailing comment (and following blank
  // lines) into the terminator. Left as an extra at a `stmt; /* c */`
  // boundary, it would attach to the enclosing node and end a section early.
  if (saw_semicolon && lexer->lookahead == '/') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '/') {
      while (lexer->lookahead != '\n' && !lexer->eof(lexer)) lexer->advance(lexer, false);
    } else if (lexer->lookahead == '*') {
      lexer->advance(lexer, false);
      int32_t prev = 0;
      while (!lexer->eof(lexer) && !(prev == '*' && lexer->lookahead == '/')) {
        prev = lexer->lookahead;
        lexer->advance(lexer, false);
      }
      if (lexer->lookahead == '/') lexer->advance(lexer, false);
    } else {
      lexer->result_symbol = TERMINATOR;
      return true;
    }
    while (lexer->lookahead == '\n' || is_inline_space(lexer->lookahead)) {
      lexer->advance(lexer, false);
    }
    lexer->mark_end(lexer);
  }

  if (saw_semicolon) {
    lexer->result_symbol = TERMINATOR;
    return true;
  }

  // Look past comments to the next real token. The terminator's extent is
  // already marked, so the comments stay nodes in the tree; a newline after
  // a comment yields another terminator, which `_sep` absorbs.
  while (lexer->lookahead == '/') {
    lexer->advance(lexer, false);
    if (lexer->lookahead == '/') {
      while (lexer->lookahead != '\n' && !lexer->eof(lexer)) lexer->advance(lexer, false);
    } else if (lexer->lookahead == '*') {
      lexer->advance(lexer, false);
      int32_t prev = 0;
      while (!lexer->eof(lexer) && !(prev == '*' && lexer->lookahead == '/')) {
        prev = lexer->lookahead;
        lexer->advance(lexer, false);
      }
      if (lexer->lookahead == '/') lexer->advance(lexer, false);
    } else {
      return false;  // a line starting with `/` continues (division)
    }
    while (lexer->lookahead == '\n' || is_inline_space(lexer->lookahead)) {
      lexer->advance(lexer, false);
    }
  }

  if (continues_statement(lexer)) {
    return false;
  }

  lexer->result_symbol = TERMINATOR;
  return true;
}

bool tree_sitter_nextflow_external_scanner_scan(void *payload, TSLexer *lexer,
                                                const bool *valid_symbols) {
  // Both valid at once only happens during error recovery.
  bool recovering = valid_symbols[TERMINATOR] && valid_symbols[GSTRING_PATH_DOT];

  if (valid_symbols[GSTRING_PATH_DOT] && !recovering && lexer->lookahead == '.') {
    lexer->advance(lexer, false);
    lexer->mark_end(lexer);
    if (is_word_start(lexer->lookahead)) {
      lexer->result_symbol = GSTRING_PATH_DOT;
      return true;
    }
    return false;
  }

  if (valid_symbols[TERMINATOR]) {
    return scan_terminator(lexer);
  }

  return false;
}
