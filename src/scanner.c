#include <tree_sitter/parser.h>
#include <wctype.h>
#include <stdlib.h>
#include <stdbool.h>
#include <string.h>

enum TokenType {
  STRING_CONTENT,
  INTERPOLATION_START,
  INTERPOLATION_END,
};

typedef struct {
  bool in_string;
  int32_t quote_char;  // '"' or '\''
  bool is_triple_quoted;
  int interpolation_depth;
} Scanner;

static inline void advance(TSLexer *lexer) {
  lexer->advance(lexer, false);
}

static inline void skip(TSLexer *lexer) {
  lexer->advance(lexer, true);
}

void *tree_sitter_nextflow_external_scanner_create() {
  Scanner *scanner = calloc(1, sizeof(Scanner));
  return scanner;
}

void tree_sitter_nextflow_external_scanner_destroy(void *payload) {
  Scanner *scanner = (Scanner *)payload;
  free(scanner);
}

unsigned tree_sitter_nextflow_external_scanner_serialize(void *payload, char *buffer) {
  Scanner *scanner = (Scanner *)payload;
  buffer[0] = scanner->in_string;
  buffer[1] = scanner->quote_char;
  buffer[2] = scanner->is_triple_quoted;
  buffer[3] = scanner->interpolation_depth;
  return 4;
}

void tree_sitter_nextflow_external_scanner_deserialize(void *payload, const char *buffer, unsigned length) {
  Scanner *scanner = (Scanner *)payload;
  if (length >= 4) {
    scanner->in_string = buffer[0];
    scanner->quote_char = buffer[1];
    scanner->is_triple_quoted = buffer[2];
    scanner->interpolation_depth = buffer[3];
  }
}

static bool scan_string_content(Scanner *scanner, TSLexer *lexer) {
  if (!scanner->in_string) return false;
  
  bool has_content = false;
  
  while (lexer->lookahead != 0) {
    // Stop at $ for interpolation
    if (lexer->lookahead == '$') {
      break;
    }
    
    // Check for end of string
    if (scanner->is_triple_quoted) {
      if (lexer->lookahead == scanner->quote_char) {
        // Look ahead for triple quote
        TSLexer saved = *lexer;
        advance(lexer);
        if (lexer->lookahead == scanner->quote_char) {
          advance(lexer);
          if (lexer->lookahead == scanner->quote_char) {
            // Found end of triple-quoted string, restore position
            *lexer = saved;
            break;
          }
        }
        // Not end of string, restore and continue
        *lexer = saved;
      }
    } else {
      if (lexer->lookahead == scanner->quote_char) {
        break;
      }
    }
    
    // Handle escape sequences
    if (lexer->lookahead == '\\') {
      advance(lexer);
      if (lexer->lookahead != 0) {
        advance(lexer);
      }
      has_content = true;
    } else {
      advance(lexer);
      has_content = true;
    }
  }
  
  if (has_content) {
    lexer->mark_end(lexer);
    return true;
  }
  return false;
}

static bool scan_interpolation_start(Scanner *scanner, TSLexer *lexer) {
  if (!scanner->in_string) return false;
  
  if (lexer->lookahead == '$') {
    advance(lexer);
    if (lexer->lookahead == '{') {
      advance(lexer);
      scanner->interpolation_depth++;
      lexer->mark_end(lexer);
      return true;
    }
  }
  return false;
}

static bool scan_interpolation_end(Scanner *scanner, TSLexer *lexer) {
  if (scanner->interpolation_depth > 0 && lexer->lookahead == '}') {
    advance(lexer);
    scanner->interpolation_depth--;
    lexer->mark_end(lexer);
    return true;
  }
  return false;
}

bool tree_sitter_nextflow_external_scanner_scan(void *payload, TSLexer *lexer, const bool *valid_symbols) {
  Scanner *scanner = (Scanner *)payload;
  
  // Skip whitespace only if we're not in a string
  if (!scanner->in_string) {
    while (iswspace(lexer->lookahead)) {
      skip(lexer);
    }
  }
  
  // Detect start of interpolated string
  if (!scanner->in_string && (lexer->lookahead == '"' || lexer->lookahead == '\'')) {
    scanner->quote_char = lexer->lookahead;
    advance(lexer);
    
    // Check for triple quotes
    if (lexer->lookahead == scanner->quote_char) {
      advance(lexer);
      if (lexer->lookahead == scanner->quote_char) {
        advance(lexer);
        scanner->is_triple_quoted = true;
      } else {
        // Two quotes - this is an empty string, not interpolated
        return false;
      }
    } else {
      scanner->is_triple_quoted = false;
    }
    
    // Look ahead to see if this string contains interpolation
    TSLexer saved = *lexer;
    bool has_interpolation = false;
    
    while (lexer->lookahead != 0) {
      if (lexer->lookahead == '$') {
        has_interpolation = true;
        break;
      }
      
      if (scanner->is_triple_quoted) {
        if (lexer->lookahead == scanner->quote_char) {
          advance(lexer);
          if (lexer->lookahead == scanner->quote_char) {
            advance(lexer);
            if (lexer->lookahead == scanner->quote_char) {
              break; // End of triple-quoted string
            }
          }
        } else {
          advance(lexer);
        }
      } else {
        if (lexer->lookahead == scanner->quote_char) {
          break; // End of single-quoted string
        }
        if (lexer->lookahead == '\\') {
          advance(lexer);
          if (lexer->lookahead != 0) {
            advance(lexer);
          }
        } else {
          advance(lexer);
        }
      }
    }
    
    // Restore position
    *lexer = saved;
    
    if (has_interpolation) {
      scanner->in_string = true;
      // Don't mark end here - let the grammar handle the quote
      return false;
    } else {
      // Regular string, let grammar handle it
      return false;
    }
  }
  
  // Handle end of string
  if (scanner->in_string) {
    if (scanner->is_triple_quoted) {
      if (lexer->lookahead == scanner->quote_char) {
        TSLexer saved = *lexer;
        advance(lexer);
        if (lexer->lookahead == scanner->quote_char) {
          advance(lexer);
          if (lexer->lookahead == scanner->quote_char) {
            scanner->in_string = false;
            // Don't mark end here - let the grammar handle the quotes
            *lexer = saved;
            return false;
          }
        }
        *lexer = saved;
      }
    } else {
      if (lexer->lookahead == scanner->quote_char) {
        scanner->in_string = false;
        // Don't mark end here - let the grammar handle the quote
        return false;
      }
    }
  }
  
  if (valid_symbols[STRING_CONTENT] && scan_string_content(scanner, lexer)) {
    lexer->result_symbol = STRING_CONTENT;
    return true;
  }
  
  if (valid_symbols[INTERPOLATION_START] && scan_interpolation_start(scanner, lexer)) {
    lexer->result_symbol = INTERPOLATION_START;
    return true;
  }
  
  if (valid_symbols[INTERPOLATION_END] && scan_interpolation_end(scanner, lexer)) {
    lexer->result_symbol = INTERPOLATION_END;
    return true;
  }
  
  return false;
} 