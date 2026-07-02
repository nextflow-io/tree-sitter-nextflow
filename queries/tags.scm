;; Tree-sitter tags queries for Nextflow
;; These patterns define how to extract symbols for code navigation and outline views
;; Note: the grammar defines no named fields yet, so queries match by position.

;; ========================================
;; DEFINITIONS - Main Nextflow Constructs
;; ========================================

;; Process definitions
(process_definition
  (identifier) @name) @definition.method

;; Workflow definitions
(workflow_definition
  (identifier) @name) @definition.function

;; Parameter declarations (workflow inputs)
(parameter
  (identifier) @name) @definition.variable

;; ========================================
;; REFERENCES - Usage and Calls
;; ========================================

;; Process invocations within workflows
(simple_statement
  (simple_expression
    (identifier) @name)) @reference.call

;; Function calls
(function_call
  (identifier) @name) @reference.call
