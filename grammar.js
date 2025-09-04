/**
 * @file Nextflow grammar for tree-sitter - Minimal Viable Parser
 * @author Edmund Miller <edmund@nf-co.re>
 * @author Ben Sherman <bentshermann@gmail.com>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "nextflow",

  extras: $ => [
    $.line_comment,
    $.block_comment,
    /\s/
  ],

  conflicts: $ => [
    [$.list, $.map]
  ],

  rules: {

    source_file: $ => repeat(choice(
      $.shebang,
      $.feature_flag,
      $.include,
      $.parameter,
      $.process_definition,
      $.workflow_definition,
      $.variable_declaration,
      $.assignment,
      $.line_comment,
      $.block_comment
    )),

    // Basic declarations
    shebang: $ => token(seq('#!', /.*/)),

    feature_flag: $ => seq(
      'nextflow',
      repeat1(seq('.', $.identifier)),
      '=',
      choice($.string, $.number, $.boolean)
    ),

    include: $ => seq(
      'include',
      '{',
      commaSep1($.include_item),
      '}',
      'from',
      $.string
    ),

    include_item: $ => seq(
      $.identifier,
      optional(seq('as', $.identifier))
    ),

    parameter: $ => seq(
      'params',
      '.',
      $.identifier,
      '=',
      choice($.string, $.number, $.boolean)
    ),

    // Process definition - CORE for script injection
    process_definition: $ => seq(
      'process',
      $.identifier,
      '{',
      repeat(choice(
        $.input_declaration,
        $.output_declaration,
        $.when_declaration,
        $.script_declaration
      )),
      '}'
    ),

    input_declaration: $ => seq('input:', repeat1($.simple_statement)),
    output_declaration: $ => seq('output:', repeat1($.simple_statement)),
    when_declaration: $ => seq('when:', $.simple_expression),

    // Script declaration - KEY for language injection
    script_declaration: $ => seq(
      choice('script:', 'shell:', 'exec:', 'stub:'),
      $.script_content
    ),

    script_content: $ => choice(
      $.string_literal,
      $.triple_quoted_string
    ),

    // Workflow definition
    workflow_definition: $ => seq(
      'workflow',
      optional($.identifier),
      '{',
      repeat(choice(
        seq('take:', repeat1($.identifier)),
        seq('main:', '{', repeat($.simple_statement), '}'),
        seq('emit:', '{', repeat($.simple_statement), '}')
      )),
      '}'
    ),

    // Simple statements and expressions (no conflicts)
    variable_declaration: $ => seq(
      'def',
      $.identifier,
      optional(seq('=', $.simple_expression))
    ),

    assignment: $ => seq(
      $.identifier,
      '=',
      $.simple_expression
    ),

    simple_statement: $ => choice(
      $.simple_expression,
      ';'
    ),

    simple_expression: $ => choice(
      $.binary_expression,
      $.list,
      $.map,
      $.channel_expression,
      $.identifier,
      $.string_literal,
      $.integer_literal,
      $.boolean_literal,
      $.dotted_identifier
    ),

    // Binary expressions with operator precedence  
    binary_expression: $ => prec.left(1, seq(
      field('left', choice(
        $.identifier,
        $.string_literal, 
        $.integer_literal,
        $.boolean_literal,
        $.dotted_identifier
      )),
      field('operator', choice('+', '-', '*', '/', '%')),
      field('right', choice(
        $.identifier,
        $.string_literal,
        $.integer_literal, 
        $.boolean_literal,
        $.dotted_identifier
      ))
    )),

    // List literals  
    list: $ => seq(
      '[',
      commaSep($.simple_expression),
      ']'
    ),

    // Map literals
    map: $ => seq(
      '[',
      commaSep($.map_entry),
      ']'
    ),

    map_entry: $ => seq(
      choice($.identifier, $.string_literal),
      ':',
      $.simple_expression
    ),

    // Channel expressions
    channel_expression: $ => $.channel_from,

    channel_from: $ => seq(
      'Channel',
      '.',
      'from',
      '(',
      commaSep($.simple_expression),
      ')'
    ),

    dotted_identifier: $ => seq(
      $.identifier,
      repeat1(seq('.', $.identifier))
    ),

    // Literals
    string_literal: $ => choice(
      seq("'", /[^']*/, "'"),
      seq('"', /[^"]*/, '"')
    ),

    triple_quoted_string: $ => choice(
      seq("'''", /([^']|'[^']|''[^'])*/, "'''"),
      seq('"""', /([^"]|"[^"]|""[^"])*/, '"""')
    ),

    integer_literal: $ => /\d+/,
    boolean_literal: $ => choice('true', 'false'),
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // Aliases to match test expectations
    string: $ => choice(
      seq("'", /[^']*/, "'"),
      seq('"', /[^"]*/, '"')
    ),
    number: $ => /\d+/,
    boolean: $ => choice('true', 'false'),

    // Comments
    line_comment: $ => token(seq('//', /.*/)),
    block_comment: $ => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'))

  }
});

// Helper functions
function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','));
}

function commaSep(rule) {
  return optional(commaSep1(rule));
}