/**
 * @file Tree-sitter grammar for Nextflow scripts (strict syntax)
 * @author Edmund Miller <edmund@nf-co.re>
 * @author Ben Sherman <bentshermann@gmail.com>
 * @license MIT
 *
 * Mirrors the official ANTLR grammar, ScriptParser.g4 in nextflow-io/nextflow
 * (modules/nf-lang/src/main/antlr). Rule names and precedence levels follow it
 * where tree-sitter allows.
 *
 * Statements are separated by `_terminator`, which the external scanner
 * (src/scanner.c) emits at a newline or `;` when the next line cannot continue
 * the current statement.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// ANTLR's expression levels, loosest to tightest.
const PREC = {
  ternary: 1,
  or: 2,
  and: 3,
  bitor: 4,
  xor: 5,
  bitand: 6,
  regex: 7,
  equality: 8,
  relational: 9,
  shift: 10,
  additive: 11,
  multiplicative: 12,
  sign: 13,
  power: 14,
  not: 15,
  postfix: 16,
};

// Keywords that ANTLR's `identifier` rule also accepts as names.
const CONTEXTUAL_KEYWORDS = [
  'nextflow', 'params', 'from', 'record', 'agent', 'prompt', 'process',
  'exec', 'input', 'output', 'script', 'shell', 'stage', 'stub', 'topic',
  'tuple', 'when', 'workflow', 'emit', 'main', 'onComplete', 'onError',
  'publish', 'take',
];

const ASSIGNMENT_OPERATORS = [
  '=', '+=', '-=', '*=', '/=', '%=', '**=',
  '&=', '|=', '^=', '<<=', '>>=', '>>>=', '?=',
];

module.exports = grammar({
  name: 'nextflow',

  externals: $ => [
    $._terminator,
    // A `.` inside a GString path (`"$a.b"`), emitted only when an identifier
    // follows, so `"$a."` and `"$a. b"` keep the dot as text.
    $._gstring_path_dot,
  ],

  extras: $ => [/\s/, $.line_comment, $.block_comment],

  word: $ => $.identifier,

  supertypes: $ => [$._statement, $._expression],

  // Each of these is resolved by GLR plus `prec.dynamic`; see AGENTS.md,
  // "Grammar design". Static precedence here would pre-empt GLR.
  conflicts: $ => [
    // `String x = ...` / `String f() {}` (legacy typed declaration) vs a
    // command call `String x`, index `String[0]`, or expression.
    [$._expression, $._type_name],
    [$._expression, $.parameter],
    [$.command_expression, $._type_name],
    [$.command_expression, $._expression, $._type_name],
    [$.variable_declaration, $._type_name],
    // `path("x"), emit: y` (command with a parenthesized first argument) vs
    // the call `path("x")`.
    [$._expression, $.command_expression],
    // `x instanceof List ? a : b`: nullable type vs ternary; `x as Foo.bar`.
    [$.type],
    [$._type_name],
    // A section keyword after an entry: the next section, or an entry that
    // uses the keyword as a name (`input = ...`, `output: Path`).
    [$.input_section],
    [$.stage_section],
    [$.output_section],
    [$.topic_section],
    [$.script_section],
    [$.stub_section],
    [$.prompt_section],
    [$.take_section],
    [$.main_section],
    [$.emit_section],
    [$.publish_section],
    [$.on_complete_section],
    [$.on_error_section],
  ],

  rules: {
    source_file: $ => seq(
      optional(choice(seq(optional($._sep), $.shebang, optional($._sep)), $._sep)),
      optional(seq(
        $._declaration_or_statement,
        repeat(seq($._sep, $._declaration_or_statement)),
        optional($._sep),
      )),
    ),

    _sep: $ => repeat1($._terminator),

    _declaration_or_statement: $ => choice(
      $.feature_flag,
      $.include_declaration,
      $.import_declaration,
      $.params_definition,
      $.param_assignment,
      $.record_definition,
      $.enum_definition,
      $.agent_definition,
      $.process_definition,
      $.workflow_definition,
      $.output_definition,
      $.function_definition,
      $._statement,
    ),

    shebang: _ => token(seq('#!', /[^\n]*/)),

    // -- script declarations

    // nextflow.enable.strict = true
    feature_flag: $ => seq(
      'nextflow',
      repeat1(seq('.', $._identifier)),
      '=',
      field('value', $._expression),
    ),

    // include { FOO; BAR as BAZ } from './module'
    include_declaration: $ => seq(
      'include',
      '{',
      optional($._sep),
      sepBy1($._sep, $.include_item),
      optional($._sep),
      '}',
      'from',
      field('source', $.string),
    ),

    include_item: $ => seq(
      field('name', $._identifier),
      optional(seq('as', field('alias', $._identifier))),
    ),

    // Legacy: import groovy.json.JsonSlurper
    import_declaration: $ => seq('import', field('name', $.qualified_name)),

    qualified_name: $ => sepBy1('.', $._identifier),

    // params { input: Path; save: Boolean = false }
    params_definition: $ => seq(
      'params',
      body($, choice($.param_declaration, $._statement)),
    ),

    param_declaration: $ => prec(1, seq(
      field('name', $._identifier),
      optional(seq(':', field('type', $.type))),
      optional(seq('=', field('default', $._expression))),
    )),

    // Legacy: params.foo.bar = 1
    param_assignment: $ => seq(
      'params',
      repeat1(seq('.', $._identifier)),
      '=',
      field('value', $._expression),
    ),

    // record Sample { id: String; fastq: Path? }
    record_definition: $ => seq(
      'record',
      field('name', $._identifier),
      body($, $.record_field),
    ),

    record_field: $ => seq(
      field('name', $._identifier),
      optional(seq(':', field('type', $.type))),
    ),

    // enum Color { RED, GREEN, BLUE }
    enum_definition: $ => seq(
      'enum',
      field('name', $._identifier),
      '{',
      optional($._sep),
      optional(seq(
        sepBy1(seq(',', optional($._sep)), alias($.identifier, $.enum_constant)),
        optional(','),
        optional($._sep),
      )),
      '}',
    ),

    // -- process

    process_definition: $ => seq(
      'process',
      field('name', $._identifier),
      sectionedBody($, [
        $.input_section,
        $.stage_section,
        $.output_section,
        $.topic_section,
        $.when_section,
        $.script_section,
        $.stub_section,
      ]),
    ),

    input_section: $ => section($, 'input', choice(
      $.process_input,
      $.process_record_input,
      $.process_tuple_input,
      $._statement,
      alias($._legacy_tuple_input, $.expression_statement),
    )),

    process_input: $ => prec(1, seq(
      field('name', $._identifier),
      optional(seq(':', field('type', $.type))),
    )),

    // record(id: String, fastq: Path)
    process_record_input: $ => seq('record', $._process_input_list),

    // tuple(id: String, reads: Path)
    process_tuple_input: $ => seq('tuple', $._process_input_list),

    _process_input_list: $ => seq(
      '(',
      commaSep1($.process_input),
      optional(','),
      ')',
    ),

    // `tuple` is a keyword in an input section, so a legacy
    // `tuple val(x), path(y)` needs its own rule there.
    _legacy_tuple_input: $ => alias($._legacy_tuple_command, $.command_expression),

    _legacy_tuple_command: $ => prec.dynamic(-1, seq(
      field('function', alias('tuple', $.identifier)),
      field('arguments', alias($._command_arguments, $.argument_list)),
    )),

    stage_section: $ => section($, 'stage', $._statement),

    output_section: $ => section($, 'output', choice($.process_output, $._statement)),

    process_output: $ => prec(1, seq(
      field('name', $._identifier),
      optional(seq(':', field('type', $.type))),
      optional(seq('=', field('value', $._expression))),
    )),

    topic_section: $ => section($, 'topic', $._statement),

    when_section: $ => prec.dynamic(1, seq(
      'when',
      ':',
      optional($._sep),
      field('condition', $._expression),
      optional($._sep),
    )),

    script_section: $ => section($, choice('script', 'shell', 'exec'), $._statement),

    stub_section: $ => section($, 'stub', $._statement),

    // -- agent

    agent_definition: $ => seq(
      'agent',
      field('name', $._identifier),
      sectionedBody($, [$.input_section, $.output_section, $.prompt_section]),
    ),

    prompt_section: $ => section($, 'prompt', $._statement),

    // -- workflow

    workflow_definition: $ => seq(
      'workflow',
      optional(field('name', $._identifier)),
      sectionedBody($, [
        $.take_section,
        $.main_section,
        $.emit_section,
        $.publish_section,
        $.on_complete_section,
        $.on_error_section,
      ]),
    ),

    take_section: $ => section($, 'take', choice($.workflow_take, $._statement)),

    workflow_take: $ => prec(1, seq(
      field('name', $._identifier),
      optional(seq(':', field('type', $.type))),
    )),

    main_section: $ => section($, 'main', $._statement),

    emit_section: $ => section($, 'emit', choice($.workflow_emit, $._statement)),

    workflow_emit: $ => prec(1, seq(
      field('name', $._identifier),
      optional(seq(':', field('type', $.type))),
      optional(seq('=', field('value', $._expression))),
    )),

    publish_section: $ => section($, 'publish', choice(
      alias($.workflow_emit, $.workflow_publish),
      $._statement,
    )),

    on_complete_section: $ => section($, 'onComplete', $._statement),

    on_error_section: $ => section($, 'onError', $._statement),

    // -- output block

    output_definition: $ => seq(
      'output',
      body($, choice($.output_declaration, $._statement)),
    ),

    output_declaration: $ => prec(1, seq(
      field('name', $._identifier),
      optional(seq(':', field('type', $.type))),
      field('body', $.block),
    )),

    // -- function

    function_definition: $ => prec.dynamic(1, choice(
      seq(
        'def',
        field('name', $._identifier),
        field('parameters', $.parameters),
        optional(seq('->', field('return_type', $.type))),
        field('body', $.block),
      ),
      seq(
        optional('def'),
        field('return_type', $.type),
        field('name', $._identifier),
        field('parameters', $.parameters),
        field('body', $.block),
      ),
    )),

    parameters: $ => seq('(', optional(commaSep1($.parameter)), ')'),

    parameter: $ => seq(
      choice(
        seq(field('name', $._identifier), optional(seq(':', field('type', $.type)))),
        seq('def', field('name', $._identifier)),
        seq(optional('def'), field('type', $.type), field('name', $._identifier)),
      ),
      optional(seq('=', field('default', $._expression))),
    ),

    // -- statements

    _statement: $ => choice(
      $.if_statement,
      $.try_statement,
      $.for_statement,
      $.return_statement,
      $.throw_statement,
      $.assert_statement,
      $.variable_declaration,
      $.assignment,
      $.expression_statement,
    ),

    block: $ => prec(1, seq('{', optional($._sep), optional($._statements), '}')),

    // Labels are only meaningful in closures (multiMap/branch criteria), but
    // blocks and closures share one body so `{` can stay undecided until `}`.
    _statements: $ => seq(
      sepBy1($._sep, choice($._statement, $.labeled_statement)),
      optional($._sep),
    ),

    _statement_or_block: $ => choice($.block, $._statement),

    if_statement: $ => prec.right(seq(
      'if',
      '(',
      field('condition', $._expression),
      ')',
      field('consequence', $._statement_or_block),
      optional(seq('else', field('alternative', $._statement_or_block))),
    )),

    try_statement: $ => prec.right(seq(
      'try',
      field('body', $._statement_or_block),
      repeat($.catch_clause),
      optional($.finally_clause),
    )),

    catch_clause: $ => seq(
      'catch',
      '(',
      choice(
        seq(field('name', $._identifier), optional(seq(':', $._catch_types))),
        seq($._catch_types, field('name', $._identifier)),
      ),
      ')',
      field('body', $._statement_or_block),
    ),

    _catch_types: $ => sepBy1('|', field('type', $.type)),

    // Not in the strict syntax, but still common in nf-core code.
    finally_clause: $ => seq('finally', field('body', $._statement_or_block)),

    // Not in the strict syntax, but still common in nf-core code.
    for_statement: $ => seq(
      'for',
      '(',
      optional(field('type', $.type)),
      field('name', $._identifier),
      'in',
      field('iterable', $._expression),
      ')',
      field('body', $._statement_or_block),
    ),

    return_statement: $ => prec.right(seq('return', optional($._expression))),

    throw_statement: $ => seq('throw', $._expression),

    assert_statement: $ => seq(
      'assert',
      field('condition', $._expression),
      optional(seq(':', field('message', $._expression))),
    ),

    variable_declaration: $ => choice(
      seq(
        'def',
        field('name', $._identifier),
        optional(seq(':', field('type', $.type))),
        optional(seq('=', field('value', $._expression))),
      ),
      seq('def', field('pattern', $.destructuring_pattern), '=', field('value', $._expression)),
      prec.dynamic(1, seq(
        'def',
        field('type', $.type),
        field('name', $._identifier),
        optional(seq('=', field('value', $._expression))),
      )),
      // ANTLR requires a capitalized class name here, which tree-sitter cannot
      // check, so without an initializer `path reads` stays a command call.
      prec.dynamic(-2, seq(
        field('type', $.type),
        field('name', $._identifier),
        optional(seq('=', field('value', $._expression))),
      )),
    ),

    // (a, b) or (a: String, b: Integer)
    destructuring_pattern: $ => seq(
      '(',
      $._name_type_pair,
      repeat1(seq(',', $._name_type_pair)),
      ')',
    ),

    _name_type_pair: $ => seq(
      field('name', $._identifier),
      optional(seq(':', field('type', $.type))),
    ),

    assignment: $ => seq(
      field('left', choice($._expression, $.destructuring_pattern)),
      field('operator', choice(...ASSIGNMENT_OPERATORS)),
      field('right', $._expression),
    ),

    expression_statement: $ => choice($._expression, $.command_expression),

    // A call without parentheses, only valid as a statement and only when the
    // callee is a name or a property: println "x", log.info "x", path x, emit: y
    command_expression: $ => prec.dynamic(-1, seq(
      field('function', choice($._identifier, $.member_expression)),
      field('arguments', alias($._command_arguments, $.argument_list)),
    )),

    _command_arguments: $ => commaSep1($._argument),

    labeled_statement: $ => seq(
      field('label', $._identifier),
      ':',
      choice($.labeled_statement, $._statement),
    ),

    // -- expressions

    _expression: $ => choice(
      $._identifier,
      $.integer_literal,
      $.float_literal,
      $.boolean_literal,
      $.null_literal,
      $.string,
      $.slashy_string,
      $.parenthesized_expression,
      $.list,
      $.map,
      $.closure,
      $.new_expression,
      $.member_expression,
      $.call_expression,
      $.index_expression,
      $.unary_expression,
      $.binary_expression,
      $.cast_expression,
      $.instanceof_expression,
      $.ternary_expression,
      $.elvis_expression,
    ),

    // Nextflow keywords that are also valid names (ANTLR's `identifier` rule),
    // e.g. `workflow.onComplete { }` or `input = ...` in a script prelude.
    _identifier: $ => choice(
      $.identifier,
      prec(-1, alias(choice(...CONTEXTUAL_KEYWORDS), $.identifier)),
    ),

    parenthesized_expression: $ => seq('(', $._expression, ')'),

    list: $ => seq('[', optional(seq(commaSep1($._expression), optional(','))), ']'),

    map: $ => seq(
      '[',
      choice(':', seq(commaSep1($.map_entry), optional(','))),
      ']',
    ),

    map_entry: $ => seq(
      field('key', choice(
        $._identifier,
        $.string,
        $.integer_literal,
        $.float_literal,
        $.boolean_literal,
        $.null_literal,
        $.parenthesized_expression,
      )),
      ':',
      field('value', $._expression),
    ),

    closure: $ => seq(
      '{',
      optional($._sep),
      optional(seq(
        optional(field('parameters', alias($._closure_parameters, $.parameters))),
        '->',
        optional($._sep),
      )),
      optional($._statements),
      '}',
    ),

    _closure_parameters: $ => commaSep1($.parameter),

    new_expression: $ => seq(
      'new',
      field('type', $.type),
      field('arguments', $.argument_list),
    ),

    member_expression: $ => prec(PREC.postfix, seq(
      field('object', $._expression),
      field('operator', choice('.', '?.', '*.')),
      field('property', choice($._identifier, $.string)),
    )),

    call_expression: $ => prec.right(PREC.postfix, seq(
      field('function', $._expression),
      choice(
        seq(field('arguments', $.argument_list), optional(field('closure', $.closure))),
        field('closure', $.closure),
      ),
    )),

    index_expression: $ => prec(PREC.postfix, seq(
      field('object', $._expression),
      '[',
      field('index', commaSep1($._expression)),
      ']',
    )),

    argument_list: $ => seq(
      '(',
      optional(seq(commaSep1($._argument), optional(','))),
      ')',
    ),

    _argument: $ => choice($._expression, $.named_argument),

    named_argument: $ => seq(
      field('name', choice($._identifier, $.string)),
      ':',
      field('value', $._expression),
    ),

    unary_expression: $ => choice(
      prec(PREC.not, seq(field('operator', choice('!', '~')), field('operand', $._expression))),
      prec(PREC.sign, seq(field('operator', choice('+', '-')), field('operand', $._expression))),
    ),

    binary_expression: $ => {
      const table = [
        [prec.left, PREC.power, '**'],
        [prec.left, PREC.multiplicative, choice('*', '/', '%')],
        [prec.left, PREC.additive, choice('+', '-')],
        [prec.left, PREC.shift, choice('<<', '>>', '>>>', '..', '..<')],
        [prec.left, PREC.relational, choice('<', '>', '<=', '>=', 'in', '!in')],
        [prec.left, PREC.equality, choice('==', '!=', '<=>')],
        [prec.left, PREC.regex, choice('=~', '==~')],
        [prec.left, PREC.bitand, '&'],
        [prec.left, PREC.xor, '^'],
        [prec.left, PREC.bitor, '|'],
        [prec.left, PREC.and, '&&'],
        [prec.left, PREC.or, '||'],
      ];
      return choice(...table.map(([assoc, level, operator]) => assoc(level, seq(
        field('left', $._expression),
        // @ts-ignore
        field('operator', operator),
        field('right', $._expression),
      ))));
    },

    cast_expression: $ => prec.left(PREC.relational, seq(
      field('value', $._expression),
      'as',
      field('type', $.type),
    )),

    instanceof_expression: $ => prec.left(PREC.relational, seq(
      field('left', $._expression),
      field('operator', choice('instanceof', '!instanceof')),
      field('right', $.type),
    )),

    ternary_expression: $ => prec.right(PREC.ternary, seq(
      field('condition', $._expression),
      '?',
      field('consequence', $._expression),
      ':',
      field('alternative', $._expression),
    )),

    elvis_expression: $ => prec.right(PREC.ternary, seq(
      field('left', $._expression),
      '?:',
      field('right', $._expression),
    )),

    // -- types

    // String, java.nio.file.Path, List<Map<String,?>>, Path?, String[]
    type: $ => seq(
      $._type_name,
      optional('?'),
      repeat(seq('[', ']')),
    ),

    // Precedence only on the continuations, so `.` and `<` extend the type
    // while `String x` stays ambiguous (declaration vs command call) for GLR.
    _type_name: $ => seq(
      $._identifier,
      repeat(prec(1, seq('.', $._identifier))),
      optional(prec(1, $.type_arguments)),
    ),

    type_arguments: $ => seq('<', commaSep1(choice($.type, '?')), '>'),

    // -- literals

    // A leading `$` is allowed (`$slurm` executor scopes in config). ANTLR
    // also allows `$` later in a name; here that would break GString lexing
    // (`"$a$b"` is two interpolations).
    identifier: _ => /\$?[\p{L}_][\p{L}\p{Nd}_]*/,

    integer_literal: _ => token(choice(
      /0[xX][0-9a-fA-F](_*[0-9a-fA-F])*[lLiIgG]?/,
      /0[bB][01](_*[01])*[lLiIgG]?/,
      /\d(_*\d)*[lLiIgG]?/,
    )),

    float_literal: _ => token(choice(
      /\d(_*\d)*\.\d(_*\d)*([eE][+-]?\d+)?[fFdDgG]?/,
      /\.\d(_*\d)*([eE][+-]?\d+)?[fFdDgG]?/,
      /\d(_*\d)*[eE][+-]?\d+[fFdDgG]?/,
      /\d(_*\d)*[fFdD]/,
    )),

    boolean_literal: _ => choice('true', 'false'),

    null_literal: _ => 'null',

    // -- strings

    string: $ => choice(
      seq(
        '\'',
        repeat(choice(alias($._sq_content, $.string_content), $.escape_sequence)),
        '\'',
      ),
      seq(
        '"',
        repeat(choice(alias($._dq_content, $.string_content), $.escape_sequence, $.interpolation)),
        '"',
      ),
      seq(
        '\'\'\'',
        repeat(choice(
          alias($._tsq_content, $.string_content),
          alias($._tsq_quote, $.string_content),
          $.escape_sequence,
        )),
        '\'\'\'',
      ),
      seq(
        '"""',
        repeat(choice(
          alias($._tdq_content, $.string_content),
          alias($._tdq_quote, $.string_content),
          $.escape_sequence,
          $.interpolation,
        )),
        '"""',
      ),
    ),

    // prec(1) so `//` inside a string is content, not a comment.
    _sq_content: _ => token.immediate(prec(1, /[^'\\\n]+/)),
    _dq_content: _ => token.immediate(prec(1, /[^"\\$\n]+/)),
    _tsq_content: _ => token.immediate(prec(1, /([^'\\]|'[^'\\]|''[^'\\])+/)),
    _tdq_content: _ => token.immediate(prec(1, /([^"\\$]|"[^"\\$]|""[^"\\$])+/)),
    // A lone or doubled quote right before an escape, interpolation, or the
    // closing delimiter, which the content tokens above cannot absorb.
    _tsq_quote: _ => token.immediate(/''?/),
    _tdq_quote: _ => token.immediate(/""?/),

    escape_sequence: _ => token.immediate(seq(
      '\\',
      choice(/u[0-9a-fA-F]{4}/, /[0-7]{1,3}/, /[^u0-7]/),
    )),

    interpolation: $ => choice(
      seq(token.immediate('${'), $._expression, '}'),
      seq(
        token.immediate('$'),
        alias($._gstring_identifier, $.identifier),
        repeat(seq(alias($._gstring_path_dot, '.'), alias($._gstring_identifier, $.identifier))),
      ),
    ),

    _gstring_identifier: _ => token.immediate(prec(2, /[\p{L}_][\p{L}\p{Nd}_]*/)),

    // /pattern/, no interpolation (as in the strict syntax). The first
    // character cannot be `*` or `/`, which start comments.
    slashy_string: _ => token(seq(
      '/',
      choice(/[^/*\\]/, /\\[\s\S]/),
      repeat(choice(/[^/\\]/, /\\[\s\S]/)),
      '/',
    )),

    line_comment: _ => token(seq('//', /[^\n]*/)),

    block_comment: _ => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/')),
  },
});

/**
 * `{ entry (sep entry)* }` with optional leading/trailing separators.
 *
 * @param {GrammarSymbols<string>} $
 * @param {RuleOrLiteral} entry
 */
function body($, entry) {
  return seq(
    '{',
    optional($._sep),
    optional(seq(sepBy1($._sep, entry), optional($._sep))),
    '}',
  );
}

/**
 * A process/workflow/agent body: leading statements (directives, or an
 * implicit script/main body), then labeled sections in any order.
 *
 * @param {GrammarSymbols<string>} $
 * @param {RuleOrLiteral[]} sections
 */
function sectionedBody($, sections) {
  return seq(
    '{',
    optional($._sep),
    optional(seq(sepBy1($._sep, $._statement), optional($._sep))),
    repeat(choice(...sections)),
    '}',
  );
}

/**
 * `label: entry (sep entry)*`, owning its trailing separator so the next
 * label can follow.
 *
 * Section keywords are also valid names, so `output:` after an input could
 * be read as a typed input `output: <type>`. The dynamic precedence makes
 * the reading with more sections win.
 *
 * @param {GrammarSymbols<string>} $
 * @param {RuleOrLiteral} label
 * @param {RuleOrLiteral} entry
 */
function section($, label, entry) {
  return prec.dynamic(1, seq(
    label,
    ':',
    optional($._sep),
    optional(seq(sepBy1($._sep, entry), optional($._sep))),
  ));
}

/**
 * @param {RuleOrLiteral} separator
 * @param {RuleOrLiteral} rule
 */
function sepBy1(separator, rule) {
  return seq(rule, repeat(seq(separator, rule)));
}

/**
 * @param {RuleOrLiteral} rule
 */
function commaSep1(rule) {
  return sepBy1(',', rule);
}
