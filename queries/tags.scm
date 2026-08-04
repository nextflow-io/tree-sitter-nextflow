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

;; Function definitions: def helper(x, y) { ... }
(function_definition
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

;; Process invocations: EXAMPLE(ch)
(process_invocation
  (identifier) @name) @reference.call

;; Process output references: EXAMPLE.out
(process_output
  (identifier) @name) @reference.call

;; Method calls: the identifier directly before the arg list / trailing
;; closure (method_call is flat; earlier `.name` segments are navigation).
(method_call
  (identifier) @name . "(") @reference.call
(method_call
  (identifier) @name . (closure)) @reference.call

;; Channel factory calls: Channel.fromPath(...)
(channel_factory
  (identifier) @name) @reference.call

;; Module includes: include { PROCESS } from './modules/process.nf'
(include
  (string) @name) @reference.implementation
