;; Tree-sitter highlighting queries for Nextflow
;; These patterns define how syntax highlighting should be applied in editors
;; Note: the grammar defines no named fields yet, so queries match by position.

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
  (identifier) @function.call)

;; Process output access: PROCESS.out
(process_output
  "out" @variable.builtin)

;; Parameters
(parameter
  (identifier) @variable.parameter)

;; Regular identifiers
(identifier) @variable

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
