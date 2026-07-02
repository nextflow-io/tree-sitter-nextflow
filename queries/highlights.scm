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
] @keyword

;; Control flow keywords
[
  "if"
  "else"
  "assert"
] @keyword.control

;; Built-in types and qualifiers
[
  "env"
  "Channel"
] @type.builtin

;; Process/workflow sections
[
  "input:"
  "output:"
  "script:"
  "shell:"
  "exec:"
  "stub:"
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

;; Parameters
(parameter
  (identifier) @variable.parameter)

;; Regular identifiers
(identifier) @variable

;; ========================================
;; OPERATORS AND PUNCTUATION
;; ========================================

;; Assignment operator
"=" @operator.assignment

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
(slashy_string) @string.regex

;; String interpolation
(interpolated_string) @string
(interpolation) @embedded

;; Numbers
(integer_literal) @number
(number) @number

;; Booleans
(boolean_literal) @constant.builtin

;; ========================================
;; COMMENTS
;; ========================================

(line_comment) @comment
(block_comment) @comment

;; ========================================
;; SPECIAL CONSTRUCTS
;; ========================================

;; Script content (will be highlighted as bash via injections)
(script_content) @embedded

;; ========================================
;; ERROR NODES
;; ========================================

(ERROR) @error
