/**
 * @file Nextflow grammar for tree-sitter
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

  inline: $ => [
    $._argument_list,
    $._argument_list_element,
    $._block,
    $._expression_list,
    $._named_property,
    $._path_element,
    $._primary,
    $._statement_or_block
  ],

  rules: {

    compilation_unit: $ => repeat(choice(
      $.script_declaration,
      $.statement
    )),

    // Script declarations

    script_declaration: $ => choice(
      $.feature_flag_decl,
      $.include_decl,
      $.param_decl,
      // $.enum_def,
      $.process_def,
      $.workflow_def,
      $.output_def,
      $.function_def
    ),

    // -- feature flag declaration

    feature_flag_decl: $ => seq(
      'nextflow',
      repeat1(seq('.', $.identifier)),
      '=',
      $.expression
    ),

    // -- include declaration

    include_decl: $ => seq(
      'include',
      '{',
      seq($.include_entry, repeat(seq(';', $.include_entry))),
      '}',
      'from',
      $.string_literal
    ),

    include_entry: $ => seq(
      $.identifier,
      optional(seq('as', $.identifier))
    ),

    // -- parameter declaration

    param_decl: $ => seq(
      'params',
      '.',
      $.identifier,
      '=',
      $.expression
    ),

    // -- process definition

    process_def: $ => seq(
      'process',
      $.identifier,
      '{',
      repeat(choice(
        $.process_directives,
        $.process_inputs,
        $.process_outputs,
        $.process_when,
        $.process_script,
        $.process_stub
      )),
      '}'
    ),

    process_directives: $ => repeat1($.statement),

    process_inputs: $ => seq(
      'input:',
      repeat1($.statement)
    ),

    process_outputs: $ => seq(
      'output:',
      repeat($.statement)
    ),

    process_when: $ => seq(
      'when:',
      $.expression
    ),

    process_script: $ => seq(
      choice('script:', 'shell:', 'exec:'),
      $.block_statements
    ),

    // -- workflow definition

    workflow_def: $ => seq(
      'workflow',
      '{',
      repeat(choice(
        $.workflow_take,
        $.workflow_main,
        $.workflow_emit,
        $.workflow_publish
      )),
      '}'
    ),

    workflow_take: $ => seq(
      'take:',
      repeat1($.identifier)
    ),

    workflow_main: $ => seq(
      'main:',
      $.block_statements
    ),

    workflow_emit: $ => seq(
      'emit:',
      $.block_statements
    ),

    workflow_publish: $ => seq(
      'publish:',
      $.block_statements
    ),

    // -- output definition

    output_def: $ => seq(
      'output',
      '{',
      optional($.block_statements),
      '}'
    ),

    // -- function definition

    function_def: $ => seq(
      'def',
      $.identifier,
      '(',
      optional($.formal_parameter_list),
      ')',
      '{',
      optional($.block_statements),
      '}'
    ),

    // Statements

    statement: $ => choice(
      $.if_else_statement,
      // $.try_catch_statement,
      $.return_statement,
      $.throw_statement,
      $.assert_statement,
      $.variable_declaration,
      // $.multiple_assignment_statement,
      $.assignment_statement,
      $.expression_statement,
      ';'
    ),

    if_else_statement: $ => seq(
      'if',
      '(',
      $.expression,
      ')',
      $._statement_or_block,
      optional(seq(
        'else',
        $._statement_or_block
      ))
    ),

    _statement_or_block: $ => choice(
      $.statement,
      $._block
    ),

    _block: $ => seq(
      '{',
      optional($.block_statements),
      '}'
    ),

    block_statements: $ => repeat1($.statement),

    return_statement: $ => seq(
      'return',
      optional($.expression)
    ),

    throw_statement: $ => seq(
      'throw',
      $.expression
    ),

    assert_statement: $ => seq(
      'assert',
      $.expression,
      optional(seq(':', $.expression))
    ),

    variable_declaration: $ => seq(
      'def',
      optional($.type),
      $.identifier,
      optional(seq(
        '=',
        $.expression
      ))
    ),

    assignment_statement: $ => seq(
      $.expression,
      '=',
      $.expression
    ),

    expression_statement: $ => seq(
      $.expression,
      optional($._argument_list)
    ),

    // Expressions

    expression: $ => choice(
      $.path_expression,

      seq(choice('~', '!'), $.expression),  // unary not
      seq($.expression, '**', $.expression),  // power
      seq(choice('+', '-'), $.expression),  // unary add
      seq($.expression, choice('*', '/', '%'), $.expression), // mult/div/mod
      seq($.expression, choice('+', '-'), $.expression),  // add/sub
      seq($.expression, choice('<<', '>>>', '>>'), $.expression), // shift
      seq($.expression, choice('..', '..<'), $.expression), // range

      seq($.expression, 'as', $.type), // relational cast
      seq($.expression, choice('instanceof', '!instanceof'), $.type), // relational type
      seq($.expression, choice('<=', '>=', '>', '<', 'in', '!in'), $.expression), // relational
      seq($.expression, choice('==', '!=', '<=>'), $.expression), // equality
      seq($.expression, choice('=~', '==~'), $.expression), // regex find/match

      seq($.expression, choice('&', '^', '|'), $.expression), // bitwise and/or
      seq($.expression, choice('&&', '||'), $.expression),  // logical and/or

      prec.right(seq($.expression, '?', $.expression, ':', $.expression)),  // ternary
      prec.right(seq($.expression, '?:', $.expression)),  // elvis
    ),

    path_expression: $ => seq($._primary, repeat($._path_element)),

    _primary: $ => choice(
      $.identifier,
      $.literal,
      // $.gstring,
      // seq('new', $.creator),
      $.par_expression,
      $.closure,
      $.list,
      $.map,
    ),

    _path_element: $ => choice(
      $.named_property, // property expr
      $.closure,        // method call expr (with trailing closure)
      $.arguments,      // method call expr
      $.index_property  // index expression
    ),

    named_property: $ => seq(
      choice('.', '*.', '?.'),
      $._named_property
    ),

    _named_property: $ => choice($.identifier, $.string_literal),

    index_property: $ => seq(
      '[',
      $._expression_list,
      ']'
    ),

    // -- variable, function, type identifiers

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // -- primitive literals

    literal: $ => choice(
      $.integer_literal,
      $.floating_point_literal,
      $.string_literal,
      $.boolean_literal,
      'null'
    ),

    integer_literal: $ => /\d+/,

    floating_point_literal: $ => /\d+\.\d+/,

    string_literal: $ => choice(
      seq("'", /[^']*/, "'"),
      seq('"', /[^"]*/, '"'),
      seq("'''", /[^']*/, "'''"),
      seq('"""', /[^"]*/, '"""'),
    ),

    boolean_literal: $ => choice('true', 'false'),

    // -- parenthetical expression

    par_expression: $ => seq('(', $.expression, ')'),

    // -- closure expression

    closure: $ => seq(
      '{',
      optional(seq($.formal_parameter_list, '->')),
      $.block_statements,
      '}'
    ),

    formal_parameter_list: $ => repeatComma1($.formal_parameter),

    formal_parameter: $ => seq(
      optional($.type),
      $.identifier,
      optional(seq('=', $.expression))
    ),

    // -- list expression

    list: $ => seq(
      '[',
      optional($._expression_list),
      ']'
    ),

    _expression_list: $ => repeatComma1($.expression),

    // -- map expression

    map: $ => seq(
      '[',
      choice(
        repeatComma1($.map_entry),
        ':'
      ),
      ']'
    ),

    map_entry: $ => seq(
      $.primary,
      ':',
      $.expression
    ),

    // -- argument list
    arguments: $ => seq(
      '(',
      optional($._argument_list),
      ')'
    ),

    _argument_list: $ => repeatComma1($._argument_list_element),

    _argument_list_element: $ => choice($.expression, $.named_arg),

    named_arg: $ => seq($._named_property, ':', $.expression),

    // Types

    type: $ => /[a-zA-Z][a-zA-Z0-9]*/,

    // Comments

    shebang: $ => token(seq('#!', /.*/)),

    line_comment: $ => token(seq('//', /.*/)),

    block_comment: $ => token(seq(
      '/*',
      /[^*]*\*+([^/*][^*]*\*+)*/,
      '/'
    )),
  }
});

function repeatComma1(rule) {
  return seq(rule, repeat(seq(',', rule)), optional(','))
}
