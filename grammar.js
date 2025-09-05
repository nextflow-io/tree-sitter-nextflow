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
      $.if_statement,
      $.expression_statement,
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

    input_declaration: $ => seq('input:', repeat1(choice(
      $.simple_statement,
      $.env_input
    ))),

    env_input: $ => seq('env', choice(
      $.string_literal,
      $.identifier
    )),
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
      $.workflow_body,
      '}'
    ),

    workflow_body: $ => repeat1(choice(
      $.expression_statement,
      $.assignment,
      $.variable_declaration
    )),

    // Simple statements and expressions (no conflicts)
    variable_declaration: $ => seq(
      'def',
      choice(
        seq($.identifier, optional($.type_annotation)),
        $.destructuring_pattern
      ),
      optional(seq('=', $.simple_expression))
    ),

    type_annotation: $ => seq(':', $.identifier),

    destructuring_pattern: $ => seq(
      '(',
      commaSep1(choice(
        $.identifier,
        $.typed_identifier
      )),
      ')'
    ),

    typed_identifier: $ => seq(
      $.identifier,
      $.type_annotation
    ),

    assignment: $ => seq(
      $.identifier,
      '=',
      $.simple_expression
    ),

    expression_statement: $ => $.simple_expression,

    // Control structures
    if_statement: $ => seq(
      'if',
      '(',
      $.simple_expression,
      ')',
      $.block,
      repeat($.else_if_clause),
      optional($.else_clause)
    ),

    else_if_clause: $ => seq(
      'else',
      'if',
      '(',
      $.simple_expression,
      ')',
      $.block
    ),

    else_clause: $ => seq(
      'else',
      $.block
    ),

    block: $ => seq(
      '{',
      repeat(choice(
        $.expression_statement,
        $.variable_declaration,
        $.assignment,
        $.if_statement
      )),
      '}'
    ),

    simple_statement: $ => choice(
      $.simple_expression,
      ';'
    ),

    simple_expression: $ => choice(
      $.binary_expression,
      $.parenthesized_expression,
      $.pipe_expression,
      $.command_expression,
      $.function_call,
      $.method_call,
      $.env_function,
      $.list,
      $.map,
      $.channel_expression,
      $.interpolated_string,
      $.interpolated_triple_quoted_string,
      $.slashy_string,
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
        $.dotted_identifier,
        $.parenthesized_expression,
        $.binary_expression
      )),
      field('operator', choice(
        '+', '-', '*', '/', '%', '**',
        '==', '!=', '<', '>', '<=', '>=',
        '&&', '||',
        '..', '..<',
        '=~', '!~'
      )),
      field('right', choice(
        $.identifier,
        $.string_literal,
        $.integer_literal, 
        $.boolean_literal,
        $.dotted_identifier,
        $.parenthesized_expression,
        $.binary_expression
      ))
    )),

    // Parenthesized expressions
    parenthesized_expression: $ => seq('(', $.simple_expression, ')'),

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
    channel_expression: $ => choice(
      $.channel_from,
      $.channel_value,
      $.channel_of
    ),

    channel_from: $ => seq(
      'Channel',
      '.',
      'from',
      '(',
      commaSep($.simple_expression),
      ')'
    ),

    channel_value: $ => seq(
      'Channel',
      '.',
      'value',
      '(',
      $.simple_expression,
      ')'
    ),

    channel_of: $ => seq(
      'Channel',
      '.',
      'of',
      '(',
      commaSep($.simple_expression),
      ')'
    ),

    // Pipe expressions for channel operations (higher precedence than binary)
    pipe_expression: $ => prec.left(2, seq(
      choice(
        $.channel_expression,
        $.parenthesized_expression,
        $.list,
        $.map,
        $.identifier,
        $.string_literal,
        $.integer_literal,
        $.boolean_literal,
        $.dotted_identifier
      ),
      '|',
      $.pipe_operation
    )),

    pipe_operation: $ => choice(
      $.map_operation
    ),

    map_operation: $ => seq(
      'map',
      $.closure
    ),

    closure: $ => seq(
      '{',
      optional(seq(
        commaSep1($.closure_parameter),
        '->'
      )),
      choice(
        $.simple_expression,
        $.block
      ),
      '}'
    ),

    closure_parameter: $ => $.identifier,

    // Command expressions for function calls (higher precedence)
    command_expression: $ => prec(3, seq(
      $.identifier,
      choice(
        $.interpolated_string,
        $.string_literal,
        $.identifier,
        $.integer_literal
      )
    )),

    // Function calls with parentheses (high precedence)
    function_call: $ => prec(4, seq(
      $.identifier,
      '(',
      commaSep($.simple_expression),
      ')'
    )),

    // Method calls on objects (collection.method)
    method_call: $ => prec(5, seq(
      $.simple_expression,
      '.',
      $.identifier,
      choice(
        seq('(', commaSep($.simple_expression), ')'),
        $.closure
      )
    )),

    // Environment function (strict syntax)
    env_function: $ => seq(
      'env',
      '(',
      $.simple_expression,
      ')'
    ),

    dotted_identifier: $ => prec(6, seq(
      $.identifier,
      repeat1(seq('.', $.identifier))
    )),

    // Literals (plain strings without interpolation)
    string_literal: $ => choice(
      seq("'", /[^']*/, "'"),
      seq('"', /[^$"]*/, '"')  // No $ to avoid conflict with interpolated strings
    ),

    // Interpolated strings (GString support) - Higher precedence than string_literal
    interpolated_string: $ => prec(10, seq(
      '"',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
        $.interpolation
      )),
      '"'
    )),

    // String interpolation: both ${expression} and $variable patterns
    interpolation: $ => seq(
      '$',
      choice(
        seq('{', $.simple_expression, '}'),
        alias(token.immediate(/[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*/), $.identifier)
      )
    ),

    string_content: $ => /[^$"\\n]+/,

    escape_sequence: $ => token(prec(1, seq(
      '\\',
      choice(
        /[bfnrst\\'"\n]/,
        /u[0-9a-fA-F]{4}/
      )
    ))),

    // Slashy strings (regex) - no interpolation in strict syntax
    slashy_string: $ => seq('/', /[^\/]+/, '/'),

    // Interpolated triple-quoted strings
    interpolated_triple_quoted_string: $ => seq(
      '"""',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
        $.interpolation
      )),
      '"""'
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