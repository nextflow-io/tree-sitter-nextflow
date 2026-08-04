;; Tree-sitter highlighting queries for Nextflow
;; These patterns define how syntax highlighting should be applied in editors
;; Note: the grammar defines no named fields yet, so queries match by position.

;; Fallback: any identifier is a variable. This MUST come first — the
;; tree-sitter CLI gives later patterns precedence, so specific captures
;; below (functions, keywords, parameters) override this one.
(identifier) @variable

;; ========================================
;; KEYWORDS AND DECLARATIONS
;; ========================================

;; Core Nextflow keywords
[
  "process"
  "workflow"
  "include"
  "nextflow"
  "params"
  "def"
  "as"
  "from"
  "new"
  "tuple"
  "template"
] @keyword

;; Control flow keywords
[
  "if"
  "for"
  "else"
  "assert"
  "return"
  "try"
  "catch"
  "finally"
  "exit"
] @keyword.control

;; Operator-like keywords
[
  "in"
  "instanceof"
] @keyword.operator

;; Built-in types and qualifiers
[
  "env"
  "Channel"
] @type.builtin

;; Process/workflow sections
;; NOTE: script/shell/exec/stub are bare word tokens (the grammar splits the
;; trailing ":" into a separate token to tolerate `stub :`); the data sections
;; keep ":" as part of the literal token.
[
  "script"
  "shell"
  "exec"
  "stub"
] @label

[
  "input:"
  "output:"
  "when:"
  "main:"
  "take:"
  "emit:"
] @label

;; ========================================
;; IDENTIFIERS AND NAMES
;; ========================================

;; Process definitions
(process_definition
  (identifier) @function)

;; Workflow definitions
(workflow_definition
  (identifier) @function)


;; Function parameters: every identifier defaults to a parameter; the
;; definition-name captures below override the first one (last pattern
;; wins in the tree-sitter CLI).
(function_definition
  (identifier) @variable.parameter)
;; Function definitions
;; `def name(...)': no return_type field, the name is the first identifier.
(function_definition
  !return_type
  .
  (identifier) @function)

;; `ReturnType name(...)': the name immediately follows the return type.
(function_definition
  return_type: (_) @type
  .
  (identifier) @function)

;; Process directives (tag, cpus, publishDir, ...)
(directive
  .
  (identifier) @keyword.directive)

;; Function and process calls
(function_call
  (identifier) @function.call)

(process_invocation
  (identifier) @function.call)

(command_expression
  . (identifier) @function.call)

;; Input/output qualifiers: `val x`, `path f` — first identifier in the
;; command_expression inside an input declaration is the qualifier keyword.
(input_declaration
  (simple_statement
    (simple_expression
      (command_expression
        . (identifier) @type.builtin))))

;; Bare output qualifiers, e.g. `stdout`
(output_declaration
  (simple_statement
    (simple_expression
      (identifier) @type.builtin)))

;; workflow.onComplete / workflow.onError handlers
(workflow_event_handler
  (identifier) @function.method)

;; Process output access: PROCESS.out
(process_output
  "out" @variable.builtin)

;; params.NAME accesses (params.input = ...)
(parameter
  (identifier) @property)

;; Feature flags: nextflow.enable.dsl = 2
(feature_flag
  (identifier) @property)

;; method_call is flat: receiver and every `.name` segment are siblings.
;; Intermediate segments are properties; the final identifier (the one
;; directly before the argument list or trailing closure) is the method.
(method_call
  "." . (identifier) @property)
(method_call
  (identifier) @function.method . "(")
(method_call
  (identifier) @function.method . (closure))

;; Channel factory methods: Channel.fromPath(...), Channel.splitCsv(...)
(channel_factory
  (identifier) @function.method)

;; Property access chains: params.test, task.cpus
(dotted_identifier
  "." . (identifier) @property)

;; ========================================
;; OPERATORS AND PUNCTUATION
;; ========================================

;; Assignment operators
[
  "="
  "+="
  "-="
  "*="
  "/="
  "%="
  "**="
  "<<="
  ">>="
  "&="
  "|="
  "^="
  "?="
] @operator.assignment

;; Comparison and logical operators
[
  "=="
  "!="
  "<"
  ">"
  "<="
  ">="
  "&&"
  "||"
  "=~"
  "!~"
  "==~"
  "<=>"
  "?:"
  "!"
] @operator

;; Arithmetic and range operators
[
  "+"
  "-"
  "*"
  "/"
  "%"
  "**"
  ".."
  "..<"
  "<<"
  "&"
  "^"
  "~"
] @operator

;; Channel operators
[
  "|"
  "->"
] @operator.channel

;; Punctuation
[
  "("
  ")"
  "["
  "]"
  "{"
  "}"
] @punctuation.bracket

[
  ","
  ";"
  ":"
  "."
] @punctuation.delimiter

;; ========================================
;; LITERALS AND VALUES
;; ========================================

;; String literals
(string_literal) @string
(triple_quoted_string) @string
(string) @string
(slashy_string) @string.regex

;; String interpolation
(interpolated_string) @string
(interpolated_triple_quoted_string) @string
;; The CLI does not extend a parent capture over anonymous children, so
;; capture the quote delimiters and text content explicitly.
(interpolated_string "\"" @string)
(interpolated_triple_quoted_string "\"\"\"" @string)
(string_content) @string
(triple_string_content) @string
(interpolation) @embedded
(escape_sequence) @string.escape

;; Numbers
(integer_literal) @number
(float_literal) @number.float
(number) @number

;; Booleans
(boolean_literal) @constant.builtin
(boolean) @constant.builtin

;; ========================================
;; COMMENTS
;; ========================================

(line_comment) @comment
(block_comment) @comment
(shebang) @comment

;; ========================================
;; SPECIAL CONSTRUCTS
;; ========================================

;; Script content (will be highlighted as bash via injections)
(script_content) @embedded

;; ========================================
;; ERROR NODES
;; ========================================

(ERROR) @error
