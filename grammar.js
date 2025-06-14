/**
 * @file A parser for Nextflow from scratch
 * @author Edmund Miller <edmund@nf-co.re>
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

module.exports = grammar({
  name: "nextflow",

  // Telling Tree-sitter that command_expression and _expression can conflict
  // helps the parser disambiguate cases like "foo = bar baz"
  conflicts: $ => [
    [ $._expression, $.function_call ],
    [ $.function_call, $.process_invocation ],
    [ $._expression, $.process_output ],
    [ $.source_file, $._expression ]
  ],

  externals: $ => [
    $.string_content,
    $.interpolation_start,
    $.interpolation_end,
  ],

  extras: $ => [
    /\s/,
    $.comment
  ],

  rules: {
    source_file: $ => repeat(choice(
      $.comment,
      $.shebang,
      $.feature_flag,
      $.include,
      $.parameter,
      $.process_definition,
      $.channel_expression,
      $.pipe_expression,
      $.workflow_definition,
      $.variable_declaration,
      $.assignment,
      $.if_statement,
      $.expression_statement
    )),

    // Comments
    comment: $ => choice(
      seq('//', /.*/),
      seq(
        '/*',
        /[^*]*\*+([^/*][^*]*\*+)*/,
        '/'
      )
    ),

    // Top-level declarations
    shebang: $ => seq(
      '#!',
      /.*/
    ),

    feature_flag: $ => seq(
      'nextflow',
      '.',
      $.identifier,
      '.',
      $.identifier,
      '=',
      choice($.number, $.string, $.boolean)
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
      $._expression
    ),

    // Basic expressions
    _expression: $ => choice(
      $.identifier,
      $.number,
      $.interpolated_string,
      $.string,
      $.boolean,
      $.channel_expression,
      $.pipe_expression,
      $.map,
      $.list,
      $.binary_expression,
      $.property_access,
      $.function_call,
      $.constructor_call,
      $.closure,
      seq('(', $._expression, ')')
    ),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,
    
    number: $ => choice(
      /\d+/,
      /\d+\.\d+/
    ),

    string: $ => choice(
      seq('"', /[^"]*/, '"'),
      seq("'", /[^']*/, "'"),
      seq('"""', /([^"]|"[^"]|""[^"])*/, '"""'),
      seq("'''", /([^']|'[^']|''[^'])*/, "'''")
    ),

    // Interpolated strings - strings that contain $ interpolation
    interpolated_string: $ => choice(
      // Double-quoted interpolated strings
      seq(
        '"',
        repeat(choice(
          $.string_content,
          $.interpolation,
          $.simple_interpolation
        )),
        '"'
      ),
      // Triple double-quoted interpolated strings
      seq(
        '"""',
        repeat(choice(
          $.string_content,
          $.interpolation,
          $.simple_interpolation
        )),
        '"""'
      ),
      // Single-quoted interpolated strings
      seq(
        "'",
        repeat(choice(
          $.string_content,
          $.interpolation,
          $.simple_interpolation
        )),
        "'"
      ),
      // Triple single-quoted interpolated strings
      seq(
        "'''",
        repeat(choice(
          $.string_content,
          $.interpolation,
          $.simple_interpolation
        )),
        "'''"
      )
    ),

    // Simple interpolation: $variable or $variable.property
    simple_interpolation: $ => seq(
      '$',
      choice(
        $.identifier,
        $.property_access
      )
    ),

    // Complex interpolation: ${expression} using external scanner
    interpolation: $ => seq(
      $.interpolation_start,
      $._expression,
      $.interpolation_end
    ),



    property_access: $ => prec.left(seq(
      $._expression,
      '.',
      $.identifier
    )),

    function_call: $ => seq(
      choice(
        $.identifier,
        $.property_access
      ),
      '(',
      optional(commaSep1($._expression)),
      ')'
    ),

    constructor_call: $ => seq(
      'new',
      $.identifier,
      '(',
      optional(commaSep1($._expression)),
      ')'
    ),

    boolean: $ => choice('true', 'false'),

    // Helper functions
    _statement: $ => choice(
      $.expression_statement,
      $.assignment_statement,
      $.if_statement
    ),

    expression_statement: $ => seq(
      choice(
        $._expression,
        $.command_expression
      ),
      optional(';')
    ),

    assignment_statement: $ => seq(
      $.identifier,
      '=',
      choice(
        $._expression,
        $.command_expression
      ),
      ';'
    ),

    // Process definition
    process_definition: $ => seq(
      'process',
      $.identifier,
      '{',
      repeat(choice(
        $.input_block,
        $.output_block,
        $.script_block,
        $.directive_block
      )),
      '}'
    ),

    input_block: $ => seq(
      'input:',
      repeat($.input_declaration)
    ),

    input_declaration: $ => seq(
      choice('val', 'path', 'tuple', 'env', 'stdin'),
      $.identifier,
      optional(seq('from', $._expression)),
      ';'
    ),

    output_block: $ => seq(
      'output:',
      repeat($.output_declaration)
    ),

    output_declaration: $ => seq(
      choice('path', 'tuple', 'env', 'stdout'),
      $._expression,
      optional(seq('into', $._expression)),
      ';'
    ),

    script_block: $ => seq(
      choice('script:', 'shell:', 'exec:'),
      $.script_content
    ),

    script_content: $ => choice(
      seq('"""', /([^"]|"[^"]|""[^"])*/, '"""'),
      seq("'''", /([^']|'[^']|''[^'])*/, "'''"),
      seq('"', /[^"]*/, '"'),
      seq("'", /[^']*/, "'")
    ),

    directive_block: $ => seq(
      'directive:',
      repeat($.directive)
    ),

    directive: $ => seq(
      $.identifier,
      $._expression,
      ';'
    ),

    // Channel operations
    channel_expression: $ => seq(
      'Channel',
      '.',
      choice(
        $.channel_from,
        $.channel_value,
        $.channel_of,
        $.channel_from_list
      )
    ),

    channel_from: $ => seq(
      'from',
      '(',
      commaSep1($._expression),
      ')'
    ),

    channel_value: $ => seq(
      'value',
      '(',
      optional($._expression),
      ')'
    ),

    channel_of: $ => seq(
      'of',
      '(',
      optional(commaSep1($._expression)),
      ')'
    ),

    channel_from_list: $ => seq(
      'fromList',
      '(',
      $.list,
      ')'
    ),

    list: $ => seq(
      '[',
      optional(commaSep1($._expression)),
      ']'
    ),

    map: $ => seq(
      '[',
      commaSep1($.map_entry),
      ']'
    ),

    map_entry: $ => seq(
      choice(
        $.identifier,
        $.string,
        $.number
      ),
      ':',
      $._expression
    ),

    // Pipeline operations
    pipe_expression: $ => prec.left(1, seq(
      $._expression,
      '|',
      choice(
        $.identifier,
        $.map_operation
      )
    )),

    map_operation: $ => seq(
      'map',
      $.closure
    ),

    closure: $ => prec(1, choice(
      // Single expression closure: { x -> x * 2 }
      seq(
        '{',
        optional($.parameters),
        '->',
        $._expression,
        '}'
      ),
      // Block closure: { x -> statements... }
      seq(
        '{',
        optional($.parameters),
        '->',
        $.closure_body,
        '}'
      )
    )),

    closure_body: $ => repeat1(choice(
      $.variable_declaration,
      $.command_expression,
      $._expression
    )),

    parameters: $ => commaSep1($.identifier),

    // Workflow definition
    workflow_definition: $ => seq(
      'workflow',
      '{',
      optional($.workflow_body),
      '}'
    ),

    workflow_body: $ => choice(
      seq($.workflow_input, optional($.workflow_main), optional($.workflow_emit)),
      seq($.workflow_main, optional($.workflow_emit)),
      $.workflow_emit,
      repeat1($._workflow_statement)
    ),

    workflow_input: $ => prec.right(2, seq(
      'take:',
      repeat1(seq(
        $.identifier,
        optional(';')
      ))
    )),

    workflow_main: $ => prec.right(2, seq(
      'main:',
      repeat1(seq(
        $._workflow_statement,
        optional(';')
      ))
    )),

    workflow_emit: $ => prec.right(2, seq(
      'emit:',
      repeat1(seq(
        $.identifier,
        '=',
        $._workflow_statement,
        optional(';')
      ))
    )),

    _workflow_statement: $ => choice(
      $._expression,
      $.process_invocation,
      $.process_output
    ),

    process_invocation: $ => prec(2, seq(
      $.identifier,
      '(',
      optional(commaSep1(choice($._expression, $.process_output))),
      ')'
    )),

    process_output: $ => seq(
      $.identifier,
      '.',
      'out'
    ),

    binary_expression: $ => choice(
      // Logical operators have lowest precedence
      prec.left(1, seq($._expression, choice('&&', '||'), $._expression)),
      // Comparison operators
      prec.left(2, seq($._expression, choice('==', '!=', '<', '>', '<=', '>='), $._expression)),
      // Addition and subtraction
      prec.left(3, seq($._expression, choice('+', '-'), $._expression)),
      // Multiplication, division, modulo
      prec.left(4, seq($._expression, choice('*', '/', '%'), $._expression)),
      // Exponentiation has right associativity
      prec.right(5, seq($._expression, '**', $._expression)),
      // Range operators
      prec.left(6, seq($._expression, choice('..', '..<'), $._expression))
    ),

    // Variable declarations
    variable_declaration: $ => seq(
      'def',
      $.identifier,
      '=',
      $._expression
    ),

    assignment: $ => seq(
      $.identifier,
      '=',
      choice(
        prec(1, $.command_expression),
        $._expression
      )
    ),

    if_statement: $ => seq(
      'if',
      '(',
      $._expression,
      ')',
      $.block,
      repeat($.else_if_clause),
      optional($.else_clause)
    ),

    else_if_clause: $ => seq(
      'else',
      'if',
      '(',
      $._expression,
      ')',
      $.block
    ),

    else_clause: $ => seq(
      'else',
      $.block
    ),

    block: $ => seq(
      '{',
      repeat($._statement),
      '}'
    ),

    // A simple command-like expression to handle Groovy-style println statements
    // e.g. println "hello"
    command_expression: $ => prec(2, seq(
      $.identifier,
      choice($.string, $.interpolated_string)
    ))
  }
});

function commaSep1(rule) {
  return seq(rule, repeat(seq(',', rule)))
}
