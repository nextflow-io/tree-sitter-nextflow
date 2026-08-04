;; Bash injection into process script/shell/stub bodies.
;; Interpolated strings: capture only the content chunks so quote
;; delimiters and ${...} interpolations stay Nextflow.
;; injection.combined merges the chunks around interpolations into
;; one bash document.
(script_content
  (interpolated_triple_quoted_string
    (triple_string_content) @injection.content)
  (#set! injection.language "bash")
  (#set! injection.combined))

(script_content
  (interpolated_string
    (string_content) @injection.content)
  (#set! injection.language "bash")
  (#set! injection.combined))

;; string_literal / triple_quoted_string are single tokens with no
;; content child, so the injection includes the quote delimiters.
(script_content
  (string_literal) @injection.content
  (#set! injection.language "bash"))

(script_content
  (triple_quoted_string) @injection.content
  (#set! injection.language "bash"))
