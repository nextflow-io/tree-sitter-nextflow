/**
 * @file Nextflow grammar for tree-sitter - Comprehensive Language Parser
 * @author Edmund Miller <edmund@nf-co.re>
 * @author Ben Sherman <bentshermann@gmail.com>
 * @license MIT
 * 
 * GRAMMAR ARCHITECTURE & DESIGN DECISIONS
 * =====================================
 * 
 * This grammar implements a complete parser for the Nextflow workflow language,
 * which is built on Groovy with domain-specific extensions for bioinformatics
 * workflows. Key design principles:
 * 
 * 1. EXPRESSION PRECEDENCE HIERARCHY (lowest to highest):
 *    - Binary expressions (1): arithmetic, comparison, logical
 *    - Pipe expressions (2): channel operations like `| map { }`
 *    - Command expressions (3): function calls without parens `println "hello"`
 *    - Function calls (4): standard calls with parentheses `func(args)`
 *    - Method calls (5): object.method() chains
 *    - Dotted identifiers (6): property access chains
 *    - Interpolated strings (10): GString expressions "${expr}"
 * 
 * 2. CONFLICT RESOLUTION:
 *    - [$.list, $.map]: Both use `[...]` syntax, resolved by content analysis
 *    - Lists contain expressions: `[1, 2, 3]`
 *    - Maps contain key:value pairs: `[key: value]`
 * 
 * 3. NEXTFLOW-SPECIFIC FEATURES:
 *    - Process definitions with script injection points for language servers
 *    - Channel operations with specialized pipe syntax
 *    - GString interpolation: `$var`, `${expr}`, `$var.property`
 *    - Multiple script types: script:, shell:, exec:, stub:
 *    - Feature flags: nextflow.enable.dsl=2
 * 
 * 4. LANGUAGE INJECTION SUPPORT:
 *    - script_content nodes enable Bash/shell highlighting in editors
 *    - Triple-quoted strings support heredoc syntax
 *    - Interpolation enables Nextflow expression highlighting within strings
 * 
 * 5. GROOVY COMPATIBILITY:
 *    - Supports Groovy expressions, closures, and data structures
 *    - Handles method chaining and property access
 *    - Implements GString interpolation patterns
 * 
 * TESTING STRATEGY:
 * - Use `tree-sitter test` to run comprehensive corpus tests
 * - Test individual expressions: `echo 'code' | tree-sitter parse`
 * - Update expectations: `tree-sitter test --update`
 * - Focus testing: `tree-sitter test --file-name specific_test.txt`
 * 
 * EXTENSION POINTS:
 * - Add new Nextflow operators to pipe_operation choices
 * - Extend channel_expression for new Channel factories
 * - Expand simple_expression for new literal types
 * - Add process directives to process_definition content
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

  // CONFLICT RESOLUTION STRATEGY
  // ============================
  //
  // Tree-sitter requires explicit conflict resolution for ambiguous grammar rules.
  // The following conflicts are intentionally allowed and resolved during parsing:
  //
  // [$.list, $.map] - BRACKET AMBIGUITY:
  // Both lists and maps use square bracket syntax: [...]
  // - Lists: [1, 2, 3]           (comma-separated expressions)
  // - Maps:  [key: value]        (colon-separated key-value pairs)  
  // - Empty: []                  (could be either, defaults to empty list)
  //
  // Resolution strategy:
  // 1. Parser attempts to parse as list first
  // 2. If it encounters a colon (:), backtracks and parses as map
  // 3. This allows both syntaxes to coexist without grammar conflicts
  //
  // Alternative approaches considered:
  // - Separate bracket types: {} for maps (rejected - not Groovy compatible)
  // - Lookahead tokens (rejected - complex and fragile)
  // - Context-sensitive parsing (rejected - not supported by tree-sitter)
  conflicts: $ => [
    [$.list, $.map]  // Square bracket ambiguity: [expr, expr] vs [key: value]
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

    // CORE NEXTFLOW LANGUAGE CONSTRUCTS
    // =================================
    
    // Shebang line support for executable Nextflow scripts
    // Matches: #!/usr/bin/env nextflow
    shebang: $ => token(seq('#!', /.*/)),

    // Nextflow feature flags enable/disable language features
    // Examples: nextflow.enable.dsl=2, nextflow.preview.topic=true
    // Used to control DSL2 vs DSL1, experimental features, etc.
    feature_flag: $ => seq(
      'nextflow',
      repeat1(seq('.', $.identifier)), // Supports nested properties: enable.dsl
      '=',
      choice($.string, $.number, $.boolean)
    ),

    // Module inclusion with optional aliasing
    // Examples: 
    //   include { processName } from './modules/process.nf'
    //   include { processName as myProcess } from './lib.nf'
    // Critical for Nextflow module system and code organization
    include: $ => seq(
      'include',
      '{',
      commaSep1($.include_item),
      '}',
      'from',
      $.string
    ),

    // Individual items in include statements
    // Supports aliasing: processName as alias
    include_item: $ => seq(
      $.identifier,
      optional(seq('as', $.identifier))
    ),

    // Parameter declarations define workflow inputs
    // Examples: params.input = 'data.txt', params.outputDir = 'results'
    // These become command-line parameters: --input data.txt
    parameter: $ => seq(
      'params',
      '.',
      $.identifier,
      '=',
      choice($.string, $.number, $.boolean)
    ),

    // PROCESS DEFINITIONS - CORE NEXTFLOW CONSTRUCT
    // ============================================
    
    // Process definition: the fundamental unit of computation in Nextflow
    // Example:
    //   process EXAMPLE {
    //     input: val x
    //     output: stdout
    //     script: "echo $x"
    //   }
    // Language servers use script_content nodes for Bash/shell syntax highlighting
    process_definition: $ => seq(
      'process',
      $.identifier, // Process name, must be unique in scope
      '{',
      repeat(choice(
        $.input_declaration,
        $.output_declaration,
        $.when_declaration,
        $.script_declaration
      )),
      '}'
    ),

    // Input declarations specify process parameters and channels
    // Examples: 
    //   input: val x           - simple value input
    //   input: path "*.txt"    - file path input
    //   input: env SAMPLE_ID   - environment variable
    input_declaration: $ => seq('input:', repeat1(choice(
      $.simple_statement,
      $.env_input
    ))),

    // Environment variable inputs for process isolation
    // Examples: env VAR_NAME, env "SAMPLE_ID"
    env_input: $ => seq('env', choice(
      $.string_literal,
      $.identifier
    )),
    
    // Output declarations specify what the process produces
    // Examples:
    //   output: path "*.txt"   - file outputs
    //   output: stdout         - standard output
    output_declaration: $ => seq('output:', repeat1($.simple_statement)),
    
    // Conditional execution guard for processes
    // Example: when: params.run_analysis
    when_declaration: $ => seq('when:', $.simple_expression),

    // SCRIPT DECLARATIONS - CRITICAL FOR LANGUAGE INJECTION
    // =====================================================
    
    // Script types define different execution contexts:
    // - script: Standard Nextflow script (default)
    // - shell:  Bash shell script with special variable handling
    // - exec:   Direct command execution
    // - stub:   Mock/test script for development
    script_declaration: $ => seq(
      choice('script:', 'shell:', 'exec:', 'stub:'),
      $.script_content
    ),

    // Script content enables language server integration
    // Language servers can inject Bash/shell highlighting into these nodes
    // Supports both single-line strings and multi-line heredoc syntax
    script_content: $ => choice(
      $.string_literal,        // Simple string: "echo hello"
      $.triple_quoted_string   // Heredoc: """complex bash script"""
    ),

    // WORKFLOW DEFINITIONS - ORCHESTRATION LAYER
    // ==========================================
    
    // Workflow definition: orchestrates processes and defines data flow
    // Examples:
    //   workflow { ... }                    - main/default workflow
    //   workflow ANALYSIS { ... }          - named workflow for reuse
    //   workflow onComplete: { ... }       - workflow with completion handler
    // Workflows contain process calls, channel operations, and data flow logic
    workflow_definition: $ => seq(
      'workflow',
      optional($.identifier), // Optional name for reusable workflows
      '{',
      $.workflow_body,
      '}'
    ),

    // Workflow body contains the main computational logic
    // Typically includes:
    // - Process invocations: PROCESS(input_channel)
    // - Channel operations: input_ch.map { ... }.filter { ... }  
    // - Variable assignments: results = PROCESS(data)
    // - Control flow: if/else statements
    workflow_body: $ => repeat1(choice(
      $.expression_statement,  // Process calls, channel operations
      $.assignment,           // Variable assignments: x = PROCESS(y)
      $.variable_declaration  // Typed declarations: def String result = ...
    )),

    // VARIABLE DECLARATIONS & ASSIGNMENTS
    // ===================================
    
    // Variable declarations with optional type annotations
    // Examples:
    //   def x = 5                    - simple variable
    //   def String name = "test"     - typed variable  
    //   def (a, b) = [1, 2]          - destructuring assignment
    //   def (String x, int y) = fn() - typed destructuring
    variable_declaration: $ => seq(
      'def',
      choice(
        seq($.identifier, optional($.type_annotation)),
        $.destructuring_pattern
      ),
      optional(seq('=', $.simple_expression))
    ),

    // Type annotations for strict syntax and better IDE support
    // Examples: : String, : List<Integer>, : Path
    type_annotation: $ => seq(':', $.identifier),

    // Destructuring patterns for multiple return values
    // Example: def (stdout, stderr) = executeProcess()
    destructuring_pattern: $ => seq(
      '(',
      commaSep1(choice(
        $.identifier,        // Simple: (a, b)
        $.typed_identifier   // Typed: (String a, int b)
      )),
      ')'
    ),

    // Typed identifier within destructuring patterns
    typed_identifier: $ => seq(
      $.identifier,
      $.type_annotation
    ),

    // Simple variable assignment (no declaration)
    // Example: result = processChannel.collect()
    assignment: $ => seq(
      $.identifier,
      '=',
      $.simple_expression
    ),

    // Expression statements (standalone expressions)
    // Examples: process calls, println statements, channel operations
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

    // EXPRESSION HIERARCHY - COMPREHENSIVE NEXTFLOW EXPRESSIONS
    // =========================================================
    
    // Main expression entry point - handles all Nextflow expression types
    // Ordered roughly by frequency of use in typical workflows
    simple_expression: $ => choice(
      $.binary_expression,                    // Arithmetic, comparison: x + y, a == b
      $.parenthesized_expression,             // Grouping: (expr)
      $.pipe_expression,                      // Channel ops: ch | map { }
      $.command_expression,                   // No-paren calls: println "hello"
      $.function_call,                        // Function calls: fn(args)
      $.method_call,                          // Object methods: obj.method()
      $.env_function,                         // Environment: env('VAR')
      $.list,                                 // Lists: [1, 2, 3]
      $.map,                                  // Maps: [key: value]
      $.channel_expression,                   // Channel factories: Channel.of()
      $.interpolated_string,                  // GStrings: "Hello $name"
      $.interpolated_triple_quoted_string,    // Multi-line GStrings
      $.slashy_string,                        // Regex: /pattern/
      $.identifier,                           // Variables: varName
      $.string_literal,                       // Plain strings: "text"
      $.integer_literal,                      // Numbers: 42
      $.boolean_literal,                      // Booleans: true, false
      $.dotted_identifier                     // Properties: obj.prop.field
    ),

    // BINARY EXPRESSIONS - PRECEDENCE LEVEL 1 (LOWEST)
    // =================================================
    
    // Binary operations with left associativity
    // Precedence groups (highest to lowest within binary expressions):
    // 1. Arithmetic: **, *, /, %, +, -
    // 2. Comparison: ==, !=, <, >, <=, >=
    // 3. Pattern matching: =~, !~ (regex operators)
    // 4. Range: .., ..< (Groovy range operators) 
    // 5. Logical: &&, || (short-circuiting)
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
        '+', '-', '*', '/', '%', '**',        // Arithmetic operators
        '==', '!=', '<', '>', '<=', '>=',     // Comparison operators
        '&&', '||',                           // Logical operators  
        '..', '..<',                          // Range operators (Groovy)
        '=~', '!~'                            // Pattern matching (regex)
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

    // CHANNEL OPERATIONS - NEXTFLOW DATA FLOW SYSTEM
    // ==============================================
    
    // Channel expressions create data streams for workflow processing
    // Channels are the fundamental data structure for connecting processes
    channel_expression: $ => choice(
      $.channel_from,       // Channel.from(list) - create from collection
      $.channel_from_list,  // Channel.fromList(list) - explicit list input
      $.channel_value,      // Channel.value(item) - singleton channel
      $.channel_of          // Channel.of(items) - modern factory method
    ),

    // Legacy channel factory: Channel.from([1,2,3])
    // Deprecated in favor of Channel.of() but still widely used
    channel_from: $ => seq(
      'Channel',
      '.',
      'from',
      '(',
      commaSep($.simple_expression),
      ')'
    ),

    // Channel fromList: Channel.fromList([1,2,3])
    // Explicit list-based channel creation
    channel_from_list: $ => seq(
      'Channel',
      '.',
      'fromList',
      '(',
      $.list,
      ')'
    ),

    // Value channel: Channel.value("hello")
    // Creates a singleton channel that emits the same value to all processes
    channel_value: $ => seq(
      'Channel',
      '.',
      'value',
      '(',
      $.simple_expression,
      ')'
    ),

    // Modern channel factory: Channel.of(1, 2, 3)
    // Preferred method for creating channels from multiple items
    channel_of: $ => seq(
      'Channel',
      '.',
      'of',
      '(',
      commaSep($.simple_expression),
      ')'
    ),

    // PIPE EXPRESSIONS - PRECEDENCE LEVEL 2
    // =====================================
    
    // Pipe operations transform channels using functional programming patterns
    // Higher precedence than binary expressions to ensure correct parsing:
    //   Channel.of(1,2,3) | map { it * 2 } | filter { it > 2 }
    // 
    // CRITICAL: Precedence level 2 ensures pipes bind tighter than arithmetic:
    //   x + ch | map { it } is parsed as x + (ch | map { it })
    pipe_expression: $ => prec.left(2, seq(
      choice(
        $.channel_expression,       // Channel.of() | map
        $.parenthesized_expression, // (expr) | map  
        $.list,                     // [1,2,3] | map
        $.map,                      // [a:1] | map
        $.identifier,               // myChannel | map
        $.string_literal,           // "data" | map
        $.integer_literal,          // 42 | map
        $.boolean_literal,          // true | map
        $.dotted_identifier         // obj.channel | map
      ),
      '|',                         // Pipe operator
      $.pipe_operation
    )),

    // Pipe operations - extensible for new Nextflow operators
    // Currently supports: map (transform), filter, collect, etc.
    // Future: add flatten, groupBy, join, combine, etc.
    pipe_operation: $ => choice(
      $.map_operation   // map { transformation }
    ),

    // Map operation: transforms each channel item
    // Examples:
    //   | map { it.toUpperCase() }        - transform each item
    //   | map { x -> x * 2 }              - named parameter
    //   | map { it -> [it, it + ".txt"] } - create tuples
    map_operation: $ => seq(
      'map',
      $.closure
    ),

    // GROOVY CLOSURES - FUNCTIONAL PROGRAMMING CONSTRUCTS
    // ===================================================
    
    // Closure syntax: { param -> expression } or { expression }
    // Used extensively in Nextflow for channel operations and process definitions
    // Examples:
    //   { it * 2 }           - implicit 'it' parameter
    //   { x -> x.reverse }   - explicit parameter
    //   { a, b -> a + b }    - multiple parameters
    //   { x ->               - multi-statement closure
    //     println x
    //     return x * 2
    //   }
    closure: $ => seq(
      '{',
      optional(seq(
        commaSep1($.closure_parameter),  // Parameter list: a, b, c
        '->'                             // Arrow separator
      )),
      choice(
        $.simple_expression,    // Single expression closure
        $.block                 // Multi-statement closure block
      ),
      '}'
    ),

    // Closure parameters - simple identifiers
    // Future enhancement: support typed parameters (String x, int y)
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

    // STRING LITERALS & INTERPOLATION SYSTEM
    // ======================================
    
    // Plain string literals (no interpolation) - SINGLE QUOTES ONLY
    // Note: In Groovy/Nextflow, double-quoted strings are always GStrings (interpolated_string)
    // Single quotes: 'literal text' (never interpolated)
    string_literal: $ => seq("'", /[^']*/, "'"),

    // GSTRING INTERPOLATION - PRECEDENCE LEVEL 10 (HIGHEST)
    // =====================================================
    
    // Interpolated strings (GString) - Nextflow's template strings
    // Examples:
    //   "Hello $name"           - Variable interpolation
    //   "Result: ${x + y}"      - Expression interpolation  
    //   "$obj.property"         - Property access
    //   "File: $params.input"   - Nested property access
    interpolated_string: $ => seq(
      '"',
      repeat(choice(
        $.string_content,       // Plain text content (moved first)
        $.escape_sequence,      // Escaped characters: \n, \t, etc.
        $.interpolation         // $var or ${expr} patterns 
      )),
      '"'
    ),

    // String interpolation patterns - supports both forms:
    // 1. ${expression} - Full expression interpolation (can contain any Nextflow expression)
    // 2. $variable     - Direct variable interpolation (faster, common case)
    // 3. $obj.prop     - Property chain interpolation (supports dot notation)
    interpolation: $ => seq(
      '$',
      choice(
        seq('{', $.simple_expression, '}'),  // ${complex.expression + 1}
        $.identifier  // Simplified: just $var (no dot notation for now)
      )
    ),

    // String content between interpolations - excludes $ to avoid ambiguity
    // Removed token() wrapper to avoid conflicts with operators like !
    string_content: $ => prec(-1, /[^$"\\]+/),

    // Escape sequences in strings - supports common escapes + Unicode
    // Examples: \n, \t, \", \\, \u0041 (for 'A')
    escape_sequence: $ => token(prec(1, seq(
      '\\',
      choice(
        /[bfnrst\\'"\n]/,        // Basic escape sequences
        /u[0-9a-fA-F]{4}/        // Unicode escape sequences
      )
    ))),

    // Slashy strings for regex patterns (Groovy feature)
    // Example: /pattern[a-z]+/ 
    // Note: No interpolation in strict syntax mode for security
    slashy_string: $ => seq('/', /[^\/]+/, '/'),

    // Multi-line interpolated strings (heredoc with interpolation)
    // Examples:
    //   """
    //   Hello $name,
    //   Your result is ${calculation}
    //   """
    interpolated_triple_quoted_string: $ => seq(
      '"""',
      repeat(choice(
        $.string_content,
        $.escape_sequence,
        $.interpolation
      )),
      '"""'
    ),

    // Plain triple-quoted strings (heredoc without interpolation)
    // Single quotes: '''literal text''' (never interpolated) 
    // Double quotes: """literal text""" (only if no $ present)
    // Regex explanation: ([^"]|"[^"]|""[^"])* matches any sequence avoiding """
    triple_quoted_string: $ => choice(
      seq("'''", /([^']|'[^']|''[^'])*/, "'''"),
      seq('"""', /([^"]|"[^"]|""[^"])*/, '"""')
    ),

    // PRIMITIVE LITERALS & TOKENS
    // ===========================
    
    // Integer literals - supports decimal numbers
    // Regex: \d+ matches one or more digits: 0, 42, 1234
    // Future enhancement: support hex (0xFF), octal (0777), binary (0b1010)
    integer_literal: $ => /\d+/,
    
    // Boolean literals - standard true/false keywords  
    boolean_literal: $ => choice('true', 'false'),
    
    // Identifier pattern - standard programming language identifiers
    // Regex: [a-zA-Z_][a-zA-Z0-9_]* 
    // - Must start with letter or underscore: a, _var, MyClass
    // - Can contain letters, digits, underscores: var1, my_variable, CLASS_NAME
    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*/,

    // LEGACY ALIASES - COMPATIBILITY WITH TEST EXPECTATIONS
    // =====================================================
    // These aliases maintain compatibility with existing test corpus
    // that expects generic 'string', 'number', 'boolean' node types
    
    // Generic string alias (for backwards compatibility)
    string: $ => choice(
      seq("'", /[^']*/, "'"),  // Single quoted: 'text'
      seq('"', /[^"]*/, '"')   // Double quoted: "text" (no interpolation)
    ),
    
    // Generic number alias
    number: $ => /\d+/,
    
    // Generic boolean alias  
    boolean: $ => choice('true', 'false'),

    // COMMENT SYNTAX
    // ==============
    
    // Line comments: // comment text until end of line
    // Regex: /.*/  matches any characters until newline
    line_comment: $ => token(seq('//', /.*/)),
    
    // Block comments: /* comment text */ (can span multiple lines)
    // Complex regex explanation: /[^*]*\*+([^/*][^*]*\*+)*/
    // - [^*]*: any chars except *
    // - \*+: one or more * characters  
    // - ([^/*][^*]*\*+)*: zero or more groups of:
    //   - [^/*]: char that's not / or *
    //   - [^*]*: any chars except *
    //   - \*+: one or more *
    // This prevents premature termination on */ inside strings
    block_comment: $ => token(seq('/*', /[^*]*\*+([^/*][^*]*\*+)*/, '/'))

  }
});

// HELPER FUNCTIONS - REUSABLE GRAMMAR PATTERNS
// ============================================

// Comma-separated list with at least one element (required comma separation)
// Usage: commaSep1($.identifier) -> "a, b, c" or "a, b, c," (trailing comma allowed)
// Pattern: rule (, rule)* ,?
// Examples:
//   - Function parameters: func(a, b, c)
//   - Include items: include { proc1, proc2, proc3 }
//   - Destructuring: def (x, y, z) = ...
function commaSep1(rule) {
  return seq(
    rule,                    // First required element
    repeat(seq(',', rule)),  // Zero or more: , element
    optional(',')            // Optional trailing comma (Groovy style)
  );
}

// Comma-separated list with zero or more elements (optional comma separation)  
// Usage: commaSep($.simple_expression) -> "" or "a" or "a, b, c"
// Pattern: (rule (, rule)* ,?)?
// Examples:
//   - Function arguments: func() or func(a) or func(a, b)
//   - List contents: [] or [1] or [1, 2, 3]
//   - Channel.of contents: Channel.of() or Channel.of(x, y)
function commaSep(rule) {
  return optional(commaSep1(rule));  // Make the entire comma-separated list optional
}