;; Language injection queries for Nextflow
;; These queries tell tree-sitter to re-parse script content as bash/shell

;; Inject bash syntax into all script_content nodes
((script_content) @injection.content
 (#set! injection.language "bash"))

;; More specific patterns for different script types
((script_block
   (script_content) @injection.content)
 (#set! injection.language "bash"))

;; Handle shebang lines specifically as bash  
((script_content) @injection.content
 (#match? @injection.content "^\\s*#!/.*bash")
 (#set! injection.language "bash"))

;; Handle shell scripts with shell shebang
((script_content) @injection.content
 (#match? @injection.content "^\\s*#!/.*sh")
 (#set! injection.language "bash"))

;; Fallback patterns for common shell constructs
((script_content) @injection.content
 (#match? @injection.content "echo\\s")
 (#set! injection.language "bash"))

((script_content) @injection.content
 (#match? @injection.content "if\\s*\\[")
 (#set! injection.language "bash"))

((script_content) @injection.content
 (#match? @injection.content "for\\s+\\w+\\s+in")
 (#set! injection.language "bash"))