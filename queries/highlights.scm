;; Tree-sitter highlighting queries for Nextflow
;; These patterns define how syntax highlighting should be applied in editors

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
] @keyword

;; Control flow keywords
[
  "if"
  "else"
  "for"
  "while"
  "try"
  "catch"
  "assert"
] @keyword.control

;; Built-in types and qualifiers
[
  "env"
  "path"
  "val"
  "file"
  "tuple"
  "each"
] @type.builtin

;; Process/workflow sections
[
  "input:"
  "output:"
  "script:"
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
  name: (identifier) @function)

;; Workflow definitions
(workflow_definition
  name: (identifier) @function)

;; Function declarations
(function_declaration
  name: (identifier) @function)

;; Channel operations and method calls
(method_call
  method: (identifier) @function.method)

;; Property access
(dotted_identifier
  property: (identifier) @property)

;; Parameters
(parameter
  name: (identifier) @variable.parameter)

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
] @operator

;; Arithmetic operators
[
  "+"
  "-"
  "*"
  "/"
  "%"
] @operator

;; Channel operators
[
  "|"
  "->"
  "<-"
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
(interpolation_expression) @embedded

;; Numbers
(integer_literal) @number
(float_literal) @number

;; Booleans
(boolean_literal) @constant.builtin

;; ========================================
;; COMMENTS
;; ========================================

(comment) @comment

;; ========================================
;; SPECIAL CONSTRUCTS
;; ========================================

;; Script content (will be highlighted as bash via injections)
(script_content) @embedded

;; Include statements
(include_statement
  source: (string_literal) @string.special)

;; Nextflow version specification
(nextflow_version
  version: (string_literal) @string.special)

;; ========================================
;; ERROR NODES
;; ========================================

(ERROR) @error
