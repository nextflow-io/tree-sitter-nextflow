;; Code navigation for Nextflow: definitions and references.

;; ========================================
;; DEFINITIONS
;; ========================================

(process_definition name: (identifier) @name) @definition.method

(workflow_definition name: (identifier) @name) @definition.function

(agent_definition name: (identifier) @name) @definition.function

(function_definition name: (identifier) @name) @definition.function

(record_definition name: (identifier) @name) @definition.class

(enum_definition name: (identifier) @name) @definition.class

(param_declaration name: (identifier) @name) @definition.variable

(param_assignment . (identifier) @name) @definition.variable

;; ========================================
;; REFERENCES
;; ========================================

(call_expression function: (identifier) @name) @reference.call

(call_expression
  function: (member_expression property: (identifier) @name)) @reference.call

(command_expression function: (identifier) @name) @reference.call

(command_expression
  function: (member_expression property: (identifier) @name)) @reference.call

;; Process/workflow outputs: FOO.out, FOO.out.bam. Tags queries cannot use
;; helper captures, so this relies on the upper-case naming convention.
((member_expression object: (identifier) @name) @reference.call
  (#match? @name "^[A-Z][A-Z0-9_]*$"))

(include_declaration source: (string) @name) @reference.implementation
